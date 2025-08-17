/* Dynamic Quote Generator - Advanced DOM Manipulation */

// ---- Storage / Data ----
const LS_KEY = "dqg_quotes_v1";
const SS_KEY = "dqg_last_quote";
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Motivation" },
  { text: "If you can’t explain it simply, you don’t understand it well enough.", category: "Wisdom" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Tech" },
  { text: "Life is short. Smile while you still have teeth.", category: "Humor" },
  { text: "Simplicity is the soul of efficiency.", category: "Tech" },
  { text: "Where there is love there is life.", category: "Love" },
];

let quotes = loadQuotes();

/** Load quotes from localStorage (fallback to defaults) */
function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUOTES];
  } catch {
    return [...DEFAULT_QUOTES];
  }
}

/** Persist quotes */
function saveQuotes() {
  localStorage.setItem(LS_KEY, JSON.stringify(quotes));
}

/** Unique, sorted categories */
function getCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}

// ---- DOM Refs ----
let $controls, $quoteDisplay, $addFormMount, $categorySelect, $newQuoteBtn, $msgEl;

// ---- Boot ----
document.addEventListener("DOMContentLoaded", init);

function init() {
  // Grab mounts
  $controls = document.getElementById("controls");
  $quoteDisplay = document.getElementById("quoteDisplay");
  $addFormMount = document.getElementById("addFormMount");

  // Build UI dynamically
  createControls();
  createAddQuoteForm();

  // Show last viewed quote if available
  const last = sessionStorage.getItem(SS_KEY);
  if (last) {
    try {
      const q = JSON.parse(last);
      renderQuote(q);
    } catch {
      showRandomQuote();
    }
  } else {
    showRandomQuote();
  }
}

// ---- UI Builders ----
function createControls() {
  $controls.textContent = "";

  const frag = document.createDocumentFragment();

  const label = document.createElement("label");
  label.textContent = "Category:";
  label.setAttribute("for", "categoryFilter");

  $categorySelect = document.createElement("select");
  $categorySelect.id = "categoryFilter";
  populateCategoryOptions($categorySelect);

  $categorySelect.addEventListener("change", () => {
    showRandomQuote();
  });

  // Show New Quote button
  $newQuoteBtn = document.createElement("button");
  $newQuoteBtn.id = "newQuote";
  $newQuoteBtn.type = "button";
  $newQuoteBtn.textContent = "Show New Quote";
  $newQuoteBtn.addEventListener("click", showRandomQuote);

  // Export button
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "Export Quotes";
  exportBtn.addEventListener("click", exportToJsonFile);

  // Import input
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.addEventListener("change", importFromJsonFile);

  // Message area
  $msgEl = document.createElement("div");
  $msgEl.className = "msg";
  $msgEl.setAttribute("role", "status");
  $msgEl.setAttribute("aria-live", "polite");

  frag.appendChild(label);
  frag.appendChild($categorySelect);
  frag.appendChild($newQuoteBtn);
  frag.appendChild(exportBtn);
  frag.appendChild(importInput);
  frag.appendChild($msgEl);

  $controls.appendChild(frag);
}

function populateCategoryOptions(selectEl) {
  selectEl.textContent = "";
  const cats = getCategories();
  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    selectEl.appendChild(opt);
  }
}

function createAddQuoteForm() {
  $addFormMount.textContent = "";

  const form = document.createElement("form");
  form.id = "addQuoteForm";
  form.autocomplete = "off";

  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput

