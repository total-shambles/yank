from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import datetime
import requests # New import for making HTTP requests

app = Flask(__name__)
CORS(app) # Enable CORS for all origins

# In-memory storage for received data
received_data = []

# --- Ollama Configuration ---
OLLAMA_BASE_URL = 'http://18.219.120.154:3000' # Replace with your Ollama server URL if different
OLLAMA_MODEL_NAME = 'llama3.2'               # Replace with the model you want to use (e.g., 'llama2', 'mistral')
# --- End Ollama Configuration ---

# HTML template for the frontend (remains mostly the same, but the data displayed will now include Ollama response)
HTML_TEMPLATE = """
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
        .ollama-response {
            border-left: 3px solid #007bff;
            padding-left: 10px;
            margin-top: 10px;
            background-color: #e6f2ff;
        }
        small { color: #666; font-size: 0.8em; }
    </style>
</head>
<body>
    <h1>Data Received from Extension & Ollama Responses</h1>
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
                    const timestamp = new Date(entry.timestamp).toLocaleString();
                    let ollamaHtml = '';
                    if (entry.ollama_response) {
                        ollamaHtml = `
                            <div class="ollama-response">
                                <strong>Ollama Query:</strong> <pre>${entry.ollama_query}</pre>
                                <strong>Ollama Response:</strong> <pre>${entry.ollama_response}</pre>
                            </div>
                        `;
                    } else if (entry.ollama_error) {
                         ollamaHtml = `
                            <div class="ollama-response" style="border-left-color: red; background-color: #ffe6e6;">
                                <strong>Ollama Query:</strong> <pre>${entry.ollama_query}</pre>
                                <strong>Ollama Error:</strong> <pre>${entry.ollama_error}</pre>
                            </div>
                        `;
                    }

                    div.innerHTML = `
                        <p><strong>Key:</strong> ${entry.key}</p>
                        <p><strong>URL:</strong> <small>${entry.url}</small></p>
                        <p><strong>Timestamp:</strong> <small>${timestamp}</small></p>
                        <p><strong>Value:</strong></p>
                        <pre>${entry.value}</pre>
                        ${ollamaHtml}
                    `;
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
"""

# --- New Function to Query Ollama ---
def query_ollama(prompt):
    """Sends a query to the hosted Ollama model and returns the response."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL_NAME,
        "prompt": prompt,
        "stream": False # We want the full response at once
    }
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60) # Increased timeout
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        return data.get('response', 'No response field in Ollama output.')
    except requests.exceptions.Timeout:
        return f"Error: Ollama request timed out after 60 seconds."
    except requests.exceptions.ConnectionError:
        return f"Error: Could not connect to Ollama at {OLLAMA_BASE_URL}. Is it running?"
    except requests.exceptions.HTTPError as http_err:
        return f"HTTP Error from Ollama: {http_err} - {response.text}"
    except Exception as e:
        return f"An unexpected error occurred while querying Ollama: {e}"

@app.route('/')
def index():
    """Serves the HTML page to display received data."""
    return render_template_string(HTML_TEMPLATE)

@app.route('/receive_data', methods=['POST'])
def receive_data():
    """Receives JSON data from the browser extension, queries Ollama, and responds."""
    if request.is_json:
        data = request.get_json()
        if data and 'key' in data and 'value' in data:
            if 'timestamp' not in data:
                data['timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"

            # --- Query Ollama with a simple test query ---
            ollama_test_query = "Say hello in one word." # Simple query for testing
            ollama_response_text = query_ollama(ollama_test_query)

            # Add Ollama response/error to the data object
            data['ollama_query'] = ollama_test_query
            if ollama_response_text.startswith("Error:"):
                data['ollama_error'] = ollama_response_text
                print(f"Ollama Query Failed: {ollama_response_text}")
            else:
                data['ollama_response'] = ollama_response_text
                print(f"Ollama Query Success. Response: {ollama_response_text[:50]}...") # Truncate for console

            received_data.append(data) # Store the data with Ollama response/error

            print("Received data from extension:")
            print(f"  Key: {data.get('key')}")
            print(f"  Value: {data.get('value', 'N/A')[:100]}...")
            print(f"  URL: {data.get('url')}")
            print(f"  Timestamp: {data.get('timestamp')}")

            # Send back the full data object, including Ollama response, to the extension
            return jsonify(data), 200
        else:
            return jsonify({"error": "Invalid data format"}), 400
    return jsonify({"error": "Request must be JSON"}), 400

@app.route('/get_data', methods=['GET'])
def get_data():
    """Returns the stored data as JSON for the frontend."""
    return jsonify(received_data)

@app.route('/clear_data', methods=['POST'])
def clear_data():
    """Clears all stored data."""
    global received_data
    received_data = []
    print("All received data cleared.")
    return jsonify({"message": "Data cleared successfully"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)