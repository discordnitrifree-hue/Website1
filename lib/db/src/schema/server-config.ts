import { pgTable, text, boolean, integer, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serverConfigTable = pgTable("server_config", {
  id: serial("id").primaryKey(),
  serverIp: text("server_ip").notNull().default(""),
  serverPort: text("server_port").notNull().default("25565"),
  botName: text("bot_name").notNull().default("AternosBot"),
  botPassword: text("bot_password").notNull().default(""),
  hasLoginPlugin: boolean("has_login_plugin").notNull().default(false),
  autoReconnect: boolean("auto_reconnect").notNull().default(true),
  reconnectDelay: real("reconnect_delay").notNull().default(5),
  version: text("version").notNull().default("1.20.4"),
  gameMode: text("game_mode").notNull().default("survival"),
  difficulty: text("difficulty").notNull().default("normal"),
  maxPlayers: integer("max_players").notNull().default(20),
  viewDistance: integer("view_distance").notNull().default(10),
  spawnProtection: integer("spawn_protection").notNull().default(16),
  pvp: boolean("pvp").notNull().default(true),
  allowFlight: boolean("allow_flight").notNull().default(false),
  enableWhitelist: boolean("enable_whitelist").notNull().default(false),
  onlineMode: boolean("online_mode").notNull().default(true),
  announcePlayerAchievements: boolean("announce_player_achievements").notNull().default(true),
  enableCommandBlocks: boolean("enable_command_blocks").notNull().default(false),
  forceGamemode: boolean("force_gamemode").notNull().default(false),
  hardcore: boolean("hardcore").notNull().default(false),
  motd: text("motd").notNull().default("A Minecraft Server"),
  resourcePack: text("resource_pack").notNull().default(""),
});

export const insertServerConfigSchema = createInsertSchema(serverConfigTable).omit({ id: true });
export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type ServerConfig = typeof serverConfigTable.$inferSelect;
