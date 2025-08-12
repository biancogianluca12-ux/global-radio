// --- Demo stations (fallback) ---
const DEMO_STATIONS = [
  { id:"radioparadise-main", name:"Radio Paradise – Main Mix", country:"United States", city:"Paradise, CA", genres:["Eclectic","Rock","Indie"], bitrate:"320 kbps", codec:"AAC", streamUrl:"https://stream.radioparadise.com/aac-320" },
  { id:"somafm-groove", name:"SomaFM – Groove Salad", country:"United States", city:"San Francisco", genres:["Ambient","Downtempo"], bitrate:"128 kbps", codec:"MP3", streamUrl:"https://ice1.somafm.com/groovesalad-128-mp3" },
  { id:"kexp", name:"KEXP 90.3 FM", country:"United States", city:"Seattle", genres:["Indie","Alternative"], bitrate:"128 kbps", codec:"MP3", streamUrl:"https://kexp-mp3-128.streamguys1.com/kexp128.mp3" },
  { id:"nightride", name:"Nightride FM", country:"Netherlands", city:"Amsterdam", genres:["Synthwave"], bitrate:"128 kbps", codec:"M4A", streamUrl:"https://stream.nightride.fm/nightride.m4a" },
  { id:"fip", name:"FIP (Radio France)", country:"France", city:"Paris", genres:["Eclectic","Jazz","World"], bitrate:"128 kbps", codec:"MP3", streamUrl:"https://direct.fipradio.fr/live/fip-midfi.mp3" },
  { id:"jazz24", name:"Jazz24", country:"United States", city:"Tacoma/Seattle", genres:["Jazz"], bitrate:"96 kbps", codec:"AAC", streamUrl:"https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1" },
  { id:"radio-swiss-pop", name:"Radio Swiss Pop", country:"Switzerland", city:"Bern", genres:["Pop"], bitrate:"128 kbps", codec:"MP3", streamUrl:"https://stream.srg-ssr.ch/m/rsp/mp3_128" },
  { id:"bbc-world", name:"BBC World Service", country:"United Kingdom", city:"London", genres:["News","Talk"], bitrate:"96 kbps", codec:"AAC", streamUrl:"https://stream.live.vc.bbcmedia.co.uk/bbc_world_service" },
];

// --- State & elements ---
const audio = document.getElementById("audio");
let state = {
  volume: 0.7,
  currentId: null,
  favs: JSON.parse(localStorage.getItem("gr:favs") || "[]"),
  stations: DEMO_STATIONS.slice(),
  onlineMode: false,
};

function setVolume(v) {
  state.volume = v;
  audio.volume = v;
  document.getElementById("headerVolume").value = v;
  document.getElementById("headerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
}
setVolume(state.volume);
document.getElementById("headerVolume").addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));

// --- Rendering helpers ---
function renderStations() {
  const list = document.getElementById("stationList");
  list.innerHTML = "";
  const data = state.stations;
  document.getElementById("countBadge").textContent = `(${data.length}${state.onlineMode ? " • online" : ""})`;
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

    const info = document.createElement("div");
    info.className = "mt-2 text-xs text-slate-400";
    info.textContent = s.codec && s.bitrate ? `${s.codec} • ${s.bitrate}` : (s.codec || s.bitrate || "");
    card.appendChild(info);

    const playRow = document.createElement("div");
    playRow.className = "mt-3 flex items-center gap-2";
    const btn = document.createElement("button");
    btn.className = "px-3 py-1.5 rounded-md bg-slate-200 text-slate-900 font-medium";
    btn.textContent = active && !audio.paused ? "Pausar" : "Reproducir";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (active) {
        if (audio.paused) audio.play(); else audio.pause();
        renderPlayer(); renderStations();
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
        <input id="playerVolume" type="range" min="0" max="1" step="0.01" value="${state.volume}" class="w-40 accent-slate-300"/>
        <span id="playerVolumeLabel" class="tabular-nums">${Math.round(state.volume * 100)}%</span>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-1">
      ${(st.genres || []).map(g => `<span class="px-2 py-0.5 rounded-md border bg-slate-800/80 border-slate-700 text-xs">${g}</span>`).join("")}
    </div>
  `;
  document.getElementById("togglePlay").addEventListener("click", () => {
    if (audio.paused) audio.play(); else audio.pause();
    renderPlayer();
    renderStations();
  });
  const pv = document.getElementById("playerVolume");
  pv.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    document.getElementById("playerVolumeLabel").textContent = `${Math.round(v * 100)}%`;
  });
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
  renderStations();
  renderPlayer();
  renderFavs();
}

// --- Actions ---
function toggleFav(id) {
  const idx = state.favs.indexOf(id);
  if (idx >= 0) state.favs.splice(idx,1); else state.favs.push(id);
  localStorage.setItem("gr:favs", JSON.stringify(state.favs));
  renderFavs();
  renderStations();
}

function playStation(st) {
  state.currentId = st.id;
  audio.src = st.streamUrl;
  audio.play().catch(()=>{});
  renderPlayer();
  renderStations();
}

// Keep play/pause labels in sync
audio.addEventListener("play", renderAll);
audio.addEventListener("pause", renderAll);

// --- Radio Browser integration ---
const API_POOL = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];
function apiBase() {
  return API_POOL[Math.floor(Math.random()*API_POOL.length)];
}

// Map Radio Browser station object to our minimal shape
function mapRB(s) {
  return {
    id: s.stationuuid,
    name: s.name,
    country: s.country || s.countrycode,
    city: s.state || s.geo_region || s.country, // RB no siempre trae city; many use state/region
    genres: (s.tags || "").split(",").map(x => x.trim()).filter(Boolean).slice(0,4),
    bitrate: s.bitrate ? `${s.bitrate} kbps` : "",
    codec: (s.codec || "").toUpperCase(),
    streamUrl: s.url_resolved || s.url,
  };
}

// Search function (by free text)
async function searchOnline(query) {
  const status = document.getElementById("onlineStatus");
  status.textContent = "Buscando…";
  try {
    const url = `${apiBase()}/json/stations/search?limit=200&hidebroken=true&order=clickcount&reverse=true&name=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    state.stations = data.map(mapRB).filter(s => s.streamUrl && s.name);
    state.onlineMode = true;
    document.getElementById("countBadge").textContent = `(${state.stations.length} • online)`;
    if (state.stations.length === 0) status.textContent = "Sin resultados. Probá con otra búsqueda (ej.: 'Portsmouth', 'UK', 'Rock').";
    else status.textContent = `Listo. Encontradas ${state.stations.length}.`;
    state.currentId = null;
    renderAll();
  } catch (e) {
    status.textContent = "Error buscando radios. Probá nuevamente.";
  }
}

// Bind UI search
document.getElementById("onlineSearchBtn").addEventListener("click", () => {
  const q = document.getElementById("onlineQuery").value.trim();
  if (!q) return;
  searchOnline(q);
});
document.getElementById("portsmouthBtn").addEventListener("click", () => {
  document.getElementById("onlineQuery").value = "Portsmouth";
  searchOnline("Portsmouth");
});
document.getElementById("londonBtn").addEventListener("click", () => {
  document.getElementById("onlineQuery").value = "London";
  searchOnline("London");
});
document.getElementById("useDemoBtn").addEventListener("click", () => {
  state.onlineMode = false;
  state.stations = DEMO_STATIONS.slice();
  state.currentId = null;
  document.getElementById("onlineStatus").textContent = "";
  renderAll();
});

// Initial render
renderAll();
