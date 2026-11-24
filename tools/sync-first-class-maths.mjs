import fs from 'node:fs';

const sourceUrl='https://www.1stclassmaths.com/aqarevision';
const response=await fetch(sourceUrl,{headers:{'User-Agent':'Mozilla/5.0'}});
if(!response.ok)throw new Error(`1st Class Maths returned ${response.status}`);
const html=await response.text();
const rows=[];
const pattern=/"videolink":"(https:[^"]+)"[\s\S]{0,1800}?"topic":"([^"]+)"/g;
let match;
while((match=pattern.exec(html))){
  const url=match[1].replace(/\\\//g,'/');
  const id=new URL(url).searchParams.get('v');
  if(id&&/^[A-Za-z0-9_-]{11}$/.test(id))rows.push({topic:match[2].replace(/\\\//g,'/'),id,url});
}
const videos=[...new Map(rows.map(row=>[row.topic,row])).values()].sort((a,b)=>a.topic.localeCompare(b.topic));
if(videos.length<100)throw new Error(`Expected at least 100 AQA GCSE videos, found ${videos.length}`);
const output=new URL('first-class-maths-videos.json',import.meta.url);
fs.writeFileSync(output,JSON.stringify({source:sourceUrl,syncedAt:new Date().toISOString(),videos},null,2)+'\n');
console.log(`Saved ${videos.length} 1st Class Maths AQA GCSE videos.`);
