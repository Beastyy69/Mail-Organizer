// HTML escaping utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Time formatting utility
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

// Email classification - rule based fallback
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

// Enhanced summary generation for fallback
function generateEnhancedSummary(email) {
    const body = email.body || '';
    let cleanBody = body.split(/\n(--|___|\bSent from\b|\bBest regards\b|\bRegards\b|\bThanks\b)/i)[0];
    
    const sentences = cleanBody
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200);
    
    if (sentences.length === 0) {
        return `Email from ${email.senderName} regarding: ${email.subject}`;
    }
    
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

// Contextual reply generation
function generateContextualReplies(email) {
    const text = ((email.body || '') + ' ' + (email.subject || '')).toLowerCase();
    const classification = classifyEmailRuleBased(email);
    
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