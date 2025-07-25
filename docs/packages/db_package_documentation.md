# Database Package Documentation: `packages/db/src/`

This document provides an overview of the database-related files within the `packages/db/src/` directory. This package encapsulates the database schema and interaction logic for the OpenCut application, primarily using Drizzle ORM.

## Individual Files and Their Functionality

### `index.ts`

This file serves as the main entry point for the database package. It is responsible for:
*   Configuring and exporting the Drizzle ORM instances.
*   Establishing database connections (e.g., using `postgres.js`).
*   Loading the database schema for use in queries and migrations.

### `schema.ts`

This file defines the entire database schema using Drizzle ORM's declarative API. It includes:
*   Table definitions (e.g., `users`, `sessions`, `projects`, `mediaItems`, `waitlist`).
*   Column definitions for each table, including data types, constraints (e.g., `primaryKey`, `unique`, `notNull`), and default values.
*   Relationships between tables (e.g., foreign keys).
