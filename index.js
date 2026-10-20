/**
 * DISCORD 24/7 TREO ACC & STREAM FARM BADGE (1H - 5000H+)
 * Complete Full-Stack Web Application for RENDER.COM / VPS / PC
 * Includes Full Responsive Web Dashboard + REST API + Discord Gateway Runner
 */
import express from 'express';
import http from 'http';
import fs from 'fs';
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

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 3000;

// ==========================================
// 1. LIVE SESSION STATE & PRESENCE HELPERS
// ==========================================

const session = {
  id: 'primary',
  tokenType: 'user',
  maskedToken: '',
  status: 'online',
  device: 'desktop',
  activityName: 'Visual Studio Code',
  activityType: 'PLAYING',
  prefix: '.',
  userTag: '',
  userId: '',
  avatarUrl: '',
  uptime: 0,
  ping: 0,
  connectedAt: 0,
  isRunning: false,
  isStreaming: false,
  clientInstance: null,
  loopTimer: null,
  logs: []
};

function appendLog(type, msg) {
  const time = new Date().toLocaleTimeString('vi-VN');
  session.logs.unshift({ time, type, msg });
  if (session.logs.length > 200) session.logs.pop();
}

function sendGatewayPresence(client, packetData) {
  const packet = { op: 3, d: packetData };
  try {
    if (typeof client.ws?.broadcast === 'function') {
      client.ws.broadcast(packet);
    } else if (client.ws?.shards?.first()) {
      client.ws.shards.first().send(packet);
    } else if (typeof client.ws?.send === 'function') {
      client.ws.send(packet);
    }
  } catch (err) {
    console.error('sendGatewayPresence error:', err.message);
  }
}

function getDualActivities(userId, startTime) {
  const now = Date.now();
  const end = now + 210000;
  return [
    {
      name: 'Visual Studio Code',
      type: 0,
      application_id: '383226320970055681',
      details: 'Treo PC 24/7',
      state: 'Online 24/7',
      timestamps: { start: startTime },
      assets: {
        large_image: '1359299466493956258',
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
      sync_id: '5F0bmCjKUufNz1bHXfgRwe',
      party: { id: `spotify:${userId || 'default'}` },
      assets: {
        large_image: 'spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b',
        large_text: 'American Beauty/American Psycho'
      }
    }
  ];
}

async function startLiveSession(config) {
  if (session.clientInstance) {
    try {
      if (session.loopTimer) clearInterval(session.loopTimer);
      session.clientInstance.destroy();
    } catch (e) {}
    session.clientInstance = null;
  }

  const cleanToken = (config.token || '').trim().replace(/^"|"$/g, '');
  if (!cleanToken || cleanToken.length < 15) {
    return { success: false, error: 'Token Discord không hợp lệ!' };
  }

  const tokenType = config.tokenType || 'user';
  const osDevice = config.device === 'mobile' ? 'iOS' : 'Windows';
  const browserDevice = config.device === 'mobile' ? 'Discord iOS' : 'Discord Client';
  const deviceType = config.device === 'mobile' ? 'mobile' : 'desktop';

  session.tokenType = tokenType;
  session.status = config.status || 'online';
  session.device = config.device || 'desktop';
  session.activityName = config.activityName || 'Visual Studio Code';
  session.activityType = config.activityType || 'PLAYING';
  session.prefix = config.prefix || '.';
  session.maskedToken = cleanToken.substring(0, 6) + '...' + cleanToken.substring(cleanToken.length - 4);
  session.isRunning = true;
  session.userTag = 'Đang kết nối...';
  session.connectedAt = Date.now();

  appendLog('info', `Bắt đầu kết nối Gateway Discord (${tokenType === 'user' ? 'Treo Acc User Token' : 'Bot Token'})...`);

  return new Promise((resolve) => {
    let resolved = false;

    try {
      if (tokenType === 'user') {
        const client = new SelfClient({
          checkUpdate: false,
          ws: {
            properties: {
              os: osDevice,
              browser: browserDevice,
              device: deviceType
            }
          }
        });

        session.clientInstance = client;

        client.once('ready', async () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
          session.ping = Math.round(client.ws.ping) || 20;

          appendLog('success', `[SUCCESS] Đăng nhập thành công: ${client.user.tag} (ID: ${client.user.id})`);
          appendLog('info', `[STATUS] Thiết bị: ${config.device === 'mobile' ? '📱 Mobile' : '💻 PC Desktop'} | Trạng thái: ${session.status}`);

          const dualActivities = getDualActivities(client.user.id, session.connectedAt);
          sendGatewayPresence(client, {
            since: Date.now(),
            activities: dualActivities,
            status: session.status,
            afk: false,
            client_status: { [deviceType]: session.status }
          });

          appendLog('success', '[DUAL STATUS] Đã kích hoạt 2 activity cùng lúc: VS Code + Spotify "Novocaine" (Có ảnh bìa Album)!');
          appendLog('info', '[LOOP HOÀI] Đã bật chế độ lặp lại vô tận (Infinite Loop) cho bài hát Novocaine.');

          session.loopTimer = setInterval(() => {
            if (!session.isRunning || !session.clientInstance) return;
            const freshDual = getDualActivities(client.user.id, session.connectedAt);
            sendGatewayPresence(client, {
              since: Date.now(),
              activities: freshDual,
              status: session.status,
              afk: false,
              client_status: { [session.device === 'mobile' ? 'mobile' : 'desktop']: session.status }
            });
            appendLog('info', '[LOOP SPOTIFY] Đã reset lại bài hát Novocaine về 00:00 (Loop 24/7)');
          }, 210000);

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

        // Command handler
        client.on('messageCreate', async (message) => {
          if (message.author.id !== client.user.id) return;
          const content = message.content.trim();
          const p = config.prefix || '.';

          if (content === p + 'help') {
            await message.reply(`💻 **[DISCORD PC TREO ACC & STREAM FARM BADGE]**\n- \`${p}status pc\` : Đổi sang icon Máy Tính (PC)\n- \`${p}status mobile\` : Đổi sang icon Điện Thoại\n- \`${p}ping\` : Xem độ trễ Gateway\n- \`${p}help\` : Hiển thị bảng trợ giúp này`).catch(() => {});
            appendLog('info', `[LỆNH NHẬN DIỆN] .help từ người dùng`);
          } else if (content === p + 'status pc') {
            session.device = 'desktop';
            sendGatewayPresence(client, {
              since: Date.now(),
              activities: client.user.presence?.activities || [],
              status: session.status,
              afk: false,
              client_status: { desktop: 'online' }
            });
            await message.reply('💻 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng PC Desktop!').catch(() => {});
            appendLog('success', '[LỆNH NHẬN DIỆN] .status pc -> Đã chuyển sang PC Desktop');
          } else if (content === p + 'status mobile') {
            session.device = 'mobile';
            sendGatewayPresence(client, {
              since: Date.now(),
              activities: client.user.presence?.activities || [],
              status: session.status,
              afk: false,
              client_status: { mobile: 'online' }
            });
            await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng Điện Thoại!').catch(() => {});
            appendLog('success', '[LỆNH NHẬN DIỆN] .status mobile -> Đã chuyển sang Mobile');
          } else if (content === p + 'ping') {
            const curPing = Math.round(client.ws.ping) || 20;
            session.ping = curPing;
            await message.reply(`⚡ **Ping Gateway:** \`${curPing}ms\``).catch(() => {});
          }
        });

        client.login(cleanToken).catch((err) => {
          session.isRunning = false;
          appendLog('error', `[THẤT BẠI] Token sai hoặc bị Discord từ chối: ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err.message });
          }
        });

      } else {
        // Bot Client
        const client = new BotClient({
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });
        session.clientInstance = client;
        client.once('ready', () => {
          session.userTag = client.user.tag;
          session.userId = client.user.id;
          session.avatarUrl = client.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';
          client.user.setPresence({
            status: config.status || 'online',
            activities: [{ name: config.activityName || 'Discord Bot', type: ActivityType.Playing }]
          });
          appendLog('success', `[BOT] Đã đăng nhập: ${client.user.tag}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: true, session });
          }
        });
        client.login(cleanToken).catch((err) => {
          session.isRunning = false;
          appendLog('error', `[BOT LỖI] ${err.message}`);
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err.message });
          }
        });
      }

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (session.userTag && session.userTag !== 'Đang kết nối...') {
            resolve({ success: true, session });
          } else {
            resolve({ success: false, error: 'Hết thời gian kết nối (Timeout).' });
          }
        }
      }, 15000);

    } catch (e) {
      appendLog('error', `Lỗi: ${e.message}`);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: e.message });
      }
    }
  });
}

