import { pgTable, text, boolean, integer, real, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botStateTable = pgTable("bot_state", {
  id: serial("id").primaryKey(),
  running: boolean("running").notNull().default(false),
  connected: boolean("connected").notNull().default(false),
  startedAt: timestamp("started_at"),
  reconnectCount: integer("reconnect_count").notNull().default(0),
  health: real("health").notNull().default(20),
  hunger: real("hunger").notNull().default(20),
  posX: real("pos_x").notNull().default(0),
  posY: real("pos_y").notNull().default(64),
  posZ: real("pos_z").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBotStateSchema = createInsertSchema(botStateTable).omit({ id: true });
export type InsertBotState = z.infer<typeof insertBotStateSchema>;
export type BotState = typeof botStateTable.$inferSelect;
