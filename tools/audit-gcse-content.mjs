import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const courseSource=html.slice(html.indexOf('const SP_ROOT'),html.indexOf('const MG='));
const courses=new Function(courseSource+';return COURSES;')();
const firstClass=JSON.parse(fs.readFileSync(new URL('tools/first-class-maths-map.json',root),'utf8'));
const cognitoScience=JSON.parse(fs.readFileSync(new URL('tools/cognito-science-map.json',root),'utf8'));
const context={};
vm.runInNewContext(fs.readFileSync(new URL('video-map.js',root),'utf8')+';this.ids=VIDEO_IDS;this.titles=VIDEO_TITLES',context);

const expected={
  maths:{count:232,spec:'AQA 8300'},
  english:{count:120,spec:'Edexcel · Language 1EN0 + Literature 1ET0'},
  science:{count:265,spec:'Edexcel 1SC0'},
  cs:{count:88,spec:'OCR J277'},
  geography:{count:96,spec:'OCR A J383'},
  business:{count:93,spec:'Edexcel 1BS0'}
};
const requiredEnglish=["Spoken Language Endorsement","Romeo & Juliet","Journey's End","Frankenstein","Conflict poetry anthology","Unseen poetry"];
const requiredPoems=['A Poison Tree','The Destruction of Sennacherib','Extract from The Prelude','The Man He Killed','Cousin Kate','Half-caste','Exposure','The Charge of the Light Brigade','Catrin','War Photographer','Belfast Confetti','The Class Game','Poppies','No Problem','What Were They Like?'];
const wrongLevel=/\bA[ -]?Level\b|\bAS Level\b|\bIAL\b|International A Level|\bIGCSE\b|International GCSE|\bKS[1235]\b|Key Stage|primary school|elementary|\bSATs?\b|\bAP\b|college|university|undergraduate|postgraduate|degree-level|\bIB\b|O[ -]?Level|\bGr(?:ade)?\.? 1[0-2]\b|Ages? \d|Year \d/i;
const failures=[];
const topicIds=[];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

for(const course of courses){
  const check=expected[course.id];
  if(!check){failures.push(`Unexpected course: ${course.id}`);continue}
  if(!course.spec.includes(check.spec))failures.push(`${course.id}: expected specification ${check.spec}`);
  const topics=course.units.flatMap(unit=>unit.topics);
  if(topics.length!==check.count)failures.push(`${course.id}: expected ${check.count} topics, found ${topics.length}`);
  for(const topic of topics)topicIds.push(`${course.id}:${slug(topic[0])}`);
}

const english=courses.find(course=>course.id==='english');
const englishUnits=english.units.map(unit=>unit.name).join('\n');
for(const name of requiredEnglish)if(!englishUnits.includes(name))failures.push(`English syllabus section missing: ${name}`);
const englishTopics=english.units.flatMap(unit=>unit.topics.map(topic=>topic[0]));
for(const poem of requiredPoems)if(!englishTopics.some(topic=>topic.startsWith(poem)))failures.push(`Conflict anthology poem missing: ${poem}`);

for(const id of topicIds){
  if(!context.ids[id])failures.push(`Video ID missing: ${id}`);
  if(!context.titles[id])failures.push(`Video title missing: ${id}`);
  if(context.ids[id]&&!/^[A-Za-z0-9_-]{11}$/.test(context.ids[id]))failures.push(`Invalid YouTube ID: ${id}`);
  if(wrongLevel.test(context.titles[id]||''))failures.push(`Wrong-level video: ${id} -> ${context.titles[id]}`);
}
for(const id of Object.keys(context.ids))if(!topicIds.includes(id))failures.push(`Video mapping has no syllabus topic: ${id}`);
if(Object.keys(firstClass).length<90)failures.push(`Expected at least 90 1st Class Maths mappings, found ${Object.keys(firstClass).length}`);
for(const [id,video] of Object.entries(firstClass)){
  if(!id.startsWith('maths:')||!topicIds.includes(id))failures.push(`1st Class Maths mapping has no Maths syllabus topic: ${id}`);
  if(!/^[A-Za-z0-9_-]{11}$/.test(video.id||''))failures.push(`Invalid 1st Class Maths YouTube ID: ${id}`);
  if(context.ids[id]!==video.id)failures.push(`1st Class Maths mapping was not applied: ${id}`);
}
if(Object.keys(cognitoScience).length<100)failures.push(`Expected at least 100 Cognito Science mappings, found ${Object.keys(cognitoScience).length}`);
for(const [id,video] of Object.entries(cognitoScience)){
  if(!id.startsWith('science:')||!topicIds.includes(id))failures.push(`Cognito mapping has no Science syllabus topic: ${id}`);
  if(!/^[A-Za-z0-9_-]{11}$/.test(video.id||''))failures.push(`Invalid Cognito YouTube ID: ${id}`);
  if(context.ids[id]!==video.id)failures.push(`Cognito mapping was not applied: ${id}`);
}

const summary={courses:Object.fromEntries(courses.map(course=>[course.id,course.units.reduce((n,unit)=>n+unit.topics.length,0)])),topics:topicIds.length,videos:Object.keys(context.ids).length,firstClassMathsVideos:Object.keys(firstClass).length,cognitoScienceVideos:Object.keys(cognitoScience).length,wrongLevelVideos:topicIds.filter(id=>wrongLevel.test(context.titles[id]||'')).length};
console.log(JSON.stringify(summary,null,2));
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('GCSE content audit passed.');
