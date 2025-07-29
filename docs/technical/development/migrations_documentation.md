# Migrations Documentation: `apps/web/migrations/`

This document provides an overview of the database migration files located in the `apps/web/migrations/` directory. These files are used to manage changes to the application's database schema over time, ensuring data consistency and compatibility across different versions.

## Migration System Architecture

This diagram shows how database migrations are managed and applied in OpenCut:

```mermaid
graph TD
    A[Database Schema Changes] --> B[Drizzle Kit]
    B --> C[Generate Migration Files]
    C --> D[Sequential Migrations]
    
    D --> E[0000_hot_the_fallen.sql]
    D --> F[0001_tricky_jackpot.sql]
    D --> G[Future Migrations...]
    
    H[Development Database] --> I[Migration Runner]
    J[Production Database] --> I
    K[Test Database] --> I
    
    I --> L[Check Migration Status]
    L --> M[Apply Pending Migrations]
    M --> N[Update Schema Version]
    
    O[Schema Definition] --> P[packages/db/src/schema.ts]
    P --> B
    
    Q[Migration Metadata] --> R[meta/ directory]
    R --> S[Applied Migrations Log]
    R --> T[Schema Checksums]
    
    style B fill:#e1f5fe
    style I fill:#e8f5e8
    style P fill:#fff3e0
    style R fill:#f3e5f5
```

## Migration Workflow

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant SCHEMA as Schema File
    participant DRIZZLE as Drizzle Kit
    participant DB as Database
    participant META as Migration Metadata
    
    DEV->>SCHEMA: Modify schema.ts
    DEV->>DRIZZLE: Run drizzle-kit generate
    DRIZZLE->>SCHEMA: Read schema changes
    DRIZZLE->>DRIZZLE: Compare with current DB state
    DRIZZLE->>DRIZZLE: Generate SQL migration
    DRIZZLE->>DEV: Create migration file
    
    DEV->>DRIZZLE: Run drizzle-kit migrate
    DRIZZLE->>DB: Connect to database
    DRIZZLE->>META: Check applied migrations
    DRIZZLE->>DB: Apply pending migrations
    DRIZZLE->>META: Update migration log
    DRIZZLE->>DEV: Migration complete
```

## Directories and Their Contents

### `meta/`

This directory typically contains metadata about the migrations, such as a record of applied migrations, checksums, or other internal information used by the migration tool (e.g., Drizzle Kit) to track the state of the database schema.

## Individual Files and Their Functionality

### `0000_hot_the_fallen.sql`

This SQL file represents the first database migration. It contains SQL statements to create the initial database schema, including tables, columns, constraints, and indexes, as defined at the very beginning of the project.

### `0001_tricky_jackpot.sql`

This SQL file represents a subsequent database migration. It contains SQL statements to modify the existing database schema, such as adding new tables, altering existing tables (e.g., adding columns, changing data types), or creating new indexes. The naming convention (e.g., `0001_`) indicates the order in which migrations should be applied.

## Migration Commands

Common Drizzle Kit commands for managing migrations:

```bash
# Generate a new migration based on schema changes
npx drizzle-kit generate

# Apply pending migrations to database
npx drizzle-kit migrate

# Check current migration status
npx drizzle-kit up

# Studio to inspect database (optional)
npx drizzle-kit studio
```

## File Relationships

```mermaid
graph LR
    A[packages/db/src/schema.ts] --> B[Drizzle Kit Generate]
    B --> C[Migration Files]
    
    C --> D[0000_hot_the_fallen.sql]
    C --> E[0001_tricky_jackpot.sql]
    C --> F[meta/_journal.json]
    C --> G[meta/0000_snapshot.json]
    
    H[Database] --> I[Migration Runner]
    I --> D
    I --> E
    
    J[Migration Status] --> K[Applied Migrations]
    K --> L[Schema Version]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style H fill:#fff3e0
    style J fill:#f3e5f5
```

## Best Practices

1. **Never edit applied migrations**: Once a migration has been applied to production, never modify it
2. **Test migrations**: Always test migrations on a copy of production data
3. **Backup before migrations**: Create database backups before applying migrations in production
4. **Sequential naming**: Use the generated sequential naming convention
5. **Rollback planning**: Consider rollback strategies for complex migrations

## Schema Evolution Example

```mermaid
graph TD
    A[Initial Schema v0] --> B[Migration 0000]
    B --> C[Schema v1]
    C --> D[Migration 0001] 
    D --> E[Schema v2]
    E --> F[Future Migration]
    F --> G[Schema v3]
    
    H[users table] --> I[projects table]
    I --> J[media_items table]
    
    style A fill:#e1f5fe
    style C fill:#e8f5e8
    style E fill:#fff3e0
    style G fill:#f3e5f5
```
