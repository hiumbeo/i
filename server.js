// server.ts
import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import dotenv from "dotenv";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var require2 = createRequire(import.meta.url);
var { Client: SelfClient, RichPresence } = require2("discord.js-selfbot-v13");
var { Client: BotClient, GatewayIntentBits, ActivityType } = require2("discord.js");
var app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var activeSessions = /* @__PURE__ */ new Map();
function appendLog(session, type, msg) {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN");
  session.logs.unshift({ time, type, msg });
  if (session.logs.length > 200) {
    session.logs.pop();
  }
}
function sendGatewayPresence(client, packetData) {
  const packet = {
    op: 3,
    d: packetData
  };
  try {
    if (typeof client.ws?.broadcast === "function") {
      client.ws.broadcast(packet);
    } else if (client.ws?.shards && typeof client.ws.shards.first === "function" && client.ws.shards.first()?.send) {
      client.ws.shards.first().send(packet);
    } else if (typeof client.ws?.send === "function") {
      client.ws.send(packet);
    }
  } catch (err) {
    console.error("sendGatewayPresence error:", err.message);
  }
}
async function startLiveSession(config) {
  const sessionId = "primary";
  const existing = activeSessions.get(sessionId);
  if (existing && existing.clientInstance) {
    try {
      existing.clientInstance.destroy();
    } catch {
    }
    activeSessions.delete(sessionId);
  }
  const cleanToken = config.token.trim().replace(/^"|"$/g, "");
  if (!cleanToken) {
    return { success: false, error: "Discord Token kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng!" };
  }
  const session = {
    id: sessionId,
    tokenType: config.tokenType,
    maskedToken: cleanToken.substring(0, 6) + "..." + cleanToken.substring(cleanToken.length - 4),
    status: config.status || "online",
    device: config.device || "desktop",
    activityName: config.activityName || "Visual Studio Code",
    activityType: config.activityType || "PLAYING",
    prefix: config.prefix || ".",
    userTag: "\u0110ang k\u1EBFt n\u1ED1i...",
    userId: "",
    avatarUrl: "",
    uptime: 0,
    ping: 0,
    connectedAt: Date.now(),
    isRunning: true,
    isStreaming: false,
    clientInstance: null,
    logs: []
  };
  activeSessions.set(sessionId, session);
  appendLog(session, "info", `B\u1EAFt \u0111\u1EA7u k\u1EBFt n\u1ED1i Gateway Discord (${config.tokenType === "user" ? "Treo Acc User Token" : "Bot Token"})...`);
  return new Promise((resolve) => {
    let resolved = false;
    try {
      if (config.tokenType === "user") {
        const osProperty = config.device === "mobile" ? "iOS" : "Windows";
        const browserProperty = config.device === "mobile" ? "Discord iOS" : "Discord Client";
        const client = new SelfClient({
          checkUpdate: false,
          ws: {
            properties: {
              os: osProperty,
              browser: browserProperty,
              device: config.device === "mobile" ? "mobile" : "desktop"
            }
          }
        });
        session.clientInstance = client;
        client.on("ready", async () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL?.() || "https://cdn.discordapp.com/embed/avatars/0.png";
          session.ping = Math.round(client.ws.ping) || 24;
          appendLog(session, "success", `[SUCCESS] \u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng: ${client.user.tag} (ID: ${client.user.id})`);
          appendLog(session, "info", `[STATUS] Thi\u1EBFt b\u1ECB: ${config.device === "mobile" ? "\u{1F4F1} Mobile" : "\u{1F4BB} PC Desktop"} | Tr\u1EA1ng th\xE1i: ${config.status}`);
          const startTime = Date.now();
          const applyDualPresence = () => {
            const now = Date.now();
            const songDuration = 21e4;
            const end = now + songDuration;
            const dualActivities = [
              // 1. Visual Studio Code PC Activity
              {
                name: config.activityName || "Visual Studio Code",
                type: 0,
                // Playing
                application_id: "383226320970055681",
                details: config.details || "Treo PC 24/7",
                state: config.state || "Online",
                timestamps: { start: startTime },
                assets: {
                  large_image: "1359299466493956258",
                  // Verified Live VS Code Icon
                  large_text: "Visual Studio Code",
                  small_image: "1359298971905822881",
                  // Verified Live TS / Idle Badge
                  small_text: "Verified PC 24/7"
                }
              },
              // 2. Spotify - Novocaine with REAL ALBUM COVER & INFINITE LOOP
              {
                name: "Spotify",
                type: 2,
                // Listening
                flags: 48,
                details: "Novocaine",
                state: "Fall Out Boy",
                timestamps: {
                  start: now,
                  end
                },
                sync_id: "5F0bmCjKUufNz1bHXfgRwe",
                // Official Spotify Track ID for Novocaine
                party: {
                  id: `spotify:${client.user.id}`
                },
                assets: {
                  large_image: "spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b",
                  // Official Spotify Album Cover Hash
                  large_text: "American Beauty/American Psycho"
                }
              }
            ];
            const osDevice = config.device === "mobile" ? "mobile" : "desktop";
            sendGatewayPresence(client, {
              since: Date.now(),
              activities: dualActivities,
              status: config.status || "online",
              afk: false,
              client_status: { [osDevice]: "online" }
            });
          };
          try {
            applyDualPresence();
            appendLog(session, "success", `[DUAL STATUS] \u0110\xE3 k\xEDch ho\u1EA1t 2 activity c\xF9ng l\xFAc: VS Code + Spotify "Novocaine" (C\xF3 \u1EA3nh b\xECa Album)!`);
            appendLog(session, "info", `[LOOP HO\xC0I] \u0110\xE3 b\u1EADt ch\u1EBF \u0111\u1ED9 l\u1EB7p l\u1EA1i v\xF4 t\u1EADn (Infinite Loop) cho b\xE0i h\xE1t Novocaine.`);
            if (client._spotifyLoopTimer) clearInterval(client._spotifyLoopTimer);
            client._spotifyLoopTimer = setInterval(() => {
              if (session.isRunning) {
                applyDualPresence();
                appendLog(session, "info", `[LOOP] T\u1EF1 \u0111\u1ED9ng l\u1EB7p l\u1EA1i b\xE0i h\xE1t "Novocaine" t\u1EEB 00:00.`);
              }
            }, 21e4);
          } catch (e) {
            appendLog(session, "warn", `[ACTIVITY] L\u1ED7i presence: ${e.message}`);
            client.user.setPresence({
              status: config.status || "online",
              activities: [{ name: "Visual Studio Code", type: "PLAYING" }]
            });
          }
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              session: {
                userTag: session.userTag,
                userId: session.userId,
                avatarUrl: session.avatarUrl,
                status: session.status,
                device: session.device,
                isRunning: true
              }
            });
          }
        });
        client.on("messageCreate", async (message) => {
          if (message.author.id !== client.user.id) return;
          const content = message.content.trim();
          const p = config.prefix || ".";
          if (content === p + "help") {
            appendLog(session, "info", `[L\u1EC6NH NH\u1EACN DI\u1EC6N] \u0110\xE3 g\xF5 l\u1EC7nh: ${p}help`);
            try {
              await message.reply(`\u{1F4BB} **[DISCORD PC TREO ACC & STATUS]**
- \`${p}status pc\` : \u0110\u1ED5i icon online sang M\xE1y T\xEDnh (PC Desktop)
- \`${p}status mobile\` : \u0110\u1ED5i icon online sang \u0110i\u1EC7n Tho\u1EA1i (Mobile)
- \`${p}ping\` : Xem \u0111\u1ED9 tr\u1EC5 Gateway
- \`${p}help\` : Hi\u1EC3n th\u1ECB b\u1EA3ng l\u1EC7nh n\xE0y`);
              appendLog(session, "success", `[PH\u1EA2N H\u1ED2I L\u1EC6NH] \u0110\xE3 g\u1EEDi danh s\xE1ch l\u1EC7nh .help l\xEAn Discord`);
            } catch (err) {
              appendLog(session, "error", `L\u1ED7i reply .help: ${err.message}`);
            }
          } else if (content === p + "status pc") {
            appendLog(session, "info", `[L\u1EC6NH NH\u1EACN DI\u1EC6N] \u0110\xE3 g\xF5 l\u1EC7nh: ${p}status pc`);
            try {
              session.device = "desktop";
              sendGatewayPresence(client, {
                since: Date.now(),
                activities: client.user.presence.activities,
                status: client.user.presence.status,
                afk: false,
                client_status: { desktop: "online" }
              });
              await message.reply("\u{1F4BB} **[TH\xC0NH C\xD4NG]** \u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng **PC Desktop (M\xE1y T\xEDnh)**!");
              appendLog(session, "success", "\u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng PC Desktop th\xE0nh c\xF4ng");
            } catch (err) {
              appendLog(session, "error", `L\u1ED7i \u0111\u1ED5i status PC: ${err.message}`);
            }
          } else if (content === p + "status mobile") {
            appendLog(session, "info", `[L\u1EC6NH NH\u1EACN DI\u1EC6N] \u0110\xE3 g\xF5 l\u1EC7nh: ${p}status mobile`);
            try {
              session.device = "mobile";
              sendGatewayPresence(client, {
                since: Date.now(),
                activities: client.user.presence.activities,
                status: client.user.presence.status,
                afk: false,
                client_status: { mobile: "online" }
              });
              await message.reply("\u{1F4F1} **[TH\xC0NH C\xD4NG]** \u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng **Mobile (\u0110i\u1EC7n Tho\u1EA1i)**!");
              appendLog(session, "success", "\u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng Mobile th\xE0nh c\xF4ng");
            } catch (err) {
              appendLog(session, "error", `L\u1ED7i \u0111\u1ED5i status mobile: ${err.message}`);
            }
          } else if (content.startsWith(p + "stream")) {
            const parts = content.split(/\s+/);
            const targetChannelId = parts[1];
            if (!targetChannelId) {
              await message.reply(`\u26A0\uFE0F **C\xE1ch d\xF9ng:** \`${p}stream <ID_K\xEAnh_Voice>\`
V\xED d\u1EE5: \`${p}stream 123456789012345678\``);
              return;
            }
            try {
              const channel = await client.channels.fetch(targetChannelId).catch(() => null);
              const guildId = channel?.guildId || channel?.guild?.id;
              const streamPayload = {
                guild_id: guildId || null,
                channel_id: targetChannelId,
                self_mute: false,
                self_deaf: false,
                self_video: true,
                self_stream: true
              };
              if (typeof client.ws.broadcast === "function") {
                client.ws.broadcast({ op: 4, d: streamPayload });
              } else if (client.ws?.shards?.first()) {
                client.ws.shards.first().send({ op: 4, d: streamPayload });
              }
              session.isStreaming = true;
              session.streamChannelId = targetChannelId;
              session.streamGuildId = guildId || void 0;
              session.streamStartTime = Date.now();
              appendLog(session, "success", `[STREAM FARM] \u0110\xE3 b\u1EAFt \u0111\u1EA7u stream m\xE0n h\xECnh v\xE0o k\xEAnh voice: ${targetChannelId}`);
              await message.reply(`\u{1F4FA} **[B\u1EAET \u0110\u1EA6U TREO STREAM]**
- \u0110ang ph\xE1t m\xE0n h\xECnh (Screen Share) v\xE0o Voice: \`${targetChannelId}\`
- B\u1EADt s\u1EB5n \`self_stream: true\` & \`self_video: true\` \u0111\u1EC3 t\xEDnh gi\u1EDD c\xE0y Badge Streamer (M\u1ED1c 1h -> 5000h+)
- G\xF5 \`${p}stopstream\` \u0111\u1EC3 d\u1EEBng.`);
            } catch (err) {
              appendLog(session, "error", `L\u1ED7i b\u1EAFt \u0111\u1EA7u stream: ${err.message}`);
              await message.reply(`\u274C L\u1ED7i b\u1EADt stream: ${err.message}`);
            }
          } else if (content === p + "stopstream") {
            try {
              const leavePayload = {
                guild_id: session.streamGuildId || null,
                channel_id: null,
                self_mute: false,
                self_deaf: false,
                self_video: false,
                self_stream: false
              };
              if (typeof client.ws.broadcast === "function") {
                client.ws.broadcast({ op: 4, d: leavePayload });
              } else if (client.ws?.shards?.first()) {
                client.ws.shards.first().send({ op: 4, d: leavePayload });
              }
              session.isStreaming = false;
              session.streamStartTime = void 0;
              appendLog(session, "warn", "[STREAM FARM] \u0110\xE3 d\u1EEBng stream v\xE0 r\u1EDDi k\xEAnh voice.");
              await message.reply("\u23F9\uFE0F **[\u0110\xC3 D\u1EEANG STREAM]** \u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i stream v\xE0 r\u1EDDi ph\xF2ng voice.");
            } catch (err) {
              appendLog(session, "error", `L\u1ED7i d\u1EEBng stream: ${err.message}`);
              await message.reply(`\u274C L\u1ED7i d\u1EEBng stream: ${err.message}`);
            }
          } else if (content === p + "ping") {
            const currentPing = Math.round(client.ws.ping) || 20;
            session.ping = currentPing;
            await message.reply(`\u26A1 **Ping Gateway:** \`${currentPing}ms\``);
            appendLog(session, "info", `[L\u1EC6NH NH\u1EACN DI\u1EC6N] .ping -> ${currentPing}ms`);
          }
        });
        client.on("error", (err) => {
          appendLog(session, "error", `Gateway Client Error: ${err.message}`);
        });
        client.login(cleanToken).catch((err) => {
          session.isRunning = false;
          appendLog(session, "error", `[TH\u1EA4T B\u1EA0I] Token sai ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: `Token kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB Discord t\u1EEB ch\u1ED1i: ${err.message}` });
          }
        });
      } else {
        const client = new BotClient({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
          ]
        });
        session.clientInstance = client;
        client.once("ready", () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png";
          session.ping = Math.round(client.ws.ping) || 20;
          appendLog(session, "success", `[SUCCESS] Bot \u0111\xE3 \u0111\u0103ng nh\u1EADp: ${client.user.tag}`);
          client.user.setPresence({
            status: config.status || "online",
            activities: [{
              name: config.activityName || "Discord Bot",
              type: ActivityType.Playing
            }]
          });
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              session: {
                userTag: session.userTag,
                userId: session.userId,
                avatarUrl: session.avatarUrl,
                status: session.status,
                device: session.device,
                isRunning: true
              }
            });
          }
        });
        client.on("messageCreate", async (message) => {
          if (message.author.bot) return;
          const content = message.content.trim();
          const p = config.prefix || ".";
          if (content === p + "help") {
            message.reply(`\u{1F916} **B\u1EA3ng L\u1EC7nh Bot:**
- \`${p}help\` - H\u01B0\u1EDBng d\u1EABn
- \`${p}status pc\` - Tr\u1EA1ng th\xE1i PC
- \`${p}ping\` - Ping bot`);
            appendLog(session, "info", `Bot \u0111\xE3 ph\u1EA3n h\u1ED3i l\u1EC7nh .help t\u1EEB ${message.author.tag}`);
          } else if (content === p + "status pc") {
            message.reply("\u{1F4BB} Bot \u0111ang ch\u1EA1y tr\xEAn m\xF4i tr\u01B0\u1EDDng PC/Server 24/7.");
          } else if (content === p + "ping") {
            message.reply(`\u26A1 Ping: \`${client.ws.ping}ms\``);
          }
        });
        client.login(cleanToken).catch((err) => {
          session.isRunning = false;
          appendLog(session, "error", `[TH\u1EA4T B\u1EA0I] Bot Token sai: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: `Bot Token sai ho\u1EB7c thi\u1EBFu Intent: ${err.message}` });
          }
        });
      }
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (session.userTag && session.userTag !== "\u0110ang k\u1EBFt n\u1ED1i...") {
            resolve({ success: true, session });
          } else {
            resolve({ success: false, error: "H\u1EBFt th\u1EDDi gian k\u1EBFt n\u1ED1i (Timeout). H\xE3y ki\u1EC3m tra l\u1EA1i Token Discord c\u1EE7a b\u1EA1n." });
          }
        }
      }, 15e3);
    } catch (e) {
      appendLog(session, "error", `L\u1ED7i ngo\u1EA1i l\u1EC7: ${e.message}`);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: e.message });
      }
    }
  });
}
app.get("/api/live-status", (req, res) => {
  const session = activeSessions.get("primary");
  if (!session) {
    return res.json({ isRunning: false, logs: [] });
  }
  const currentUptime = session.isRunning ? Math.floor((Date.now() - session.connectedAt) / 1e3) : 0;
  res.json({
    isRunning: session.isRunning,
    userTag: session.userTag,
    userId: session.userId,
    avatarUrl: session.avatarUrl,
    status: session.status,
    device: session.device,
    activityName: session.activityName,
    activityType: session.activityType,
    prefix: session.prefix,
    maskedToken: session.maskedToken,
    tokenType: session.tokenType,
    uptime: currentUptime,
    ping: session.ping,
    isStreaming: session.isStreaming,
    streamChannelId: session.streamChannelId,
    streamUptime: session.isStreaming && session.streamStartTime ? Math.floor((Date.now() - session.streamStartTime) / 1e3) : 0,
    logs: session.logs
  });
});
app.post("/api/start-live", async (req, res) => {
  const { token, tokenType, status, device, activityName, activityType, details, state, prefix } = req.body;
  const targetToken = token || process.env.DISCORD_TOKEN;
  if (!targetToken) {
    return res.status(400).json({ success: false, error: "Ch\u01B0a c\xF3 DISCORD_TOKEN! Vui l\xF2ng nh\u1EADp token c\u1EE7a b\u1EA1n." });
  }
  const result = await startLiveSession({
    token: targetToken,
    tokenType: tokenType || "user",
    status: status || "online",
    device: device || "desktop",
    activityName: activityName || "Visual Studio Code",
    activityType: activityType || "PLAYING",
    details: details || "Treo PC 24/7",
    state: state || "Active",
    prefix: prefix || "."
  });
  res.json(result);
});
app.post("/api/stop-live", (req, res) => {
  const session = activeSessions.get("primary");
  if (session) {
    session.isRunning = false;
    if (session.clientInstance) {
      try {
        session.clientInstance.destroy();
      } catch {
      }
    }
    appendLog(session, "warn", "[D\u1EEANG] \u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i phi\xEAn treo Discord.");
    res.json({ success: true, message: "\u0110\xE3 d\u1EEBng bot th\xE0nh c\xF4ng." });
  } else {
    res.json({ success: true });
  }
});
app.post("/api/trigger-action", async (req, res) => {
  const { action } = req.body;
  const session = activeSessions.get("primary");
  if (!session || !session.isRunning || !session.clientInstance) {
    return res.status(400).json({ error: "Ch\u01B0a c\xF3 phi\xEAn treo acc n\xE0o \u0111ang ch\u1EA1y!" });
  }
  const client = session.clientInstance;
  try {
    if (action === "status_pc") {
      session.device = "desktop";
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { desktop: "online" }
      });
      appendLog(session, "success", "[WEB UI] \u0110\xE3 k\xEDch ho\u1EA1t chuy\u1EC3n \u0111\u1ED5i sang icon PC Desktop");
      return res.json({ success: true, message: "\u0110\xE3 chuy\u1EC3n sang PC Desktop" });
    }
    if (action === "status_mobile") {
      session.device = "mobile";
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { mobile: "online" }
      });
      appendLog(session, "success", "[WEB UI] \u0110\xE3 k\xEDch ho\u1EA1t chuy\u1EC3n \u0111\u1ED5i sang icon Mobile");
      return res.json({ success: true, message: "\u0110\xE3 chuy\u1EC3n sang Mobile" });
    }
    if (action === "dual_spotify_novocaine") {
      const now = Date.now();
      const songDuration = 21e4;
      const end = now + songDuration;
      const dualActivities = [
        {
          name: "Visual Studio Code",
          type: 0,
          application_id: "383226320970055681",
          details: "Treo PC 24/7",
          state: "Online",
          timestamps: { start: session.connectedAt },
          assets: {
            large_image: "1359299466493956258",
            // Verified VS Code
            large_text: "Visual Studio Code",
            small_image: "1359298971905822881",
            small_text: "Verified PC 24/7"
          }
        },
        {
          name: "Spotify",
          type: 2,
          flags: 48,
          details: "Novocaine",
          state: "Fall Out Boy",
          timestamps: { start: now, end },
          sync_id: "5F0bmCjKUufNz1bHXfgRwe",
          // Verified Spotify Track ID
          party: { id: `spotify:${client.user.id}` },
          assets: {
            large_image: "spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b",
            // Official Spotify Album Cover Hash
            large_text: "American Beauty/American Psycho"
          }
        }
      ];
      session.activityName = "VS Code + Spotify Novocaine";
      const osDevice = session.device === "mobile" ? "mobile" : "desktop";
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: dualActivities,
        status: session.status || "online",
        afk: false,
        client_status: { [osDevice]: "online" }
      });
      appendLog(session, "success", "[WEB UI] \u0110\xE3 k\xEDch ho\u1EA1t ch\u1EA1y c\xF9ng l\xFAc 2 c\xE1i: VS Code + Spotify Novocaine (Loop ho\xE0i)!");
      return res.json({ success: true, message: "\u0110\xE3 k\xEDch ho\u1EA1t ch\u1EBF \u0111\u1ED9 k\xE9p VS Code + Spotify Novocaine" });
    }
    if (action === "start_stream") {
      const channelId = req.body.channelId;
      if (!channelId) {
        return res.status(400).json({ error: "Ch\u01B0a cung c\u1EA5p ID ph\xF2ng Voice \u0111\u1EC3 stream!" });
      }
      try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        const guildId = channel?.guildId || channel?.guild?.id;
        const streamPayload = {
          guild_id: guildId || null,
          channel_id: channelId,
          self_mute: false,
          self_deaf: false,
          self_video: true,
          self_stream: true
        };
        if (typeof client.ws.broadcast === "function") {
          client.ws.broadcast({ op: 4, d: streamPayload });
        } else if (client.ws?.shards?.first()) {
          client.ws.shards.first().send({ op: 4, d: streamPayload });
        }
        session.isStreaming = true;
        session.streamChannelId = channelId;
        session.streamGuildId = guildId || void 0;
        session.streamStartTime = Date.now();
        appendLog(session, "success", `[WEB UI] B\u1EAFt \u0111\u1EA7u stream m\xE0n h\xECnh v\xE0o k\xEAnh voice: ${channelId} \u0111\u1EC3 c\xE0y Badge 5000h!`);
        return res.json({ success: true, message: `\u0110ang stream v\xE0o voice ${channelId}` });
      } catch (err) {
        appendLog(session, "error", `L\u1ED7i b\u1EAFt \u0111\u1EA7u stream: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
    }
    if (action === "stop_stream") {
      try {
        const leavePayload = {
          guild_id: session.streamGuildId || null,
          channel_id: null,
          self_mute: false,
          self_deaf: false,
          self_video: false,
          self_stream: false
        };
        if (typeof client.ws.broadcast === "function") {
          client.ws.broadcast({ op: 4, d: leavePayload });
        } else if (client.ws?.shards?.first()) {
          client.ws.shards.first().send({ op: 4, d: leavePayload });
        }
        session.isStreaming = false;
        session.streamStartTime = void 0;
        appendLog(session, "warn", "[WEB UI] \u0110\xE3 d\u1EEBng stream v\xE0 r\u1EDDi k\xEAnh voice.");
        return res.json({ success: true, message: "\u0110\xE3 d\u1EEBng stream v\xE0 r\u1EDDi ph\xF2ng voice" });
      } catch (err) {
        appendLog(session, "error", `L\u1ED7i d\u1EEBng stream: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(400).json({ error: "H\xE0nh \u0111\u1ED9ng kh\xF4ng h\u1EE3p l\u1EC7" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var BADGE_TIERS = [
  { level: 1, hours: 1, label: "Level 1: M\u1EDF Kh\xF3a Badge", desc: "1 gi\u1EDD stream c\xF3 ng\u01B0\u1EDDi xem" },
  { level: 2, hours: 10, label: "Level 2: T\u1EADp S\u1EF1", desc: "10 gi\u1EDD stream" },
  { level: 3, hours: 50, label: "Level 3: T\xE2n Binh", desc: "50 gi\u1EDD stream" },
  { level: 4, hours: 100, label: "Level 4: Th\u01B0\u1EDDng Ni\xEAn", desc: "100 gi\u1EDD stream" },
  { level: 5, hours: 250, label: "Level 5: Chuy\xEAn C\u1EA7n", desc: "250 gi\u1EDD stream" },
  { level: 6, hours: 500, label: "Level 6: B\u1EA1c (Silver)", desc: "500 gi\u1EDD stream" },
  { level: 7, hours: 1e3, label: "Level 7: V\xE0ng (Gold)", desc: "1,000 gi\u1EDD stream" },
  { level: 8, hours: 2500, label: "Level 8: B\u1EA1ch Kim (Platinum)", desc: "2,500 gi\u1EDD stream" },
  { level: 9, hours: 5e3, label: "Level 9: Kim C\u01B0\u01A1ng (Full 5000+ Gi\u1EDD)", desc: "5,000+ gi\u1EDD - C\u1EA5p t\u1ED1i \u0111a" }
];
function calculateBadgeProgress(totalSeconds) {
  const totalHours = totalSeconds / 3600;
  let currentTier = { level: 0, hours: 0, label: "Ch\u01B0a \u0110\u1EA1t C\u1EA5p", desc: "0 gi\u1EDD" };
  let nextTier = BADGE_TIERS[0];
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (totalHours >= BADGE_TIERS[i].hours) {
      currentTier = BADGE_TIERS[i];
      nextTier = BADGE_TIERS[i + 1] || null;
      break;
    }
  }
  let progress = 0;
  let remainingSeconds = 0;
  if (!nextTier) {
    progress = 100;
  } else {
    const prevHours = currentTier.hours;
    const targetHours = nextTier.hours;
    progress = Math.min(100, Math.max(0, (totalHours - prevHours) / (targetHours - prevHours) * 100));
    remainingSeconds = Math.max(0, targetHours * 3600 - totalSeconds);
  }
  return {
    totalHours: Number(totalHours.toFixed(2)),
    currentTier,
    nextTier,
    progress: Number(progress.toFixed(1)),
    remainingSeconds
  };
}
var streamFarmSession = {
  isActive: false,
  channelId: "",
  hasViewer: false,
  totalSeconds: 0,
  logs: []
};
function appendFarmLog(type, msg) {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN");
  streamFarmSession.logs.unshift({ time, type, msg });
  if (streamFarmSession.logs.length > 200) {
    streamFarmSession.logs.pop();
  }
}
function stopStreamFarm() {
  if (streamFarmSession.intervalTimer) {
    clearInterval(streamFarmSession.intervalTimer);
    streamFarmSession.intervalTimer = null;
  }
  if (streamFarmSession.streamerClient) {
    try {
      const leavePayload = {
        guild_id: streamFarmSession.guildId || null,
        channel_id: null,
        self_mute: false,
        self_deaf: false,
        self_video: false,
        self_stream: false
      };
      if (typeof streamFarmSession.streamerClient.ws?.broadcast === "function") {
        streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.streamerClient.destroy();
    } catch {
    }
    streamFarmSession.streamerClient = null;
  }
  if (streamFarmSession.viewerClient) {
    try {
      const leavePayload = {
        guild_id: streamFarmSession.guildId || null,
        channel_id: null,
        self_mute: false,
        self_deaf: false,
        self_video: false,
        self_stream: false
      };
      if (typeof streamFarmSession.viewerClient.ws?.broadcast === "function") {
        streamFarmSession.viewerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.viewerClient.destroy();
    } catch {
    }
    streamFarmSession.viewerClient = null;
  }
  streamFarmSession.isActive = false;
  appendFarmLog("warn", "\u0110\xE3 d\u1EEBng phi\xEAn c\xE0y Stream Badge v\xE0 r\u1EDDi ph\xF2ng voice.");
}
async function startStreamFarm(config) {
  stopStreamFarm();
  const cleanStreamerToken = config.streamerToken.trim().replace(/^"|"$/g, "");
  const cleanViewerToken = config.viewerToken ? config.viewerToken.trim().replace(/^"|"$/g, "") : "";
  const channelId = config.channelId.trim();
  if (!cleanStreamerToken) {
    return { success: false, error: "Token ng\u01B0\u1EDDi stream (Streamer) kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng!" };
  }
  if (!channelId) {
    return { success: false, error: "ID K\xEAnh Voice kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng!" };
  }
  streamFarmSession.channelId = channelId;
  streamFarmSession.hasViewer = Boolean(cleanViewerToken);
  appendFarmLog("info", `\u0110ang k\u1EBFt n\u1ED1i Streamer t\u1EDBi Voice Channel: ${channelId}...`);
  return new Promise((resolve) => {
    let resolved = false;
    try {
      const streamer = new SelfClient({
        checkUpdate: false,
        ws: {
          properties: {
            os: "Windows",
            browser: "Discord Client",
            device: "desktop"
          }
        }
      });
      streamFarmSession.streamerClient = streamer;
      streamer.once("ready", async () => {
        streamFarmSession.streamerTag = streamer.user.tag;
        streamFarmSession.streamerId = streamer.user.id;
        streamFarmSession.streamerAvatar = streamer.user.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png";
        appendFarmLog("success", `[STREAMER] \u0110\xE3 \u0111\u0103ng nh\u1EADp: ${streamer.user.tag}`);
        let guildId = null;
        try {
          const ch = await streamer.channels.fetch(channelId).catch(() => null);
          guildId = ch?.guildId || ch?.guild?.id || null;
          streamFarmSession.guildId = guildId || void 0;
        } catch {
        }
        const streamPayload = {
          guild_id: guildId,
          channel_id: channelId,
          self_mute: false,
          self_deaf: false,
          self_video: true,
          self_stream: true
        };
        if (typeof streamer.ws.broadcast === "function") {
          streamer.ws.broadcast({ op: 4, d: streamPayload });
        } else if (streamer.ws?.shards?.first()) {
          streamer.ws.shards.first().send({ op: 4, d: streamPayload });
        }
        sendGatewayPresence(streamer, {
          since: Date.now(),
          activities: [{
            name: "Screen Share 24/7 (Badge Farm)",
            type: 1,
            // Streaming
            url: "https://twitch.tv/discord",
            details: "C\xE0y Huy Hi\u1EC7u Streamer (5000+ Gi\u1EDD)",
            state: "\u0110ang ph\xE1t m\xE0n h\xECnh trong Voice"
          }],
          status: "online",
          afk: false,
          client_status: { desktop: "online" }
        });
        appendFarmLog("success", `[STREAMER] \u0110\xE3 k\xEDch ho\u1EA1t GO LIVE trong k\xEAnh voice: ${channelId}`);
        if (cleanViewerToken) {
          appendFarmLog("info", "[VIEWER] \u0110ang k\u1EBFt n\u1ED1i t\xE0i kho\u1EA3n ng\u01B0\u1EDDi xem (Viewer Bot)...");
          const viewer = new SelfClient({
            checkUpdate: false,
            ws: {
              properties: {
                os: "Windows",
                browser: "Discord Client",
                device: "desktop"
              }
            }
          });
          streamFarmSession.viewerClient = viewer;
          viewer.once("ready", async () => {
            streamFarmSession.viewerTag = viewer.user.tag;
            streamFarmSession.viewerId = viewer.user.id;
            streamFarmSession.viewerAvatar = viewer.user.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/1.png";
            appendFarmLog("success", `[VIEWER] \u0110\xE3 \u0111\u0103ng nh\u1EADp: ${viewer.user.tag}`);
            const viewerPayload = {
              guild_id: guildId,
              channel_id: channelId,
              self_mute: true,
              self_deaf: false,
              self_video: false,
              self_stream: false
            };
            if (typeof viewer.ws.broadcast === "function") {
              viewer.ws.broadcast({ op: 4, d: viewerPayload });
            } else if (viewer.ws?.shards?.first()) {
              viewer.ws.shards.first().send({ op: 4, d: viewerPayload });
            }
            appendFarmLog("success", `[VIEWER] \u0110\xE3 v\xE0o ph\xF2ng voice ${channelId} v\xE0 \u0111ang xem stream! Gi\u1EDD c\xE0y badge b\u1EAFt \u0111\u1EA7u \u0111\u01B0\u1EE3c Discord t\xEDnh!`);
          });
          viewer.login(cleanViewerToken).catch((err) => {
            appendFarmLog("error", `[VIEWER] \u0110\u0103ng nh\u1EADp t\xE0i kho\u1EA3n xem th\u1EA5t b\u1EA1i: ${err.message}`);
          });
        } else {
          appendFarmLog("warn", "[L\u01AFU \xDD] Ch\u01B0a c\xF3 token Viewer. H\xE3y \u0111\u1EA3m b\u1EA3o b\u1EA1n ho\u1EB7c ai \u0111\xF3 v\xE0o ph\xF2ng voice xem stream th\xEC Discord m\u1EDBi t\xEDnh gi\u1EDD!");
        }
        streamFarmSession.isActive = true;
        streamFarmSession.startedAt = Date.now();
        let counter = 0;
        streamFarmSession.intervalTimer = setInterval(() => {
          if (!streamFarmSession.isActive) return;
          streamFarmSession.totalSeconds += 1;
          counter += 1;
          if (counter % 120 === 0 && streamFarmSession.streamerClient) {
            const keepAlivePayload = {
              guild_id: streamFarmSession.guildId || null,
              channel_id: streamFarmSession.channelId,
              self_mute: false,
              self_deaf: false,
              self_video: true,
              self_stream: true
            };
            if (typeof streamFarmSession.streamerClient.ws?.broadcast === "function") {
              streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: keepAlivePayload });
            }
          }
        }, 1e3);
        if (!resolved) {
          resolved = true;
          resolve({ success: true });
        }
      });
      streamer.login(cleanStreamerToken).catch((err) => {
        appendFarmLog("error", `[STREAMER] \u0110\u0103ng nh\u1EADp th\u1EA5t b\u1EA1i: ${err.message}`);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: `Token Streamer l\u1ED7i: ${err.message}` });
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (streamFarmSession.isActive) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: "H\u1EBFt th\u1EDDi gian ch\u1EDD k\u1EBFt n\u1ED1i Discord (15s)." });
          }
        }
      }, 15e3);
    } catch (err) {
      appendFarmLog("error", `L\u1ED7i: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: err.message });
      }
    }
  });
}
app.get("/api/stream-farm/status", (req, res) => {
  const badgeInfo = calculateBadgeProgress(streamFarmSession.totalSeconds);
  res.json({
    isActive: streamFarmSession.isActive,
    channelId: streamFarmSession.channelId,
    hasViewer: streamFarmSession.hasViewer,
    streamer: streamFarmSession.streamerTag ? {
      tag: streamFarmSession.streamerTag,
      id: streamFarmSession.streamerId,
      avatar: streamFarmSession.streamerAvatar
    } : null,
    viewer: streamFarmSession.viewerTag ? {
      tag: streamFarmSession.viewerTag,
      id: streamFarmSession.viewerId,
      avatar: streamFarmSession.viewerAvatar
    } : null,
    startedAt: streamFarmSession.startedAt,
    totalSeconds: streamFarmSession.totalSeconds,
    badgeProgress: badgeInfo,
    allTiers: BADGE_TIERS,
    logs: streamFarmSession.logs
  });
});
app.post("/api/stream-farm/start", async (req, res) => {
  const { streamerToken, viewerToken, channelId } = req.body;
  const targetStreamerToken = streamerToken || process.env.DISCORD_TOKEN;
  const targetViewerToken = viewerToken || process.env.VIEWER_DISCORD_TOKEN;
  const targetChannelId = channelId || process.env.STREAM_VOICE_CHANNEL_ID;
  if (!targetStreamerToken) {
    return res.status(400).json({ success: false, error: "Ch\u01B0a c\xF3 Token ng\u01B0\u1EDDi stream!" });
  }
  if (!targetChannelId) {
    return res.status(400).json({ success: false, error: "Ch\u01B0a cung c\u1EA5p ID K\xEAnh Voice!" });
  }
  const result = await startStreamFarm({
    streamerToken: targetStreamerToken,
    viewerToken: targetViewerToken,
    channelId: targetChannelId
  });
  res.json(result);
});
app.post("/api/stream-farm/stop", (req, res) => {
  stopStreamFarm();
  res.json({ success: true, message: "\u0110\xE3 d\u1EEBng c\xE0y stream badge th\xE0nh c\xF4ng." });
});
var scienceSpooferSession = {
  isRunning: false,
  mode: "idle",
  totalGames: 0,
  processedGames: 0,
  totalHoursAdded: 0,
  hoursPerGame: 5,
  currentBatch: 0,
  totalBatches: 0,
  userTag: "",
  logs: [],
  error: null,
  abortController: null
};
function appendScienceLog(type, msg) {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN");
  scienceSpooferSession.logs.unshift({ time, type, msg });
  if (scienceSpooferSession.logs.length > 300) scienceSpooferSession.logs.pop();
}
var DISCORD_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 Electron/42.7.1 Safari/537.36";
var SCIENCE_URL = "https://discord.com/api/v9/science";
var ME_URL = "https://discord.com/api/v9/users/@me?with_analytics_token=true";
function createSuperProps(launchSig, hbSession) {
  const props = {
    os: "Windows",
    browser: "Discord Client",
    release_channel: "stable",
    client_version: "1.0.9253",
    os_version: "10.0.26200",
    os_arch: "x64",
    app_arch: "x64",
    system_locale: "vi-VN",
    has_client_mods: false,
    browser_user_agent: DISCORD_USER_AGENT,
    browser_version: "42.7.1",
    os_sdk_version: "26200",
    client_build_number: 594031,
    native_build_number: 88414,
    client_launch_id: crypto.randomUUID(),
    launch_signature: launchSig,
    client_heartbeat_session_id: hbSession,
    client_event_source: null,
    client_app_state: "focused"
  };
  return Buffer.from(JSON.stringify(props)).toString("base64");
}
async function getAnalyticsToken(authToken) {
  const res = await fetch(ME_URL, {
    headers: {
      "authorization": authToken,
      "user-agent": DISCORD_USER_AGENT
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB Discord t\u1EEB ch\u1ED1i (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (!data.analytics_token) {
    throw new Error("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c analytics_token t\u1EEB Discord. Token c\xF3 th\u1EC3 b\u1ECB h\u1EA1n ch\u1EBF.");
  }
  const username = data.username ? `${data.username}#${data.discriminator || "0"}` : "Discord User";
  return { token: data.analytics_token, username };
}
function getDetectableGamesList() {
  const gamesPath = path.resolve(__dirname, "data", "games.json");
  if (fs.existsSync(gamesPath)) {
    try {
      const raw = fs.readFileSync(gamesPath, "utf-8");
      const data = JSON.parse(raw);
      const list = [];
      const seen = /* @__PURE__ */ new Set();
      for (const entry of data) {
        const gid = String(entry.id || "");
        if (!gid || seen.has(gid)) continue;
        const exeEntry = entry.executables?.find((e) => e.os === "win32" && e.name);
        if (exeEntry) {
          seen.add(gid);
          list.push({
            id: gid,
            name: entry.name || "Unknown Game",
            exe: exeEntry.name
          });
        }
      }
      if (list.length > 0) return list;
    } catch {
    }
  }
  return [
    { id: "356869127241072640", name: "League of Legends", exe: "LeagueClient.exe" },
    { id: "700136079562375258", name: "VALORANT", exe: "VALORANT-Win64-Shipping.exe" },
    { id: "356875221078245376", name: "Counter-Strike 2", exe: "cs2.exe" },
    { id: "356875544308088832", name: "Grand Theft Auto V", exe: "GTA5.exe" },
    { id: "356877714847825920", name: "Minecraft", exe: "Minecraft.exe" },
    { id: "356875883241406464", name: "Roblox", exe: "RobloxPlayerBeta.exe" },
    { id: "535533809639194624", name: "Apex Legends", exe: "r5apex.exe" },
    { id: "438122941372891136", name: "Fortnite", exe: "FortniteClient-Win64-Shipping.exe" },
    { id: "356874945533444096", name: "Dota 2", exe: "dota2.exe" },
    { id: "444211980379291660", name: "Genshin Impact", exe: "GenshinImpact.exe" },
    { id: "365975542446686208", name: "Overwatch 2", exe: "Overwatch.exe" },
    { id: "356876770114404352", name: "Rainbow Six Siege", exe: "RainbowSix.exe" },
    { id: "356877002495623168", name: "Rust", exe: "RustClient.exe" },
    { id: "727932641721974794", name: "Cyberpunk 2077", exe: "Cyberpunk2077.exe" }
  ];
}
async function startScienceSpoofer(config) {
  if (scienceSpooferSession.isRunning) {
    throw new Error("M\u1ED9t ti\u1EBFn tr\xECnh Spoofer \u0111ang ch\u1EA1y. Vui l\xF2ng nh\u1EA5n D\u1EEBng tr\u01B0\u1EDBc khi ch\u1EA1y l\u1EA1i!");
  }
  const cleanToken = config.token.trim().replace(/^"|"$/g, "");
  if (!cleanToken) throw new Error("Vui l\xF2ng nh\u1EADp Token Discord!");
  scienceSpooferSession.isRunning = true;
  scienceSpooferSession.mode = config.mode;
  scienceSpooferSession.processedGames = 0;
  scienceSpooferSession.totalHoursAdded = 0;
  scienceSpooferSession.hoursPerGame = config.hoursPerGame || 5;
  scienceSpooferSession.error = null;
  scienceSpooferSession.abortController = new AbortController();
  appendScienceLog("info", `[SPOOFER] \u0110ang kh\u1EDFi \u0111\u1ED9ng ch\u1EBF \u0111\u1ED9: ${config.mode === "5000_hours" ? "5,000+ Gi\u1EDD Game" : "100+ Games Played"}...`);
  (async () => {
    try {
      appendScienceLog("info", "[1/4] \u0110ang l\u1EA5y Analytics Token t\u1EEB Discord API...");
      const { token: analyticsToken, username } = await getAnalyticsToken(cleanToken);
      scienceSpooferSession.userTag = username;
      appendScienceLog("success", `[2/4] X\xE1c th\u1EF1c th\xE0nh c\xF4ng: ${username} (Analytics Token OK)`);
      const allGames = getDetectableGamesList();
      const targetGames = config.mode === "5000_hours" ? allGames.slice(0, 1e3) : allGames.slice(0, 150);
      scienceSpooferSession.totalGames = targetGames.length;
      scienceSpooferSession.totalBatches = Math.ceil(targetGames.length / 100);
      appendScienceLog("info", `[3/4] \u0110\xE3 t\u1EA3i ${targetGames.length} t\u1EF1a game ch\xEDnh th\u1EE9c t\u1EEB Discord CDN.`);
      const hbSession = crypto.randomUUID();
      const launchSig = crypto.randomUUID();
      const superProps = createSuperProps(launchSig, hbSession);
      const hours = config.hoursPerGame || 5;
      const durationMs = Math.floor(hours * 3600 * 1e3);
      let seq = 0;
      const BATCH_SIZE = 100;
      for (let i = 0; i < targetGames.length; i += BATCH_SIZE) {
        if (!scienceSpooferSession.isRunning || scienceSpooferSession.abortController?.signal.aborted) {
          appendScienceLog("warn", "[SPOOFER] Ng\u01B0\u1EDDi d\xF9ng \u0111\xE3 d\u1EEBng ti\u1EBFn tr\xECnh.");
          break;
        }
        const chunk = targetGames.slice(i, i + BATCH_SIZE);
        scienceSpooferSession.currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const events = [];
        for (const game of chunk) {
          const now = Date.now();
          const jitter = Math.floor((Math.random() * 0.1 - 0.05) * durationMs);
          const actualDuration = Math.max(6e4, durationMs + jitter);
          const startTs = now - actualDuration;
          const sid = crypto.randomUUID();
          seq += 1;
          const initialHb = {
            type: "running_game_heartbeat",
            properties: {
              client_track_timestamp: startTs,
              client_heartbeat_session_id: hbSession,
              event_sequence_number: seq,
              game_id: game.id,
              game_name: game.name,
              game_metadata: null,
              game_executable: game.exe,
              game_detection_enabled: true,
              initial_heartbeat: true,
              final_heartbeat: false,
              game_session_id: sid,
              duration_tracked_ms: 0,
              rtc_connection_id: null,
              media_session_id: null,
              launch_signature: launchSig,
              client_app_state: "focused",
              client_send_timestamp: startTs
            }
          };
          seq += 1;
          const launchEvent = {
            type: "launch_game",
            properties: {
              client_track_timestamp: startTs + 100,
              client_heartbeat_session_id: hbSession,
              event_sequence_number: seq,
              game: game.name,
              game_id: game.id,
              verified: true,
              elevated: false,
              is_launcher: false,
              game_platform: "desktop",
              detection_method: "verified_game",
              is_overlay_enabled: false,
              is_overlay_game_enabled: true,
              is_overlay_game_source: "OOP_DEFAULT_DATABASE",
              fullscreen_type: "UNKNOWN",
              hardware_display_count: 1,
              overlay_method: "Disabled",
              activity_status_enabled: true,
              activity_status_shared_guilds: [],
              current_user_status: "online",
              game_detection_enabled: true,
              executable_path: game.exe,
              voice_channel_id: null,
              voice_channel_type: null,
              voice_channel_bitrate: null,
              voice_channel_guild_id: null,
              hidden_by_distributor: false,
              game_metadata: null,
              accessibility_features: 0,
              rendered_locale: "vi-VN",
              launch_signature: launchSig,
              client_rtc_state: null,
              client_app_state: "focused",
              client_send_timestamp: startTs + 100
            }
          };
          seq += 1;
          const finalHb = {
            type: "running_game_heartbeat",
            properties: {
              client_track_timestamp: now,
              client_heartbeat_session_id: hbSession,
              event_sequence_number: seq,
              game_id: game.id,
              game_name: game.name,
              game_metadata: null,
              game_executable: game.exe,
              game_detection_enabled: true,
              initial_heartbeat: false,
              final_heartbeat: true,
              game_session_id: sid,
              duration_tracked_ms: actualDuration,
              rtc_connection_id: null,
              media_session_id: null,
              launch_signature: launchSig,
              client_app_state: "focused",
              client_send_timestamp: now
            }
          };
          events.push(initialHb, launchEvent, finalHb);
        }
        const payload = {
          token: analyticsToken,
          events
        };
        const headers = {
          "accept": "*/*",
          "accept-language": "vi-VN",
          "authorization": cleanToken,
          "content-type": "application/json",
          "origin": "https://discord.com",
          "referer": "https://discord.com/channels/@me",
          "user-agent": DISCORD_USER_AGENT,
          "x-super-properties": superProps
        };
        if (config.cookie && config.cookie.trim()) {
          headers["cookie"] = config.cookie.trim();
        }
        const postRes = await fetch(SCIENCE_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (postRes.status === 204) {
          scienceSpooferSession.processedGames += chunk.length;
          scienceSpooferSession.totalHoursAdded += chunk.length * hours;
          appendScienceLog("success", `[G\xF3i ${scienceSpooferSession.currentBatch}/${scienceSpooferSession.totalBatches}] B\u1EAFn th\xE0nh c\xF4ng ${chunk.length} game (\u0110\xE3 b\u1EAFn: ${scienceSpooferSession.processedGames}/${targetGames.length} game ~ ${scienceSpooferSession.totalHoursAdded}h)`);
        } else if (postRes.status === 401 || postRes.status === 403) {
          const errBody = await postRes.text();
          appendScienceLog("error", `[HTTP ${postRes.status}] B\u1ECB t\u1EEB ch\u1ED1i quy\u1EC1n. H\xE3y th\xEAm Cookie t\u1EEB F12 ho\u1EB7c l\xE0m m\u1EDBi Token: ${errBody}`);
          scienceSpooferSession.error = `B\u1ECB t\u1EEB ch\u1ED1i (${postRes.status}). Vui l\xF2ng nh\u1EADp th\xEAm Cookie trong Network f12!`;
          break;
        } else {
          appendScienceLog("warn", `[HTTP ${postRes.status}] Ph\u1EA3n h\u1ED3i t\u1EEB Discord Science endpoint.`);
          scienceSpooferSession.processedGames += chunk.length;
          scienceSpooferSession.totalHoursAdded += chunk.length * hours;
        }
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      }
      if (scienceSpooferSession.processedGames > 0) {
        appendScienceLog("success", `\u{1F389} HO\xC0N T\u1EA4T! \u0110\xE3 t\u0103ng th\xE0nh c\xF4ng ~${scienceSpooferSession.totalHoursAdded} gi\u1EDD tr\xEAn h\u1ED3 s\u01A1 Discord! M\u1EDF Discord ki\u1EC3m tra Profile!`);
      }
    } catch (err) {
      appendScienceLog("error", `L\u1ED7i Spoofer: ${err.message}`);
      scienceSpooferSession.error = err.message;
    } finally {
      scienceSpooferSession.isRunning = false;
    }
  })();
}
function stopScienceSpoofer() {
  if (scienceSpooferSession.abortController) {
    scienceSpooferSession.abortController.abort();
  }
  scienceSpooferSession.isRunning = false;
  appendScienceLog("warn", "[SPOOFER] \u0110\xE3 g\u1EEDi l\u1EC7nh d\u1EEBng ti\u1EBFn tr\xECnh.");
}
app.get("/api/science-spoofer/status", (req, res) => {
  res.json({
    isRunning: scienceSpooferSession.isRunning,
    mode: scienceSpooferSession.mode,
    totalGames: scienceSpooferSession.totalGames,
    processedGames: scienceSpooferSession.processedGames,
    totalHoursAdded: scienceSpooferSession.totalHoursAdded,
    hoursPerGame: scienceSpooferSession.hoursPerGame,
    currentBatch: scienceSpooferSession.currentBatch,
    totalBatches: scienceSpooferSession.totalBatches,
    userTag: scienceSpooferSession.userTag,
    error: scienceSpooferSession.error,
    logs: scienceSpooferSession.logs
  });
});
app.post("/api/science-spoofer/start", async (req, res) => {
  try {
    const { token, cookie, hoursPerGame, mode } = req.body;
    const targetToken = token || process.env.DISCORD_TOKEN;
    if (!targetToken) {
      return res.status(400).json({ success: false, error: "Ch\u01B0a c\xF3 Token Discord!" });
    }
    await startScienceSpoofer({
      token: targetToken,
      cookie: cookie || "",
      hoursPerGame: Number(hoursPerGame) || 5,
      mode: mode === "100_games" ? "100_games" : "5000_hours"
    });
    res.json({ success: true, message: "\u0110\xE3 b\u1EAFt \u0111\u1EA7u ti\u1EBFn tr\xECnh Spoofer th\xE0nh c\xF4ng." });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/science-spoofer/stop", (req, res) => {
  stopScienceSpoofer();
  res.json({ success: true, message: "\u0110\xE3 d\u1EEBng ti\u1EBFn tr\xECnh Spoofer." });
});
app.get("/api/download/python-spoofer-5000h", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "scripts", "discord_science_spoofer_5000h.py");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="discord_science_spoofer_5000h.py"');
    res.setHeader("Content-Type", "text/x-python");
    return res.sendFile(filePath);
  }
  res.status(404).send("File not found");
});
app.get("/api/download/python-spoofer-100games", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "scripts", "discord_science_spoofer_100games.py");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="discord_science_spoofer_100games.py"');
    res.setHeader("Content-Type", "text/x-python");
    return res.sendFile(filePath);
  }
  res.status(404).send("File not found");
});
app.get("/api/stream-farm/export-script", (req, res) => {
  const scriptContent = `/**
 * DISCORD STREAMING BADGE FARMER (1H -> 5000H+ MAX TIER)
 * T\u1EF1 \u0111\u1ED9ng treo ph\xE1t stream m\xE0n h\xECnh trong Voice Channel
 * C\xF3 k\xE8m ch\u1EBF \u0111\u1ED9 t\u1EF1 \u0111\u1ED9ng cho 1 Acc ph\u1EE5 v\xE0o xem \u0111\u1EC3 Discord t\xEDnh gi\u1EDD 24/7!
 */
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { Client } = require('discord.js-selfbot-v13');

const STREAMER_TOKEN = process.env.DISCORD_TOKEN;
const VIEWER_TOKEN = process.env.VIEWER_DISCORD_TOKEN || '';
const VOICE_CHANNEL_ID = process.env.STREAM_VOICE_CHANNEL_ID;

if (!STREAMER_TOKEN || !VOICE_CHANNEL_ID) {
  console.error('[L\u1ED6I] C\u1EA7n thi\u1EBFt l\u1EADp bi\u1EBFn DISCORD_TOKEN v\xE0 STREAM_VOICE_CHANNEL_ID trong .env!');
  process.exit(1);
}

const streamer = new Client({
  checkUpdate: false,
  ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
});

streamer.once('ready', async () => {
  console.log(\`[STREAMER] \u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng: \${streamer.user.tag}\`);

  let guildId = null;
  try {
    const ch = await streamer.channels.fetch(VOICE_CHANNEL_ID);
    guildId = ch?.guildId || ch?.guild?.id;
  } catch (e) {
    console.error('[STREAMER] Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c guild ID:', e.message);
  }

  // B\u1EADt Go Live Stream
  const streamPayload = {
    guild_id: guildId,
    channel_id: VOICE_CHANNEL_ID,
    self_mute: false,
    self_deaf: false,
    self_video: true,
    self_stream: true
  };

  if (typeof streamer.ws.broadcast === 'function') {
    streamer.ws.broadcast({ op: 4, d: streamPayload });
  } else if (streamer.ws?.shards?.first()) {
    streamer.ws.shards.first().send({ op: 4, d: streamPayload });
  }

  console.log(\`[STREAMER] >>> \u0110ANG PH\xC1T M\xC0N H\xCCNH T\u1EA0I K\xCANH VOICE: \${VOICE_CHANNEL_ID} <<<\`);
  console.log('[STREAMER] \u0110ang t\xEDch l\u0169y gi\u1EDD c\xE0y badge...');

  // Gi\u1EEF k\u1EBFt n\u1ED1i li\xEAn t\u1EE5c
  setInterval(() => {
    if (typeof streamer.ws.broadcast === 'function') {
      streamer.ws.broadcast({ op: 4, d: streamPayload });
    }
  }, 120000);
});

// Kh\u1EDFi ch\u1EA1y Viewer n\u1EBFu c\xF3 token ph\u1EE5
if (VIEWER_TOKEN) {
  const viewer = new Client({
    checkUpdate: false,
    ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
  });

  viewer.once('ready', async () => {
    console.log(\`[VIEWER] \u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng acc xem: \${viewer.user.tag}\`);

    let guildId = null;
    try {
      const ch = await viewer.channels.fetch(VOICE_CHANNEL_ID);
      guildId = ch?.guildId || ch?.guild?.id;
    } catch {}

    const viewerPayload = {
      guild_id: guildId,
      channel_id: VOICE_CHANNEL_ID,
      self_mute: true,
      self_deaf: false,
      self_video: false,
      self_stream: false
    };

    if (typeof viewer.ws.broadcast === 'function') {
      viewer.ws.broadcast({ op: 4, d: viewerPayload });
    } else if (viewer.ws?.shards?.first()) {
      viewer.ws.shards.first().send({ op: 4, d: viewerPayload });
    }

    console.log('[VIEWER] >>> \u0110\xC3 V\xC0O PH\xD2NG XEM STREAM H\u1ED8 (Gi\u1EDD b\u1EAFt \u0111\u1EA7u \u0111\u01B0\u1EE3c t\xEDnh!) <<<');
  });

  viewer.login(VIEWER_TOKEN);
} else {
  console.log('[CH\xDA \xDD] Kh\xF4ng c\xF3 VIEWER_DISCORD_TOKEN. H\xE3y cho 1 acc ho\u1EB7c b\u1EA1n b\xE8 v\xE0o ph\xF2ng xem \u0111\u1EC3 t\xEDnh gi\u1EDD.');
}

streamer.login(STREAMER_TOKEN);
`;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(scriptContent);
});
app.post("/api/generate-code", (req, res) => {
  const { token, tokenType, status, activityType, activityName, details, state, prefix, device } = req.body;
  const customPrefix = prefix || ".";
  const isSelfbot = tokenType !== "bot";
  const osDevice = device === "mobile" ? "iOS" : "Windows";
  const browserDevice = device === "mobile" ? "Discord iOS" : "Discord Client";
  const deviceType = device === "mobile" ? "mobile" : "desktop";
  const botCode = isSelfbot ? `/**
 * DISCORD 24/7 TREO ACC - PC STATUS & SPOTIFY NOVOCAINE DUAL MODE
 * Ready for hosting on RENDER.COM / VPS / PC 24/7
import http from 'http';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { Client } = require('discord.js-selfbot-v13');

const TOKEN = process.env.DISCORD_TOKEN || '${token || "YOUR_DISCORD_TOKEN_HERE"}';
const PREFIX = '${customPrefix}';
const PORT = process.env.PORT || 3000;

// Keep-Alive Web Server for Render.com
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Discord Treo Acc 24/7 is RUNNING on Render!</h1>');
});
server.listen(PORT, () => {
  console.log(\`[Render Healthcheck] Web service running on port \${PORT}\`);
});

const client = new Client({
  checkUpdate: false,
  ws: {
    properties: {
      os: '${osDevice}',
      browser: '${browserDevice}',
      device: '${deviceType}'
    }
  }
});

// Safe presence broadcast helper
function sendPresence(data) {
  const packet = { op: 3, d: data };
  if (typeof client.ws.broadcast === 'function') {
    client.ws.broadcast(packet);
  } else if (client.ws.shards && client.ws.shards.first()) {
    client.ws.shards.first().send(packet);
  } else if (typeof client.ws.send === 'function') {
    client.ws.send(packet);
  }
}

const startTime = Date.now();

function updateDualPresence() {
  const now = Date.now();
  const songDuration = 210000; // 3m 30s
  const end = now + songDuration;

  const activities = [
    // 1. Visual Studio Code PC Activity
    {
      name: '${activityName || "Visual Studio Code"}',
      type: 0, // Playing
      application_id: '383226320970055681',
      details: '${details || "Treo PC 24/7"}',
      state: '${state || "Online"}',
      timestamps: { start: startTime },
      assets: {
        large_image: '1359299466493956258', // Verified VS Code
        large_text: 'Visual Studio Code',
        small_image: '1359298971905822881',
        small_text: 'Verified PC 24/7'
      }
    },
    // 2. Spotify - Novocaine with REAL ALBUM ARTWORK & INFINITE LOOP
    {
      name: 'Spotify',
      type: 2, // Listening
      flags: 48,
      details: 'Novocaine',
      state: 'Fall Out Boy',
      timestamps: {
        start: now,
        end: end
      },
      sync_id: '5F0bmCjKUufNz1bHXfgRwe', // Official Spotify Track ID
      party: {
        id: \`spotify:\${client.user.id}\`
      },
      assets: {
        large_image: 'spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b', // Official Spotify Album Cover Hash
        large_text: 'American Beauty/American Psycho'
      }
    }
  ];

  sendPresence({
    since: Date.now(),
    activities: activities,
    status: '${status || "online"}',
    afk: false,
    client_status: { '${deviceType}': 'online' }
  });
}

client.on('ready', async () => {
  console.log(\`===============================================\`);
  console.log(\` [TH\xC0NH C\xD4NG] Logged in as: \${client.user.tag}\`);
  console.log(\` [DUAL STATUS] \u0110ang treo 2 c\xE1i: VS Code + Spotify Novocaine!\`);
  console.log(\` [LOOP HO\xC0I]   \u0110ang l\u1EB7p l\u1EA1i b\xE0i h\xE1t Novocaine v\xF4 t\u1EADn 24/7\`);
  console.log(\` [L\u1EC6NH S\u1EB4N]   G\xF5 \${PREFIX}help trong Discord \u0111\u1EC3 xem l\u1EC7nh\`);
  console.log(\`===============================================\`);

  updateDualPresence();

  // Loop b\xE0i h\xE1t Novocaine m\u1ED7i 3 ph\xFAt 30 gi\xE2y (210s)
  setInterval(() => {
    updateDualPresence();
    console.log('[Loop] \u0110\xE3 reset l\u1EA1i b\xE0i h\xE1t Novocaine t\u1EEB 00:00');
  }, 210000);
});

// X\u1EED l\xFD l\u1EC7nh tr\u1EF1c ti\u1EBFp tr\xEAn Discord
client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;
  const content = message.content.trim();

  if (content === PREFIX + 'help') {
    await message.reply(\`\u{1F4BB} **[DISCORD PC TREO ACC & STREAM FARM BADGE]**\\n- \\\`\${PREFIX}status pc\\\` : \u0110\u1ED5i sang icon M\xE1y T\xEDnh (PC)\\n- \\\`\${PREFIX}status mobile\\\` : \u0110\u1ED5i sang icon \u0110i\u1EC7n Tho\u1EA1i\\n- \\\`\${PREFIX}stream <ID_Voice>\\\` : B\u1EADt ph\xE1t stream gi\u1EA3 l\u1EADp c\xE0y Badge (1h -> 5000h)\\n- \\\`\${PREFIX}stopstream\\\` : D\u1EEBng stream v\xE0 r\u1EDDi ph\xF2ng voice\\n- \\\`\${PREFIX}ping\\\` : Xem \u0111\u1ED9 tr\u1EC5 m\u1EA1ng\\n- \\\`\${PREFIX}help\\\` : Hi\u1EC3n th\u1ECB b\u1EA3ng n\xE0y\`);
  }

  if (content === PREFIX + 'status pc') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { desktop: 'online' }
    });
    await message.reply('\u{1F4BB} **[TH\xC0NH C\xD4NG]** \u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng PC Desktop!');
  }

  if (content === PREFIX + 'status mobile') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { mobile: 'online' }
    });
    await message.reply('\u{1F4F1} **[TH\xC0NH C\xD4NG]** \u0110\xE3 chuy\u1EC3n sang bi\u1EC3u t\u01B0\u1EE3ng \u0110i\u1EC7n Tho\u1EA1i (Mobile)!');
  }

  if (content.startsWith(PREFIX + 'stream')) {
    const targetChannelId = content.split(/\\s+/)[1];
    if (!targetChannelId) {
      return message.reply(\`\u26A0\uFE0F **C\xE1ch d\xF9ng:** \\\`\${PREFIX}stream <ID_K\xEAnh_Voice>\\\`\\nV\xED d\u1EE5: \\\`\${PREFIX}stream 123456789012345678\\\`\`);
    }
    const channel = await client.channels.fetch(targetChannelId).catch(() => null);
    const guildId = channel?.guildId || channel?.guild?.id;
    const packet = {
      guild_id: guildId || null,
      channel_id: targetChannelId,
      self_mute: false,
      self_deaf: false,
      self_video: true,
      self_stream: true
    };
    if (typeof client.ws.broadcast === 'function') {
      client.ws.broadcast({ op: 4, d: packet });
    } else if (client.ws?.shards?.first()) {
      client.ws.shards.first().send({ op: 4, d: packet });
    }
    await message.reply(\`\u{1F4FA} **[B\u1EAET \u0110\u1EA6U TREO STREAM C\xC0Y BADGE]**\\n- \u0110ang ph\xE1t m\xE0n h\xECnh v\xE0o Voice: \\\`\${targetChannelId}\\\`\\n- T\u1EF1 \u0111\u1ED9ng b\u1EADt \\\`self_stream: true\\\` & \\\`self_video: true\\\` \u0111\u1EC3 c\xE0y gi\u1EDD (M\u1ED1c 1h -> 5000h+)\\n- G\xF5 \\\`\${PREFIX}stopstream\\\` \u0111\u1EC3 d\u1EEBng.\`);
  }

  if (content === PREFIX + 'stopstream') {
    const packet = {
      guild_id: null,
      channel_id: null,
      self_mute: false,
      self_deaf: false,
      self_video: false,
      self_stream: false
    };
    if (typeof client.ws.broadcast === 'function') {
      client.ws.broadcast({ op: 4, d: packet });
    } else if (client.ws?.shards?.first()) {
      client.ws.shards.first().send({ op: 4, d: packet });
    }
    await message.reply('\u23F9\uFE0F **[\u0110\xC3 D\u1EEANG STREAM]** \u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i stream v\xE0 r\u1EDDi ph\xF2ng voice.');
  }

  if (content === PREFIX + 'ping') {
    await message.reply(\`\u26A1 \u0110\u1ED9 tr\u1EC5 Gateway: \\\`\${Math.round(client.ws.ping) || 20}ms\\\`\`);
  }
});

// T\u1EF1 \u0111\u1ED9ng k\u1EBFt n\u1ED1i l\u1EA1i khi r\u1EDBt m\u1EA1ng
process.on('unhandledRejection', (err) => {
  console.error('[Anti-Crash]', err);
});

client.login(TOKEN);
` : `/**
 * DISCORD BOT 24/7 (discord.js v14)
 */
require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN || '${token || "YOUR_BOT_TOKEN_HERE"}';
const PREFIX = '${customPrefix}';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(\`[Bot Online] Logged in as \${client.user.tag}\`);
  client.user.setPresence({
    status: '${status || "online"}',
    activities: [{
      name: '${activityName || "Discord Bot"}',
      type: ActivityType.Playing
    }]
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();

  if (content === PREFIX + 'help') {
    message.reply(\`\u{1F916} **Danh S\xE1ch L\u1EC7nh:**\\n\u2022 \\\`\${PREFIX}status pc\\\`\\n\u2022 \\\`\${PREFIX}ping\\\`\`);
  } else if (content === PREFIX + 'status pc') {
    message.reply('\u{1F4BB} Bot \u0111ang ch\u1EA1y tr\xEAn m\xF4i tr\u01B0\u1EDDng PC/Server 24/7.');
  } else if (content === PREFIX + 'ping') {
    message.reply(\`\u26A1 Ping: \\\`\${client.ws.ping}ms\\\`\`);
  }
});

client.login(TOKEN);
`;
  let indexJsTemplate = "";
  try {
    indexJsTemplate = fs.readFileSync(path.resolve(__dirname, "index.js"), "utf-8");
    if (token && token.trim()) {
      indexJsTemplate = indexJsTemplate.replace(
        "process.env.DISCORD_TOKEN",
        `"${token.trim()}" || process.env.DISCORD_TOKEN`
      );
    }
  } catch (err) {
    indexJsTemplate = `// Xem file index.js trong repository`;
  }
  const packageJson = JSON.stringify({
    name: "discord-treo-acc-render",
    version: "1.0.0",
    description: "Discord 24/7 Treo Acc, PC Status & Stream Badge Farm for Render.com",
    main: "index.js",
    type: "module",
    scripts: {
      "start": "node index.js"
    },
    dependencies: {
      "express": "^4.21.2",
      "discord.js-selfbot-v13": "^3.7.1",
      "discord.js": "^14.27.0",
      "dotenv": "^17.2.3"
    }
  }, null, 2);
  const envFile = `# \u0110i\u1EC1n token c\u1EE7a b\u1EA1n v\xE0o \u0111\xE2y (ho\u1EB7c c\u1EA5u h\xECnh tr\xEAn Render Environment):
DISCORD_TOKEN="${token || ""}"
STREAM_VOICE_CHANNEL_ID=""
VIEWER_DISCORD_TOKEN=""
`;
  res.json({
    botCode: indexJsTemplate,
    packageJson,
    envFile
  });
});
async function startServer() {
  const PORT = 3e3;
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim().length > 15) {
    console.log("[Auto-Start] Ph\xE1t hi\u1EC7n DISCORD_TOKEN trong m\xF4i tr\u01B0\u1EDDng, \u0111ang kh\u1EDFi ch\u1EA1y t\u1EF1 \u0111\u1ED9ng...");
    startLiveSession({
      token: process.env.DISCORD_TOKEN,
      tokenType: "user",
      status: "online",
      device: "desktop",
      activityName: "Visual Studio Code",
      activityType: "PLAYING",
      details: "Treo PC 24/7",
      state: "Online",
      prefix: "."
    });
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
startServer();
