/**
 * DISCORD 24/7 TREO ACC - PC STATUS & SPOTIFY NOVOCAINE DUAL MODE
 * Compatible with ES Module ("type": "module") on RENDER.COM
 */
import http from 'http';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();
const require = createRequire(import.meta.url);
const { Client } = require('discord.js-selfbot-v13');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;

// Keep-Alive Web Server cho Render.com
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Discord Treo Acc 24/7 is RUNNING on Render!</h1><p>Status: Online | Activities: VS Code + Spotify Novocaine</p>');
});
server.listen(PORT, () => {
  console.log(`[Render Healthcheck] Web service running on port ${PORT}`);
});

if (!TOKEN || TOKEN.trim().length < 15) {
  console.error('[LỖI] Chưa cài đặt biến môi trường DISCORD_TOKEN trên Render!');
  console.error('Vui lòng vào Render > Settings > Environment Variables > Thêm DISCORD_TOKEN');
  process.exit(1);
}

const client = new Client({
  checkUpdate: false,
  ws: {
    properties: {
      os: 'Windows',
      browser: 'Discord Client',
      device: 'desktop'
    }
  }
});

function sendPresence(data) {
  const packet = { op: 3, d: data };
  try {
    if (typeof client.ws.broadcast === 'function') {
      client.ws.broadcast(packet);
    } else if (client.ws.shards && client.ws.shards.first()) {
      client.ws.shards.first().send(packet);
    } else if (typeof client.ws.send === 'function') {
      client.ws.send(packet);
    }
  } catch (e) {
    console.error('Presence error:', e.message);
  }
}

const startTime = Date.now();

function updateDualPresence() {
  const now = Date.now();
  const songDuration = 210000; // 3 phút 30 giây
  const end = now + songDuration;

  const activities = [
    // 1. Visual Studio Code PC
    {
      name: 'Visual Studio Code',
      type: 0,
      application_id: '383226320970055681',
      details: 'Treo PC 24/7',
      state: 'Online 24/7',
      timestamps: { start: startTime },
      assets: {
        large_image: '1359299466493956258', // Icon VS Code chính thức
        large_text: 'Visual Studio Code',
        small_image: '1359298971905822881',
        small_text: 'Verified PC 24/7'
      }
    },
    // 2. Spotify - Novocaine với ẢNH BÌA THẬT & LOOP VÔ TẬN
    {
      name: 'Spotify',
      type: 2,
      flags: 48,
      details: 'Novocaine',
      state: 'Fall Out Boy',
      timestamps: {
        start: now,
        end: end
      },
      sync_id: '5F0bmCjKUufNz1bHXfgRwe', // Track ID thật của Novocaine
      party: {
        id: `spotify:${client.user.id}`
      },
      assets: {
        large_image: 'spotify:ab67616d00001e023cf1c1dbcfa3f1ab7282719b', // Hash ảnh bìa album thật
        large_text: 'American Beauty/American Psycho'
      }
    }
  ];

  sendPresence({
    since: Date.now(),
    activities: activities,
    status: 'online',
    afk: false,
    client_status: { desktop: 'online' }
  });
}

