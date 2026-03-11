const http = require("http");

http.createServer((req,res)=>{
  res.writeHead(200, {"Content-Type":"text/plain"});
  res.end("Bot is running");
}).listen(process.env.PORT || 3000);

//=====
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

// ===== ENV VARIABLES =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY = process.env.API_KEY;

// ===== API =====
const API_URL = "https://ansh-apis.is-dev.org/api/numinfo";

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
bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {

const id = msg.chat.id;

initUser(id);

db.users[id].username = msg.from.username || null;
saveDB();

bot.sendMessage(
id,
`🐎 Ghoda Unhider BOT

Join channel & group first.
Then press "I have joined".

Credits cost per search: ${SEARCH_COST}
Daily free credits: ${DAILY_FREE_CREDITS}

After verification send the suspect number`,
{
reply_markup:{
inline_keyboard:[
[
{ text:"📢 Join Channel", url:`https://t.me/${REQUIRED_CHANNEL.replace("@","")}` }
],
[
{ text:"👥 Join Group", url:`https://t.me/${REQUIRED_GROUP.replace("@","")}` }
],
[
{ text:"✅ I have joined", callback_data:"verify_join" }
]
]
}
}
);

});

bot.on("callback_query", async (q) => {

const id = q.message.chat.id;

if(q.data === "verify_join"){

const ok = await isJoined(id);

if(ok){
bot.sendMessage(id,"✅ Verified! Now send the number.");
}else{
bot.sendMessage(id,"❌ First join the channel and group.");
}

}

bot.answerCallbackQuery(q.id);

});
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

// ===== ADMIN DEDUCT CREDIT =====
bot.onText(/\/deductcredits (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const userId=match[1];
const amount=parseInt(match[2]);

initUser(userId);

db.users[userId].credits-=amount;

if(db.users[userId].credits<0)
db.users[userId].credits=0;

saveDB();

bot.sendMessage(msg.chat.id,"Credits deducted");

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

// ===== STATS =====
bot.onText(/\/stats/,msg=>{

if(msg.from.id!==ADMIN_ID) return;

const totalUsers=Object.keys(db.users).length;
const bannedUsers=Object.values(db.users).filter(u=>u.banned).length;

bot.sendMessage(msg.chat.id,
`📊 Bot Stats

Users: ${totalUsers}
Banned: ${bannedUsers}`);

});

// ===== BROADCAST =====
bot.onText(/\/broadcast (.+)/,async(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const message=match[1];
const users=Object.keys(db.users);

for(const id of users){

try{
await bot.sendMessage(id,`📢 Admin Broadcast

${message}`);
}catch{}

}

bot.sendMessage(msg.chat.id,"Broadcast completed");

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

