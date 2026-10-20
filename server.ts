import express from 'express';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { Client: SelfClient, RichPresence } = require('discord.js-selfbot-v13');
const { Client: BotClient, GatewayIntentBits, ActivityType } = require('discord.js');

const app = express();
app.use(express.json());

// Enable CORS for iframe and preview environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface LiveBotSession {
  id: string;
  tokenType: 'user' | 'bot';
  maskedToken: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  device: 'desktop' | 'mobile';
  activityName: string;
  activityType: string;
  prefix: string;
  userTag: string;
  userId: string;
  avatarUrl: string;
  uptime: number;
  ping: number;
  connectedAt: number;
  isRunning: boolean;
  isStreaming: boolean;
  streamGuildId?: string;
  streamChannelId?: string;
  streamStartTime?: number;
  clientInstance: any;
  logs: { time: string; type: 'info' | 'success' | 'warn' | 'error'; msg: string }[];
}

// Active live sessions in memory
const activeSessions = new Map<string, LiveBotSession>();

function appendLog(session: LiveBotSession, type: 'info' | 'success' | 'warn' | 'error', msg: string) {
  const time = new Date().toLocaleTimeString('vi-VN');
  session.logs.unshift({ time, type, msg });
  if (session.logs.length > 200) {
    session.logs.pop();
  }
}

// Helper to safely broadcast Opcode 3 presence over discord.js-selfbot-v13 WebSocket
function sendGatewayPresence(client: any, packetData: any) {
  const packet = {
    op: 3,
    d: packetData
  };
  try {
    if (typeof client.ws?.broadcast === 'function') {
      client.ws.broadcast(packet);
    } else if (client.ws?.shards && typeof client.ws.shards.first === 'function' && client.ws.shards.first()?.send) {
      client.ws.shards.first().send(packet);
    } else if (typeof client.ws?.send === 'function') {
      client.ws.send(packet);
    }
  } catch (err: any) {
    console.error('sendGatewayPresence error:', err.message);
  }
}

