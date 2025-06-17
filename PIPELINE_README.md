# Blog-to-Video Pipeline Implementation

A complete state machine-driven pipeline for converting blog posts into branded marketing videos using AI script generation, avatar video creation, and automatic composition.

## 🚀 Features

### Core Architecture
- **State Machine Design**: Robust state management with bidirectional navigation
- **Full Audit Trail**: Complete history tracking of all state transitions
- **Error Recovery**: Graceful error handling with restart capabilities
- **Session Persistence**: State survives browser refreshes and sessions

### AI Integration
- **Script Generation**: Ollama/DeepSeek-R1:7b integration with cyberpunk framing
- **Fallback System**: Template-based generation when AI is unavailable
- **Smart Prompting**: Optimized prompts for consistent, branded output

### Avatar Video Generation
- **Creatify API Integration**: Professional avatar video creation
- **Random Character Selection**: Automatic character and voice pairing
- **Polling System**: Robust job status monitoring with timeout handling
- **Error Recovery**: Graceful handling of API failures

### Video Composition
- **AutomaticVideoComposer**: Integration with existing branding system
- **Intro/Outro Addition**: Automatic branded intro and outro sequences
- **Overlay System**: Dynamic overlay application with timing intelligence
- **Brand Consistency**: Horizon City Stories branding throughout

## 📋 Pipeline States

```
BLOG_SELECTED → SCRIPT_GENERATING → SCRIPT_GENERATED → SCRIPT_APPROVED
    ↓                                                        ↓
AVATAR_GENERATING ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
    ↓
AVATAR_GENERATED → AUTO_COMPOSING → AUTO_COMPOSED → FINAL_APPROVED → READY_FOR_PUBLISHING
```

### Bidirectional Navigation
Users can go back to ANY previous state with automatic data cleanup:
- Going back to `SCRIPT_GENERATED` clears avatar and composition data
- Going back to `BLOG_SELECTED` resets the entire pipeline
- State history is preserved for audit purposes

## 🛠️ Setup Instructions

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env.local
```

Configure your API credentials:
```env
# Creatify API (required for avatar generation)
CREATIFY_API_ID=your_api_id
CREATIFY_API_KEY=your_api_key

# Ollama (optional, for AI script generation)
OLLAMA_URL=http://localhost:11434
```

### 2. Install Ollama (Optional)

For AI script generation:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull DeepSeek-R1:7b model
ollama pull deepseek-r1:7b

# Start Ollama service
ollama serve
```

### 3. Creatify API Setup

1. Sign up at [Creatify.ai](https://creatify.ai/)
2. Get your API credentials from the dashboard
3. Add them to your `.env.local` file

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/pipeline-demo` to test the pipeline.

## 🎯 Usage

### Starting a Pipeline

1. Navigate to `/pipeline-demo`
2. Click "Start Pipeline Demo"
3. Select a blog post from the available options
4. Click "Generate Script" to begin

### Pipeline Flow

1. **Blog Selection**: Choose from available blog posts
2. **Script Generation**: AI generates cyberpunk-themed script
3. **Script Review**: Edit, approve, or regenerate the script
4. **Avatar Generation**: Create avatar video with random character
5. **Auto Composition**: Add branding, intro, and outro
6. **Final Approval**: Review and approve the final video

### Navigation

- **Timeline**: Click on any completed step to go back
- **Restart**: Use restart buttons to return to specific states
- **Error Recovery**: Automatic error handling with restart options

## 🏗️ Architecture

### Core Components

#### State Machine (`PipelineStateMachine.ts`)
- Manages state transitions and validation
- Enforces transition rules via `VALID_TRANSITIONS` matrix
- Emits events for UI updates
- Handles bidirectional navigation

#### State Handlers
- **ScriptGeneratorStateHandler**: AI script generation with fallback
- **AvatarGeneratorStateHandler**: Creatify API integration
- **AutoCompositionStateHandler**: Video composition with branding

#### Storage Layer
- **PipelineStateStore**: localStorage-based persistence
- **StateHistoryManager**: Audit trail and history management

#### Orchestrator (`PipelineOrchestrator.ts`)
- Main coordinator tying all components together
- Handles error recovery and state persistence
- Provides unified API for pipeline operations

### UI Components

#### Main Interface (`PipelineUI.tsx`)
- State-driven UI that responds to machine changes
- Timeline visualization with clickable navigation
- Real-time progress updates

#### Stage Components
- **BlogSelector**: Blog post selection interface
- **ScriptGenerator**: Script editing and approval
- **AvatarGenerator**: Avatar video status and controls
- **VideoComposer**: Final composition review
- **FinalApproval**: Completion and download interface

## 🔧 API Routes

### Pipeline Management
- `POST /api/pipeline` - Create pipeline or execute actions
- `GET /api/pipeline?id=<id>` - Get pipeline status
- `DELETE /api/pipeline?id=<id>` - Delete pipeline

### Script Generation
- `POST /api/pipeline/generate-script` - Generate AI script
- `GET /api/pipeline/generate-script` - Check AI service status

### Pipeline Listing
- `GET /api/pipeline/list` - List all pipelines with filtering
- `POST /api/pipeline/list` - Bulk operations

## 📊 Management Interface

Visit `/pipeline-management` to:
- View all pipelines with status and progress
- Filter by state (active, completed, error)
- Search by blog title or author
- Delete completed pipelines
- Monitor system health

## 🧪 Testing

### Manual Testing
1. Start the development server
2. Navigate to `/pipeline-demo`
3. Complete a full pipeline flow
4. Test bidirectional navigation
5. Verify error handling

### API Testing
```bash
# Test script generation
curl -X POST http://localhost:3000/api/pipeline/generate-script \
  -H "Content-Type: application/json" \
  -d '{"blogContent": "Test blog content"}'

# Test pipeline creation
curl -X POST http://localhost:3000/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "payload": {"blog": {...}}}'
```

## 🔍 Troubleshooting

### Common Issues

#### Creatify API Errors
- Verify API credentials in `.env.local`
- Check API quota and billing status
- Monitor network connectivity

#### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Verify model is installed: `ollama list`
- Check URL configuration in environment

#### State Machine Issues
- Check browser console for state transition errors
- Verify localStorage is enabled
- Clear pipeline data if corrupted

### Debug Mode
Enable debug logging:
```env
DEBUG_PIPELINE=true
DEBUG_CREATIFY=true
DEBUG_OLLAMA=true
```

## 🚀 Production Deployment

### Environment Variables
Set production environment variables:
```env
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Performance Considerations
- Enable caching for API responses
- Implement rate limiting for API endpoints
- Monitor pipeline completion rates
- Set up error alerting

### Security
- Never expose API keys in client-side code
- Implement proper CORS policies
- Add authentication for management interface
- Regular security audits

## 📈 Monitoring

### Key Metrics
- Pipeline completion rate
- Average processing time per stage
- Error rates by component
- API usage and costs

### Health Checks
- Ollama service availability
- Creatify API status
- Storage system health
- Pipeline queue status

## 🤝 Contributing

1. Follow the established state machine patterns
2. Add comprehensive error handling
3. Include audit trail for all operations
4. Test bidirectional navigation thoroughly
5. Update documentation for new features

## 📚 Additional Resources

- [State Machine Design Patterns](./docs/state-machine-patterns.md)
- [Creatify API Documentation](https://docs.creatify.ai/)
- [Ollama Model Guide](https://ollama.ai/library)
- [AutomaticVideoComposer Integration](./docs/video-composition.md)
