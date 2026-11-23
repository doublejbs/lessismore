// 가짜 신규 점검: 같은 회사 + 같은 모델명(한글/영문, 사이즈·공백 무시) + 같은 무게(>0) 인 DB 행이 있는데 색상·사이즈 표기만 다른 경우
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('serviceAccountKey.json','utf8'))) });
const fresh = JSON.parse(readFileSync(process.argv[2],'utf8'));
const cos = [...new Set(fresh.map(r=>r.company))]; const db = [];
for (let i=0;i<cos.length;i+=10){const s=await admin.firestore().collection('gear').where('company','in',cos.slice(i,i+10)).get(); db.push(...s.docs.map(d=>d.data()));}
const base = (n,z) => { let t=String(n||''); t=t.replace(/\s*\/\s*[^/]+$/,''); for (const s of z) if (s && t.endsWith(' '+s)) t=t.slice(0,-s.length-1); return t.replace(/\s+/g,'').toLowerCase(); };
const c = (x) => String(x||'').replace(/[\s/]+/g,'').toLowerCase();
const idx = new Map();
for (const g of db) for (const n of [base(g.nameKorean,[g.sizeKorean,g.size]), base(g.name,[g.size])]) { const k=`${g.company}|${n}`; if(!idx.has(k)) idx.set(k,[]); idx.get(k).push(g); }
const res = { 같은색상_같은무게_사이즈표기만다름: [], 색상빈값_같은무게: [], 같은색상사이즈_다른표기: [] };
for (const r of fresh) {
  const cand = [base(r.nameKorean,[r.sizeKorean,r.size]), base(r.name,[r.size])].flatMap(n => idx.get(`${r.company}|${n}`) || []);
  if (!cand.length) continue;
  const sameColor = cand.filter(g => [g.color,g.colorKorean].some(x => x && [r.color,r.colorKorean].some(y => y && c(x)===c(y))));
  if (sameColor.some(g => c(g.size)===c(r.size) || c(g.sizeKorean)===c(r.sizeKorean))) { res.같은색상사이즈_다른표기.push(r); continue; }
  if (r.weight>0 && sameColor.some(g => g.weight===r.weight && g.size && r.size)) { res.같은색상_같은무게_사이즈표기만다름.push(r); continue; }
  if (!r.color && r.weight>0 && cand.some(g => g.weight===r.weight && c(g.size)===c(r.size))) res.색상빈값_같은무게.push(r);
}
for (const [k,v] of Object.entries(res)) { console.log(k, v.length); for (const r of v.slice(0,6)) console.log('   ', r.company, '|', r.nameKorean, '|', r.color, '|', r.size, '|', r.weight); }
process.exit(0);
