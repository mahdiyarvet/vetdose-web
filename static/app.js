"use strict";

let DRUG_INDEX = [];
let currentDrug   = null;
let currentLang   = "fa";
let selectedRoute = null;   // null = nothing chosen yet

const $ = id => document.getElementById(id);

// ── Main routes (always 4 fixed buttons) ────────────────────
const MAIN_ROUTES = [
  { key:"PO", emoji:"💊", fa:"خوراکی",    en:"Oral (PO)" },
  { key:"IV", emoji:"💉", fa:"وریدی",     en:"Intravenous (IV)" },
  { key:"IM", emoji:"💪", fa:"عضلانی",    en:"Intramuscular (IM)" },
  { key:"SC", emoji:"🩹", fa:"زیرپوستی", en:"Subcutaneous (SC)" },
];

const EXTRA_ROUTE_FA = {
  "Epidural":"اپیدورال","Topical":"موضعی","Inhaled":"استنشاقی",
  "Nebulized":"نبولایزر","Intranasal":"داخل بینی","Rectal":"رکتال",
  "IO":"داخل استخوانی","IP":"داخل صفاقی","Buccal":"باکال",
  "Sublingual":"زیرزبانی","Transdermal":"ترنسدرمال",
  "Intramammary":"داخل پستانی","Intratracheal":"داخل نایی",
  "Intraruminal":"داخل شکمبه‌ای",
};

const FREQ_FA = {
  "Once daily":"روزانه ۱ بار","Once daily (q24h)":"روزانه ۱ بار",
  "Twice daily (q12h)":"روزانه ۲ بار","3 times daily (q8h)":"روزانه ۳ بار",
  "4 times daily (q6h)":"روزانه ۴ بار","Every 48 hours":"هر ۴۸ ساعت",
  "Every 72 hours":"هر ۷۲ ساعت","once daily":"روزانه ۱ بار",
  "twice daily":"روزانه ۲ بار","every 12 hours":"هر ۱۲ ساعت",
  "every 24 hours":"هر ۲۴ ساعت","every 8 hours":"هر ۸ ساعت",
  "every 6 hours":"هر ۶ ساعت","every 8 to 12 hours":"هر ۸ تا ۱۲ ساعت",
  "every 12 to 24 hours":"هر ۱۲ تا ۲۴ ساعت","every 6 to 8 hours":"هر ۶ تا ۸ ساعت",
  "every 6 to 12 hours":"هر ۶ تا ۱۲ ساعت","every 4 to 8 hours":"هر ۴ تا ۸ ساعت",
  "every 4 hours":"هر ۴ ساعت","every 48 hours":"هر ۴۸ ساعت",
  "every 72 hours":"هر ۷۲ ساعت","every 4 to 6 hours":"هر ۴ تا ۶ ساعت",
  "every 6 to 24 hours":"هر ۶ تا ۲۴ ساعت","every 2 to 4 hours":"هر ۲ تا ۴ ساعت",
};

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const r = await fetch("/api/drugs");
    DRUG_INDEX = await r.json();
  } catch(e) { console.error("Index load failed", e); }
  setupSearch();
  setupLang();
  setupTabs();
  setupCalcListeners();
  // Dose section hidden until route chosen
  setDoseSectionVisible(false);
});

