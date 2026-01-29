const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const http = require("http");
const ADMIN_ID = 6668112301; 


http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Ghoda Unhider Bot is Alive 🐎");
}).listen(process.env.PORT || 3000);


const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEYS = (process.env.API_KEYS || "").split(",").filter(Boolean);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===== CONFIG =====
const ADMIN_USERNAME = "ghoda_bawandr";
const REQUIRED_CHANNEL = "@ghoda_spyyc";
const REQUIRED_GROUP  = "@ghoda_spyygc";

const SEARCH_COST = 3;
const DAILY_FREE_CREDITS = 3;
const REFERRAL_BONUS = 7;

// ===== API KEY ROTATION =====
let keyIndex = 0;
function getApiKey() {
  const k = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return k;
}

// ===== DB =====
const DB_FILE = "users.json";
let db = { users: {} };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
// 🔒 GLOBAL PROTECTED NUMBERS (ADMIN)
db.protected_numbers = db.protected_numbers || [];

// ===== USERS ===== ban checkk
function initUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      credits: DAILY_FREE_CREDITS,
      lastDaily: new Date().toDateString(),
      referred: false,
      referral_count: 0,
      banned: false,
      protected_numbers: [] // user ke protected numbers
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

// ===== JOIN CHECK =====
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

// ===== /START =====
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
  const id = msg.chat.id;
  initUser(id);
  
//list all ke liye container
  db.users[id].username = msg.from.username || null;
saveDB();

  // referral
  if (match && match[1]) {
    const ref = match[1];
    if (ref !== String(id) && db.users[ref] && !db.users[id].referred) {
      db.users[ref].credits += REFERRAL_BONUS;
      db.users[ref].referral_count += 1;
      db.users[id].referred = true;
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
          [{ text: "📢 Join Channel", url: `https://t.me/${REQUIRED_CHANNEL.replace("@","")}` }],
          [{ text: "👥 Join Group", url: `https://t.me/${REQUIRED_GROUP.replace("@","")}` }],
          [{ text: "✅ I have joined", callback_data: "verify_join" }]
        ]
      }
    }
  );
});

// ===== COMMANDS =====
bot.onText(/\/profile/, (msg) => {
  const u = getUser(msg.chat.id);
  bot.sendMessage(
    msg.chat.id,
`👤 Profile
ID: ${msg.chat.id}
Credits: ${u.credits}
Referrals: ${u.referral_count}`
  );
});

bot.onText(/\/credits/, (msg) => {
  const u = getUser(msg.chat.id);
  bot.sendMessage(msg.chat.id, `💳 Credits: ${u.credits}`);
});

bot.onText(/\/buy/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
`💰 Pricing
₹10 → 10 credits
₹15 → 20 credits
₹30 → 50 credits
₹40 → 70 credits
₹50 → 100 credits

DM: @${ADMIN_USERNAME}`
  );
});

bot.onText(/\/refer/, (msg) => {
  const id = msg.chat.id;
  bot.sendMessage(
    id,
`🎁 Referral link:
https://t.me/ill_findubot?start=${id}

+${REFERRAL_BONUS} credits per referral`
  );
});
bot.onText(/\/protectme (\d{10})/, (msg, match) => {
  const id = msg.chat.id;
  const number = match[1];
  initUser(id);

  const u = db.users[id];
  if (u.credits < 100) {
    bot.sendMessage(id, "❌ Need 100 credits to protect your number.");
    return;
  }

  if (!u.protected_numbers.includes(number)) {
    u.protected_numbers.push(number);
    u.credits -= 100;
    saveDB();
  }

  bot.sendMessage(id, `🔒 Your number ${number} is now protected.`);
});

//admin command for add credit
bot.onText(/\/addcredits (\d+) (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = match[1];
  const amount = parseInt(match[2], 10);

  initUser(userId);
  db.users[userId].credits += amount;
  saveDB();

  bot.sendMessage(msg.chat.id, `✅ ${amount} credits added to ${userId}`);
  bot.sendMessage(userId, `💳 Admin added ${amount} credits to your account`);
});

// ban command
bot.onText(/\/ban (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = match[1];
  initUser(userId);
  db.users[userId].banned = true;
  saveDB();

  bot.sendMessage(msg.chat.id, `🚫 User ${userId} banned`);
  bot.sendMessage(userId, "🚫 You have been banned by admin");
});
// Uer unbann
bot.onText(/\/unban (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const userId = match[1];
  initUser(userId);
  db.users[userId].banned = false;
  saveDB();

  bot.sendMessage(msg.chat.id, `✅ User ${userId} unbanned`);
  bot.sendMessage(userId, "✅ You have been unbanned");
});

