import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const inpFiles = pgTable("inp_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  directory: text("directory").notNull(),
  size: integer("size").notNull(),
  lastModified: timestamp("last_modified").notNull(),
  nodeCount: integer("node_count").notNull().default(0),
  linkCount: integer("link_count").notNull().default(0),
  subcatchmentCount: integer("subcatchment_count").notNull().default(0),
  description: text("description"),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInpFileSchema = createInsertSchema(inpFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInpFile = z.infer<typeof insertInpFileSchema>;
export type InpFile = typeof inpFiles.$inferSelect;
