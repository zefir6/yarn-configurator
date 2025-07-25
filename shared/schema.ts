import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Queue configuration schema
export const queues = sqliteTable("queues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  allowPreemptionFrom: integer("allow_preemption_from", { mode: "boolean" }).default(false),
  allowPreemptionTo: integer("allow_preemption_to", { mode: "boolean" }).default(false),
  reservation: integer("reservation", { mode: "boolean" }).default(false),
  aclSubmitApps: text("acl_submit_apps"),
  aclAdministerApps: text("acl_administer_apps"),
});

// Global configuration settings
export const globalConfig = sqliteTable("global_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  defaultQueueSchedulingPolicy: text("default_queue_scheduling_policy").default("fair"),
  userMaxAppsDefault: integer("user_max_apps_default").default(5),
  queueMaxAppsDefault: integer("queue_max_apps_default"),
  queueMaxAMShareDefault: real("queue_max_am_share_default"),
  queuePlacementRules: text("queue_placement_rules").default("specified,user,default"),
  defaultQueue: text("default_queue").default("default"),
});

// Configuration file metadata
export const configFiles = sqliteTable("config_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  isValid: integer("is_valid", { mode: "boolean" }).default(true),
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

export const insertGlobalConfigSchema = createInsertSchema(globalConfig).omit({
  id: true,
});

// Types
export type Queue = typeof queues.$inferSelect;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type ConfigFile = typeof configFiles.$inferSelect;
export type InsertConfigFile = z.infer<typeof insertConfigFileSchema>;
export type GlobalConfig = typeof globalConfig.$inferSelect;
export type InsertGlobalConfig = z.infer<typeof insertGlobalConfigSchema>;

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

// Global configuration form schema
export const globalConfigFormSchema = insertGlobalConfigSchema.extend({
  defaultQueueSchedulingPolicy: z.enum(["fair", "fifo", "drf"]),
  userMaxAppsDefault: z.number().min(1),
  queueMaxAppsDefault: z.number().min(1).optional(),
  queueMaxAMShareDefault: z.number().min(0).max(1).optional(),
  queuePlacementRules: z.string().min(1),
  defaultQueue: z.string().min(1),
});

export type GlobalConfigFormData = z.infer<typeof globalConfigFormSchema>;
