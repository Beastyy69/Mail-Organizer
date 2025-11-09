// Global variables - keep them global for cross-file access
let emails = [];
let processedEmails = {};
let currentFilter = 'all';
let selectedEmailId = null;
let searchQuery = '';
let accessToken = null;
let tokenClient = null;
let aiProcessingQueue = [];
let config = null;

// State management functions
const State = {
    getEmails: () => emails,
    setEmails: (newEmails) => { emails = newEmails; },
    
    getProcessedEmails: () => processedEmails,
    setProcessedEmails: (newProcessed) => { processedEmails = newProcessed; },
    
    getCurrentFilter: () => currentFilter,
    setCurrentFilter: (filter) => { currentFilter = filter; },
    
    getSelectedEmailId: () => selectedEmailId,
    setSelectedEmailId: (id) => { selectedEmailId = id; },
    
    getSearchQuery: () => searchQuery,
    setSearchQuery: (query) => { searchQuery = query; },
    
    getAccessToken: () => accessToken,
    setAccessToken: (token) => { accessToken = token; },
    
    getTokenClient: () => tokenClient,
    setTokenClient: (client) => { tokenClient = client; },
    
    getConfig: () => config,
    setConfig: (newConfig) => { config = newConfig; },
    
    addToAIQueue: (emailId) => { aiProcessingQueue.push(emailId); },
    getAIQueue: () => aiProcessingQueue,
    clearAIQueue: () => { aiProcessingQueue = []; }
};