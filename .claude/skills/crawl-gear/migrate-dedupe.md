# gear 중복 문서 통합 마이그레이션 스펙 (2026-08)

## 배경

같은 장비가 크롤 세션마다 중복 insert 되어 전역 `gear` 컬렉션에 중복 문서가 존재한다.
(현재 push 의 `findExisting` 매치 규칙 확립 전 크롤, 이름/groupId 표기 변화가 원인.)
중복을 **가장 오래된 문서(id)로 통합**하고, 그 id 를 참조하는 모든 곳을 갱신한다.

## 데이터 모델 — gear id 참조 지점 (전수)

| 위치 | 형태 |
|---|---|
| `gear/{id}` | 전역 카탈로그. 문서 ID = `id` 필드, `createDate`(ms), 카탈로그 필드, `useless/used/bags/isCustom` |
| `users/{uid}/gears/{id}` | 사용자 창고 — **문서 ID 가 gear id**. 담을 때의 카탈로그 복사본 + `bags`(bag id 배열), `useless`/`used`(bag id 배열) |
| `bag/{bagId}.gears` | gear id 문자열 배열. `bag.weight` 는 장비 무게 누적 합 |
| Algolia `useless-gear-search` | objectID = gear id. **Firebase Extension 자동 동기화** (Firestore 삭제 → 인덱스 자동 제거, 검증만 수행) |
| Storage `gears/{id}.{ext}` | 장비 이미지. 삭제하지 않음 (고아 파일 허용) |
| `/gear-share/:id` 공유 링크 | `gear/{id}` 직접 조회. dup id 로 공유된 과거 링크는 깨짐 — 허용된 영향 |
| `feed-content.relatedGearId` | 홈 추천 큐레이션 카드(`gear_intro`)의 gear id 참조 — `where('relatedGearId','==',dupId)` → 필드만 canonical 로 update |

### 앱(lessismore-app, develop 브랜치) 추가 참조 지점

| 위치 | 형태 | 마이그레이션 처리 |
|---|---|---|
| `users/{uid}/bagTemplates/{tplId}.gears` | gear id 문자열 배열 (+`weight` 합계) | bag 과 동일: dup→canonical 치환+중복 제거, dup·canonical 공존 시 사라지는 항목 무게만큼 `weight` 차감 |
| `gear-rank/{gearId}` | 문서 ID = gear id. **`id` 필드 보유**(앱은 문서 ID 가 아니라 이 필드로 gear 조회), `count`(담은 횟수), `category`, `updatedAt` | dup 들의 `count` 를 canonical 에 **합산**(`increment` 원자 연산). canonical 문서 없으면 dup 내용으로 생성하되 **`id` 필드는 반드시 canonicalId 로 덮어씀**. `updatedAt` 최신값. dup 삭제 |
| `gear-review/{gearId}` | 문서 ID = gear id. 리뷰 캐시 | canonical 에 없으면 dup 것 복사(내부 id/gearId 류 필드가 있으면 canonicalId 로 교체), 있으면 canonical 유지. dup 삭제 |
| `gear-comments/{gearId}` 요약 문서 + `/comments/{cid}` (+대댓글 `.../comments/{cid}/comments/{rid}`, 2단) | 요약 문서: `gearId`, `totalCount`, `parentCount`, `ratingSum/ratingCount/ratingAvg`, `lastCommentAt`. 댓글 트리 | 댓글 트리는 canonical 경로로 **복사 후 원본 삭제**(commentId 유지). 요약 문서는 **카운터 병합**: `totalCount`/`parentCount`/`ratingSum`/`ratingCount` 합산, `ratingAvg` 재계산, `lastCommentAt` 최신값, `gearId` = canonicalId. 하위 대댓글 열거도 최상위와 동일하게 `listDocuments()` 를 사용해 필드 없는 팬텀 문서를 놓치지 않는다 |
| `comment-likes/{userId_commentId}` | 필드 `gearId` 보유 (문서 ID 는 gear id 무관) | `where('gearId','==',dupId)` 조회 → `gearId` 필드만 canonical 로 update |

