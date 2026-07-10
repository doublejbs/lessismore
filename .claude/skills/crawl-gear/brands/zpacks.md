# 지팩스 (zpacks)

- **공식**: https://zpacks.com  (Shopify, 미국 초경량 코티지 브랜드)
- 크롤러: `zpacks.py`
- 마지막 크롤: 2026-06, 1496개

## ⚠️ 주의사항
1. **범위 = 핵심기어 + 지팩스 정품 액세서리.** 제외: bargain(할인중복)·resale(타브랜드 Toaks/Evernew 등)·
   materials(원료)·dummy·add-on·교체부품/스트랩.
2. **무게는 `grams`**(상세 표시무게와 일치 검증됨). 단 **백팩은 grams=0** → 상세 HTML 의
   `data-option1/2/3` + `data-weight="X oz / Y g"` 블록에서 추출.
3. **백팩 변형 폭발 주의**: 색상×토르소×스트랩×벨트 = 수백 개. **벨트 길이는 접기**(무게 ~10g 차이).
   → 색상×토르소×스트랩만 전개.
4. **한글명은 음역**(공식 한국명 없음). EPX/DCF 등 소재코드는 유지.
5. `"Color | Torso"` 결합 옵션명은 ` | ` 로, `"Blue w/ Lite Floor"` 값은 ` w/ ` 로 분해.
6. **push 후 문서수 < 행수면 색상변형 합쳐진 것** → push-firestore.js findExisting 이 color 포함하는지 확인(수정 완료).