client.on('ready', async () => {
  console.log(`===============================================`);
  console.log(` [THÀNH CÔNG] Logged in as: ${client.user.tag}`);
  console.log(` [DUAL STATUS] Đang treo 2 cái: VS Code + Spotify Novocaine!`);
  console.log(` [LOOP HOÀI]   Đang lặp lại bài hát Novocaine vô tận 24/7`);
  console.log(` [LỆNH SẴN]   Gõ ${PREFIX}help trong Discord để xem lệnh`);
  console.log(`===============================================`);

  updateDualPresence();

  // Loop bài hát Novocaine mỗi 3 phút 30 giây
  setInterval(() => {
    updateDualPresence();
    console.log('[Loop] Đã reset lại bài hát Novocaine từ 00:00');
  }, 210000);

  // Tự động vào voice và stream nếu cấu hình STREAM_VOICE_CHANNEL_ID trên Render
  const streamChannel = process.env.STREAM_VOICE_CHANNEL_ID;
  if (streamChannel) {
    try {
      const channel = await client.channels.fetch(streamChannel).catch(() => null);
      const guildId = channel?.guildId || channel?.guild?.id;
      const packet = {
        guild_id: guildId || null,
        channel_id: streamChannel,
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
      console.log(` [AUTO STREAM] Đã tự động tham gia Voice ${streamChannel} và phát stream để cày Badge 5000h!`);

      // Refresh voice keep-alive every 2 mins
      setInterval(() => {
        if (typeof client.ws.broadcast === 'function') {
          client.ws.broadcast({ op: 4, d: packet });
        }
      }, 120000);
    } catch (e) {
      console.error('[STREAM ERROR]', e.message);
    }

    // Tự động khởi chạy tài khoản Viewer (Clone) nếu có VIEWER_DISCORD_TOKEN
    const viewerToken = process.env.VIEWER_DISCORD_TOKEN;
    if (viewerToken) {
      try {
        const viewer = new Client({
          checkUpdate: false,
          ws: { properties: { os: 'Windows', browser: 'Discord Client', device: 'desktop' } }
        });
        viewer.once('ready', async () => {
          console.log(` [VIEWER AUTO] Đã đăng nhập viewer: ${viewer.user.tag}`);
          const ch = await viewer.channels.fetch(streamChannel).catch(() => null);
          const gId = ch?.guildId || ch?.guild?.id;
          const vPacket = {
            guild_id: gId || null,
            channel_id: streamChannel,
            self_mute: true,
            self_deaf: false,
            self_video: false,
            self_stream: false
          };
          if (typeof viewer.ws.broadcast === 'function') {
            viewer.ws.broadcast({ op: 4, d: vPacket });
          } else if (viewer.ws?.shards?.first()) {
            viewer.ws.shards.first().send({ op: 4, d: vPacket });
          }
          console.log(` [VIEWER AUTO] Đã vào voice ${streamChannel} xem stream hộ 24/7! Giờ cày badge bắt đầu tính!`);
        });
        viewer.login(viewerToken).catch((err) => console.error('[VIEWER LOGIN ERROR]', err.message));
      } catch (ve) {
        console.error('[VIEWER ERROR]', ve.message);
      }
    }
  }
});

// Nhận lệnh Discord
client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;
  const content = message.content.trim();

  if (content === PREFIX + 'help') {
    await message.reply(`💻 **[DISCORD PC TREO ACC & STREAM FARM BADGE]**\n- \`${PREFIX}status pc\` : Đổi sang icon Máy Tính (PC)\n- \`${PREFIX}status mobile\` : Đổi sang icon Điện Thoại\n- \`${PREFIX}stream <ID_Voice>\` : Bật phát stream giả lập cày Badge (1h -> 5000h)\n- \`${PREFIX}stopstream\` : Dừng stream và rời phòng voice\n- \`${PREFIX}ping\` : Xem độ trễ\n- \`${PREFIX}help\` : Hiển thị bảng này`);
  } else if (content === PREFIX + 'status pc') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { desktop: 'online' }
    });
    await message.reply('💻 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng PC Desktop!');
  } else if (content === PREFIX + 'status mobile') {
    sendPresence({
      since: Date.now(),
      activities: client.user.presence.activities,
      status: client.user.presence.status,
      afk: false,
      client_status: { mobile: 'online' }
    });
    await message.reply('📱 **[THÀNH CÔNG]** Đã chuyển sang biểu tượng Điện Thoại (Mobile)!');
  } else if (content.startsWith(PREFIX + 'stream')) {
    const targetChannelId = content.split(/\s+/)[1];
    if (!targetChannelId) {
      return message.reply(`⚠️ **Cách dùng:** \`${PREFIX}stream <ID_Kênh_Voice>\`\nVí dụ: \`${PREFIX}stream 123456789012345678\``);
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
    console.log(`[STREAM] Đang phát màn hình cày badge tại Voice: ${targetChannelId}`);
    await message.reply(`📺 **[BẮT ĐẦU TREO STREAM CÀY BADGE]**\n- Đang phát màn hình (Screen Share) vào Voice: \`${targetChannelId}\`\n- Tự động bật \`self_stream: true\` & \`self_video: true\` để cày giờ (Mốc 1h -> 5000h+)\n- Gõ \`${PREFIX}stopstream\` để dừng.`);
  } else if (content === PREFIX + 'stopstream') {
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
    console.log('[STREAM] Đã dừng stream');
    await message.reply('⏹️ **[ĐÃ DỪNG STREAM]** Đã ngắt kết nối stream và rời phòng voice.');
  } else if (content === PREFIX + 'ping') {
    await message.reply(`⚡ Độ trễ Gateway: \`${Math.round(client.ws.ping) || 20}ms\``);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('[Anti-Crash]', err);
});

client.login(TOKEN);
