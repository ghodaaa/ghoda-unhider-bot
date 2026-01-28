const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEYS = process.env.API_KEYS.split(",");

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let keyIndex = 0;
function getApiKey() {
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🐎 Ghoda Unhider Ready!\n\n📱 10 digit mobile number bhejo"
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("/")) return;

  if (!/^\d{10}$/.test(text)) {
    bot.sendMessage(chatId, "❌ 10 digit mobile number bhejo");
    return;
  }

  try {
    const apiKey = getApiKey();

    const url =
      `https://numberinfo-clna.onrender.com/api/lookup` +
      `?key=${apiKey}&mobile=${text}`;

    const res = await axios.get(url);

    let reply = "📊 Number Details\n\n";
    for (let k in res.data) {
      reply += `${k}: ${res.data[k]}\n`;
    }

    bot.sendMessage(chatId, reply);
  } catch (e) {
    bot.sendMessage(chatId, "⚠️ Error ya API limit khatam");
  }
});
