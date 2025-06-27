# Contributing to OpenCut

Thank you for your interest in contributing to OpenCut! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Navigate to the web app directory: `cd apps/web`
4. Install dependencies: `bun install`
5. Start the development server: `bun run dev`

## Development Setup

### Prerequisites

- Node.js 18+
- Bun (latest version)
- Docker (for local database)

### Local Development

1. Start the database and Redis services:

    ```bash
    # From project root
    bun run docker:dev

    # Or with npm
    npm run docker:dev
    ```

    > This uses `docker-compose.dev.yaml` to start only the required services for development.

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

    ```env
    # Database (matches docker-compose.dev.yaml)
    DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

    # Generate a secure secret for Better Auth
    BETTER_AUTH_SECRET="your-generated-secret-here"
    BETTER_AUTH_URL="http://localhost:3000"

    # Redis (matches docker-compose.dev.yaml)
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

    ```env
    # Only needed if you want to test Google login
    GOOGLE_CLIENT_ID="your-google-client-id"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    ```

5. Run database migrations:

    ```bash
    bun run db:migrate
    ```

6. Start the development server:

    ```bash
    bun run dev
    ```

### Stopping & Resetting Dev Containers

You can also stop or reset your dev environment using the following scripts:

```bash
bun run docker:dev:stop   # Stop containers without removing them
bun run docker:dev:down   # Stop and remove containers/networks
bun run docker:dev:reset  # Fully reset containers AND volumes (wipes DB!)

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
```
