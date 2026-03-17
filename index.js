// ================================
// SIMPLE HTTP SERVER (Render keep-alive)
// ================================

const http=require("http");

// Render free hosting idle होने पर service sleep कर देता है
// यह server ping receive करता है ताकि bot active रहे

http.createServer((req,res)=>{
res.writeHead(200,{"Content-Type":"text/plain"});
res.end("Bot alive 🐎");
}).listen(process.env.PORT||3000);


// ================================
// REQUIRED LIBRARIES
// ================================

const TelegramBot=require("node-telegram-bot-api"); // telegram bot library
const axios=require("axios"); // API requests
const fs=require("fs"); // file system (database)
const https=require("https"); // secure requests


// ================================
// ENV VARIABLES (Render dashboard)
// ================================

const BOT_TOKEN=process.env.BOT_TOKEN; // telegram bot token
const API_KEY=process.env.API_KEY; // API key


// ================================
// API CONFIG
// ================================

const API_URL="https://ansh-apis.is-dev.org/api/numinfofree";


// ================================
// ADMIN CONFIG
// ================================

const ADMIN_ID=6668112301;
const ADMIN_USERNAME="ghoda_bawandr";


// ================================
// REQUIRED CHANNELS (join verification)
// ================================

const REQUIRED_CHANNEL="@ghoda_spyyc";
const REQUIRED_GROUP="@ghoda_spyygc";


// ================================
// BOT SETTINGS
// ================================

const SEARCH_COST=3;       // search cost per number
const LOGIN_BONUS=5;       // first time login credits
const PROTECT_COST=25;     // protect number cost


// ================================
// TELEGRAM BOT START
// ================================

const bot=new TelegramBot(BOT_TOKEN,{polling:true});


// ================================
// DATABASE FILE
// ================================

const DB_FILE="users.json";

// database structure
let db={users:{},protected_numbers:[]};


// अगर file exist करती है तो load करो
if(fs.existsSync(DB_FILE)){
db=JSON.parse(fs.readFileSync(DB_FILE));
}


// ================================
// SAVE DATABASE FUNCTION
// ================================

function saveDB(){
fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));
}


// ================================
// USER INITIALIZATION
// ================================

function initUser(msg){

const id=msg.chat.id;

// अगर user database में नहीं है
if(!db.users[id]){

// नया user create
db.users[id]={
name:msg.from.first_name||"Unknown",
username:msg.from.username||null,
credits:LOGIN_BONUS,
referral_count:0,
referred:false,
banned:false
};

saveDB();

// welcome bonus message
bot.sendMessage(id,
`🎁 Welcome bonus unlocked

Credits: ${LOGIN_BONUS}

Ab Sherlock ban jao 😏`);

}

}


// ================================
// CHECK USER JOINED CHANNEL & GROUP
// ================================

async function isJoined(id){

try{

const c=await bot.getChatMember(REQUIRED_CHANNEL,id);
const g=await bot.getChatMember(REQUIRED_GROUP,id);

// allowed roles
const ok=(x)=>["member","administrator","creator"].includes(x.status);

return ok(c)&&ok(g);

}catch{
return false;
}

}


// ================================
// JOIN BUTTON CALLBACK
// ================================

bot.on("callback_query",async(q)=>{

if(q.data==="verify_join"){

const id=q.message.chat.id;

if(await isJoined(id)){

bot.answerCallbackQuery(q.id,{text:"Verified"});
bot.sendMessage(id,"Verification done. Ab number bhej.");

}else{

bot.answerCallbackQuery(q.id,{
text:"Join channel group pehle",
show_alert:true
});

}

}

});


// ================================
// /start COMMAND
// ================================