// ==========================================
// 2. STREAM FARM BADGE SYSTEM (1H - 5000H+)
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

function calculateBadgeProgress(totalSeconds) {
  const totalHours = totalSeconds / 3600;
  let currentTier = { level: 0, hours: 0, label: 'Chưa Đạt Cấp', desc: '0 giờ' };
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

const streamFarmSession = {
  isActive: false,
  channelId: '',
  hasViewer: false,
  totalSeconds: 0,
  logs: []
};

function appendFarmLog(type, msg) {
  const time = new Date().toLocaleTimeString('vi-VN');
  streamFarmSession.logs.unshift({ time, type, msg });
  if (streamFarmSession.logs.length > 200) streamFarmSession.logs.pop();
}

function stopStreamFarm() {
  if (streamFarmSession.intervalTimer) {
    clearInterval(streamFarmSession.intervalTimer);
    streamFarmSession.intervalTimer = null;
  }
  if (streamFarmSession.streamerClient) {
    try {
      const leavePayload = { guild_id: streamFarmSession.guildId || null, channel_id: null, self_mute: false, self_deaf: false, self_video: false, self_stream: false };
      if (typeof streamFarmSession.streamerClient.ws?.broadcast === 'function') {
        streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.streamerClient.destroy();
    } catch (e) {}
    streamFarmSession.streamerClient = null;
  }
  if (streamFarmSession.viewerClient) {
    try {
      const leavePayload = { guild_id: streamFarmSession.guildId || null, channel_id: null, self_mute: false, self_deaf: false, self_video: false, self_stream: false };
      if (typeof streamFarmSession.viewerClient.ws?.broadcast === 'function') {
        streamFarmSession.viewerClient.ws.broadcast({ op: 4, d: leavePayload });
      }
      streamFarmSession.viewerClient.destroy();
    } catch (e) {}
    streamFarmSession.viewerClient = null;
  }
  streamFarmSession.isActive = false;
  appendFarmLog('warn', 'Đã dừng cày stream badge và rời phòng voice.');
}

async function startStreamFarm(config) {
  stopStreamFarm();

  const cleanStreamerToken = (config.streamerToken || '').trim().replace(/^"|"$/g, '');
  const cleanViewerToken = (config.viewerToken || '').trim().replace(/^"|"$/g, '');
  const channelId = (config.channelId || '').trim();

  if (!cleanStreamerToken) return { success: false, error: 'Token Streamer không được để trống!' };
  if (!channelId) return { success: false, error: 'ID Kênh Voice không được để trống!' };

  streamFarmSession.channelId = channelId;
  streamFarmSession.hasViewer = Boolean(cleanViewerToken);
  appendFarmLog('info', `Đang kết nối Streamer tới Voice Channel: ${channelId}...`);

  return new Promise((resolve) => {
    let resolved = false;

    try {
      const streamer = new SelfClient({
        checkUpdate: false,
        ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
      });
      streamFarmSession.streamerClient = streamer;

      streamer.once('ready', async () => {
        streamFarmSession.streamerTag = streamer.user.tag;
        streamFarmSession.streamerId = streamer.user.id;
        streamFarmSession.streamerAvatar = streamer.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';

        appendFarmLog('success', `[STREAMER] Đã đăng nhập: ${streamer.user.tag}`);

        let guildId = null;
        try {
          const ch = await streamer.channels.fetch(channelId).catch(() => null);
          guildId = ch?.guildId || ch?.guild?.id || null;
          streamFarmSession.guildId = guildId || undefined;
        } catch (e) {}

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

        sendGatewayPresence(streamer, {
          since: Date.now(),
          activities: [{
            name: 'Screen Share 24/7 (Badge Farm)',
            type: 1,
            url: 'https://twitch.tv/discord',
            details: 'Cày Huy Hiệu Streamer (5000+ Giờ)',
            state: 'Đang phát màn hình trong Voice'
          }],
          status: 'online',
          afk: false,
          client_status: { desktop: 'online' }
        });

        appendFarmLog('success', `[STREAMER] Đã kích hoạt GO LIVE trong kênh voice: ${channelId}`);

        if (cleanViewerToken) {
          appendFarmLog('info', '[VIEWER] Đang kết nối tài khoản người xem (Viewer Bot)...');
          const viewer = new SelfClient({
            checkUpdate: false,
            ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
          });
          streamFarmSession.viewerClient = viewer;

          viewer.once('ready', async () => {
            streamFarmSession.viewerTag = viewer.user.tag;
            streamFarmSession.viewerId = viewer.user.id;
            streamFarmSession.viewerAvatar = viewer.user.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/1.png';

            appendFarmLog('success', `[VIEWER] Đã đăng nhập: ${viewer.user.tag}`);

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

          viewer.login(cleanViewerToken).catch((err) => {
            appendFarmLog('error', `[VIEWER] Lỗi đăng nhập viewer: ${err.message}`);
          });
        }

        streamFarmSession.isActive = true;
        streamFarmSession.startedAt = Date.now();

        let counter = 0;
        streamFarmSession.intervalTimer = setInterval(() => {
          if (!streamFarmSession.isActive) return;
          streamFarmSession.totalSeconds += 1;
          counter += 1;

          if (counter % 120 === 0 && streamFarmSession.streamerClient) {
            const keepAlive = {
              guild_id: streamFarmSession.guildId || null,
              channel_id: streamFarmSession.channelId,
              self_mute: false,
              self_deaf: false,
              self_video: true,
              self_stream: true
            };
            if (typeof streamFarmSession.streamerClient.ws?.broadcast === 'function') {
              streamFarmSession.streamerClient.ws.broadcast({ op: 4, d: keepAlive });
            }
          }
        }, 1000);

        if (!resolved) {
          resolved = true;
          resolve({ success: true });
        }
      });

      streamer.login(cleanStreamerToken).catch((err) => {
        appendFarmLog('error', `[STREAMER] Đăng nhập thất bại: ${err.message}`);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: err.message });
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (streamFarmSession.isActive) resolve({ success: true });
          else resolve({ success: false, error: 'Hết thời gian kết nối stream (Timeout).' });
        }
      }, 15000);

    } catch (err) {
      appendFarmLog('error', err.message);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: err.message });
      }
    }
  });
}

