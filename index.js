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

// /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🐎 Ghoda Unhider Ready!\n\n📱 10 digit mobile number bhejo"
  );
});

// message handler
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
    const url = `https://numberinfo-clna.onrender.com/api/lookup?key=${apiKey}&mobile=${text}`;
    const res = await axios.get(url);

    let reply = "📊 Number Details\n\n";

    reply += `Response Time: ${res.data.response_time || "NA"}\n\n`;

    if (Array.isArray(res.data.result) && res.data.result.length > 0) {
      res.data.result.forEach((item, index) => {
        reply += `🔹 Record ${index + 1}\n`;
        reply += `Mobile: ${item.mobile || "NA"}\n`;
        reply += `ID: ${item.id || "NA"}\n`;
        reply += `Name: ${item.name || "NA"}\n`;
        reply += `Father Name: ${item.father_name || "NA"}\n`;
        reply += `Address: ${item.address || "NA"}\n`;
        reply += `ID Number: ${item.id_number || "NA"}\n`;
        reply += `Circle: ${item.circle || "NA"}\n`;
        reply += `Email: ${item.email || "NA"}\n`;
        reply += `Alt Mobile: ${item.alt_mobile || "NA"}\n`;
        reply += `\n`;
      });
    } else {
      reply += "No records found.";
    }

    bot.sendMessage(chatId, reply);
  } catch (e) {
    bot.sendMessage(chatId, "⚠️ Error ya API limit khatam");
  }
});
