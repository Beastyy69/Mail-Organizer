let emails = [];
let processedEmails = {};
let currentFilter = 'all';
let selectedEmailId = null;
let searchQuery = '';
let accessToken = null;
let tokenClient = null;
let aiProcessingQueue = [];
let config = null;

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

async function initializeGoogleAuth() {
    console.log('Initializing Google Auth...');
    
    // Load configuration first
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        return;
    }
    
    // Remove the regular Google Sign-In and use direct OAuth
    document.getElementById('googleSignInButton').innerHTML = `
        <button onclick="requestGmailAccess()" class="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-300 hover:bg-gray-50 transition-colors duration-200">
            <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google & Access Gmail
        </button>
    `;
    
    // Initialize the OAuth2 token client
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.googleClientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
        callback: async (tokenResponse) => {
            if (tokenResponse.error) {
                console.error('Token error:', tokenResponse);
                if (tokenResponse.error === 'popup_closed_by_user') {
                    alert('Please complete the Gmail access request to use MailMind Pro.');
                } else {
                    alert('Gmail access denied: ' + tokenResponse.error);
                }
                return;
            }
            
            accessToken = tokenResponse.access_token;
            console.log('✅ Gmail access token received!');
            
            await handleSuccessfulAuth();
        },
        error_callback: (error) => {
            console.error('OAuth error:', error);
            alert('Authentication failed. Please try again and allow popups.');
        }
    });
    
    loadProcessedEmails();
}

// Direct Gmail access request
function requestGmailAccess() {
    console.log('Requesting Gmail access...');
    
    if (!tokenClient) {
        alert('Authentication not ready. Please refresh the page.');
        return;
    }
    
    // Show loading state
    document.getElementById('googleSignInButton').innerHTML = `
        <div class="flex items-center justify-center gap-3 w-full px-6 py-4 bg-blue-500 text-white font-semibold rounded-2xl">
            <div class="loader" style="width: 20px; height: 20px; border-width: 2px; border-top-color: white;"></div>
            Requesting Gmail permissions...
        </div>
    `;
    
    // Request token with explicit consent
    setTimeout(() => {
        tokenClient.requestAccessToken({ 
            prompt: 'consent'
        });
    }, 500);
}

// Handle successful authentication
async function handleSuccessfulAuth() {
    try {
        // Get user profile
        const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (profileResponse.ok) {
            const profile = await profileResponse.json();
            document.getElementById('userEmailDisplay').textContent = profile.emailAddress;
            
            // Switch to app view
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Fetch emails
            await fetchGmailEmails(accessToken);
        } else {
            throw new Error('Failed to get user profile');
        }
    } catch (error) {
        console.error('Error in auth flow:', error);
        alert('Authentication completed but failed to load profile. Please try refreshing.');
    }
}