> **사용자 수정 케이스**: 앱은 `users/{uid}/gears` 복사본을 사용자가 직접 수정할 수 있다
> (`setDoc(..., { merge: true })`). → 결정 4(사용자 복사본 데이터 불변, ID 만 이동)가 더욱 중요.
> 사용자가 dup·canonical 복사본을 **둘 다** 보유하며 서로 다르게 수정한 경우 자동 병합하지 않고
> plan 리포트에 별도 표기해 수동 판단 대상으로 남긴다 (기본값: canonical 복사본 유지 + 배열 합집합).

## 확정 결정사항 (사용자 확인 완료)

1. **중복 판정 키**: `company + 한글명(nameKorean, 없으면 name) + color + size` — 정규화(트림·연속 공백 축약·라틴 소문자화) 후 정확 일치만 자동 병합 대상. 유사 중복은 자동 병합하지 않고 수동 검토 목록으로만 출력 — 유형: 영문명 일치·한글명 상이 / 색상·사이즈 한쪽만 빈값 / **`groupId`+color+size 일치·이름 상이** / **이름·색상·사이즈 일치·회사 표기만 상이**(예: Nemo vs 니모).
2. **생존자(canonical)**: 그룹 내 `createDate` 최소 문서. `createDate` 없으면 admin SDK 문서 `createTime` 폴백. 동률이면 문서 id 사전순 최소.
3. **카탈로그 데이터**: id 는 오래된 것, **데이터는 최신 것** — 그룹 내 최신(createDate 최대) 문서의 카탈로그 필드(company/companyKorean/name/nameKorean/color/colorKorean/size/sizeKorean/weight/category/groupId/productUrl)로 생존자를 갱신하고 `specs` 는 오래된→최신 순 merge. **단 필드별로 "최신부터 과거 순으로 첫 번째 비어있지 않은 값"을 취한다** — 최신 문서에 빈 문자열/0 인 필드가 있어도 생존자의 채워진 값을 공백/0 으로 덮지 않는다 (`weight` 도 `toNum(최신) || toNum(이전…) || 0`). `imageUrl` 은 **생존자 것 우선 유지**(비어있을 때만 최신 것 채움) — dup id 파일명을 가리키는 URL 로 교체하지 않기 위함. 전역 gear 반영은 문서 전체 `set` 이 아니라 **해당 필드만 `update`** 한다.
4. **`users/{uid}/gears` 는 사용자 복사본 그대로 이동**: 문서 내용(무게 포함)은 건드리지 않고 문서 ID 와 `id` 필드만 canonical 로 교체(복사+삭제). → 사용자 창고 무게·가방 합계 불변.
5. **가방 weight**: id 치환만으로는 불변. 한 가방에 dup 과 canonical 이 **둘 다** 있던 경우만 하나로 합쳐지며, 사라지는 항목의 무게를 `bag.weight` 에서 차감 (하한 0). 차감 무게의 출처: 그 사용자의 `users/{uid}/gears` 복사본이 **존재하면 그 값을 그대로 사용(0 이어도 0)**, 복사본이 없을 때만 전역 카탈로그 무게로 폴백. 이 케이스는 plan 리포트에 별도 표기.
6. **`isCustom == true` 문서는 대상 제외.**
7. **적용 전 사용자 검토 필수**: plan 산출물(중복 그룹 리포트)을 사용자가 확인·승인한 뒤에만 apply.

## 스크립트: `migrate-dedupe.js`

기존 push 인프라 재사용: firebase-admin + `serviceAccountKey.json`, **Node 20 로 실행**
(`/opt/homebrew/opt/node@20/bin/node`).

### 모드

```
node@20 migrate-dedupe.js --backup   # Phase 0: gear + users/*/gears + bag + bagTemplates + gear-rank + gear-review + gear-comments + comment-likes + feed-content NDJSON 덤프 → out/dedupe-backup-<ts>/
node@20 migrate-dedupe.js --plan     # Phase 1: 읽기 전용 스캔 → out/dedupe-plan.json + out/dedupe-report.html
node@20 migrate-dedupe.js --apply    # Phase 2: dedupe-plan.json 기준 적용 (승인된 plan 필요, 실행 전 대화형 확인; --dry-run / --yes)
node@20 migrate-dedupe.js --verify   # Phase 3: 읽기 전용 재검증 (실패 시 exit 1)
node@20 migrate-dedupe.js --restore --from=<dir> [--only=<컬렉션>]  # 백업 복원
```

### Phase 1 — plan (쓰기 없음)

