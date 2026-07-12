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
   ⚠️ `value.slice(0,N)` 로 **먼저 자르면** 고지문이 중간에 끊겨(`…cannot be shipped to`) 정규식이 안 맞는다 →
   슬라이스 **전에** `/마커[\s\S]*$/` 로 제거. `(PFAS-free …)` 같은 정상 표기는 보존.
5. 한글화: 한국 사이트에 **영문/코드가 전무**(한글명만) → US 영문명 음역 후 매칭. 참고 `kr-reference-montbell.js`+`kr-apply-montbell.js`.
   - 매칭 = **숫자집합 완전일치 + 성별 일치 + bigram Dice ≥ 0.85(근접 길이 우선)**. 매칭되면 KR 공식명 verbatim, 아니면 음역 폴백.
   - 가드: ① 성별(Men's↔남/Women's↔여) — 없으면 여성 제품에 남성 이름 박힘 ② 시장 프리픽스(US/PS/WIC/SIC)·말미 영문색상 제거
     ③ 숫자집합 *정확* 일치(부분집합 X): `30L`↔`30L 2`(버전)·`20L`↔`30L` 오매칭 방지. 팩은 용량에 `L` 부착(차차 팩 30→30L).