async function fetchGmailEmails(token) {
    console.log('🔍 Starting email fetch with token:', token ? 'Present' : 'Missing');
    
    const container = document.getElementById('emailListContainer');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-12">
            <div class="loader mb-6"></div>
            <p class="text-gray-400 text-lg font-semibold">Loading your emails...</p>
        </div>
    `;
    
    try {
        // Test the token first with a simple profile request
        console.log('🔍 Testing token with profile API...');
        const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('🔍 Profile response status:', profileResponse.status);
        
        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error('❌ Profile API failed:', profileResponse.status, errorText);
            throw new Error(`Failed to access Gmail profile: ${profileResponse.status}`);
        }

        const profile = await profileResponse.json();
        console.log('✅ Profile loaded:', profile);

        // Fetch messages list - 50 EMAILS
        console.log('🔍 Fetching messages list...');
        const listResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('🔍 Messages list response status:', listResponse.status);
        
        if (!listResponse.ok) {
            const errorText = await listResponse.text();
            console.error('❌ Messages list API failed:', listResponse.status, errorText);
            throw new Error(`Failed to fetch emails list: ${listResponse.status}`);
        }

        const data = await listResponse.json();
        console.log('✅ Messages list loaded:', data);
        console.log(`📨 Found ${data.messages?.length || 0} messages`);
        
        if (!data.messages || data.messages.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-12">
                    <div class="text-6xl mb-4">🔭</div>
                    <p class="text-gray-400 text-xl mb-2">No emails found in inbox</p>
                    <p class="text-gray-500 text-sm">Your Gmail inbox appears to be empty</p>
                </div>
            `;
            return;
        }

        emails = [];
        
        // PROCESS ALL MESSAGES
        const allMessages = data.messages;
        console.log(`🔍 Processing ${allMessages.length} messages...`);
        
        // Process in batches of 10 to avoid rate limiting
        const batchSize = 10;
        
        for (let i = 0; i < allMessages.length; i += batchSize) {
            const batch = allMessages.slice(i, i + batchSize);
            console.log(`🔍 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allMessages.length/batchSize)}...`);
            
            const batchPromises = batch.map(async (msg, index) => {
                const globalIndex = i + index + 1;
                console.log(`🔍 [${globalIndex}/${allMessages.length}] Fetching message: ${msg.id}`);
                
                try {
                    const msgResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (msgResponse.ok) {
                        const messageData = await msgResponse.json();
                        const parsedEmail = parseGmailMessage(messageData);
                        if (parsedEmail) {
                            return parsedEmail;
                        }
                    } else {
                        console.warn(`⚠️ Failed to fetch message ${msg.id}:`, msgResponse.status);
                    }
                } catch (error) {
                    console.error(`❌ Error fetching message ${msg.id}:`, error);
                }
                return null;
            });

            const batchResults = await Promise.all(batchPromises);
            const validEmails = batchResults.filter(email => email !== null);
            emails = [...emails, ...validEmails];
            
            // Update UI after each batch
            renderEmailList();
            updateStatistics();
            
            // Show progress
            const percentage = Math.round((emails.length / allMessages.length) * 100);
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-12">
                    <div class="loader mb-6"></div>
                    <p class="text-gray-400 text-lg font-semibold mb-4">Loading emails...</p>
                    <div class="w-64 bg-gray-700 rounded-full h-3 mb-2">
                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
                    </div>
                    <p class="text-gray-400 text-sm">${emails.length}/${allMessages.length} emails (${percentage}%)</p>
                </div>
            `;
            
            // Delay between batches to avoid rate limiting
            if (i + batchSize < allMessages.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log(`🎉 Successfully processed ${emails.length} emails`);
        
        // Final render
        renderEmailList();
        updateStatistics();
        
    } catch (error) {
        console.error('💥 Critical error in fetchGmailEmails:', error);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-12">
                <div class="text-6xl mb-4">💥</div>
                <p class="text-red-400 text-xl mb-4">Failed to load emails</p>
                <p class="text-gray-400 text-center mb-2">Error: ${error.message}</p>
                <p class="text-gray-500 text-sm mb-6">Check the browser console (F12) for details</p>
                <div class="flex gap-4">
                    <button onclick="refreshEmails()" class="morph-btn">
                        <span>🔄 Try Again</span>
                    </button>
                    <button onclick="handleLogout()" class="morph-btn" style="background: rgba(115, 75, 195, 0.25);">
                        <span>🔓 Re-login</span>
                    </button>
                </div>
            </div>
        `;
    }
}

