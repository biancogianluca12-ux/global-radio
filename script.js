// hls.js ready in window.Hls
const audio = document.getElementById("audio");
const debugBox = document.getElementById("debugBox");
let hls = null;

function log(msg) { debugBox.textContent = msg || ""; }

// Demo list
const DEMO_STATIONS = [
  { id:"radioparadise-main", name:"Radio Paradise – Main Mix", city:"Paradise, CA", country:"United States", urls:["https://stream.radioparadise.com/aac-320"] },
  { id:"somafm-groove", name:"SomaFM – Groove Salad", city:"San Francisco", country:"United States", urls:["https://ice1.somafm.com/groovesalad-128-mp3"] },
  { id:"fip", name:"FIP (Radio France)", city:"Paris", country:"France", urls:["https://direct.fipradio.fr/live/fip-midfi.mp3"] },
  { id:"radio-swiss-pop", name:"Radio Swiss Pop", city:"Bern", country:"Switzerland", urls:["https://stream.srg-ssr.ch/m/rsp/mp3_128"] },
];

let state = {
  stations: DEMO_STATIONS.slice(),
  currentId: null,
  favs: JSON.parse(localStorage.getItem("gr:favs") || "[]"),
};

function setVolume(v) {
  audio.volume = v;
  document.getElementById("headerVolume").value = v;
  document.getElementById("headerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
}
setVolume(0.7);
document.getElementById("headerVolume").addEventListener("input", (e)=>setVolume(parseFloat(e.target.value)));

// Playback with HLS support + fallbacks
async function playWithFallback(urls) {
  for (const url of urls) {
    try {
      log("Intentando: " + url);
      if (hls) { hls.destroy(); hls = null; }
      if (url.endsWith(".m3u8")) {
        if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          audio.src = url;
          await audio.play(); return true;
        } else if (window.Hls && window.Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(url);
          hls.attachMedia(audio);
          await new Promise((resolve, reject) => {
            hls.on(Hls.Events.MANIFEST_PARSED, resolve);
            hls.on(Hls.Events.ERROR, (e, data) => { if (data.fatal) reject(data); });
          });
          await audio.play(); return true;
        } else {
          continue;
        }
      } else {
        audio.src = url;
        await audio.play(); return true;
      }
    } catch (e) { continue; }
  }
  return false;
}

function playStation(st) {
  state.currentId = st.id;
  playWithFallback(st.urls || []).then((ok)=>{
    if (!ok) alert("No se pudo reproducir esta emisora. Probá otra.");
    render();
  });
}

function toggleFav(id) {
  const idx = state.favs.indexOf(id);
  if (idx>=0) state.favs.splice(idx,1); else state.favs.push(id);
  localStorage.setItem("gr:favs", JSON.stringify(state.favs));
  render();
}

