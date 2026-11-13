const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/sessions/nifty-trusting-wozniak/mnt/Muvapp/index.html','utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://gredai.github.io/muvapp/',pretendToBeVisual:true,
 beforeParse(w){w.AudioContext=function(){};w.navigator.serviceWorker={register:()=>Promise.resolve()};w.scrollTo=()=>{};w.addEventListener('error',e=>errs.push(e.message))}});
const w=dom.window,d=w.document;
setTimeout(()=>{
 // seleziona corsi venerdì: HIIT, SixPack, Legs and Butt, Pump ; mercoledì Tabata, ABS, Circuit
 w.eval(`GYM_SCHEDULE.filter(c=>(c.day==='Venerdì'&&['H.I.I.T.','SixPack','Legs and Butt','Pump'].includes(c.name))||(c.day==='Mercoledì'&&['Tabata','ABS','Circuit'].includes(c.name))).forEach(c=>myGymWeek[gymKey(c)]=true)`);
 for(const day of ['Mercoledì','Venerdì','Domenica']){
  w.eval(`openDayPlan('${day}')`);
  console.log('==',day,'\n',d.getElementById('plan-body').textContent.replace(/\s+/g,' ').slice(0,700));
 }
 w.eval('goHome()');
 console.log('chips:',[...d.querySelectorAll('#category-chips .chip')].map(x=>x.textContent).join(' | '));
 console.log('today:',d.getElementById('today-card').textContent.replace(/\s+/g,' '));
 console.log('errors',errs);
},500);
