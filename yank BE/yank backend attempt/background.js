const KEY_TO_EXTRACT = 'sb_wiz.pq';

// --- Ollama Configuration ---
const OLLAMA_BASE_URL = 'http://127.0.0.1:3000';
const OLLAMA_MODEL_NAME = 'llama3.2';
// --- End Ollama Configuration ---

// Function to detect search page and extract the query (remains the same)
function getSearchQuery(url) {
    if (!url) {
        return { isSearch: false, query: null };
    }
    const lowerUrl = url.toLowerCase();
    let queryParam = null;
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        if (lowerUrl.includes('google.com/search?') || lowerUrl.includes('bing.com/search?')) {
            queryParam = params.get('q');
        } else if (lowerUrl.includes('duckduckgo.com/?q=')) {
            queryParam = params.get('q');
        } else if (lowerUrl.includes('yahoo.com/search?')) {
            queryParam = params.get('p');
        }
        if (queryParam) {
            return { isSearch: true, query: decodeURIComponent(queryParam.replace(/\+/g, ' ')) };
        }
    } catch (e) {
        console.error("[Extension] Error parsing URL for search query:", e);
    }
    return { isSearch: false, query: null };
}

// Function to query Ollama and launch a new tab
async function queryOllamaAndLaunchTab(tabId, combinedPrompt) {
    chrome.action.setBadgeText({ text: 'AI..', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#8A2BE2', tabId: tabId });

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL_NAME,
                prompt: combinedPrompt, // Use the combined prompt
                stream: false
            })
        });

        if (response.ok) {
            const data = await response.json();
            const ollamaResponseText = (data.response || '').trim();
            console.log(`[Extension] Ollama Prompt: "${combinedPrompt}"`);
            console.log(`[Extension] Ollama Response: "${ollamaResponseText}"`);

            if (ollamaResponseText) {
                // Encode the response to be a valid URL search query
                const encodedQuery = encodeURIComponent(ollamaResponseText);
                const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
                
                // Launch a new tab with the search query
                await chrome.tabs.create({ url: searchUrl });

                const badgeText = ollamaResponseText.substring(0, 4).toUpperCase();
                chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#008000', tabId: tabId });
            } else {
                 console.error("[Extension] Ollama returned an empty or invalid response.");
                 chrome.action.setBadgeText({ text: 'NoQR', tabId: tabId });
                 chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId: tabId }); // Orange-red for no query
            }

            return { success: true };
        } else {
            const errorText = await response.text();
            console.error(`[Extension] Ollama API Error: Status ${response.status}, ${errorText}`);
            chrome.action.setBadgeText({ text: 'ERR!', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
            return { success: false, error: 'Ollama API error' };
        }
    } catch (error) {
        console.error(`[Extension] Failed to connect to Ollama:`, error);
        chrome.action.setBadgeText({ text: 'CONN', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId: tabId });
        return { success: false, error: 'Ollama connection error' };
    }
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
                console.log(`[Extension] Local Storage Value for '${KEY_TO_EXTRACT}' on ${tabUrl}: ${value}`);
                // Store the value in Chrome's local storage for later access by the popup
                await chrome.storage.local.set({ [KEY_TO_EXTRACT]: value });
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon48.png',
                    title: `Local Storage Extracted!`,
                    message: `Key value stored for future queries.`
                });
            } else {
                console.log(`[Extension] Local Storage Key '${KEY_TO_EXTRACT}' not found on ${tabUrl}.`);
                await chrome.storage.local.remove(KEY_TO_EXTRACT);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon48.png',
                    title: `Local Storage Not Found`,
                    message: `Key '${KEY_TO_EXTRACT}' was not found.`
                });
            }
        }
    } catch (error) {
        console.error(`[Extension] Error extracting local storage on ${tabUrl}:`, error);
    }
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "processUserInput") {
        // Get the last stored value of the key
        const data = await chrome.storage.local.get(KEY_TO_EXTRACT);
        const keyVal = data[KEY_TO_EXTRACT];

        if (!keyVal) {
            sendResponse({ success: false, error: "No 'sb_wiz.pq' key value has been stored yet. Please load a page with the key first." });
            return true; // Indicates we will send a response asynchronously
        }

        const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTabId = currentTabs[0].id;

        // Construct a prompt for Ollama to generate a search query
        const combinedPrompt = `Transform this search query: '${keyVal}', With this provided context: '${request.text}', try to generate a hollistic search query to yeild more objective search results. ONLY RESPOND WITH THE TRANSFORMED SEARCH QUERY. DO NOT RESPOND WITH ANY TEXT OR EXPLANATION OF THE ANSWER FOR THIS QUERY. `;
        
        // Call the function to query Ollama and launch a new tab
        const response = await queryOllamaAndLaunchTab(currentTabId, combinedPrompt);
        sendResponse(response);
    }
    return true; // Required to allow asynchronous sendResponse
});