// Render
function render() {
  // list
  const list = document.getElementById("stationList");
  list.innerHTML = "";
  document.getElementById("countBadge").textContent = `(${state.stations.length})`;
  state.stations.forEach(s => {
    const card = document.createElement("div");
    const active = state.currentId === s.id;
    const fav = state.favs.includes(s.id);
    card.className = `rounded-2xl border p-3 transition cursor-pointer bg-slate-950/50 ${active ? "border-slate-300 shadow" : "border-slate-800 hover:border-slate-700"}`;
    card.addEventListener("click", ()=>playStation(s));
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="font-medium leading-tight">${s.name}</div>
          <div class="text-xs text-slate-400">${s.city ? s.city + ", " : ""}${s.country || ""}</div>
        </div>
        <button class="px-2 py-1 rounded-md border text-xs ${fav ? "bg-pink-500/20 border-pink-400" : "border-slate-700 hover:bg-slate-900"}">${fav?"♥":"♡"}</button>
      </div>
      <div class="mt-3"><button class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-900 font-medium">${active && !audio.paused ? "Pausar" : "Reproducir"}</button></div>
    `;
    card.querySelector("button").addEventListener("click",(e)=>{e.stopPropagation(); toggleFav(s.id)});
    list.appendChild(card);
  });

  // player
  const pb = document.getElementById("playerBox");
  const st = state.stations.find(x=>x.id===state.currentId);
  if (!st) {
    pb.innerHTML = `<div class="text-slate-400">Seleccioná una estación para empezar.</div>`;
  } else {
    pb.innerHTML = `
      <div class="text-sm text-slate-400">Reproduciendo ahora</div>
      <div class="mt-1 text-base font-medium leading-tight">${st.name}</div>
      <div class="text-xs text-slate-400">${st.city ? st.city + ", " : ""}${st.country || ""}</div>
      <div class="mt-3 flex items-center gap-3">
        <button id="togglePlay" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-900 font-medium">${audio.paused ? "Reproducir" : "Pausar"}</button>
      </div>`;
    document.getElementById("togglePlay").addEventListener("click",()=>{ if (audio.paused) audio.play(); else audio.pause(); render(); });
  }
}
audio.addEventListener("play", render);
audio.addEventListener("pause", render);

// Radio Browser via CORS proxy (HTTPS only + playable formats)
const API_POOL = ["https://de1.api.radio-browser.info","https://nl1.api.radio-browser.info","https://fr1.api.radio-browser.info"];
function apiBase(){ return API_POOL[Math.floor(Math.random()*API_POOL.length)]; }
function rb(url){ return `https://corsproxy.io/?${encodeURIComponent(url)}`; }

function isPlayable(st) {
  const u = st.url_resolved || st.url;
  if (!u || !u.startsWith("https://")) return false; // evita mixed content
  const lc = u.toLowerCase();
  return lc.endsWith(".mp3") || lc.endsWith(".aac") || lc.endsWith(".m3u8") || lc.includes("/stream") || lc.includes("listen");
}

function mapRB(s){
  return { id:s.stationuuid, name:s.name, city:s.state || s.geo_region || "", country:s.country || s.countrycode, urls:[s.url_resolved || s.url] };
}

async function searchOnline(query){
  const status = document.getElementById("onlineStatus");
  status.textContent = "Buscando…";
  try{
    const url = rb(`${apiBase()}/json/stations/search?limit=200&hidebroken=true&is_https=true&order=clickcount&reverse=true&name=${encodeURIComponent(query)}`);
    const res = await fetch(url);
    const data = await res.json();
    const filtered = data.filter(isPlayable).map(mapRB);
    state.stations = filtered;
    state.currentId = null;
    status.textContent = filtered.length ? `Encontradas ${filtered.length}.` : "Sin resultados HTTPS reproducibles.";
    render();
  }catch(e){
    status.textContent = "Error buscando radios (CORS). Probá de nuevo.";
  }
}

// Bind search
document.getElementById("onlineSearchBtn").addEventListener("click",()=>{
  const q = document.getElementById("onlineQuery").value.trim();
  if (!q) return;
  searchOnline(q);
});
document.getElementById("portsmouthBtn").addEventListener("click",()=>{
  document.getElementById("onlineQuery").value = "Portsmouth";
  searchOnline("Portsmouth");
});
document.getElementById("ukBtn").addEventListener("click",()=>{
  document.getElementById("onlineQuery").value = "United Kingdom";
  searchOnline("United Kingdom");
});
document.getElementById("rockBtn").addEventListener("click",()=>{
  document.getElementById("onlineQuery").value = "Rock";
  searchOnline("Rock");
});
document.getElementById("useDemoBtn").addEventListener("click",()=>{
  state.stations = DEMO_STATIONS.slice();
  state.currentId = null;
  document.getElementById("onlineStatus").textContent = "";
  render();
});

// Initial load: Portsmouth
document.getElementById("onlineQuery").value = "Portsmouth";
searchOnline("Portsmouth");
render();
