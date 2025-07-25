# Docker Compose Documentation: `docker-compose.yaml`

This document describes the `docker-compose.yaml` file, which defines and configures the multi-container Docker application for OpenCut. It orchestrates the services required for the application to run, including the database, Redis, a serverless Redis HTTP proxy, and the main web application.

## Overview

`docker-compose.yaml` is used to define and run multi-container Docker applications. With a single command, you can spin up all the services needed for OpenCut, making development and deployment easier and more consistent.

## Services Defined

### `db` (PostgreSQL Database)

This service sets up a PostgreSQL database instance.

*   **Image:** `postgres:17` (uses PostgreSQL version 17).
*   **Restart Policy:** `unless-stopped` (restarts automatically unless explicitly stopped).
*   **Environment Variables:**
    *   `POSTGRES_USER`: `opencut`
    *   `POSTGRES_PASSWORD`: `opencutthegoat` (Note: This is a default password and should be changed for production environments).
    *   `POSTGRES_DB`: `opencut`
*   **Volumes:** `postgres_data:/var/lib/postgresql/data` (persists database data to a named volume).
*   **Ports:** `5432:5432` (maps container port 5432 to host port 5432).
*   **Healthcheck:** Ensures the database is ready by checking `pg_isready`.

### `redis` (Redis Cache/Message Broker)

This service sets up a Redis instance, typically used for caching or as a message broker.

*   **Image:** `redis:7-alpine` (uses a lightweight Alpine-based Redis version 7).
*   **Restart Policy:** `unless-stopped`.
*   **Ports:** `6379:6379`.
*   **Healthcheck:** Checks if Redis is responsive using `redis-cli ping`.

### `serverless-redis-http` (Redis HTTP Proxy)

This service acts as an HTTP proxy for Redis, allowing HTTP requests to interact with the Redis instance. This is particularly useful for environments where direct Redis connections are not preferred or possible (e.g., serverless functions).

*   **Image:** `hiett/serverless-redis-http:latest`.
*   **Ports:** `8079:80` (maps container port 80 to host port 8079).
*   **Environment Variables:**
    *   `SRH_MODE`: `env`
    *   `SRH_TOKEN`: `example_token` (Note: This is an example token and should be secured for production).
    *   `SRH_CONNECTION_STRING`: `redis://redis:6379` (connects to the `redis` service within the Docker network).
*   **Dependencies:** `redis` (ensures Redis is healthy before starting).
*   **Healthcheck:** Verifies the HTTP endpoint is reachable.

### `web` (OpenCut Web Application)

This service builds and runs the main OpenCut web application.

*   **Build Context:** `.` (builds from the current directory).
*   **Dockerfile:** `./apps/web/Dockerfile` (specifies the Dockerfile to use for building the image).
*   **Restart Policy:** `unless-stopped`.
*   **Ports:** `3100:3000` (maps container port 3000, where the Next.js app runs, to host port 3100).
*   **Environment Variables:**
    *   `NODE_ENV`: `production`
    *   `DATABASE_URL`: Connection string for the PostgreSQL database.
    *   `BETTER_AUTH_URL`: URL for authentication callbacks.
    *   `BETTER_AUTH_SECRET`: Secret key for authentication (placeholder).
    *   `UPSTASH_REDIS_REST_URL`: URL for the Redis HTTP proxy.
    *   `UPSTASH_REDIS_REST_TOKEN`: Token for the Redis HTTP proxy.
    *   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials (loaded from host environment).
*   **Dependencies:** `db` and `serverless-redis-http` (ensures these services are healthy before starting the web app).
*   **Healthcheck:** Checks if the web application's health endpoint is reachable.

## Volumes

### `postgres_data`

A named volume used to persist the data of the PostgreSQL database, ensuring that data is not lost when the `db` container is stopped or removed.

## Networks

### `opencut-network`

A custom network named `opencut-network` is created, allowing all services to communicate with each other using their service names (e.g., `db`, `redis`, `serverless-redis-http`).

## Purpose

This `docker-compose.yaml` file provides a convenient way to set up a complete development or production environment for OpenCut with all its dependencies. It ensures that all services are properly configured, linked, and can communicate with each other, simplifying the deployment and management of the application.