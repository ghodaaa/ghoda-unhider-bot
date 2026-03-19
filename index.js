// ================================
// SIMPLE HTTP SERVER (Render keep-alive)
// ================================

const http = require("http");

http.createServer((req,res)=>{
res.writeHead(200,{"Content-Type":"text/plain"});
res.end("Bot alive 🐎");
}).listen(process.env.PORT || 3000);


// ================================
// LIBRARIES
// ================================

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const https = require("https");


// ================================
// ENV VARIABLES
// ================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY = process.env.API_KEY;


// ================================
// API CONFIG
// ================================

const API_URL = "https://ansh-apis.is-dev.org/api/numinfofree";


// ================================
// ADMIN CONFIG
// ================================

const ADMIN_ID = 6668112301;
const ADMIN_USERNAME = "ghoda_bawandr";


// ================================
// REQUIRED CHANNELS
// ================================

const REQUIRED_CHANNEL = "@ghoda_spyyc";
const REQUIRED_GROUP = "@ghoda_spyygc";


// ================================
// BOT SETTINGS
// ================================

const SEARCH_COST = 4;
const LOGIN_BONUS = 5;
const PROTECT_COST = 30;
const REFERRAL_BONUS = 3;


// ================================
// START BOT
// ================================

const bot = new TelegramBot(BOT_TOKEN,{polling:true});


// ================================
// DATABASE
// ================================

const DB_FILE = "users.json";

let db = { users:{}, protected_numbers:[] };

if(fs.existsSync(DB_FILE)){
try{
db = JSON.parse(fs.readFileSync(DB_FILE));
}catch{
db = { users:{}, protected_numbers:[] };
}
}

function saveDB(){
fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));
}


// ================================
// INIT USER
// ================================

function initUser(msg){

const id = msg.chat.id;

if(!db.users[id]){

db.users[id] = {
name: msg.from.first_name || "Unknown",
username: msg.from.username || null,
credits: LOGIN_BONUS,
referral_count: 0,
referred_by: null,
banned:false
};

saveDB();

bot.sendMessage(id,
`🎁 Welcome bonus unlocked

Credits: ${LOGIN_BONUS}

Ab Sherlock ban jao 😏`);

}

}


// ================================
// CHECK JOIN
// ================================

async function isJoined(id){

try{

const c = await bot.getChatMember(REQUIRED_CHANNEL,id);
const g = await bot.getChatMember(REQUIRED_GROUP,id);

const ok = (x)=>["member","administrator","creator"].includes(x.status);

return ok(c) && ok(g);

}catch{
return false;
}

}


// ================================
// REFERRAL COMMAND
// ================================

bot.onText(/\/ref/,msg=>{

const id = msg.chat.id;

const link = `https://t.me/${bot.options.username || "ill_findubot"}?start=ref_${id}`;

bot.sendMessage(id,
`🔗 Your referral link:

${link}

Har successful refer pe ${REFERRAL_BONUS} credits milenge 😏`);

});


// ================================
// START COMMAND (WITH REFERRAL)
// ================================

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {

initUser(msg);

const id = msg.chat.id;
const ref = match[1];

// REFERRAL LOGIC
if(ref && ref.startsWith("ref_")){

const referrerId = ref.split("_")[1];

if(
referrerId != id &&
db.users[referrerId] &&
!db.users[id].referred_by
){

db.users[referrerId].credits += REFERRAL_BONUS;
db.users[referrerId].referral_count += 1;

db.users[id].referred_by = referrerId;

saveDB();

bot.sendMessage(referrerId,
`🎉 New referral joined!

User: ${msg.from.first_name}
+${REFERRAL_BONUS} credits added 😏`);

}

}

bot.sendMessage(id,
`🐎 Ghoda Unhider BOT

Spy banna hai tujhe?

Join channel & group first.`,
{
reply_markup:{
inline_keyboard:[
[{text:"📢 Join Channel",url:`https://t.me/${REQUIRED_CHANNEL.replace("@","")}`}],
[{text:"👥 Join Group",url:`https://t.me/${REQUIRED_GROUP.replace("@","")}`}],
[{text:"✅ I have joined",callback_data:"verify_join"}]
]
}
});

});