bot.onText(/\/start/,msg=>{

initUser(msg);

const id=msg.chat.id;

bot.sendMessage(id,
`🐎 Ghoda Unhider BOT

Spy banna hai?

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
// USER PROFILE COMMAND
// ================================

bot.onText(/\/profile/,msg=>{

initUser(msg);

const u=db.users[msg.chat.id];

bot.sendMessage(msg.chat.id,
`👤 Profile

Name: ${u.name}
Username: @${u.username||"none"}
ID: ${msg.chat.id}

Credits: ${u.credits}`);

});


// ================================
// USER CREDIT CHECK
// ================================

bot.onText(/\/credits/,msg=>{

initUser(msg);

bot.sendMessage(msg.chat.id,
`💳 Credits: ${db.users[msg.chat.id].credits}`);

});


// ================================
// BUY CREDITS COMMAND
// ================================

bot.onText(/\/buy/,msg=>{

bot.sendMessage(msg.chat.id,
`💰 Credit Shop

₹10 → 10 credits
₹15 → 20 credits
₹30 → 50 credits
₹50 → 100 credits

DM @${ADMIN_USERNAME}`);

});

// ================================
// HELP COMMAND
// ================================

bot.onText(/\/help/,msg=>{

let helpText=`📖 Ghoda Unhider Bot Guide

Welcome detective 🕵️‍♂️

Ye bot phone number investigation ke liye banaya gaya hai.

━━━━━━━━━━━━━━━
🔎 Number Search
━━━━━━━━━━━━━━━

Bas koi bhi 10 digit mobile number bhejo

Example:
9889585089

Bot uska available data nikal ke dega.

━━━━━━━━━━━━━━━
💳 Credits System
━━━━━━━━━━━━━━━

Har search cost: ${SEARCH_COST} credits

New users ko welcome bonus milta hai.

Credits khatam ho gaye?

Use:
/buy

━━━━━━━━━━━━━━━
🔒 Protect Number
━━━━━━━━━━━━━━━

Agar kisi number ka data hide karna hai

Use:
/protectnumber 9876543210

Cost: ${PROTECT_COST} credits

Uske baad koi user us number ka data nahi dekh payega.

━━━━━━━━━━━━━━━
👤 User Commands
━━━━━━━━━━━━━━━

/start → bot start karo
/profile → apna profile dekho
/credits → apne credits check karo
/buy → credits purchase info
/protectnumber → number protect karo
/help → ye guide

━━━━━━━━━━━━━━━
⚠️ Important Rules
━━━━━━━━━━━━━━━

• Channel & group join zaroori hai
• Invalid number ignore hoga
• Protected numbers show nahi honge

━━━━━━━━━━━━━━━
Bot developed by
@${ADMIN_USERNAME}
`;

bot.sendMessage(msg.chat.id,helpText);

});
// ================================
// USER PROTECT NUMBER COMMAND
// ================================

bot.onText(/\/protectnumber (\d+)/,(msg,match)=>{

const id=msg.chat.id;
const number=match[1];

initUser(msg);

const u=db.users[id];

// credits check
if(u.credits<PROTECT_COST){
bot.sendMessage(id,"25 credits chahiye protect karne ke liye.");
return;
}

// number already protected check
if(db.protected_numbers.includes(number)){
bot.sendMessage(id,"Number already protected.");
return;
}

// deduct credits
u.credits-=PROTECT_COST;

// add number to protected list
db.protected_numbers.push(number);

saveDB();

bot.sendMessage(id,
`🔒 Number protected

${number}

Ab koi user iska data nahi dekhega 😏`);

});


// ================================
// ADMIN ADD CREDIT
// ================================

bot.onText(/\/addcredit (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const uid=match[1];
const amount=parseInt(match[2]);

if(db.users[uid]){

db.users[uid].credits+=amount;

saveDB();

bot.sendMessage(msg.chat.id,"Credits added");

}

});


// ================================
// ADMIN DEDUCT CREDIT
// ================================

bot.onText(/\/deductcredit (\d+) (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const uid=match[1];
const amount=parseInt(match[2]);

if(db.users[uid]){

db.users[uid].credits-=amount;

if(db.users[uid].credits<0) db.users[uid].credits=0;

saveDB();

bot.sendMessage(msg.chat.id,"Credits deducted");

}

});


// ================================
// ADMIN VIEW PROTECTED NUMBERS
// ================================

bot.onText(/\/plist/,msg=>{

if(msg.from.id!==ADMIN_ID) return;

let text="Protected numbers\n\n";

db.protected_numbers.forEach(n=>{

text+=n+"\n";

if(text.length>3500){
bot.sendMessage(msg.chat.id,text);
text="";
}

});

if(text) bot.sendMessage(msg.chat.id,text);

});

// ================================
// ADMIN UNPROTECT NUMBER
// ================================

bot.onText(/\/unprotect (\d+)/,(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const number=match[1];

const index=db.protected_numbers.indexOf(number);

if(index===-1){

bot.sendMessage(msg.chat.id,
`⚠️ Ye number protected list me nahi hai.

Number: ${number}`);

return;

}

// remove number
db.protected_numbers.splice(index,1);

saveDB();

bot.sendMessage(msg.chat.id,
`🔓 Number unprotected successfully

${number}

Ab iska data sab users dekh sakte hain.`);
});

// ================================
// ADMIN BROADCAST MESSAGE
// ================================

bot.onText(/\/broadcast (.+)/,async(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const text=match[1];

// send message to all users
for(const id of Object.keys(db.users)){

try{
await bot.sendMessage(id,`📢 Announcement\n\n${text}`);
}catch{}

}

bot.sendMessage(msg.chat.id,"Broadcast done");

});


// ================================
// ADMIN BOT STATS
// ================================

bot.onText(/\/stats/,msg=>{

if(msg.from.id!==ADMIN_ID) return;

const total=Object.keys(db.users).length;

bot.sendMessage(msg.chat.id,
`📊 Bot Stats

Users: ${total}
Protected numbers: ${db.protected_numbers.length}`);

});


// ================================
// ADMIN LIST ALL USERS
// ================================

bot.onText(/\/listall/,msg=>{

if(msg.from.id!==ADMIN_ID) return;

let text="Users list\n\n";

for(const id of Object.keys(db.users)){

const u=db.users[id];

text+=`Name: ${u.name}
Username: @${u.username||"none"}
ID: ${id}
Credits: ${u.credits}

`;

if(text.length>3500){

bot.sendMessage(msg.chat.id,text);
text="";

}

}

if(text) bot.sendMessage(msg.chat.id,text);

});


// ================================
// NUMBER SEARCH HANDLER
// ================================

bot.on("message",async(msg)=>{

// ignore commands
if(msg.entities && msg.entities[0]?.type==="bot_command") return;

initUser(msg);

const id=msg.chat.id;
const text=msg.text||"";

const u=db.users[id];

// allow only 10 digit numbers
if(!/^\d{10}$/.test(text)) return;

// check join
if(!(await isJoined(id))){
bot.sendMessage(id,"Join channel group pehle.");
return;
}

// protected number check
if(db.protected_numbers.includes(text) && msg.from.id!==ADMIN_ID){
bot.sendMessage(id,"🚫 Ye number protected hai.");
return;
}

// credit check
if(u.credits<SEARCH_COST && msg.from.id!==ADMIN_ID){
bot.sendMessage(id,"Credits khatam.");
return;
}

try{

const agent=new https.Agent({keepAlive:true});

// API request
const res=await axios.get(
`${API_URL}?key=${API_KEY}&num=${text}`,
{timeout:10000,httpsAgent:agent}
);

const data=res.data;

// no result case
if(!data.success||!data.result||data.result.length===0){
bot.sendMessage(id,"Data nahi mila.");
return;
}

// deduct credits for users
if(msg.from.id!==ADMIN_ID){
u.credits-=SEARCH_COST;
saveDB();
}

let output="📊 Investigation Result\n\n";

let output="📊 Investigation Result\n\n";

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

if(msg.from.id!==ADMIN_ID){
output += `💳 Credits left: ${u.credits}`;
}

bot.sendMessage(id,output);
