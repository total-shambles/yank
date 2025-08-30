const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Request timeout configuration
const TIMEOUT_MS = 60000; // 60 seconds

// Helper function to create axios instance with timeout
const createAxiosInstance = () => {
    return axios.create({
        timeout: TIMEOUT_MS,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

// Streaming function for generated text
async function* streamGeneratedText(prompt, model) {
    const axiosInstance = createAxiosInstance();
    
    try {
        const response = await axiosInstance.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: true
        }, {
            responseType: 'stream'
        });

        if (response.status !== 200) {
            throw new Error(`Failed to connect to the model server. Status: ${response.status}`);
        }

        return new Promise((resolve, reject) => {
            let buffer = '';
            
            response.data.on('data', (chunk) => {
                buffer += chunk.toString('utf-8');
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.response) {
                                resolve(data.response);
                            }
                        } catch (jsonError) {
                            // Skip invalid JSON
                            continue;
                        }
                    }
                }
            });

            response.data.on('end', () => {
                // Process any remaining data in buffer
                if (buffer.trim()) {
                    try {
                        const data = JSON.parse(buffer);
                        if (data.response) {
                            resolve(data.response);
                        }
                    } catch (jsonError) {
                        // Skip invalid JSON
                    }
                }
                resolve('');
            });

            response.data.on('error', (error) => {
                reject(new Error(`Error communicating with the server: ${error.message}`));
            });
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - server took too long to respond');
        }
        throw new Error(`Error communicating with the server: ${error.message}`);
    }
}

// Helper function for non-streaming response
async function getGeneratedText(prompt, model) {
    const axiosInstance = createAxiosInstance();
    
    try {
        const response = await axiosInstance.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: false
        });

        if (response.status !== 200) {
            throw new Error(`Failed to connect to the model server. Status: ${response.status}`);
        }

        // Handle the response format from Ollama
        let combinedResponse = '';
        const responseText = response.data;
        
        if (typeof responseText === 'string') {
            // If response is a string with multiple JSON objects
            const lines = responseText.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            combinedResponse += data.response;
                        }
                    } catch (jsonError) {
                        // Skip invalid JSON
                        continue;
                    }
                }
            }
        } else if (responseText.response) {
            // If response is already a JSON object
            combinedResponse = responseText.response;
        }

        return { response: combinedResponse };

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - server took too long to respond');
        }
        throw new Error(`Error communicating with the server: ${error.message}`);
    }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate text endpoint - handles both streaming and non-streaming
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, model = 'llama3.2', stream = true } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (stream) {
            // Set headers for streaming response
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');
            
            try {
                const axiosInstance = createAxiosInstance();
                const response = await axiosInstance.post(`${OLLAMA_BASE_URL}/api/generate`, {
                    model: model,
                    prompt: prompt,
                    stream: true
                }, {
                    responseType: 'stream'
                });

                if (response.status !== 200) {
                    return res.status(response.status).json({ 
                        error: 'Failed to connect to the model server.' 
                    });
                }

                let buffer = '';
                
                response.data.on('data', (chunk) => {
                    buffer += chunk.toString('utf-8');
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                if (data.response) {
                                    res.write(data.response);
                                }
                            } catch (jsonError) {
                                // Skip invalid JSON
                                continue;
                            }
                        }
                    }
                });

                response.data.on('end', () => {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        try {
                            const data = JSON.parse(buffer);
                            if (data.response) {
                                res.write(data.response);
                            }
                        } catch (jsonError) {
                            // Skip invalid JSON
                        }
                    }
                    res.end();
                });

                response.data.on('error', (error) => {
                    console.error('Stream error:', error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: `Stream error: ${error.message}` });
                    } else {
                        res.end();
                    }
                });

            } catch (error) {
                console.error('Streaming error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: `Error communicating with the server: ${error.message}` });
                }
            }
        } else {
            // Non-streaming response
            try {
                const result = await getGeneratedText(prompt, model);
                res.json(result);
            } catch (error) {
                console.error('Non-streaming error:', error);
                res.status(500).json({ error: error.message });
            }
        }

    } catch (error) {
        console.error('Request processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download model endpoint
app.post('/api/models/download', async (req, res) => {
    try {
        const { llm_name } = req.body;

        if (!llm_name) {
            return res.status(400).json({ error: 'llm_name is required' });
        }

        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.post(`${OLLAMA_BASE_URL}/api/pull`, {
            name: llm_name
        });

        if (response.status !== 200) {
            throw new Error(`Failed to download model. Status: ${response.status}`);
        }

        res.json({ message: `Model ${llm_name} downloaded successfully` });

    } catch (error) {
        console.error('Model download error:', error);
        if (error.code === 'ECONNABORTED') {
            res.status(500).json({ error: 'Request timeout - model download took too long' });
        } else {
            res.status(500).json({ error: `Error downloading model: ${error.message}` });
        }
    }
});

// List models endpoint
app.get('/api/models', async (req, res) => {
    try {
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(`${OLLAMA_BASE_URL}/api/tags`);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch models. Status: ${response.status}`);
        }

        res.json({ models: response.data.models });

    } catch (error) {
        console.error('List models error:', error);
        if (error.code === 'ECONNABORTED') {
            res.status(500).json({ error: 'Request timeout - failed to fetch models' });
        } else {
            res.status(500).json({ error: `Error fetching models: ${error.message}` });
        }
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Ollama base URL: ${OLLAMA_BASE_URL}`);
    console.log(`Request timeout: ${TIMEOUT_MS}ms`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