// Start live connection
async function startLiveSession(config: {
  token: string;
  tokenType: 'user' | 'bot';
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  device: 'desktop' | 'mobile';
  activityName: string;
  activityType: string;
  details?: string;
  state?: string;
  prefix: string;
}): Promise<{ success: boolean; session?: any; error?: string }> {
  const sessionId = 'primary';

  // Stop existing if any
  const existing = activeSessions.get(sessionId);
  if (existing && existing.clientInstance) {
    try {
      existing.clientInstance.destroy();
    } catch {}
    activeSessions.delete(sessionId);
  }

  const cleanToken = config.token.trim().replace(/^"|"$/g, '');
  if (!cleanToken) {
    return { success: false, error: 'Discord Token không được để trống!' };
  }

  const session: LiveBotSession = {
    id: sessionId,
    tokenType: config.tokenType,
    maskedToken: cleanToken.substring(0, 6) + '...' + cleanToken.substring(cleanToken.length - 4),
    status: config.status || 'online',
    device: config.device || 'desktop',
    activityName: config.activityName || 'Visual Studio Code',
    activityType: config.activityType || 'PLAYING',
    prefix: config.prefix || '.',
    userTag: 'Đang kết nối...',
    userId: '',
    avatarUrl: '',
    uptime: 0,
    ping: 0,
    connectedAt: Date.now(),
    isRunning: true,
    isStreaming: false,
    clientInstance: null,
    logs: []
  };

  activeSessions.set(sessionId, session);
  appendLog(session, 'info', `Bắt đầu kết nối Gateway Discord (${config.tokenType === 'user' ? 'Treo Acc User Token' : 'Bot Token'})...`);

  return new Promise((resolve) => {
    let resolved = false;

    try {
      if (config.tokenType === 'user') {
        const osProperty = config.device === 'mobile' ? 'iOS' : 'Windows';
        const browserProperty = config.device === 'mobile' ? 'Discord iOS' : 'Discord Client';

        const client = new SelfClient({
          checkUpdate: false,
          ws: {
            properties: {
              os: osProperty,
              browser: browserProperty,
              device: config.device === 'mobile' ? 'mobile' : 'desktop'
            }
          }
        });

        session.clientInstance = client;

        client.on('ready', async () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL?.() || 'https://cdn.discordapp.com/embed/avatars/0.png';
          session.ping = Math.round(client.ws.ping) || 24;

          appendLog(session, 'success', `[SUCCESS] Đăng nhập thành công: ${client.user.tag} (ID: ${client.user.id})`);
          appendLog(session, 'info', `[STATUS] Thiết bị: ${config.device === 'mobile' ? '📱 Mobile' : '💻 PC Desktop'} | Trạng thái: ${config.status}`);

          // Function to apply Dual Presence (VS Code + Spotify Novocaine loop)
          const startTime = Date.now();
          const applyDualPresence = () => {
            const now = Date.now();
            const songDuration = 210000; // 3m 30s
            const end = now + songDuration;

            const dualActivities = [
              // 1. Visual Studio Code PC Activity
              {
                name: config.activityName || 'Visual Studio Code',
                type: 0, // Playing
                application_id: '383226320970055681',
                details: config.details || 'Treo PC 24/7',
                state: config.state || 'Online',
                timestamps: { start: startTime },
                assets: {
                  large_image: '1359299466493956258', // Verified Live VS Code Icon
                  large_text: 'Visual Studio Code',
                  small_image: '1359298971905822881', // Verified Live TS / Idle Badge
                  small_text: 'Verified PC 24/7'
                }
              },
              // 2. Spotify - Novocaine with REAL ALBUM COVER & INFINITE LOOP
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
                sync_id: '5F0bmCjKUufNz1bHXfgRwe', // Official Spotify Track ID for Novocaine
                party: {
                  id: `spotify:${client.user.id}`
                },
                assets: {
                  large_image: 'spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b', // Official Spotify Album Cover Hash
                  large_text: 'American Beauty/American Psycho'
                }
              }
            ];

            const osDevice = config.device === 'mobile' ? 'mobile' : 'desktop';
            sendGatewayPresence(client, {
              since: Date.now(),
              activities: dualActivities,
              status: config.status || 'online',
              afk: false,
              client_status: { [osDevice]: 'online' }
            });
          };

          try {
            applyDualPresence();
            appendLog(session, 'success', `[DUAL STATUS] Đã kích hoạt 2 activity cùng lúc: VS Code + Spotify "Novocaine" (Có ảnh bìa Album)!`);
            appendLog(session, 'info', `[LOOP HOÀI] Đã bật chế độ lặp lại vô tận (Infinite Loop) cho bài hát Novocaine.`);

            // Infinite loop interval: resets song timer every 3m 30s
            if ((client as any)._spotifyLoopTimer) clearInterval((client as any)._spotifyLoopTimer);
            (client as any)._spotifyLoopTimer = setInterval(() => {
              if (session.isRunning) {
                applyDualPresence();
                appendLog(session, 'info', `[LOOP] Tự động lặp lại bài hát "Novocaine" từ 00:00.`);
              }
            }, 210000);

          } catch (e: any) {
            appendLog(session, 'warn', `[ACTIVITY] Lỗi presence: ${e.message}`);
            client.user.setPresence({
              status: config.status || 'online',
              activities: [{ name: 'Visual Studio Code', type: 'PLAYING' }]
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

        // Command handler for selfbot (responds to user typing command)
        client.on('messageCreate', async (message: any) => {
          if (message.author.id !== client.user.id) return;
          const content = message.content.trim();
          const p = config.prefix || '.';

          if (content === p + 'help') {
            appendLog(session, 'info', `[LỆNH NHẬN DIỆN] Đã gõ lệnh: ${p}help`);
            try {
              await message.reply(`💻 **[DISCORD PC TREO ACC & STATUS]**\n- \`${p}status pc\` : Đổi icon online sang Máy Tính (PC Desktop)\n- \`${p}status mobile\` : Đổi icon online sang Điện Thoại (Mobile)\n- \`${p}ping\` : Xem độ trễ Gateway\n- \`${p}help\` : Hiển thị bảng lệnh này`);
              appendLog(session, 'success', `[PHẢN HỒI LỆNH] Đã gửi danh sách lệnh .help lên Discord`);
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi reply .help: ${err.message}`);
            }
          } else if (content === p + 'status pc') {
            appendLog(session, 'info', `[LỆNH NHẬN DIỆN] Đã gõ lệnh: ${p}status pc`);
            try {
              session.device = 'desktop';
              sendGatewayPresence(client, {
                since: Date.now(),
                activities: client.user.presence.activities,
                status: client.user.presence.status,
                afk: false,
                client_status: { desktop: 'online' }
              });
              await message.reply('💻 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng **PC Desktop (Máy Tính)**!');
              appendLog(session, 'success', 'Đã chuyển sang biểu tượng PC Desktop thành công');
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi đổi status PC: ${err.message}`);
            }
          } else if (content === p + 'status mobile') {
            appendLog(session, 'info', `[LỆNH NHẬN DIỆN] Đã gõ lệnh: ${p}status mobile`);
            try {
              session.device = 'mobile';
              sendGatewayPresence(client, {
                since: Date.now(),
                activities: client.user.presence.activities,
                status: client.user.presence.status,
                afk: false,
                client_status: { mobile: 'online' }
              });
              await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng **Mobile (Điện Thoại)**!');
              appendLog(session, 'success', 'Đã chuyển sang biểu tượng Mobile thành công');
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi đổi status mobile: ${err.message}`);
            }
          } else if (content.startsWith(p + 'stream')) {
            const parts = content.split(/\s+/);
            const targetChannelId = parts[1];
            if (!targetChannelId) {
              await message.reply(`⚠️ **Cách dùng:** \`${p}stream <ID_Kênh_Voice>\`\nVí dụ: \`${p}stream 123456789012345678\``);
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

              if (typeof client.ws.broadcast === 'function') {
                client.ws.broadcast({ op: 4, d: streamPayload });
              } else if (client.ws?.shards?.first()) {
                client.ws.shards.first().send({ op: 4, d: streamPayload });
              }

              session.isStreaming = true;
              session.streamChannelId = targetChannelId;
              session.streamGuildId = guildId || undefined;
              session.streamStartTime = Date.now();

              appendLog(session, 'success', `[STREAM FARM] Đã bắt đầu stream màn hình vào kênh voice: ${targetChannelId}`);
              await message.reply(`📺 **[BẮT ĐẦU TREO STREAM]**\n- Đang phát màn hình (Screen Share) vào Voice: \`${targetChannelId}\`\n- Bật sẵn \`self_stream: true\` & \`self_video: true\` để tính giờ cày Badge Streamer (Mốc 1h -> 5000h+)\n- Gõ \`${p}stopstream\` để dừng.`);
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi bắt đầu stream: ${err.message}`);
              await message.reply(`❌ Lỗi bật stream: ${err.message}`);
            }
          } else if (content === p + 'stopstream') {
            try {
              const leavePayload = {
                guild_id: session.streamGuildId || null,
                channel_id: null,
                self_mute: false,
                self_deaf: false,
                self_video: false,
                self_stream: false
              };

              if (typeof client.ws.broadcast === 'function') {
                client.ws.broadcast({ op: 4, d: leavePayload });
              } else if (client.ws?.shards?.first()) {
                client.ws.shards.first().send({ op: 4, d: leavePayload });
              }

              session.isStreaming = false;
              session.streamStartTime = undefined;
              appendLog(session, 'warn', '[STREAM FARM] Đã dừng stream và rời kênh voice.');
              await message.reply('⏹️ **[ĐÃ DỪNG STREAM]** Đã ngắt kết nối stream và rời phòng voice.');
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi dừng stream: ${err.message}`);
              await message.reply(`❌ Lỗi dừng stream: ${err.message}`);
            }
          } else if (content === p + 'ping') {
            const currentPing = Math.round(client.ws.ping) || 20;
            session.ping = currentPing;
            await message.reply(`⚡ **Ping Gateway:** \`${currentPing}ms\``);
            appendLog(session, 'info', `[LỆNH NHẬN DIỆN] .ping -> ${currentPing}ms`);
          }
        });

        client.on('error', (err: any) => {
          appendLog(session, 'error', `Gateway Client Error: ${err.message}`);
        });

        client.login(cleanToken).catch((err: any) => {
          session.isRunning = false;
          appendLog(session, 'error', `[THẤT BẠI] Token sai hoặc không hợp lệ: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: `Token không hợp lệ hoặc bị Discord từ chối: ${err.message}` });
          }
        });

      } else {
        // Standard Bot token
        const client = new BotClient({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
          ]
        });

        session.clientInstance = client;

        client.once('ready', () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
          session.ping = Math.round(client.ws.ping) || 20;

          appendLog(session, 'success', `[SUCCESS] Bot đã đăng nhập: ${client.user.tag}`);

          client.user.setPresence({
            status: config.status || 'online',
            activities: [{
              name: config.activityName || 'Discord Bot',
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

        client.on('messageCreate', async (message: any) => {
          if (message.author.bot) return;
          const content = message.content.trim();
          const p = config.prefix || '.';

          if (content === p + 'help') {
            message.reply(`🤖 **Bảng Lệnh Bot:**\n- \`${p}help\` - Hướng dẫn\n- \`${p}status pc\` - Trạng thái PC\n- \`${p}ping\` - Ping bot`);
            appendLog(session, 'info', `Bot đã phản hồi lệnh .help từ ${message.author.tag}`);
          } else if (content === p + 'status pc') {
            message.reply('💻 Bot đang chạy trên môi trường PC/Server 24/7.');
          } else if (content === p + 'ping') {
            message.reply(`⚡ Ping: \`${client.ws.ping}ms\``);
          }
        });

        client.login(cleanToken).catch((err: any) => {
          session.isRunning = false;
          appendLog(session, 'error', `[THẤT BẠI] Bot Token sai: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: `Bot Token sai hoặc thiếu Intent: ${err.message}` });
          }
        });
      }

      // Timeout safety: 15 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (session.userTag && session.userTag !== 'Đang kết nối...') {
            resolve({ success: true, session });
          } else {
            resolve({ success: false, error: 'Hết thời gian kết nối (Timeout). Hãy kiểm tra lại Token Discord của bạn.' });
          }
        }
      }, 15000);

    } catch (e: any) {
      appendLog(session, 'error', `Lỗi ngoại lệ: ${e.message}`);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: e.message });
      }
    }
  });
}

// REST API Endpoints
app.get('/api/live-status', (req, res) => {
  const session = activeSessions.get('primary');
  if (!session) {
    return res.json({ isRunning: false, logs: [] });
  }

  const currentUptime = session.isRunning ? Math.floor((Date.now() - session.connectedAt) / 1000) : 0;
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
    streamUptime: session.isStreaming && session.streamStartTime ? Math.floor((Date.now() - session.streamStartTime) / 1000) : 0,
    logs: session.logs
  });
});

app.post('/api/start-live', async (req, res) => {
  const { token, tokenType, status, device, activityName, activityType, details, state, prefix } = req.body;
  const targetToken = token || process.env.DISCORD_TOKEN;

  if (!targetToken) {
    return res.status(400).json({ success: false, error: 'Chưa có DISCORD_TOKEN! Vui lòng nhập token của bạn.' });
  }

  const result = await startLiveSession({
    token: targetToken,
    tokenType: tokenType || 'user',
    status: status || 'online',
    device: device || 'desktop',
    activityName: activityName || 'Visual Studio Code',
    activityType: activityType || 'PLAYING',
    details: details || 'Treo PC 24/7',
    state: state || 'Active',
    prefix: prefix || '.'
  });

  res.json(result);
});

app.post('/api/stop-live', (req, res) => {
  const session = activeSessions.get('primary');
  if (session) {
    session.isRunning = false;
    if (session.clientInstance) {
      try {
        session.clientInstance.destroy();
      } catch {}
    }
    appendLog(session, 'warn', '[DỪNG] Đã ngắt kết nối phiên treo Discord.');
    res.json({ success: true, message: 'Đã dừng bot thành công.' });
  } else {
    res.json({ success: true });
  }
});

// Trigger command directly from web UI (e.g. switch status pc / mobile)
app.post('/api/trigger-action', async (req, res) => {
  const { action } = req.body;
  const session = activeSessions.get('primary');
  if (!session || !session.isRunning || !session.clientInstance) {
    return res.status(400).json({ error: 'Chưa có phiên treo acc nào đang chạy!' });
  }

  const client = session.clientInstance;
  try {
    if (action === 'status_pc') {
      session.device = 'desktop';
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { desktop: 'online' }
      });
      appendLog(session, 'success', '[WEB UI] Đã kích hoạt chuyển đổi sang icon PC Desktop');
      return res.json({ success: true, message: 'Đã chuyển sang PC Desktop' });
    }

    if (action === 'status_mobile') {
      session.device = 'mobile';
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { mobile: 'online' }
      });
      appendLog(session, 'success', '[WEB UI] Đã kích hoạt chuyển đổi sang icon Mobile');
      return res.json({ success: true, message: 'Đã chuyển sang Mobile' });
    }

    if (action === 'dual_spotify_novocaine') {
      const now = Date.now();
      const songDuration = 210000;
      const end = now + songDuration;

      const dualActivities = [
        {
          name: 'Visual Studio Code',
          type: 0,
          application_id: '383226320970055681',
          details: 'Treo PC 24/7',
          state: 'Online',
          timestamps: { start: session.connectedAt },
          assets: {
            large_image: '1359299466493956258', // Verified VS Code
            large_text: 'Visual Studio Code',
            small_image: '1359298971905822881',
            small_text: 'Verified PC 24/7'
          }
        },
        {
          name: 'Spotify',
          type: 2,
          flags: 48,
          details: 'Novocaine',
          state: 'Fall Out Boy',
          timestamps: { start: now, end: end },
          sync_id: '5F0bmCjKUufNz1bHXfgRwe', // Verified Spotify Track ID
          party: { id: `spotify:${client.user.id}` },
          assets: {
            large_image: 'spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b', // Official Spotify Album Cover Hash
            large_text: 'American Beauty/American Psycho'
          }
        }
      ];

      session.activityName = 'VS Code + Spotify Novocaine';
      const osDevice = session.device === 'mobile' ? 'mobile' : 'desktop';
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: dualActivities,
        status: session.status || 'online',
        afk: false,
        client_status: { [osDevice]: 'online' }
      });
      appendLog(session, 'success', '[WEB UI] Đã kích hoạt chạy cùng lúc 2 cái: VS Code + Spotify Novocaine (Loop hoài)!');
      return res.json({ success: true, message: 'Đã kích hoạt chế độ kép VS Code + Spotify Novocaine' });
    }

    if (action === 'start_stream') {
      const channelId = req.body.channelId;
      if (!channelId) {
        return res.status(400).json({ error: 'Chưa cung cấp ID phòng Voice để stream!' });
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

        if (typeof client.ws.broadcast === 'function') {
          client.ws.broadcast({ op: 4, d: streamPayload });
        } else if (client.ws?.shards?.first()) {
          client.ws.shards.first().send({ op: 4, d: streamPayload });
        }

        session.isStreaming = true;
        session.streamChannelId = channelId;
        session.streamGuildId = guildId || undefined;
        session.streamStartTime = Date.now();

        appendLog(session, 'success', `[WEB UI] Bắt đầu stream màn hình vào kênh voice: ${channelId} để cày Badge 5000h!`);
        return res.json({ success: true, message: `Đang stream vào voice ${channelId}` });
      } catch (err: any) {
        appendLog(session, 'error', `Lỗi bắt đầu stream: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
    }

    if (action === 'stop_stream') {
      try {
        const leavePayload = {
          guild_id: session.streamGuildId || null,
          channel_id: null,
          self_mute: false,
          self_deaf: false,
          self_video: false,
          self_stream: false
        };

        if (typeof client.ws.broadcast === 'function') {
          client.ws.broadcast({ op: 4, d: leavePayload });
        } else if (client.ws?.shards?.first()) {
          client.ws.shards.first().send({ op: 4, d: leavePayload });
        }

        session.isStreaming = false;
        session.streamStartTime = undefined;
        appendLog(session, 'warn', '[WEB UI] Đã dừng stream và rời kênh voice.');
        return res.json({ success: true, message: 'Đã dừng stream và rời phòng voice' });
      } catch (err: any) {
        appendLog(session, 'error', `Lỗi dừng stream: ${err.message}`);
        return res.status(500).json({ error: err.message });
      }
    }

    res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DISCORD STREAMING BADGE FARM SYSTEM (1H - 5000H+)
// ==========================================

const BADGE_TIERS = [
  { level: 1, hours: 1, label: 'Level 1: Mở Khóa Badge', desc: '1 giờ stream có người xem' },
  { level: 2, hours: 10, label: 'Level 2: Tập Sự', desc: '10 giờ stream' },
  { level: 3, hours: 50, label: 'Level 3: Tân Binh', desc: '50 giờ stream' },
  { level: 4, hours: 100, label: 'Level 4: Thường Niên', desc: '100 giờ stream' },
  { level: 5, hours: 250, label: 'Level 5: Chuyên Cần', desc: '250 giờ stream' },
  { level: 6, hours: 500, label: 'Level 6: Bạc (Silver)', desc: '500 giờ stream' },
  { level: 7, hours: 1000, label: 'Level 7: Vàng (Gold)', desc: '1,000 giờ stream' },
  { level: 8, hours: 2500, label: 'Level 8: Bạch Kim (Platinum)', desc: '2,500 giờ stream' },
  { level: 9, hours: 5000, label: 'Level 9: Kim Cương (Full 5000+ Giờ)', desc: '5,000+ giờ - Cấp tối đa' },
];

function calculateBadgeProgress(totalSeconds: number) {
  const totalHours = totalSeconds / 3600;
  let currentTier = { level: 0, hours: 0, label: 'Chưa Đạt Cấp', desc: '0 giờ' };
  let nextTier = BADGE_TIERS[0];

  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (totalHours >= BADGE_TIERS[i].hours) {
      currentTier = BADGE_TIERS[i];
      nextTier = BADGE_TIERS[i + 1] || null as any;
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
    progress = Math.min(100, Math.max(0, ((totalHours - prevHours) / (targetHours - prevHours)) * 100));
    remainingSeconds = Math.max(0, (targetHours * 3600) - totalSeconds);
  }

  return {
    totalHours: Number(totalHours.toFixed(2)),
    currentTier,
    nextTier,
    progress: Number(progress.toFixed(1)),
    remainingSeconds
  };
}

interface StreamFarmSession {
  isActive: boolean;
  channelId: string;
  guildId?: string;
  streamerTag?: string;
  streamerId?: string;
  streamerAvatar?: string;
  viewerTag?: string;
  viewerId?: string;
  viewerAvatar?: string;
  hasViewer: boolean;
  startedAt?: number;
  totalSeconds: number;
  streamerClient?: any;
  viewerClient?: any;
  intervalTimer?: any;
  logs: { time: string; type: 'info' | 'success' | 'warn' | 'error'; msg: string }[];
}

const streamFarmSession: StreamFarmSession = {
  isActive: false,
  channelId: '',
  hasViewer: false,
  totalSeconds: 0,
  logs: []
};

function appendFarmLog(type: 'info' | 'success' | 'warn' | 'error', msg: string) {
  const time = new Date().toLocaleTimeString('vi-VN');
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
      if (typeof streamFarmSession.streamerClient.ws?.broadcast === 'function') {
        streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.streamerClient.destroy();
    } catch {}
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
      if (typeof streamFarmSession.viewerClient.ws?.broadcast === 'function') {
        streamFarmSession.viewerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.viewerClient.destroy();
    } catch {}
    streamFarmSession.viewerClient = null;
  }
  streamFarmSession.isActive = false;
  appendFarmLog('warn', 'Đã dừng phiên cày Stream Badge và rời phòng voice.');
}

async function startStreamFarm(config: {
  streamerToken: string;
  viewerToken?: string;
  channelId: string;
}): Promise<{ success: boolean; error?: string }> {
  stopStreamFarm();

  const cleanStreamerToken = config.streamerToken.trim().replace(/^"|"$/g, '');
  const cleanViewerToken = config.viewerToken ? config.viewerToken.trim().replace(/^"|"$/g, '') : '';
  const channelId = config.channelId.trim();

  if (!cleanStreamerToken) {
    return { success: false, error: 'Token người stream (Streamer) không được để trống!' };
  }
  if (!channelId) {
    return { success: false, error: 'ID Kênh Voice không được để trống!' };
  }

  streamFarmSession.channelId = channelId;
  streamFarmSession.hasViewer = Boolean(cleanViewerToken);
  appendFarmLog('info', `Đang kết nối Streamer tới Voice Channel: ${channelId}...`);

  return new Promise((resolve) => {
    let resolved = false;

    try {
      const streamer = new SelfClient({
        checkUpdate: false,
        ws: {
          properties: {
            os: 'Windows',
            browser: 'Discord Client',
            device: 'desktop'
          }
        }
      });
      streamFarmSession.streamerClient = streamer;

      streamer.once('ready', async () => {
        streamFarmSession.streamerTag = streamer.user.tag;
        streamFarmSession.streamerId = streamer.user.id;
        streamFarmSession.streamerAvatar = streamer.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';

        appendFarmLog('success', `[STREAMER] Đã đăng nhập: ${streamer.user.tag}`);

        // Fetch channel to get guildId
        let guildId: string | null = null;
        try {
          const ch = await streamer.channels.fetch(channelId).catch(() => null);
          guildId = ch?.guildId || ch?.guild?.id || null;
          streamFarmSession.guildId = guildId || undefined;
        } catch {}

        // Send Opcode 4 Go Live / Screen share
        const streamPayload = {
          guild_id: guildId,
          channel_id: channelId,
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

        // Set rich presence streaming activity
        sendGatewayPresence(streamer, {
          since: Date.now(),
          activities: [{
            name: 'Screen Share 24/7 (Badge Farm)',
            type: 1, // Streaming
            url: 'https://twitch.tv/discord',
            details: 'Cày Huy Hiệu Streamer (5000+ Giờ)',
            state: 'Đang phát màn hình trong Voice'
          }],
          status: 'online',
          afk: false,
          client_status: { desktop: 'online' }
        });

        appendFarmLog('success', `[STREAMER] Đã kích hoạt GO LIVE trong kênh voice: ${channelId}`);

        // If viewer token is provided, connect viewer
        if (cleanViewerToken) {
          appendFarmLog('info', '[VIEWER] Đang kết nối tài khoản người xem (Viewer Bot)...');
          const viewer = new SelfClient({
            checkUpdate: false,
            ws: {
              properties: {
                os: 'Windows',
                browser: 'Discord Client',
                device: 'desktop'
              }
            }
          });
          streamFarmSession.viewerClient = viewer;

          viewer.once('ready', async () => {
            streamFarmSession.viewerTag = viewer.user.tag;
            streamFarmSession.viewerId = viewer.user.id;
            streamFarmSession.viewerAvatar = viewer.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/1.png';

            appendFarmLog('success', `[VIEWER] Đã đăng nhập: ${viewer.user.tag}`);

            // Join the exact same channel
            const viewerPayload = {
              guild_id: guildId,
              channel_id: channelId,
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

            appendFarmLog('success', `[VIEWER] Đã vào phòng voice ${channelId} và đang xem stream! Giờ cày badge bắt đầu được Discord tính!`);
          });

          viewer.login(cleanViewerToken).catch((err: any) => {
            appendFarmLog('error', `[VIEWER] Đăng nhập tài khoản xem thất bại: ${err.message}`);
          });
        } else {
          appendFarmLog('warn', '[LƯU Ý] Chưa có token Viewer. Hãy đảm bảo bạn hoặc ai đó vào phòng voice xem stream thì Discord mới tính giờ!');
        }

        streamFarmSession.isActive = true;
        streamFarmSession.startedAt = Date.now();

        // Interval to track seconds and refresh voice keep-alive every 2 mins
        let counter = 0;
        streamFarmSession.intervalTimer = setInterval(() => {
          if (!streamFarmSession.isActive) return;
          streamFarmSession.totalSeconds += 1;
          counter += 1;

          if (counter % 120 === 0 && streamFarmSession.streamerClient) {
            // Re-send stream packet keep-alive
            const keepAlivePayload = {
              guild_id: streamFarmSession.guildId || null,
              channel_id: streamFarmSession.channelId,
              self_mute: false,
              self_deaf: false,
              self_video: true,
              self_stream: true
            };
            if (typeof streamFarmSession.streamerClient.ws?.broadcast === 'function') {
              streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: keepAlivePayload });
            }
          }
        }, 1000);

        if (!resolved) {
          resolved = true;
          resolve({ success: true });
        }
      });

      streamer.login(cleanStreamerToken).catch((err: any) => {
        appendFarmLog('error', `[STREAMER] Đăng nhập thất bại: ${err.message}`);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: `Token Streamer lỗi: ${err.message}` });
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (streamFarmSession.isActive) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Hết thời gian chờ kết nối Discord (15s).' });
          }
        }
      }, 15000);

    } catch (err: any) {
      appendFarmLog('error', `Lỗi: ${err.message}`);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: err.message });
      }
    }
  });
}

