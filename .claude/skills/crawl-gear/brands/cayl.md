# 케일 (cayl)

- **공식**: https://cayl.co.kr  (Cafe24, 한국 트레일러닝/하이킹 브랜드 — 배낭·의류·모자 중심)
- 크롤러: `cayl.py` (Cafe24 단일소스, 무게/용량/소재 텍스트 파싱)
- companyKorean: 케일 · 마지막 크롤: 2026-07, 4000행(제품 1474 product_no, 544 groupId). 무게 3730/4000(93%).

## ⚠️ 주의사항

### 크롤 & 카테고리
1. **색상 = 별도 product_no**(Cafe24 옵션 아님). 이름 말미 ` / Color`(og:title `이름 / Color - CAYL`) →
   색상 분리, groupId 는 색상 뺀 베이스명(`cayl_<slug>`). 색상은 Title Case 통일.
2. **말미 ` / ` 가 색상이 아닐 수 있음**: 원단(xpac/cordura/cayl grid/b-grid) → 소재로, 사이즈(S/M/L/ML) → size 로.
   상품코드(`/P0000…`, `1147670-BBLC`)는 제거.
3. **카테고리 매핑**: bag/43→backpack(모델별 카테고리는 43의 하위), sacoche/62→pouch,
   jacket·top·bottom·shell·fleece·insulation·shirts·head-gear 등→clothing. top/31·bottom/42 가 부모라
   하위(shell/fleece 등)는 dedup 됨.
4. **shoes/129 는 타브랜드**(ON·HOKA·뉴발란스·norda) 재판매 → **제외**(company=cayl 부적합).
5. **etc(61/63)·collab 은 이름으로 분류**: Fanny Pack/holder→pouch, Purist Bottle→bottle, Air Band/cap/beanie→clothing,
   belt/hipbelt/webbing→etc, 산들꽃(콜드브루/드립백)→food, Shelter Cup→cup. **다운/플리스 조끼(vest)는 clothing**
   (러닝 하이드레이션 팩만 vest_pack — `vest` + `backpack/hydration/\dL`).
6. **배낭은 용량이 곧 사이즈**(토르소 사이즈 없음). `용량 : 약 27L~32L` → size=`32L`(상한)+이름 끝 부착, specs.volume 도 유지.
   pouch 는 스키마상 `capacity`(volume 아님).
7. **사이즈**: 상세 옵션 `<li ... title="M">` 정적 HTML. 일부(UL zip sack)는 사이즈가 별도 product_no(이름 말미 ` / L`).

### 무게 (가장 까다로움 — 7형식, `parse_weight`)
8. 무게는 **item details 텍스트**에 있음(OCR 불필요). 라벨/구분자/표기가 제각각이라
   **'유효한 무게/중량/Weight 헤더 뒤 첫 무게값'** 방식으로 파싱:
   - 라벨: `무게`·`중량`·영문 `Weight`(단독 단어). 구분자: 콜론 `:` 또는 **대시 `-`**(`무게 - 334g`).
   - 괄호 라벨: `무게 (Weight) : SM - 933 g`. 사이즈 접두: `중량 : ML 674 g`, `무게: S-M 210g`.
   - **부품 분해**: `무게 (측정방식…) 바디 : 734g · 프레임 54g…` → 첫 값(바디) 취함.
   - **숫자·단위가 태그로 분리**(`중량 : 97</span><font>g`) → 태그를 공백 치환 후 파싱.
   - 하한 5g(카라비너 7.6g 등 초경량 포함).
9. **적재하중은 제품무게 아님 → 제외**: `권장(패킹) 무게`/`최대 패킹 무게 : 9~15kg 이하/미만`.
   헤더 앞 10자에 `권장|패킹|최대|하중|적재|적정` 있으면 스킵. 서술문(`무게 분산`/`무게를 줄이도록`)도 스킵.
   **원단 무게(`30g/㎡`, `g/sqm`)** 제외.
10. **무게 없는 104제품은 데이터 부재 확정** — 텍스트·이미지(제품사진뿐) 어디에도 무게 없음
    (AVOCADO PACK·NB packable·Grid Tote·다수 액세서리). OCR 로도 복구 불가.

### Cafe24 공통
11. 서버렌더라 curl + 브라우저 UA 로 직접 fetch. 카테고리 `?page=N`(24개/페이지), 카드 `anchorBoxId_<no>`.
    URL 에 슬러그 필수(`/category/bag/43/`, `/category/43/` 은 안 됨).
