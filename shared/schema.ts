import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const recognitionSessions = pgTable("recognition_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalRecognitions: integer("total_recognitions").default(0).notNull(),
});

export const recognitionResults = pgTable("recognition_results", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => recognitionSessions.id),
  character: text("character").notNull(),
  confidence: integer("confidence").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRecognitionSessionSchema = createInsertSchema(recognitionSessions).omit({
  id: true,
  startTime: true,
});

export const insertRecognitionResultSchema = createInsertSchema(recognitionResults).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRecognitionSession = z.infer<typeof insertRecognitionSessionSchema>;
export type RecognitionSession = typeof recognitionSessions.$inferSelect;
export type InsertRecognitionResult = z.infer<typeof insertRecognitionResultSchema>;
export type RecognitionResult = typeof recognitionResults.$inferSelect;