function parseGmailMessage(msg) {
    console.log('🔍 Parsing message:', msg.id);
    
    try {
        if (!msg.payload) {
            console.warn('⚠️ No payload in message:', msg);
            return null;
        }

        const headers = msg.payload.headers || [];
        console.log('🔍 Headers found:', headers.length);
        
        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
        };

        // Simple body extraction - just get the first text part we find
        function extractSimpleBody(part) {
            if (!part) return '';
            
            // If this part has data and is text, return it
            if (part.body && part.body.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
                try {
                    const text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    return text;
                } catch (e) {
                    console.warn('Base64 decode failed for part:', part);
                    return '';
                }
            }
            
            // Recursively check parts
            if (part.parts) {
                for (let p of part.parts) {
                    const body = extractSimpleBody(p);
                    if (body) return body;
                }
            }
            
            return '';
        }

        const body = extractSimpleBody(msg.payload);
        console.log('🔍 Extracted body length:', body.length);

        const fromHeader = getHeader('From');
        const subject = getHeader('Subject') || '(No Subject)';
        
        console.log('🔍 From:', fromHeader);
        console.log('🔍 Subject:', subject);

        // Simple sender parsing
        let senderName = fromHeader;
        let senderEmail = fromHeader;
        
        const emailMatch = fromHeader.match(/<(.+?)>/);
        if (emailMatch) {
            senderEmail = emailMatch[1];
            senderName = fromHeader.replace(/<.+?>/, '').trim().replace(/['"]/g, '') || senderEmail;
        }

        if (!senderName || senderName === senderEmail) {
            senderName = senderEmail.split('@')[0];
        }

        const email = {
            id: msg.id,
            sender: senderEmail,
            senderName: senderName,
            subject: subject,
            body: body || '(No content)',
            fullBody: body,
            timestamp: new Date(parseInt(msg.internalDate)),
            read: true,
            aiProcessed: false
        };

        console.log('✅ Successfully parsed email:', email.subject);
        
        // Apply basic classification
        const classification = classifyEmailRuleBased(email);
        
        return {
            ...email,
            ...classification,
            summary: generateEnhancedSummary(email),
            replies: generateContextualReplies(email)
        };
        
    } catch (error) {
        console.error('❌ Error parsing email:', error);
        console.error('❌ Message data that failed:', msg);
        return null;
    }
}

// Rule-based classification as fallback
function classifyEmailRuleBased(email) {
    const text = ((email.body || '') + ' ' + (email.subject || '')).toLowerCase();

    let intent = 'Informational';
    if (text.match(/\b(meeting|schedule|calendar|appointment|call|zoom|teams)\b/)) {
        intent = 'Meeting Request';
    } else if (text.match(/\b(urgent|asap|important|critical|action required|need|deadline|respond|reply needed)\b/)) {
        intent = 'Action Required';
    } else if (text.match(/\b(follow up|following up|checking in|status update|progress)\b/)) {
        intent = 'Follow-up';
    } else if (text.match(/\b(fyi|for your information|heads up|update|notification)\b/)) {
        intent = 'Informational';
    }

    let urgency = 'Low';
    const hrs = (Date.now() - email.timestamp) / 3600000;
    
    if (text.match(/\b(urgent|asap|emergency|critical|immediate)\b/) && hrs < 24) {
        urgency = 'High';
    } else if (text.match(/\b(important|deadline|required|today|tomorrow)\b/) || hrs < 48) {
        urgency = 'Medium';
    }

    let sentiment = 'Neutral';
    const positiveWords = text.match(/\b(thank|thanks|great|excellent|appreciate|good|wonderful|pleased|happy)\b/g);
    const negativeWords = text.match(/\b(urgent|problem|issue|concern|error|failed|wrong|disappointed)\b/g);
    
    if (positiveWords && positiveWords.length > (negativeWords?.length || 0)) {
        sentiment = 'Positive';
    } else if (negativeWords && negativeWords.length > 0) {
        sentiment = 'Negative';
    }

    return { intent, urgency, sentiment };
}

// AI Processing with Gemini API
async function processEmailWithAI(email) {
    if (!config || !config.geminiApiKey) {
        console.warn('⚠️ Gemini API key not configured, using fallback');
        alert('⚠️ Gemini API key missing!\n\nPlease add your API key to config.json to use AI features.\n\nFalling back to rule-based classification.');
        return useFallbackClassification(email);
    }

    console.log('🤖 Processing email with Gemini AI...');
    console.log('📧 Email subject:', email.subject);
    
    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiApiKey}`;
        
        console.log('📡 Calling Gemini API...');
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Analyze this email and provide a JSON response with the following structure:
{
  "summary": "3-5 sentence summary of the email",
  "intent": "one of: Informational, Action Required, Meeting Request, Follow-up, Spam",
  "urgency": "one of: High, Medium, Low",
  "sentiment": "one of: Positive, Neutral, Negative",
  "replies": [
    {"id": 1, "label": "Short label", "text": "Full reply text"},
    {"id": 2, "label": "Short label", "text": "Full reply text"},
    {"id": 3, "label": "Short label", "text": "Full reply text"}
  ]
}

Email Details:
Subject: ${email.subject}
From: ${email.senderName}
Body: ${email.body.substring(0, 2000)}

Respond ONLY with valid JSON, no additional text or markdown formatting.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            })
        });

        console.log('📡 Gemini API Response Status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Gemini API error:', errorData);
            throw new Error(`Gemini API failed: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('📦 Raw Gemini Response:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid Gemini API response structure');
        }
        
        const aiResponse = data.candidates[0].content.parts[0].text;
        console.log('🤖 AI Response Text:', aiResponse);
        
        // Clean and parse JSON
        let cleanJson = aiResponse.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        console.log('✅ Parsed AI Result:', parsed);
        console.log('🎉 Gemini AI processing successful!');
        
        return {
            summary: parsed.summary,
            intent: parsed.intent,
            urgency: parsed.urgency,
            sentiment: parsed.sentiment,
            replies: parsed.replies,
            aiProcessed: true
        };
        
    } catch (error) {
        console.error('❌ AI processing error:', error);
        console.error('❌ Error details:', error.message);
        console.log('⚠️ Falling back to rule-based classification');
        
        // Re-throw error so the calling function can handle it
        throw error;
    }
}

// Consolidated fallback function
function useFallbackClassification(email) {
    return {
        summary: generateEnhancedSummary(email),
        intent: classifyEmailRuleBased(email).intent,
        urgency: classifyEmailRuleBased(email).urgency,
        sentiment: classifyEmailRuleBased(email).sentiment,
        replies: generateContextualReplies(email),
        aiProcessed: false
    };
}

