# OpenCut Mobile App

The OpenCut mobile app is built using Expo and React Native and attempts to replicate the functionality of the web app, including user authentication and media editing capabilities.

## Project Structure
- `apps/mobile/` – Main Expo React Native mobile application
  - `src/components/` – UI and editor components
  - `src/hooks/` – Custom React hooks
  - `src/lib/` – Utility and API logic
  - `src/stores/` – State management (Zustand, etc.)

## Getting Started

### Prerequisites
Before you begin, ensure you have the following installed on your system:
- [Bun](https://bun.sh/docs/installation)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/) (for `npm` alternative)

### Setup
1. **Clone the repository**
    ```bash
    git clone <repo-url>
    cd OpenCut
    ```
2. **Start backend services**
    From the project root, start the PostgreSQL and Redis services:
    ```bash
    docker-compose up -d
    ```
3. **Set up environment variables**
    Navigate into the mobile app's directory and create a `.env` file from the example:
    ```bash
    cd apps/mobile
    # Unix/Linux/Mac
    cp .env.example .env.local
    # Windows Command Prompt
    copy .env.example .env.local
    # Windows PowerShell
    Copy-Item .env.example .env.local
    ```
    *The default values in the `.env` file should work for local development.*
4. **Install dependencies**
    Install the project dependencies using `bun` (recommended) or `npm`.
    ```bash
    # With bun
    bun install

    # Or with npm
    npm install
    ```
5. **Run the app**
    Start the Expo development server:
    ```bash
    bun run start
    ```

    This will open the Expo developer tools in your browser. You can run the app on an emulator or a physical device using the Expo Go app.

6. **Running on a physical device**
    - Install the [Expo Go app](https://expo.dev/client) on your iOS or Android device.
    - Scan the QR code displayed in the Expo developer tools to open the app on your device.

## Development
- The mobile app uses TypeScript for type safety.
- Components are built using React Native and styled with Nativewind.
- State management is handled using Zustand.
