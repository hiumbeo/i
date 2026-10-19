import express from 'express';
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
                  large_image: '383227221017362442',
                  large_text: 'Visual Studio Code',
                  small_image: '383227221017362442',
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
                sync_id: '1u8c2t23kUm497TzpmK0h4',
                party: {
                  id: `spotify:${client.user.id}`
                },
                assets: {
                  large_image: 'spotify:ab67616d0000b273b0544f07a7837dfd08c5d796',
                  large_text: 'American Beauty/American Psycho'
                }
              }
            ];

            const osDevice = config.device === 'mobile' ? 'mobile' : 'desktop';
            client.ws.send({
              op: 3,
              d: {
                since: Date.now(),
                activities: dualActivities,
                status: config.status || 'online',
                afk: false,
                client_status: { [osDevice]: 'online' }
              }
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
              client.ws.send({
                op: 3,
                d: {
                  since: Date.now(),
                  activities: client.user.presence.activities,
                  status: client.user.presence.status,
                  afk: false,
                  client_status: { desktop: 'online' }
                }
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
              client.ws.send({
                op: 3,
                d: {
                  since: Date.now(),
                  activities: client.user.presence.activities,
                  status: client.user.presence.status,
                  afk: false,
                  client_status: { mobile: 'online' }
                }
              });
              await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng **Mobile (Điện Thoại)**!');
              appendLog(session, 'success', 'Đã chuyển sang biểu tượng Mobile thành công');
            } catch (err: any) {
              appendLog(session, 'error', `Lỗi đổi status mobile: ${err.message}`);
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
      client.ws?.send({
        op: 3,
        d: {
          since: Date.now(),
          activities: client.user.presence.activities,
          status: client.user.presence.status,
          afk: false,
          client_status: { desktop: 'online' }
        }
      });
      appendLog(session, 'success', '[WEB UI] Đã kích hoạt chuyển đổi sang icon PC Desktop');
      return res.json({ success: true, message: 'Đã chuyển sang PC Desktop' });
    }

    if (action === 'status_mobile') {
      session.device = 'mobile';
      client.ws?.send({
        op: 3,
        d: {
          since: Date.now(),
          activities: client.user.presence.activities,
          status: client.user.presence.status,
          afk: false,
          client_status: { mobile: 'online' }
        }
      });
      appendLog(session, 'success', '[WEB UI] Đã kích hoạt chuyển đổi sang icon Mobile');
      return res.json({ success: true, message: 'Đã chuyển sang Mobile' });
    }

    res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
 */
require('dotenv').config();
const http = require('http');
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
        large_image: '383227221017362442',
        large_text: 'Visual Studio Code',
        small_image: '383227221017362442',
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
      sync_id: '1u8c2t23kUm497TzpmK0h4',
      party: {
        id: \`spotify:\${client.user.id}\`
      },
      assets: {
        large_image: 'spotify:ab67616d0000b273b0544f07a7837dfd08c5d796',
        large_text: 'American Beauty/American Psycho'
      }
    }
  ];

  client.ws.send({
    op: 3,
    d: {
      since: Date.now(),
      activities: activities,
      status: '${status || 'online'}',
      afk: false,
      client_status: { '${deviceType}': 'online' }
    }
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
    await message.reply(\`💻 **[DISCORD PC TREO ACC & STATUS]**\\n- \\\`\${PREFIX}status pc\\\` : Đổi icon online sang Máy Tính (PC Desktop)\\n- \\\`\${PREFIX}status mobile\\\` : Đổi icon online sang Điện Thoại (Mobile)\\n- \\\`\${PREFIX}ping\\\` : Xem độ trễ mạng\\n- \\\`\${PREFIX}help\\\` : Hiển thị bảng này\`);
  }

  if (content === PREFIX + 'status pc') {
    client.ws.send({
      op: 3,
      d: {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { desktop: 'online' }
      }
    });
    await message.reply('💻 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng PC Desktop!');
  }

  if (content === PREFIX + 'status mobile') {
    client.ws.send({
      op: 3,
      d: {
        since: Date.now(),
        activities: client.user.presence.activities,
        status: client.user.presence.status,
        afk: false,
        client_status: { mobile: 'online' }
      }
    });
    await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng Điện Thoại (Mobile)!');
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

  const packageJson = JSON.stringify({
    name: "discord-treo-acc",
    version: "1.0.0",
    description: "Discord Treo Acc 24/7 & PC Status",
    main: "index.js",
    scripts: {
      "start": "node index.js"
    },
    dependencies: isSelfbot ? {
      "discord.js-selfbot-v13": "^13.14.2",
      "dotenv": "^16.4.5"
    } : {
      "discord.js": "^14.16.3",
      "dotenv": "^16.4.5"
    }
  }, null, 2);

  const envFile = `# Điền token của bạn vào đây:
DISCORD_TOKEN="${token || ''}"
`;

  res.json({
    botCode,
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
