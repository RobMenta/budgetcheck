const STORAGE_KEY = "budgetcheck:pwa:v2";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function euroToCents(input) {
  const cleaned = (input || "").replace(",", ".").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function centsToEuro(cents) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function fmtDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveAll(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function defaultMonthData() {
  return {
    incomeCents: 200000, // 2000€
    fixed: [
      // Appart
      { id: uid(), group: "Appart", name: "Loyer", amountCents: 65000, paid: false },
      { id: uid(), group: "Appart", name: "Assurance habitation", amountCents: 2000, paid: false },
      { id: uid(), group: "Appart", name: "Électricité", amountCents: 10700, paid: false },
      { id: uid(), group: "Appart", name: "Eau", amountCents: 1800, paid: false },

      // Perso
      { id: uid(), group: "Perso", name: "Téléphone + ChatGPT + Crunchyroll", amountCents: 4600, paid: false },
      { id: uid(), group: "Perso", name: "Assurance voiture", amountCents: 6500, paid: false },
      { id: uid(), group: "Perso", name: "Coiffeur", amountCents: 2000, paid: false },
      { id: uid(), group: "Perso", name: "Spotify + YouTube", amountCents: 1200, paid: false },
      { id: uid(), group: "Perso", name: "Netflix", amountCents: 1500, paid: false },
      { id: uid(), group: "Perso", name: "Crédit voiture", amountCents: 30000, paid: false },
      { id: uid(), group: "Perso", name: "Économie", amountCents: 15000, paid: false },
      { id: uid(), group: "Perso", name: "Internet", amountCents: 2500, paid: false },
    ],
    envelopes: {
      courses: { name: "Courses", limitCents: 20000, spentCents: 0, entries: [] },
      plaisir: { name: "Plaisir", limitCents: 20000, spentCents: 0, entries: [] },
    },
    izly: { spentCents: 0, entries: [] },
  };
}

let currentMonth = monthKey();
let state = defaultMonthData();

const els = {
  monthLabel: document.getElementById("monthLabel"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  resetMonthBtn: document.getElementById("resetMonthBtn"),

  // KPIs
  kIncome: document.getElementById("kIncome"),
  kFixedTotal: document.getElementById("kFixedTotal"),
  kFixedPaid: document.getElementById("kFixedPaid"),
  kFixedRemaining: document.getElementById("kFixedRemaining"),
  kVarSpent: document.getElementById("kVarSpent"),
  kNetLeft: document.getElementById("kNetLeft"),

  // Fixes
  fixedBadge: document.getElementById("fixedBadge"),
  fixedList: document.getElementById("fixedList"),

  // Courses
  coursesLeft: document.getElementById("coursesLeft"),
  coursesLimit: document.getElementById("coursesLimit"),
  coursesSpent: document.getElementById("coursesSpent"),
  coursesAmount: document.getElementById("coursesAmount"),
  coursesNote: document.getElementById("coursesNote"),
  coursesAdd: document.getElementById("coursesAdd"),
  coursesEntries: document.getElementById("coursesEntries"),

  // Plaisir
  funLeft: document.getElementById("funLeft"),
  funLimit: document.getElementById("funLimit"),
  funSpent: document.getElementById("funSpent"),
  funAmount: document.getElementById("funAmount"),
  funNote: document.getElementById("funNote"),
  funAdd: document.getElementById("funAdd"),
  funEntries: document.getElementById("funEntries"),

  // Izly
  izlyTotal: document.getElementById("izlyTotal"),
  izlyAmount: document.getElementById("izlyAmount"),
  izlyNote: document.getElementById("izlyNote"),
  izlyAdd: document.getElementById("izlyAdd"),
  izlyEntries: document.getElementById("izlyEntries"),
};

function loadMonth() {
  const all = loadAll();
  state = all[currentMonth] ?? defaultMonthData();
  render();
}
function persist() {
  const all = loadAll();
  all[currentMonth] = state;
  saveAll(all);
}

function calc() {
  const income = state.incomeCents;

  const fixedTotal = state.fixed.reduce((s, e) => s + e.amountCents, 0);
  const fixedPaid = state.fixed.reduce((s, e) => s + (e.paid ? e.amountCents : 0), 0);
  const fixedRemaining = fixedTotal - fixedPaid;

  const coursesSpent = state.envelopes.courses.spentCents;
  const funSpent = state.envelopes.plaisir.spentCents;
  const izlySpent = state.izly.spentCents;

  const varSpent = coursesSpent + funSpent + izlySpent;

  // Ce que tu as demandé : relié au salaire initial
  const netLeft = income - fixedTotal - varSpent;

  return {
    income,
    fixedTotal,
    fixedPaid,
    fixedRemaining,
    varSpent,
    netLeft,
    coursesSpent,
    funSpent,
    izlySpent,
  };
}

function render() {
  els.monthLabel.textContent = currentMonth;

  const c = calc();

  // KPIs
  els.kIncome.textContent = `${centsToEuro(c.income)} €`;
  els.kFixedTotal.textContent = `${centsToEuro(c.fixedTotal)} €`;
  els.kFixedPaid.textContent = `${centsToEuro(c.fixedPaid)} €`;
  els.kFixedRemaining.textContent = `${centsToEuro(c.fixedRemaining)} €`;
  els.kVarSpent.textContent = `${centsToEuro(c.varSpent)} €`;
  els.kNetLeft.textContent = `${centsToEuro(c.netLeft)} €`;

  // Fixes badge
  const paidCount = state.fixed.filter((e) => e.paid).length;
  els.fixedBadge.textContent = `${paidCount} / ${state.fixed.length} payées`;

  // Fixes list grouped
  els.fixedList.innerHTML = "";
  const groups = ["Appart", "Perso"];
  for (const g of groups) {
    const title = document.createElement("div");
    title.className = "groupTitle";
    title.textContent = g;
    els.fixedList.appendChild(title);

    const items = state.fixed.filter((e) => e.group === g);
    for (const e of items) {
      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.style.flex = "1";

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = e.name;

      const amt = document.createElement("div");
      amt.className = "amt";
      amt.textContent = `${centsToEuro(e.amountCents)} €`;

      left.appendChild(name);
      left.appendChild(amt);

      const actions = document.createElement("div");
      actions.className = "actions";

      const toggle = document.createElement("div");
      toggle.className = "toggle" + (e.paid ? " on" : "");
      const knob = document.createElement("div");
      knob.className = "knob";
      toggle.appendChild(knob);
      toggle.addEventListener("click", () => {
        e.paid = !e.paid;
        persist();
        render();
      });

      actions.appendChild(toggle);

      row.appendChild(left);
      row.appendChild(actions);
      els.fixedList.appendChild(row);
    }
  }

  // Envelopes UI
  const courses = state.envelopes.courses;
  const plaisir = state.envelopes.plaisir;

  const coursesLeft = courses.limitCents - courses.spentCents;
  els.coursesLeft.textContent = `${centsToEuro(coursesLeft)} €`;
  els.coursesLimit.textContent = `${centsToEuro(courses.limitCents)} €`;
  els.coursesSpent.textContent = `${centsToEuro(courses.spentCents)} €`;
  renderEntries(els.coursesEntries, courses.entries);

  const funLeft = plaisir.limitCents - plaisir.spentCents;
  els.funLeft.textContent = `${centsToEuro(funLeft)} €`;
  els.funLimit.textContent = `${centsToEuro(plaisir.limitCents)} €`;
  els.funSpent.textContent = `${centsToEuro(plaisir.spentCents)} €`;
  renderEntries(els.funEntries, plaisir.entries);

  // Izly
  els.izlyTotal.textContent = `${centsToEuro(state.izly.spentCents)} €`;
  renderEntries(els.izlyEntries, state.izly.entries);
}

function renderEntries(container, entries) {
  container.innerHTML = "";
  const list = [...entries].slice(-8).reverse(); // dernières 8
  if (list.length === 0) return;

  for (const it of list) {
    const row = document.createElement("div");
    row.className = "entry";

    const left = document.createElement("div");
    left.className = "entryLeft";

    const main = document.createElement("div");
    main.className = "entryMain";
    main.textContent = it.note ? it.note : "Dépense";

    const sub = document.createElement("div");
    sub.className = "entrySub";
    sub.textContent = fmtDate(it.ts);

    left.appendChild(main);
    left.appendChild(sub);

    const right = document.createElement("div");
    right.className = "entryAmt";
    right.textContent = `-${centsToEuro(it.amountCents)} €`;

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  }
}

function addEnvelopeSpend(key, amountStr, noteStr) {
  const amountCents = euroToCents(amountStr);
  const note = (noteStr || "").trim();

  if (!amountCents || amountCents <= 0) {
    alert("Montant invalide (ex: 4,50).");
    return false;
  }

  const env = state.envelopes[key];
  env.spentCents += amountCents;
  env.entries.push({ id: uid(), ts: Date.now(), amountCents, note });
  persist();
  render();
  return true;
}

function addIzlySpend(amountStr, noteStr) {
  const amountCents = euroToCents(amountStr);
  const note = (noteStr || "").trim();

  if (!amountCents || amountCents <= 0) {
    alert("Montant invalide (ex: 10,00).");
    return false;
  }

  state.izly.spentCents += amountCents;
  state.izly.entries.push({ id: uid(), ts: Date.now(), amountCents, note });
  persist();
  render();
  return true;
}

function goMonth(delta) {
  const [y, m] = currentMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  currentMonth = monthKey(d);
  loadMonth();
}

els.prevMonth.addEventListener("click", () => goMonth(-1));
els.nextMonth.addEventListener("click", () => goMonth(+1));

els.coursesAdd.addEventListener("click", () => {
  if (addEnvelopeSpend("courses", els.coursesAmount.value, els.coursesNote.value)) {
    els.coursesAmount.value = "";
    els.coursesNote.value = "";
  }
});
els.funAdd.addEventListener("click", () => {
  if (addEnvelopeSpend("plaisir", els.funAmount.value, els.funNote.value)) {
    els.funAmount.value = "";
    els.funNote.value = "";
  }
});
els.izlyAdd.addEventListener("click", () => {
  if (addIzlySpend(els.izlyAmount.value, els.izlyNote.value)) {
    els.izlyAmount.value = "";
    els.izlyNote.value = "";
  }
});

els.resetMonthBtn.addEventListener("click", () => {
  if (!confirm("Reset du mois : décocher toutes les fixes + remettre Courses/Plaisir/Izly à zéro ?")) return;
  // on garde les montants et la structure, on remet juste le suivi à 0
  state.fixed = state.fixed.map((e) => ({ ...e, paid: false }));
  state.envelopes.courses.spentCents = 0;
  state.envelopes.courses.entries = [];
  state.envelopes.plaisir.spentCents = 0;
  state.envelopes.plaisir.entries = [];
  state.izly.spentCents = 0;
  state.izly.entries = [];
  persist();
  render();
});

// Service worker (offline)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

loadMonth();
