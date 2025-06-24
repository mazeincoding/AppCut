<img src="apps/web/public/logo.png" align="left" width="130" height="130">

<div align="right">



# OpenCut (prev AppCut)
### A free, open-source video editor for web, desktop, and mobile.
</div>

## Why?

- **Privacy**: Your videos stay on your device
- **Free features**: Every basic feature of CapCut is paywalled now
- **Simple**: People want editors that are easy to use - CapCut proved that

## Features

- Timeline-based editing
- Multi-track support
- Real-time preview
- No watermarks or subscriptions

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

- [Bun](https://bun.sh/docs/installation)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/) (for `npm` alternative)

### Setup

1.  **Clone the repository**
    ```bash
    git clone <repo-url>
    cd OpenCut
    ```

2.  **Start backend services**
    From the project root, start the PostgreSQL and Redis services:
    ```bash
    docker-compose up -d
    ```

3.  **Set up environment variables**
    Navigate into the web app's directory and create a `.env` file from the example:
    ```bash
    cd apps/web
    cp .env.example .env
    ```
    *The default values in the `.env` file should work for local development.*

4.  **Install dependencies**
    Install the project dependencies using `bun` (recommended) or `npm`.
    ```bash
    # With bun
    bun install

    # Or with npm
    npm install
    ```

5.  **Run database migrations**
    Apply the database schema to your local database:
    ```bash
    # With bun
    bun run db:push:local

    # Or with npm
    npm run db:push:local
    ```

6.  **Start the development server**
    ```bash
    # With bun
    bun run dev

    # Or with npm
    npm run dev
    ```

The application will be available at [http://localhost:3000](http://localhost:3000).

=======


## Contributing

Visit [CONTRIBUTING.md](.github/CONTRIBUTING.md)
=======
We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for detailed setup instructions and development guidelines.

Quick start for contributors:

- Fork the repo and clone locally
- Follow the setup instructions in CONTRIBUTING.md
- Create a feature branch and submit a PR

## License

[MIT LICENSE](LICENSE)