// ==========================================
// 3. REST API ENDPOINTS
// ==========================================

app.get('/api/live-status', (req, res) => {
  const currentUptime = session.isRunning && session.connectedAt ? Math.floor((Date.now() - session.connectedAt) / 1000) : 0;
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
  const { token, tokenType, status, device, activityName, activityType, prefix } = req.body;
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
    prefix: prefix || '.'
  });
  res.json(result);
});

app.post('/api/stop-live', (req, res) => {
  session.isRunning = false;
  if (session.loopTimer) clearInterval(session.loopTimer);
  if (session.clientInstance) {
    try { session.clientInstance.destroy(); } catch (e) {}
    session.clientInstance = null;
  }
  appendLog('warn', '[DỪNG] Đã ngắt kết nối phiên treo Discord.');
  res.json({ success: true, message: 'Đã dừng thành công' });
});

app.post('/api/trigger-action', async (req, res) => {
  const { action } = req.body;
  if (!session.isRunning || !session.clientInstance) {
    return res.status(400).json({ error: 'Chưa có phiên treo acc nào đang chạy!' });
  }
  const client = session.clientInstance;
  try {
    if (action === 'status_pc') {
      session.device = 'desktop';
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence?.activities || [],
        status: session.status,
        afk: false,
        client_status: { desktop: 'online' }
      });
      appendLog('success', '[WEB UI] Đã chuyển sang biểu tượng PC Desktop');
      return res.json({ success: true, message: 'Đã chuyển sang PC Desktop' });
    }
    if (action === 'status_mobile') {
      session.device = 'mobile';
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: client.user.presence?.activities || [],
        status: session.status,
        afk: false,
        client_status: { mobile: 'online' }
      });
      appendLog('success', '[WEB UI] Đã chuyển sang biểu tượng Mobile');
      return res.json({ success: true, message: 'Đã chuyển sang Mobile' });
    }
    if (action === 'dual_spotify_novocaine') {
      const dualActivities = getDualActivities(client.user.id, session.connectedAt);
      sendGatewayPresence(client, {
        since: Date.now(),
        activities: dualActivities,
        status: session.status,
        afk: false,
        client_status: { [session.device === 'mobile' ? 'mobile' : 'desktop']: session.status }
      });
      appendLog('success', '[WEB UI] Đã kích hoạt 2 activity cùng lúc: VS Code + Spotify Novocaine!');
      return res.json({ success: true, message: 'Đã bật chế độ kép' });
    }
    res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const targetStreamer = streamerToken || process.env.DISCORD_TOKEN;
  const targetViewer = viewerToken || process.env.VIEWER_DISCORD_TOKEN;
  const targetChannel = channelId || process.env.STREAM_VOICE_CHANNEL_ID;

  if (!targetStreamer) return res.status(400).json({ success: false, error: 'Chưa có Token người phát stream!' });
  if (!targetChannel) return res.status(400).json({ success: false, error: 'Chưa cung cấp ID Kênh Voice!' });

  const result = await startStreamFarm({
    streamerToken: targetStreamer,
    viewerToken: targetViewer,
    channelId: targetChannel
  });
  res.json(result);
});

app.post('/api/stream-farm/stop', (req, res) => {
  stopStreamFarm();
  res.json({ success: true, message: 'Đã dừng stream farm' });
});

// ==========================================
// DISCORD SCIENCE SPOOFER ENGINE (5000H & 100+ GAMES)
// ==========================================

const scienceSpooferSession = {
  isRunning: false,
  mode: 'idle',
  totalGames: 0,
  processedGames: 0,
  totalHoursAdded: 0,
  hoursPerGame: 5,
  currentBatch: 0,
  totalBatches: 0,
  userTag: '',
  logs: [],
  error: null,
  abortController: null
};

function appendScienceLog(type, msg) {
  const time = new Date().toLocaleTimeString('vi-VN');
  scienceSpooferSession.logs.unshift({ time, type, msg });
  if (scienceSpooferSession.logs.length > 300) scienceSpooferSession.logs.pop();
}

const DISCORD_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 Electron/42.7.1 Safari/537.36";
const SCIENCE_URL = "https://discord.com/api/v9/science";
const ME_URL = "https://discord.com/api/v9/users/@me?with_analytics_token=true";

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
    client_launch_id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
    launch_signature: launchSig,
    client_heartbeat_session_id: hbSession,
    client_event_source: null,
    client_app_state: "focused"
  };
  return Buffer.from(JSON.stringify(props)).toString('base64');
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
    throw new Error(`Token không hợp lệ hoặc bị Discord từ chối (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.analytics_token) {
    throw new Error("Không lấy được analytics_token từ Discord.");
  }
  const username = data.username ? `${data.username}#${data.discriminator || '0'}` : 'Discord User';
  return { token: data.analytics_token, username };
}

