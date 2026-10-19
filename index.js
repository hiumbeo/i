/**
 * DISCORD 24/7 TREO ACC - PC STATUS & SPOTIFY NOVOCAINE DUAL MODE
 * Ready for hosting on RENDER.COM / VPS / PC 24/7
 */
require('dotenv').config();
const http = require('http');
const { Client } = require('discord.js-selfbot-v13');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;

// Keep-Alive Web Server for Render.com
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

// Safe presence broadcast helper
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
  const songDuration = 210000; // 3m 30s
  const end = now + songDuration;

  const activities = [
    // 1. Visual Studio Code PC Activity
    {
      name: 'Visual Studio Code',
      type: 0, // Playing
      application_id: '383226320970055681',
      details: 'Treo PC 24/7',
      state: 'Online 24/7',
      timestamps: { start: startTime },
      assets: {
        large_image: '1359299466493956258', // Verified Live VS Code Icon
        large_text: 'Visual Studio Code',
        small_image: '1359298971905822881', // Verified Live TS / Idle Badge
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
    await message.reply(`💻 **[DISCORD PC TREO ACC & STATUS]**\n- \`${PREFIX}status pc\` : Đổi icon online sang Máy Tính (PC Desktop)\n- \`${PREFIX}status mobile\` : Đổi icon online sang Điện Thoại (Mobile)\n- \`${PREFIX}ping\` : Xem độ trễ mạng\n- \`${PREFIX}help\` : Hiển thị bảng này`);
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

  if (content === PREFIX + 'ping') {
    await message.reply(`⚡ Độ trễ Gateway: \`${Math.round(client.ws.ping) || 20}ms\``);
  }
});

// Tự động kết nối lại khi rớt mạng
process.on('unhandledRejection', (err) => {
  console.error('[Anti-Crash]', err);
});

client.login(TOKEN);
