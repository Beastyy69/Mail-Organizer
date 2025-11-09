MailMind Pro – AI Email Intelligence

MailMind Pro is a smart, AI-powered email management application that enhances your Gmail experience with intelligent email analysis, smart categorization, urgency detection, and AI-generated responses using Google Gemini AI.

FEATURES
--------
AI-POWERED EMAIL ANALYSIS
- Smart Classification — Categorizes emails by intent (Informational, Action Required, Meeting Request, etc.)
- Urgency Detection — Highlights high-priority messages
- Sentiment Analysis — Understands emotional tone
- AI Summaries — Generates short, readable summaries

INTELLIGENT REPLY SUGGESTIONS
- Context-Aware Responses based on email content
- Multiple Smart Reply Options
- One-Click Apply to mark emails as processed

ADVANCED DASHBOARD
- Realtime email statistics & metrics
- Glassmorphism + gradient UI
- Filter & search emails by urgency, intent, or processed status

SECURE & PRIVATE
- Local Processing inside your browser
- No external storage
- Secure Gmail OAuth2 integration

TECH STACK
----------
Frontend: HTML5, CSS3, JavaScript (ES6+)
Styling: Tailwind CSS
AI Model: Google Gemini API
Email Access: Gmail API + OAuth2
Local Storage: Browser localStorage

PREREQUISITES
-------------
1. Google Cloud Console Project (Gmail API Enabled, OAuth 2.0 Credentials Setup)
2. Google Gemini API Key

INSTALLATION & SETUP
--------------------
1. Clone the Repository
   git clone https://github.com/Beastyy69/Mail-Organizer.git
   cd Mail-Organizer

2. Rename config.example.json to config.json and add:
   {
     "googleClientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
     "geminiApiKey": "YOUR_GEMINI_API_KEY"
   }

3. Configure Google OAuth
   - Enable Gmail API
   - Create OAuth Client ID (Web App)
   - Add Redirect URIs
   - Insert Client ID in config.json

4. Get Gemini API Key from Google AI Studio and add to config.json

5. Run the App
   python -m http.server 8000
   OR
   npx http-server
   OR
   php -S localhost:8000

USAGE
-----
1. Sign in with Google
2. Emails load into dashboard
3. Click "Process with AI" for summaries and reply suggestions
4. Use filtering and search for quick navigation

PROJECT STRUCTURE
-----------------
Mail-Organizer/
├── index.html
├── config.json
├── css/styles.css
├── js/app.js, auth.js, gmail.js, ai-processor.js, ui-renderer.js, state.js, storage.js, utils.js
└── README.md

SECURITY & PRIVACY
------------------
- No external data storage
- Processing happens in-browser
- OAuth2 ensures secure Gmail access

LICENSE
-------
MIT License

MailMind Pro — Transform Your Inbox with AI Intelligence!
