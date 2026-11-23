// 신규 후보 상품 중 DB 에 같은 기본 이름(공백 무시)이 있는 것 — 가짜 신규 의심
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('serviceAccountKey.json','utf8'))) });
const fresh = JSON.parse(readFileSync(process.argv[2],'utf8'));
const cos=[...new Set(fresh.map(r=>r.company))]; const db=[];
for(let i=0;i<cos.length;i+=10){const s=await admin.firestore().collection('gear').where('company','in',cos.slice(i,i+10)).get(); db.push(...s.docs.map(d=>d.data()));}
const n2=s=>String(s??'').replace(/\s+/g,'').toLowerCase();
const strip=(n,z)=>{let t=String(n||''); if(z&&t.endsWith(' '+z)) t=t.slice(0,-z.length-1); return t;};
const dbn=new Map(); for(const g of db){dbn.set(n2(strip(g.nameKorean,g.sizeKorean||g.size)),g);}
const seen=new Set(); let hit=0,miss=0;
for(const r of fresh){const b=n2(strip(r.nameKorean,r.sizeKorean||r.size)); if(seen.has(b))continue; seen.add(b);
 const g=dbn.get(b); if(g){hit++; if(hit<=15) console.log('HIT',r.nameKorean,'|',r.color,r.size,'|',r._detailUrl,'| db:',g.color,g.size,g.productUrl);} else miss++;}
console.log({hit,miss}); process.exit(0);
