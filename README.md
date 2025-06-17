# AutoMarket

A Next.js application for automated marketing asset management and video composition pipelines.

## Features

- **Asset Management**: Comprehensive media asset ingestion and categorization
- **Video Composition Pipeline**: Automated video creation with intro/outro/overlays
- **Media Ingestion**: Intelligent metadata extraction and asset tagging
- **Approval Workflow**: State-driven approval process for content pipeline

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

The application is built with:
- **Next.js 15** - React framework with app directory
- **TypeScript** - Type-safe development
- **Chakra UI** - Component library for UI
- **Asset Management System** - Media ingestion and categorization
- **Video Composition Pipeline** - Automated video creation workflow

## Key Components

- `AssetManager` - Central asset management and filtering
- `MediaIngestService` - Automated media ingestion and metadata extraction  
- `VideoComposer` - Video composition and rendering pipeline
- `CompositionEditor` - UI for creating video compositions

## Project Structure

```
src/
├── components/         # React components
├── lib/               # Utility libraries
├── media/             # Asset management system
├── pages/             # Next.js pages
└── types/             # TypeScript type definitions
```
