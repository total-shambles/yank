# Yank 🧙‍♂️ v2

### **Background**:
Modern day search engines are powerful tools that drive the way we obtain our information on a daily basis. But how do they deal with vague search queries? Search engines tend to make the leap for you and transform your query to the most likely search query and give you those results. It is a powerful tool and a great feature although, it can be misleading. 

Presenting *Yank*. This tool is a browser extension that activates when you perform a search. It *yanks* your search query, evaluates it, and transforms your search session. Real time scoring of your search query occurs with a fine tuned LM. Additionally, it can transform your query with context to provide optimized search results. 

*Yank* aims to puts control back into the user’s hands while keeping them well informed.

This version is built with a focus on chrome.

### 🚀 **Key Features**

*   **Automatic Data Extraction**: Extracts the search query value associated with the search session in local storage of search engine results pages (SERPs). 🔑
*   **Backend Integration**: Uses the extracted value and the original search query as context for the fine tuned LLM to generate a new, improved search query. 🤖
*   **Background Monitoring**: Runs in the background, monitoring tab updates and automatically triggering the extraction and query generation process on SERPs. 🕵️‍♂️
*   **User Feedback**: Provides visual feedback through the extension icon badge, indicating the status of the extraction and query generation process. ℹ️

### Demo

[![Yank Demo](https://youtu.be/CV8-LdcRF10)](https://youtu.be/CV8-LdcRF10)

[<img src="https://youtu.be/CV8-LdcRF10" width="600" height="300"
/>](https://youtu.be/CV8-LdcRF10)

### 🛠️ **Tech Stack**

*   **Chrome Extension:**
    *   JavaScript (ES6+)
    *   Chrome Extension API (`chrome.tabs`, `chrome.scripting`, `chrome.action`, `chrome.notifications`, `chrome.storage`)
*   **Backend (Node.js/Express):**
    *   Node.js
    *   Express.js
    *   body-parser
    *   cors
*   **Backend (Flask):**
    *   Python
    *   Flask
    *   flask_cors
*   **Backend (FastAPI):**
    *   Python
    *   FastAPI
    *   httpx
    *   pydantic
    *   json
*   **Frontend:**
    *   HTML
    *   JavaScript (for fetching data)

### 📦 **Getting Started / Setup Instructions**

### Prerequisites

*   **Chrome Browser:**  Make sure you have Google Chrome installed.
*   **Node.js and npm (Optional):** Required if you want to run the Node.js/Express backend.
*   **Python and pip (Optional):** Required if you want to run the Flask or FastAPI backend.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install backend dependencies (Choose one of the backend options):**

    *   **Node.js/Express:**

        ```bash
        cd yank\ BE/yank\ backend\ attempt/server
        npm install
        ```

    *   **Flask:**

        ```bash
        cd yank\ BE/yank\ backend\ attempt/flask\ server
        pip install Flask flask_cors requests
        ```
    *   **FastAPI:**
         ```bash
        cd yank\ BE/yank\ backend\ attempt/flask\ server
        pip install fastapi uvicorn httpx pydantic
        ```

3.  **Load the Chrome Extension:**

    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable "Developer mode" in the top right corner.
    *   Click "Load unpacked" and select the `extension_v1` directory (or the `yank BE/yank backend attempt` directory for the Ollama-integrated version).

### Running Locally

1.  **Start the backend server (Choose one of the backend options):**

    *   **Node.js/Express:**

        ```bash
        cd yank\ BE/yank\ backend\ attempt/server
        node server.js
        ```

    *   **Flask:**

        ```bash
        cd yank\ BE/yank\ backend\ attempt/flask\ server
        python server.py
        ```
    *   **FastAPI:**
         ```bash
        cd yank\ BE/yank\ backend\ attempt/flask\ server
        uvicorn app:app --reload
        ```

2.  **Configure the extension:**

    *   If using the Ollama-integrated version, ensure the `OLLAMA_BASE_URL` in `yank BE/yank backend attempt/background.js` matches the address where your Ollama server is running (default: `http://127.0.0.1:3000` or `http://localhost:11434`).
    *   If using a backend server, ensure the `BACKEND_URL` in the extension's background script matches the address where your backend server is running.

3.  **Test the extension:**

    *   Perform a search on a supported search engine (e.g., Google).
    *   Observe the extension icon badge for status updates.
    *   If using a backend server, check the server's console for received data and Ollama responses.
    *   If using a backend server with a web interface, navigate to `http://localhost:3000` (or the appropriate port) to view the data.

### 📂 **Project Structure**

```
├── extension_v1/             # Basic Extension (no Ollama)
│   ├── background.js       # Background service worker
│   ├── manifest.json         # Extension manifest file
│   └── popup.js              # Popup script
├── yank BE/yank backend attempt/ #Ollama Integrated Extension
│   ├── background.js       # Background service worker with Ollama integration
│   ├── manifest.json         # Extension manifest file
│   ├── server/               # Node.js/Express Backend (Optional)
│   │   ├── server.js         # Express server
│   │   └── ...
│   ├── flask server/         # Flask Backend (Optional)
│   │   ├── server.py         # Flask server
│   │   ├── app.py            # FastAPI server
│   │   └── ...
│   └── ...
├── README.md               # This file
└── ...
```

### 📸 **Screenshots**




What’s next? Enabling a hyper focused search session that makes a knowledge graph of your search session in order to better understand the core of the search queries. This would allow the tool to optimize the search queries in a laser focused manner targeted at the core of what is being looked for.


### 🤝 **Contributing**

Contributions are welcome! Please feel free to submit pull requests or open issues to suggest improvements or report bugs.

<!-- 📬 **Contact**

If you have any questions or suggestions, please feel free to contact me at [your_email@example.com](mailto:your_email@example.com).

💖 **Thanks Message**

Thank you for checking out this project! I hope it helps you enhance your search experiences. -->
