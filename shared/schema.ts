import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Queue configuration schema
export const queues = pgTable("queues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parent: text("parent"),
  weight: real("weight").default(1.0),
  schedulingPolicy: text("scheduling_policy").default("fair"),
  minMemory: integer("min_memory"),
  minVcores: integer("min_vcores"),
  maxMemory: integer("max_memory"),
  maxVcores: integer("max_vcores"),
  maxRunningApps: integer("max_running_apps"),
  maxAMShare: real("max_am_share"),
  allowPreemptionFrom: boolean("allow_preemption_from").default(false),
  allowPreemptionTo: boolean("allow_preemption_to").default(false),
  reservation: boolean("reservation").default(false),
});

// Configuration file metadata
export const configFiles = pgTable("config_files", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  isValid: boolean("is_valid").default(true),
  lastModified: text("last_modified"),
  validationErrors: text("validation_errors"),
});

// Insert schemas
export const insertQueueSchema = createInsertSchema(queues).omit({
  id: true,
});

export const insertConfigFileSchema = createInsertSchema(configFiles).omit({
  id: true,
});

// Types
export type Queue = typeof queues.$inferSelect;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type ConfigFile = typeof configFiles.$inferSelect;
export type InsertConfigFile = z.infer<typeof insertConfigFileSchema>;

// Extended schemas for forms
export const queueFormSchema = insertQueueSchema.extend({
  name: z.string().min(1, "Queue name is required").regex(/^[a-zA-Z0-9_-]+$/, "Invalid queue name format"),
  weight: z.number().min(0.1, "Weight must be at least 0.1"),
  minMemory: z.number().min(0).optional(),
  minVcores: z.number().min(0).optional(),
  maxMemory: z.number().min(0).optional(),
  maxVcores: z.number().min(0).optional(),
  maxRunningApps: z.number().min(1).optional(),
  maxAMShare: z.number().min(0).max(1).optional(),
});

export type QueueFormData = z.infer<typeof queueFormSchema>;
