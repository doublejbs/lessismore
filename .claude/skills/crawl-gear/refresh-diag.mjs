// 신규 후보를 DB 와 URL 기준으로 분류: URL 없음(진짜 신규 후보) / URL 있음(색상·사이즈·이름 차이)
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('serviceAccountKey.json','utf8'))) });
const [f] = process.argv.slice(2);
const fresh = JSON.parse(readFileSync(f,'utf8'));
const cos=[...new Set(fresh.map(r=>r.company))];
const db=[]; for(let i=0;i<cos.length;i+=10){const s=await admin.firestore().collection('gear').where('company','in',cos.slice(i,i+10)).get(); db.push(...s.docs.map(d=>d.data()));}
const uk=(u)=>decodeURIComponent(String(u||'')).replace(/^https?:\/\/(www\.|m\.)?/,'').replace(/\/+$/,'').toLowerCase();
const by=new Map(); for(const g of db){const k=uk(g.productUrl); if(!by.has(k))by.set(k,[]); by.get(k).push(g);}
const n2=s=>String(s??'').replace(/\s+/g,'').toLowerCase();
const prods=new Map(); for(const r of fresh){const k=uk(r._detailUrl||r._source); if(!prods.has(k))prods.set(k,[]); prods.get(k).push(r);}
const kinds={}; const ex={};
for(const [k,rs] of prods){const d=by.get(k); let kind;
 if(!d) kind='URL없음'; else { const nc=rs.some(r=>!d.some(g=>n2(g.color)===n2(r.color))); const ns=rs.some(r=>!d.some(g=>n2(g.size)===n2(r.size))); kind=nc&&ns?'색상+사이즈다름':nc?'색상다름':ns?'사이즈다름':'이름다름'; }
 kinds[kind]=(kinds[kind]||0)+1; (ex[kind]??=[]).push(`${rs[0].nameKorean} | new ${[...new Set(rs.map(r=>r.color+'/'+r.size))].slice(0,4)} | db ${d?[...new Set(d.map(g=>g.color+'/'+g.size))].slice(0,4)+' | '+d[0].nameKorean:''}`);}
console.log(kinds, 'db', db.length); for(const k in ex) console.log('##',k,'\n '+ex[k].slice(0,8).join('\n '));
process.exit(0);
