// Array of quote objects
let quotes = [
  { text: "The best way to predict the future is to invent it.", category: "Inspiration" },
  { text: "Life is what happens when you’re busy making other plans.", category: "Life" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", category: "Motivation" }
];

// Function to display a random quote
function displayRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];

  // Using innerHTML as required
  document.getElementById("quoteDisplay").innerHTML = `
    <p>"${randomQuote.text}"</p>
    <small>- Category: ${randomQuote.category}</small>
  `;

  // Save last viewed quote to session storage
  sessionStorage.setItem("lastQuote", JSON.stringify(randomQuote));
}

// Event listener for "Show New Quote" button
document.getElementById("newQuote").addEventListener("click", displayRandomQuote);

// Function to add a new quote dynamically
function addQuote() {
  const text = document.getElementById("newQuoteText").value;
  const category = document.getElementById("newQuoteCategory").value;

  if (text && category) {
    const newQuote = { text, category };
    quotes.push(newQuote);

    // Save quotes to localStorage
    localStorage.setItem("quotes", JSON.stringify(quotes));

    alert("New quote added!");
    document.getElementById("newQuoteText").value = "";
    document.getElementById("newQuoteCategory").value = "";
  } else {
    alert("Please fill out both fields.");
  }
}

// Load quotes from localStorage on initialization
window.onload = function() {
  const storedQuotes = localStorage.getItem("quotes");
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  }

  const lastQuote = sessionStorage.getItem("lastQuote");
  if (lastQuote) {
    const parsed = JSON.parse(lastQuote);
    document.getElementById("quoteDisplay").innerHTML = `
      <p>"${parsed.text}"</p>
      <small>- Category: ${parsed.category}</small>
    `;
  }
};
