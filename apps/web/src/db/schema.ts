// apps/web/src/lib/db/schema.ts

import { integer, pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";

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
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media files table
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  type: varchar("type", { length: 100 }).notNull(),
  url: text("url").notNull(),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});

// OAuth accounts (e.g., Google login)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 100 }).notNull(),
}, (table) => ({
  providerUserIndex: index("provider_user_idx").on(table.provider, table.providerAccountId),
}));

// Waitlist (for early access / invite system)
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  joinedAt: timestamp("joined_at").defaultNow(),
}); 
