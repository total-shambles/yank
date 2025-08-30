const KEY_TO_EXTRACT = 'sb_wiz.pq';

// --- Ollama Configuration ---
const OLLAMA_BASE_URL = 'http://3.144.250.32:3000'; // Your Ollama server URL
const OLLAMA_MODEL_NAME = 'llama3.2';              // The model you want to use (e.g., 'llama2', 'mistral')
// --- End Ollama Configuration ---

// Function to detect search page and extract the query
function getSearchQuery(url) {
    if (!url) {
        return { isSearch: false, query: null };
    }

    const lowerUrl = url.toLowerCase();
    let queryParam = null;

    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        if (lowerUrl.includes('google.com/search?')) {
            queryParam = params.get('q');
        } else if (lowerUrl.includes('bing.com/search?')) {
            queryParam = params.get('q');
        } else if (lowerUrl.includes('duckduckgo.com/?q=')) {
            queryParam = params.get('q');
        } else if (lowerUrl.includes('yahoo.com/search?')) {
            queryParam = params.get('p'); // Yahoo uses 'p' for its query parameter
        }
        // Add more search engines here if needed, e.g.,
        // else if (lowerUrl.includes('ecosia.org/search?q=')) {
        //     queryParam = params.get('q');
        // }

        if (queryParam) {
            // Decode URI components and replace '+' with spaces for readability
            return { isSearch: true, query: decodeURIComponent(queryParam.replace(/\+/g, ' ')) };
        }
    } catch (e) {
        console.error("[Extension] Error parsing URL for search query:", e);
    }

    return { isSearch: false, query: null };
}

// Function to query Ollama directly and provide feedback
async function queryOllamaAndNotify(tabId, actualSearchQuery) { // Now accepts the actual search query
    if (!actualSearchQuery) {
        console.warn("[Extension] No search query provided for Ollama. Skipping AI query.");
        chrome.action.setBadgeText({ text: 'N/Q', tabId: tabId }); // No Query for AI
        chrome.action.setBadgeBackgroundColor({ color: '#808080', tabId: tabId }); // Gray
        return;
    }

    // Construct a more meaningful prompt for Ollama using the actual search query
    // You can customize this prompt to ask Ollama to summarize, define, etc.
    const ollamaPrompt = `You will receive a query extracted during a web search session. The goal is to review the query and send an output based on a few parameters. Here is a more detailed explanation of what is required:
                            Upon receiving a query, evaluate it and generate a percentage as follows. 
                            1. Determine how objective the query is by seeing how many potential endpoints the question can have. The fewer end points, the more objective (objective queries only have one endpoint). Example of objective queries: 
                                * What is the capital of France?
                                * Who was the first president of the United States
                                * What is the chemical composition of water
                                
                                Examples of vague queries:
                                * Places to eat
                                * Why is vitamin C the best vitamin
                                * How do I bake?

                            2. After determining the approximate number of potential endpoints, divide 1 by the number obtained. Subtract it result from 1 and multiply the result by 100
                            3. The queries can be identified with the phrase “Score this: “ in front of  the query.
                            4. Respond with the number only
                            5. Important: DO NOT RESPOND WITH ANY TEXT OR EXPLANATION OF THE ANSWER.

                            Here is the Query, Score this: "${actualSearchQuery}"`;

    chrome.action.setBadgeText({ text: 'AI..', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#8A2BE2', tabId: tabId }); // Purple for AI processing

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL_NAME,
                prompt: ollamaPrompt, // Use the constructed prompt
                stream: false // Get the full response at once
            })
        });

        if (response.ok) {
            const data = await response.json();
            const ollamaResponseText = data.response || 'N/A'; // Default to 'N/A' if no response field
            console.log(`[Extension] Ollama Query: "${ollamaPrompt}"`);
            console.log(`[Extension] Ollama Response: ${ollamaResponseText}`);

            // --- Modify Badge Text with Truncated Output ---
            const badgeText = ollamaResponseText.substring(0, 4).toUpperCase(); // Get first 4 chars, uppercase
            chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#008000', tabId: tabId }); // Green for AI success

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: `Ollama Response for: "${actualSearchQuery.substring(0, 50)}..."`, // Show truncated query
                message: `Response: "${ollamaResponseText.substring(0, 100)}..."`
            });
        } else {
            const errorText = await response.text();
            console.error(`[Extension] Ollama API Error: Status ${response.status}, ${errorText}`);

            chrome.action.setBadgeText({ text: 'ERR!', tabId: tabId }); // Indicate API Error
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId }); // Red for AI error

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: `Ollama Error for: "${actualSearchQuery.substring(0, 50)}..."`, // Show truncated query
                message: `Status: ${response.status}\nError: ${errorText.substring(0, 100)}...`
            });
        }
    } catch (error) {
        console.error(`[Extension] Failed to connect to Ollama:`, error);

        chrome.action.setBadgeText({ text: 'CONN', tabId: tabId }); // Indicate Connection Error
        chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId: tabId }); // Orange-Red for connection issue

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon48.png',
            title: `Ollama Connection Error for: "${actualSearchQuery.substring(0, 50)}..."`, // Show truncated query
            message: `Could not reach Ollama server. Is it running at ${OLLAMA_BASE_URL}?`
        });
    }
}

// Function to extract the local storage value (remains the same)
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
                console.log(`[Extension] Local Storage Value for '${KEY_TO_EXTRACT}' on ${tabUrl}: ${value}`);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon48.png',
                    title: `Local Storage Extracted!`,
                    message: `Key: ${KEY_TO_EXTRACT}\nValue: ${value.substring(0, 100)}...`
                });
            } else {
                console.log(`[Extension] Local Storage Key '${KEY_TO_EXTRACT}' not found on ${tabUrl}.`);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon48.png',
                    title: `Local Storage Not Found`,
                    message: `Key '${KEY_TO_EXTRACT}' was not found.`
                });
            }
        } else {
            console.warn(`[Extension] Could not retrieve Local Storage data for ${tabUrl}. Script injection issue?`);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: `Local Storage Extraction Error`,
                message: `Failed to inject script for local storage.`
            });
        }

    } catch (error) {
        console.error(`[Extension] Error extracting local storage on ${tabUrl}:`, error);
         chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon48.png',
            title: `Local Storage Fatal Error`,
            message: `An unexpected error occurred: ${error.message}`
        });
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Get search query information using the new function
    const searchInfo = getSearchQuery(tab.url);

    // Only proceed if the tab has completely loaded AND it's a search page AND a query was found
    if (changeInfo.status === 'complete' && searchInfo.isSearch && searchInfo.query) {
        console.log(`[Extension] Search page detected: ${tab.url}`);
        console.log(`[Extension] Extracted Search Query: "${searchInfo.query}"`);

        // Trigger local storage extraction
        extractLocalStorageValue(tabId, tab.url);

        // Send the extracted search query to Ollama
        queryOllamaAndNotify(tabId, searchInfo.query);
    } else if (changeInfo.status === 'complete' && searchInfo.isSearch && !searchInfo.query) {
        // This case handles search pages where no query parameter is found (e.g., just google.com/search without a 'q')
        console.log(`[Extension] Search page detected, but no query found in URL: ${tab.url}`);
        chrome.action.setBadgeText({ text: 'N/Q', tabId: tabId }); // Indicate No Query for AI
        chrome.action.setBadgeBackgroundColor({ color: '#808080', tabId: tabId }); // Gray
    }
});

// Reset badge when not on a relevant page or tab closes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const searchInfo = getSearchQuery(tab.url); // Use the new function
    if (!searchInfo.isSearch) { // Clear badge if not a recognized search page
        chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
});