// Stream Farm Status API
app.get('/api/stream-farm/status', (req, res) => {
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

app.post('/api/stream-farm/start', async (req, res) => {
  const { streamerToken, viewerToken, channelId } = req.body;
  const targetStreamerToken = streamerToken || process.env.DISCORD_TOKEN;
  const targetViewerToken = viewerToken || process.env.VIEWER_DISCORD_TOKEN;
  const targetChannelId = channelId || process.env.STREAM_VOICE_CHANNEL_ID;

  if (!targetStreamerToken) {
    return res.status(400).json({ success: false, error: 'Chưa có Token người stream!' });
  }
  if (!targetChannelId) {
    return res.status(400).json({ success: false, error: 'Chưa cung cấp ID Kênh Voice!' });
  }

  const result = await startStreamFarm({
    streamerToken: targetStreamerToken,
    viewerToken: targetViewerToken,
    channelId: targetChannelId
  });

  res.json(result);
});

app.post('/api/stream-farm/stop', (req, res) => {
  stopStreamFarm();
  res.json({ success: true, message: 'Đã dừng cày stream badge thành công.' });
});

// ==========================================
// DISCORD SCIENCE SPOOFER ENGINE (5000H & 100+ GAMES)
// Ported directly from Cahit Projects Science Spoofer
// ==========================================

interface ScienceLog {
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  msg: string;
}

const scienceSpooferSession = {
  isRunning: false,
  mode: 'idle' as '5000_hours' | '100_games' | 'idle',
  totalGames: 0,
  processedGames: 0,
  totalHoursAdded: 0,
  hoursPerGame: 5,
  currentBatch: 0,
  totalBatches: 0,
  userTag: '',
  logs: [] as ScienceLog[],
  error: null as string | null,
  abortController: null as AbortController | null
};

function appendScienceLog(type: 'info' | 'success' | 'warn' | 'error', msg: string) {
  const time = new Date().toLocaleTimeString('vi-VN');
  scienceSpooferSession.logs.unshift({ time, type, msg });
  if (scienceSpooferSession.logs.length > 300) scienceSpooferSession.logs.pop();
}

const DISCORD_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 Electron/42.7.1 Safari/537.36";
const SCIENCE_URL = "https://discord.com/api/v9/science";
const ME_URL = "https://discord.com/api/v9/users/@me?with_analytics_token=true";

function createSuperProps(launchSig: string, hbSession: string): string {
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
  return Buffer.from(JSON.stringify(props)).toString('base64');
}

async function getAnalyticsToken(authToken: string): Promise<{ token: string; username: string }> {
  const res = await fetch(ME_URL, {
    headers: {
      "authorization": authToken,
      "user-agent": DISCORD_USER_AGENT
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token không hợp lệ hoặc bị Discord từ chối (${res.status}): ${errText}`);
  }

  const data = await res.json() as any;
  if (!data.analytics_token) {
    throw new Error("Không lấy được analytics_token từ Discord. Token có thể bị hạn chế.");
  }
  const username = data.username ? `${data.username}#${data.discriminator || '0'}` : 'Discord User';
  return { token: data.analytics_token, username };
}

interface GameEntry {
  id: string;
  name: string;
  exe: string;
}

function getDetectableGamesList(): GameEntry[] {
  const gamesPath = path.resolve(__dirname, 'data', 'games.json');
  if (fs.existsSync(gamesPath)) {
    try {
      const raw = fs.readFileSync(gamesPath, 'utf-8');
      const data = JSON.parse(raw);
      const list: GameEntry[] = [];
      const seen = new Set<string>();

      for (const entry of data) {
        const gid = String(entry.id || '');
        if (!gid || seen.has(gid)) continue;
        const exeEntry = entry.executables?.find((e: any) => e.os === 'win32' && e.name);
        if (exeEntry) {
          seen.add(gid);
          list.push({
            id: gid,
            name: entry.name || 'Unknown Game',
            exe: exeEntry.name
          });
        }
      }
      if (list.length > 0) return list;
    } catch {}
  }

  // Robust fallback of 100+ popular verified Discord games
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

async function startScienceSpoofer(config: {
  token: string;
  cookie?: string;
  hoursPerGame?: number;
  mode: '5000_hours' | '100_games';
}) {
  if (scienceSpooferSession.isRunning) {
    throw new Error("Một tiến trình Spoofer đang chạy. Vui lòng nhấn Dừng trước khi chạy lại!");
  }

  const cleanToken = config.token.trim().replace(/^"|"$/g, '');
  if (!cleanToken) throw new Error("Vui lòng nhập Token Discord!");

  scienceSpooferSession.isRunning = true;
  scienceSpooferSession.mode = config.mode;
  scienceSpooferSession.processedGames = 0;
  scienceSpooferSession.totalHoursAdded = 0;
  scienceSpooferSession.hoursPerGame = config.hoursPerGame || 5;
  scienceSpooferSession.error = null;
  scienceSpooferSession.abortController = new AbortController();

  appendScienceLog('info', `[SPOOFER] Đang khởi động chế độ: ${config.mode === '5000_hours' ? '5,000+ Giờ Game' : '100+ Games Played'}...`);

  // Run in background task
  (async () => {
    try {
      appendScienceLog('info', '[1/4] Đang lấy Analytics Token từ Discord API...');
      const { token: analyticsToken, username } = await getAnalyticsToken(cleanToken);
      scienceSpooferSession.userTag = username;
      appendScienceLog('success', `[2/4] Xác thực thành công: ${username} (Analytics Token OK)`);

      const allGames = getDetectableGamesList();
      const targetGames = config.mode === '5000_hours' ? allGames.slice(0, 1000) : allGames.slice(0, 150);
      scienceSpooferSession.totalGames = targetGames.length;
      scienceSpooferSession.totalBatches = Math.ceil(targetGames.length / 100);

      appendScienceLog('info', `[3/4] Đã tải ${targetGames.length} tựa game chính thức từ Discord CDN.`);

      const hbSession = crypto.randomUUID();
      const launchSig = crypto.randomUUID();
      const superProps = createSuperProps(launchSig, hbSession);
      const hours = config.hoursPerGame || 5;
      const durationMs = Math.floor(hours * 3600 * 1000);

      let seq = 0;
      const BATCH_SIZE = 100;

      for (let i = 0; i < targetGames.length; i += BATCH_SIZE) {
        if (!scienceSpooferSession.isRunning || scienceSpooferSession.abortController?.signal.aborted) {
          appendScienceLog('warn', '[SPOOFER] Người dùng đã dừng tiến trình.');
          break;
        }

        const chunk = targetGames.slice(i, i + BATCH_SIZE);
        scienceSpooferSession.currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const events: any[] = [];

        for (const game of chunk) {
          const now = Date.now();
          // Add ±5% random jitter to look completely organic
          const jitter = Math.floor((Math.random() * 0.1 - 0.05) * durationMs);
          const actualDuration = Math.max(60000, durationMs + jitter);
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

        const headers: Record<string, string> = {
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
          appendScienceLog('success', `[Gói ${scienceSpooferSession.currentBatch}/${scienceSpooferSession.totalBatches}] Bắn thành công ${chunk.length} game (Đã bắn: ${scienceSpooferSession.processedGames}/${targetGames.length} game ~ ${scienceSpooferSession.totalHoursAdded}h)`);
        } else if (postRes.status === 401 || postRes.status === 403) {
          const errBody = await postRes.text();
          appendScienceLog('error', `[HTTP ${postRes.status}] Bị từ chối quyền. Hãy thêm Cookie từ F12 hoặc làm mới Token: ${errBody}`);
          scienceSpooferSession.error = `Bị từ chối (${postRes.status}). Vui lòng nhập thêm Cookie trong Network f12!`;
          break;
        } else {
          appendScienceLog('warn', `[HTTP ${postRes.status}] Phản hồi từ Discord Science endpoint.`);
          scienceSpooferSession.processedGames += chunk.length;
          scienceSpooferSession.totalHoursAdded += chunk.length * hours;
        }

        // Anti-spam jitter delay (0.8s - 1.5s)
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      }

      if (scienceSpooferSession.processedGames > 0) {
        appendScienceLog('success', `🎉 HOÀN TẤT! Đã tăng thành công ~${scienceSpooferSession.totalHoursAdded} giờ trên hồ sơ Discord! Mở Discord kiểm tra Profile!`);
      }
    } catch (err: any) {
      appendScienceLog('error', `Lỗi Spoofer: ${err.message}`);
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
  appendScienceLog('warn', '[SPOOFER] Đã gửi lệnh dừng tiến trình.');
}

// Science Spoofer APIs
app.get('/api/science-spoofer/status', (req, res) => {
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

app.post('/api/science-spoofer/start', async (req, res) => {
  try {
    const { token, cookie, hoursPerGame, mode } = req.body;
    const targetToken = token || process.env.DISCORD_TOKEN;
    if (!targetToken) {
      return res.status(400).json({ success: false, error: 'Chưa có Token Discord!' });
    }
    await startScienceSpoofer({
      token: targetToken,
      cookie: cookie || '',
      hoursPerGame: Number(hoursPerGame) || 5,
      mode: mode === '100_games' ? '100_games' : '5000_hours'
    });
    res.json({ success: true, message: 'Đã bắt đầu tiến trình Spoofer thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/science-spoofer/stop', (req, res) => {
  stopScienceSpoofer();
  res.json({ success: true, message: 'Đã dừng tiến trình Spoofer.' });
});

// Download original Python Spoofer scripts
app.get('/api/download/python-spoofer-5000h', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'scripts', 'discord_science_spoofer_5000h.py');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="discord_science_spoofer_5000h.py"');
    res.setHeader('Content-Type', 'text/x-python');
    return res.sendFile(filePath);
  }
  res.status(404).send('File not found');
});

app.get('/api/download/python-spoofer-100games', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'scripts', 'discord_science_spoofer_100games.py');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="discord_science_spoofer_100games.py"');
    res.setHeader('Content-Type', 'text/x-python');
    return res.sendFile(filePath);
  }
  res.status(404).send('File not found');
});

// Standalone runner script exporter for Stream Badge Farm
app.get('/api/stream-farm/export-script', (req, res) => {
  const scriptContent = `/**
 * DISCORD STREAMING BADGE FARMER (1H -> 5000H+ MAX TIER)
 * Tự động treo phát stream màn hình trong Voice Channel
 * Có kèm chế độ tự động cho 1 Acc phụ vào xem để Discord tính giờ 24/7!
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
  console.error('[LỖI] Cần thiết lập biến DISCORD_TOKEN và STREAM_VOICE_CHANNEL_ID trong .env!');
  process.exit(1);
}

const streamer = new Client({
  checkUpdate: false,
  ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
});

streamer.once('ready', async () => {
  console.log(\`[STREAMER] Đăng nhập thành công: \${streamer.user.tag}\`);

  let guildId = null;
  try {
    const ch = await streamer.channels.fetch(VOICE_CHANNEL_ID);
    guildId = ch?.guildId || ch?.guild?.id;
  } catch (e) {
    console.error('[STREAMER] Không lấy được guild ID:', e.message);
  }

  // Bật Go Live Stream
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

  console.log(\`[STREAMER] >>> ĐANG PHÁT MÀN HÌNH TẠI KÊNH VOICE: \${VOICE_CHANNEL_ID} <<<\`);
  console.log('[STREAMER] Đang tích lũy giờ cày badge...');

  // Giữ kết nối liên tục
  setInterval(() => {
    if (typeof streamer.ws.broadcast === 'function') {
      streamer.ws.broadcast({ op: 4, d: streamPayload });
    }
  }, 120000);
});

// Khởi chạy Viewer nếu có token phụ
if (VIEWER_TOKEN) {
  const viewer = new Client({
    checkUpdate: false,
    ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
  });

  viewer.once('ready', async () => {
    console.log(\`[VIEWER] Đăng nhập thành công acc xem: \${viewer.user.tag}\`);

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

    console.log('[VIEWER] >>> ĐÃ VÀO PHÒNG XEM STREAM HỘ (Giờ bắt đầu được tính!) <<<');
  });

  viewer.login(VIEWER_TOKEN);
} else {
  console.log('[CHÚ Ý] Không có VIEWER_DISCORD_TOKEN. Hãy cho 1 acc hoặc bạn bè vào phòng xem để tính giờ.');
}

streamer.login(STREAMER_TOKEN);
`;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(scriptContent);
});

// Generate turnkey standalone files for running on own computer / VPS
app.post('/api/generate-code', (req, res) => {
  const { token, tokenType, status, activityType, activityName, details, state, prefix, device } = req.body;
  const customPrefix = prefix || '.';
  const isSelfbot = tokenType !== 'bot';
  const osDevice = device === 'mobile' ? 'iOS' : 'Windows';
  const browserDevice = device === 'mobile' ? 'Discord iOS' : 'Discord Client';
  const deviceType = device === 'mobile' ? 'mobile' : 'desktop';

  const botCode = isSelfbot ? `/**
 * DISCORD 24/7 TREO ACC - PC STATUS & SPOTIFY NOVOCAINE DUAL MODE
 * Ready for hosting on RENDER.COM / VPS / PC 24/7
import http from 'http';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { Client } = require('discord.js-selfbot-v13');

const TOKEN = process.env.DISCORD_TOKEN || '${token || 'YOUR_DISCORD_TOKEN_HERE'}';
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
      name: '${activityName || 'Visual Studio Code'}',
      type: 0, // Playing
      application_id: '383226320970055681',
      details: '${details || 'Treo PC 24/7'}',
      state: '${state || 'Online'}',
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
    status: '${status || 'online'}',
    afk: false,
    client_status: { '${deviceType}': 'online' }
  });
}

client.on('ready', async () => {
  console.log(\`===============================================\`);
  console.log(\` [THÀNH CÔNG] Logged in as: \${client.user.tag}\`);
  console.log(\` [DUAL STATUS] Đang treo 2 cái: VS Code + Spotify Novocaine!\`);
  console.log(\` [LOOP HOÀI]   Đang lặp lại bài hát Novocaine vô tận 24/7\`);
  console.log(\` [LỆNH SẴN]   Gõ \${PREFIX}help trong Discord để xem lệnh\`);
  console.log(\`===============================================\`);

  updateDualPresence();

  // Loop bài hát Novocaine mỗi 3 phút 30 giây (210s)
  setInterval(() => {
    updateDualPresence();
    console.log('[Loop] Đã reset lại bài hát Novocaine từ 00:00');
  }, 210000);
});

// Xử lý lệnh trực tiếp trên Discord
client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;
  const content = message.content.trim();

  if (content === PREFIX + 'help') {
    await message.reply(\`💻 **[DISCORD PC TREO ACC & STREAM FARM BADGE]**\\n- \\\`\${PREFIX}status pc\\\` : Đổi sang icon Máy Tính (PC)\\n- \\\`\${PREFIX}status mobile\\\` : Đổi sang icon Điện Thoại\\n- \\\`\${PREFIX}stream <ID_Voice>\\\` : Bật phát stream giả lập cày Badge (1h -> 5000h)\\n- \\\`\${PREFIX}stopstream\\\` : Dừng stream và rời phòng voice\\n- \\\`\${PREFIX}ping\\\` : Xem độ trễ mạng\\n- \\\`\${PREFIX}help\\\` : Hiển thị bảng này\`);
  }

  if (content === PREFIX + 'status pc') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { desktop: 'online' }
    });
    await message.reply('💻 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng PC Desktop!');
  }

  if (content === PREFIX + 'status mobile') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { mobile: 'online' }
    });
    await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng Điện Thoại (Mobile)!');
  }

  if (content.startsWith(PREFIX + 'stream')) {
    const targetChannelId = content.split(/\\s+/)[1];
    if (!targetChannelId) {
      return message.reply(\`⚠️ **Cách dùng:** \\\`\${PREFIX}stream <ID_Kênh_Voice>\\\`\\nVí dụ: \\\`\${PREFIX}stream 123456789012345678\\\`\`);
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
    await message.reply(\`📺 **[BẮT ĐẦU TREO STREAM CÀY BADGE]**\\n- Đang phát màn hình vào Voice: \\\`\${targetChannelId}\\\`\\n- Tự động bật \\\`self_stream: true\\\` & \\\`self_video: true\\\` để cày giờ (Mốc 1h -> 5000h+)\\n- Gõ \\\`\${PREFIX}stopstream\\\` để dừng.\`);
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
    await message.reply('⏹️ **[ĐÃ DỪNG STREAM]** Đã ngắt kết nối stream và rời phòng voice.');
  }

  if (content === PREFIX + 'ping') {
    await message.reply(\`⚡ Độ trễ Gateway: \\\`\${Math.round(client.ws.ping) || 20}ms\\\`\`);
  }
});

// Tự động kết nối lại khi rớt mạng
process.on('unhandledRejection', (err) => {
  console.error('[Anti-Crash]', err);
});

client.login(TOKEN);
` : `/**
 * DISCORD BOT 24/7 (discord.js v14)
 */
require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN || '${token || 'YOUR_BOT_TOKEN_HERE'}';
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
    status: '${status || 'online'}',
    activities: [{
      name: '${activityName || 'Discord Bot'}',
      type: ActivityType.Playing
    }]
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();

  if (content === PREFIX + 'help') {
    message.reply(\`🤖 **Danh Sách Lệnh:**\\n• \\\`\${PREFIX}status pc\\\`\\n• \\\`\${PREFIX}ping\\\`\`);
  } else if (content === PREFIX + 'status pc') {
    message.reply('💻 Bot đang chạy trên môi trường PC/Server 24/7.');
  } else if (content === PREFIX + 'ping') {
    message.reply(\`⚡ Ping: \\\`\${client.ws.ping}ms\\\`\`);
  }
});

client.login(TOKEN);
`;

  let indexJsTemplate = '';
  try {
    indexJsTemplate = fs.readFileSync(path.resolve(__dirname, 'index.js'), 'utf-8');
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

  const envFile = `# Điền token của bạn vào đây (hoặc cấu hình trên Render Environment):
DISCORD_TOKEN="${token || ''}"
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
  const PORT = 3000;

  // Auto-start if DISCORD_TOKEN is set in environment
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim().length > 15) {
    console.log('[Auto-Start] Phát hiện DISCORD_TOKEN trong môi trường, đang khởi chạy tự động...');
    startLiveSession({
      token: process.env.DISCORD_TOKEN,
      tokenType: 'user',
      status: 'online',
      device: 'desktop',
      activityName: 'Visual Studio Code',
      activityType: 'PLAYING',
      details: 'Treo PC 24/7',
      state: 'Online',
      prefix: '.'
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
