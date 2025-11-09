MailMind Pro - AI Email Intelligence

MailMind Pro is a sophisticated AI-powered email management application that transforms your Gmail experience with intelligent email analysis, smart categorization, and AI-generated responses using Google's Gemini AI.

Features

AI-Powered Email Analysis
- Smart Classification: Automatically categorizes emails by intent (Informational, Action Required, Meeting Request, etc.)
- Urgency Detection: Identifies high-priority emails requiring immediate attention
- Sentiment Analysis: Understands the emotional tone of incoming emails
- AI-Generated Summaries: Get concise summaries of lengthy emails

Intelligent Reply Suggestions
- Contextual Responses: AI-generated replies tailored to each email's content
- Multiple Options: Choose from 3 smart reply suggestions per email
- One-Click Selection: Mark emails as processed with your preferred response

Advanced Dashboard
- Real-time Statistics: Track total emails, high-urgency items, action-required messages
- Visual Analytics: Beautiful gradient-based UI with comprehensive metrics
- Filtering & Search: Quickly find emails by urgency, intent, or AI processing status

Secure & Private
- Local Processing: Email data processed locally in your browser
- No Data Storage: Your emails are never stored on external servers
- Gmail Integration: Secure OAuth2 authentication with Google APIs

Tech Stack

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Styling: Tailwind CSS with custom glassmorphism design
- AI Integration: Google Gemini API for email analysis
- Authentication: Google OAuth2 with Gmail API
- Storage: Browser localStorage for user preferences

Prerequisites

Before using MailMind Pro, you'll need:

1. Google Cloud Console Project with:
   - Gmail API enabled
   - OAuth 2.0 credentials configured
   - Valid redirect URIs

2. Google Gemini API Key for AI features

Installation & Setup

1. Clone the Repository
git clone https://github.com/Beastyy69/Mail-Organizer.git
cd Mail-Organizer

2. Configuration
Create a config.json file in the root directory:

{
  "googleClientId": "your-google-oauth-client-id",
  "geminiApiKey": "your-gemini-api-key"
}

3. Google Cloud Setup

Create OAuth 2.0 Credentials:
1. Go to Google Cloud Console
2. Create a new project or select existing one
3. Enable Gmail API
4. Go to APIs & Services → Credentials
5. Create OAuth 2.0 Client ID for Web Application
6. Add authorized JavaScript origins and redirect URIs
7. Copy your Client ID to config.json

Get Gemini API Key:
1. Visit Google AI Studio
2. Create a new API key
3. Copy the key to config.json

4. Run the Application
Simply open index.html in a modern web browser or serve it using a local server:

Using Python
python -m http.server 8000

Using Node.js
npx http-server

Using PHP
php -S localhost:8000

Usage

1. Authentication
- Click "Sign in with Google & Access Gmail"
- Grant necessary permissions for Gmail access
- Your email address will be displayed upon successful login

2. Email Management
- View your inbox with AI-powered classifications
- Filter emails by urgency, intent, or AI processing status
- Search through email content with real-time filtering

3. AI Processing
- Individual Processing: Click "Process with AI" on any email
- Batch Processing: Use "AI Process All" to analyze multiple emails
- View AI-generated summaries, classifications, and reply suggestions

4. Email Actions
- Select smart replies to mark emails as processed
- Export email data to CSV for external analysis
- Track processing statistics in the dashboard

Project Structure

Mail-Organizer/
├── index.html              # Main application interface
├── config.json             # API configuration (create this)
├── css/
│   └── styles.css          # Custom styles and animations
├── js/
│   ├── app.js              # Main application logic
│   ├── auth.js             # Google OAuth authentication
│   ├── gmail.js            # Gmail API integration
│   ├── ai-processor.js     # Gemini AI integration
│   ├── ui-renderer.js      # UI rendering functions
│   ├── state.js            # Application state management
│   ├── storage.js          # localStorage utilities
│   └── utils.js            # Helper functions
└── README.md

Security & Privacy

- Local Processing: All email analysis happens in your browser
- No Data Storage: Emails are never sent to external servers (except Gemini API for analysis)
- Secure Authentication: OAuth2 with Google's secure infrastructure
- API Key Protection: Keys stored locally in config file

Limitations

- Requires active internet connection for API calls
- Limited to 50 most recent emails from Gmail inbox
- Gemini API usage subject to Google's quotas and pricing
- Gmail API has daily usage limits

Troubleshooting

Common Issues

1. Authentication Failed
   - Check Google Client ID in config.json
   - Verify OAuth consent screen configuration
   - Ensure redirect URIs are properly configured

2. AI Processing Errors
   - Verify Gemini API key is valid
   - Check API quota limits
   - Ensure internet connectivity

3. Emails Not Loading
   - Verify Gmail API is enabled
   - Check browser console for errors
   - Ensure proper OAuth scopes are requested

Debug Mode
Use the "Debug & Refresh" button in the app to check:
- Authentication status
- API connectivity
- Email loading progress

License

This project is licensed under the MIT License - see the LICENSE file for details.

Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure all API keys and configurations are correct
4. Open an issue on GitHub with detailed information

Acknowledgments

- Google Gemini AI for powerful natural language processing
- Gmail API for secure email access
- Tailwind CSS for utility-first styling
- Google OAuth2 for secure authentication

---

MailMind Pro - Transform your email workflow with AI intelligence!

Note: This application requires proper configuration with Google Cloud Console and Google AI Studio credentials to function fully.