// ── Language ─────────────────────────────────────────────────
function setupLang() {
  $("langToggle").addEventListener("click", () => {
    currentLang = currentLang === "fa" ? "en" : "fa";
    applyLang();
  });
}
function applyLang() {
  document.body.setAttribute("data-lang", currentLang);
  document.documentElement.setAttribute("dir", currentLang === "fa" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", currentLang);
  document.querySelectorAll("[data-fa][data-en]").forEach(el => {
    el.textContent = currentLang === "fa" ? el.dataset.fa : el.dataset.en;
  });
  document.querySelectorAll("[data-fa-ph][data-en-ph]").forEach(el => {
    el.placeholder = currentLang === "fa" ? el.dataset.faPh : el.dataset.enPh;
  });
  if (currentDrug) { renderSpeciesSelect(); renderTabs(); }
}

// ── Search ───────────────────────────────────────────────────
function setupSearch() {
  const input = $("drugSearch"), box = $("suggestions"), clrBtn = $("clearSearch");
  let activeIdx = -1, matches = [];

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    clrBtn.hidden = !q;
    if (!q) { box.hidden = true; return; }
    matches = DRUG_INDEX.filter(d => d.name.toLowerCase().includes(q));
    matches.sort((a,b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0:1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0:1;
      return ap - bp || a.name.localeCompare(b.name);
    });
    matches = matches.slice(0,20);
    activeIdx = -1;
    renderSuggestions(matches);
  });

  input.addEventListener("keydown", e => {
    if (box.hidden) return;
    const items = box.querySelectorAll(".sugg-item");
    if (e.key==="ArrowDown"){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,items.length-1); }
    else if (e.key==="ArrowUp"){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); }
    else if (e.key==="Enter" && activeIdx>=0){ e.preventDefault(); selectDrug(matches[activeIdx].name); return; }
    else if (e.key==="Escape"){ box.hidden=true; return; }
    items.forEach((it,i) => it.classList.toggle("active", i===activeIdx));
    if (items[activeIdx]) items[activeIdx].scrollIntoView({block:"nearest"});
  });

  clrBtn.addEventListener("click", () => {
    input.value=""; clrBtn.hidden=true; box.hidden=true; input.focus();
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-card")) box.hidden=true;
  });
}

function renderSuggestions(matches) {
  const box = $("suggestions");
  if (!matches.length){ box.hidden=true; return; }
  box.innerHTML = matches.map(d =>
    `<div class="sugg-item" data-name="${esc(d.name)}">
      <div>
        <div class="sugg-name">${esc(d.name)}</div>
        ${d.drug_class ? `<div class="sugg-class">${esc(d.drug_class)}</div>`:""}
      </div>
      <span class="sugg-badge ${d.has_dose?"":"no-dose"}">${currentLang==="fa"?(d.has_dose?"دوز عددی":"متن دوز"):(d.has_dose?"numeric":"text")}</span>
    </div>`
  ).join("");
  box.querySelectorAll(".sugg-item").forEach(it =>
    it.addEventListener("click", () => selectDrug(it.dataset.name))
  );
  box.hidden = false;
}

// ── Load drug ────────────────────────────────────────────────
async function selectDrug(name) {
  $("suggestions").hidden = true;
  $("drugSearch").value = name;
  $("clearSearch").hidden = false;

  let data;
  try {
    const r = await fetch("/api/drug/" + encodeURIComponent(name));
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch(e) { console.error("Drug load failed", e); return; }

  currentDrug   = data;
  selectedRoute = null;

  $("emptyState").hidden = true;
  $("drugPanel").hidden  = false;
  $("drugName").textContent  = currentDrug.name || "";
  $("drugClass").textContent = currentDrug.drug_class || "";

  renderSpeciesSelect();
  renderTabs();
  setDoseSectionVisible(false);
  $("resultBox").hidden = true;
  $("doseNote").textContent = "";

  $("drugPanel").scrollIntoView({behavior:"smooth", block:"start"});
}

// ── Species ──────────────────────────────────────────────────
function renderSpeciesSelect() {
  const sel = $("speciesSelect");
  if (!currentDrug.species || !currentDrug.species.length) {
    document.querySelector(".calc-card").style.display = "none";
    return;
  }
  document.querySelector(".calc-card").style.display = "";
  sel.innerHTML = currentDrug.species.map((s,i) => {
    const label = currentLang==="fa" ? s.label_fa : s.label_en;
    return `<option value="${i}">${s.emoji} ${label}</option>`;
  }).join("");
  sel.onchange = () => {
    selectedRoute = null;
    renderRouteButtons();
    setDoseSectionVisible(false);
    $("resultBox").hidden = true;
  };
  renderRouteButtons();
}

// ── Route buttons (always 4 main + extras) ───────────────────
function renderRouteButtons() {
  const spIdx = +$("speciesSelect").value;
  const sp    = currentDrug.species[spIdx];
  const drugRoutes = new Set(sp.available_routes || []);
  const container  = $("routeButtons");

  // Extra routes beyond the main 4
  const extras = [...drugRoutes].filter(r => !MAIN_ROUTES.find(m => m.key===r));

  let html = "";
  // Always render the 4 main routes
  MAIN_ROUTES.forEach(r => {
    const hasData = drugRoutes.has(r.key);
    const isActive = selectedRoute === r.key;
    const label = currentLang==="fa" ? r.fa : r.en;
    html += `<button class="route-btn${isActive?" active":""}${hasData?"":" no-data"}"
      data-route="${r.key}" onclick="pickRoute('${r.key}')">
      ${r.emoji} ${label}</button>`;
  });
  // Extra routes (dashed border)
  extras.forEach(r => {
    const isActive = selectedRoute === r;
    const label = currentLang==="fa" ? (EXTRA_ROUTE_FA[r] || r) : r;
    html += `<button class="route-btn extra${isActive?" active":""}"
      data-route="${r}" onclick="pickRoute('${r}')">${label}</button>`;
  });
  container.innerHTML = html;
}

function pickRoute(route) {
  selectedRoute = route;
  // Update active state
  document.querySelectorAll(".route-btn").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.route === route)
  );
  // Show dose section
  setDoseSectionVisible(true);
  renderDoseSelect();
}

