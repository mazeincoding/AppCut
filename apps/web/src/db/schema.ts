// apps/web/src/lib/db/schema.ts

import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media files table
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").notNull(),
  type: varchar("type", { length: 100 }),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow(),
});
