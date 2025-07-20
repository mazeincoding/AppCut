<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="apps/web/public/logo.png" alt="OpenCut Logo" width="100" />
    </td>
    <td align="right">
      <h1>OpenCut <span style="font-size: 0.7em; font-weight: normal;">(prev AppCut)</span></h1>
      <h3 style="margin-top: -10px;">A free, open-source video editor for web, desktop, and mobile.</h3>
      <h4 style="margin-top: -5px; color: #3b82f6;">🧠 Now with Revolutionary AI-Powered Features!</h4>
    </td>
  </tr>
</table>

## 🚀 Revolutionary AI Features

OpenCut now includes the most advanced AI-powered video editing capabilities ever built for the web:

### 🧠 AI Content Analyzer
- **Scene Detection**: Automatically identifies different scenes, lighting conditions, and compositions
- **Face Recognition**: Detects and tracks faces throughout your video
- **Audio Analysis**: Identifies speech segments, music, and optimal cut points
- **Color Grading Suggestions**: AI-powered recommendations for color correction and creative grading
- **Highlight Detection**: Automatically finds the most engaging moments in your footage

### ⚡ Smart Auto-Cut System
- **Intelligent Audio Analysis**: Detects silence gaps, speech patterns, and audio peaks
- **Automatic Cut Suggestions**: Recommends optimal cut points based on content analysis
- **Timeline Integration**: One-click application of smart cuts directly to your timeline
- **Time Estimation**: Shows how much time you'll save with each suggestion

### 🎨 Real-Time AI Video Analysis
- **Live Frame Analysis**: Analyze video content in real-time as you scrub through the timeline
- **Visual Overlays**: See AI suggestions and detections overlaid on your preview
- **Performance Metrics**: Live FPS, analysis time, and optimization suggestions
- **Content-Aware Editing**: AI understands what's in each frame for smarter editing decisions

### 🔮 Neural Video Enhancement
- **AI Upscaling**: Real-time neural upscaling up to 4x using WebGL shaders
- **Noise Reduction**: Advanced AI-powered denoising while preserving detail
- **Smart Sharpening**: Content-aware sharpening that enhances detail without artifacts
- **Quality Metrics**: Real-time quality analysis and improvement suggestions

### 🎵 Magic AI Timeline
- **Beat Detection**: Automatically sync cuts to music beats
- **Content-Aware Arrangement**: Intelligently reorder clips for optimal visual flow
- **Pacing Optimization**: Analyze and improve edit pacing automatically
- **Transition Suggestions**: AI recommends the best transitions between clips
- **Arrangement Scoring**: Get a quality score for your timeline arrangement

### 🤖 AI Workflow Automation
- **Pattern Learning**: AI learns from your editing patterns and suggests automations
- **Macro Generation**: Automatically create macros from repetitive tasks
- **Workflow Optimization**: Get personalized suggestions to improve your editing efficiency
- **Action Prediction**: AI predicts your next editing action based on context

### 🎯 AI Project Assistant
- **Contextual Help**: Get intelligent help based on your current editing action
- **Project Health Monitoring**: Real-time analysis of your project's technical and creative quality
- **Skill Level Adaptation**: AI adapts suggestions based on your experience level
- **Learning Goals**: Personalized learning paths to improve your editing skills
- **Platform Optimization**: Tailored suggestions for YouTube, TikTok, Instagram, and more

## Why?

- **Privacy**: Your videos stay on your device
- **Free features**: Every basic feature of CapCut is paywalled now
- **Simple**: People want editors that are easy to use - CapCut proved that

## Features

### Core Editing Features
- Timeline-based editing with multi-track support
- Real-time preview with live effects
- No watermarks or subscriptions
- Privacy-focused (videos stay on your device)