// Enhanced summary generation for fallback
function generateEnhancedSummary(email) {
    const body = email.body || '';
    let cleanBody = body.split(/\n(--|___|\bSent from\b|\bBest regards\b|\bRegards\b|\bThanks\b)/i)[0];
    
    // Extract key sentences
    const sentences = cleanBody
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200);
    
    if (sentences.length === 0) {
        return `Email from ${email.senderName} regarding: ${email.subject}`;
    }
    
    // Prioritize sentences with action words
    const actionWords = ['request', 'need', 'require', 'urgent', 'please', 'meeting', 'deadline', 'asap'];
    const prioritySentences = sentences.filter(s => 
        actionWords.some(word => s.toLowerCase().includes(word))
    );
    
    const summarySource = prioritySentences.length > 0 ? prioritySentences : sentences;
    const summaryLength = Math.min(3, summarySource.length);
    let summary = summarySource.slice(0, summaryLength).join('. ');
    
    if (summary.length > 300) {
        summary = summary.substring(0, 300) + '...';
    } else if (summarySource.length > summaryLength) {
        summary += '...';
    } else {
        summary += '.';
    }
    
    return summary || `Email from ${email.senderName}: ${email.subject}`;
}

// Contextual reply generation based on email content
function generateContextualReplies(email) {
    const text = ((email.body || '') + ' ' + (email.subject || '')).toLowerCase();
    const classification = classifyEmailRuleBased(email);
    
    // Generate more contextual replies based on content
    if (classification.intent === 'Meeting Request') {
        return [
            { id: 1, text: `Thank you for the meeting invitation. I'll be there at the scheduled time.`, label: 'Confirm Attendance' },
            { id: 2, text: `I appreciate the invitation. Unfortunately, I have a conflict. Could we find an alternative time?`, label: 'Request Reschedule' },
            { id: 3, text: `Thanks for reaching out. Let me check my schedule and I'll get back to you within the hour.`, label: 'Will Confirm' }
        ];
    } else if (classification.intent === 'Action Required') {
        return [
            { id: 1, text: `Thanks for bringing this to my attention. I'll prioritize this and have it completed by the deadline.`, label: 'Acknowledge & Commit' },
            { id: 2, text: `I'm currently working on this task and will update you with progress shortly.`, label: 'In Progress Update' },
            { id: 3, text: `Completed as requested. Please let me know if you need any clarification or additional information.`, label: 'Task Complete' }
        ];
    } else if (classification.intent === 'Follow-up') {
        return [
            { id: 1, text: `Thank you for following up. Here's the current status: [provide update]. I'll keep you posted on further developments.`, label: 'Status Update' },
            { id: 2, text: `I appreciate you checking in. I'm on track to complete this by end of day today.`, label: 'Timeline Confirmation' },
            { id: 3, text: `Thanks for the reminder. This is now at the top of my priority list and I'll respond with details within 2 hours.`, label: 'Prioritize & Commit' }
        ];
    } else {
        return [
            { id: 1, text: `Thank you for sharing this information. I've reviewed the details and will reach out if I have any questions.`, label: 'Acknowledge Receipt' },
            { id: 2, text: `I appreciate you keeping me informed. This is helpful context and I'll factor it into my planning.`, label: 'Grateful Response' },
            { id: 3, text: `Noted, thanks. Please continue to keep me updated on any significant developments.`, label: 'Stay Informed' }
        ];
    }
}

