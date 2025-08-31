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

async function queryOllamaAndLaunchTab(tabId, combinedPrompt) {

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

            if (ollamaResponseText) {
                // Encode the response to be a valid URL search query
                const encodedQuery = encodeURIComponent(ollamaResponseText);
                const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
                
                // Launch a new tab with the search query
                await chrome.tabs.create({ url: searchUrl });

            } else {
                 console.error("[Extension] empty or invalid response.");
            }

            return { success: true };
        } else {
            const errorText = await response.text();
            console.error(`[Extension] API Error: Status ${response.status}, ${errorText}`);
            chrome.action.setBadgeText({ text: 'ERR', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
            return { success: false, error: 'API error' };
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
                console.log(`Query value on ${tabUrl}: ${value}`);
                // Store the value in Chrome's local storage for later access by the popup
                await chrome.storage.local.set({ [KEY_TO_EXTRACT]: value });
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'image.png',
                    title: `Local Storage Extracted!`,
                    message: `Key value stored for future queries.`
                });
            } else {
                console.log(`[Extension] Local Storage Key '${KEY_TO_EXTRACT}' not found on ${tabUrl}.`);
                await chrome.storage.local.remove(KEY_TO_EXTRACT);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'image.png',
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
        const combinedPrompt = `Instruction: You are a helpful assistant. This is a query extracted during a web search session. The goal is to review the query, transform it with context and send an output. Here is a more detailed explanation of what is required:
                                Upon receiving a query, you only need to transform it with the help of context provided. You must not answer the query, do not summarize, and do not provide any additional information. Your task is to transform the query try into a hollistic search query only.
                                Example of transformed queries: 
                                
                                    Input Query: What about for endurance athletes? 
                                    Input Context: Nutrition
                                    Output Query: What nutritional strategies are most effective for endurance athletes?	

                                    Input Query: Which position is hardest? 
                                    Input Context: Hockey
                                    Output Query: Which position in hockey is considered the most difficult to play and why?	
                                    
                                    Input Query: What social factors matter most?
                                    Input Context: Life Span
                                    Output Query: What social factors matter most for healthy aging and longevity?	

                                    Input Query: Where is it headed next? 
                                    Input Context: Telehealth
                                    Output Query: What are the upcoming trends and future developments in telehealth technology?	

                                    Input Query: What are the main causes? 
                                    Input Context: Mental health crisis
                                    Output Query: What are the primary causes of the current mental health crisis in the US?	
                                    
                                Input: Input query: '${keyVal}', Input context: '${request.text}'`;
        
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
    
    // const ollamaPrompt = `determine the number of different potential contexts a sentence can have classify the sentence into high, medium, or low number of potential contexts. High: 10+ potential contexts medium: 5-9 potential contexts low: 1-4potential contexts. perform this transformation for the sentence you receive. I trust your thinking so you can avoid the chain of thought processing. answer with the classification only. Classify this: "${actualSearchQuery}"`;
    
    const ollamaPrompt = `Instruction: You are a helpful assistant. This is a query extracted during a web search session. The goal is to review the query and send an output. Here is a more detailed explanation of what is required:
                            Upon receiving a query, you only need to classify it as vague or specific. You must not answer the query, do not summarize, and do not provide any additional information. Your task is to classify the query into a vague one or a specific one. Make sure the output is either: 0 for 'vague' or 1 for 'specific' as is.
                                Example of open queries: 
                                * Best chromebook?	- vague
                                * What new treatments are emerging?	- vague
                                * How much is genetic? - vague
                                * president - vague
                                
                                Examples of closed queries:
                                * When was Rhual constructed? - specific
                                * What is an action verb? - specific
                                * Which country has topped the swimming medals list in the summer olympics?	- specific
                                * What are the advantages of vitamin C? - specific

                            Input: "${actualSearchQuery}"`;

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
            
            if (ollamaResponseText.toLowerCase() == '0') {
                chrome.action.setBadgeText({ text: ':(', tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#f44336', tabId: tabId });
            }
            else if (ollamaResponseText.toLowerCase() == '1') { 
                chrome.action.setBadgeText({ text: ':)', tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#008000', tabId: tabId });
            }

            console.log(ollamaResponseText)

            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'image.png',
                title: `Ollama Response for: "${actualSearchQuery.substring(0, 50)}..."`,
                message: `Response: "${ollamaResponseText.substring(0, 100)}..."`
            });
        } else {
            const errorText = await response.text();
            chrome.action.setBadgeText({ text: 'ERR!', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'image.png',
                title: `Ollama Error for: "${actualSearchQuery.substring(0, 50)}..."`,
                message: `Status: ${response.status}\nError: ${errorText.substring(0, 100)}...`
            });
        }
    } catch (error) {
        chrome.action.setBadgeText({ text: 'CONN', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId: tabId });
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'image.png',
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