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
            sendButton.disabled = false;
        });
    });
});

document.getElementById("user-input")
    .addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.key === 'Enter') {
        document.getElementById("send-button").click();
    }
});