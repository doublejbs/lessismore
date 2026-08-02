# 스노우피크 코리아 (snowpeak.co.kr)

- 사이트: https://www.snowpeak.co.kr (Next.js SPA)
- 크롤러: `sites/snowpeak.js` — **순수 fetch, puppeteer/OCR 불필요.** 지금까지 크롤한 브랜드 중
  가장 깨끗한 소스(깔끔한 REST JSON API + 스펙이 HTML 텍스트 + 영문명까지 API가 제공).
- 마지막 크롤: 2026-07-24, **GEAR + APPAREL 3832행/1236개 상품**. 무게 670/1236(gear 74%대,
  apparel은 의류라 무게 거의 없음). **전체 룰 클린**: 빈 필드·영문필드 한글누출·color/size 페어·
  groupId·엔티티·null·카테고리·스펙키오타·중복 전부 0. nameKorean 한글없음 40개(사이트 자체에
  한글명 없는 패션/한정판만 — 355개는 필드 뒤바뀜 버그였고 수정, 아래 참고).

## API (핵심 — UI 파싱 금지)

사이트 UI는 상품 링크가 `href="#"` + React onClick 라우팅이라 DOM 파싱으론 상세 URL을 못 얻는다.
반드시 아래 REST API를 쓴다. **전부 쿠키/인증 없이 curl 접근 가능**(가스 카트리지만 예외, 아래).

- 리스팅: `/restapi/god/goods/{cateCd}/list?sortFlag=REG&soldOutExcYn=N&size=100&page=N`
  → `{ items:[{godCd, godNm, lineNm, imgUrl, salePr, tagPr, colorList[]}], totalPages }`
  - ⚠ **cateCd는 쿼리가 아니라 경로 세그먼트다**(`/goods/0106/list`). `/goods/list?cateCd=` 는 401.
  - `soldOutExcYn=N` = 품절 포함(전부 수집).
- 상세: `/restapi/god/goods/{godCd}`
  → `{ godCd, godNm(한글), godEngNm(영문), lineNm, imgUrls[], optList[], godSize(스펙HTML) }`
- 상세 URL(사용자용): `/products/detail?godCd={godCd}`

### 카테고리 코드(cateCd) — GEAR
0100=Gear전체(855), 0106=텐트타프쉘터, 0108=테이블체어, 0110=침낭침구, 0111=스토브랜턴,
0113=IGT, 0114=식기쿠커, 0116=파이어그릴, 0117=수납가방쿨러, 0119=도그, 0121=마운틴백패킹,
0137=Lifestyle, 0139=부품. (0101=New, 0102=리미티드콜라보, 0103=온라인한정, 0120=포인트카달로그,
0142=GearOutlet 은 큐레이션 중복 뷰라 크롤 제외 — 세부 카테고리 + 0100으로 커버됨.)
어댑터는 세부 카테고리부터 크롤해 godCd별 첫 분류를 확정하고, 마지막 0100으로 누락분을 이름으로 분류.
### 카테고리 코드(cateCd) — APPAREL
0200=Apparel전체(385), 0203=TOPS, 0209=OUTER, 0204=BOTTOMS, 0210=원피스&스커트,
0205=ACCESSORIES(모자·양말·샌들·가방·선글라스·장갑 잡화 → 이름으로 세분류), 0206=DOG WEAR(→etc),
0211=설봉제한정. (0201=NEW, 0202=SEASON OFF는 큐레이션 중복.)
- 어패럴은 **색상×사이즈 변형이 실제로 있다**(실측: Land Lock T-Shirt 4색×5사이즈=20행). optList
  (색상)×itemList(사이즈 optVal)를 전개한다 — 어댑터 변형 로직이 gear/apparel 공통으로 처리.
- ⚠ 색상 옵션(optNm)이 **영문뿐**이다(WHITE/CHARCOAL/GREIGE/Darkolive/Charcoal×Ivory 등 90종).
  color=영문 그대로, **colorKorean은 영문→한글 색상 사전(`COLOR_EN_KO`)으로 변환**한다(화이트/차콜/
  그레이지…). 복합색은 토큰 분해: camelCase 분리 + 붙임복합어("Lightgrey"→light+grey) 그리디 분해 +
  "×" 조합("Charcoal×Ivory"→차콜×아이보리). 미상 짧은대문자코드(BROWN "CH", Green "BD")는 제거,
  hex 누출("000000")은 색상 아니므로 color·colorKorean 둘 다 비움. ⚠ colorKorean에 영문이 남으면
  안 된다 — 룰 검토 시 반드시 확인(nameKorean과 동일한 함정, 사용자 지적으로 발견).
