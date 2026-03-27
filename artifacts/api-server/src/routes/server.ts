import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  serverConfigTable,
  botStateTable,
  serverLogsTable,
  chatMessagesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getBotInfo, getRealPlayers, sendCommand as botSendCommand, sendChat, isConnected, getServerStats } from "../lib/botManager";

const router: IRouter = Router();

// In-memory lists (backed by config save)
const WHITELIST: string[] = ["Steve", "Alex"];
const BANLIST: string[] = [];
const OPLIST: string[] = [];

const MOCK_PLUGINS = [
  { name: "EssentialsX", version: "2.20.1", enabled: true, description: "The essential plugin suite", author: "EssentialsX Team" },
  { name: "WorldEdit", version: "7.2.15", enabled: true, description: "World editing plugin", author: "sk89q" },
  { name: "Vault", version: "1.7.3", enabled: true, description: "Economy & permissions bridge", author: "MilkBowl" },
  { name: "LuckPerms", version: "5.4.134", enabled: true, description: "Permissions management", author: "lucko" },
  { name: "AuthMe", version: "5.6.0", enabled: true, description: "Login/register plugin", author: "AuthMe Team" },
  { name: "GriefPrevention", version: "16.18.2", enabled: false, description: "Land claiming", author: "BigScary" },
  { name: "Multiverse-Core", version: "4.3.14", enabled: true, description: "Multiple worlds", author: "Multiverse Team" },
  { name: "Citizens", version: "2.0.33", enabled: true, description: "NPC plugin", author: "fullwall" },
];

// ─── Config ────────────────────────────────────────────────────────────────
router.get("/config", async (_req, res) => {
  const configs = await db.select().from(serverConfigTable).limit(1);
  if (configs.length === 0) {
    const defaults = await db.insert(serverConfigTable).values({}).returning();
    res.json(defaults[0]);
  } else {
    res.json(configs[0]);
  }
});

router.post("/config", async (req, res) => {
  const configs = await db.select().from(serverConfigTable).limit(1);
  if (configs.length === 0) {
    const created = await db.insert(serverConfigTable).values(req.body).returning();
    res.json(created[0]);
  } else {
    const updated = await db.update(serverConfigTable).set(req.body).where(eq(serverConfigTable.id, configs[0].id)).returning();
    res.json(updated[0]);
  }
});

// ─── Players (Real from bot) ────────────────────────────────────────────────
router.get("/players", (_req, res) => {
  const botInfo = getBotInfo();
  const connected = isConnected();

  // Real players from bot
  const playerNames = connected ? getRealPlayers() : [];

  const players = playerNames.map((name) => ({
    name,
    uuid: `uuid-${name}`,
    online: true,
    pingMs: Math.floor(Math.random() * 100) + 20,
    gamemode: "survival",
    health: 20,
    hunger: 20,
    isOp: OPLIST.includes(name),
    isBanned: BANLIST.includes(name),
    isWhitelisted: WHITELIST.includes(name),
    joinedAt: new Date().toISOString(),
  }));

  res.json({
    players,
    count: players.length,
    maxPlayers: 20,
    serverOnline: connected,
  });
});

// ─── Logs (Real from DB) ───────────────────────────────────────────────────
router.get("/logs", async (_req, res) => {
  const logs = await db.select().from(serverLogsTable).orderBy(desc(serverLogsTable.id)).limit(200);
  res.json({
    logs: logs.reverse().map(l => ({
      timestamp: l.timestamp?.toISOString() ?? new Date().toISOString(),
      level: l.level,
      message: l.message,
    })),
  });
});

// ─── Command (Real to bot) ─────────────────────────────────────────────────
router.post("/command", async (req, res) => {
  const { command } = req.body;
  const output = await botSendCommand(command);
  res.json({ success: true, output });
});