async function processAllWithAI() {
    if (!emails.length) {
        alert('No emails to process');
        return;
    }
    
    if (!config || !config.geminiApiKey) {
        alert('⚠️ Gemini API key not configured!\n\nPlease add your API key to config.json first.');
        return;
    }
    
    const unprocessedEmails = emails.filter(e => !e.aiProcessed);
    
    if (!unprocessedEmails.length) {
        alert('✅ All emails already processed with AI!');
        return;
    }
    
    if (!confirm(`🤖 Process ${unprocessedEmails.length} emails with Gemini AI?\n\nThis may take a few minutes and will use your API quota.`)) {
        return;
    }
    
    const batchSize = 3;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    // Show progress dialog
    const progressDiv = document.createElement('div');
    progressDiv.id = 'aiProgress';
    progressDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: rgba(10, 10, 30, 0.95); padding: 40px; border-radius: 24px; 
                    border: 2px solid rgba(167, 139, 250, 0.5); z-index: 9999; min-width: 400px;">
            <div class="flex flex-col items-center">
                <div class="loader mb-4"></div>
                <h3 class="text-white text-xl font-bold mb-2">🤖 AI Processing</h3>
                <p class="text-gray-400 mb-4" id="progressText">Starting...</p>
                <div class="w-full bg-gray-700 rounded-full h-3">
                    <div id="progressBar" class="bg-purple-500 h-3 rounded-full transition-all" style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(progressDiv);
    
    for (let i = 0; i < unprocessedEmails.length; i += batchSize) {
        const batch = unprocessedEmails.slice(i, i + batchSize);
        
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText) {
            progressText.textContent = `Processing ${processed + 1}-${Math.min(processed + batchSize, unprocessedEmails.length)} of ${unprocessedEmails.length}...`;
        }
        
        await Promise.all(batch.map(async (email) => {
            try {
                console.log(`🤖 Processing email: ${email.subject}`);
                const aiResult = await processEmailWithAI(email);
                
                // Update email with AI results
                const emailIndex = emails.findIndex(e => e.id === email.id);
                if (emailIndex !== -1) {
                    emails[emailIndex] = {
                        ...emails[emailIndex],
                        ...aiResult,
                        aiProcessed: true
                    };
                }
                
                succeeded++;
                console.log(`✅ Successfully processed: ${email.subject}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to process email: ${email.subject}`, error);
            }
            
            processed++;
            
            // Update progress bar
            if (progressBar) {
                const percentage = (processed / unprocessedEmails.length) * 100;
                progressBar.style.width = percentage + '%';
            }
            
            renderEmailList();
            updateStatistics();
        }));
        
        // Delay between batches to avoid rate limiting
        if (i + batchSize < unprocessedEmails.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Remove progress dialog
    const progressElement = document.getElementById('aiProgress');
    if (progressElement) {
        progressElement.remove();
    }
    
    // Show results
    const message = `🎉 AI Processing Complete!\n\n✅ Succeeded: ${succeeded}\n❌ Failed: ${failed}\n📊 Total: ${processed}`;
    alert(message);
    
    console.log(`🎉 Batch processing complete: ${succeeded} succeeded, ${failed} failed`);
}

function renderEmailList() {
    const container = document.getElementById('emailListContainer');
    let filteredEmails = emails.filter(email => {
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'high' && email.urgency === 'High') ||
            (currentFilter === 'action' && email.intent === 'Action Required') ||
            (currentFilter === 'meeting' && email.intent === 'Meeting Request') ||
            (currentFilter === 'ai' && email.aiProcessed);
        
        const matchesSearch = !searchQuery || 
            email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.body.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    if (!filteredEmails.length) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-12">
                <p class="text-gray-400 text-xl">No emails found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredEmails.map(email => {
        const isProcessed = processedEmails[email.id];
        const isSelected = selectedEmailId === email.id;
        const timeAgo = formatTimeAgo(email.timestamp);
        
        return `
            <div class="email-item ${isSelected ? 'selected' : ''} ${email.aiProcessed ? 'ai-processing' : ''}" onclick="selectEmail('${email.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="font-black text-white text-base truncate">${escapeHtml(email.senderName)}</h3>
                            ${email.aiProcessed ? '<span class="ai-badge">🤖 AI</span>' : ''}
                            ${isProcessed ? '<span style="color: #26de81;">✓</span>' : ''}
                        </div>
                        <p class="text-gray-400 text-sm mb-2 truncate">${escapeHtml(email.sender)}</p>
                    </div>
                    <span class="text-gray-500 text-xs font-medium whitespace-nowrap ml-3">${timeAgo}</span>
                </div>
                <h4 class="font-bold text-gray-300 text-sm mb-3 line-clamp-2">${escapeHtml(email.subject)}</h4>
                <div class="flex gap-2 flex-wrap">
                    <span class="badge" style="background: linear-gradient(135deg, ${email.urgency === 'High' ? '#ff6b6b, #ee5a6f' : email.urgency === 'Medium' ? '#ffa502, #ff6348' : '#26de81, #20bf6b'}); color: white;">${email.urgency}</span>
                    <span class="badge" style="background: linear-gradient(135deg, #4a7ddb, #3a5fc1); color: white;">${email.intent}</span>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const intervals = { 
        year: 31536000, 
        month: 2592000, 
        week: 604800,
        day: 86400, 
        hour: 3600, 
        minute: 60 
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

function selectEmail(emailId) {
    selectedEmailId = emailId;
    const email = emails.find(e => e.id === emailId);
    if (email) {
        renderEmailList();
        renderEmailDetail(email);
    }
}

function renderEmailDetail(email) {
    const container = document.getElementById('emailDetailContainer');
    const isProcessed = processedEmails[email.id];
    const selectedReply = isProcessed?.selectedReply;
    
    const fullBody = email.fullBody || email.body;
    const shouldTruncate = fullBody.length > 1000;
    const displayBody = shouldTruncate ? fullBody.substring(0, 1000) + '...' : fullBody;

    container.innerHTML = `
        <div style="animation: slideInUp 0.6s;">
            <div style="background: linear-gradient(135deg, #4a7ddb, #3a5fc1); padding: 40px;">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-white text-3xl font-black email-content">${escapeHtml(email.subject)}</h2>
                    ${email.aiProcessed ? '<span class="ai-badge" style="font-size: 1rem;">🤖 AI Analyzed</span>' : 
                        `<button onclick="processSingleEmailWithAI('${email.id}')" class="expand-btn" style="margin: 0;">🤖 Process with AI</button>`}
                </div>
                <div class="flex flex-wrap gap-6 text-white text-sm">
                    <span>📧 ${escapeHtml(email.senderName)}</span>
                    <span>🕒 ${formatTimeAgo(email.timestamp)}</span>
                    <span>📅 ${email.timestamp.toLocaleDateString()}</span>
                </div>
            </div>

            <div class="custom-scroll" style="padding: 40px; background: rgba(10, 10, 30, 0.9); max-height: 750px; overflow-y: auto;">
                <div class="mb-8 p-8 rounded-3xl" style="background: rgba(99, 138, 210, 0.15); border: 2px solid rgba(99, 138, 210, 0.3);">
                    <h3 class="font-black text-white text-xl mb-6">🤖 AI Classification</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div class="p-6 rounded-2xl" style="background: rgba(15, 15, 40, 0.8); border: 1px solid rgba(99, 138, 210, 0.3);">
                            <p class="text-gray-400 text-xs font-bold mb-2">INTENT</p>
                            <p class="font-black text-lg text-white">${email.intent}</p>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: rgba(15, 15, 40, 0.8); border: 1px solid rgba(99, 138, 210, 0.3);">
                            <p class="text-gray-400 text-xs font-bold mb-2">URGENCY</p>
                            <p class="font-black text-lg" style="color: ${email.urgency === 'High' ? '#ff6b6b' : email.urgency === 'Medium' ? '#ffa502' : '#26de81'}">${email.urgency}</p>
                        </div>
                        <div class="p-6 rounded-2xl" style="background: rgba(15, 15, 40, 0.8); border: 1px solid rgba(99, 138, 210, 0.3);">
                            <p class="text-gray-400 text-xs font-bold mb-2">SENTIMENT</p>
                            <p class="font-black text-lg text-white">${email.sentiment}</p>
                        </div>
                    </div>
                </div>

                <div class="mb-8 p-8 rounded-3xl" style="border: 2px solid ${email.aiProcessed ? 'rgba(167, 139, 250, 0.5)' : 'rgba(99, 138, 210, 0.3)'}; background: ${email.aiProcessed ? 'rgba(167, 139, 250, 0.1)' : 'rgba(15, 15, 40, 0.6)'};">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-black text-white text-xl">📝 ${email.aiProcessed ? 'AI-Generated' : 'Rule-Based'} Summary</h3>
                        ${email.aiProcessed ? 
                            '<span class="ai-badge">🤖 Gemini AI</span>' : 
                            '<span class="badge" style="background: rgba(255, 165, 2, 0.3); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.5);">⚠️ Basic</span>'}
                    </div>
                    <p class="text-gray-300 leading-relaxed email-content">${escapeHtml(email.summary)}</p>
                    ${!email.aiProcessed ? '<p class="text-gray-500 text-sm mt-3">💡 Click "Process with AI" above for AI-powered analysis</p>' : ''}
                </div>

                <div class="mb-8 p-8 rounded-3xl" style="background: rgba(15, 15, 40, 0.7);">
                    <h3 class="font-black text-white text-xl mb-4">📄 Full Email</h3>
                    <div class="p-6 rounded-2xl" style="background: rgba(10, 10, 30, 0.8); border: 1px solid rgba(99, 138, 210, 0.2);">
                        <div id="emailBody_${email.id}" class="text-gray-300 leading-relaxed email-content" style="max-height: ${shouldTruncate ? '400px' : 'none'}; overflow-y: ${shouldTruncate ? 'auto' : 'visible'};">${escapeHtml(displayBody)}</div>
                        ${shouldTruncate ? `
                            <button onclick="toggleFullEmail('${email.id}')" id="expandBtn_${email.id}" class="expand-btn">
                                Show Full Email (${Math.round(fullBody.length / 1000)}k characters)
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="p-8 rounded-3xl" style="background: ${email.aiProcessed ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 138, 210, 0.15)'}; border: 2px solid ${email.aiProcessed ? 'rgba(167, 139, 250, 0.5)' : 'rgba(99, 138, 210, 0.3)'};">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-black text-white text-xl">💡 Smart Replies</h3>
                        ${email.aiProcessed ? 
                            '<span class="ai-badge">🤖 AI Generated</span>' : 
                            '<span class="badge" style="background: rgba(255, 165, 2, 0.3); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.5);">📝 Templates</span>'}
                    </div>
                    ${!email.aiProcessed ? 
                        '<p class="text-gray-400 text-sm mb-4">⚠️ These are generic templates. Use AI processing for personalized replies.</p>' : 
                        '<p class="text-gray-400 text-sm mb-4">✨ These replies are generated by Gemini AI based on the email content.</p>'}
                    <div class="space-y-4">
                        ${email.replies.map(reply => `
                            <div class="reply-card ${selectedReply?.id === reply.id ? 'selected' : ''}" 
                                 onclick="selectReply('${email.id}', ${reply.id}, '${escapeHtml(reply.label)}', \`${escapeHtml(reply.text)}\`)"
                                 style="padding: 24px; border-radius: 20px;">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="font-black text-white">${escapeHtml(reply.label)}</span>
                                    ${selectedReply?.id === reply.id ? '<span style="color: #4a7ddb; font-size: 24px;">✓</span>' : ''}
                                </div>
                                <p class="text-gray-300 email-content">${escapeHtml(reply.text)}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${selectedReply ? `
                    <div class="mt-8 p-8 rounded-3xl" style="background: rgba(38, 222, 129, 0.15); border: 3px solid #26de81;">
                        <h3 class="font-black text-xl mb-4" style="color: #26de81;">✅ Draft Ready</h3>
                        <div class="p-6 rounded-2xl" style="background: rgba(10, 10, 30, 0.8);">
                            <p class="text-gray-300 email-content">${escapeHtml(selectedReply.text)}</p>
                        </div>
                        <p class="text-gray-400 text-sm mt-4">This email has been marked as processed. You can copy this reply and send it through Gmail.</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

async function processSingleEmailWithAI(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    // Show loading state
    const container = document.getElementById('emailDetailContainer');
    const originalContent = container.innerHTML;
    
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-12">
            <div class="loader mb-6"></div>
            <h3 class="text-2xl font-bold text-white mb-4">🤖 Processing with Gemini AI</h3>
            <p class="text-gray-400 text-center mb-2">Analyzing email content...</p>
            <p class="text-gray-500 text-sm">This may take a few seconds</p>
        </div>
    `;
    
    try {
        console.log('🤖 Starting AI processing for email:', emailId);
        const aiResult = await processEmailWithAI(email);
        
        console.log('✅ AI Result:', aiResult);
        
        // Update email with AI results
        const emailIndex = emails.findIndex(e => e.id === emailId);
        if (emailIndex !== -1) {
            emails[emailIndex] = {
                ...emails[emailIndex],
                ...aiResult,
                aiProcessed: true // Force AI processed flag
            };
            
            console.log('📧 Updated email:', emails[emailIndex]);
            
            // Re-render
            renderEmailList();
            renderEmailDetail(emails[emailIndex]);
            updateStatistics();
            
            // Show success message
            alert('✅ Email processed successfully with Gemini AI!');
        }
    } catch (error) {
        console.error('❌ AI processing failed:', error);
        container.innerHTML = originalContent;
        alert('❌ AI processing failed: ' + error.message + '\n\nPlease check your Gemini API key in config.json');
    }
}

function toggleFullEmail(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    const bodyContainer = document.getElementById(`emailBody_${emailId}`);
    const expandBtn = document.getElementById(`expandBtn_${emailId}`);
    const fullBody = email.fullBody || email.body;
    
    if (bodyContainer.textContent.includes('...')) {
        bodyContainer.textContent = fullBody;
        bodyContainer.style.maxHeight = 'none';
        expandBtn.textContent = 'Show Less';
    } else {
        bodyContainer.textContent = fullBody.substring(0, 1000) + '...';
        bodyContainer.style.maxHeight = '400px';
        expandBtn.textContent = `Show Full Email (${Math.round(fullBody.length / 1000)}k characters)`;
    }
}

function selectReply(emailId, replyId, label, text) {
    processedEmails[emailId] = {
        processedAt: new Date().toISOString(),
        selectedReply: { id: replyId, label, text }
    };
    
    saveProcessedEmails();
    
    const email = emails.find(e => e.id === emailId);
    if (email) {
        renderEmailList();
        renderEmailDetail(email);
        updateStatistics();
    }
}

function debugAuthState() {
    console.log('=== DEBUG AUTH STATE ===');
    console.log('Access Token:', accessToken ? `Present (${accessToken.substring(0, 20)}...)` : 'Missing');
    console.log('Token Client:', tokenClient ? 'Present' : 'Missing');
    console.log('Emails loaded:', emails.length);
    console.log('Config loaded:', config ? 'Yes' : 'No');
    console.log('Processed emails:', Object.keys(processedEmails).length);
    console.log('========================');
    
    // Test the token directly
    if (accessToken) {
        fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => {
            console.log('Token test response:', response.status);
            return response.json();
        })
        .then(profile => console.log('Profile:', profile))
        .catch(error => console.error('Token test failed:', error));
    }
}

function filterEmails(type) {
    currentFilter = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === type) {
            btn.classList.add('active');
        }
    });
    
    renderEmailList();
}

function handleSearch(query) {
    searchQuery = query;
    renderEmailList();
}

function updateStatistics() {
    document.getElementById('totalEmails').textContent = emails.length;
    document.getElementById('highUrgency').textContent = emails.filter(e => e.urgency === 'High').length;
    document.getElementById('actionRequired').textContent = emails.filter(e => e.intent === 'Action Required').length;
    document.getElementById('aiProcessed').textContent = emails.filter(e => e.aiProcessed).length;
    document.getElementById('processedCount').textContent = Object.keys(processedEmails).length;
}

function markAllProcessed() {
    if (!emails.length) {
        alert('No emails to mark');
        return;
    }
    
    if (!confirm(`Mark all ${emails.length} emails as processed?`)) {
        return;
    }
    
    emails.forEach(email => {
        if (!processedEmails[email.id]) {
            processedEmails[email.id] = {
                processedAt: new Date().toISOString(),
                selectedReply: null
            };
        }
    });
    
    saveProcessedEmails();
    renderEmailList();
    updateStatistics();
    alert(`✅ Marked ${emails.length} emails as processed!`);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        accessToken = null;
        emails = [];
        processedEmails = {};
        selectedEmailId = null;
        
        if (accessToken) {
            google.accounts.id.revoke(accessToken);
        }
        
        location.reload();
    }
}

async function refreshEmails() {
    if (!accessToken) {
        alert('Please log in again');
        return;
    }
    
    await fetchGmailEmails(accessToken);
}

function exportToCSV() {
    if (!emails.length) {
        alert('No emails to export');
        return;
    }

    const csvData = emails.map(email => {
        const processed = processedEmails[email.id];
        return {
            email_id: email.id,
            sender: email.sender,
            senderName: email.senderName,
            subject: email.subject,
            received_at: email.timestamp.toISOString(),
            summary: email.summary,
            intent: email.intent,
            urgency: email.urgency,
            sentiment: email.sentiment,
            fullBody: email.fullBody || email.body,
            ai_processed: email.aiProcessed ? 'Yes' : 'No',
            selected_action: processed?.selectedReply?.label || 'Not Processed',
            drafted_reply: processed?.selectedReply?.text || '',
            processed_at: processed?.processedAt || ''
        };
    });

    const headers = ['Email ID', 'Sender Email', 'Sender Name', 'Subject', 'Received At', 'Summary', 'Intent', 'Urgency', 'Sentiment', 'Full Email Body', 'AI Processed', 'Selected Action', 'Drafted Reply', 'Processed At'];
    
    const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const csv = [
        headers.join(','),
        ...csvData.map(row => 
            Object.values(row).map(escapeCsvField).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mailmind_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    alert(`✅ Exported ${emails.length} emails successfully!`);
}

function exportFilteredToCSV() {
    if (!emails.length) {
        alert('No emails to export');
        return;
    }
    
    let filteredEmails = emails.filter(email => {
        const matchesFilter = currentFilter === 'all' ||
            (currentFilter === 'high' && email.urgency === 'High') ||
            (currentFilter === 'action' && email.intent === 'Action Required') ||
            (currentFilter === 'meeting' && email.intent === 'Meeting Request') ||
            (currentFilter === 'ai' && email.aiProcessed);
        
        const matchesSearch = !searchQuery || 
            email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.body.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    if (!filteredEmails.length) {
        alert('No emails match the current filter');
        return;
    }

    const csvData = filteredEmails.map(email => {
        const processed = processedEmails[email.id];
        return {
            email_id: email.id,
            sender: email.sender,
            senderName: email.senderName,
            subject: email.subject,
            received_at: email.timestamp.toISOString(),
            summary: email.summary,
            intent: email.intent,
            urgency: email.urgency,
            sentiment: email.sentiment,
            fullBody: email.fullBody || email.body,
            ai_processed: email.aiProcessed ? 'Yes' : 'No',
            selected_action: processed?.selectedReply?.label || 'Not Processed',
            drafted_reply: processed?.selectedReply?.text || '',
            processed_at: processed?.processedAt || ''
        };
    });

    const headers = ['Email ID', 'Sender Email', 'Sender Name', 'Subject', 'Received At', 'Summary', 'Intent', 'Urgency', 'Sentiment', 'Full Email Body', 'AI Processed', 'Selected Action', 'Drafted Reply', 'Processed At'];
    
    const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const csv = [
        headers.join(','),
        ...csvData.map(row => 
            Object.values(row).map(escapeCsvField).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mailmind_filtered_${currentFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    alert(`✅ Exported ${filteredEmails.length} filtered emails successfully!`);
}

window.addEventListener('load', () => {
    initializeGoogleAuth();
});