const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEYS = (process.env.API_KEYS || "").split(",").filter(Boolean);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ====== CONFIG ======
const ADMIN_ID = 8263902528;
const ADMIN_USERNAME = "ghoda_bawandr";
const REQUIRED_CHANNEL = "@ghoda_spyyc";
const REQUIRED_GROUP = "@ghoda_spyygc";

const SEARCH_COST = 4;
const DAILY_FREE_CREDITS = 3;
const REFERRAL_BONUS = 10;

// ====== API KEY ROTATION ======
let keyIndex = 0;
function getApiKey() {
  const k = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return k;
}

// ====== DB ======
const DB_FILE = "users.json";
let db = { users: {} };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ====== USERS ======
function initUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      credits: DAILY_FREE_CREDITS,
      lastDaily: new Date().toDateString(),
      referred: false,
      referral_count: 0,
      invited_by: null
    };
    saveDB();
  }
}
function getUser(id) {
  initUser(id);
  const today = new Date().toDateString();
  if (db.users[id].lastDaily !== today) {
    db.users[id].credits += DAILY_FREE_CREDITS;
    db.users[id].lastDaily = today;
    saveDB();
  }
  return db.users[id];
}

// ====== JOIN CHECK ======
async function isJoined(chatId) {
  try {
    const c = await bot.getChatMember(REQUIRED_CHANNEL, chatId);
    const g = await bot.getChatMember(REQUIRED_GROUP, chatId);
    const ok = (x) => ["member","administrator","creator"].includes(x.status);
    return ok(c) && ok(g);
  } catch {
    return false;
  }
}

// ====== START ======
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const id = msg.chat.id;
  initUser(id);

  if (match && match[1]) {
    const ref = String(match[1]);
    if (ref !== String(id) && db.users[ref] && !db.users[id].referred) {
      db.users[ref].credits += REFERRAL_BONUS;
      db.users[ref].referral_count += 1;
      db.users[id].referred = true;
      db.users[id].invited_by = ref;
      saveDB();

      bot.sendMessage(id, "🎁 Referral successful!");
      bot.sendMessage(ref, `🎉 New referral! +${REFERRAL_BONUS} credits`);
    }
  }

  bot.sendMessage(
    id,
    `🐎 Ghoda Unhider

Join channel & group first.
Then press "I have joined".

Credits per search: ${SEARCH_COST}
Daily free credits: ${DAILY_FREE_CREDITS}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Join Channel", url: `https://t.me/${REQUIRED_CHANNEL.replace("@", "")}` }],
          [{ text: "👥 Join Group", url: `https://t.me/${REQUIRED_GROUP.replace("@", "")}` }],
          [{ text: "✅ I have joined", callback_data: "verify_join" }]
        ]
      }
    }
  );
});

// ====== CALLBACK ======
bot.on("callback_query", async (q) => {
  const id = q.message.chat.id;

  if (q.data === "verify_join") {
    const ok = await isJoined(id);
    bot.sendMessage(id, ok ? "✅ Verified, send number" : "❌ Not joined yet");
  }

  bot.answerCallbackQuery(q.id);
});

// ====== SEARCH ======
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith("/")) return;
  if (!/^\d{10}$/.test(text)) return;

  if (!(await isJoined(id))) {
    bot.sendMessage(id, "Join first");
    return;
  }

  const u = getUser(id);
  if (u.credits < SEARCH_COST) {
    bot.sendMessage(id, "Not enough credits");
    return;
  }

  try {
    const res = await axios.get(
      `https://numberinfo-clna.onrender.com/api/lookup?key=${getApiKey()}&mobile=${text}`
    );

    u.credits -= SEARCH_COST;
    saveDB();

    bot.sendMessage(id, JSON.stringify(res.data.result, null, 2));
  } catch {
    bot.sendMessage(id, "API error");
  }
});