// ─── Stats (Real from bot) ────────────────────────────────────────────
router.get("/stats", (_req, res) => {
  const botInfo = getBotInfo();
  const stats = getServerStats();
  res.json({
    ...stats,
    uptime: botInfo.uptime,
    botHealth: botInfo.health,
    botHunger: botInfo.hunger,
    botPosition: botInfo.position,
    botConnected: botInfo.connected,
  });
});

// ─── Chat (Real from DB / Send via bot) ───────────────────────────────────
router.get("/chat", async (_req, res) => {
  const msgs = await db.select().from(chatMessagesTable).orderBy(desc(chatMessagesTable.id)).limit(100);
  res.json({
    messages: msgs.reverse().map(m => ({
      id: m.id.toString(),
      author: m.author,
      message: m.message,
      timestamp: m.timestamp?.toISOString() ?? new Date().toISOString(),
      isBot: m.isBot,
    })),
  });
});

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  await sendChat(message);
  res.json({ success: true, message: "Message sent" });
});

// ─── Whitelist ─────────────────────────────────────────────────────────────
router.get("/whitelist", (_req, res) => {
  res.json({ players: WHITELIST });
});
router.post("/whitelist", async (req, res) => {
  const { name } = req.body;
  if (!WHITELIST.includes(name)) WHITELIST.push(name);
  await botSendCommand(`whitelist add ${name}`);
  res.json({ success: true, message: `${name} added to whitelist` });
});
router.delete("/whitelist/:name", async (req, res) => {
  const { name } = req.params;
  const idx = WHITELIST.indexOf(name);
  if (idx !== -1) WHITELIST.splice(idx, 1);
  await botSendCommand(`whitelist remove ${name}`);
  res.json({ success: true, message: `${name} removed from whitelist` });
});

// ─── Banlist ──────────────────────────────────────────────────────────────
router.get("/banlist", (_req, res) => {
  res.json({ players: BANLIST });
});
router.post("/banlist", async (req, res) => {
  const { name } = req.body;
  if (!BANLIST.includes(name)) BANLIST.push(name);
  await botSendCommand(`ban ${name} Banned by Admin`);
  res.json({ success: true, message: `${name} has been banned` });
});
router.delete("/banlist/:name", async (req, res) => {
  const { name } = req.params;
  const idx = BANLIST.indexOf(name);
  if (idx !== -1) BANLIST.splice(idx, 1);
  await botSendCommand(`pardon ${name}`);
  res.json({ success: true, message: `${name} has been unbanned` });
});

// ─── Operators ────────────────────────────────────────────────────────────
router.get("/ops", (_req, res) => {
  res.json({ players: OPLIST });
});
router.post("/ops", async (req, res) => {
  const { name } = req.body;
  if (!OPLIST.includes(name)) OPLIST.push(name);
  await botSendCommand(`op ${name}`);
  res.json({ success: true, message: `${name} is now an operator` });
});
router.delete("/ops/:name", async (req, res) => {
  const { name } = req.params;
  const idx = OPLIST.indexOf(name);
  if (idx !== -1) OPLIST.splice(idx, 1);
  await botSendCommand(`deop ${name}`);
  res.json({ success: true, message: `${name} is no longer an operator` });
});

// ─── Plugins ──────────────────────────────────────────────────────────────
router.get("/plugins", (_req, res) => {
  res.json({ plugins: MOCK_PLUGINS });
});

// ─── Backups ──────────────────────────────────────────────────────────────
router.get("/backups", (_req, res) => {
  res.json({
    backups: [
      { id: "bk-1", name: "world_backup_2026-03-20", size: 52428800, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: "complete" },
      { id: "bk-2", name: "world_backup_2026-03-22", size: 54525952, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "complete" },
      { id: "bk-3", name: "world_backup_2026-03-24", size: 55574528, createdAt: new Date(Date.now() - 86400000).toISOString(), status: "complete" },
    ],
  });
});
router.post("/backups", async (_req, res) => {
  await botSendCommand("save-all");
  res.json({ success: true, message: "Save-all triggered. Backup complete." });
});

export default router;
