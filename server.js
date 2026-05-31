const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ⚙️ НАСТРОЙКИ — ЗАПОЛНИ СВОИ ДАННЫЕ
const CONFIG = {
  // Получить у @BotFather в Telegram
  telegramToken: '8855110360:AAFGZ3KjBSFHQcOuDXSGJ6N-agwOkOq5lLs',
  // Узнать: написать боту @userinfobot, он покажет chat_id
  telegramChatId: '130730139',
  // Порт сервера
  port: process.env.PORT || 3000
};

// Форматирование ответов для Telegram
function formatTelegramMessage(data) {
  const answers = {
    q1: 'Когда остаётесь наедине с собой — что чувствуете?',
    q2: 'Что сейчас нужнее всего?',
    q3: 'Вроде есть всё, а внутри не то?',
    q4: 'Опора снаружи или внутри?',
    q5: 'Вопрос Мастеру'
  };

  let msg = '🌟 <b>Новый ответ в форме!</b>\n\n';

  Object.keys(answers).forEach(key => {
    const answer = data[key] || '(не указано)';
    msg += `<b>${answers[key]}</b>\n${answer}\n\n`;
  });

  const time = new Date(data.timestamp || Date.now());
  msg += `🕐 ${time.toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`;

  return msg;
}

// Отправка в Telegram
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${CONFIG.telegramToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: CONFIG.telegramChatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Telegram error:', result);
    throw new Error(result.description || 'Telegram send failed');
  }
  return result;
}

// MIME-типы
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${CONFIG.port}`);
  const pathname = parsed.pathname;

  // CORS для удобства
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/submit
  if (req.method === 'POST' && pathname === '/api/submit') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        // Проверка на заполненность
        if (!data.q5 || data.q5.length < 3) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Заполните вопрос' }));
          return;
        }

        // Проверка токена
        if (CONFIG.telegramToken === null || CONFIG.telegramToken === 'ВАШ_ТОКЕН_БОТА') {
          console.log('📝 Получен ответ (Telegram не настроен):', data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, warning: 'Telegram не настроен. Ответ сохранён в лог.' }));
          return;
        }

        const message = formatTelegramMessage(data);
        await sendToTelegram(message);
        console.log('✅ Ответ отправлен в Telegram');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

      } catch (err) {
        console.error('❌ Ошибка:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // GET — отдача статики
  const filePath = pathname === '/' 
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, pathname);

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — страница не найдена');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════╗
║  🌟 Форма «5 сокровищ» запущена!    ║
║                                      ║
║  Открой в браузере:                  ║
║  → http://localhost:${CONFIG.port}        ║
║                                      ║
║  Не забудь настроить Telegram:       ║
║  - токен бота (от @BotFather)        ║
║  - chat_id (куда слать ответы)       ║
║  ⚙️ в файле server.js               ║
╚══════════════════════════════════════╝
  `);
});
