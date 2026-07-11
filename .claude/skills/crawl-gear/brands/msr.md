# MSR (msr)

- **공식**: https://cascadedesigns.com  (Shopify, MSR+Thermarest+Platypus+PackTowl+SealLine 통합몰)
- 크롤러: `sites/msr.js`
- ⚠️ **미완 상태**: 어댑터 초안만 있고 풀 크롤/한글화/Firestore push 안 됨(out 결과물 없음). 재개 시 아래부터.

## ⚠️ 주의사항
1. **브랜드 필터**: 리스팅 카드의 `data-product-brand="MSR"` 로 MSR 만 거름(멀티브랜드 몰).
2. 상세 스펙은 `.product__product_details` 아래 **feature bullets(<ul>)** 형태.
3. 남은 작업: 카테고리 매핑 확정 → 무게(Shopify grams 검증 후) → 한글화(공식 수입사 확인) → push.
