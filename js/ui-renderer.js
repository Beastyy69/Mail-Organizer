// Render email list
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

// Render email detail view
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

// Update statistics panel
function updateStatistics() {
    document.getElementById('totalEmails').textContent = emails.length;
    document.getElementById('highUrgency').textContent = emails.filter(e => e.urgency === 'High').length;
    document.getElementById('actionRequired').textContent = emails.filter(e => e.intent === 'Action Required').length;
    document.getElementById('aiProcessed').textContent = emails.filter(e => e.aiProcessed).length;
    document.getElementById('processedCount').textContent = Object.keys(processedEmails).length;
}

// Toggle full email view
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