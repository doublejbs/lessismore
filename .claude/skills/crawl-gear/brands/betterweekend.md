# 베러위켄드 (betterweekend)

- **사이트**: https://betterweekend.co.kr/gear — 브랜드 공홈이 아니라 **국내 아웃도어 매거진의 장비 DB**
  (Rhymix CMS). 약 80개 브랜드, 221개 장비가 `/gear` 한 페이지에 전부 서버렌더(페이지네이션 없음).
  curl + UA 로 바로 받아진다(봇차단 없음). puppeteer 불필요.
- 크롤러: `sites/betterweekend.js`
- 마지막 크롤: 2026-09, 리스팅 221개 → 제외 후 **113개 모델 / 163행**. validate ERROR 0.
  무게 111/113, 이미지 113/113, 한글명 113/113(국내 표기 검색 대조 완료). validate ERROR 0 · FLAG 0.
  **2026-10-01 Firestore push 완료: inserted=163 updated=0 failed=0**, 이미지 163장 Storage 업로드 확인.
  기존 문서 대조: `productUrl` 이 `https://betterweekend.co.kr` 로 시작하는 문서.

## ⚠ 범위 — 멀티브랜드라 "이미 크롤한 브랜드"는 제외

사용자 결정(2026-09): **공홈 크롤이 이미 있는 브랜드는 제외**(중복 문서·company 표기 충돌 방지).
`EXCLUDED_BRANDS`: Black Diamond(blackdiamond/Back Diamond 오타 포함), Big Agnes, NEMO, Arc'teryx(3가지 표기),
Rab, Scarpa, Sierra Designs, Kolon Sport, Sea to Summit, CAYL, Samaya, MSR, Therm-a-Rest, Evernew — 100개 제외.

추가로 **Firestore 에 사용자 수동입력으로 이미 있는 동일 모델**은 `EXCLUDED_SRL` 로 제외(모델 대조):
Liteway 일루션 듀오, Mountain Rover 타르시어 18/프로/40, Hiker Workshop TYPE-2 Light(2종)·TYPE-1.
Nike Air Zoom Terra Kiger 6 은 사이트에 이미지가 아예 없어(카드 NO IMAGE·og:image 없음·연결 기사 없음) 제외.
> 재크롤 시 새 브랜드가 추가돼 있으면 `BRANDS`·`NAMES` 표에 없어서 `⚠ 매핑 누락` 로그가 뜬다 → 표에 추가.

## ⚠ 첫 크롤 때 지키지 못한 스킬 절차 (다음엔 지킬 것)

브랜드 키 사용자 확인, `discover.js` 실행, Claude in Chrome 우선 확인, `rab.js` 복사 구조, `--no-weight` 빠른 검증을
건너뛰었다(서버렌더 단일 페이지라 결과 데이터 영향은 없었음). 한글명 공식 표기 검색도 처음엔 빠뜨렸다가 리뷰 후 보완.

## 카테고리 (사용자 지정 포함)

게시판 `data-mid` → 내부 카테고리. 33개 밖 품목은 사용자 지정대로:
**신발(shoes) → clothing**, **칼(knives)·쿨러(cooler) → cookware_etc**, **시계(watch)·바이크팩(bikepack) → etc**.
Rivers 머그(cookware) → cup.
⚠ **카테고리 계약(2026-08-09, `brands/gossamer-gear.md`) 준수**: 헤드램프(이름에 Headlamp) → `headlamp`(헤드랜턴),
랜턴·튜브·백팩 라이트 → `lighting`. 칼·쿨러는 조리 본체가 아니라 `cookware_etc`(`cookware`=코펠·쿡웨어 아님).
SKILL.md의 33개 키 목록은 계약 이전 버전이라 `specs-schema.js`의 `CATEGORY_KEYS` 를 기준으로 볼 것. 신발 `specs.type` 은 최적 사용/유형으로 등산화·트레일 러닝화·샌들·워터 슈즈.

## 데이터 구조 / 무게

- 상세 `/index.php?mid=gear&gear_srl=N` 의 `SPECIFICATIONS` ~ `RELATED CONTENT`(없으면 `AD`) 사이가 라벨/값 쌍.
  다중선택 값 구분자는 `|@|`. 단위 표기 없음(무게 g, 길이 cm).
- 무게 라벨이 게시판마다 다르다: 의류·신발 `무게 남성`/`무게 여성`, 텐트 `PACKAGED WEIGHT`(우선)/`MINIMUM WEIGHT`,
  백팩·침낭 `WEIGHT`, 매트 `수납 무게`, 조명·기타 `무게`, 폴 `무게(개당)`(**한 개 기준 그대로 저장**).
