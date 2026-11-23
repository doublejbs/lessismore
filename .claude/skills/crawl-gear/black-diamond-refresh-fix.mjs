// 블랙다이아몬드 신규 후처리: 스톰/스톰+ groupId 분리 · 더플 kg 무게 → g · BD X NORDA 콜라보명 정리
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(src, 'utf-8'));
const NORDA_KO = { 'SS TEE': '반팔 티', CAP: '캡' };
for (const r of rows) {
  const no = r._detailUrl.match(/no=(\d+)/)?.[1];
  if (no === '10908') r.groupId = 'black-diamond_스톰-플러스-헤드램프';
  if (no === '10907') r.groupId = 'black-diamond_스톰-헤드램프';
  if (r.weight > 0 && r.weight < 5 && /더플/.test(r.nameKorean)) r.weight = Math.round(r.weight * 1000);
  if (/^BD X NORDA /.test(r.nameKorean)) {
    const fix = (s, ko) => {
      let t = s.replace(/^BD X NORDA /, '');
      t = t.replace(/^000 M\b/, '000 MENS').replace(/^000 W\b/, '000 WOMENS');
      if (ko) for (const [en, k] of Object.entries(NORDA_KO)) t = t.replace(new RegExp(`^${en}\\b`), k);
      else t = t.replace(/^SS TEE\b/, 'SS Tee').replace(/^CAP\b/, 'Cap');
      return (ko ? '노르다 ' : 'Norda ') + t;
    };
    r.name = fix(r.name, false);
    r.nameKorean = fix(r.nameKorean, true);
  }
}
writeFileSync(dst, JSON.stringify(rows, null, 2));
console.log('fixed', rows.length);
// 배낭·더플: 사이즈 옵션이 없으면 용량("NL")을 사이즈로(specs.volume → 이름의 "NL" → 모델 숫자)
const out = JSON.parse(readFileSync(dst, 'utf-8'));
for (const r of out) {
  if (!['backpack', 'vest_pack'].includes(r.category) || r.size) continue;
  const v = r.specs?.volume || r.nameKorean.match(/(\d+(?:\.\d+)?)L\b/)?.[1] || r.nameKorean.match(/(?:미션|크릭)\s+(\d+)\s/)?.[1];
  if (!v) continue;
  r.specs = { ...(r.specs || {}), volume: String(v) };
  r.size = r.sizeKorean = `${v}L`;
  r.name += ` / ${v}L`;
  r.nameKorean += ` ${v}L`;
}
writeFileSync(dst, JSON.stringify(out, null, 2));
