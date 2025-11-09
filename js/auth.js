// Initialize Google Auth
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