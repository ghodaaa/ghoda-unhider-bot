const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEYS = process.env.API_KEYS.split(",");

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ====== CONFIG (SET THESE) ======
const ADMIN_ID = 123456789;               // <-- TERA Telegram ID (number)
const ADMIN_USERNAME = "yourusername";    // <-- tera username (without @)
const REQUIRED_CHANNEL = "@yourchannel";  // <-- must join
const REQUIRED_GROUP = "@yourgroup";      // <-- must join

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
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// ====== USER HELPERS ======
function initUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      credits: DAILY_FREE_CREDITS,
      lastDaily: new Date().toDateString(),
      referred: false,      // has this user already USED a referral?
      referral_count: 0,    // how many people this user invited
      invited_by: null      // who invited this user
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

// ====== /START (WITH JOIN BUTTONS + VERIFY) ======
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const id = msg.chat.id;
  initUser(id);

  // ---- Referral (fake-proof) ----
  if (match && match[1]) {
    const referrerId = String(match[1]);
    if (referrerId !== String(id) && db.users[referrerId] && !db.users[id].referred) {
      db.users[referrerId].credits += REFERRAL_BONUS;
      db.users[referrerId].referral_count += 1;
      db.users[id].referred = true;
      db.users[id].invited_by = referrerId;
      saveDB();
      bot.sendMessage(id, `🎁 Referral successful! Inviter ko +${REFERRAL_BONUS} credits mile`);
    }
  }

  bot.sendMessage(
    id,
`🐎 *Ghoda Unhider*

🔒 Use karne ke liye pehle JOIN karo

💳 *Credit System*
• 1 search = ${SEARCH_COST} credits
• Daily free = ${DAILY_FREE_CREDITS} credits
• Referral bonus = ${REFERRAL_BONUS} credits

💰 *Sabse KAM pricing* (credit based)
10→₹10 | 20→₹15 | 50→₹30 | 70→₹40 | 100→₹50

👉 Credits ke liye DM: @${ADMIN_USERNAME}

📱 10 digit mobile number bhejo`,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "📢 Join Channel", url: `https://t.me/${REQUIRED_CHANNEL.replace("@","")}` }],
      [{ text: "👥 Join Group", url: `https://t.me/${REQUIRED_GROUP.replace("@","")}` }],
      [{ text: "✅ I have joined", callback_data: "verify_join" }],
      [
        { text: "👤 Profile", callback_data: "profile_btn" },
        { text: "💳 Credits", callback_data: "credits_btn" }
      ]
    ]
  }
});
});

// ====== CALLBACK BUTTONS ======
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "verify_join") {
    const joined = await isJoined(chatId);
    if (joined) {
      bot.sendMessage(chatId, "✅ Verified! Ab 10 digit mobile number bhejo");
    } else {
      bot.sendMessage(chatId, "❌ Abhi join nahi kiya. Pehle Channel + Group join karo");
    }
  }

  if (query.data === "profile_btn") {
    const u = getUser(chatId);
    const username = query.from.username ? `@${query.from.username}` : "Not set";
    bot.sendMessage(
      chatId,
`👤 *Your Profile*

🆔 User ID: ${chatId}
👤 Username: ${username}

💳 Credits: ${u.credits}
👥 Referrals: ${u.referral_count}
🔗 Invited by: ${u.invited_by || "—"}

👉 Credits ke liye DM: @${ADMIN_USERNAME}`,
      { parse_mode: "Markdown" }
    );
  }

  if (query.data === "credits_btn") {
    const u = getUser(chatId);
    bot.sendMessage(chatId, `💳 Your credits: ${u.credits}`);
  }

  bot.answerCallbackQuery(query.id);
});

// ====== TEXT COMMANDS (OPTIONAL) ======
bot.onText(/\/profile/, (msg) => {
  const id = msg.chat.id;
  const u = getUser(id);
  const username = msg.from.username ? `@${msg.from.username}` : "Not set";
  bot.sendMessage(
    id,
`👤 *Your Profile*

🆔 User ID: ${id}
👤 Username: ${username}

💳 Credits: ${u.credits}
👥 Referrals: ${u.referral_count}

👉 Credits ke liye DM: @${ADMIN_USERNAME}`,
    { parse_mode: "Markdown" }
  );
});
bot.onText(/\/credits/, (msg) => {
  const u = getUser(msg.chat.id);
  bot.sendMessage(msg.chat.id, `💳 Your credits: ${u.credits}`);
});
bot.onText(/\/buy/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
`💰 Sabse KAM pricing (credit based)
10→₹10 | 20→₹15 | 50→₹30 | 70→₹40 | 100→₹50

👉 Credits ke liye DM: @${ADMIN_USERNAME}`
  );
});

// ====== ADMIN: ADD CREDITS ======
bot.onText(/\/addcredits (\d+) (\d+)/, (msg, m) => {
  if (msg.from.id !== ADMIN_ID) return;
  const uid = m[1], amt = parseInt(m[2], 10);
  initUser(uid);
  db.users[uid].credits += amt;
  saveDB();
  bot.sendMessage(uid, `✅ ${amt} credits added`);
});

// ====== MAIN SEARCH ======
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (text.startsWith("/")) return;
  if (!/^\d{10}$/.test(text)) return;

  const joined = await isJoined(id);
  if (!joined) {
    bot.sendMessage(id, "🔒 Pehle join karo aur **I have joined** button dabao");
    return;
  }

  const user = getUser(id);
  if (user.credits < SEARCH_COST) {
    bot.sendMessage(
      id,
`❌ Credits kam hain
💳 Your credits: ${user.credits}

👉 DM: @${ADMIN_USERNAME}`
    );
    return;
  }

  try {
    const apiKey = getApiKey();
    const url = `https://numberinfo-clna.onrender.com/api/lookup?key=${apiKey}&mobile=${text}`;
    const res = await axios.get(url);

    let reply = "📊 Result\n\n";
    if (Array.isArray(res.data.result)) {
      res.data.result.forEach((it, i) => {
        reply += `🔹 Record ${i+1}\n`;
        reply += `Name: ${it.name || "NA"}\n`;
        reply += `Circle: ${it.circle || "NA"}\n`;
        reply += `Address: ${it.address || "NA"}\n\n`;
      });
    }

    user.credits -= SEARCH_COST;
    saveDB();
    reply += `💳 Credits left: ${user.credits}`;
    bot.sendMessage(id, reply);

  } catch {
    bot.sendMessage(id, "⚠️ Error, baad me try karo");
  }
});
