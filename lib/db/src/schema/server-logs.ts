import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serverLogsTable = pgTable("server_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("INFO"),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertServerLogSchema = createInsertSchema(serverLogsTable).omit({ id: true });
export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogsTable.$inferSelect;
