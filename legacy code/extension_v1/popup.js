document.addEventListener('DOMContentLoaded', async function() {
    const resultParagraph = document.getElementById('result');
    const keyToExtract = 'sb_wiz.pq'; // Hardcoded key

    resultParagraph.textContent = `Extracting value for '${keyToExtract}'...`;

    try {
        // Get the current active tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            resultParagraph.textContent = 'Error: No active tab found.';
            return;
        }

        // Execute a script in the context of the active tab to get the local storage item
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (keyName) => { // Renamed parameter for clarity
                return localStorage.getItem(keyName);
            },
            args: [keyToExtract] // Pass the hardcoded key
        });

        // The result is an array, take the first element (which contains the result of our function)
        if (results && results[0] && results[0].result !== undefined) {
            const value = results[0].result;
            if (value !== null) {
                resultParagraph.textContent = `Value:\n${value}`;
            } else {
                resultParagraph.textContent = `Key '${keyToExtract}' not found in local storage.`;
            }
        } else {
            resultParagraph.textContent = 'Could not retrieve data. Ensure the page is loaded and accessible.';
        }

    } catch (error) {
        resultParagraph.textContent = `Error: ${error.message}`;
        console.error('Error extracting local storage:', error);
    }
});