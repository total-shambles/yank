# Yank Node.js Server

A Node.js Express server that acts as middleware between clients and the Ollama LLM instance. This server provides the same functionality as the original Python FastAPI server but implemented in JavaScript.

## Features

- **Text Generation**: Stream or non-stream text generation via Ollama
- **Model Management**: Download and list available Ollama models
- **CORS Support**: Cross-origin requests enabled
- **Error Handling**: Comprehensive error handling and timeout management
- **Health Check**: Built-in health check endpoint

## Prerequisites

- Node.js (v14.0.0 or higher)
- npm or yarn package manager
- Ollama running locally (default: `http://localhost:11434`)

## Installation

1. Navigate to the server directory:
```bash
cd "yank BE/yank backend attempt/nodejs_server"
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The server can be configured using environment variables:

- `PORT`: Server port (default: 3000)
- `OLLAMA_BASE_URL`: Ollama instance URL (default: http://localhost:11434)

Example:
```bash
export PORT=3001
export OLLAMA_BASE_URL=http://localhost:11434
```

## Usage

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://0.0.0.0:3000` by default.

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status and timestamp

### Generate Text
- **POST** `/api/generate`
- Generate text using Ollama models

**Request Body:**
```json
{
  "prompt": "Your prompt here",
  "model": "llama3.2",
  "stream": true
}
```

**Parameters:**
- `prompt` (required): The text prompt for generation
- `model` (optional): Model name (default: "llama3.2")
- `stream` (optional): Enable streaming response (default: true)

### Download Model
- **POST** `/api/models/download`
- Download a model to Ollama

**Request Body:**
```json
{
  "llm_name": "llama3.2"
}
```

### List Models
- **GET** `/api/models`
- Get list of available models

**Response:**
```json
{
  "models": [...]
}
```

## Examples

### Generate Text (Non-streaming)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what AI is",
    "model": "llama3.2",
    "stream": false
  }'
```

### Generate Text (Streaming)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Tell me a story",
    "model": "llama3.2",
    "stream": true
  }'
```

### Download Model
```bash
curl -X POST http://localhost:3000/api/models/download \
  -H "Content-Type: application/json" \
  -d '{
    "llm_name": "llama3.2"
  }'
```

### List Models
```bash
curl http://localhost:3000/api/models
```

## Error Handling

The server includes comprehensive error handling:

- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: Ollama communication errors, timeouts, or server errors
- **404 Not Found**: Invalid endpoints

## Timeout Configuration

- Default request timeout: 60 seconds
- Configurable via the `TIMEOUT_MS` constant in `server.js`

## Differences from Python Version

1. **Streaming Implementation**: Uses Node.js streams instead of Python async generators
2. **HTTP Client**: Uses Axios instead of httpx
3. **Error Handling**: Express.js error middleware instead of FastAPI HTTPException
4. **Environment**: Node.js runtime instead of Python/uvicorn

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure Ollama is running on the correct port
2. **Timeout Errors**: Increase timeout or check Ollama performance
3. **CORS Issues**: The server has CORS enabled by default

### Logs

The server logs important events to console:
- Server startup information
- Error messages with details
- Request processing status

### Debugging

For development debugging, use:
```bash
NODE_ENV=development npm run dev
```

## Development

### File Structure
```
nodejs_server/
├── package.json          # Dependencies and scripts
├── server.js             # Main server implementation
└── README.md            # This file
```

### Adding New Endpoints

To add new endpoints, follow the existing pattern in `server.js`:

1. Define the route handler
2. Add error handling
3. Use the axios instance for Ollama communication
4. Return appropriate JSON responses

## License

ISC License
