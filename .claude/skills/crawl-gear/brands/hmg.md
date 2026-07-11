# 하이퍼라이트마운틴기어 (hmg)

- **한국 공식**: https://hyperlitemountaingear.co.kr  (Cafe24, 다이니마 초경량 배낭·셸터)
- **영문 공식**: https://hyperlitemountaingear.com  (Shopify, `products.json` — **영문 제품명 매핑용**)
- 크롤러: `hmg.py` (KR 크롤 + 영문명 매핑), 미리보기 스텁 `sites/hmg.js`
- companyKorean: 하이퍼라이트마운틴기어 · 마지막 크롤: 2026-07, 102행(제품 82). 무게 99/102.

## ⚠️ 주의사항

### 크롤 & 스펙
1. **Cafe24** — curl+UA 직접. 카테고리 packs/24·shelterstents/25·stuffsacks/27·accessories/42(+editor=블로그).
   URL 슬러그 필수. 카드 `anchorBoxId_<no>`, 이름 `og:title`(한글).
2. **스펙은 상세 'SPECS & DIMENSIONS' 텍스트 블록**(이미지 아님). 볼륨별(40L/55L) 소재·무게·치수.
   `HIDE SPECS & DIMENSIONS` 뒤는 FEATURES(마케팅)라 잘라낸다.
3. **무게 표기 3형식**: `무게-White 832.7g`(대시+영문) · `무게(화이트) 853g`(괄호+한글) · `무게 739.9g`(단일).
   **소수점 유지(반올림 금지)**. `무게([^\dg]{0,22}?)([\d.]+)g` 로 파싱, 색상은 알려진 색상어일 때만
   (`무게(가이라인 포함) 530g` 같은 괄호 주석은 색상 아님). **`적재무게`(하중)는 lookbehind 로 제외**.

### 변형 & 카테고리
4. **볼륨 헤더가 양방향**: `40L 본체` / `본체 40L` → 정규식으로 순서 통일 후 분할.
   다중볼륨(정션 WD 40/55)은 볼륨별 섹션, 단일볼륨은 이름 끝 숫자(팩류만).
5. **배낭은 볼륨=사이즈**(40L→size, specs.volume). **파우치는 volume 아니라 `capacity`**(스키마).
   **셸터/텐트는 이름 끝 숫자가 인원수 → `capacity`**(울타미드 2 = 2인, 2L 아님!). size 는 비움.
6. **셸터/텐트 소재는 `material` 아니라 `flyMaterial`**(스키마). 단일벽 다이니마.
7. 옵션의 Torso Length(핏)·애드온 포켓(인사이드 팩 포켓 등)은 무게 무관 → **접음**. `(gid,color,size)` dedup.
8. 색상=무게 라인에서 파생(무게-White/Black). 단색 제품은 무게 라인에 색상 없음 → color 빈값.

### 한글화 — 영문명은 .com 대조 (중요)
9. KR 사이트는 **한글명만** 노출(정션 WD). **영문 `name` 은 hyperlitemountaingear.com 영문사이트**의 실제
   제품명으로 매핑: `KO_EN` 토큰 사전(정션→Junction, 애스펙트→Aspect, 페미루프→**Pemi**, 울타미드→UltaMid,
   미드→Mid, 크로스피크→CrossPeak, 팟→Pod…). nameKorean 은 한글 verbatim. groupId 는 영문 슬러그.
   숫자 붙은 토큰(`울타미드2`)은 `([가-힣])(\d)` 로 분리 후 매핑.
