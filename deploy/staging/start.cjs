const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {gateway,probe}=require('./gateway.cjs');
const {supervise}=require('./supervise.cjs');
const root=path.resolve(__dirname,'../..');
const build=JSON.parse(fs.readFileSync(path.join(root,'frontend/staging-build.json'),'utf8'));
const origin=(process.env.APP_URL||'').replace(/\/$/,'');
if(origin!==build.origin)throw Error('APP_URL must match the public origin used at build time');
for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])if(!process.env[key])throw Error('Missing required variable: '+key);
let ready=false;
const server=gateway({ready:()=>ready});
const lifecycle=supervise(server);
server.listen(Number(process.env.PORT||8080),'0.0.0.0');
const common={...process.env,APP_URL:origin,PLATFORM_WEBSITE:origin,PUBLIC_APP_URL:origin,FRONTEND_URL:origin,BOOKING_BASE_URL:origin+'/agendar',APP_NAME:build.name,PLATFORM_NAME:build.name,HOST:'127.0.0.1',NODE_ENV:'production',REMINDER_SCHEDULER_ENABLED:'false',WHATSAPP_QUEUE_ENABLED:'false',CAMPAIGN_SCHEDULER_ENABLED:'false',BIRTHDAY_GREETING_SCHEDULER_ENABLED:'false',WHATSAPP_DRY_RUN:'true',WHATSAPP_CLOUD_API_ENABLED:'false'};
function start(folder,args,env){
  const child=spawn(process.execPath,args,{cwd:path.join(root,folder),env,stdio:'inherit'});
  lifecycle.watch(child);
}
// Do not pass backend secrets to the frontend process.
const frontEnv={PATH:process.env.PATH,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'3000',NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS:'true',DEV_PWA_MANIFEST_CREDENTIALS:'false',NEXT_PUBLIC_APP_URL:origin,NEXT_PUBLIC_APP_NAME:build.name,NEXT_PUBLIC_APP_LOGO_URL:build.logo,NEXT_PUBLIC_APP_SUPPORT_EMAIL:build.support,NEXT_PUBLIC_API_URL:'/api'};
start('frontend',['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3000'],frontEnv);
start('backend',['src/server.js'],{...common,PORT:'3001'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>lifecycle.shutdown(0));
(async()=>{
  let everReady=false,failures=0,attempts=0;
  while(!lifecycle.stopping){
    const state=await probe(3000,3001);
    ready=!!(state.frontend && state.backend);
    if(ready){if(!everReady)console.log('Staging services ready');everReady=true;failures=0;}
    else if((everReady && ++failures>=3)||(!everReady && ++attempts>=60)){lifecycle.shutdown(1);return;}
    await new Promise(r=>setTimeout(r,everReady?5000:1000));
  }
})();
