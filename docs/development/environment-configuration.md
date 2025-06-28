# 🔧 Environment Configuration Guide

AutoMarket relies on environment variables for configuring API keys, service URLs, and other critical settings. This guide details the essential environment variables and how to set them up for development and deployment.

## `.env.example` and `.env.local`

The project includes an `.env.example` file, which serves as a template for all required and optional environment variables. For local development, you should create a `.env.local` file in the project root and populate it with your specific configurations.

```bash
cp .env.example .env.local
```

**Never commit your `.env.local` file to version control**, as it contains sensitive information like API keys. The `.gitignore` file is already configured to ignore `.env.local`.

## Core Environment Variables

### API Provider Keys

These variables are used to authenticate with various remote AI providers. You will need to obtain these API keys from the respective provider's website.

*   **`FALAI_API_KEY`**: Your API key for FAL.ai.
    ```bash
    FALAI_API_KEY=your_fal_ai_key
    ```
*   **`REPLICATE_API_TOKEN`**: Your API token for Replicate.
    ```bash
    REPLICATE_API_TOKEN=your_replicate_token
    ```
*   **`TOGETHER_API_KEY`**: Your API key for Together.ai.
    ```bash
    TOGETHER_API_KEY=your_together_key
    ```
*   **`OPENROUTER_API_KEY`**: Your API key for OpenRouter.
    ```bash
    OPENROUTER_API_KEY=your_openrouter_key
    ```
*   **`OPENAI_API_KEY`**: Your API key for OpenAI.
    ```bash
    OPENAI_API_KEY=your_openai_key
    ```
*   **`ANTHROPIC_API_KEY`**: Your API key for Anthropic.
    ```bash
    ANTHROPIC_API_KEY=your_anthropic_key
    ```
*   **`GOOGLE_API_KEY`**: Your API key for Google Gemini (if used directly).
    ```bash
    GOOGLE_API_KEY=your_google_key
    ```
*   **`XAI_API_KEY`**: Your API key for xAI.
    ```bash
    XAI_API_KEY=your_xai_key
    ```
*   **`MISTRAL_API_KEY`**: Your API key for Mistral AI.
    ```bash
    MISTRAL_API_KEY=your_mistral_key
    ```
*   **`AZURE_OPENAI_API_KEY`**: Your API key for Azure OpenAI.
    ```bash
    AZURE_OPENAI_API_KEY=your_azure_openai_key
    ```
*   **`AZURE_OPENAI_ENDPOINT`**: Your Azure OpenAI endpoint URL.
    ```bash
    AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
    ```
*   **`ELEVENLABS_API_KEY`**: Your API key for ElevenLabs.
    ```bash
    ELEVENLABS_API_KEY=your_elevenlabs_key
    ```
*   **`CREATIFY_API_KEY`**: Your API key for Creatify.
    ```bash
    CREATIFY_API_KEY=your_creatify_key
    ```

### Docker Service URLs

These variables define the endpoints for local Docker-based services. Ensure these match the ports exposed by your Docker containers.

*   **`FFMPEG_SERVICE_URL`**: URL for the local FFMPEG Docker service.
    ```bash
    FFMPEG_SERVICE_URL=http://localhost:8006
    ```
*   **`CHATTERBOX_DOCKER_URL`**: URL for the local Chatterbox TTS Docker service.
    ```bash
    CHATTERBOX_DOCKER_URL=http://localhost:8004
    ```
*   **`WHISPER_SERVICE_URL`**: URL for the local Whisper STT Docker service.
    ```bash
    WHISPER_SERVICE_URL=http://localhost:9000
    ```
*   **`HUGGINGFACE_SERVICE_URL`**: URL for the local HuggingFace Docker service (e.g., for text-to-image).
    ```bash
    HUGGINGFACE_SERVICE_URL=http://localhost:8007
    ```
*   **`KOKORO_SERVICE_URL`**: URL for the local Kokoro Docker service.
    ```bash
    KOKORO_SERVICE_URL=http://localhost:8005
    ```
*   **`OLLAMA_SERVICE_URL`**: URL for the local Ollama Docker service.
    ```bash
    OLLAMA_SERVICE_URL=http://localhost:11434
    ```
*   **`ZONOS_SERVICE_URL`**: URL for the local Zonos Docker service.
    ```bash
    ZONOS_SERVICE_URL=http://localhost:8009
    ```

### Other Configuration

*   **`NODE_ENV`**: Node.js environment (e.g., `development`, `production`, `test`).
    ```bash
    NODE_ENV=development
    ```
*   **`NEXT_PUBLIC_APP_URL`**: Public URL of the Next.js application.
    ```bash
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

## Setting Environment Variables

### Local Development

As mentioned, create a `.env.local` file in the project root and add your variables there. Next.js automatically loads environment variables from `.env.local`.

### Production Deployment

For production environments, the method of setting environment variables depends on your hosting provider (e.g., Vercel, Netlify, AWS, Docker). Generally, you will configure these variables directly in your deployment platform's settings.

### Accessing Variables in Code

*   **Server-side (Node.js):** Use `process.env.YOUR_VARIABLE_NAME`.
*   **Client-side (Next.js):** For variables exposed to the browser, they must be prefixed with `NEXT_PUBLIC_`. For example, `NEXT_PUBLIC_APP_URL` can be accessed as `process.env.NEXT_PUBLIC_APP_URL` in both server and client-side code.

By properly configuring these environment variables, you ensure that Prizm can connect to all necessary AI providers and local services, enabling its full range of media processing capabilities.