// ================================
// JOIN VERIFY
// ================================

bot.on("callback_query",async(q)=>{

if(q.data==="verify_join"){

const id = q.message.chat.id;

if(await isJoined(id)){

bot.answerCallbackQuery(q.id,{text:"Verified"});
bot.sendMessage(id,"Verification done. Ab number bhej.");

}else{

bot.answerCallbackQuery(q.id,{
text:"Join kar pehle channel & group",
show_alert:true
});

}

}

});


// ================================
// PROFILE
// ================================

bot.onText(/\/profile/,msg=>{

initUser(msg);

const u = db.users[msg.chat.id];

bot.sendMessage(msg.chat.id,
`👤 Profile

Name: ${u.name}
Username: @${u.username || "none"}
ID: ${msg.chat.id}

Credits: ${u.credits}
Referrals: ${u.referral_count}`);

});


// ================================
// BUY
// ================================

bot.onText(/\/buy/,msg=>{

bot.sendMessage(msg.chat.id,
`💰 Credit Shop

₹10 → 10 credits
₹20 → 25 credits
₹35 → 50 credits
₹50 → 80 credits
₹100 → 200 credits
₹200 → 500 credits

DM @${ADMIN_USERNAME}`);

});
// ================================
// HELP COMMAND
// ================================

bot.onText(/\/help/,msg=>{

let helpText=`📖 Ghoda Unhider Bot Guide

🔎 Number Search
Send any 10 digit number

Example:
9889585089

💳 Search Cost: ${SEARCH_COST} credits

━━━━━━━━━━━━━━━
User Commands
━━━━━━━━━━━━━━━

/start
/profile
/buy
/ref
/protectnumber
/help

━━━━━━━━━━━━━━━
Referral System

Har refer pe ${REFERRAL_BONUS} credits milte hai 😏

━━━━━━━━━━━━━━━
Protect Number

/protectnumber 9876543210

Cost: ${PROTECT_COST} credits

━━━━━━━━━━━━━━━
Bot Developer
@${ADMIN_USERNAME}
`;

bot.sendMessage(msg.chat.id,helpText);

});


// ================================
// PROTECT NUMBER
// ================================

bot.onText(/\/protectnumber (\d+)/,(msg,match)=>{

const id = msg.chat.id;
const number = match[1];

initUser(msg);

const u = db.users[id];

if(u.credits < PROTECT_COST){
bot.sendMessage(id,"30 credits chahiye protect karne ke liye.");
return;
}

if(db.protected_numbers.includes(number)){
bot.sendMessage(id,"Number already protected.");
return;
}

u.credits -= PROTECT_COST;

db.protected_numbers.push(number);

saveDB();

bot.sendMessage(id,
`🔒 Number is protected

${number}

Ab koi user iska data nahi dekhega 😏`);

});


// ================================
// ADMIN ADD CREDIT
// ================================

bot.onText(/\/addcredit (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const uid = match[1];
const amount = parseInt(match[2]);

if(db.users[uid]){

db.users[uid].credits += amount;

saveDB();

bot.sendMessage(msg.chat.id,"Credits added");

}

});


// ================================
// ADMIN DEDUCT CREDIT
// ================================

bot.onText(/\/deductcredit (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const uid = match[1];
const amount = parseInt(match[2]);

if(db.users[uid]){

db.users[uid].credits -= amount;

if(db.users[uid].credits < 0){
db.users[uid].credits = 0;
}

saveDB();

bot.sendMessage(msg.chat.id,"Credits deducted");

}

});


// ================================
// ADMIN PROTECTED LIST
// ================================

bot.onText(/\/plist/,msg=>{

if(msg.from.id !== ADMIN_ID) return;

let text = "Protected numbers\n\n";

db.protected_numbers.forEach(n=>{

text += n + "\n";

if(text.length > 3500){
bot.sendMessage(msg.chat.id,text);
text="";
}

});

if(text) bot.sendMessage(msg.chat.id,text);

});


// ================================
// ADMIN UNPROTECT
// ================================

