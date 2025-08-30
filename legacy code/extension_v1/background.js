const KEY_TO_EXTRACT = 'sb_wiz.pq';

// Function to check if a URL is a common search engine results page
function isSearchPage(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // Common search engine domains and their typical search query paths
    return (
        lowerUrl.includes('google.com/search?') ||
        lowerUrl.includes('bing.com/search?') ||
        lowerUrl.includes('duckduckgo.com/?q=') ||
        lowerUrl.includes('yahoo.com/search?')
        // Add more search engines if needed
    );
}

// Function to extract the local storage value
async function extractLocalStorageValue(tabId, tabUrl) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: (keyName) => {
                return localStorage.getItem(keyName);
            },
            args: [KEY_TO_EXTRACT]
        });

        if (results && results[0] && results[0].result !== undefined) {
            const value = results[0].result;
            if (value !== null) {
                console.log(`[Extension] Value for '${KEY_TO_EXTRACT}' on ${tabUrl}: ${value}`);
                // Display the value using a badge on the extension icon
                chrome.action.setBadgeText({ text: 'Got!', tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabId }); // Green

                // Optionally, show a desktop notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon48.png',
                    title: `SB_Wiz.pq Extracted!`,
                    message: `Key: ${KEY_TO_EXTRACT}\nValue: ${value.substring(0, 100)}...` // Truncate long values
                });

                // Optionally, store the value in chrome.storage.local
                chrome.storage.local.set({ [KEY_TO_EXTRACT]: value });

            } else {
                console.log(`[Extension] Key '${KEY_TO_EXTRACT}' not found on ${tabUrl}.`);
                chrome.action.setBadgeText({ text: 'N/A', tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#FFC107', tabId: tabId }); // Orange
            }
        } else {
            console.warn(`[Extension] Could not retrieve data for ${tabUrl}.`);
            chrome.action.setBadgeText({ text: 'Err', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId: tabId }); // Red
        }

    } catch (error) {
        console.error(`[Extension] Error extracting local storage on ${tabUrl}:`, error);
        chrome.action.setBadgeText({ text: 'Err', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId: tabId }); // Red
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care when the tab finishes loading (status: 'complete')
    // and its URL has changed, and it's a search page.
    if (changeInfo.status === 'complete' && tab.url && isSearchPage(tab.url)) {
        console.log(`[Extension] Search page detected: ${tab.url}`);
        extractLocalStorageValue(tabId, tab.url);
    }
});

// Optionally, reset badge when a non-search page is active or a new tab opens
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!isSearchPage(tab.url)) {
        chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId }); // Clear badge
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.action.setBadgeText({ text: '', tabId: tabId }); // Clear badge when tab closes
});