- `gear` 전체 스캔 → isCustom 제외 → 정규화 키로 그룹핑 → 크기 ≥ 2 그룹 추출.
- 그룹마다: 생존자 선정, 최신 문서 선정, 카탈로그 병합 결과 미리 계산.
- 참조 스캔: collectionGroup `gears` 에서 dup id 문서 보유 사용자 목록(canonical 동시 보유 여부 포함), `bag` 전체에서 dup id 포함 가방 목록, dup+canonical 동시 포함 가방(weight 차감 대상) 목록, collectionGroup `bagTemplates` 의 dup id 포함 템플릿, `gear-rank`/`gear-review`/`gear-comments` 의 dup id 문서, `comment-likes` 의 `gearId == dup` 문서 수.
- 산출물:
  - `out/dedupe-plan.json` — 그룹 정의(key, canonicalId, dupIds, newestId, mergedCatalog)와 참조 스캔 결과·유사중복·충돌 목록. 정확한 스키마는 스크립트 산출 형식이 기준(참조 목록은 리포트용이며 apply 는 재스캔한다).
  - `out/dedupe-report.html` — 그룹별 카드(이미지·이름·색상·사이즈·createDate·참조 수), 유사 중복 별도 섹션. **사용자 검토용.**

### Phase 1.5 — 리포트 피드백 (검토를 페이지에서 직접)

- HTML 리포트에 그룹별 **[병합 승인(기본)] / [제외]** 토글과 메모 입력, 유사 중복·충돌 항목에는 메모 입력을 제공한다.
- 상단 "피드백 저장" 버튼 → 로컬 피드백 서버(`node migrate-dedupe.js --feedback-server`, 포트 3848, Firestore 미접속)로 POST → `out/dedupe-feedback.json` 저장. 입력은 localStorage 에도 실시간 보존(새로고침 안전), 서버 미기동 시 JSON 클립보드 복사/다운로드 폴백.
- 피드백 파일 형식: `{ planGeneratedAt, savedAt, groups: { <groupKey>: { decision: 'approve'|'exclude', memo } }, nearDuplicates: { <key>: memo }, conflicts: { <key>: memo } }`.
- **apply 는 `out/dedupe-feedback.json` 이 있으면 읽어 `decision: 'exclude'` 그룹을 건너뛰고** 로그에 `excludedByFeedback` 로 기록한다. 피드백의 `planGeneratedAt` 이 현재 plan 과 다르면 경고 후 확인(오래된 피드백 오적용 방지).
- `--render` 모드: Firestore 접속 없이 기존 `out/dedupe-plan.json` 으로 리포트 HTML 만 재생성.

#### 유사 중복 병합 승인 (사용자 피드백 기반)

- `feedback.nearDuplicates` 의 메모에 **'병합'** 이 포함되면 그 쌍을 병합 승인으로 해석한다. `--plan` 이 승인 쌍들을 union-find 로 컴포넌트화해 **추가 병합 그룹(`origin: 'nearDuplicate'`)** 을 생성한다 — 생존자 선정·카탈로그 병합·참조 처리 모두 기존 규칙과 동일.
- **변형 충돌 판정**: 컴포넌트 내 비어있지 않은 `color` 정규화값이 2종 이상이거나 `size` 가 2종 이상이면 서로 다른 변형이 섞인 것이므로 **병합하지 않는다**. 카테고리 상이는 병합을 막지 않는다(병합 규칙대로 최신값 채택, 리포트에 표기).
- 변형 충돌 컴포넌트의 처리: 변형 정보가 부족한 문서(색상/사이즈 빈값, 구형 크롤 잔재)가 **참조 0** (창고·가방·템플릿·rank·리뷰·댓글·좋아요·피드 전부 — apply 시점 재확인)이면 그 문서만 **고아 삭제(orphanDelete)** 하고 변형 문서들은 유지한다. 참조가 있으면 보류하고 리포트에 사유와 함께 표기한다.
- **'<회사명>로 병합해'** 메모: 그 그룹의 mergedCatalog `company` 를 지정한 값으로 덮어쓴다.
- 그룹 메모에 **'imageUrl 최신'** 이 포함되면 그 그룹의 mergedCatalog `imageUrl` 을 생존자 우선 규칙 대신 **최신 문서의 비어있지 않은 imageUrl** 로 채택한다.
- 유사중복 그룹의 문서가 정확 중복 그룹의 dup 이기도 하면 그 그룹의 canonical 로 치환 후 중복 제거하고, 전부 하나로 접히면 그룹을 생성하지 않는다.

