import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const htmlPath=new URL('index.html',root);
const cachePath=new URL('video-map-cache.json',import.meta.url);
const overridesPath=new URL('video-overrides.json',import.meta.url);
const outPath=new URL('video-map.js',root);
const html=fs.readFileSync(htmlPath,'utf8');
const prefix=html.slice(html.indexOf('const SP_ROOT'),html.indexOf('const MG='));
const COURSES=new Function(prefix+';return COURSES;')();
const topics=[];
COURSES.forEach(c=>c.units.forEach(u=>u.topics.forEach(t=>topics.push({
  id:c.id+':'+t[0].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  course:c.id,courseName:c.name,spec:c.spec,title:t[0],q:t[1]
}))));

const preferred={maths:'Cognito',science:'Cognito',english:'Mr Bruff',cs:'Craig n Dave',geography:'Time for Geography',business:'Two Teachers'};
const board={maths:'AQA',science:'Edexcel',english:'Edexcel',cs:'OCR J277',geography:'OCR A',business:'Edexcel'};
const stop=new Set('gcse aqa edexcel ocr higher combined science maths mathematics english language literature computer geography business topic paper section spec specification the and or of to in for with from how what why using use an a part lesson revision exam exams marks mark'.split(' '));
const words=s=>[...new Set(String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9²³]+/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w)&&!/^\d+$/.test(w)))];
const channelMatch=(actual,wanted)=>words(actual).some(w=>words(wanted).includes(w));
function score(v,t,index){
  const target=words(`${t.q} ${t.title}`),title=words(v.title),matches=target.filter(w=>title.includes(w)).length;
  let n=(matches/Math.max(2,Math.min(target.length,9)))*100+(channelMatch(v.channel,preferred[t.course])?28:0)+Math.max(0,8-index);
  if(/shorts?/i.test(v.title)||Number(v.duration||0)<75)n-=18;
  return Math.round(n);
}
function collectVideos(obj,out=[]){
  if(!obj||typeof obj!=='object')return out;
  if(obj.videoRenderer){const v=obj.videoRenderer;out.push({id:v.videoId,title:v.title?.runs?.map(x=>x.text).join('')||'',channel:v.ownerText?.runs?.map(x=>x.text).join('')||'',duration:v.lengthText?.simpleText||''});return out}
  for(const value of Object.values(obj))collectVideos(value,out);
  return out;
}
const home=await(await fetch('https://www.youtube.com',{headers:{'User-Agent':'Mozilla/5.0'}})).text();
const apiKey=home.match(/"INNERTUBE_API_KEY":"([^"]+)/)?.[1];
const clientVersion=home.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)/)?.[1];
if(!apiKey||!clientVersion)throw new Error('Could not initialise YouTube search');
async function search(query){
  let last;
  for(let attempt=0;attempt<4;attempt++)try{
    const r=await fetch('https://www.youtube.com/youtubei/v1/search?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion}},query})});
    if(!r.ok)throw new Error('YouTube '+r.status);
    return collectVideos(await r.json()).filter((v,i,a)=>v.id&&a.findIndex(x=>x.id===v.id)===i).slice(0,12);
  }catch(e){last=e;await new Promise(r=>setTimeout(r,800*2**attempt))}
  throw last;
}
let cache={};try{cache=JSON.parse(fs.readFileSync(cachePath,'utf8'))}catch(e){}
const limitArg=process.argv.find(x=>x.startsWith('--limit='));
const retryWeak=process.argv.includes('--retry-weak');
const work=retryWeak?topics.filter(t=>!cache[t.id]?.id||(cache[t.id].score||0)<48):(limitArg?topics.slice(0,Number(limitArg.split('=')[1])):topics);
if(retryWeak)work.forEach(t=>delete cache[t.id]);
let cursor=0,finished=0;
async function worker(){while(true){
  const i=cursor++;if(i>=work.length)return;const t=work[i];if(cache[t.id]?.id){finished++;continue}
  const query=`${preferred[t.course]} ${t.q}`;
  try{
    let videos=await search(query),ranked=videos.map((v,n)=>({...v,score:score(v,t,n),query})).sort((a,b)=>b.score-a.score);
    if(!ranked[0]||ranked[0].score<48){const alt=`${t.courseName} GCSE ${t.title}`;const more=await search(alt);ranked=[...ranked,...more.map((v,n)=>({...v,score:score(v,t,n),query:alt}))].filter((v,n,a)=>a.findIndex(x=>x.id===v.id)===n).sort((a,b)=>b.score-a.score)}
    if(!ranked[0]||ranked[0].score<48){const exact=`${board[t.course]} GCSE ${t.courseName} ${t.title}`;const more=await search(exact);ranked=[...ranked,...more.map((v,n)=>({...v,score:score(v,t,n),query:exact}))].filter((v,n,a)=>a.findIndex(x=>x.id===v.id)===n).sort((a,b)=>b.score-a.score)}
    const best=ranked[0];cache[t.id]=best?{id:best.id,title:best.title,channel:best.channel,score:best.score,query:best.query,topic:t.title,course:t.course}:{id:null,topic:t.title,course:t.course,error:'No result'};
  }catch(e){cache[t.id]={id:null,topic:t.title,course:t.course,error:e.message}}
  finished++;if(finished%20===0||finished===work.length){fs.writeFileSync(cachePath,JSON.stringify(cache,null,2));console.log(`${finished}/${work.length}`)}
}}
await Promise.all(Array.from({length:6},worker));
fs.writeFileSync(cachePath,JSON.stringify(cache,null,2));
const ids=Object.fromEntries(topics.filter(t=>cache[t.id]?.id).map(t=>[t.id,cache[t.id].id]));
const titles=Object.fromEntries(topics.filter(t=>cache[t.id]?.id).map(t=>[t.id,cache[t.id].title]));
const overrides=JSON.parse(fs.readFileSync(overridesPath,'utf8'));
for(const [id,v] of Object.entries(overrides)){ids[id]=v.id;titles[id]=v.title}
fs.writeFileSync(outPath,`// Generated by tools/build-video-map.mjs — direct, topic-matched YouTube lessons.\nconst VIDEO_IDS=${JSON.stringify(ids)};\nconst VIDEO_TITLES=${JSON.stringify(titles)};\n`);
const resolved=topics.filter(t=>cache[t.id]?.id),weak=resolved.filter(t=>(cache[t.id].score||0)<48),missing=topics.filter(t=>!cache[t.id]?.id);
console.log(JSON.stringify({topics:topics.length,resolved:resolved.length,weak:weak.length,missing:missing.length,weakest:resolved.sort((a,b)=>cache[a.id].score-cache[b.id].score).slice(0,20).map(t=>({id:t.id,score:cache[t.id].score,video:cache[t.id].title}))},null,2));
