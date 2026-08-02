# 웨스턴마운티니어링 (western-mountaineering)

- **공식**: https://www.westernmountaineering.com  (WooCommerce, 미국 프리미엄 구스다운 침낭 전문)
- 크롤러: `wm.py` (WooCommerce product-attributes 표 파싱), 미리보기 스텁 `sites/wm.js`
- companyKorean: 웨스턴마운티니어링 · 마지막 크롤: 2026-07, 206행(제품 72). 무게 186/206.

## ⚠️ 주의사항

### 크롤 & 구조
1. **전체 제품 = WP 사이트맵** `wp-sitemap-posts-product-1.xml` (72개, 품절 포함). 카테고리 리스팅은
   페이지네이션(5p)·중복 많음. `product-sitemap.xml` 은 404 → WP 코어 사이트맵 사용.
2. **서버렌더(WooCommerce)** → curl + UA 직접. 상세 스펙은 `woocommerce-product-attributes` 표(label/value).
   길이별 값은 **nested `insidetable`** → 아이템 행 단위로 분할 파싱해야 안쪽 `</td>` 에 안 걸린다.
3. **사이트가 미터법을 서빙**: Total Weight `820 g`, Temp Rating `-7°C`, 사이즈 `165cm`. 단 **혼재**하니
   (`980`=단위없는 grams, `2128 g`, 임페리얼 `1 lb 13 oz`, oz) `_to_g` 가 그램병기/평문/oz·lb 모두 처리.
   온도도 °C/°F 양쪽. **미터법 우선, 반올림은 oz/lb 변환 때만**.

### 카테고리 & 변형
4. **침낭 이름에 'bag' 이 없다**(Antelope·Puma·Kodiak·AlpinLite…) → **스펙 기반 분류**:
   `Temp Rating`/`Shape` 있으면 sleeping_bag. 슬러그 접미 `-mf/-gws/-stormshield`, quilt/comforter/underquilt 도 침낭.
   부티→etc, 재킷/파카/베스트/팬츠→clothing, 스터프색/스토리지색→pouch, 라이너/VBL/커플러/익스팬더→etc.
5. **mf/gws/stormshield 는 원단 라인**(같은 모델의 다른 셸) → 별도 제품(이름·groupId 구분됨).
6. **변형**: 침낭=길이(Total Weight 표의 키), **지퍼 L/R 은 무게 무관 → 접음**(Total Weight 표만 쓰면 자동 접힘).
   의류=사이즈(variations `attribute_pa_size_garments` xs/sm/md/lg/lg, 또는 full word small/medium/large).
7. **이미지는 og:image 가 없다** → `data-large_image`(WooCommerce 갤러리 풀사이즈) 사용.

### 스펙 & 한글화
8. 침낭 스펙: Shape, Fill(850+ Goose Down→fillMaterial/fillPower), Temp Rating(→limitTemp),
   Total Weight(→weight, 길이별), Fill Weight(→fillWeight, 길이별). **fillWeight 는 침낭 스키마에만** 넣을 것.
9. 의류: Avg. Total Weight(단일, 그램병기), Shell Fabric(→material), 이름으로 type(jacket/vest/pants)·hasHood.
10. **한글화 = 음역**(KR 공식 수입사명 미확인). `NAME_KO` 모델·구조어 사전으로 nameKorean 생성
    (알핀라이트/앤털로프/스톰실드/컴포터…), 미등재 코드(MF/GWS/XR/VBL)는 유지. sizeKorean: 침낭 cm 유지,
    의류 S/M/L→스몰/미디엄/라지. colorKorean 사전 음역.
