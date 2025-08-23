const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the CORS package
const app = express();
const port = 3000; // This must match the port in BACKEND_URL in background.js

// Enable CORS for all origins. In a real application, you'd restrict this
// to your extension's origin if possible, but for extension to localhost
// communication, a broad config is often simpler for development.
app.use(cors());

// Use body-parser middleware to parse JSON request bodies
app.use(bodyParser.json());

// A simple HTML page to display the outputs
let receivedData = []; // Array to store received data

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Received Data Outputs</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; }
                h1 { color: #333; }
                #output-container {
                    background-color: #fff;
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 8px;
                    max-height: 600px;
                    overflow-y: auto;
                }
                .data-entry {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .data-entry:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                pre {
                    background-color: #e9e9e9;
                    padding: 8px;
                    border-radius: 4px;
                    white-space: pre-wrap; /* Ensures long strings wrap */
                    word-break: break-all; /* Breaks words if too long for line */
                }
                small { color: #666; font-size: 0.8em; }
            </style>
        </head>
        <body>
            <h1>Data Received from Extension</h1>
            <button onclick="clearData()">Clear Data</button>
            <div id="output-container">
                <p>No data received yet.</p>
            </div>

            <script>
                // Function to fetch and display data
                async function fetchData() {
                    const response = await fetch('/get_data');
                    const data = await response.json();
                    const container = document.getElementById('output-container');
                    container.innerHTML = ''; // Clear previous content

                    if (data.length === 0) {
                        container.innerHTML = '<p>No data received yet.</p>';
                    } else {
                        data.reverse().forEach(entry => { // Display newest first
                            const div = document.createElement('div');
                            div.className = 'data-entry';
                            div.innerHTML = \`
                                <p><strong>Key:</strong> \${entry.key}</p>
                                <p><strong>URL:</strong> <small>\${entry.url}</small></p>
                                <p><strong>Timestamp:</strong> <small>\${new Date(entry.timestamp).toLocaleString()}</small></p>
                                <p><strong>Value:</strong></p>
                                <pre>\${entry.value}</pre>
                            \`;
                            container.appendChild(div);
                        });
                    }
                }

                // Function to clear data on the server and then refresh
                async function clearData() {
                    await fetch('/clear_data', { method: 'POST' });
                    fetchData(); // Refresh display after clearing
                }

                // Fetch data when the page loads and refresh every 3 seconds
                fetchData();
                setInterval(fetchData, 3000); // Auto-refresh
            </script>
        </body>
        </html>
    `);
});


// Endpoint to receive data from the extension
app.post('/receive_data', (req, res) => {
    const data = req.body; // The data sent by the extension
    if (data && data.key && data.value) {
        receivedData.push(data); // Store the data
        console.log(`Received data from extension:`);
        console.log(`  Key: ${data.key}`);
        console.log(`  Value: ${data.value ? data.value.substring(0, 100) + '...' : 'N/A'}`); // Truncate for console
        console.log(`  URL: ${data.url}`);
        console.log(`  Timestamp: ${data.timestamp}`);
        res.status(200).send('Data received successfully');
    } else {
        res.status(400).send('Invalid data format');
    }
});

// Endpoint to send stored data to the webpage
app.get('/get_data', (req, res) => {
    res.json(receivedData);
});

// Endpoint to clear stored data
app.post('/clear_data', (req, res) => {
    receivedData = [];
    console.log('All received data cleared.');
    res.status(200).send('Data cleared successfully');
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
    console.log(`View outputs at http://localhost:${port}`);
});