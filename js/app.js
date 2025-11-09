// Select email
function selectEmail(emailId) {
    selectedEmailId = emailId;
    const email = emails.find(e => e.id === emailId);
    if (email) {
        renderEmailList();
        renderEmailDetail(email);
    }
}

// Select reply
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

// Filter emails
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

// Handle search
function handleSearch(query) {
    searchQuery = query;
    renderEmailList();
}

// Mark all as processed
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

// Logout
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

// Refresh emails
async function refreshEmails() {
    if (!accessToken) {
        alert('Please log in again');
        return;
    }
    
    await fetchGmailEmails(accessToken);
}

// Export to CSV
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

// Export filtered to CSV
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

// Debug auth state
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

// Initialize app on load
window.addEventListener('load', () => {
    initializeGoogleAuth();
});