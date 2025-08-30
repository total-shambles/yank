document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const statusMessage = document.getElementById('status-message');

    sendButton.addEventListener('click', function() {
        const inputText = userInput.value.trim();

        if (inputText.length === 0) {
            statusMessage.textContent = 'Please enter some text.';
            statusMessage.style.color = 'red';
            return;
        }

        statusMessage.textContent = 'Processing...';
        statusMessage.style.color = 'blue';
        sendButton.disabled = true;

        // Send the user's input to the background script
        chrome.runtime.sendMessage({
            type: "processUserInput",
            text: inputText
        }, function(response) {
            // This is an optional callback
            if (chrome.runtime.lastError) {
                statusMessage.textContent = 'Error: ' + chrome.runtime.lastError.message;
                statusMessage.style.color = 'red';
            } else if (response && response.success) {
                statusMessage.textContent = 'Search query generated and new tab opened!';
                statusMessage.style.color = 'green';
            } else {
                 statusMessage.textContent = 'Failed to generate search query.';
                 statusMessage.style.color = 'red';
            }
            sendButton.disabled = false;
        });
    });
});