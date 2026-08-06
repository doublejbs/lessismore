# 에버뉴 (evernew-global.com)

- 사이트: https://www.evernew-global.com/products/index.html — 일본 브랜드 **글로벌(영문) 정적 HTML
  카탈로그**. puppeteer/OCR 불필요, 순수 fetch + 정규식.
- 크롤러: `sites/evernew.js`, 한글화: `evernew-kr-apply.js` (+ 레퍼런스 `out/evernew-kr-ref.json`)
- 마지막 크롤: 2026-08, 222행/222개 상품(8카테고리). 무게 202/222(91%). 규칙 준수: ERROR 0
  (validate.js), FLAG는 FO-COOP 1개(고유 모델명, 한글명 없음).

## 사이트 구조 (2단계 fetch)

8개 카테고리: `titanium alminium cookware stove accessories sleepingsystem trekking-pole watercarry`
(주의: aluminium 철자가 `alminium`)

- 리스트: `/products/<cat>/index.html` → `<div class="item">` … `<a href="<CODE>.html" class="iframe_box">`
  안에 `<figure><img src="…item-<CODE>.jpg" alt="상품명">`, `<h3>상품명</h3>`,
  `<dl class="specDetail"><dt><CODE><span>가격円</span></dt>`. (feature.html은 스토리 페이지라 무시.)
- 상세: `/products/<cat>/<CODE>.html` → `<dd class="spec"><span class="fb">Weight：</span>51g(1.79oz) |
  <span class="fb">Material：</span>… | <span class="fb">Capacity：</span>290ml | …</dd>`
  - 라벨 구분자는 ` | `, 라벨-값 구분은 전각 `：` 또는 `:`. 무게 "51g(1.79oz)" → g값만(oz 무시).
  - ⚠ 소재 값 끝에 잘린 구분기호(`/`)가 남는다 → 값 끝 `[\s/、,;]+` 정리 필수.

## ⚠ 한글화 — 글로벌 사이트는 영문명뿐 (SKILL.md "한글화" 룰 적용)

상품명이 100% 영문이라 nameKorean을 영문으로 두면 룰 위반. 룰대로 **KR 유통사 verbatim 매칭 →
못 찾으면 음역**으로 채운다. 어댑터는 nameKorean=영문(폴백)으로 두고, `evernew-kr-apply.js`가
2단계로 채운다(씨투써밋 kr-apply 패턴).

1. **KR 레퍼런스 {제품코드→한글명}**: 홀레인(`hollain.com/goods/goods_list.php?brandCd=AAP`)과
   아웃도어뱅크(`outdoorbank.kr/?act=shop.goods_list&GC=GD1009`)가 img `alt`/`title`에
   `[에버뉴] <한글명> <CODE>` / `에버뉴 <한글명> <CODE>` 형태로 노출 → 정규식으로 {코드→한글명}
   수집(180개), **크롤 제품과 코드 정확일치로 verbatim 매칭(132/222=59%)**. → `out/evernew-kr-ref.json`.
   (신제품 ECAL7xx 시리즈—Apex/ZARAZARA/Fire Mug 등—은 KR 유통사가 아직 안 들여와 미매칭.)
2. **음역(90개)**: KR 유통사 용어에 정렬한 단어사전(`WORD`: pot→포트, cup→컵, alu→알루, lid→뚜껑,
   apex→에이펙스 등)으로 토큰별 음역. UL/FH/FD/NH/DX/B.C./X-Pac/CFRP·숫자·사이즈(S/M/L)는 그대로.
   붙은숫자("Aquajacket333ml") 분리. the/and/for는 제거.
   - 수동 1건: EBY636 글로벌 표기가 일본 한자 "山岳飯盒弐型" → "산가쿠 한고 2형"(MANUAL).
   - FO-COOP(EBY723)은 고유 모델명이라 영문 유지(정당, validate FLAG 1).

재실행: `node sites/evernew.js`(crawl.js 통해) → `node evernew-kr-apply.js`. 레퍼런스를 갱신하려면
홀레인/아웃도어뱅크를 다시 긁어 `out/evernew-kr-ref.json` 갱신.

## 카테고리 분류

titanium/alminium/cookware → 이름으로 cup/bowl/bottle/cutlery/cookware_etc 세분류(mug/cup/sake→cup,
pot/pan/cooker→cookware_etc, bottle/flask→bottle, spork/spoon→cutlery). stove→stove,
sleepingsystem→mat/pillow/sleeping_bag, trekking-pole→trekking_pole, watercarry→bottle/pouch,
accessories→pouch/etc. 무게 없는 20개는 대부분 세트/부품/소품(수건·스티커·스트랩 등).

⚠ **요리도구 부속이 cookware로 새는 함정(검토에서 발견)**: 케이스/백/색(neoprene case, pan bag,
pot sack)은 요리도구를 언급해도 **pouch**, 뚜껑(lid)/핸들단독(^handle)/후크/체인/브러쉬/클리너/
트리벳은 **etc**로 분류. 단 "Deep Pot ... Handle"(손잡이 달린 냄비)·"Sierra Cup Fold Handle"(컵)은
handle이 기능어라 요리도구 유지. 그 외: table→table(topMaterial), trowel→shovel, tenugui→towel.
우산/캡/팁 등은 스키마에 키가 없어 etc 유지. ⚠ table specs는 material 아님 topMaterial.
검증: `node validate.js out/evernew-full.json` → ERROR 0.