// ststsss
bot.onText(/\/stats/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  const totalUsers = Object.keys(db.users).length;
  const bannedUsers = Object.values(db.users).filter(u => u.banned).length;

  bot.sendMessage(
    msg.chat.id,
`📊 *Bot Stats*

👥 Total Users: ${totalUsers}
🚫 Banned Users: ${bannedUsers}`,
    { parse_mode: "Markdown" }
  );
});

// broadcasttt
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const message = match[1];
  const users = Object.keys(db.users);

  let success = 0;
  let failed = 0;

  for (const userId of users) {
    try {
      await bot.sendMessage(
        userId,
        `📢 *Admin Broadcast*\n\n${message}`,
        { parse_mode: "Markdown" }
      );
      success++;
    } catch (err) {
      failed++;
    }
  }

  bot.sendMessage(
    msg.chat.id,
`✅ *Broadcast Completed*

👥 Total Users: ${users.length}
📨 Sent: ${success}
❌ Failed: ${failed}`,
    { parse_mode: "Markdown" }
  );
});
// admin protect numnerr
bot.onText(/\/protectnumber (\d{10})/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const number = match[1];
  db.protected_numbers = db.protected_numbers || [];
  if (!db.protected_numbers.includes(number)) {
    db.protected_numbers.push(number);
    saveDB();
  }

  bot.sendMessage(msg.chat.id, `🔒 Number ${number} protected (admin).`);
});
// admin list all
bot.onText(/\/listall/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  const users = Object.entries(db.users);
  if (users.length === 0) {
    bot.sendMessage(msg.chat.id, "No users found.");
    return;
  }

  let out = "👥 *User List*\n\n";
  users.forEach(([id, u], i) => {
    out += `#${i + 1}\n`;
    out += `🆔 ID: ${id}\n`;
    out += `👤 Username: ${u.username || "NA"}\n\n`;
  });

  bot.sendMessage(msg.chat.id, out, { parse_mode: "Markdown" });
});

// ===== CALLBACK =====
bot.on("callback_query", async (q) => {
  const id = q.message.chat.id;

  if (q.data === "verify_join") {
    const ok = await isJoined(id);
    bot.sendMessage(id, ok ? "✅ Verified! Send number" : "❌ Join first");
  }

  bot.answerCallbackQuery(q.id);
});

// ===== MESSAGE HANDLER (LAST & SAFE) =====
bot.on("message", async (msg) => {
  // ignore commands
  if (msg.entities && msg.entities[0]?.type === "bot_command") return;

  const id = msg.chat.id;
  const text = msg.text || "";
  
  // 🚫 BAN CHECK
if (db.users[id]?.banned) {
  bot.sendMessage(id, "🚫 You are banned from using this bot. Contact to Admin MF @ghoda_bawandr");
  return;
}

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
//logic lagaega and search dega
try {
  const res = await axios.get(
    `https://numberinfo-clna.onrender.com/api/lookup?key=${getApiKey()}&mobile=${text}`
  );

  const results = res.data?.result || [];

  // ❌ RESULT EMPTY → SIRF 1 CREDIT
  if (!Array.isArray(results) || results.length === 0) {
    u.credits -= 1;
    if (u.credits < 0) u.credits = 0;
    saveDB();

    bot.sendMessage(
      id,
`❌ Result not Found
Search another & we deducted only 1 credit for our community

💳 Remaining credits: ${u.credits}`
    );
    return;
  }

  // ✅ RESULT FOUND → FULL COST
  u.credits -= SEARCH_COST;
  if (u.credits < 0) u.credits = 0;
  saveDB();

  let output = "📊 *Ghoda Unhider Result*\n\n";

  results.forEach((it, index) => {
    output += `━━━━━━━━━━━━━━━━\n`;
    output += `🔍 *Record #${index + 1}*\n\n`;

    output += `👤 *Name:* ${it.name || "NA"}\n`;
    output += `👨‍👦 *Father:* ${it.father_name || "NA"}\n`;
    output += `📞 *Mobile:* ${it.mobile || "NA"}\n`;
    output += `🆔 *ID Number:* ${it.id_number || "NA"}\n`;
    output += `📡 *Circle:* ${it.circle || "NA"}\n`;

    const cleanAddress = (it.address || "NA")
      .replace(/\s+/g, " ")
      .replace(/!/g, " ")
      .trim();

    output += `🏠 *Address:* ${cleanAddress}\n`;
  });

  output += `━━━━━━━━━━━━━━━━\n`;
  output += `💳 *Credits Left:* ${u.credits}\n`;
  output += `⚡ _Powered by Ghoda Unhider_`;

  bot.sendMessage(id, output, { parse_mode: "Markdown" });

} catch (err) {
  // ❌ API ERROR → SIRF 1 CREDIT
  u.credits -= 1;
  if (u.credits < 0) u.credits = 0;
  saveDB();

  bot.sendMessage(
    id,
`❌ Result not Found
Search another & we deducted only 1 credit for our community

💳 Remaining credits: ${u.credits}`
  );
}










