# Contributing to OpenCut

Thank you for your interest in contributing to OpenCut! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Navigate to the web app directory: `cd apps/web`
4. Install dependencies: `bun install`
5. Start the development server: `bun run dev`

> **Note:** If you see an error like `Unsupported URL Type "workspace:*"` when running `npm install`, you have two options:
>
> 1. Upgrade to a recent npm version (v9 or later), which has full workspace protocol support.
> 2. Use an alternative package manager such as **bun** or **pnpm**.

## Development Setup

### Prerequisites

- Node.js 18+
- Bun (latest version)
- Docker (for local database)

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

   **Optional Variables (for Google OAuth):**

   ```bash
   # Only needed if you want to test Google login
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

5. Run database migrations: `bun run db:migrate`
6. Start the development server: `bun run dev`

## How to Contribute

### Reporting Bugs

- Use the bug report template
- Include steps to reproduce
- Provide screenshots if applicable

### Suggesting Features

- Use the feature request template
- Explain the use case
- Consider implementation details

### Code Contributions

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Navigate to the web app directory: `cd apps/web`
4. Run the linter: `bun run lint`
5. Format your code: `bunx biome format --write .`
6. Commit your changes with a descriptive message
7. Push to your fork and create a pull request

## Code Style

- We use Biome for code formatting and linting
- Run `bunx biome format --write .` from the `apps/web` directory to format code
- Run `bun run lint` from the `apps/web` directory to check for linting issues
- Follow the existing code patterns

## Testing Guidelines

### Current Testing Status

**Note: Testing framework is currently being set up.** We're in the process of implementing comprehensive testing for OpenCut.

### Recommended Testing Stack

For new contributors and future testing implementation, we recommend:

```mermaid
graph TD
    A[Testing Stack] --> B[Unit & Integration Testing]
    A --> C[End-to-End Testing]
    A --> D[Visual Testing]

    B --> E[Vitest - Fast unit test runner]
    B --> F[@testing-library/react - Component testing]
    B --> G[@testing-library/jest-dom - DOM matchers]

    C --> H[Playwright - Cross-browser E2E testing]

    D --> I[Storybook - Component development]

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

**Unit & Integration Testing:**
- **Vitest** - Fast unit test runner with excellent TypeScript support
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM testing

**End-to-End Testing:**
- **Playwright** - Cross-browser E2E testing for video editor workflows

**Visual Testing:**
- **Storybook** - Component development and visual testing

### Setting Up Testing (For Contributors)

If you want to contribute tests, here's how to set up the testing environment:

1. **Install testing dependencies:**

   ```bash
   cd apps/web
   bun add -d vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
   ```

2. **Create test configuration files:**

   Create `vitest.config.ts` in `apps/web/`:
   ```typescript
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   import path from 'path'

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       setupFiles: ['./src/test/setup.ts'],
       globals: true,
       css: true,
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   })
   ```

3. **Add test scripts to package.json:**
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

### Testing Conventions

**File Structure:**

```mermaid
graph TD
    A[src/] --> B[components/]
    A --> C[hooks/]
    A --> D[test/]

    B --> E[ui/]
    B --> F[editor/]

    E --> G[button.tsx]
    E --> H[button.test.tsx]

    F --> I[timeline.tsx]
    F --> J[timeline.test.tsx]

    C --> K[use-video-editor.ts]
    C --> L[use-video-editor.test.ts]

    D --> M[setup.ts]
    D --> N[utils.tsx]
    D --> O[mocks/]

    style A fill:#e3f2fd
    style D fill:#f1f8e9
    style H fill:#fff3e0
    style J fill:#fff3e0
    style L fill:#fff3e0
```

**Naming Conventions:**
- Unit tests: `component.test.tsx` or `hook.test.ts`
- Integration tests: `feature.integration.test.tsx`
- E2E tests: `workflow.e2e.test.ts`

### What to Test

**Priority Testing Areas:**

```mermaid
graph LR
    A[Testing Priorities] --> B[Core Video Editor]
    A --> C[UI Components]
    A --> D[Custom Hooks]
    A --> E[Utility Functions]

    B --> B1[Timeline manipulation]
    B --> B2[Track management]
    B --> B3[Export functionality]
    B --> B4[File upload/import]

    C --> C1[Button interactions]
    C --> C2[Modal dialogs]
    C --> C3[Form validations]
    C --> C4[Drag and drop]

    D --> D1[Video processing hooks]
    D --> D2[State management hooks]
    D --> D3[File handling hooks]

    E --> E1[Video format conversions]
    E --> E2[Time calculations]
    E --> E3[File size validations]

    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#f3e5f5
    style D fill:#fff3e0
    style E fill:#fce4ec
```

1. **Core Video Editor Functions:**
   - Timeline manipulation
   - Video/audio track management
   - Export functionality
   - File upload/import

2. **UI Components:**
   - Button interactions
   - Modal dialogs
   - Form validations
   - Drag and drop functionality

3. **Custom Hooks:**
   - Video processing hooks
   - State management hooks
   - File handling hooks

4. **Utility Functions:**
   - Video format conversions
   - Time calculations
   - File size validations

**Example Test Structure:**

```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test button.test.tsx

# Run tests for specific component
bun test --grep "Button Component"
```

### Testing Video Editor Specific Features

**Mock FFmpeg Operations:**
```typescript
// test/mocks/ffmpeg.ts
export const mockFFmpeg = {
  load: vi.fn(),
  writeFile: vi.fn(),
  exec: vi.fn(),
  readFile: vi.fn(),
}
```

**Test Video File Handling:**
```typescript
// Use File API mocks for video uploads
const mockVideoFile = new File(['video content'], 'test.mp4', {
  type: 'video/mp4'
})
```

### Continuous Integration

Tests will be automatically run on:
- Pull requests to `main` branch
- Pushes to `main` branch
- All supported platforms (Ubuntu, Windows, macOS)

**CI Requirements:**
- All tests must pass
- Code coverage should not decrease
- No console errors during test runs

### Contributing Tests

When contributing code, please:

1. **Write tests for new features**
2. **Update tests for modified functionality**
3. **Ensure tests pass locally before submitting PR**
4. **Include test descriptions in your PR**

**Test Quality Guidelines:**
- Tests should be readable and well-documented
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies appropriately
- Keep tests focused and isolated

## Pull Request Process

1. Fill out the pull request template completely
2. Link any related issues
3. Ensure CI passes
4. Request review from maintainers
5. Address any feedback

## Community

- Be respectful and inclusive
- Follow our Code of Conduct
- Help others in discussions and issues

Thank you for contributing!
