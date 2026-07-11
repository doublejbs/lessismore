# 엑스패드 (exped)

- **한국 공식**: https://exped.co.kr  (Cafe24, 매트·텐트·침낭·백팩 등 기어 브랜드)
- **국제 공식**: https://www.exped.com/en  (커스텀 CMS, 제품 페이지에 구조화 스펙 — 무게 소스)
- 크롤러: `exped.py` (KR 크롤 + EN 스펙 음역매칭), EN 스펙 캐시 `out/exped-en-cache.json`
- 마지막 크롤: 2026-07, 약 340행(제품 164)

## ⚠️ 주의사항
1. **KR 카테고리 8개**(텐트24·매트25·백팩26·스토리지27·침낭28·베개42·해먹43·액세서리44) 모두 순회.
   풋프린트→tent_acc, 레인커버→backpack_cover, 스트랩/카라비너 등→etc 로 보정.
2. **사이즈 옵션(M/LW/MW 등)은 상세 옵션 select 에 있다.** 첫 옵션이 "선택하세요" 플레이스홀더 →
   거기서 멈추지 말고 skip, "SHIPPING TO" 나오면 종료. **옵션에 색상이 섞임**(예 'S-M-블랙') →
   색상 토큰 분리해서 color 로, 나머지를 size 로.
3. **무게는 KR 텍스트에 없다.** 국제 사이트(exped.com/en) 제품 페이지의 `<h4>라벨</h4><div>값</div>`
   블록에서 파싱:
   - 매트/침낭/백팩: `Weight`(사이즈별 "M: 1010 g | LW: 1415 g" 형태 — KR 사이즈옵션과 매칭).
   - **텐트: `Max. Weight`(패킹) 우선, `Min. Weight`(최소)는 폴백.** (라벨이 'Weight' 아님 주의!)
   - R-Value, Temperature(℃), Volume(L), Thickness, Person Capacity 도 같은 구조.
4. **KR↔EN 매칭 = 음역(MODEL_EN) + 숫자.** 버사→versa, 씸→sim, 플렉스→flex, 울트라→ultra, 테라→terra,
   두라/듀라→dura, 토렌트→torrent, 스카이라인→skyline 등. **텐트 인용수는 EN 이 로마숫자**(3→iii) →
   arabic/roman 둘 다 시도. 매칭 안 되면 무게 없음(KR 전용 모델·음역 미등재).
5. num_key 에 사이즈(M/LW)를 넣지 말 것 — 무게는 wmap[size] 로 별도 매칭.
