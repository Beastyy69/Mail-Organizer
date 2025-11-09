// Shared global state - all files will access this same object
window.MailMind = {
    emails: [],
    processedEmails: {},
    currentFilter: 'all',
    selectedEmailId: null,
    searchQuery: '',
    accessToken: null,
    tokenClient: null,
    aiProcessingQueue: [],
    config: null
};