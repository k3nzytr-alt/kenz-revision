import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const courseSource=html.slice(html.indexOf('const SP_ROOT'),html.indexOf('const MG='));
const courses=new Function(courseSource+';return COURSES;')();
const maths=courses.find(course=>course.id==='maths');
const catalogue=JSON.parse(fs.readFileSync(new URL('first-class-maths-videos.json',import.meta.url),'utf8'));
const stop=new Set('a an and by for from in into of on the to using with'.split(' '));
const stem=word=>word.replace(/ies$/,'y').replace(/s$/,'');
const tokens=value=>[...new Set(String(value).toLowerCase()
  .replace(/\b[ngarps]\d+[a-z]?\b/g,' ')
  .replace(/\btrig\b/g,'trigonometry')
  .replace(/\bnth\b/g,'nthterm')
  .replace(/\bmean\b/g,'average')
  .replace(/[^a-z0-9]+/g,' ')
  .split(/\s+/).filter(word=>word.length>1&&!stop.has(word)).map(stem))];
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const topics=maths.units.flatMap(unit=>unit.topics.map(topic=>({id:`maths:${slug(topic[0])}`,title:topic[0]})));
const excluded=new Set([
  'maths:a14-distance-time-graphs',
  'maths:a18-solving-quadratics-by-factorising',
  'maths:a4-expanding-single-brackets',
  'maths:a4-expanding-double-brackets',
  'maths:g16-volume-of-cuboids-prisms',
  'maths:g17-volume-surface-area-of-spheres-cones-pyramids',
  'maths:g22-mixed-sine-cosine-rule-problems',
  'maths:g3-angles-in-parallel-lines',
  'maths:g6-geometric-proof-using-angle-facts-congruence',
  'maths:n1-ordering-integers-decimals-fractions',
  'maths:n10-terminating-recurring-decimals',
  'maths:r11-speed-distance-time',
  'maths:s2-frequency-tables-grouped-frequency-tables'
]);
const manual={
  'maths:a17-equations-with-brackets-fractions':'Linear Equations (with fractions)',
  'maths:a17-solving-linear-equations':'Linear Equations (2 step and Brackets)',
  'maths:a19-simultaneous-equations-linear':'Simultaneous Equations',
  'maths:a19-simultaneous-equations-linear-quadratic':'Non-linear Simultaneous Equations',
  'maths:a4-adding-subtracting-multiplying-dividing-algebraic-fractions':'Algebraic Fractions (Operations)',
  'maths:a12-trig-graphs-y-sin-x-cos-x-tan-x':'Trigonometric Graphs',
  'maths:a22-inequalities-on-a-number-line':'Inequality Diagrams',
  'maths:g10-proving-circle-theorems':'Circle Theorems Proofs',
  'maths:g23-area-of-a-triangle-ab-sin-c':'Area of a Triangle (Using Trig)',
  'maths:g7-enlargements-positive-fractional-scale-factors':'Enlargements',
  'maths:n4-prime-factor-decomposition-product-of-primes':'Prime Factorisation',
  'maths:n8-rationalising-the-denominator':'Rationalise the Denominator',
  'maths:p9-conditional-probability-tree-diagrams':'Conditional Probability',
  'maths:r10-direct-inverse-proportion-problems':'Proportionality (Direct/Inverse)',
  'maths:r4-ratio-notation-simplifying-ratios':'Write and Simplify Ratios',
  'maths:r5-sharing-in-a-ratio':'Working with Ratio',
  'maths:r9-percentage-increase-decrease':'Increasing/Decreasing by a Percentage',
  'maths:s3-histograms-frequency-density-unequal-widths':'Drawing Histograms',
  'maths:g20-sohcahtoa-missing-sides':'Trigonometry - SOHCAHTOA',
  'maths:g20-sohcahtoa-missing-angles':'Trigonometry - SOHCAHTOA'
};

function similarity(topic,video){
  const left=tokens(topic.title),right=tokens(video.topic),matches=left.filter(word=>right.includes(word)).length;
  if(!matches)return 0;
  let score=.65*(matches/left.length)+.35*(matches/right.length);
  const l=left.join(' '),r=right.join(' ');
  if(l.includes(r)||r.includes(l))score+=.12;
  return score;
}

const mappings={};
const suggestions=[];
for(const topic of topics){
  const ranked=catalogue.videos.map(video=>({video,score:similarity(topic,video)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0],second=ranked[1];
  if(best.score>=.56){
    mappings[topic.id]={id:best.video.id,title:`1st Class Maths — ${best.video.topic}`,sourceTopic:best.video.topic,sourceUrl:catalogue.source,score:Number(best.score.toFixed(3))};
    suggestions.push({topic:topic.title,match:best.video.topic,score:best.score,gap:best.score-second.score});
  }
}
for(const id of excluded)delete mappings[id];
for(const [id,sourceTopic] of Object.entries(manual)){
  const video=catalogue.videos.find(item=>item.topic===sourceTopic);
  if(!video)throw new Error(`1st Class Maths topic not found: ${sourceTopic}`);
  mappings[id]={id:video.id,title:`1st Class Maths — ${video.topic}`,sourceTopic:video.topic,sourceUrl:catalogue.source,score:1};
}
fs.writeFileSync(new URL('first-class-maths-map.json',import.meta.url),JSON.stringify(mappings,null,2)+'\n');
console.log(`Mapped ${Object.keys(mappings).length}/${topics.length} Maths skills to ${catalogue.videos.length} 1st Class Maths videos.`);
console.log('Lowest-confidence mappings:');
for(const item of suggestions.filter(item=>mappings[topics.find(topic=>topic.title===item.topic)?.id]?.sourceTopic===item.match).sort((a,b)=>a.score-b.score).slice(0,40))console.log(`${item.score.toFixed(3)}\t${item.topic}\t=> ${item.match}`);
