const http=require("http");

http.createServer((req,res)=>{
res.writeHead(200,{"Content-Type":"text/plain"});
res.end("Bot alive 🐎");
}).listen(process.env.PORT||3000);

const TelegramBot=require("node-telegram-bot-api");
const axios=require("axios");
const fs=require("fs");
const https=require("https");

const BOT_TOKEN=process.env.BOT_TOKEN;
const API_KEY=process.env.API_KEY;

const API_URL="https://ansh-apis.is-dev.org/api/numinfofree";

const ADMIN_ID=6668112301;
const ADMIN_USERNAME="ghoda_bawandr";

const REQUIRED_CHANNEL="@ghoda_spyyc";
const REQUIRED_GROUP="@ghoda_spyygc";

const SEARCH_COST=3;
const LOGIN_BONUS=5;
const PROTECT_COST=25;

const bot=new TelegramBot(BOT_TOKEN,{polling:true});

const DB_FILE="users.json";

let db={users:{},protected_numbers:[]};

if(fs.existsSync(DB_FILE)){
db=JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(){
fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));
}

function initUser(msg){

const id=msg.chat.id;

if(!db.users[id]){

db.users[id]={
name:msg.from.first_name||"Unknown",
username:msg.from.username||null,
credits:LOGIN_BONUS,
referral_count:0,
referred:false,
banned:false
};

saveDB();

bot.sendMessage(id,
`🎁 Welcome bonus unlocked

Credits: ${LOGIN_BONUS}

Ab Sherlock ban jao 😏`);

}

}

async function isJoined(id){

try{

const c=await bot.getChatMember(REQUIRED_CHANNEL,id);
const g=await bot.getChatMember(REQUIRED_GROUP,id);

const ok=(x)=>["member","administrator","creator"].includes(x.status);

return ok(c)&&ok(g);

}catch{
return false;
}

}

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

bot.onText(/\/credits/,msg=>{

initUser(msg);

bot.sendMessage(msg.chat.id,
`💳 Credits: ${db.users[msg.chat.id].credits}`);

});

bot.onText(/\/buy/,msg=>{

bot.sendMessage(msg.chat.id,
`💰 Credit Shop

₹10 → 10 credits
₹15 → 20 credits
₹30 → 50 credits
₹50 → 100 credits

DM @${ADMIN_USERNAME}`);

});

bot.onText(/\/protectnumber (\d+)/,(msg,match)=>{

const id=msg.chat.id;
const number=match[1];

initUser(msg);

const u=db.users[id];

if(u.credits<PROTECT_COST){

bot.sendMessage(id,"25 credits chahiye protect karne ke liye.");
return;

}

if(db.protected_numbers.includes(number)){

bot.sendMessage(id,"Number already protected.");
return;

}

u.credits-=PROTECT_COST;

db.protected_numbers.push(number);

saveDB();

bot.sendMessage(id,
`🔒 Number protected

${number}

Ab koi user iska data nahi dekhega 😏`);

});

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

bot.onText(/\/broadcast (.+)/,async(msg,match)=>{

if(msg.from.id!==ADMIN_ID) return;

const text=match[1];

for(const id of Object.keys(db.users)){

try{
await bot.sendMessage(id,`📢 Announcement\n\n${text}`);
}catch{}

}

bot.sendMessage(msg.chat.id,"Broadcast done");

});

bot.onText(/\/stats/,msg=>{

if(msg.from.id!==ADMIN_ID) return;

const total=Object.keys(db.users).length;

bot.sendMessage(msg.chat.id,
`📊 Bot Stats

Users: ${total}
Protected numbers: ${db.protected_numbers.length}`);

});

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

bot.on("message",async(msg)=>{

if(msg.entities && msg.entities[0]?.type==="bot_command") return;

initUser(msg);

const id=msg.chat.id;
const text=msg.text||"";

const u=db.users[id];

if(!/^\d{10}$/.test(text)) return;

if(!(await isJoined(id))){
bot.sendMessage(id,"Join channel group pehle.");
return;
}

if(db.protected_numbers.includes(text) && msg.from.id!==ADMIN_ID){
bot.sendMessage(id,"🚫 Ye number protected hai.");
return;
}

if(u.credits<SEARCH_COST && msg.from.id!==ADMIN_ID){

bot.sendMessage(id,"Credits khatam.");
return;

}

try{

const agent=new https.Agent({keepAlive:true});

const res=await axios.get(
`${API_URL}?key=${API_KEY}&num=${text}`,
{timeout:10000,httpsAgent:agent}
);

const data=res.data;

if(!data.success||!data.result||data.result.length===0){

bot.sendMessage(id,"Data nahi mila.");
return;

}

if(msg.from.id!==ADMIN_ID){
u.credits-=SEARCH_COST;
saveDB();
}

let output="📊 Investigation Result\n\n";

data.result.forEach((r,i)=>{

output+=`Record ${i+1}

Name: ${r.name||"NA"}
Father: ${r.father_name||"NA"}
Mobile: ${r.mobile||"NA"}
Circle: ${r.circle||"NA"}
Alt: ${r.alt_mobile||"NA"}
ID: ${r.id_number||"NA"}
Address: ${r.address||"NA"}

`;

});

if(msg.from.id!==ADMIN_ID){
output+=`💳 Credits left: ${u.credits}`;
}

bot.sendMessage(id,output);

}catch{

bot.sendMessage(id,"API error");

}

});
