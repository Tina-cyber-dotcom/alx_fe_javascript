document.addEventListener("DOMContentLoaded", () => {
  // ===== Data =====
  let quotes = [
    {
      text: "The best way to predict the future is to create it.",
      category: "Motivation",
    },
    { text: "JavaScript is the language of the web.", category: "Programming" },
    {
      text: "Do one thing every day that scares you.",
      category: "Inspiration",
    },
  ];

  // ===== DOM refs =====
  const quoteDisplay = document.getElementById("quoteDisplay");
  const newQuoteBtn = document.getElementById("newQuote");
  const categoryFilter = document.getElementById("categoryFilter");
  const sessionInfo = document.getElementById("sessionInfo");
  const lastSyncTime = document.getElementById("lastSyncTime");
  const syncStatus = document.getElementById("syncStatus");
  const conflictCount = document.getElementById("conflictCount");
  const autoSyncBtn = document.getElementById("autoSyncBtn");
  const conflictModal = document.getElementById("conflictModal");
  const conflictDetails = document.getElementById("conflictDetails");

  // ===== Web Storage Functions =====
  
  // Load quotes from localStorage on page load
  function loadQuotesFromStorage() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
      quotes = JSON.parse(storedQuotes);
    }
  }

  // Save quotes to localStorage
  function saveQuotesToStorage() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
  }

  // Load last selected filter from localStorage
  function loadLastFilter() {
    const lastFilter = localStorage.getItem('lastFilter');
    if (lastFilter && categoryFilter) {
      categoryFilter.value = lastFilter;
    }
  }

  // Save current filter to localStorage
  function saveFilterToStorage() {
    if (categoryFilter) {
      localStorage.setItem('lastFilter', categoryFilter.value);
    }
  }

  // ===== Session Storage Functions =====
  
  // Save session data (last viewed quote, timestamp)
  function saveSessionData() {
    const sessionData = {
      lastViewedQuote: quotes.length > 0 ? quotes[quotes.length - 1] : null,
      timestamp: new Date().toISOString(),
      sessionStart: sessionStorage.getItem('sessionStart') || new Date().toISOString(),
      quoteCount: quotes.length
    };
    sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
    updateSessionInfo();
  }

  // Load session data
  function loadSessionData() {
    const sessionData = sessionStorage.getItem('sessionData');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    return null;
  }

  // Update session info display
  function updateSessionInfo() {
    if (!sessionInfo) return;
    
    const sessionData = loadSessionData();
    if (sessionData) {
      const sessionStart = new Date(sessionData.sessionStart);
      const now = new Date();
      const duration = Math.round((now - sessionStart) / 1000 / 60); // minutes
      
      sessionInfo.innerHTML = `
        Quotes: ${quotes.length} | 
        Session: ${duration} min | 
        Last viewed: ${sessionData.lastViewedQuote ? sessionData.lastViewedQuote.category : 'None'}
      `;
    } else {
      sessionInfo.textContent = 'No session data';
    }
  }

  // ===== Server Simulation and Sync Functions =====
  
  let autoSyncInterval = null;
  let conflictsResolved = 0;
  let lastSyncTimestamp = null;
  
  // Simulate server data (in real app, this would be API calls)
  const serverQuotes = [
    {
      text: "The best way to predict the future is to create it.",
      category: "Motivation",
      id: "server_1",
      timestamp: "2024-01-01T00:00:00.000Z"
    },
    { 
      text: "JavaScript is the language of the web.", 
      category: "Programming",
      id: "server_2", 
      timestamp: "2024-01-01T00:00:00.000Z"
    },
    {
      text: "Do one thing every day that scares you.",
      category: "Inspiration",
      id: "server_3",
      timestamp: "2024-01-01T00:00:00.000Z"
    },
    {
      text: "Simplicity is the ultimate sophistication.",
      category: "Philosophy",
      id: "server_4",
      timestamp: "2024-01-01T00:00:00.000Z"
    },
    {
      text: "The only way to do great work is to love what you do.",
      category: "Motivation",
      id: "server_5",
      timestamp: "2024-01-01T00:00:00.000Z"
    }
  ];

  // Fetch data from server using mock API
  async function fetchQuotesFromServer() {
    try {
      // Use JSONPlaceholder as mock API
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      const posts = await response.json();
      
      // Convert posts to quotes format
      const serverData = posts.slice(0, 5).map((post, index) => ({
        text: post.title,
        category: getCategoryFromId(post.id),
        id: `server_${post.id}`,
        timestamp: new Date().toISOString()
      }));
      
      // Add some predefined quotes to ensure variety
      serverData.push(...serverQuotes);
      
      // Simulate server occasionally adding new quotes
      if (Math.random() > 0.7) {
        const newServerQuotes = [
          {
            text: "Innovation distinguishes between a leader and a follower.",
            category: "Leadership",
            id: `server_${Date.now()}`,
            timestamp: new Date().toISOString()
          },
          {
            text: "The future belongs to those who believe in the beauty of their dreams.",
            category: "Inspiration",
            id: `server_${Date.now() + 1}`,
            timestamp: new Date().toISOString()
          }
        ];
        serverData.push(...newServerQuotes);
      }
      
      return serverData;
    } catch (error) {
      console.error('Failed to fetch from server:', error);
      // Fallback to local server data if API fails
      return [...serverQuotes];
    }
  }

  // Helper function to get category from post ID
  function getCategoryFromId(id) {
    const categories = ['Motivation', 'Programming', 'Inspiration', 'Philosophy', 'Leadership'];
    return categories[id % categories.length];
  }

  // Post data to server using mock API
  async function postQuotesToServer(data) {
    try {
      // Use JSONPlaceholder as mock API for posting
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Quotes Sync',
          body: JSON.stringify(data),
          userId: 1
        })
      });
      
      const result = await response.json();
      
      // Simulate server response with updated timestamps
      return data.map(quote => ({
        ...quote,
        timestamp: new Date().toISOString(),
        synced: true,
        serverId: result.id
      }));
    } catch (error) {
      console.error('Failed to post to server:', error);
      // Fallback: return data with timestamps if API fails
      return data.map(quote => ({
        ...quote,
        timestamp: new Date().toISOString(),
        synced: false
      }));
    }
  }

  // Compare local and server data to detect conflicts
  function detectConflicts(localData, serverData) {
    const conflicts = [];
    
    // Find quotes that exist in both but have different content
    localData.forEach(localQuote => {
      const serverQuote = serverData.find(sq => sq.text === localQuote.text);
      if (serverQuote && serverQuote.category !== localQuote.category) {
        conflicts.push({
          type: 'category_mismatch',
          local: localQuote,
          server: serverQuote
        });
      }
    });
    
    // Find quotes that exist locally but not on server (new local quotes)
    const newLocalQuotes = localData.filter(localQuote => 
      !serverData.find(sq => sq.text === localQuote.text)
    );
    
    // Find quotes that exist on server but not locally (new server quotes)
    const newServerQuotes = serverData.filter(serverQuote => 
      !localData.find(lq => lq.text === serverQuote.text)
    );
    
    return {
      conflicts,
      newLocal: newLocalQuotes,
      newServer: newServerQuotes
    };
  }

  // Resolve conflicts based on user choice
  function resolveConflicts(conflictData, resolution) {
    let resolvedData = [...quotes];
    
    switch (resolution) {
      case 'server':
        // Use server data, discard local conflicts
        resolvedData = conflictData.serverData;
        break;
        
      case 'local':
        // Keep local data, ignore server conflicts
        resolvedData = [...quotes];
        break;
        
      case 'merge':
        // Merge both datasets, resolving conflicts
        const merged = [...quotes];
        
        // Add new server quotes
        conflictData.newServer.forEach(serverQuote => {
          if (!merged.find(q => q.text === serverQuote.text)) {
            merged.push(serverQuote);
          }
        });
        
        // Resolve category conflicts by using server data
        conflictData.conflicts.forEach(conflict => {
          const localIndex = merged.findIndex(q => q.text === conflict.local.text);
          if (localIndex !== -1) {
            merged[localIndex].category = conflict.server.category;
          }
        });
        
        resolvedData = merged;
        break;
    }
    
    return resolvedData;
  }

  // Main sync function
  async function syncQuotes() {
    if (syncStatus) syncStatus.textContent = 'Syncing...';
    
    try {
      // Fetch data from server
      const serverData = await fetchQuotesFromServer();
      
      // Detect conflicts
      const conflictData = detectConflicts(quotes, serverData);
      
      if (conflictData.conflicts.length > 0 || conflictData.newServer.length > 0) {
        // Show conflict resolution modal
        showConflictModal(conflictData);
        return;
      }
      
      // No conflicts, proceed with sync
      await performSync(quotes, serverData);
      
    } catch (error) {
      console.error('Sync failed:', error);
      if (syncStatus) syncStatus.textContent = 'Sync failed';
      showNotification('Sync failed. Please try again.', 'error');
    }
  }

  // Perform the actual sync operation
  async function performSync(localData, serverData) {
    try {
      console.log('Starting sync operation...');
      
      // Post local data to server
      const syncedData = await postQuotesToServer(localData);
      
      // Update local storage with synced data
      quotes = syncedData;
      saveQuotesToStorage();
      
      // Update UI
      populateCategories();
      showRandomQuote();
      
      // Update sync status
      lastSyncTimestamp = new Date();
      if (lastSyncTime) lastSyncTime.textContent = lastSyncTimestamp.toLocaleTimeString();
      if (syncStatus) syncStatus.textContent = 'Synced successfully';
      
      // Update conflict count
      conflictsResolved++;
      if (conflictCount) conflictCount.textContent = conflictsResolved;
      
      // Show success notification
      showNotification('Quotes synced with server!', 'success');
      
      console.log('Sync operation completed successfully');
      
    } catch (error) {
      console.error('Sync operation failed:', error);
      if (syncStatus) syncStatus.textContent = 'Sync failed';
      showNotification('Sync failed. Please try again.', 'error');
      throw error;
    }
  }

  // Show conflict resolution modal
  function showConflictModal(conflictData) {
    if (!conflictModal || !conflictDetails) return;
    
    let detailsHTML = '<h4>Changes detected:</h4>';
    
    if (conflictData.conflicts.length > 0) {
      detailsHTML += '<p><strong>Conflicts:</strong></p>';
      conflictData.conflicts.forEach(conflict => {
        detailsHTML += `<p>• "${conflict.local.text}" - Local: ${conflict.local.category}, Server: ${conflict.server.category}</p>`;
      });
    }
    
    if (conflictData.newServer.length > 0) {
      detailsHTML += '<p><strong>New server quotes:</strong></p>';
      conflictData.newServer.forEach(quote => {
        detailsHTML += `<p>• "${quote.text}" (${quote.category})</p>`;
      });
    }
    
    if (conflictData.newLocal.length > 0) {
      detailsHTML += '<p><strong>New local quotes:</strong></p>';
      conflictData.newLocal.forEach(quote => {
        detailsHTML += `<p>• "${quote.text}" (${quote.category})</p>`;
      });
    }
    
    conflictDetails.innerHTML = detailsHTML;
    conflictModal.style.display = 'block';
    
    // Store conflict data for resolution
    window.currentConflictData = conflictData;
  }

  // Close conflict modal
  function closeConflictModal() {
    if (conflictModal) {
      conflictModal.style.display = 'none';
    }
    window.currentConflictData = null;
  }

  // Resolve conflict based on user choice
  function resolveConflict(resolution) {
    if (!window.currentConflictData) return;
    
    try {
      const resolvedData = resolveConflicts(window.currentConflictData, resolution);
      
      // Perform sync with resolved data
      performSync(resolvedData, window.currentConflictData.serverData);
      
      // Show notification about conflict resolution
      const conflictCount = window.currentConflictData.conflicts.length;
      const newServerCount = window.currentConflictData.newServer.length;
      let message = '';
      
      if (conflictCount > 0 && newServerCount > 0) {
        message = `Resolved ${conflictCount} conflicts and added ${newServerCount} new quotes!`;
      } else if (conflictCount > 0) {
        message = `Resolved ${conflictCount} conflicts!`;
      } else if (newServerCount > 0) {
        message = `Added ${newServerCount} new quotes from server!`;
      }
      
      if (message) {
        showNotification(message);
      }
      
      closeConflictModal();
      
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      alert('Failed to resolve conflicts. Please try again.');
    }
  }

  // Periodically check for new quotes from server
  function checkForNewQuotes() {
    console.log('Checking for new quotes from server...');
    
    fetchQuotesFromServer().then(serverData => {
      const conflictData = detectConflicts(quotes, serverData);
      
      if (conflictData.newServer.length > 0) {
        // Show notification for new server quotes
        showNotification(`Found ${conflictData.newServer.length} new quotes from server!`, 'info');
        if (syncStatus) syncStatus.textContent = 'New quotes available';
        
        // Update UI to show new quotes are available
        updateSyncStatus('New quotes detected');
      } else {
        console.log('No new quotes found');
      }
    }).catch(error => {
      console.error('Failed to check for new quotes:', error);
      updateSyncStatus('Check failed');
      showNotification('Failed to check for new quotes', 'error');
    });
  }

  // Update sync status with timestamp
  function updateSyncStatus(status) {
    if (syncStatus) {
      syncStatus.textContent = `${status} - ${new Date().toLocaleTimeString()}`;
    }
  }

  // Show notification for data updates and conflicts
  function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    
    // Set background color based on type
    let bgColor = '#28a745'; // success
    if (type === 'error') bgColor = '#dc3545';
    if (type === 'warning') bgColor = '#ffc107';
    if (type === 'info') bgColor = '#17a2b8';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${bgColor};
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 1001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    // Add icon based on type
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';
    
    notification.innerHTML = `<div>${icon} ${message}</div>`;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 5000);
  }

  // Toggle auto-sync functionality
  function toggleAutoSync() {
    if (autoSyncInterval) {
      // Disable auto-sync
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
      if (autoSyncBtn) autoSyncBtn.textContent = 'Enable Auto-Sync';
      if (syncStatus) syncStatus.textContent = 'Auto-sync disabled';
    } else {
      // Enable auto-sync (every 30 seconds)
      autoSyncInterval = setInterval(syncQuotes, 30000);
      // Also check for new quotes every 60 seconds
      setInterval(checkForNewQuotes, 60000);
      if (autoSyncBtn) autoSyncBtn.textContent = 'Disable Auto-Sync';
      if (syncStatus) syncStatus.textContent = 'Auto-sync enabled';
    }
  }

  // ===== JSON Import/Export Functions =====
  
  // Export quotes to JSON file
  function exportToJson() {
    if (quotes.length === 0) {
      alert('No quotes to export!');
      return;
    }

    const dataStr = JSON.stringify(quotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `quotes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Exported ${quotes.length} quotes successfully!`);
  }

  // Import quotes from JSON file
  function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function(event) {
      try {
        const importedQuotes = JSON.parse(event.target.result);
        
        // Validate the imported data
        if (!Array.isArray(importedQuotes)) {
          throw new Error('Invalid format: Expected an array of quotes');
        }
        
        // Validate each quote has required properties
        const validQuotes = importedQuotes.filter(quote => {
          return quote && typeof quote.text === 'string' && typeof quote.category === 'string';
        });
        
        if (validQuotes.length === 0) {
          throw new Error('No valid quotes found in the file');
        }
        
        // Add imported quotes to existing collection
        quotes.push(...validQuotes);
        
        // Save to storage and update UI
        saveQuotesToStorage();
        populateCategories();
        showRandomQuote();
        
        alert(`Successfully imported ${validQuotes.length} quotes!`);
        
        // Clear the file input
        event.target.value = '';
        
      } catch (error) {
        alert(`Import failed: ${error.message}`);
        console.error('Import error:', error);
      }
    };
    
    fileReader.readAsText(file);
  }

  // ===== Filtering Functions =====
  
  // Populate categories dynamically
  function populateCategories() {
    if (!categoryFilter) return;
    
    // Get unique categories from quotes
    const categories = [...new Set(quotes.map(quote => quote.category))];
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    // Add category options
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  // Filter quotes based on selected category
  function filterQuotes() {
    if (!categoryFilter) return;
    
    const selectedCategory = categoryFilter.value;
    saveFilterToStorage();
    
    let filteredQuotes = quotes;
    
    if (selectedCategory !== 'all') {
      filteredQuotes = quotes.filter(quote => quote.category === selectedCategory);
    }
    
    if (filteredQuotes.length === 0) {
      quoteDisplay.innerHTML = `<p>No quotes found for category: "${selectedCategory}"</p>`;
      return;
    }
    
    // Show a random quote from the filtered results
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    renderQuote(filteredQuotes[randomIndex]);
  }

  // Render helper
  function renderQuote(quote) {
    quoteDisplay.innerHTML = `
      <p>"${quote.text}"</p>
      <small>— ${quote.category}</small>
    `;
  }

  // Show random quote (required)
  function showRandomQuote() {
    if (quotes.length === 0) {
      quoteDisplay.innerHTML = "<p>No quotes available.</p>";
      return;
    }
    const idx = Math.floor(Math.random() * quotes.length);
    renderQuote(quotes[idx]);
    
    // Save session data after showing a quote
    saveSessionData();
  }

  // Add quote (required: updates array + DOM)
  function addQuote() {
    const textInput = document.getElementById("newQuoteText");
    const catInput = document.getElementById("newQuoteCategory");
    if (!textInput || !catInput) return;

    const text = textInput.value.trim();
    const category = catInput.value.trim();

    if (!text || !category) {
      alert("Please enter both a quote and a category.");
      return;
    }

    const newQuote = { text, category };
    quotes.push(newQuote); // <-- updates array
    renderQuote(newQuote); // <-- updates DOM
    
    // Save to localStorage
    saveQuotesToStorage();
    
    // Save session data
    saveSessionData();
    
    // Update categories dropdown if new category
    populateCategories();

    textInput.value = "";
    catInput.value = "";
  }

  // Dynamically create the add-quote form (required name)
  function createAddQuoteForm() {
    // Avoid duplicating if the form already exists in HTML
    if (
      document.getElementById("newQuoteText") &&
      document.getElementById("newQuoteCategory")
    ) {
      // Wire up existing button if present
      const existingAddBtn = document.getElementById("addQuoteBtn");
      if (existingAddBtn) existingAddBtn.addEventListener("click", addQuote);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = "addQuoteContainer";

    const inputText = document.createElement("input");
    inputText.type = "text";
    inputText.id = "newQuoteText";
    inputText.placeholder = "Enter a new quote";

    const inputCat = document.createElement("input");
    inputCat.type = "text";
    inputCat.id = "newQuoteCategory";
    inputCat.placeholder = "Enter quote category";

    const addBtn = document.createElement("button");
    addBtn.id = "addQuoteBtn";
    addBtn.textContent = "Add Quote";
    addBtn.addEventListener("click", addQuote);

    wrapper.appendChild(inputText);
    wrapper.appendChild(inputCat);
    wrapper.appendChild(addBtn);

    // Place right after the quoteDisplay container
    quoteDisplay.insertAdjacentElement("afterend", wrapper);
  }

  // Event listener on the “Show New Quote” button (required)
  newQuoteBtn.addEventListener("click", showRandomQuote);

  // Init
  loadQuotesFromStorage(); // Load quotes from localStorage
  createAddQuoteForm();
  populateCategories(); // Populate category filter
  loadLastFilter(); // Load last selected filter
  updateSessionInfo(); // Update session info display
  showRandomQuote();

  // Expose for inline HTML handlers if your page uses them
  window.addQuote = addQuote;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.filterQuotes = filterQuotes; // Expose filter function for HTML
  window.exportToJson = exportToJson; // Expose export function for HTML
  window.importFromJsonFile = importFromJsonFile; // Expose import function for HTML
  window.syncQuotes = syncQuotes; // Expose sync function for HTML
  window.toggleAutoSync = toggleAutoSync; // Expose auto-sync function for HTML
  window.resolveConflict = resolveConflict; // Expose conflict resolution function for HTML
  window.closeConflictModal = closeConflictModal; // Expose modal close function for HTML
});

// Function to create the "Add Quote" form dynamically
function createAddQuoteForm() {
  const formDiv = document.createElement("div");

  const inputText = document.createElement("input");
  inputText.id = "newQuoteText";
  inputText.type = "text";
  inputText.placeholder = "Enter a new quote";

  const inputCategory = document.createElement("input");
  inputCategory.id = "newQuoteCategory";
  inputCategory.type = "text";
  inputCategory.placeholder = "Enter quote category";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.addEventListener("click", addQuote);

  // Append inputs and button to formDiv
  formDiv.appendChild(inputText);
  formDiv.appendChild(inputCategory);
  formDiv.appendChild(addButton);

  // Append form to the body
  document.body.appendChild(formDiv);
}

// Function to add a new quote
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const newText = textInput.value.trim();
  const newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    quotes.push({ text: newText, category: newCategory });

    // Reset input fields
    textInput.value = "";
    categoryInput.value = "";

    alert("New quote added!");
  } else {
    alert("Please enter both quote and category.");
  }
}

// Event listener for showing new quotes
newQuoteBtn.addEventListener("click", showRandomQuote);
 
// Initialize app
createAddQuoteForm();