### Phase 2 — apply (참조 재작성 → 삭제 순서 엄수, 멱등)

**plan 은 "승인된 그룹 정의"(canonical/dup/mergedCatalog)로만 사용한다. 참조 목록(어느 가방·사용자·랭크가 dup 을 참조하는가)은 plan 을 신뢰하지 않고 apply 시작 시 재스캔한다** — plan 생성과 apply 사이에 사용자가 dup 을 담거나 가방에 넣었을 수 있기 때문. 재스캔 범위는 Phase 1 참조 스캔과 동일.

추가 안전장치:
- apply 시작 시 각 그룹의 canonical·dup 문서의 `dedupeKey` 가 plan 시점과 여전히 일치하는지 재확인 — 불일치 그룹은 skip + 리포트 (manage 인라인 편집으로 값이 바뀌었을 수 있음).
- **카탈로그 편집 감지**: canonical·dup 문서의 카탈로그 필드가 plan 에 담긴 시점 스냅샷과 달라졌으면(= plan 이후 manage 편집) 그 그룹 skip + 리포트 — plan 의 `mergedCatalog` 를 적용하면 편집이 되돌아가므로, 해당 그룹은 `--plan` 재실행·재승인으로 처리한다. 단 **생존자는 "스냅샷 값 또는 mergedCatalog 값" 둘 다 허용** — apply 가 이미 기록한 그룹의 재실행이 막히지 않게 하기 위한 멱등성 예외다(dup 은 엄격 비교).
- **배치 한도 초과 그룹의 원자 분할**: 비멱등 쓰기(gear-rank count·댓글 요약 카운터)는 dup 이 batch 한도를 넘으면 **"증분 1 + 삭제 n" 이 한 커밋에 들어가는 청크 단위로 분할**해 각 청크를 원자화한다 — 청크 중간 크래시 후 재실행해도 이중 합산·유실이 없다. batchLimit 하한은 2.
- **rank/review/comments/likes/feed-content 는 재스캔 결과가 아니라 `dupIds` 를 직접 순회**(문서 ID 접근·where 쿼리) — 스캔~쓰기 사이에 생긴 참조까지 닫는다. 배열 멤버십 기반(bag/bagTemplates/users-gears)은 스캔 결과를 쓰되, 트래픽 적은 시간대 실행 전제로 커버한다.
- plan 에 `planVersion` 을 기록하고 apply 가 사전 검증 — 구버전/손상 plan 은 시작 전에 거부.
- 실행 전 plan 요약(그룹 수·삭제 문서 수·생성 시각)을 출력하고 대화형 확인을 받는다 (`--yes` 로 생략 가능).
- **쓰기는 가능한 한 필드 원자 연산으로**: count 합산·요약 카운터·weight 차감은 `increment`, 창고·전역 gear 의 집합 성격 배열은 `arrayUnion`, 전역 gear 카탈로그는 변경 필드만 `update` — 실행 중 사용자 동시 편집 유실을 최소화한다. 단 **가방/템플릿의 `gears` 배열은 단일 `update` 로 전량 재작성**한다(문서당 쓰기 1회): `arrayRemove`+`arrayUnion` 2회 쓰기는 사용자 표시 순서가 바뀌고, 두 쓰기 사이 크래시 시 항목 유실 또는 재실행 시 인위적 "공존" 판정으로 weight 이중 차감이 발생하기 때문. weight 차감은 같은 op 안에서 `increment(-delta)`.
- **batch commit 실패는 전체 중단**(그룹 skip 아님) — 부분 상태에서 오염된 writer 로 계속 진행하지 않는다. flush 는 실패해도 batch 를 재생성해 재사용 오류를 막는다.
- 같은 사용자가 dup 을 2개 이상 보유한 경우: **uid 단위로 canonical + 모든 dup 문서를 한 번에 읽고 단일 병합 payload 를 계산**해 1회 쓰기 — 반복 read-modify-write 로 앞선 쓰기가 유실되지 않게 한다 (canonical 복사본 없으면 가장 오래된 dup 복사본을 베이스로 배열 합집합).

plan 의 그룹 정의를 입력으로, 그룹 단위 처리:

1. **bag 재작성**: `bag.gears` 에서 dup → canonical 치환 + 중복 제거. dup·canonical 공존 가방은 사라지는 항목 무게만큼 `weight` 차감(하한 0).
2. **bagTemplates 재작성**: collectionGroup `bagTemplates` 에 동일 처리 (치환+중복 제거, 공존 시 weight 차감).
3. **users/\*/gears 이동**: 사용자별 dup 문서 →
   - canonical 문서가 이미 있으면: `bags`/`useless`/`used` 합집합, `createDate` 최소값으로 canonical 문서 update 후 dup 삭제 (그 외 필드는 canonical 복사본 유지).
   - 없으면: dup 문서 데이터 그대로 + `id: canonicalId` 로 `users/{uid}/gears/{canonicalId}` 생성 후 dup 삭제.
4. **gear-rank 병합**: dup 의 `count` 를 canonical 에 합산(없으면 dup 내용으로 생성, `updatedAt` 은 최신값) 후 dup 삭제.
5. **gear-review 이동**: canonical 에 없으면 dup 문서 복사, 있으면 유지. dup 삭제.
6. **gear-comments 트리 이동**: `gear-comments/{dup}/comments/**`(대댓글 2단 포함)를 canonical 경로로 복사 후 원본 삭제.
7. **comment-likes 갱신**: `gearId == dup` 문서의 `gearId` 필드를 canonical 로 update.
8. **feed-content 갱신**: `relatedGearId == dup` 문서의 필드를 canonical 로 update.
9. **전역 gear 병합**: 생존자에 병합 카탈로그(§결정 3) **필드 update** + dup 들의 `useless/used/bags` 를 `arrayUnion` 병합 → dup 문서 삭제 (Extension 이 Algolia 에서 자동 제거).
10. 처리 로그를 `out/dedupe-apply-<ts>.log.json` 에 기록 — 그룹이 중간 실패해도 그때까지 커밋된 op 는 로그에 남긴다.

`--dry-run`: 쓰기 없이 수행할 op 목록만 출력.

멱등성: dup 문서가 이미 없으면 해당 단계 skip. 재실행 안전.

### Phase 3 — verify (쓰기 없음)

- **검증 입력은 apply 로그**(`out/dedupe-apply-*.log.json` 의 삭제된 dup id 합집합) — plan 파일은 apply 후 재생성되면 dup 정보가 사라지므로 신뢰하지 않는다. 로그가 없으면 plan 폴백, 둘 다 없으면 오류로 종료.
- 중복 키 그룹 재스캔 → 자동 병합 대상 그룹 0건 확인 (plan 이후 크롤로 생긴 신규 중복은 별도 표기해 원인 구분).
- 삭제된 dup id 를 참조하는 `bag.gears` / `users/*/gears` / `bagTemplates.gears` / `gear-rank` / `gear-review` / `gear-comments` / `comment-likes.gearId` / `feed-content.relatedGearId` 0건 확인.
- Algolia `useless-gear-search` 에서 dup objectID 표본 검색(레포에 있는 검색 전용 키 사용) → 미노출 확인.
- 건수 리포트 출력. **검사 실패가 하나라도 있으면 exit 1.**

## 백업 형식과 롤백

- 백업은 문서당 `{ path, docId, data }` 구조의 **NDJSON**(대형 컬렉션 메모리 보호, 스트리밍 기록). `Timestamp` 등 특수 타입은 태깅해 복원 가능하게 직렬화.
  주의: `gear` 컬렉션에는 문서 ID ≠ `data.id` 인 문서가 존재할 수 있으므로(`addDoc` 경로) 문서 ID 를 데이터와 별도로 보존한다.
- `--restore --from=<백업디렉토리> [--only=<컬렉션>]` 모드 제공 — 백업을 그대로 재기록. 복원 왕복은 실 데이터 적용 전 소규모 표본으로 검증한다.
- apply 는 그룹 단위 진행이므로 중단 시 부분 적용 상태여도 재실행으로 이어서 완료 가능(멱등).

## 실행 전제

- **Node 20 확보 필수** (firebase-admin 이 Node 22+ 에서 크래시 — SKILL.md 참고). apply 전에 `--backup`/`--plan` 왕복으로 런타임 안정성을 먼저 확인한다.
- apply 는 사용자 트래픽이 적은 시간대에 실행 권장 (원자 연산으로 유실은 최소화했지만 완전한 격리는 아님).