function setDoseSectionVisible(visible) {
  const el = $("doseSection");
  if (el) el.style.display = visible ? "" : "none";
}

// ── Dose select ──────────────────────────────────────────────
function renderDoseSelect() {
  const spIdx = +$("speciesSelect").value;
  const sp    = currentDrug.species[spIdx];
  const sel   = $("doseSelect");

  const allDoses = sp.doses || [];
  const filtered = selectedRoute
    ? allDoses.filter(d => d.route === selectedRoute)
    : allDoses;

  if (!filtered.length) {
    const msg = currentLang==="fa"
      ? `دوزی برای روش ${routeLabel(selectedRoute)} در پلامبز ثبت نشده — متن کامل را ببینید`
      : `No ${selectedRoute} dose in Plumb's — see full dosage text`;
    sel.innerHTML = `<option value="-1">${msg}</option>`;
    sel.disabled  = true;
    $("resultBox").hidden = true;
    $("doseNote").textContent = "";
    return;
  }

  sel.disabled  = false;
  sel.innerHTML = filtered.map(d => {
    const origIdx = allDoses.indexOf(d);
    const range   = d.low===d.high ? `${d.low}` : `${d.low}–${d.high}`;
    const freqRaw = d.freq_display || d.freq || "";
    const freqLabel = freqRaw
      ? (currentLang==="fa" ? (FREQ_FA[freqRaw]||FREQ_FA[d.freq]||freqRaw) : freqRaw)
      : "";
    // Indication: prefer Persian in fa mode
    const indText = currentLang==="fa"
      ? (d.indication_fa || d.indication || "")
      : (d.indication || "");

    let label = `${range} ${d.unit}/kg`;
    if (freqLabel) label += ` | ${freqLabel}`;
    if (indText)   label += ` — ${truncate(indText, 50)}`;

    return `<option value="${origIdx}">${label}</option>`;
  }).join("");
  sel.onchange = onDoseChanged;
  onDoseChanged();
}

function routeLabel(r) {
  const m = MAIN_ROUTES.find(x => x.key===r);
  if (m) return currentLang==="fa" ? m.fa : m.en;
  return currentLang==="fa" ? (EXTRA_ROUTE_FA[r]||r) : r;
}

function onDoseChanged() {
  const spIdx = +$("speciesSelect").value;
  const dIdx  = +$("doseSelect").value;
  const sp    = currentDrug.species[spIdx];
  const dose  = sp.doses[dIdx];
  if (!dose) { $("resultBox").hidden=true; return; }

  const freqRaw   = dose.freq_display || dose.freq || "";
  const freqLabel = currentLang==="fa"
    ? (FREQ_FA[freqRaw]||FREQ_FA[dose.freq]||freqRaw)
    : freqRaw;
  const indText = currentLang==="fa"
    ? (dose.indication_fa || dose.indication || "")
    : (dose.indication || "");
  const rLabel = dose.route ? routeLabel(dose.route) : "";

  let note = indText;
  if (freqLabel) note += (note?" · ":"")+freqLabel;
  if (rLabel)    note += (note?" · ":"")+rLabel;
  $("doseNote").textContent = note ? `Plumb's: ${note}` : "";
  calculate();
}

// ── Calculation ──────────────────────────────────────────────
function setupCalcListeners() {
  ["weightInput","concInput"].forEach(id =>
    $(id) && $(id).addEventListener("input", calculate)
  );
}

async function calculate() {
  const weight = parseFloat($("weightInput").value);
  const spIdx  = +$("speciesSelect").value;
  const dIdx   = +$("doseSelect").value;
  const sp     = currentDrug?.species[spIdx];
  const dose   = sp?.doses?.[dIdx];
  if (!dose || !weight || weight<=0) { $("resultBox").hidden=true; return; }

  const conc = parseFloat($("concInput").value)||null;
  try {
    const r = await fetch("/api/calculate",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({weight, dose_low:dose.low, dose_high:dose.high, unit:dose.unit, concentration:conc})
    });
    const res = await r.json();
    if (res.error){ $("resultBox").hidden=true; return; }
    const dl=res.total_dose_low, dh=res.total_dose_high;
    $("totalDose").textContent = (dl===dh?fmt(dl):`${fmt(dl)} – ${fmt(dh)}`) + " " + res.unit;
    if (res.volume_low!=null){
      $("totalVolume").textContent = (res.volume_low===res.volume_high?fmt(res.volume_low):`${fmt(res.volume_low)} – ${fmt(res.volume_high)}`) + " ml";
      $("volumeResult").hidden = false;
    } else {
      $("volumeResult").hidden = true;
    }
    $("resultBox").hidden = false;
  } catch(e){ $("resultBox").hidden=true; }
}

// ── Tabs ─────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      ["dosage","precautions","adverse"].forEach(n => {
        const el = $("tab-"+n);
        if (el) el.hidden = (n !== t.dataset.tab);
      });
    });
  });
}

function renderTabs() {
  // ── Dosage ──
  const dosageEl = $("tab-dosage");
  if (dosageEl) {
    let html = "";
    if (currentDrug.general_note && currentDrug.general_note.trim()) {
      html += highlight(currentDrug.general_note) + "\n\n";
    }
    (currentDrug.species||[]).forEach(s => {
      const raw = (s.text||"").replace(new RegExp("^"+escRegex(s.key)+":?\\s*","i"),"").trim();
      if (raw) html += `<span class="sp-head">${s.emoji} ${s.label_en}</span>\n${highlight(raw)}\n\n`;
    });
    dosageEl.innerHTML = html.trim() ||
      (currentLang==="fa"?"اطلاعاتی ثبت نشده است.":"No dosage information recorded.");
  }

  // ── Precautions ──
  const precEl = $("tab-precautions");
  if (precEl) {
    const txt = (currentDrug.precautions || "").trim();
    if (txt) {
      precEl.innerHTML = highlight(txt);
    } else {
      precEl.innerHTML = currentLang==="fa"
        ? "اطلاعاتی ثبت نشده است."
        : "No information recorded.";
    }
  }

  // ── Adverse ──
  const advEl = $("tab-adverse");
  if (advEl) {
    const txt = (currentDrug.adverse || "").trim();
    if (txt) {
      advEl.innerHTML = highlight(txt);
    } else {
      advEl.innerHTML = currentLang==="fa"
        ? "اطلاعاتی ثبت نشده است."
        : "No information recorded.";
    }
  }

  // Reset to dosage tab
  document.querySelectorAll(".tab").forEach((x,i) => x.classList.toggle("active", i===0));
  ["dosage","precautions","adverse"].forEach((n,i) => {
    const el = $("tab-"+n);
    if (el) el.hidden = (i!==0);
  });
}

// ── Helpers ──────────────────────────────────────────────────
function highlight(text) {
  if (!text) return "";
  let t = esc(text);
  t = t.replace(/(\d+(?:\.\d+)?(?:\s*[–\-]\s*\d+(?:\.\d+)?)?\s*(?:mg|g|mcg|µg|ng|units?|IU|mL)\s*\/\s*(?:kg|m[²2]|dog|cat|horse))/gi, "<strong>$1</strong>");
  t = t.replace(/\b(PO|IM|IV|SC|SQ|IO|IP)\b/g, "<strong>$1</strong>");
  return t;
}
function fmt(n){ return Number.isInteger(n)?String(n):parseFloat(n.toFixed(3)).toString(); }
function truncate(s,n){ return s.length>n?s.slice(0,n)+"…":s; }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
