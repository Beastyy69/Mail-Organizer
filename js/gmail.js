// Parse Gmail message
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

// Fetch Gmail emails
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