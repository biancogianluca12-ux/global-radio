// Demo list
const DEMO_STATIONS = [
  { id:"radioparadise-main", name:"Radio Paradise – Main Mix", country:"United States", city:"Paradise, CA", genres:["Eclectic","Rock","Indie"], urls:["https://stream.radioparadise.com/aac-320"] },
  { id:"somafm-groove", name:"SomaFM – Groove Salad", country:"United States", city:"San Francisco", genres:["Ambient","Downtempo"], urls:["https://ice1.somafm.com/groovesalad-128-mp3"] },
  { id:"kexp", name:"KEXP 90.3 FM", country:"United States", city:"Seattle", genres:["Indie","Alternative"], urls:["https://kexp-mp3-128.streamguys1.com/kexp128.mp3"] },
  { id:"fip", name:"FIP (Radio France)", country:"France", city:"Paris", genres:["Eclectic","Jazz","World"], urls:["https://direct.fipradio.fr/live/fip-midfi.mp3"] },
  { id:"radio-swiss-pop", name:"Radio Swiss Pop", country:"Switzerland", city:"Bern", genres:["Pop"], urls:["https://stream.srg-ssr.ch/m/rsp/mp3_128"] },
  { id:"bbc-world", name:"BBC World Service", country:"United Kingdom", city:"London", genres:["News","Talk"], urls:["https://stream.live.vc.bbcmedia.co.uk/bbc_world_service"] },
];

// Portsmouth pack (candidatos; algunos pueden no funcionar por CORS o licencias)
const PORTSMOUTH_PACK = [
  {
    id: "express-fm",
    name: "Express FM (93.7)",
    country: "United Kingdom",
    city: "Portsmouth",
    genres: ["Community", "Variety"],
    urls: [
      "https://stream.expressfm.com/expressfm.mp3",
      "https://edge-bau-04-gos2.sharp-stream.com/expressfm.mp3",
      "https://stream.expressfm.com/expressfm.aac"
    ]
  },
  {
    id: "angel-radio-havant",
    name: "Angel Radio (Havant)",
    country: "United Kingdom",
    city: "Havant / Portsmouth Area",
    genres: ["Oldies"],
    urls: [
      "https://stream.angelradio.co.uk/angel.mp3",
      "https://uk1.internet-radio.com/proxy/angelradio?mp=/stream"
    ]
  },
  {
    id: "unmade-radio",
    name: "Unmade Radio",
    country: "United Kingdom",
    city: "Portsmouth",
    genres: ["Community", "Indie"],
    urls: [
      "https://streamer.radio.co/s2c4f4f6a4/listen.m3u8", // ejemplo HLS en radio.co (puede cambiar)
      "https://streamer.radio.co/s2c4f4f6a4/listen"       // fallback directo
    ]
  }
];

// --- State ---
const audio = document.getElementById("audio");
const debugBox = document.getElementById("debugBox");
let hls = null;

let state = {
  volume: 0.7,
  currentId: null,
  favs: JSON.parse(localStorage.getItem("gr:favs") || "[]"),
  stations: DEMO_STATIONS.slice(),
  mode: "demo" // 'demo' | 'portsmouth'
};

function log(msg) {
  debugBox.textContent = msg || "";
}

function setVolume(v) {
  audio.volume = v;
  document.getElementById("headerVolume").value = v;
  document.getElementById("headerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
}
setVolume(state.volume);
document.getElementById("headerVolume").addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));

// Play helper with MP3/AAC/HLS support and fallbacks
async function playWithFallback(urls) {
  for (const url of urls) {
    try {
      log("Intentando: " + url);
      if (hls) { hls.destroy(); hls = null; }
      if (url.endsWith(".m3u8")) {
        if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          audio.src = url;
          await audio.play();
          return true;
        } else if (window.Hls && window.Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(url);
          hls.attachMedia(audio);
          await new Promise((resolve, reject) => {
            hls.on(Hls.Events.MANIFEST_PARSED, resolve);
            hls.on(Hls.Events.ERROR, (e, data) => { if (data.fatal) reject(data); });
          });
          await audio.play();
          return true;
        } else {
          // No HLS support — probar siguiente URL
          continue;
        }
      } else {
        audio.src = url;
        await audio.play();
        return true;
      }
    } catch (e) {
      // probar siguiente
      continue;
    }
  }
  return false;
}

function playStation(st) {
  state.currentId = st.id;
  const urls = st.urls || [];
  playWithFallback(urls).then((ok) => {
    if (!ok) alert("No se pudo reproducir esta emisora. Probá otra o pegá otro enlace en 'Agregar estación'.");
    renderAll();
  });
}

