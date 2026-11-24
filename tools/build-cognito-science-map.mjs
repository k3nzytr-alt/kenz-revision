import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const courseSource=html.slice(html.indexOf('const SP_ROOT'),html.indexOf('const MG='));
const science=new Function(courseSource+';return COURSES;')().find(course=>course.id==='science');
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const topics=science.units.flatMap(unit=>unit.topics.map(topic=>({id:`science:${slug(topic[0])}`,title:topic[0],query:topic[1],domain:/^(Biology|Chemistry|Physics)/.exec(unit.name)?.[1]?.toLowerCase()||null})));
const excluded=new Set([
  'science:6-12-6-14-background-radiation-detecting-radiation-gm-tube-film',
  'science:6-7-6-8-root-hair-cells-xylem-phloem',
  'science:equations-to-recall-vs-equations-given-on-the-sheet',
  'science:2-31-large-decelerations-crash-forces',
  'science:6-9-6-10-halogens-with-metals-hydrogen',
  'science:4-11-4-12-life-cycle-assessments',
  'science:7-8-enzymes-as-biological-catalysts-fermentation',
  'science:1-17-percentage-change-in-mass-calculations',
  'science:6-12-6-13-factors-affecting-transpiration-rate-calculations',
  'science:8-6-blood-red-cells-white-cells-platelets-plasma',
  'science:9-1-levels-of-organisation-individual-ecosystem',
  'science:9-15-the-nitrogen-cycle',
  'science:1-28-1-31-covalent-bonding-dot-and-cross-diagrams',
  'science:1-39-polymers-poly-ethene',
  'science:1-47-conservation-of-mass-in-closed-open-systems',
  'science:6-11-6-13-halogen-displacement-redox-reactivity-trend',
  'science:8-23-test-for-oxygen',
  'science:2-14-newton-s-first-law',
  'science:2-22-inertial-mass-higher',
  'science:8-8-8-9-gpe-ke-calculations',
  'science:5-7-5-8-properties-of-em-waves-transverse-same-speed-in-a-vacuum',
  'science:5-10-5-12-the-em-spectrum-order-wavelength-frequency-visible-light',
  'science:10-22-10-26-heating-effect-of-current',
  'science:maths-skills-in-science-units-rearranging-graphs-gradients'
]);
const wrongDomain=(topic,title)=>{const found=/GCSE (Biology|Chemistry|Physics|Maths)/i.exec(title)?.[1]?.toLowerCase();return Boolean(topic.domain&&found&&found!==topic.domain)};
const cachePath=new URL('cognito-science-cache.json',import.meta.url);
const outPath=new URL('cognito-science-map.json',import.meta.url);
let cache={};try{cache=JSON.parse(fs.readFileSync(cachePath,'utf8'))}catch{}