// --- The rest of the script remains the same ---

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const searchInfo = getSearchQuery(tab.url);
    if (changeInfo.status === 'complete' && searchInfo.isSearch && searchInfo.query) {
        extractLocalStorageValue(tabId, tab.url);
        // We can still trigger the search query to Ollama as a bonus feature
        queryOllamaAndNotify(tabId, searchInfo.query);
    } else if (changeInfo.status === 'complete' && searchInfo.isSearch && !searchInfo.query) {
        chrome.action.setBadgeText({ text: 'N/Q', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#808080', tabId: tabId });
    }
});


// This function is still used for the search page functionality, but it will be slightly different from the popup's logic
// We can keep it to show two distinct functionalities
async function queryOllamaAndNotify(tabId, actualSearchQuery) {
    if (!actualSearchQuery) {
        chrome.action.setBadgeText({ text: 'N/Q', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#808080', tabId: tabId });
        return;
    }
    
    const ollamaPrompt = `determine the number of different potential contexts a sentence can have classify the sentence into high, medium, or low number of potential contexts. High: 10+ potential contexts medium: 5-9 potential contexts low: 1-4potential contexts. perform this transformation for the sentence you receive. I trust your thinking so you can avoid the chain of thought processing. answer with the classification only. Classify this: "${actualSearchQuery}"`;
    
    // const ollamaPrompt = `This is a query extracted during a web search session. The goal is to review the query and send an output based on a few parameters. Here is a more detailed explanation of what is required:
    //                         Upon receiving a query, evaluate it and generate a percentage as follows. 
    //                         1. Determine how objective the query is by seeing how many potential endpoints the question can have. The fewer end points, the more objective (objective queries only have one endpoint). Example of objective queries: 
    //                             * What is the capital of France?
    //                             * Who was the first president of the United States
    //                             * What is the chemical composition of water
                                
    //                             Examples of vague queries:
    //                             * Places to eat
    //                             * Why is vitamin C the best vitamin
    //                             * How do I bake?

    //                         2. After determining the approximate number of potential endpoints, divide 1 by the number obtained. Subtract it result from 1 and multiply the result by 100
    //                         3. The queries can be identified with the phrase “Score this: “ in front of the query.
    //                         4. Respond with the simplified number only
    //                         5. Important: DO NOT RESPOND WITH ANY TEXT OR EXPLANATION OF THE ANSWER FOR THIS QUERY.
    //                         Here is the Query, Score this: "${actualSearchQuery}"`;

    chrome.action.setBadgeText({ text: '...', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#8A2BE2', tabId: tabId });
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL_NAME,
                prompt: ollamaPrompt,
                stream: false
            })
        });
        if (response.ok) {
            const data = await response.json();
            const ollamaResponseText = data.response || 'N/A';
            const badgeText = ollamaResponseText.substring(0, 4).toUpperCase();
            
            if (ollamaResponseText.toLowerCase() == 'high') {
                chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#f44336', tabId: tabId });
            }
            else if (ollamaResponseText.toLowerCase() == 'medium') {
                chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#ffd966', tabId: tabId });
            }
            else if (ollamaResponseText.toLowerCase() == 'low') { 
                chrome.action.setBadgeText({ text: badgeText, tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#008000', tabId: tabId });
            }

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: `Ollama Response for: "${actualSearchQuery.substring(0, 50)}..."`,
                message: `Response: "${ollamaResponseText.substring(0, 100)}..."`
            });
        } else {
            const errorText = await response.text();
            chrome.action.setBadgeText({ text: 'ERR!', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon48.png',
                title: `Ollama Error for: "${actualSearchQuery.substring(0, 50)}..."`,
                message: `Status: ${response.status}\nError: ${errorText.substring(0, 100)}...`
            });
        }
    } catch (error) {
        chrome.action.setBadgeText({ text: 'CONN', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId: tabId });
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon48.png',
            title: `Ollama Connection Error for: "${actualSearchQuery.substring(0, 50)}..."`,
            message: `Could not reach Ollama server. Is it running at ${OLLAMA_BASE_URL}?`
        });
    }
}


chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const searchInfo = getSearchQuery(tab.url);
    if (!searchInfo.isSearch) {
        chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
});