### 🧠 AI-Powered Features
- **Smart Auto-Cut**: Intelligent audio-based cutting with one-click application
- **AI Content Analysis**: Real-time scene, face, and audio analysis
- **Neural Video Enhancement**: AI upscaling, denoising, and quality improvement
- **Magic Timeline**: Beat detection and intelligent clip arrangement
- **Workflow Automation**: Learn from editing patterns and automate repetitive tasks
- **AI Project Assistant**: Contextual help and project optimization suggestions
- **Real-Time Analysis**: Live video analysis with visual overlays and performance metrics

### Analytics
- Analytics provided by [Databuddy](https://www.databuddy.cc?utm_source=opencut), 100% Anonymized & Non-invasive.

## Project Structure

- `apps/web/` – Main Next.js web application
- `src/components/` – UI and editor components
- `src/hooks/` – Custom React hooks
- `src/lib/` – Utility and API logic
- `src/stores/` – State management (Zustand, etc.)
- `src/types/` – TypeScript types

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Bun](https://bun.sh/docs/installation)
  (for `npm` alternative)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

> **Note:** Docker is optional, but it's essential for running the local database and Redis services. If you're planning to run the frontend or want to contribute to frontend features, you can skip the Docker setup. If you have followed the steps below in [Setup](#setup), you're all set to go!

### Setup

1. Fork the repository
2. Clone your fork locally
3. Navigate to the web app directory: `cd apps/web`
4. Copy `.env.example` to `.env.local`:

   ```bash
   # Unix/Linux/Mac
   cp .env.example .env.local

   # Windows Command Prompt
   copy .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

5. Install dependencies: `bun install`
6. Start the development server: `bun dev`

## Development Setup

### Local Development

1. Start the database and Redis services:

   ```bash
   # From project root
   docker-compose up -d
   ```

2. Navigate to the web app directory:

   ```bash
   cd apps/web
   ```

3. Copy `.env.example` to `.env.local`:

   ```bash
   # Unix/Linux/Mac
   cp .env.example .env.local

   # Windows Command Prompt
   copy .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

4. Configure required environment variables in `.env.local`:

   **Required Variables:**

   ```bash
   # Database (matches docker-compose.yaml)
   DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

   # Generate a secure secret for Better Auth
   BETTER_AUTH_SECRET="your-generated-secret-here"
   BETTER_AUTH_URL="http://localhost:3000"

   # Redis (matches docker-compose.yaml)
   UPSTASH_REDIS_REST_URL="http://localhost:8079"
   UPSTASH_REDIS_REST_TOKEN="example_token"

   # Development
   NODE_ENV="development"
   ```

   **Generate BETTER_AUTH_SECRET:**

   ```bash
   # Unix/Linux/Mac
   openssl rand -base64 32

   # Windows PowerShell (simple method)
   [System.Web.Security.Membership]::GeneratePassword(32, 0)

   # Cross-platform (using Node.js)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   # Or use an online generator: https://generate-secret.vercel.app/32
   ```

5. Run database migrations: `bun run db:migrate` from (inside apps/web)
6. Start the development server: `bun run dev` from (inside apps/web)

The application will be available at [http://localhost:3000](http://localhost:3000).

## Contributing

We welcome contributions! While we're actively developing and refactoring certain areas, there are plenty of opportunities to contribute effectively.

**🎯 Focus areas:** Timeline functionality, project management, performance, bug fixes, and UI improvements outside the preview panel.

**⚠️ Avoid for now:** Preview panel enhancements (fonts, stickers, effects) and export functionality - we're refactoring these with a new binary rendering approach.

See our [Contributing Guide](.github/CONTRIBUTING.md) for detailed setup instructions, development guidelines, and complete focus area guidance.

**Quick start for contributors:**

- Fork the repo and clone locally
- Follow the setup instructions in CONTRIBUTING.md
- Create a feature branch and submit a PR

## Sponsors

Thanks to [Vercel](https://vercel.com?utm_source=github-opencut&utm_campaign=oss) for their support of open-source software.

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOpenCut-app%2FOpenCut&project-name=opencut&repository-name=opencut)

## License

[MIT LICENSE](LICENSE)

---

![Star History Chart](https://api.star-history.com/svg?repos=opencut-app/opencut&type=Date)
