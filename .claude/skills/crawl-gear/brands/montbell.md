# 몽벨 (montbell)

- **일본 영문샵**: https://www.montbell.com/jp/en
- **한국(한글명 레퍼런스)**: https://www.montbell.co.kr  (고도몰형, 한글명만·영문/코드 없음)
- 크롤러: `sites/montbell.js`, 한글화 `kr-reference-montbell.js` + `kr-apply-montbell.js`
- 마지막 크롤: 2026-05, 5811개

## ⚠️ 주의사항
1. **리스팅은 POST `/jp/en/products/more?c={카테고리}`** body `{o:offset,l:24}` → JSON.
2. **`sorting_weight`(리스팅 무게)를 믿지 말 것** — 배송/정렬용이라 부정확. **상세 스펙 테이블
   표시무게**(Weight → Total/Packed → Set Weight)에서 파싱. kg→g 변환만, 반올림 금지.
3. **변형이 색상→사이즈 2단 중첩**(`colors{CODE:{sizes{...}}}`). 두 단계 모두 순회.
4. **규제 고지문(PFAS)이 소재 셀 끝에 구분자 없이 붙음** → "This product contains PFAS…" 마커부터 끝까지 제거.
5. 한글화: 한국 사이트에 **영문/코드가 전무**(한글명만) → US 영문명 음역 후 숫자집합·성별·bigram 으로 매칭.
   가드: 성별(남/여), 시장 프리픽스(US/PS/WIC/SIC), 숫자집합 정확일치.