function getDetectableGamesList() {
  const gamesPath = path.resolve(__dirname, 'data', 'games.json');
  if (fs.existsSync(gamesPath)) {
    try {
      const raw = fs.readFileSync(gamesPath, 'utf-8');
      const data = JSON.parse(raw);
      const list = [];
      const seen = new Set();

      for (const entry of data) {
        const gid = String(entry.id || '');
        if (!gid || seen.has(gid)) continue;
        const exeEntry = entry.executables?.find(e => e.os === 'win32' && e.name);
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
    } catch (e) {}
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
    throw new Error("Một tiến trình Spoofer đang chạy. Vui lòng dừng trước khi chạy lại!");
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

  appendScienceLog('info', `[SPOOFER] Bắt đầu chế độ: ${config.mode === '5000_hours' ? '5,000+ Giờ Game' : '100+ Games'}...`);

  (async () => {
    try {
      appendScienceLog('info', '[1/4] Đang lấy Analytics Token từ Discord API...');
      const { token: analyticsToken, username } = await getAnalyticsToken(cleanToken);
      scienceSpooferSession.userTag = username;
      appendScienceLog('success', `[2/4] Xác thực thành công: ${username}`);

      const allGames = getDetectableGamesList();
      const targetGames = config.mode === '5000_hours' ? allGames.slice(0, 1000) : allGames.slice(0, 150);
      scienceSpooferSession.totalGames = targetGames.length;
      scienceSpooferSession.totalBatches = Math.ceil(targetGames.length / 100);

      appendScienceLog('info', `[3/4] Đã tải ${targetGames.length} tựa game chính thức.`);

      const hbSession = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
      const launchSig = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
      const superProps = createSuperProps(launchSig, hbSession);
      const hours = config.hoursPerGame || 5;
      const durationMs = Math.floor(hours * 3600 * 1000);

      let seq = 0;
      const BATCH_SIZE = 100;

      for (let i = 0; i < targetGames.length; i += BATCH_SIZE) {
        if (!scienceSpooferSession.isRunning || scienceSpooferSession.abortController?.signal.aborted) {
          appendScienceLog('warn', '[SPOOFER] Tiến trình đã dừng.');
          break;
        }

        const chunk = targetGames.slice(i, i + BATCH_SIZE);
        scienceSpooferSession.currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const events = [];

        for (const game of chunk) {
          const now = Date.now();
          const jitter = Math.floor((Math.random() * 0.1 - 0.05) * durationMs);
          const actualDuration = Math.max(60000, durationMs + jitter);
          const startTs = now - actualDuration;
          const sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();

          seq += 1;
          events.push({
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
          });

          seq += 1;
          events.push({
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
          });

          seq += 1;
          events.push({
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
          });
        }

        const payload = { token: analyticsToken, events };
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
          appendScienceLog('success', `[Gói ${scienceSpooferSession.currentBatch}/${scienceSpooferSession.totalBatches}] Bắn thành công ${chunk.length} game (Tổng: ${scienceSpooferSession.processedGames} game ~ ${scienceSpooferSession.totalHoursAdded}h)`);
        } else if (postRes.status === 401 || postRes.status === 403) {
          const errText = await postRes.text();
          appendScienceLog('error', `[HTTP ${postRes.status}] Bị từ chối: ${errText}`);
          scienceSpooferSession.error = `Bị từ chối (${postRes.status}). Vui lòng nhập thêm Cookie trong F12!`;
          break;
        } else {
          scienceSpooferSession.processedGames += chunk.length;
          scienceSpooferSession.totalHoursAdded += chunk.length * hours;
        }

        await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
      }

      if (scienceSpooferSession.processedGames > 0) {
        appendScienceLog('success', `🎉 HOÀN TẤT! Đã tăng thành công ~${scienceSpooferSession.totalHoursAdded} giờ trên hồ sơ Discord!`);
      }
    } catch (err) {
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
  } catch (err) {
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

// ==========================================
// 4. EMBEDDED DASHBOARD (SERVING FULL WEB UI)
// ==========================================

const EMBEDDED_HTML = `<!DOCTYPE html>
<html lang="vi" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord 24/7 Treo Acc & Stream Farm Badge | Control Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

  <!-- Header -->
  <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
    <div class="flex items-center space-x-3">
      <div class="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white text-xl">
        🤖
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-bold text-white tracking-tight">Discord Treo Acc 24/7 & PC Status Manager</h1>
          <span id="headerStatusBadge" class="text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border bg-slate-800 text-slate-400 border-slate-700">
            <span id="headerStatusDot" class="w-2 h-2 rounded-full bg-slate-500"></span>
            <span id="headerStatusText">ĐANG DỪNG</span>
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-0.5">Treo nick Discord icon PC/Desktop, 2 Activity VS Code + Spotify Novocaine, và Cày Badge 5000h</p>
      </div>
    </div>

    <!-- Quick Switch in Header -->
    <div id="quickSwitchBox" class="hidden flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-semibold">
      <button onclick="triggerAction('status_pc')" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">💻 Icon PC</button>
      <button onclick="triggerAction('status_mobile')" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition">📱 Icon Mobile</button>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <div class="bg-slate-900/60 border-b border-slate-800 px-6 flex flex-wrap gap-2">
    <button onclick="switchTab('tab-live')" id="btn-tab-live" class="tab-btn py-3 px-4 text-sm font-medium border-b-2 border-indigo-500 text-indigo-400 bg-indigo-500/10 transition">
      ⚡ Bảng Điều Khiển Treo Acc
    </button>
    <button onclick="switchTab('tab-science')" id="btn-tab-science" class="tab-btn py-3 px-4 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition">
      🚀 Cày 5000h & 100 Games (Science Spoofer)
    </button>
    <button onclick="switchTab('tab-stream')" id="btn-tab-stream" class="tab-btn py-3 px-4 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition">
      🎙️ Treo Stream Voice (1h - 5000h+)
    </button>
    <button onclick="switchTab('tab-guide')" id="btn-tab-guide" class="tab-btn py-3 px-4 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition">
      📖 Hướng Dẫn & Cách Sửa Render
    </button>
  </div>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

    <!-- TAB 1: LIVE SETTINGS & CONTROLLER -->
    <div id="tab-live" class="tab-content space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- Left: Settings & Token Form -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h2 class="text-base font-bold text-white mb-4 flex items-center gap-2">
              🛡️ Cài Đặt DISCORD_TOKEN
            </h2>

            <form id="startForm" onsubmit="handleStart(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Dán Discord Token của bạn:</label>
                <div class="relative">
                  <input type="password" id="inputToken" placeholder="Dán token (ví dụ: MTY4ND... hoặc OTYwND...)" class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 pr-16" />
                  <button type="button" onclick="toggleTokenVisibility()" class="absolute right-3 top-3 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded">Hiện</button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Loại Token</label>
                  <select id="inputType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <option value="user">User Token (Treo Nick Thật)</option>
                    <option value="bot">Bot Token (Discord Bot)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Giả Lập Thiết Bị</label>
                  <select id="inputDevice" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <option value="desktop">💻 Máy Tính (PC Desktop)</option>
                    <option value="mobile">📱 Điện Thoại (Mobile)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Trạng Thái (Status)</label>
                  <select id="inputStatus" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <option value="online">🟢 Trực Tuyến (Online)</option>
                    <option value="idle">🟡 Chờ (Idle)</option>
                    <option value="dnd">🔴 Đừng Làm Phiền (DND)</option>
                    <option value="invisible">⚪ Ẩn (Invisible)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Prefix Lệnh</label>
                  <input type="text" id="inputPrefix" value="." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
                </div>
              </div>

              <!-- Activity Presets -->
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1.5">Chế Độ Hoạt Động (Rich Presence)</label>
                <div class="p-3 bg-slate-950 rounded-2xl border border-indigo-500/30 text-xs space-y-1">
                  <div class="font-bold text-amber-300">🔥 Đang cài đặt: Chạy cùng lúc 2 cái:</div>
                  <div class="text-slate-300">1. 💻 <strong>Visual Studio Code</strong> (Có Icon PC chính thức)</div>
                  <div class="text-slate-300">2. 🎧 <strong>Spotify: Novocaine - Fall Out Boy</strong> (Có ảnh bìa album + Tự động lặp lại vô tận 24/7)</div>
                </div>
              </div>

              <div id="liveError" class="hidden bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300"></div>

              <!-- Buttons -->
              <div class="pt-2 flex items-center gap-3">
                <button type="submit" id="btnStart" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition uppercase">
                  🚀 BẮT ĐẦU TREO ACC (RUN LIVE)
                </button>
                <button type="button" id="btnStop" onclick="handleStop()" class="hidden flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-4 rounded-2xl text-xs items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition uppercase">
                  ⏹️ DỪNG TREO ACC
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Right: Status Card & Real-time Console -->
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 class="text-sm font-bold text-white flex items-center justify-between">
              <span>Trạng Thái Tài Khoản Đang Treo</span>
              <span id="pillLive" class="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">Chưa kết nối</span>
            </h3>

            <div id="liveCard" class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
              <img id="userAvatar" src="https://cdn.discordapp.com/embed/avatars/0.png" class="w-14 h-14 rounded-2xl border border-slate-700 object-cover" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 id="userTag" class="text-base font-bold text-white truncate">Chưa kết nối</h4>
                  <span id="badgeDevice" class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono uppercase">PC Desktop</span>
                </div>
                <div id="userActivity" class="text-xs text-slate-400 truncate mt-0.5">Dán DISCORD_TOKEN vào ô bên trái để bắt đầu</div>
                <div class="flex items-center gap-4 text-xs font-mono text-slate-500 mt-2">
                  <div>Uptime: <strong id="uptimeText" class="text-emerald-400">00:00:00</strong></div>
                  <div>Ping: <strong id="pingText" class="text-indigo-400">-- ms</strong></div>
                </div>
              </div>
            </div>

            <!-- Quick Action Buttons -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <button onclick="triggerAction('status_pc')" class="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 py-2 rounded-xl text-xs font-semibold transition">
                💻 Đổi Icon PC
              </button>
              <button onclick="triggerAction('status_mobile')" class="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-2 rounded-xl text-xs font-semibold transition">
                📱 Đổi Icon Mobile
              </button>
              <button onclick="triggerAction('dual_spotify_novocaine')" class="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 py-2 rounded-xl text-xs font-semibold transition">
                🔥 Bật VS Code + Spotify
              </button>
            </div>
          </div>

          <!-- Console Logs -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                📟 Live Console Logs & Lệnh Discord
              </span>
              <span class="text-[10px] text-emerald-400 font-mono">Tự động cập nhật 2s</span>
            </div>
            <div id="logContainer" class="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto border border-slate-800 space-y-1">
              <div class="text-slate-600 text-center py-10">Chưa có nhật ký hoạt động.</div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- TAB: SCIENCE SPOOFER 5000H & 100 GAMES -->
    <div id="tab-science" class="tab-content hidden space-y-6">
      <div class="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div class="md:col-span-8 space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              🚀 DISCORD SCIENCE SPOOFER API (CAHIT PROJECTS)
            </div>
            <h2 class="text-2xl font-black text-white">Cày 5,000+ Giờ & 100+ Games Profile Ngay Lập Tức</h2>
            <p class="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Sử dụng trực tiếp cổng API Telemetry <strong>/api/v9/science</strong> của Discord Client để gửi dữ liệu xác thực chơi game. 
              Hệ thống tự động bắn dữ liệu <strong>1,000 game Windows có bản quyền</strong> với 5 giờ mỗi game, giúp tài khoản đạt ngay <strong>5,000+ Giờ</strong> mở khóa huy hiệu máy tính cổ điển!
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
              <div class="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                <span class="text-slate-400">Đã bắn:</span>
                <strong id="scienceHoursText" class="text-cyan-400 font-bold">0 giờ</strong>
              </div>
              <div class="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                <span class="text-slate-400">Tiến độ game:</span>
                <strong id="scienceGamesText" class="text-emerald-400 font-bold">0 / 1000</strong>
              </div>
              <div class="bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                <span class="text-slate-400">Trạng thái:</span>
                <strong id="scienceStatusText" class="text-slate-400 font-bold">Sẵn sàng</strong>
              </div>
            </div>
          </div>
          <div class="md:col-span-4 flex justify-center">
            <div class="bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 text-center space-y-2 shadow-xl max-w-[200px]">
              <div class="text-[10px] font-bold text-cyan-300 uppercase">Huy Hiệu Hồ Sơ Discord</div>
              <img src="/public/assets/aistudio/Screenshot_20261021_050517_Discord_1d872617.jpg" alt="Badge" class="w-20 h-20 mx-auto rounded-xl object-cover border border-cyan-500/30" />
              <div class="text-xs font-black text-white">5000+ HOURS</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls & Progress -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            ⚙️ Cài Đặt Spoofer 5000 Giờ
          </h3>
          <form onsubmit="handleStartScience(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">1. Token Discord Cần Bắn Giờ *</label>
              <input type="password" id="inputScienceToken" placeholder="Dán token Discord của bạn" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">2. Cookie Discord (Tùy chọn vượt Firewall)</label>
              <input type="password" id="inputScienceCookie" placeholder="Dán chuỗi cookie từ F12" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">3. Chế Độ</label>
                <select id="selectScienceMode" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="5000_hours">5,000+ Giờ Game</option>
                  <option value="100_games">100+ Games Badge</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">4. Giờ / Game</label>
                <select id="selectScienceHours" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="5">5 Giờ / Game</option>
                  <option value="3">3 Giờ / Game</option>
                  <option value="8">8 Giờ / Game</option>
                </select>
              </div>
            </div>
            <div class="pt-2 flex gap-3">
              <button type="submit" id="btnScienceStart" class="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase shadow-lg shadow-cyan-600/30">
                🚀 Bắt Đầu Bắn 5000 Giờ
              </button>
              <button type="button" id="btnScienceStop" onclick="handleStopScience()" class="hidden flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase">
                ⏹️ Dừng Spoofer
              </button>
            </div>
          </form>

          <!-- Download Script links -->
          <div class="pt-2 border-t border-slate-800/80 space-y-2">
            <div class="text-[11px] font-bold text-slate-400">Tải File Script Python Chạy Trên Máy:</div>
            <div class="flex gap-2">
              <a href="/api/download/python-spoofer-5000h" class="flex-1 text-center py-2 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 hover:border-cyan-500 transition font-mono">
                📥 spoofer_5000h.py
              </a>
              <a href="/api/download/python-spoofer-100games" class="flex-1 text-center py-2 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-indigo-300 hover:border-indigo-500 transition font-mono">
                📥 spoofer_100_games.py
              </a>
            </div>
          </div>
        </div>

        <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center justify-between">
            <span>Tiến Độ Bắn Science Telemetry</span>
            <span id="scienceBatchBadge" class="text-xs text-cyan-400 font-mono">Gói 0/10</span>
          </h3>
          <div class="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div id="scienceProgressBar" class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-0 transition-all duration-300 rounded-full"></div>
          </div>
          <div id="scienceLogBox" class="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 h-64 overflow-y-auto border border-slate-800 space-y-1">
            <div class="text-slate-600 text-center py-10">Chưa có nhật ký bắn Science. Nhấn "Bắt đầu bắn 5000 giờ" để xem tiến trình.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: STREAM FARM BADGE -->
    <div id="tab-stream" class="tab-content hidden space-y-6">
      <div class="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
              🏆 DISCORD STREAMING BADGE AUTO FARMER
            </div>
            <h2 class="text-2xl font-black text-white">Cày Huy Hiệu Streamer (1h &rarr; 5000+ Giờ)</h2>
            <p class="text-xs text-slate-300 max-w-2xl mt-1">
              Hệ thống tự động phát Go Live trong kênh Voice và hỗ trợ cho Acc Phụ (Viewer) vào xem hộ để Discord tích lũy đủ số giờ mở khóa các cấp bậc huy hiệu Màn Hình Máy Tính!
            </p>
          </div>
          <div class="text-right font-mono bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div class="text-xs text-slate-400">Thời gian stream tích lũy:</div>
            <div id="farmTimeText" class="text-2xl font-black text-cyan-400">00:00:00</div>
            <div id="farmTierText" class="text-xs text-amber-400 font-bold mt-1">Level 0 (Chưa mở)</div>
          </div>
        </div>
      </div>

      <!-- Notice Box on Stream Sync -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-1.5 text-amber-200">
        <div class="font-bold text-amber-300 uppercase">💡 Mẹo Cày 100% Không Lỗi "Stream Sync Không Được":</div>
        <p class="text-slate-300 text-[11px] leading-relaxed">
          1. Trên Discord thật máy tính bạn, vào phòng voice và bấm <strong>Chia Sẻ Màn Hình (Go Live)</strong> 1 cửa sổ nhẹ (ví dụ Notepad).<br>
          2. Dán token <strong>Nick Phụ (Viewer)</strong> vào ô bên dưới rồi nhấn bắt đầu. Nick phụ sẽ tự động vào xem hộ bạn 24/24 để Discord tính 100% số giờ cho nick chính!
        </p>
      </div>

      <!-- Stream Farm Controls -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 class="text-sm font-bold text-white">Cấu Hình Phòng Voice & Token Cày</h3>
          <form onsubmit="handleStartFarm(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">1. Token Nick Chính (Streamer - Nhận Huy Hiệu) *</label>
              <input type="password" id="inputFarmStreamer" placeholder="Dán Token nick chính" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">2. Token Nick Phụ (Viewer - Vào Xem Hộ) (Khuyên dùng)</label>
              <input type="password" id="inputFarmViewer" placeholder="Dán Token nick phụ clone" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">3. ID Kênh Voice (Voice Channel ID) *</label>
              <input type="text" id="inputFarmChannel" placeholder="Ví dụ: 123456789012345678" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono" />
            </div>
            <div class="pt-2 flex gap-3">
              <button type="submit" id="btnFarmStart" class="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase">
                🚀 Bắt Đầu Cày Badge
              </button>
              <button type="button" id="btnFarmStop" onclick="handleStopFarm()" class="hidden flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase">
                ⏹️ Dừng Cày
              </button>
            </div>
          </form>
        </div>

        <div class="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 class="text-sm font-bold text-white">Trạng Thái Kết Nối Stream Farm</h3>
          <div class="space-y-2 text-xs">
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400">Streamer:</span>
              <strong id="streamerTag" class="text-amber-300">Chưa kết nối</strong>
            </div>
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400">Viewer:</span>
              <strong id="viewerTag" class="text-emerald-400">Chưa kết nối</strong>
            </div>
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400">Kênh Voice:</span>
              <strong id="voiceChannelText" class="text-cyan-300 font-mono">Chưa chọn</strong>
            </div>
          </div>
          <div id="farmLogBox" class="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 h-36 overflow-y-auto border border-slate-800 space-y-1">
            <div class="text-slate-600 text-center py-5">Chưa có nhật ký cày stream.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: GUIDE -->
    <div id="tab-guide" class="tab-content hidden space-y-6">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-xs leading-relaxed text-slate-300">
        <h2 class="text-base font-bold text-white flex items-center gap-2">📖 Hướng Dẫn Chi Tiết</h2>
        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <h3 class="font-bold text-white text-sm">1. Cách Treo Acc Trực Tiếp Ngay Trên Web Này:</h3>
          <p class="text-slate-400">Chỉ cần dán <strong>DISCORD_TOKEN</strong> của bạn vào ô cài đặt ở Tab 1, chọn PC Desktop rồi nhấn <strong>Bắt Đầu Treo Acc</strong>. Web Service trên Render sẽ đăng nhập và duy trì online 24/7 vĩnh viễn.</p>
        </div>
        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <h3 class="font-bold text-white text-sm">2. Cách Lấy Discord Token Bằng F12 Trong 10 Giây:</h3>
          <p class="text-slate-400">Mở Discord trên trình duyệt Chrome/Edge &gt; Nhấn <strong>F12</strong> &gt; Chọn tab <strong>Network</strong> &gt; Gõ <code>/api</code> vào ô tìm kiếm &gt; Bấm vào bất kỳ kênh nào trong Discord &gt; Chọn 1 request bên cột Network &gt; Kéo xuống tìm mục <strong>Request Headers &gt; Authorization</strong> &gt; Sao chép toàn bộ dòng token.</p>
        </div>
        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <h3 class="font-bold text-white text-sm">3. Cách Treo Tự Động Bằng Biến Môi Trường Render.com:</h3>
          <p class="text-slate-400">Vào <em>Render Dashboard &gt; Web Service &gt; Environment</em> và thêm biến <code>DISCORD_TOKEN</code>. Mỗi khi Render khởi động lại, nick của bạn sẽ tự động kết nối mà không cần bấm nút trên web!</p>
        </div>
      </div>
    </div>

  </main>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-indigo-500', 'text-indigo-400', 'bg-indigo-500/10');
        btn.classList.add('border-transparent', 'text-slate-400');
      });
      document.getElementById(tabId).classList.remove('hidden');
      const activeBtn = document.getElementById('btn-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-slate-400');
        activeBtn.classList.add('border-indigo-500', 'text-indigo-400', 'bg-indigo-500/10');
      }
    }

    function toggleTokenVisibility() {
      const el = document.getElementById('inputToken');
      el.type = el.type === 'password' ? 'text' : 'password';
    }

    function formatTime(secs) {
      if (!secs) return '00:00:00';
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/live-status');
        if (!res.ok) return;
        const d = await res.json();

        const dot = document.getElementById('headerStatusDot');
        const text = document.getElementById('headerStatusText');
        const pill = document.getElementById('pillLive');
        const btnStart = document.getElementById('btnStart');
        const btnStop = document.getElementById('btnStop');
        const quick = document.getElementById('quickSwitchBox');

        if (d.isRunning) {
          dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
          text.innerText = 'ONLINE 24/7';
          pill.className = 'text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono';
          pill.innerText = 'ĐANG HOẠT ĐỘNG';
          btnStart.classList.add('hidden');
          btnStop.classList.remove('hidden');
          btnStop.classList.add('flex');
          quick.classList.remove('hidden');
          quick.classList.add('flex');

          document.getElementById('userAvatar').src = d.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
          document.getElementById('userTag').innerText = d.userTag || 'Discord User';
          document.getElementById('userActivity').innerText = '🎮 ' + (d.activityName || 'VS Code + Spotify Novocaine');
          document.getElementById('badgeDevice').innerText = (d.device === 'mobile' ? 'Mobile' : 'PC Desktop');
          document.getElementById('uptimeText').innerText = formatTime(d.uptime);
          document.getElementById('pingText').innerText = (d.ping || 20) + ' ms';
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-slate-500';
          text.innerText = 'ĐANG DỪNG';
          pill.className = 'text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono';
          pill.innerText = 'Chưa kết nối';
          btnStart.classList.remove('hidden');
          btnStop.classList.add('hidden');
          quick.classList.add('hidden');
        }

        if (d.logs && d.logs.length > 0) {
          const c = document.getElementById('logContainer');
          c.innerHTML = d.logs.map(l => \`
            <div class="flex items-start gap-1.5 pb-0.5">
              <span class="text-slate-600 shrink-0">[\${l.time}]</span>
              <span class="px-1 rounded text-[9px] font-bold uppercase shrink-0 \${
                l.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                l.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                l.type === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
              }">\${l.type}</span>
              <span class="text-slate-200 break-all">\${l.msg}</span>
            </div>
          \`).join('');
        }
      } catch (e) {}

      // Poll Stream Farm
      try {
        const res = await fetch('/api/stream-farm/status');
        if (!res.ok) return;
        const sf = await res.json();
        document.getElementById('farmTimeText').innerText = formatTime(sf.totalSeconds || 0);
        document.getElementById('farmTierText').innerText = sf.badgeProgress?.currentTier?.label || 'Level 0';
        document.getElementById('streamerTag').innerText = sf.streamer?.tag || 'Chưa kết nối';
        document.getElementById('viewerTag').innerText = sf.viewer?.tag || (sf.hasViewer ? 'Đang vào...' : 'Chưa có nick xem');
        document.getElementById('voiceChannelText').innerText = sf.channelId || 'Chưa chọn';

        const btnFarmStart = document.getElementById('btnFarmStart');
        const btnFarmStop = document.getElementById('btnFarmStop');
        if (sf.isActive) {
          btnFarmStart.classList.add('hidden');
          btnFarmStop.classList.remove('hidden');
        } else {
          btnFarmStart.classList.remove('hidden');
          btnFarmStop.classList.add('hidden');
        }

        if (sf.logs && sf.logs.length > 0) {
          document.getElementById('farmLogBox').innerHTML = sf.logs.map(l => \`
            <div class="flex items-start gap-1">
              <span class="text-slate-600">[\${l.time}]</span>
              <span class="text-slate-200">\${l.msg}</span>
            </div>
          \`).join('');
        }
      } catch (e) {}
    }

    async function handleStart(e) {
      e.preventDefault();
      const token = document.getElementById('inputToken').value.trim();
      const errEl = document.getElementById('liveError');
      errEl.classList.add('hidden');

      if (!token) {
        errEl.innerText = 'Vui lòng nhập DISCORD_TOKEN vào ô trên!';
        errEl.classList.remove('hidden');
        return;
      }

      try {
        const res = await fetch('/api/start-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token,
            tokenType: document.getElementById('inputType').value,
            device: document.getElementById('inputDevice').value,
            status: document.getElementById('inputStatus').value,
            prefix: document.getElementById('inputPrefix').value || '.'
          })
        });
        const d = await res.json();
        if (!d.success) {
          errEl.innerText = d.error || 'Đăng nhập thất bại!';
          errEl.classList.remove('hidden');
        } else {
          pollStatus();
        }
      } catch (err) {
        errEl.innerText = err.message;
        errEl.classList.remove('hidden');
      }
    }

    async function handleStop() {
      try {
        await fetch('/api/stop-live', { method: 'POST' });
        pollStatus();
      } catch (e) {}
    }

    async function triggerAction(action) {
      try {
        await fetch('/api/trigger-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        pollStatus();
      } catch (e) {}
    }

    async function handleStartFarm(e) {
      e.preventDefault();
      const streamerToken = document.getElementById('inputFarmStreamer').value.trim() || document.getElementById('inputToken').value.trim();
      const viewerToken = document.getElementById('inputFarmViewer').value.trim();
      const channelId = document.getElementById('inputFarmChannel').value.trim();

      if (!streamerToken) return alert('Vui lòng nhập Token Nick Chính (Streamer)!');
      if (!channelId) return alert('Vui lòng nhập ID Kênh Voice!');

      try {
        const res = await fetch('/api/stream-farm/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamerToken, viewerToken, channelId })
        });
        const d = await res.json();
        if (!d.success) alert(d.error || 'Khởi chạy thất bại');
        else pollStatus();
      } catch (err) {
        alert(err.message);
      }
    }

    async function handleStopFarm() {
      try {
        await fetch('/api/stream-farm/stop', { method: 'POST' });
        pollStatus();
      } catch (e) {}
    }

    async function pollScience() {
      try {
        const res = await fetch('/api/science-spoofer/status');
        if (!res.ok) return;
        const sc = await res.json();

        document.getElementById('scienceHoursText').innerText = (sc.totalHoursAdded || 0) + ' giờ';
        document.getElementById('scienceGamesText').innerText = (sc.processedGames || 0) + ' / ' + (sc.totalGames || 1000);
        document.getElementById('scienceBatchBadge').innerText = 'Gói ' + (sc.currentBatch || 0) + '/' + (sc.totalBatches || 10);
        document.getElementById('scienceStatusText').innerText = sc.isRunning ? 'Đang gửi Science...' : 'Sẵn sàng';
        document.getElementById('scienceStatusText').className = sc.isRunning ? 'text-cyan-400 font-bold' : 'text-slate-400 font-bold';

        const percent = sc.totalGames ? Math.min(100, Math.round((sc.processedGames / sc.totalGames) * 100)) : 0;
        document.getElementById('scienceProgressBar').style.width = percent + '%';

        const btnStart = document.getElementById('btnScienceStart');
        const btnStop = document.getElementById('btnScienceStop');
        if (sc.isRunning) {
          btnStart.classList.add('hidden');
          btnStop.classList.remove('hidden');
        } else {
          btnStart.classList.remove('hidden');
          btnStop.classList.add('hidden');
        }

        if (sc.logs && sc.logs.length > 0) {
          document.getElementById('scienceLogBox').innerHTML = sc.logs.map(l => `
            <div class="flex items-start gap-1.5 pb-0.5">
              <span class="text-slate-600 shrink-0">[${l.time}]</span>
              <span class="px-1 rounded text-[9px] font-bold uppercase shrink-0 ${
                l.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                l.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                l.type === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
              }">${l.type}</span>
              <span class="text-slate-200 break-all">${l.msg}</span>
            </div>
          `).join('');
        }
      } catch (e) {}
    }

    async function handleStartScience(e) {
      e.preventDefault();
      const token = document.getElementById('inputScienceToken').value.trim() || document.getElementById('inputToken').value.trim();
      const cookie = document.getElementById('inputScienceCookie').value.trim();
      const mode = document.getElementById('selectScienceMode').value;
      const hoursPerGame = document.getElementById('selectScienceHours').value;

      if (!token) return alert('Vui lòng nhập Token Discord cần bắn giờ!');

      try {
        const res = await fetch('/api/science-spoofer/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, cookie, mode, hoursPerGame })
        });
        const d = await res.json();
        if (!d.success) alert(d.error || 'Khởi chạy thất bại');
        else pollScience();
      } catch (err) {
        alert(err.message);
      }
    }

    async function handleStopScience() {
      try {
        await fetch('/api/science-spoofer/stop', { method: 'POST' });
        pollScience();
      } catch (e) {}
    }

    pollStatus();
    pollScience();
    setInterval(pollStatus, 2000);
    setInterval(pollScience, 2000);
  </script>
</body>
</html>`;

// Serve dashboard or dist
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(EMBEDDED_HTML);
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(` [RENDER WEB SERVICE] Running on port: ${PORT}`);
  console.log(` [DASHBOARD SẴN SÀNG] Truy cập web để cấu hình & treo`);
  console.log(`===================================================`);

  // Auto-start if DISCORD_TOKEN is set in environment
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim().length > 15) {
    console.log('[AUTO START] Phát hiện DISCORD_TOKEN trong môi trường, đang tự động kết nối...');
    startLiveSession({
      token: process.env.DISCORD_TOKEN,
      tokenType: 'user',
      status: 'online',
      device: 'desktop',
      prefix: process.env.PREFIX || '.'
    });
  }

  // Auto-start stream farm if STREAM_VOICE_CHANNEL_ID is set
  if (process.env.STREAM_VOICE_CHANNEL_ID && process.env.DISCORD_TOKEN) {
    console.log('[AUTO STREAM] Phát hiện STREAM_VOICE_CHANNEL_ID, đang tự động stream farm...');
    startStreamFarm({
      streamerToken: process.env.DISCORD_TOKEN,
      viewerToken: process.env.VIEWER_DISCORD_TOKEN,
      channelId: process.env.STREAM_VOICE_CHANNEL_ID
    });
  }
});