- ⚠ **10 미만 소수는 kg 표기**(Osprey `1.09` = 1090g). `405-715`(구성별 범위)는 최대(풀구성).
- ⚠ **`|`·`,` 다중값은 사이즈별**(PA'LANTE V2 `31|37` L / `510|530` g → 31L·37L 두 행).
- ⚠ **쉼표를 천단위로 합치면 안 된다** — 폴 길이 `110,115,…,135` 가 110115 로 붙는 버그가 있었다.
  조명 사용시간엔 `10,000mAh Powerbank …` 처럼 배터리 용량이 섞여 → mAh 먼저 제거.
- **남녀 무게가 둘 다 있으면 size `Men's`/`Women's`(남성/여성) 두 행**(같은 groupId). 한쪽만 있으면 1행 무사이즈.
- 스펙표에 무게가 없는 경우 **연결 리뷰 기사**(`RELATED CONTENT` → `mid=news&document_srl=N`) 본문을 확인.
  Teva Grandview GTX Low 는 기사 실측값(남 US10 492g / 여 US7 371g)을 `WEIGHT_OVERRIDE` 로 채웠다.
  기사에도 없으면 외부 출처까지 검색: Fabric Gripper Bottle 은 road.cc 리뷰 69g 반영.
  Salomon Trail Grit 3L Jacket(출처 없음)·KEEN Zerraport II(판매처마다 켤레/한 짝 기준 불명확) → 0 유지.

## 이름 / 회사 표기

- 카드 이름은 "브랜드 + 모델" + 오타(NITCECORE, Petzle, Teton Bors, Codura)가 있어 **`NAMES` 표로 영문명(브랜드 접두
  제거)·한글명을 확정**했다. 한글명에도 브랜드 접두를 붙이지 않는다(기존 수동입력 데이터와 같은 방식).
- ⚠ **한글명은 반드시 웹 검색으로 국내 공식몰·정식 판매처 표기를 대조한다.** 첫 크롤에서 검색 없이 음역만 했다가
  리뷰에서 걸렸고, 검색해 보니 약 20개가 국내 표기와 달랐다: Paxat 팩샛→**팍사트**, Hierro 히에로→**이에로**
  (nbkorea), Fresh Foam 프레시폼→**프레쉬폼**, Lone Peak 론 피크→**론픽**, Olympus 올림푸스→**올림퍼스**,
  Camino 카미노→**까미노**(lowakorea), Maddox 매덕스→**매독스**, Makalu 마칼루→**마카루**, Danubio→**다누비오 G 쟈켓**
  (montura.kr), IKO→**아이코 코어**, Apex→**아펙스**, X-Fuse→**엑스 퓨즈**(salomon.co.kr), Helium→**힐리움**,
  Zerraport II→**제라포트 2**, Techamphibian→**테크앰피비안**, Paxat Backpack→**팍사트 팩 32L**(파타고니아코리아 입점몰),
  Gonzo→**곤조 다운 자켓**(kr.valandre.com). 살로몬·호카·TNF·피엘라벤 등은 "자켓", 파타고니아 공식몰은 "재킷".
  공식몰 확인: patagonia.co.kr·nbkorea·lowakorea(까미노·매독스)·salomon.co.kr·montura.kr·ortovoxkorea·kr.teva.com·
  fjallraven.co.kr·byn.kr·nike.com/kr·altra.co.kr(론픽)·leki.kr(마카루)·kr.valandre.com. 아이코 코어는 다나와 상품명
  ("페츨 헤드램프 아이코 코어 (AP-E104BA00)"). 나머지(올림퍼스·아펙스·힐리움·제라포트·헬리오스·트레일코드·페더 레인)는
  국내 판매처 표기.
  국내 표기를 못 찾은 모델만 음역 + 한글 카테고리어(트레일 러닝화/백팩/샌들/매트/등산스틱/워치). 헤드램프는 "헤드랜턴".
- ⚠ **Ortovox 한글 브랜드명은 공식 수입사(ortovoxkorea.com) 표기 `오토복스`** (오르토복스 아님).
- 사이트에 없는 값은 추론해 넣지 않는다: 방수(isWaterproof)는 방수 재킷 게시판·GTX/GORE-TEX/Water Proof 근거가
  있을 때만 true, 나머지는 `""`. 세트 구성(isSet)도 `""`.
- ⚠ 카드 브랜드 오기: srl 75793 "NITECORE UT27" 이 브랜드 BioLite 로 등록돼 있음 → NAMES 3번째 원소로 NITECORE 교정.
- company 는 Title case 표기, **Firestore 에 이미 있는 표기(NITECORE, Heritage, Valandre, Mountain Hardwear, Opinel,
  Goal Zero 등)는 그대로** 따른다. Hoka One One → `HOKA`(호카), fjallraven,specialized 콜라보 → `Fjallraven`.
- 색상 옵션 없음 → color/colorKorean 전부 빈값(정상). `_source` = `betterweekend_<category>`(push 카테고리 1:1).