- clothing specs는 material(소재) + 이름 기반 isWaterproof(GORE-TEX/방수)·hasHood(후드)·
  fillMaterial(다운/화섬)로 채운다.

## 스펙/무게 — godSize HTML (OCR 불필요)

무게/재질/사이즈/방수등급/밝기/용량 등이 상세의 `godSize` HTML `<table><caption>Spec` 안에 텍스트로
들어있다. `parseSpecTable`이 `<th>라벨</th><td>값</td>`을 뽑는다.

- ⚠ **th/td에 style 속성이 붙는 상품이 있다**(실측: BD-030R `<th style="width:100px">중량</th>`) →
  정규식이 `<th[^>]*>`처럼 속성을 허용해야 한다(바로 이것 때문에 초기 무게율이 절반이었음).
- ⚠ **일부 상품은 `<table>`이 아니라 인라인 텍스트**로 스펙을 쓴다(실측: BD-066 "중량 800g",
  BD-103 "총중량 약 2,600g"). → 테이블에 무게가 없으면 godSize 원문 텍스트에서 `(총)?중량|무게 ...
  숫자(g|kg)`를 폴백으로 찾는다("총", "약" 필러 허용).
- 무게 값 포맷이 다양하다: "17.2kg", "약 25.5kg", "3.4kg (1개당)", "5g(전지 제외)", "본체 / 1.9kg",
  "1개당 0.8kg", "총중량 약 2,600g" → 첫 (숫자+kg|g)만 뽑아 g로 환산.
- ⚠ **'무게'와 '중량' 둘 다 있는데 하나가 다른 뜻인 상품**(실측: TP-940 메락 Pro. → `<th>무게</th>`
  =18kg, `<th>중량</th>`=수납케이스 치수). → 두 라벨 후보를 다 시도해 실제 kg/g가 파싱되는 값을 쓴다
  ('중량' 먼저 읽고 실패하면 안 됨).
- ⚠ **세트류는 무게가 부품별로 분리 표기**(실측: 매트세트 "중량 이불/1.3kg, 매트/0.9kg") → 텍스트
  폴백에서 라벨 뒤 구간(다음 스펙 항목 전까지)의 kg/g를 **합산**해 총중량으로(슬림 2.2kg, 와이드 2.4kg).
- ⚠ **일부 상품은 무게가 스펙테이블(godSize)엔 없고 상세설명(godDtl) "텍스트"에 있다**(실측: 제카
  "무게 30kg", RB호즈키 280g, 호즈키쉐이드 25g) → `parseWeightFromDtl`로 godDtl 텍스트에서 라벨
  인접 단일값을 보수적으로 폴백 추출(godSize 무게가 0일 때만).
- ⚠ **이미지 OCR은 스노우피크엔 무의미**(검증 완료) — godDtl `<img>`는 스펙 없는 라이프스타일 사진이라
  Vision OCR 돌려도 무게 없음(무게0 상품 226개 godDtl 전수 스캔 + 큰 카테고리 9개 실제 OCR로 확인).
  미스테리월/코베아처럼 "스펙이 이미지"인 패턴이 아니다 — 무게는 오직 godSize/godDtl 텍스트에만 있다.
- 무게 없는 것(정상, 무게0 gear 231개 전수 재검 결과 최종 ~221개): 도그용품·잡화(etc), 폴/펙/부품
  (tent_acc), 일부 파우치/텐트 액세서리 — 어디에도 무게 표기가 없는 진짜 미존재.

## 이름 — godNm/godEngNm 필드가 상품마다 뒤바뀐다 (중요)

