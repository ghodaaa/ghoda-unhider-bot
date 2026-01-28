const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEYS = (process.env.API_KEYS || "").split(",").filter(Boolean);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ====== CONFIG ======
const ADMIN_ID = 8263902528;              // <-- TERA Telegram ID (number)
const ADMIN_USERNAME = "ghoda_bawandr";   // <-- without @
const REQUIRED_CHANNEL = "https://t.me/+RwHH_8rea-44Zjk1"; // <-- must join
const REQUIRED_GROUP = "https://t.me/+dJrReuFDW0FiODQ1";     // <-- must join

const SEARCH_COST = 4;
const DAILY_FREE_CREDITS = 3;
const REFERRAL_BONUS = 10;

// ====== API KEY ROTATION ======
let keyIndex = 0;
function getApiKey() {
  if (!API_KEYS.length) throw new Error("No API keys set");
  const k = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return k;
}

// ====== DB ======
const DB_FILE = "users.json";
let db = { users: {} };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

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

// ====== /START (REFERRAL + BUTTONS) ======
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const id = msg.chat.id;
  initUser(id);

  // ---- Referral (fake/self blocked + auto notify referrer) ----
  if (match && match[1]) {
    const ref = String(match[1]);
    if (ref !== String(id) && db.users[ref] && !db.users[id].referred) {
      db.users[ref].credits += REFERRAL_BONUS;
      db.users[ref].referral_count += 1;
      db.users[id].referred = true;
      db.users[id].invited_by = ref;
      saveDB();

      // Auto message to NEW user
      bot.sendMessage(id, `🎁 Referral success! Inviter ko +${REFERRAL_BONUS} credits mile`);

      // Auto message to REFERRER
      bot.sendMessage(
        ref,
        `🎉 *Referral Success!*\n\nAapke link se ek naya user aaya.\n💳 +${REFERRAL_BONUS} credits added.\n👥 Total referrals: ${db.users[ref].referral_count}`,
        { parse_mode: "Markdown" }
      );
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

💰 *Sabse KAM pricing*
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
      ],
      [{ text: "🎁 Refer & Earn", callback_data: "refer_btn" }]
    ]
  }
);
});

// ====== CALLBACK BUTTONS ======
bot.on("callback_query", async (q) => {
  const id = q.message.chat.id;

  if (q.data === "verify_join") {
    const ok = await isJoined(id);
    bot.sendMessage(id, ok ? "✅ Verified! Ab number bhejo" : "❌ Abhi join nahi kiya");
  }

  if (q.data === "profile_btn") {
    const u = getUser(id);
    const uname = q.from.username ? `@${q.from.username}` : "Not set";
    bot.sendMessage(
      id,
`👤 *Your Profile*

🆔 User ID: ${id}
👤 Username: ${uname}

💳 Credits: ${u.credits}
👥 Referrals: ${u.referral_count}
🔗 Invited by: ${u.invited_by || "—"}

👉 DM: @${ADMIN_USERNAME}`,
      { parse_mode: "Markdown" }
    );
  }

  if (q.data === "credits_btn") {
    const u = getUser(id);
    bot.sendMessage(id, `💳 Your credits: ${u.credits}`);
  }

  if (q.data === "refer_btn") {
    const link = `https://t.me/ill_findubot?start=${id}`;
    bot.sendMessage(
      id,
`🎁 *Invite & Earn*

🔗 Your referral link:
${link}

👥 Har successful referral pe:
+${REFERRAL_BONUS} credits

❌ Self/duplicate blocked`,
      { parse_mode: "Markdown" }
    );
  }

  bot.answerCallbackQuery(q.id);
});

// ====== TEXT COMMANDS ======
bot.onText(/\/profile/, (msg) => {
  const u = getUser(msg.chat.id);
  const uname = msg.from.username ? `@${msg.from.username}` : "Not set";
  bot.sendMessage(
    msg.chat.id,
`👤 *Your Profile*

🆔 User ID: ${msg.chat.id}
👤 Username: ${uname}

💳 Credits: ${u.credits}
👥 Referrals: ${u.referral_count}

👉 DM: @${ADMIN_USERNAME}`,
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
`💰 Pricing (credit based)
10→₹10 | 20→₹15 | 50→₹30 | 70→₹40 | 100→₹50

👉 DM: @${ADMIN_USERNAME}`
  );
});

bot.onText(/\/refer/, (msg) => {
  const id = msg.chat.id;
  const link = `https://t.me/ill_findubot?start=${id}`;
  bot.sendMessage(
    id,
`🎁 *Invite & Earn*

🔗 Your referral link:
${link}

+${REFERRAL_BONUS} credits per successful referral`,
    { parse_mode: "Markdown" }
  );
});

// ====== SEARCH ======
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith("/")) return;
  if (!/^\d{10}$/.test(text)) return;

  if (!(await isJoined(id))) {
    bot.sendMessage(id, "🔒 Join karke **I have joined** dabao");
    return;
  }

  const u = getUser(id);
  if (u.credits < SEARCH_COST) {
    bot.sendMessage(id, `❌ Credits kam\n💳 ${u.credits}\nDM: @${ADMIN_USERNAME}`);
    return;
  }

  try {
    const url = `https://numberinfo-clna.onrender.com/api/lookup?key=${getApiKey()}&mobile=${text}`;
    const res = await axios.get(url);

    let out = "📊 Result\n\n";
    (res.data.result || []).forEach((it, i) => {
      out += `🔹 Record ${i+1}\nName: ${it.name || "NA"}\nCircle: ${it.circle || "NA"}\nAddress: ${it.address || "NA"}\n\n`;
    });

    u.credits -= SEARCH_COST; saveDB();
    out += `💳 Credits left: ${u.credits}`;
    bot.sendMessage(id, out);
  } catch {
    bot.sendMessage(id, "⚠️ Error, baad me try karo");
  }
});
