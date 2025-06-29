# Prizm Agents Overview

This document provides an overview of the various agents (referred to as "Providers") that are integrated into the Prizm platform. These agents are responsible for handling a wide range of media generation and processing tasks, from text and image generation to audio and video manipulation.

## Provider Architecture

The Prizm platform uses a provider-based architecture to orchestrate a variety of media services. The core of this system is the `ProviderRegistry`, which is responsible for initializing, registering, and managing all available providers.

Many of these providers are run as Docker containers and are managed by the `DockerComposeService`, which handles the lifecycle of each service (starting, stopping, health checks, etc.). This allows for a flexible and scalable system where new providers can be easily added and managed.

## AI Model Providers

These providers offer access to a wide range of AI models for various tasks, including text generation, image generation, and more.

*   **Hugging Face:** A high-priority provider for text-to-image generation, running as a local Docker container. It can also be used for other tasks like text generation and audio processing.
*   **Fal.ai:** A cloud-based provider that offers a variety of AI models for tasks like image and video generation.
*   **Together:** A cloud-based provider that offers a wide range of open-source AI models for text, image, and audio generation.
*   **Replicate:** A cloud-based platform for running machine learning models, with a focus on image and video generation.
*   **OpenRouter:** A service that provides access to a variety of large language models (LLMs) from different providers.
*   **OpenAI:** Provides access to OpenAI's powerful models, including GPT-4 for text generation and DALL-E for image generation.
*   **ElevenLabs:** A specialized provider for high-quality text-to-speech (TTS) and voice cloning.
*   **Anthropic:** Provides access to Anthropic's AI models, including the Claude family of LLMs.
*   **Ollama:** A local provider that allows you to run and manage large language models on your own machine.

## Local Docker Providers

These providers run as local Docker containers and are responsible for handling specific media processing tasks.

*   **FFMPEG:** A powerful tool for video and audio manipulation, including transcoding, filtering, and composition.
*   **Chatterbox:** A local provider for text-to-speech (TTS) and other audio-related tasks.
*   **Whisper:** A local provider for high-quality speech-to-text (STT) transcription.

## Agent Orchestration

The Prizm platform uses a sophisticated orchestration system to manage these providers and execute complex media generation jobs.

*   **ProviderRegistry:** The central registry for all providers. It is responsible for initializing and managing the lifecycle of each provider.
*   **DockerComposeService:** A generic service for managing Docker-based providers. It handles starting, stopping, and monitoring the health of each service.
*   **Job and Capability System:** The platform uses a job and capability system to match tasks with the appropriate providers. The `/api/v1/capabilities` endpoint lists the capabilities of each provider, and the `/api/v1/jobs` endpoint is used to create and manage media generation jobs.

By leveraging this agent-based architecture, the Prizm platform can provide a flexible, scalable, and powerful solution for all types of media generation and processing.
