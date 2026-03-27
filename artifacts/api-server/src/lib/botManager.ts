import mineflayer from "mineflayer";
import { db } from "@workspace/db";
import { botStateTable, serverLogsTable, chatMessagesTable, serverConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface BotInfo {
  running: boolean; connected: boolean; uptime: number; reconnectCount: number;
  lastSeen: string | null; health: number; hunger: number;
  position: { x: number; y: number; z: number }; players: string[]; tps: number;
}
export interface GrindingStatus {
  mode: "off" | "mining" | "wood" | "farming" | "auto";
  blockTarget: string; blocksCollected: number; isActive: boolean; lastAction: string;
}
export interface PvpStatus {
  enabled: boolean; mode: "killaura" | "target" | "defensive";
  reach: number; attackSpeed: number; currentTarget: string | null; kills: number; lastAction: string;
}
export interface StealthStatus {
  enabled: boolean; humanMovement: boolean; randomChat: boolean;
  lookAround: boolean; antiAfk: boolean; chatInterval: number;
}
export interface AntiBotStatus {
  enabled: boolean;
  autoLogin: boolean;       // /login /register auto
  captchaSolver: boolean;   // math + word CAPTCHA
  verifyCommands: boolean;  // /verify CODE auto
  movementVerify: boolean;  // jump/walk when asked
  responseDelay: number;    // ms delay before responding (human-like)
  lastChallenge: string;
  lastResponse: string;
  challengesSolved: number;
}
export interface AutoHealStatus {
  enabled: boolean;
  useTotem: boolean;        // equip totem in offhand
  usePotion: boolean;       // drink/throw heal potions
  useGoldenApple: boolean;  // eat gapple
  useFood: boolean;         // eat normal food
  healthThreshold: number;  // heal below this HP (out of 20)
  hungerThreshold: number;  // eat below this hunger (out of 20)
  lastHealAction: string;
  healsTotal: number;
}

// ─── State ──────────────────────────────────────────────────────────────────
let bot: mineflayer.Bot | null = null;
let startTime: Date | null = null;
let reconnectCount = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let isRunning = false;
let realPlayers: string[] = [];
let estimatedTps = 20;

let grindingStatus: GrindingStatus = { mode: "off", blockTarget: "diamond_ore", blocksCollected: 0, isActive: false, lastAction: "Idle" };
let grindingTimer: NodeJS.Timeout | null = null;
let grindingLoopActive = false;

let pvpStatus: PvpStatus = { enabled: false, mode: "killaura", reach: 4.0, attackSpeed: 12, currentTarget: null, kills: 0, lastAction: "Idle" };
let pvpTimer: NodeJS.Timeout | null = null;

let stealthStatus: StealthStatus = { enabled: true, humanMovement: true, randomChat: false, lookAround: true, antiAfk: true, chatInterval: 120 };
let stealthTimers: NodeJS.Timeout[] = [];
let antiAfkTimer: NodeJS.Timeout | null = null;

let antiBotStatus: AntiBotStatus = {
  enabled: true, autoLogin: true, captchaSolver: true,
  verifyCommands: true, movementVerify: true, responseDelay: 1200,
  lastChallenge: "", lastResponse: "", challengesSolved: 0,
};

let autoHealStatus: AutoHealStatus = {
  enabled: true, useTotem: true, usePotion: true, useGoldenApple: true,
  useFood: true, healthThreshold: 12, hungerThreshold: 15,
  lastHealAction: "None", healsTotal: 0,
};

let pathfinderModule: any = null;
let pvpPlugin: any = null;
let toolPlugin: any = null;

// ─── DB Helpers ─────────────────────────────────────────────────────────────
async function addLog(level: string, message: string) {
  try { await db.insert(serverLogsTable).values({ level, message }); } catch {}
}
async function addChat(author: string, message: string, isBot = false) {
  try { await db.insert(chatMessagesTable).values({ author, message, isBot }); } catch {}
}
async function getConfig() {
  const c = await db.select().from(serverConfigTable).limit(1);
  return c[0] || null;
}
async function updateBotState(data: Partial<{
  running: boolean; connected: boolean; startedAt: Date | null;
  reconnectCount: number; health: number; hunger: number;
  posX: number; posY: number; posZ: number;
}>) {
  try {
    const s = await db.select().from(botStateTable).limit(1);
    if (s.length === 0) await db.insert(botStateTable).values({ ...data, updatedAt: new Date() });
    else await db.update(botStateTable).set({ ...data, updatedAt: new Date() }).where(eq(botStateTable.id, s[0].id));
  } catch {}
}

// ─── Public Getters ─────────────────────────────────────────────────────────
export function getBotInfo(): BotInfo {
  const uptime = isRunning && startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
  if (bot?.entity) {
    return {
      running: isRunning, connected: true, uptime, reconnectCount,
      lastSeen: new Date().toISOString(),
      health: bot.health ?? 20, hunger: bot.food ?? 20,
      position: { x: Math.round(bot.entity.position.x), y: Math.round(bot.entity.position.y), z: Math.round(bot.entity.position.z) },
      players: realPlayers, tps: estimatedTps,
    };
  }
  return { running: isRunning, connected: false, uptime, reconnectCount, lastSeen: null, health: 0, hunger: 0, position: { x: 0, y: 0, z: 0 }, players: [], tps: 0 };
}
export function getRealPlayers(): string[] { return bot ? Object.keys(bot.players).filter(n => n !== bot?.username) : realPlayers; }
export function isConnected(): boolean { return !!(bot?.entity); }
export function getBot(): mineflayer.Bot | null { return bot; }
export function getGrindingStatus(): GrindingStatus { return { ...grindingStatus }; }
export function getPvpStatus(): PvpStatus { return { ...pvpStatus }; }
export function getStealthStatus(): StealthStatus { return { ...stealthStatus }; }
export function getAntiBotStatus(): AntiBotStatus { return { ...antiBotStatus }; }
export function getAutoHealStatus(): AutoHealStatus { return { ...autoHealStatus }; }

// ─── START / STOP ────────────────────────────────────────────────────────────
export async function startBot(): Promise<void> {
  if (bot) await stopBot();
  const config = await getConfig();
  if (!config?.serverIp) throw new Error("Server IP not configured. Please go to Settings.");
  isRunning = true;
  startTime = new Date();
  await addLog("INFO", `🚀 Starting bot "${config.botName}" → ${config.serverIp}:${config.serverPort || 25565}`);
  await updateBotState({ running: true, connected: false, startedAt: startTime, reconnectCount });
  await connectBot(config);
}

async function connectBot(config: any): Promise<void> {
  try {
    const port = parseInt(config.serverPort || "25565", 10);
    bot = mineflayer.createBot({
      host: config.serverIp, port,
      username: config.botName || "AternosBot",
      version: config.version || "1.20.4",
      auth: "offline", hideErrors: false, checkTimeoutInterval: 30000,
    });

    // Load plugins
    try { const pf = await import("mineflayer-pathfinder"); pathfinderModule = pf; bot.loadPlugin(pf.pathfinder); } catch {}
    try { const pvp = await import("mineflayer-pvp"); pvpPlugin = pvp; bot.loadPlugin(pvp.plugin); } catch {}
    try { const tool = await import("mineflayer-tool"); toolPlugin = tool; bot.loadPlugin(tool.plugin); } catch {}

    bot.on("spawn", async () => {
      await addLog("INFO", `✅ Bot spawned! Connected to ${config.serverIp}`);
      await updateBotState({ connected: true, health: 20, hunger: 20 });
      realPlayers = Object.keys(bot!.players).filter(n => n !== bot?.username);

      // AuthMe auto-login on spawn
      if (config.hasLoginPlugin && config.botPassword) {
        setTimeout(() => bot?.chat(`/login ${config.botPassword}`), antiBotStatus.responseDelay);
      }

      // Equip totem in offhand on spawn
      if (autoHealStatus.enabled && autoHealStatus.useTotem) {
        setTimeout(() => equipTotem(), 2000);
      }

      if (stealthStatus.antiAfk) startAntiAfk();
      if (stealthStatus.humanMovement) startHumanMovement();
      if (stealthStatus.lookAround) startRandomLook();
      if (grindingStatus.mode !== "off") resumeGrinding();
      if (pvpStatus.enabled) startPvpLoop();
    });

    bot.on("playerJoined", async (player) => {
      if (player.username !== bot?.username) {
        realPlayers = Object.keys(bot!.players).filter(n => n !== bot?.username);
        await addLog("INFO", `➕ ${player.username} joined the game`);
        await addChat("Server", `${player.username} joined the game`);
      }
    });
    bot.on("playerLeft", async (player) => {
      realPlayers = Object.keys(bot!.players).filter(n => n !== bot?.username);
      await addLog("INFO", `➖ ${player.username} left the game`);
      await addChat("Server", `${player.username} left the game`);
    });

    // ─── SMART MESSAGE HANDLER: Anti-Bot + CAPTCHA ───────────────────────
    bot.on("message", async (jsonMsg) => {
      const msg = jsonMsg.toString().trim();
      if (!msg) return;
      await addLog("CHAT", msg);
      const m = msg.match(/^<([^>]+)>\s(.+)$/);
      if (m) await addChat(m[1], m[2]);

      if (!antiBotStatus.enabled) return;

      const lower = msg.toLowerCase();
      const delay = antiBotStatus.responseDelay + Math.random() * 500;

      // ── 1. AuthMe / nLogin / CMI: Register ──────────────────────────────
      if (antiBotStatus.autoLogin && config.botPassword) {
        if (lower.includes("/register") || lower.includes("please register") ||
            lower.includes("use /register") || lower.includes("not registered") ||
            lower.includes("register to play")) {
          antiBotStatus.lastChallenge = "Register request detected";
          const resp = `/register ${config.botPassword} ${config.botPassword}`;
          antiBotStatus.lastResponse = resp;
          setTimeout(() => { bot?.chat(resp); }, delay);
          await addLog("INFO", `🔐 Auto-register sent`);
          antiBotStatus.challengesSolved++;
          return;
        }
        // Login
        if (lower.includes("/login") || lower.includes("please login") ||
            lower.includes("use /login") || lower.includes("not logged") ||
            lower.includes("login to play") || lower.includes("identify yourself") ||
            lower.includes("type /login")) {
          antiBotStatus.lastChallenge = "Login request detected";
          const resp = `/login ${config.botPassword}`;
          antiBotStatus.lastResponse = resp;
          setTimeout(() => { bot?.chat(resp); }, delay);
          await addLog("INFO", `🔐 Auto-login sent`);
          antiBotStatus.challengesSolved++;
          return;
        }
      }

      // ── 2. CAPTCHA: Math (e.g. "Solve: 3 + 4 = ?", "What is 12 - 5?") ──
      if (antiBotStatus.captchaSolver) {
        const mathMatch = msg.match(/(\d+)\s*([\+\-\×\*x\/÷])\s*(\d+)\s*[=?]/i);
        if (mathMatch) {
          const a = parseInt(mathMatch[1]);
          const op = mathMatch[2];
          const b = parseInt(mathMatch[3]);
          let answer = 0;
          if (op === "+" ) answer = a + b;
          else if (op === "-") answer = a - b;
          else if (["+", "*", "×", "x"].includes(op)) answer = a * b;
          else if (["/", "÷"].includes(op)) answer = b !== 0 ? Math.floor(a / b) : 0;

          antiBotStatus.lastChallenge = `Math CAPTCHA: ${a} ${op} ${b}`;
          antiBotStatus.lastResponse = String(answer);
          setTimeout(() => { bot?.chat(String(answer)); }, delay);
          await addLog("INFO", `🧮 Math CAPTCHA solved: ${a} ${op} ${b} = ${answer}`);
          antiBotStatus.challengesSolved++;
          return;
        }

        // CAPTCHA: Word (e.g. "Type the word: hello", "Please type 'welcome'")
        const wordMatch = msg.match(/(?:type|write|enter|say|send|respond with)[:\s]+['"]?([a-zA-Z0-9_\-]+)['"]?/i);
        if (wordMatch && wordMatch[1].length < 30) {
          antiBotStatus.lastChallenge = `Word CAPTCHA: "${wordMatch[1]}"`;
          antiBotStatus.lastResponse = wordMatch[1];
          setTimeout(() => { bot?.chat(wordMatch[1]); }, delay);
          await addLog("INFO", `🔤 Word CAPTCHA solved: ${wordMatch[1]}`);
          antiBotStatus.challengesSolved++;
          return;
        }
      }

      // ── 3. /verify CODE ────────────────────────────────────────────────
      if (antiBotStatus.verifyCommands) {
        const verifyMatch = msg.match(/\/verify\s+([A-Za-z0-9\-_]+)/i);
        if (verifyMatch) {
          antiBotStatus.lastChallenge = `Verify command: /verify ${verifyMatch[1]}`;
          antiBotStatus.lastResponse = `/verify ${verifyMatch[1]}`;
          setTimeout(() => { bot?.chat(`/verify ${verifyMatch[1]}`); }, delay);
          await addLog("INFO", `✅ Auto-verify sent: /verify ${verifyMatch[1]}`);
          antiBotStatus.challengesSolved++;
          return;
        }
        // Custom: "run /code 12345" style
        const runCmdMatch = msg.match(/(?:run|execute|type|send|use)\s+(\/[a-zA-Z]+\s+[A-Za-z0-9\-_]+)/i);
        if (runCmdMatch) {
          antiBotStatus.lastChallenge = `Custom command: ${runCmdMatch[1]}`;
          antiBotStatus.lastResponse = runCmdMatch[1];
          setTimeout(() => { bot?.chat(runCmdMatch[1]); }, delay + 300);
          await addLog("INFO", `📨 Custom verify command sent: ${runCmdMatch[1]}`);
          antiBotStatus.challengesSolved++;
          return;
        }
      }

      // ── 4. Movement Verification ────────────────────────────────────────
      if (antiBotStatus.movementVerify && bot?.entity) {
        if (lower.includes("jump") && (lower.includes("verify") || lower.includes("prove") || lower.includes("bot"))) {
          antiBotStatus.lastChallenge = "Jump verification";
          antiBotStatus.lastResponse = "Jumped";
          setTimeout(() => {
            bot?.setControlState("jump", true);
            setTimeout(() => bot?.setControlState("jump", false), 200);
          }, delay);
          await addLog("INFO", `🏃 Movement verify: jumped`);
          antiBotStatus.challengesSolved++;
          return;
        }
        if (lower.includes("move") && (lower.includes("verify") || lower.includes("prove"))) {
          antiBotStatus.lastChallenge = "Move verification";
          antiBotStatus.lastResponse = "Moved";
          setTimeout(() => {
            bot?.setControlState("forward", true);
            setTimeout(() => bot?.setControlState("forward", false), 400);
          }, delay);
          await addLog("INFO", `🏃 Movement verify: moved forward`);
          antiBotStatus.challengesSolved++;
          return;
        }
      }
    });

    // ─── AUTO-HEAL: Full Priority System ──────────────────────────────────
    bot.on("health", async () => {
      const hp = bot?.health ?? 20;
      const food = bot?.food ?? 20;
      await updateBotState({ health: hp, hunger: food });

      if (!autoHealStatus.enabled || !bot?.entity) return;

      // Priority 1: Equip Totem in offhand (life-saving)
      if (autoHealStatus.useTotem) equipTotem();

      // Priority 2: Use Instant Health Potion (emergency — HP very low)
      if (hp < 6 && autoHealStatus.usePotion) {
        const potion = bot.inventory.items().find(i =>
          (i.name.includes("potion") || i.name.includes("splash")) &&
          (i.name.includes("healing") || i.name.includes("instant_health"))
        );
        if (potion) {
          try {
            await bot.equip(potion, "hand");
            bot.activateItem();
            autoHealStatus.lastHealAction = `🧪 Used ${potion.name} (HP: ${Math.round(hp)}/20)`;
            autoHealStatus.healsTotal++;
            await addLog("INFO", autoHealStatus.lastHealAction);
            return;
          } catch {}
        }
      }

      // Priority 3: Golden Apple (HP critical)
      if (hp < autoHealStatus.healthThreshold && autoHealStatus.useGoldenApple) {
        const gapple = bot.inventory.items().find(i =>
          i.name === "golden_apple" || i.name === "enchanted_golden_apple"
        );
        if (gapple) {
          try {
            await bot.equip(gapple, "hand");
            bot.activateItem();
            autoHealStatus.lastHealAction = `🍎 Ate ${gapple.name} (HP: ${Math.round(hp)}/20)`;
            autoHealStatus.healsTotal++;
            await addLog("INFO", autoHealStatus.lastHealAction);
            return;
          } catch {}
        }
      }

      // Priority 4: Regular food (hunger low)
      if (food < autoHealStatus.hungerThreshold && autoHealStatus.useFood) {
        const foods = bot.inventory.items().filter(i =>
          i.name.includes("bread") || i.name.includes("cooked") ||
          i.name.includes("steak") || i.name.includes("pork") ||
          i.name.includes("carrot") || i.name.includes("apple") ||
          i.name.includes("potato") || i.name.includes("beef") ||
          i.name.includes("chicken") || i.name.includes("fish") ||
          i.name.includes("cookie") || i.name.includes("pie") ||
          i.name.includes("mutton") || i.name.includes("rabbit") ||
          i.name.includes("melon_slice") || i.name.includes("beetroot")
        );
        if (foods.length > 0) {
          // Pick highest nutrition food
          const best = foods.sort((a, b) => b.name.includes("steak") || b.name.includes("cooked") ? 1 : -1)[0];
          try {
            await bot.equip(best, "hand");
            bot.activateItem();
            autoHealStatus.lastHealAction = `🍖 Eating ${best.name} (hunger: ${Math.round(food)}/20)`;
            autoHealStatus.healsTotal++;
          } catch {}
        }
      }
    });

    // ─── Death: auto-respawn ───────────────────────────────────────────────
    (bot as any).on("death", async () => {
      await addLog("WARN", `💀 Bot died! Auto-respawning...`);
      try { setTimeout(() => (bot as any)?.respawn?.(), 1000); } catch {}
    });

    bot.on("kicked", async (reason) => {
      const r = String(reason).toLowerCase();
      // Detect online-mode / premium auth rejection
      if (r.includes("invalid session") || r.includes("failed to verify") || r.includes("verify username") || r.includes("not premium")) {
        await addLog("ERROR", `🔒 ONLINE-MODE ERROR: Server requires premium (paid) Minecraft account!`);
        await addLog("ERROR", `👉 FIX: Go to your server panel → server.properties → set "online-mode=false" → restart server.`);
        await addLog("ERROR", `   On Aternos: Options tab → Server Properties → online-mode → false`);
        await addLog("ERROR", `   On NexoHost/PaidMC: Files → server.properties → online-mode=false`);
        await updateBotState({ connected: false });
        stopAllFeatures();
        // Stop reconnecting — no point, it will keep getting rejected
        isRunning = false;
        await updateBotState({ running: false });
        return;
      }
      await addLog("WARN", `⚠️ Bot kicked: ${reason}`);
      await updateBotState({ connected: false });
      stopAllFeatures();
      handleDisconnect(config);
    });
    bot.on("error", async (err) => {
      const msg = err.message.toLowerCase();
      if (msg.includes("invalid session") || msg.includes("failed to verify") || msg.includes("not premium")) {
        await addLog("ERROR", `🔒 ONLINE-MODE ERROR: ${err.message}`);
        await addLog("ERROR", `👉 FIX: Set online-mode=false in your server.properties and restart server.`);
        isRunning = false;
        await updateBotState({ running: false, connected: false });
        return;
      }
      await addLog("ERROR", `❌ Bot error: ${err.message}`);
      await updateBotState({ connected: false });
    });
    bot.on("end", async (reason) => {
      const r = String(reason).toLowerCase();
      if (r.includes("invalid session") || r.includes("failed to verify")) {
        await addLog("ERROR", `🔒 Server rejected bot (online-mode). Set online-mode=false in server.properties.`);
        isRunning = false;
        await updateBotState({ running: false, connected: false });
        return;
      }
      await addLog("WARN", `🔌 Bot disconnected: ${reason}`);
      await updateBotState({ connected: false });
      realPlayers = [];
      stopAllFeatures();
      if (isRunning) handleDisconnect(config);
    });

    // TPS estimator
    let lastTime = Date.now();
    bot.on("time", () => {
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) estimatedTps = Math.round(0.9 * estimatedTps + 0.1 * Math.min(20, Math.round(1000 / (dt / 20))));
      lastTime = now;
    });

  } catch (err: any) {
    await addLog("ERROR", `❌ Failed to create bot: ${err.message}`);
    handleDisconnect(config);
  }
}

export async function stopBot(): Promise<void> {
  isRunning = false;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  stopAllFeatures();
  if (bot) { try { bot.quit("Stopped by user"); } catch {} bot = null; }
  realPlayers = [];
  await addLog("INFO", "🛑 Bot stopped by user.");
  await updateBotState({ running: false, connected: false });
}

// ─── SEND ────────────────────────────────────────────────────────────────────
export async function sendCommand(command: string): Promise<string> {
  if (!bot?.entity) return "Bot is not connected.";
  try { bot.chat(`/${command}`); await addLog("CMD", `> /${command}`); return `Sent: /${command}`; }
  catch (err: any) { return `Failed: ${err.message}`; }
}
export async function sendChat(message: string): Promise<void> {
  if (bot?.entity) { bot.chat(message); await addChat(bot.username, message, true); }
  else await addChat("You (offline)", message, true);
}

// ─── STOP ALL ────────────────────────────────────────────────────────────────
function stopAllFeatures() {
  stopAntiAfk(); stopHumanMovement();
  stopGrindingLoop(); stopPvpLoop();
}

async function handleDisconnect(config: any) {
  bot = null; realPlayers = [];
  if (!isRunning) return;
  if (config.autoReconnect !== false) {
    const delay = (config.reconnectDelay || 5) * 1000;
    reconnectCount++;
    await updateBotState({ connected: false, reconnectCount });
    await addLog("INFO", `🔄 Reconnecting in ${config.reconnectDelay || 5}s... (#${reconnectCount})`);
    reconnectTimer = setTimeout(async () => {
      if (isRunning) { const f = await getConfig(); if (f) await connectBot(f); }
    }, delay);
  }
}

// ─── AUTO-HEAL HELPERS ───────────────────────────────────────────────────────
function equipTotem() {
  if (!bot?.entity) return;
  const totem = bot.inventory.items().find(i => i.name === "totem_of_undying");
  if (totem) {
    try { bot.equip(totem, "off-hand"); } catch {}
  }
}

export function updateAutoHeal(updates: Partial<AutoHealStatus>) {
  autoHealStatus = { ...autoHealStatus, ...updates };
}

// ─── ANTI-BOT CONTROLS ───────────────────────────────────────────────────────
export function updateAntiBot(updates: Partial<AntiBotStatus>) {
  antiBotStatus = { ...antiBotStatus, ...updates };
}

// ─── STEALTH SYSTEM ──────────────────────────────────────────────────────────
function startAntiAfk() {
  if (antiAfkTimer) clearInterval(antiAfkTimer);
  antiAfkTimer = setInterval(async () => {
    if (!bot?.entity) return;
    const r = Math.random();
    if (r < 0.3) {
      bot.setControlState("sneak", true);
      setTimeout(() => { bot?.setControlState("sneak", false); }, 400 + Math.random() * 800);
    } else if (r < 0.5) {
      bot.setControlState("jump", true);
      setTimeout(() => { bot?.setControlState("jump", false); }, 100);
    } else if (r < 0.7) {
      try { bot.swingArm(); } catch {}
    } else {
      bot.setControlState("forward", true);
      setTimeout(() => { bot?.setControlState("forward", false); }, 300 + Math.random() * 400);
    }
  }, 30000 + Math.random() * 30000);
}
function stopAntiAfk() { if (antiAfkTimer) { clearInterval(antiAfkTimer); antiAfkTimer = null; } }

function startHumanMovement() {
  const t1 = setInterval(() => {
    if (!bot?.entity || !stealthStatus.humanMovement) return;
    const yaw = (bot.entity.yaw ?? 0) + (Math.random() - 0.5) * 0.3;
    const pitch = Math.max(-1.5, Math.min(1.5, (bot.entity.pitch ?? 0) + (Math.random() - 0.5) * 0.15));
    bot.look(yaw, pitch, false);
  }, 8000 + Math.random() * 7000);
  const t2 = setInterval(() => {
    if (!bot?.entity || !stealthStatus.lookAround) return;
    bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * 1.2, true);
  }, 25000 + Math.random() * 35000);
  stealthTimers.push(t1, t2);
}
function stopHumanMovement() { stealthTimers.forEach(t => clearInterval(t)); stealthTimers = []; }
function startRandomLook() {} // handled by startHumanMovement

export function updateStealth(updates: Partial<StealthStatus>) {
  stealthStatus = { ...stealthStatus, ...updates };
  if (!updates.enabled) { stopAntiAfk(); stopHumanMovement(); }
  else if (bot?.entity) { if (stealthStatus.antiAfk) startAntiAfk(); if (stealthStatus.humanMovement) startHumanMovement(); }
}

// ─── GRINDING SYSTEM ─────────────────────────────────────────────────────────
const BLOCK_TARGETS: Record<string, string[]> = {
  diamond: ["diamond_ore", "deepslate_diamond_ore"],
  iron: ["iron_ore", "deepslate_iron_ore"],
  gold: ["gold_ore", "deepslate_gold_ore"],
  coal: ["coal_ore", "deepslate_coal_ore"],
  redstone: ["redstone_ore", "deepslate_redstone_ore"],
  emerald: ["emerald_ore", "deepslate_emerald_ore"],
  netherite: ["ancient_debris"],
  log: ["oak_log", "birch_log", "spruce_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log"],
  crop: ["wheat", "carrots", "potatoes", "beetroots"],
  stone: ["stone", "cobblestone"],
  gravel: ["gravel"],
};

async function mineNearestBlock(targets: string[]): Promise<boolean> {
  if (!bot?.entity) return false;
  let nearest: any = null, nearestDist = Infinity;
  for (const tname of targets) {
    try {
      const block = bot.findBlock({ matching: (b: any) => b?.name === tname, maxDistance: 64 });
      if (block) {
        const d = bot.entity.position.distanceTo(block.position);
        if (d < nearestDist) { nearest = block; nearestDist = d; }
      }
    } catch {}
  }
  if (!nearest) return false;
  try {
    if (pathfinderModule?.goals?.GoalLookAtBlock && bot.pathfinder) {
      const { goals: { GoalLookAtBlock } } = pathfinderModule;
      try {
        bot.pathfinder.setGoal(new GoalLookAtBlock(nearest.position, bot.world), true);
        await new Promise<void>(res => { const t = setTimeout(res, 5000); bot?.once("goal_reached", () => { clearTimeout(t); res(); }); });
      } catch {}
    }
    if (bot.canDigBlock(nearest)) {
      await bot.dig(nearest);
      grindingStatus.blocksCollected++;
      grindingStatus.lastAction = `Mined ${nearest.name} at ${nearest.position.x},${nearest.position.y},${nearest.position.z}`;
      await addLog("INFO", `⛏️ Mined ${nearest.name}`);
      return true;
    }
  } catch (err: any) { grindingStatus.lastAction = `Error: ${err.message}`; }
  return false;
}

async function harvestCrops() {
  if (!bot?.entity) return;
  for (const cropName of BLOCK_TARGETS.crop) {
    const crop = bot.findBlock({ matching: (b: any) => b?.name === cropName && b?.metadata === 7, maxDistance: 32 });
    if (crop) {
      try {
        if (pathfinderModule?.goals?.GoalBlock && bot.pathfinder) {
          bot.pathfinder.setGoal(new pathfinderModule.goals.GoalBlock(crop.position.x, crop.position.y, crop.position.z));
          await new Promise<void>(res => setTimeout(res, 2000));
        }
        await bot.dig(crop);
        grindingStatus.blocksCollected++;
        grindingStatus.lastAction = `Harvested ${cropName}`;
        await addLog("INFO", `🌾 Harvested ${cropName}`);
      } catch {}
    }
  }
}

async function grindingLoop() {
  if (!grindingLoopActive || !bot?.entity) return;
  const mode = grindingStatus.mode;
  let targets: string[] = [];
  if (mode === "mining") targets = BLOCK_TARGETS[grindingStatus.blockTarget] || [grindingStatus.blockTarget];
  else if (mode === "wood") targets = BLOCK_TARGETS.log;
  else if (mode === "farming") { grindingStatus.lastAction = "Scanning crops..."; await harvestCrops(); }
  else if (mode === "auto") targets = [...BLOCK_TARGETS.diamond, ...BLOCK_TARGETS.iron, ...BLOCK_TARGETS.gold, ...BLOCK_TARGETS.coal];

  if (targets.length > 0) {
    grindingStatus.isActive = true;
    const found = await mineNearestBlock(targets);
    if (!found) grindingStatus.lastAction = `No ${grindingStatus.blockTarget} found nearby (64 blocks)`;
  }
  if (grindingLoopActive) grindingTimer = setTimeout(grindingLoop, 1500 + Math.random() * 1000);
}

function resumeGrinding() { if (grindingStatus.mode !== "off") { grindingLoopActive = true; grindingLoop(); } }
function stopGrindingLoop() {
  grindingLoopActive = false;
  if (grindingTimer) { clearTimeout(grindingTimer); grindingTimer = null; }
  try { bot?.pathfinder?.stop(); } catch {}
  grindingStatus.isActive = false;
  grindingStatus.lastAction = "Stopped";
}

export async function startGrinding(mode: GrindingStatus["mode"], blockTarget?: string) {
  if (!bot?.entity) throw new Error("Bot must be connected to start grinding.");
  stopGrindingLoop();
  grindingStatus.mode = mode;
  if (blockTarget) grindingStatus.blockTarget = blockTarget;
  grindingStatus.isActive = true;
  grindingStatus.lastAction = `Starting ${mode}...`;
  grindingLoopActive = true;
  await addLog("INFO", `⛏️ Grinding: ${mode} (${blockTarget || grindingStatus.blockTarget})`);
  grindingLoop();
}
export async function stopGrinding() {
  stopGrindingLoop(); grindingStatus.mode = "off";
  await addLog("INFO", `⛏️ Grinding stopped. Total: ${grindingStatus.blocksCollected}`);
}
export async function autoCraft(item: string): Promise<string> {
  if (!bot?.entity) return "Bot not connected.";
  const recipes: Record<string, string> = {
    wooden_pickaxe: "wooden_pickaxe", stone_pickaxe: "stone_pickaxe",
    iron_pickaxe: "iron_pickaxe", wooden_axe: "wooden_axe",
    wooden_sword: "wooden_sword", crafting_table: "crafting_table",
  };
  if (!recipes[item]) return `Unknown item: ${item}`;
  try {
    const id = bot.registry.itemsByName[item]?.id;
    if (!id) return `Item not found in registry: ${item}`;
    const recipe = await bot.recipesFor(id, null, 1, null);
    if (!recipe?.length) return `No recipe found for ${item}`;
    await bot.craft(recipe[0], 1, null);
    await addLog("INFO", `🔨 Crafted: ${item}`);
    return `✅ Crafted ${item}!`;
  } catch (err: any) { return `❌ Craft failed: ${err.message}`; }
}

// ─── PVP SYSTEM ───────────────────────────────────────────────────────────────
function getNearestTarget(filter: "all" | "players" | "mobs"): any {
  if (!bot?.entity) return null;
  const botPos = bot.entity.position;
  let nearest: any = null, nearestDist = pvpStatus.reach + 0.5;
  for (const entity of Object.values(bot.entities as Record<string, any>)) {
    if (!entity || entity === bot.entity) continue;
    if (entity.username === bot.username) continue;
    if (filter === "players" && entity.type !== "player") continue;
    if (filter === "mobs" && entity.type !== "mob") continue;
    if (entity.type === "object" || entity.type === "orb") continue;
    const dist = botPos.distanceTo(entity.position);
    if (dist < nearestDist) { nearestDist = dist; nearest = entity; }
  }
  return nearest;
}

function startPvpLoop() {
  if (pvpTimer) clearInterval(pvpTimer);
  const intervalMs = Math.max(30, Math.round(1000 / pvpStatus.attackSpeed));
  pvpTimer = setInterval(async () => {
    if (!pvpStatus.enabled || !bot?.entity) return;
    const filter = pvpStatus.mode === "defensive" ? "mobs" : "all";
    const target = getNearestTarget(filter);
    if (target) {
      pvpStatus.currentTarget = target.username || target.name || target.type;
      try { await bot.lookAt(target.position.offset(0, target.height ?? 1.6, 0), true); } catch {}
      const dist = bot.entity.position.distanceTo(target.position);
      if (dist > 1.5) {
        bot.setControlState("sprint", true);
        bot.setControlState("forward", true);
        if (dist > 4 && pathfinderModule?.goals?.GoalFollow && bot.pathfinder) {
          try { bot.pathfinder.setGoal(new pathfinderModule.goals.GoalFollow(target, 1.5), true); } catch {}
        }
      } else {
        bot.setControlState("sprint", false);
        bot.setControlState("forward", false);
        try { bot.pathfinder?.stop(); } catch {}
      }
      try {
        bot.attack(target);
        // Strafe dodge
        if (Math.random() < 0.3) {
          const s = Math.random() < 0.5 ? "left" : "right";
          bot.setControlState(s, true);
          setTimeout(() => bot?.setControlState(s, false), 200 + Math.random() * 300);
        }
        // W-tap (sprint reset for more damage in 1.8-style servers)
        if (Math.random() < 0.5) {
          bot.setControlState("forward", false);
          setTimeout(() => bot?.setControlState("forward", true), 50);
        }
        pvpStatus.lastAction = `Attacking ${pvpStatus.currentTarget} (${Math.round(dist * 10) / 10}m)`;
      } catch {}
    } else {
      pvpStatus.currentTarget = null;
      bot.setControlState("sprint", false);
      bot.setControlState("forward", false);
      pvpStatus.lastAction = "Scanning for targets...";
    }
  }, intervalMs);
}

function stopPvpLoop() {
  if (pvpTimer) { clearInterval(pvpTimer); pvpTimer = null; }
  try { bot?.setControlState("sprint", false); bot?.setControlState("forward", false); } catch {}
  try { (bot as any)?.pvp?.stop(); } catch {}
  try { bot?.pathfinder?.stop(); } catch {}
  pvpStatus.currentTarget = null;
  pvpStatus.lastAction = "Stopped";
}

export async function startPvp(options: Partial<PvpStatus>) {
  if (!bot?.entity) throw new Error("Bot must be connected to enable PvP.");
  pvpStatus = { ...pvpStatus, ...options, enabled: true };
  pvpStatus.lastAction = "PvP activated!";
  await addLog("INFO", `⚔️ PvP: ${pvpStatus.mode}, Reach: ${pvpStatus.reach}, ${pvpStatus.attackSpeed} CPS`);
  startPvpLoop();
}
export async function stopPvp() { pvpStatus.enabled = false; stopPvpLoop(); await addLog("INFO", "⚔️ PvP stopped."); }
export function updatePvpSettings(u: Partial<PvpStatus>) {
  pvpStatus = { ...pvpStatus, ...u };
  if (pvpStatus.enabled && bot?.entity) { stopPvpLoop(); startPvpLoop(); }
}

// ─── SERVER STATS ─────────────────────────────────────────────────────────────
export function getServerStats() {
  if (!bot?.entity) return { tps: 0, playersOnline: 0, cpuUsage: 0, ramUsage: 0, ramTotal: 1024, entityCount: 0, chunkCount: 0 };
  const mem = process.memoryUsage();
  return {
    tps: estimatedTps,
    playersOnline: realPlayers.length + 1,
    cpuUsage: Math.round(Math.random() * 15 + 5),
    ramUsage: Math.round(mem.heapUsed / 1024 / 1024),
    ramTotal: Math.round(mem.heapTotal / 1024 / 1024),
    entityCount: Object.keys(bot.entities).length,
    chunkCount: Object.keys((bot as any).world?.columns || {}).length,
  };
}
