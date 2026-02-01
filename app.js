const STORAGE_KEY = "budgetcheck:pwa:v4";

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
    incomeCents: 200000, // valeur par défaut (modifiable via l'input)
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
      courses: { limitCents: 20000, spentCents: 0, entries: [] },
      plaisir: { limitCents: 20000, spentCents: 0, entries: [] },
    },
    izly: { spentCents: 0, entries: [] },
    fuel: { spentCents: 0, entries: [] }, // Essence
  };
}

let currentMonth = monthKey();
let state = defaultMonthData();

const els = {
  monthLabel: document.getElementById("monthLabel"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  resetMonthBtn: document.getElementById("resetMonthBtn"),

  incomeInput: document.getElementById("incomeInput"),

  kFixedTotal: document.getElementById("kFixedTotal"),
  kFixedPaid: document.getElementById("kFixedPaid"),
  kFixedRemaining: document.getElementById("kFixedRemaining"),
  kNetLeft: document.getElementById("kNetLeft"),

  fixedBadge: document.getElementById("fixedBadge"),
  fixedList: document.getElementById("fixedList"),

  coursesLeft: document.getElementById("coursesLeft"),
  coursesLimit: document.getElementById("coursesLimit"),
  coursesSpent: document.getElementById("coursesSpent"),
  coursesAmount: document.getElementById("coursesAmount"),
  coursesAdd: document.getElementById("coursesAdd"),
  coursesEntries: document.getElementById("coursesEntries"),

  funLeft: document.getElementById("funLeft"),
  funLimit: document.getElementById("funLimit"),
  funSpent: document.getElementById("funSpent"),
  funAmount: document.getElementById("funAmount"),
  funAdd: document.getElementById("funAdd"),
  funEntries: document.getElementById("funEntries"),

  izlyTotal: document.getElementById("izlyTotal"),
  izlyAmount: document.getElementById("izlyAmount"),
  izlyAdd: document.getElementById("izlyAdd"),
  izlyEntries: document.getElementById("izlyEntries"),

  fuelTotal: document.getElementById("fuelTotal"),
  fuelAmount: document.getElementById("fuelAmount"),
  fuelAdd: document.getElementById("fuelAdd"),
  fuelEntries: document.getElementById("fuelEntries"),
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

  // Fixes Appart + Perso
  const fixedExpensesTotal = state.fixed.reduce((s, e) => s + e.amountCents, 0);
  const fixedPaid = state.fixed.reduce((s, e) => s + (e.paid ? e.amountCents : 0), 0);
  const unpaidFixed = fixedExpensesTotal - fixedPaid;

  // Budgets (Courses + Plaisir) comptés dans le “fixe”
  const courses = state.envelopes.courses;
  const plaisir = state.envelopes.plaisir;

  const budgetsTotal = courses.limitCents + plaisir.limitCents; // 200 + 200
  const budgetsRemaining =
    (courses.limitCents - courses.spentCents) +
    (plaisir.limitCents - plaisir.spentCents);

  const fixedTotal = fixedExpensesTotal + budgetsTotal;
  const fixedRemaining = unpaidFixed + budgetsRemaining;

  // Cumul “hors budgets”
  const izlySpent = state.izly.spentCents;
  const fuelSpent = state.fuel.spentCents;

  // Reste sur salaire demandé
  const netLeft = income - fixedTotal - izlySpent - fuelSpent;

  return {
    fixedTotal,
    fixedPaid,
    fixedRemaining,
    netLeft,
    courses,
    plaisir,
    izlySpent,
    fuelSpent,
  };
}

function render() {
  els.monthLabel.textContent = currentMonth;

  // salaire input (affiché)
  els.incomeInput.value = centsToEuro(state.incomeCents);

  const c = calc();

  // KPIs
  els.kFixedTotal.textContent = `${centsToEuro(c.fixedTotal)} €`;
  els.kFixedPaid.textContent = `${centsToEuro(c.fixedPaid)} €`;
  els.kFixedRemaining.textContent = `${centsToEuro(c.fixedRemaining)} €`;
  els.kNetLeft.textContent = `${centsToEuro(c.netLeft)} €`;

  // Fixes badge
  const paidCount = state.fixed.filter((e) => e.paid).length;
  els.fixedBadge.textContent = `${paidCount} / ${state.fixed.length} payées`;

  // Fixes list (Appart / Perso)
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

  // Courses
  els.coursesLimit.textContent = `${centsToEuro(state.envelopes.courses.limitCents)} €`;
  els.coursesSpent.textContent = `${centsToEuro(state.envelopes.courses.spentCents)} €`;
  els.coursesLeft.textContent = `${centsToEuro(state.envelopes.courses.limitCents - state.envelopes.courses.spentCents)} €`;
  renderEntries(els.coursesEntries, state.envelopes.courses.entries);

  // Plaisir
  els.funLimit.textContent = `${centsToEuro(state.envelopes.plaisir.limitCents)} €`;
  els.funSpent.textContent = `${centsToEuro(state.envelopes.plaisir.spentCents)} €`;
  els.funLeft.textContent = `${centsToEuro(state.envelopes.plaisir.limitCents - state.envelopes.plaisir.spentCents)} €`;
  renderEntries(els.funEntries, state.envelopes.plaisir.entries);

  // Izly
  els.izlyTotal.textContent = `${centsToEuro(state.izly.spentCents)} €`;
  renderEntries(els.izlyEntries, state.izly.entries);

  // Essence
  els.fuelTotal.textContent = `${centsToEuro(state.fuel.spentCents)} €`;
  renderEntries(els.fuelEntries, state.fuel.entries);
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
    main.textContent = "Dépense";

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

function addEnvelopeSpend(key, amountStr) {
  const amountCents = euroToCents(amountStr);
  if (!amountCents || amountCents <= 0) {
    alert("Montant invalide (ex: 4,50).");
    return false;
  }
  const env = state.envelopes[key];
  env.spentCents += amountCents;
  env.entries.push({ id: uid(), ts: Date.now(), amountCents });
  persist();
  render();
  return true;
}

function addCumulativeSpend(obj, amountStr) {
  const amountCents = euroToCents(amountStr);
  if (!amountCents || amountCents <= 0) {
    alert("Montant invalide (ex: 10,00).");
    return false;
  }
  obj.spentCents += amountCents;
  obj.entries.push({ id: uid(), ts: Date.now(), amountCents });
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
  if (addEnvelopeSpend("courses", els.coursesAmount.value)) els.coursesAmount.value = "";
});
els.funAdd.addEventListener("click", () => {
  if (addEnvelopeSpend("plaisir", els.funAmount.value)) els.funAmount.value = "";
});
els.izlyAdd.addEventListener("click", () => {
  if (addCumulativeSpend(state.izly, els.izlyAmount.value)) els.izlyAmount.value = "";
});
els.fuelAdd.addEventListener("click", () => {
  if (addCumulativeSpend(state.fuel, els.fuelAmount.value)) els.fuelAmount.value = "";
});

// Salaire modifiable (on sauvegarde quand tu changes la valeur)
els.incomeInput.addEventListener("change", () => {
  state.incomeCents = euroToCents(els.incomeInput.value);
  persist();
  render();
});

els.resetMonthBtn.addEventListener("click", () => {
  if (!confirm("Reset du mois : décocher fixes + remettre Courses/Plaisir/Izly/Essence à zéro ?")) return;
  state.fixed = state.fixed.map((e) => ({ ...e, paid: false }));
  state.envelopes.courses.spentCents = 0;
  state.envelopes.courses.entries = [];
  state.envelopes.plaisir.spentCents = 0;
  state.envelopes.plaisir.entries = [];
  state.izly.spentCents = 0;
  state.izly.entries = [];
  state.fuel.spentCents = 0;
  state.fuel.entries = [];
  persist();
  render();
});

// Offline (service worker)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

loadMonth();
