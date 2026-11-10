const fs=require('fs');
const root='C:/Users/Dinusauuuur/Desktop/git/Gidi/GidiReads-';
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
let withGdp=0, without=[];
for(const f of files){
  const h=fs.readFileSync(root+'/'+f,'utf8');
  if(h.includes('global-dark-plum')) withGdp++;
  else without.push(f);
}
console.log('with global-dark-plum:', withGdp);
console.log('without:', without.join(', '));