// --- UI Renders ---
function renderStations() {
  const list = document.getElementById("stationList");
  list.innerHTML = "";
  const data = state.stations;
  document.getElementById("countBadge").textContent = `(${data.length} • ${state.mode})`;
  data.forEach(s => {
    const active = state.currentId === s.id;
    const fav = state.favs.includes(s.id);
    const card = document.createElement("div");
    card.className = `rounded-2xl border p-3 transition cursor-pointer bg-slate-950/50 ${active ? "border-slate-300 shadow" : "border-slate-800 hover:border-slate-700"}`;
    card.addEventListener("click", () => playStation(s));

    const row = document.createElement("div");
    row.className = "flex items-start justify-between gap-2";
    const left = document.createElement("div");
    left.innerHTML = `<div class="font-medium leading-tight">${s.name}</div>
      <div class="text-xs text-slate-400">${s.city ? s.city + ", " : ""}${s.country || ""}</div>`;
    const favBtn = document.createElement("button");
    favBtn.className = `px-2 py-1 rounded-md border text-xs ${fav ? "bg-pink-500/20 border-pink-400" : "border-slate-700 hover:bg-slate-900"}`;
    favBtn.textContent = fav ? "♥" : "♡";
    favBtn.title = fav ? "Quitar de favoritos" : "Agregar a favoritos";
    favBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleFav(s.id); });
    row.appendChild(left);
    row.appendChild(favBtn);
    card.appendChild(row);

    const tags = document.createElement("div");
    tags.className = "mt-2 flex flex-wrap gap-1";
    (s.genres || []).forEach(g => {
      const b = document.createElement("span");
      b.className = "px-2 py-0.5 rounded-md border bg-slate-800/80 border-slate-700 text-xs";
      b.textContent = g;
      tags.appendChild(b);
    });
    card.appendChild(tags);

    const playRow = document.createElement("div");
    playRow.className = "mt-3 flex items-center gap-2";
    const btn = document.createElement("button");
    btn.className = "px-3 py-1.5 rounded-md bg-slate-200 text-slate-900 font-medium";
    btn.textContent = active && !audio.paused ? "Pausar" : "Reproducir";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (active) {
        if (audio.paused) audio.play(); else audio.pause();
        renderAll();
      } else {
        playStation(s);
      }
    });
    playRow.appendChild(btn);
    card.appendChild(playRow);

    list.appendChild(card);
  });
}

function renderPlayer() {
  const box = document.getElementById("playerBox");
  const st = state.stations.find(x => x.id === state.currentId);
  if (!st) {
    box.innerHTML = `<div class="text-slate-400">Seleccioná una estación para empezar.</div>`;
    return;
  }
  box.innerHTML = `
    <div class="text-sm text-slate-400">Reproduciendo ahora</div>
    <div class="mt-1 text-base font-medium leading-tight">${st.name}</div>
    <div class="text-xs text-slate-400">${st.city ? st.city + ", " : ""}${st.country || ""}</div>
    <div class="mt-3 flex items-center gap-3">
      <button id="togglePlay" class="px-3 py-1.5 rounded-md bg-slate-200 text-slate-900 font-medium">${audio.paused ? "Reproducir" : "Pausar"}</button>
      <div class="text-slate-300 text-sm flex items-center gap-2">
        <span>🔊</span>
        <input id="playerVolume" type="range" min="0" max="1" step="0.01" value="${audio.volume}" class="w-40 accent-slate-300"/>
        <span id="playerVolumeLabel" class="tabular-nums">${Math.round(audio.volume * 100)}%</span>
      </div>
    </div>
  `;
  document.getElementById("togglePlay").addEventListener("click", () => {
    if (audio.paused) audio.play(); else audio.pause();
    renderAll();
  });
  const pv = document.getElementById("playerVolume");
  pv.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    document.getElementById("playerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
  });
}

function setVolume(v) {
  audio.volume = v;
  document.getElementById("headerVolume").value = v;
  document.getElementById("headerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
}

function renderModeLabel() {
  const label = document.getElementById("modeLabel");
  label.textContent = state.mode === "portsmouth" ? "Pack Portsmouth activo" : "Lista de ejemplo";
}

function renderFavs() {
  const box = document.getElementById("favsBox");
  if (state.favs.length === 0) {
    box.className = "flex flex-wrap gap-2 text-sm text-slate-400";
    box.textContent = "Aún no guardaste estaciones.";
    return;
  }
  box.className = "flex flex-wrap gap-2";
  box.innerHTML = "";
  state.favs.map(id => state.stations.find(s => s.id === id) || {id, name:id}).forEach(s => {
    const b = document.createElement("span");
    b.className = "px-2 py-0.5 rounded-md border bg-slate-800/80 border-slate-700 text-xs";
    b.textContent = s.name;
    box.appendChild(b);
  });
}

function renderAll() {
  renderModeLabel();
  renderStations();
  renderPlayer();
  renderFavs();
  log("");
}

function toggleFav(id) {
  const idx = state.favs.indexOf(id);
  if (idx >= 0) state.favs.splice(idx,1); else state.favs.push(id);
  localStorage.setItem("gr:favs", JSON.stringify(state.favs));
  renderAll();
}

// Buttons
document.getElementById("useDemoBtn").addEventListener("click", () => {
  state.mode = "demo";
  state.stations = DEMO_STATIONS.slice();
  state.currentId = null;
  renderAll();
});
document.getElementById("usePortsmouthBtn").addEventListener("click", () => {
  state.mode = "portsmouth";
  state.stations = PORTSMOUTH_PACK.slice();
  state.currentId = null;
  renderAll();
});
document.getElementById("addManualBtn").addEventListener("click", () => {
  const name = document.getElementById("manName").value.trim();
  const city = document.getElementById("manCity").value.trim();
  const country = document.getElementById("manCountry").value.trim();
  const url = document.getElementById("manUrl").value.trim();
  if (!name || !url) { alert("Necesitás al menos nombre y URL del stream."); return; }
  const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `manual-${Date.now()}`) + Math.floor(Math.random()*1000);
  const station = { id, name, city, country, urls:[url] };
  state.stations.unshift(station);
  state.currentId = id;
  playStation(station);
  ["manName","manCity","manCountry","manUrl"].forEach(i => document.getElementById(i).value = "");
  renderAll();
});

// sync
audio.addEventListener("play", renderAll);
audio.addEventListener("pause", renderAll);

// initial
renderAll();
