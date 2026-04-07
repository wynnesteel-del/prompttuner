import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prompts = sqliteTable("prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rawInput: text("raw_input").notNull(),
  category: text("category").notNull(),
  followUpAnswers: text("follow_up_answers"),
  promptQuick: text("prompt_quick"),
  promptDetailed: text("prompt_detailed"),
  promptExpert: text("prompt_expert"),
  moneyAngleSuggestion: text("money_angle_suggestion"),
  moneyAnglePrompt: text("money_angle_prompt"),
  aiTarget: text("ai_target").default("perplexity"),
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  promptTemplate: text("prompt_template").notNull(),
  fields: text("fields").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0),
});

export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true, createdAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
