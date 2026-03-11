const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

// ===== BOT TOKEN =====
const BOT_TOKEN = "8203325157:AAFbx4v_p4Pbp2rOldglQVfzSVjJviq97Lw";

// ===== API =====
const API_URL = "https://ansh-apis.is-dev.org/api/numinfo";
const API_KEY = "ansh&num";

const ADMIN_ID = 6668112301;
const ADMIN_USERNAME = "ghoda_bawandr";

const REQUIRED_CHANNEL = "@ghoda_spyyc";
const REQUIRED_GROUP = "@ghoda_spyygc";

const SEARCH_COST = 3;
const DAILY_FREE_CREDITS = 4;
const REFERRAL_BONUS = 5;

const bot = new TelegramBot(BOT_TOKEN,{polling:true});

bot.on("polling_error",(err)=>console.log(err));

// ===== DATABASE =====
const DB_FILE="users.json";
let db={users:{}};

if(fs.existsSync(DB_FILE)){
db=JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(){
fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));
}

db.protected_numbers=db.protected_numbers || [];

// ===== USER INIT =====
function initUser(id){

if(!db.users[id]){

db.users[id]={
credits:DAILY_FREE_CREDITS,
lastDaily:new Date().toDateString(),
referred:false,
referral_count:0,
banned:false,
protected_numbers:[]
};

saveDB();
}

}

function getUser(id){

initUser(id);

const today=new Date().toDateString();

if(db.users[id].lastDaily!==today){

db.users[id].credits+=DAILY_FREE_CREDITS;
db.users[id].lastDaily=today;

saveDB();

}

return db.users[id];
}

// ===== JOIN CHECK =====
async function isJoined(chatId){

try{

const c=await bot.getChatMember(REQUIRED_CHANNEL,chatId);
const g=await bot.getChatMember(REQUIRED_GROUP,chatId);

const ok=(x)=>["member","administrator","creator"].includes(x.status);

return ok(c)&&ok(g);

}catch{
return false;
}

}

// ===== START =====
bot.onText(/\/start(?:\s+(\d+))?/,async(msg,match)=>{

const id=msg.chat.id;

initUser(id);

db.users[id].username=msg.from.username || null;
saveDB();

// referral
if(match && match[1]){

const ref=match[1];

if(ref!==String(id) && db.users[ref] && !db.users[id].referred){

db.users[ref].credits+=REFERRAL_BONUS;
db.users[ref].referral_count+=1;

db.users[id].referred=true;

saveDB();

bot.sendMessage(id,"🎁 Referral successful");
bot.sendMessage(ref,`🎉 New referral +${REFERRAL_BONUS} credits`);

}

}

bot.sendMessage(id,
`🐎 Ghoda Unhider BOT

Join channel & group first

Credits per search: ${SEARCH_COST}
Daily free credits: ${DAILY_FREE_CREDITS}

Send suspect number`);

});

// ===== PROFILE =====
bot.onText(/\/profile/,msg=>{

const u=getUser(msg.chat.id);

bot.sendMessage(msg.chat.id,
`👤 Profile

ID: ${msg.chat.id}
Credits: ${u.credits}
Referrals: ${u.referral_count}`);

});

// ===== CREDITS =====
bot.onText(/\/credits/,msg=>{

const u=getUser(msg.chat.id);

bot.sendMessage(msg.chat.id,`💳 Credits: ${u.credits}`);

});

// ===== BUY =====
bot.onText(/\/buy/,msg=>{

bot.sendMessage(msg.chat.id,
`💰 Pricing

₹10 → 10 credits
₹15 → 20 credits
₹30 → 50 credits
₹40 → 70 credits
₹50 → 100 credits

DM: @${ADMIN_USERNAME}`);

});

// ===== REFER =====
bot.onText(/\/refer/,msg=>{

const id=msg.chat.id;

bot.sendMessage(id,
`🎁 Referral link

https://t.me/ill_findubot?start=${id}

+${REFERRAL_BONUS} credits per referral`);

});

// ===== ADMIN ADD CREDIT =====
bot.onText(/\/addcredits (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const userId=match[1];
const amount=parseInt(match[2]);

initUser(userId);

db.users[userId].credits+=amount;

saveDB();

bot.sendMessage(msg.chat.id,"Credits added");

});

// ===== BAN =====
bot.onText(/\/ban (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const userId=match[1];

initUser(userId);

db.users[userId].banned=true;

saveDB();

bot.sendMessage(msg.chat.id,"User banned");

});

// ===== UNBAN =====
bot.onText(/\/unban (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const userId=match[1];

initUser(userId);

db.users[userId].banned=false;

saveDB();

bot.sendMessage(msg.chat.id,"User unbanned");

});

// ===== MESSAGE HANDLER =====
bot.on("message",async(msg)=>{

if(msg.entities && msg.entities[0]?.type==="bot_command") return;

const id=msg.chat.id;
const text=msg.text || "";

initUser(id);

const u=db.users[id];

if(u.banned){
bot.sendMessage(id,"🚫 You are banned");
return;
}

if(!/^\d{10}$/.test(text)) return;

if(!(await isJoined(id))){
bot.sendMessage(id,"Join channel & group first");
return;
}

if(u.credits < SEARCH_COST){
bot.sendMessage(id,"Not enough credits");
return;
}

try{

const res=await axios.get(`${API_URL}?key=${API_KEY}&num=${text}`);

const results=res.data?.result || [];

if(results.length===0){

u.credits -= 1;
saveDB();

bot.sendMessage(id,"❌ Result not found");

return;

}

u.credits -= SEARCH_COST;
saveDB();

let output="📊 Ghoda Unhider Result\n\n";

results.forEach((r,i)=>{

output+=`Record #${i+1}

👤 Name: ${r.name || "NA"}
👨 Father: ${r.father_name || "NA"}
📞 Mobile: ${r.mobile || text}
📡 Circle: ${r.circle || "NA"}
🆔 ID: ${r.id_number || "NA"}
🏠 Address: ${r.address || "NA"}

`;

});

output+=`💳 Credits left: ${u.credits}`;

bot.sendMessage(id,output);

}catch(err){

console.log(err);

bot.sendMessage(id,"❌ API error");

}

});