bot.onText(/\/unprotect (\d+)/,(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const number = match[1];

const index = db.protected_numbers.indexOf(number);

if(index === -1){

bot.sendMessage(msg.chat.id,
`⚠️ Ye number protected list me nahi hai.

Number: ${number}`);

return;

}

db.protected_numbers.splice(index,1);

saveDB();

bot.sendMessage(msg.chat.id,
`🔓 Number unprotected successfully

${number}`);

});


// ================================
// ADMIN BROADCAST
// ================================

bot.onText(/\/broadcast (.+)/,async(msg,match)=>{

if(msg.from.id !== ADMIN_ID) return;

const text = match[1];

for(const id of Object.keys(db.users)){

try{
await bot.sendMessage(id,`📢 Announcement\n\n${text}`);
}catch{}

}

bot.sendMessage(msg.chat.id,"Broadcast done");

});


// ================================
// ADMIN STATS
// ================================

bot.onText(/\/stats/,msg=>{

if(msg.from.id !== ADMIN_ID) return;

const total = Object.keys(db.users).length;

bot.sendMessage(msg.chat.id,
`📊 Bot Stats

Users: ${total}
Protected numbers: ${db.protected_numbers.length}`);

});


// ================================
// ADMIN LIST USERS
// ================================

bot.onText(/\/listall/,msg=>{

if(msg.from.id !== ADMIN_ID) return;

let text = "Users list\n\n";

for(const id of Object.keys(db.users)){

const u = db.users[id];

text += `Name: ${u.name}
Username: @${u.username || "none"}
ID: ${id}
Credits: ${u.credits}
Referrals: ${u.referral_count}

`;

if(text.length > 3500){

bot.sendMessage(msg.chat.id,text);
text="";

}

}

if(text) bot.sendMessage(msg.chat.id,text);

});


// ================================
// ADMIN TOP REFERRERS
// ================================

bot.onText(/\/topref/,msg=>{

if(msg.from.id !== ADMIN_ID) return;

let users = Object.entries(db.users);

users.sort((a,b)=> b[1].referral_count - a[1].referral_count);

let top = users.slice(0,5);

let text = "🏆 Top 5 Referrers\n\n";

top.forEach(([id,u],i)=>{

text += `${i+1}. ${u.name}
ID: ${id}
Referrals: ${u.referral_count}

`;

});

bot.sendMessage(msg.chat.id,text);

});


// ================================
// NUMBER SEARCH
// ================================

bot.on("message",async(msg)=>{

if(msg.entities && msg.entities[0]?.type==="bot_command") return;

initUser(msg);

const id = msg.chat.id;
const text = msg.text || "";

const u = db.users[id];

// only 10 digit
if(!/^\d{10}$/.test(text)) return;

// join check
if(!(await isJoined(id))){
bot.sendMessage(id,"Join channel group pehle.");
return;
}

// protected check
if(db.protected_numbers.includes(text) && msg.from.id !== ADMIN_ID){
bot.sendMessage(id,"🚫 Ye number protected hai.");
return;
}

// credit check
if(u.credits < SEARCH_COST && msg.from.id !== ADMIN_ID){
bot.sendMessage(id,"Credits khatam.");
return;
}

try{

const agent = new https.Agent({keepAlive:true});

const res = await axios.get(
`${API_URL}?key=${API_KEY}&num=${text}`,
{timeout:10000,httpsAgent:agent}
);

const data = res.data;

if(!data.success || !data.result || data.result.length===0){
bot.sendMessage(id,"Data nahi mila.");
return;
}

// deduct credits
if(msg.from.id !== ADMIN_ID){
u.credits -= SEARCH_COST;
saveDB();
}

let output = "📊 Investigation Result\n\n";

data.result.forEach((r,i)=>{

output += `Record ${i+1}

Name: ${r.name || "NA"}
Father: ${r.father_name || "NA"}
Mobile: ${r.mobile || "NA"}
Circle: ${r.circle || "NA"}
Alt: ${r.alt_mobile || "NA"}
ID: ${r.id_number || "NA"}
Address: ${r.address || "NA"}

`;

});

if(msg.from.id !== ADMIN_ID){
output += `💳 Credits left: ${u.credits}`;
}

bot.sendMessage(id,output);

}catch(err){

console.log(err);
bot.sendMessage(id,"API error");

}

});
