# 꼴로르 (ccolore)

- **공식**: https://ccolore.com  (Cafe24, 한국 초경량 다운 침낭/퀼트 + 실타프·텐트·다운의류)
- 크롤러: `ccolore.py`, 무게 OCR 폴백 `ccolore-weight-ocr.py`, 미리보기 스텁 `sites/ccolore.js`
- companyKorean: 꼴로르 · 마지막 크롤: 2026-07, 77행(제품 47). 무게 61/77.

## ⚠️ 주의사항

### 크롤 & 카테고리
1. **Cafe24 (구형 cate_no)** — 상품은 `/product/list.html?cate_no=89`(Shop). `/category/.../N/` 아님.
   전 상품은 89를 페이지네이션(7p). curl+UA 직접. 카드 `anchorBoxId_<no>`, 이름 `og:title`(한글).
2. **색상 = 이름 말미 ' - 솔트 그레이'**(CAYL식). 각 색상이 별도 product_no. 수량(2ea)·코드는 색상 아님(제외).
3. **옵션이 애드온으로 오염** — 타프 폴·펙(8ea)·세트 옵션이 사이즈로 섞임 → **진짜 사이즈(S/M/L/XL) 옵션만
   확장**(REAL_SIZE 화이트리스트). 타프/텐트의 실제 사이즈는 제품명에 있음(실타프 헥사 L). 안 그러면 행 폭발.
4. 분류: 에어라이트/얼티밋라이트/썸머라이트/슬립스퀘어/다운라이너→sleeping_bag, 실타프→tarp, 텐트→tent,
   사이드월→tent_acc, 다운자켓/머플러/양말→clothing, 압축색/메쉬망/파우치→pouch, 폴/스트링/스토퍼→etc.

### 스펙 (침낭)
5. **측정표(사이즈별 컬럼)**: `Full Weight | 529 | 548 | (g)`(제품무게), `Fill Weight | 290 | 300 | (g)`(충전량).
   사이즈 헤더 M/L 순서로 매핑. 이너사이즈 괄호값(205(187))은 무시.
6. **온도** `2℃ / -3℃ / -15℃` → comfortTemp=2, limitTemp=-3(익스트림 -15 버림). **필파워** `필파워 : 1000 CU.IN`(3~4자리!).
   충전재 구스/덕 → fillMaterial=down. **무게 소수점 유지**.

### 무게 형식 4종 (`parse_weights`)
7. 컬럼표(529/548) · 단일 콤마(`Full Weight|2,390g`) · 인라인 사이즈별(`S - 335g, M - 351g`, 다운자켓) ·
   총 무게 kg(`총 무게 2.8kg`, 텐트).

### 무게 OCR 폴백 (`ccolore-weight-ocr.py`)
8. **CL/CT 실타프·사이드월(콜라보/코팅 라인)은 무게가 텍스트 없이 이미지에만** 있음
   (`/web/upload/NNEditor/` 스펙표 `Full Weight 1,680g(Skin), 770g(Acc)`). macOS Vision OCR 로 추출,
   **스킨(본체) 무게 우선**. 하드웨어(폴·스트링·케이스·양말·V팩)는 무게 없어 스킵.
   ⚠️ 크롤러 재실행하면 OCR 무게가 초기화되므로 **재크롤 후엔 OCR 폴백을 다시 돌려야 함**.

### 필드 언어
9. **color=영문, colorKorean=한글.** 사이트가 색상을 한글로만 표기 → `KO_COLOR_EN` 사전으로 color 를 영문 변환
   (솔트 그레이 → Salt Grey). name/size=영문(사이즈 M), nameKorean/sizeKorean=한글(미디엄).
   (순수 한국 브랜드라 제품명 자체는 한글 verbatim.)