⚠ **필드 이름을 믿으면 안 된다.** godNm/godEngNm 중 어느 쪽이 한글인지가 상품마다 다르다:
- (a) 정상: godNm=한글(소프트버킷12), godEngNm=영문(Soft Bucket 12)
- (b) **뒤바뀜: godNm=영문(Gear Tote), godEngNm=한글(기어 토트)** — 무려 355개! 어패럴·신상·도그웨어 다수
- (c) 둘 다 한글: 윈젤2/윈젤2 (영문명 없음 → name은 RR 로마자 음역: Winjel2)
- (d) 둘 다 영문: Land Lock T-Shirt, BACOO 350, Leather Hita Geta (40개) — 사이트 자체에 한글명이
  없는 패션/한정판. nameKorean이 영문일 수밖에 없음(불가피, 진짜 없음).

→ **한글 든 쪽을 nameKorean, 영문 쪽을 name**으로 고른다(`/[가-힣]/` 판별). 둘 다 한글이면 name은
음역, 둘 다 영문이면 양쪽 다 그 영문.

⚠ **룰 검토 시 `nameKorean`이 실제로 한글인지 반드시 검증할 것** — "영문 필드에 한글 누출"만 보고
"한글 필드에 영문 누출"을 안 보면 이 355개 버그를 통째로 놓친다(실제로 초기 검토에서 놓쳤고 사용자가
지적). 무게0 상품이 진짜 없는지 재확인하는 것처럼, nameKorean도 한글 포함 여부를 카운트해야 한다.

## 검증

`node .claude/skills/crawl-gear/validate.js out/snowpeak-full.json` 로 전체 룰 자동 검사(양방향
한글/영문 포함). 최종: ERROR 0, FLAG는 nameKorean 영문 40개(사이트 자체 영문명, 정당)뿐.

## 변형(optList/itemList)

- 같은 godCd 안: `optList[]`(색상, optNm) × `itemList[]`(사이즈, optVal, salePr) — 실측 대부분은
  옵션 1개(단일 행).
- ⚠ **색상이 아예 별도 godCd로 나뉜 경우가 많다**(실측: 마이크로호즈키 ES-150-IV/-NV/-OR,
  THERMO텀블러470 TW-470-BK/-SN/-SL/-OG). 이 경우 색상이 godNm에만 있고 optList 색상은 비어
  color 필드가 빈값이 된다(색상명은 이름에 포함됨). v1은 안전하게 **godCd별 개별 groupId**
  (`snowpeak_{godCd}`) — 잘못 병합보다 과분할이 안전. → 향후 개선 여지: godCd 접미(-BK/-IV 등)로
  색상 패밀리 그룹핑 + color 추출(단 -EC/-R/-1 등 비색상 접미가 섞여 있어 주의).

## 스펙 키·중복 (룰 검토에서 잡은 버그)

- ⚠ **specs 키는 반드시 그 카테고리의 specs-schema 허용 키만 쓴다.** buildSpecs가 switch 앞에서
  `s.material`을 무조건 넣던 버그로 텐트·테이블·침낭·랜턴 등에 잘못된 `material` 키가 234건 붙었었다.
  카테고리별 정확 매핑: 텐트/타프/쉘터=flyMaterial(material 아님), 테이블=topMaterial, 침낭=fillMaterial,
  백팩=volume(capacity 아님), 파우치=capacity, 커틀러리=material(size 아님), 랜턴/선글라스=material 키 없음.
- ⚠ **optList/itemList에 같은 (색상,사이즈) 조합이 중복으로 들어오는 상품이 있다**(실측: 티셔츠
  White/XL 2회, MM4510-TS01 GREEN 빈사이즈 3회) → buildRows에서 `(color,size)` dedup 필수.

## 가스 카트리지 13개 제외

이소110/250/500, 프로이소, 기가파워가스 등 가스 카트리지(GPK-*/GPC-*)는 상세 API가
**422 GDS055 "비회원 구매불가 상품입니다"**로 비로그인 접근을 막는다(회원 전용). 연료 소모품이고
33개 카테고리에 연료 키도 없어 제외(842개에 미포함). 리스팅엔 나오지만 상세를 못 받는다.

## 실행

```bash
node .claude/skills/crawl-gear/sites/snowpeak.js  # (어댑터, crawl.js 통해 실행)
# 또는 러너로 직접: adapter.crawl(null,{}) → out/snowpeak-full.json
```
크롤 ~162초(855개 상세 fetch). Firestore push/커밋 상태는 세션 진행에 따름.