const stop=new Set('gcse edexcel combined science biology chemistry physics topic paper section spec specification the and or of to in for with from how what why using use an a part lesson revision exam exams marks mark core practical'.split(' '));
const words=value=>[...new Set(String(value).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(word=>word.length>2&&!stop.has(word)&&!/^\d+$/.test(word)))];
const wrongLevel=title=>/\bA[ -]?Level\b|\bAS Level\b|International GCSE|\bIGCSE\b|\bKS[1235]\b|Key Stage|primary school|university|\bIB\b/i.test(title||'');
function score(video,topic,index){
  const target=words(`${topic.title} ${topic.query}`),actual=words(video.title),matches=target.filter(word=>actual.includes(word)).length;
  let value=matches/Math.max(3,Math.min(target.length,12))+(matches/Math.max(4,Math.min(actual.length,12)))*.35+Math.max(0,.08-index*.01);
  if(/\bGCSE\b/i.test(video.title))value+=.18;
  return value;
}
function collectVideos(obj,out=[]){
  if(!obj||typeof obj!=='object')return out;
  if(obj.videoRenderer){const v=obj.videoRenderer;out.push({id:v.videoId,title:v.title?.runs?.map(x=>x.text).join('')||'',channel:v.ownerText?.runs?.map(x=>x.text).join('')||''});return out}
  for(const value of Object.values(obj))collectVideos(value,out);
  return out;
}
const home=await(await fetch('https://www.youtube.com',{headers:{'User-Agent':'Mozilla/5.0'}})).text();
const apiKey=home.match(/"INNERTUBE_API_KEY":"([^"]+)/)?.[1],clientVersion=home.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)/)?.[1];
if(!apiKey||!clientVersion)throw new Error('Could not initialise YouTube search');
async function search(query){
  for(let attempt=0;attempt<4;attempt++)try{
    const response=await fetch(`https://www.youtube.com/youtubei/v1/search?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion}},query})});
    if(!response.ok)throw new Error(`YouTube ${response.status}`);
    return collectVideos(await response.json()).filter((video,index,all)=>video.id&&all.findIndex(item=>item.id===video.id)===index);
  }catch(error){if(attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,600*2**attempt))}
}

const work=topics.filter(topic=>!cache[topic.id]);
let cursor=0,finished=0;
async function worker(){while(true){
  const index=cursor++;if(index>=work.length)return;const topic=work[index];
  try{
    const results=await search(`Cognito GCSE ${topic.query}`),cognito=results.filter(video=>/^Cognito$/i.test(video.channel)&&!wrongLevel(video.title));
    const ranked=cognito.map((video,position)=>({...video,score:score(video,topic,position)})).sort((a,b)=>b.score-a.score),best=ranked[0];
    cache[topic.id]=best?{id:best.id,title:best.title,channel:best.channel,score:Number(best.score.toFixed(3)),topic:topic.title}:{id:null,topic:topic.title};
  }catch(error){cache[topic.id]={id:null,topic:topic.title,error:error.message}}
  finished++;if(finished%20===0||finished===work.length){fs.writeFileSync(cachePath,JSON.stringify(cache,null,2)+'\n');console.log(`${finished}/${work.length}`)}
}}
await Promise.all(Array.from({length:6},worker));
fs.writeFileSync(cachePath,JSON.stringify(cache,null,2)+'\n');
const mappings=Object.fromEntries(topics.filter(topic=>cache[topic.id]?.id&&cache[topic.id].score>=.5&&!excluded.has(topic.id)&&!wrongDomain(topic,cache[topic.id].title)).map(topic=>[topic.id,{id:cache[topic.id].id,title:`Cognito — ${cache[topic.id].title}`,source:'https://www.youtube.com/@Cognitoedu',score:cache[topic.id].score}]));
const manual={
  'science:1-28-1-31-covalent-bonding-dot-and-cross-diagrams':{id:'7IkYm7ZgiAw',title:'GCSE Chemistry - Covalent Bonding - Formation | Drawing Covalent Bonds (2027/28 exams)'},
  'science:1-39-polymers-poly-ethene':{id:'1ZUg6ZC3ltA',title:'GCSE Chemistry - Addition Polymers & Polymerisation (2026/27 exams)'},
  'science:8-23-test-for-oxygen':{id:'QH-7X5STCO4',title:'GCSE Chemistry - Testing for Gases - Hydrogen/Chlorine/Oxygen/CO2 (2027/28 exams)'},
  'science:2-14-newton-s-first-law':{id:'D8XOm4swxOU',title:"GCSE Physics - Newton's 1st & 2nd Laws | Circular Motion | Inertia (2027/28 exams)"},
  'science:2-15-newton-s-second-law-f-ma':{id:'D8XOm4swxOU',title:"GCSE Physics - Newton's 1st & 2nd Laws | Circular Motion | Inertia (2027/28 exams)"},
  'science:2-22-inertial-mass-higher':{id:'D8XOm4swxOU',title:"GCSE Physics - Newton's 1st & 2nd Laws | Circular Motion | Inertia (2027/28 exams)"},
  'science:5-7-5-8-properties-of-em-waves-transverse-same-speed-in-a-vacuum':{id:'zx0UIMA2-bA',title:'GCSE Physics - Electromagnetic Waves - Frequency | Wavelength | Where They Come From (2027/28 exams)'},
  'science:5-10-5-12-the-em-spectrum-order-wavelength-frequency-visible-light':{id:'zx0UIMA2-bA',title:'GCSE Physics - Electromagnetic Waves - Frequency | Wavelength | Where They Come From (2027/28 exams)'},
  'science:maths-skills-in-science-units-rearranging-graphs-gradients':{id:'nUk47WSiS30',title:'GCSE Maths - What on Earth is y = mx + c (2026/27 exams)'}
};
for(const [id,video] of Object.entries(manual))mappings[id]={...video,title:`Cognito — ${video.title}`,source:'https://www.youtube.com/@Cognitoedu',score:1};
fs.writeFileSync(outPath,JSON.stringify(mappings,null,2)+'\n');
console.log(`Mapped ${Object.keys(mappings).length}/${topics.length} Science skills to Cognito videos.`);
