/* Dynamic Quote Generator - Advanced DOM Manipulation */

// ---- Storage / Data ----
const LS_KEY = "dqg_quotes_v1";
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

/** Unique, sorted categories (case-insensitive) */
function getCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}

// ---- DOM Refs (created later) ----
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

  // Show something initially
  showRandomQuote();
}

// ---- UI Builders ----

/** Build category filter + “Show New Quote” button */
function createControls() {
  // Clear controls mount
  $controls.textContent = "";

  // Category label + select (use DocumentFragment for performance)
  const frag = document.createDocumentFragment();

  const label = document.createElement("label");
  label.textContent = "Category:";
  label.setAttribute("for", "categoryFilter");

  $categorySelect = document.createElement("select");
  $categorySelect.id = "categoryFilter";
  populateCategoryOptions($categorySelect);

  $categorySelect.addEventListener("change", () => {
    // Optionally auto-refresh a quote on change
    showRandomQuote();
  });

  // New Quote button
  $newQuoteBtn = document.createElement("button");
  $newQuoteBtn.id = "newQuote";
  $newQuoteBtn.type = "button";
  $newQuoteBtn.textContent = "Show New Quote";
  $newQuoteBtn.addEventListener("click", showRandomQuote);

  // Message area (status / alerts)
  $msgEl = document.createElement("div");
  $msgEl.className = "msg";
  $msgEl.setAttribute("role", "status");
  $msgEl.setAttribute("aria-live", "polite");

  frag.appendChild(label);
  frag.appendChild($categorySelect);
  frag.appendChild($newQuoteBtn);
  frag.appendChild($msgEl);

  $controls.appendChild(frag);
}

/** Fill category select with current categories */
function populateCategoryOptions(selectEl) {
  selectEl.textContent = ""; // clear
  const cats = getCategories();
  const frag = document.createDocumentFragment();
  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    frag.appendChild(opt);
  }
  selectEl.appendChild(frag);
}

/** Build the “Add Quote” form dynamically (advanced DOM) */
function createAddQuoteForm() {
  $addFormMount.textContent = "";

  const form = document.createElement("form");
  form.id = "addQuoteForm";
  form.autocomplete = "off";

  // Quote text
  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";
  quoteInput.required = true;

  // Category input + datalist with existing categories for suggestions
  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";
  categoryInput.setAttribute("list", "category-suggestions");
  categoryInput.required = true;

  const datalist = document.createElement("datalist");
  datalist.id = "category-suggestions";
  refreshCategoryDatalist(datalist);

  // Add button
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.textContent = "Add Quote";

  // Hint
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Tip: adding a quote with a new category will create that category automatically.";

  form.className = "row";
  form.appendChild(quoteInput);
  form.appendChild(categoryInput);
  form.appendChild(addBtn);

  // Events
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addQuote();
  });

  $addFormMount.appendChild(form);
  $addFormMount.appendChild(datalist);
  $addFormMount.appendChild(hint);

  // ALSO expose a global addQuote() in case you prefer inline HTML onclick (per spec).
  window.addQuote = addQuote;
}

/** Sync datalist options with current categories */
function refreshCategoryDatalist(datalistEl) {
  datalistEl.textContent = "";
  for (const c of getCategories().filter(c => c !== "All")) {
    const opt = document.createElement("option");
    opt.value = c;
    datalistEl.appendChild(opt);
  }
}

// ---- Core Features ----

/** Show a random quote (respecting selected category) */
function showRandomQuote() {
  const selected = $categorySelect?.value || "All";
  const pool = selected === "All"
    ? quotes
    : quotes.filter(q => q.category.trim().toLowerCase() === selected.trim().toLowerCase());

  $quoteDisplay.textContent = ""; // clear

  if (!pool.length) {
    $quoteDisplay.textContent = `No quotes found for category "${selected}". Add one below.`;
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];

  // Render as <figure><blockquote><figcaption>
  const fig = document.createElement("figure");

  const block = document.createElement("blockquote");
  block.textContent = `“${q.text}”`;
  // store category as a data- attribute (demonstrates dataset usage)
  block.dataset.category = q.category;

  const cap = document.createElement("figcaption");
  cap.textContent = `— ${q.category}`;

  fig.appendChild(block);
  fig.appendChild(cap);

  $quoteDisplay.appendChild(fig);
}

/** Add a new quote from inputs; updates DOM + storage */
function addQuote() {
  const $text = document.getElementById("newQuoteText");
  const $cat  = document.getElementById("newQuoteCategory");

  const text = ($text?.value || "").trim();
  let category = ($cat?.value || "").trim();

  if (!text || !category) {
    flashMsg("Please enter both a quote and a category.");
    return;
  }

  // Normalize category capitalization: Title Case
  category = toTitleCase(category);

  // Prevent exact-duplicate (same text + same category)
  const duplicate = quotes.some(q =>
    q.text.toLowerCase() === text.toLowerCase() &&
    q.category.toLowerCase() === category.toLowerCase()
  );
  if (duplicate) {
    flashMsg("That exact quote already exists in this category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  // Update category UI to include the new category (if any)
  populateCategoryOptions($categorySelect);
  const datalist = document.getElementById("category-suggestions");
  if (datalist) refreshCategoryDatalist(datalist);

  // Auto-select the category we just used, then show a random quote from it
  $categorySelect.value = category;
  showRandomQuote();

  // Reset inputs and focus back to text for quick entry
  if ($text) $text.value = "";
  if ($cat) $cat.value = "";
  $text?.focus();

  flashMsg("Quote added ✅");
}

// ---- Utils ----
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function flashMsg(text, ms = 1600) {
  if (!$msgEl) return;
  $msgEl.textContent = text;
  if (ms > 0) {
    setTimeout(() => {
      if ($msgEl.textContent === text) $msgEl.textContent = "";
    }, ms);
  }
}

// ---- Expose functions asked by the spec ----
/** Provided by spec: showRandomQuote */
window.showRandomQuote = showRandomQuote;
/** Provided by spec: createAddQuoteForm (we already call it on init, but it’s here by name) */
window.createAddQuoteForm = createAddQuoteForm;
