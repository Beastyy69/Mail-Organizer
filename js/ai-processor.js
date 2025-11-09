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

// Process single email with AI
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

// Process all emails with AI
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