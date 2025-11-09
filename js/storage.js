// Load processed emails from localStorage
function loadProcessedEmails() {
    try {
        const stored = localStorage.getItem('mailmind_processed');
        if (stored) {
            processedEmails = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load processed emails:', e);
    }
}

// Save processed emails to localStorage
function saveProcessedEmails() {
    try {
        localStorage.setItem('mailmind_processed', JSON.stringify(processedEmails));
    } catch (e) {
        console.error('Failed to save processed emails:', e);
    }
}

// Load configuration from config.json
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        if (!response.ok) {
            throw new Error('Config file not found');
        }
        config = await response.json();
        console.log('✅ Configuration loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load config.json:', error);
        alert('⚠️ Configuration file missing!\n\nPlease create a config.json file with your API keys.\nSee config.example.json for template.');
        return false;
    }
}