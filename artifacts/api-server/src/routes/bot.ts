import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { schedulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  startBot, stopBot, getBotInfo, sendCommand as botSendCommand,
  getGrindingStatus, getPvpStatus, getStealthStatus, getAntiBotStatus, getAutoHealStatus,
  startGrinding, stopGrinding, autoCraft,
  startPvp, stopPvp, updatePvpSettings, updateStealth, updateAntiBot, updateAutoHeal,
} from "../lib/botManager";

const router: IRouter = Router();

// ─── Bot Status ────────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  const info = getBotInfo();
  res.json(info);
});

router.post("/start", async (_req, res) => {
  try {
    await startBot();
    const info = getBotInfo();
    res.json({ running: true, connected: info.connected, uptime: 0, reconnectCount: info.reconnectCount });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/stop", async (_req, res) => {
  await stopBot();
  res.json({ running: false, connected: false, uptime: 0, reconnectCount: 0 });
});

// ─── Schedules ────────────────────────────────────────────────────────────
router.get("/schedules", async (_req, res) => {
  const schedules = await db.select().from(schedulesTable).orderBy(schedulesTable.id);
  res.json({
    schedules: schedules.map(s => ({
      id: s.id.toString(), name: s.name, command: s.command,
      interval: s.interval, enabled: s.enabled,
      lastRun: s.lastRun?.toISOString(), nextRun: s.nextRun?.toISOString(),
    })),
  });
});

router.post("/schedules", async (req, res) => {
  const { name, command, interval, enabled } = req.body;
  const nextRun = new Date(Date.now() + interval * 1000);
  const inserted = await db.insert(schedulesTable).values({ name, command, interval, enabled, nextRun }).returning();
  const s = inserted[0];
  res.json({
    id: s.id.toString(), name: s.name, command: s.command,
    interval: s.interval, enabled: s.enabled,
    lastRun: s.lastRun?.toISOString(), nextRun: s.nextRun?.toISOString(),
  });
});

router.delete("/schedules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(schedulesTable).where(eq(schedulesTable.id, id));
  res.json({ success: true, message: "Schedule deleted" });
});

// ─── GRINDING ─────────────────────────────────────────────────────────────
router.get("/grinding", (_req, res) => {
  res.json(getGrindingStatus());
});

router.post("/grinding/start", async (req, res) => {
  try {
    const { mode = "mining", blockTarget = "diamond_ore" } = req.body;
    await startGrinding(mode, blockTarget);
    res.json({ success: true, status: getGrindingStatus() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/grinding/stop", async (_req, res) => {
  await stopGrinding();
  res.json({ success: true, status: getGrindingStatus() });
});

router.post("/grinding/craft", async (req, res) => {
  const { item = "wooden_pickaxe" } = req.body;
  const result = await autoCraft(item);
  res.json({ success: true, message: result });
});

// ─── PVP ─────────────────────────────────────────────────────────────────
router.get("/pvp", (_req, res) => {
  res.json(getPvpStatus());
});

router.post("/pvp/start", async (req, res) => {
  try {
    const { mode = "killaura", reach = 4.0, attackSpeed = 12 } = req.body;
    await startPvp({ mode, reach, attackSpeed });
    res.json({ success: true, status: getPvpStatus() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/pvp/stop", async (_req, res) => {
  await stopPvp();
  res.json({ success: true, status: getPvpStatus() });
});

router.patch("/pvp/settings", (req, res) => {
  updatePvpSettings(req.body);
  res.json({ success: true, status: getPvpStatus() });
});

// ─── STEALTH ──────────────────────────────────────────────────────────────
router.get("/stealth", (_req, res) => {
  res.json(getStealthStatus());
});
router.patch("/stealth", (req, res) => {
  updateStealth(req.body);
  res.json({ success: true, status: getStealthStatus() });
});

// ─── ANTI-BOT ─────────────────────────────────────────────────────────────
router.get("/antibot", (_req, res) => {
  res.json(getAntiBotStatus());
});
router.patch("/antibot", (req, res) => {
  updateAntiBot(req.body);
  res.json({ success: true, status: getAntiBotStatus() });
});

// ─── AUTO-HEAL ────────────────────────────────────────────────────────────
router.get("/autoheal", (_req, res) => {
  res.json(getAutoHealStatus());
});
router.patch("/autoheal", (req, res) => {
  updateAutoHeal(req.body);
  res.json({ success: true, status: getAutoHealStatus() });
});

export default router;
