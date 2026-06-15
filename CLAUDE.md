# 프로젝트 운영 규칙 (lessismore)

## 0. 가장 중요한 전제 — 이 프로젝트는 `manage`만 운영한다

이 레포(`lessismore`)는 현재 **장비 관리 화면(`/manage`)만 운영·유지보수하는 용도**다. 다른 라우트와 기능(`/bag-share`, `/celebrate`, `/app-install`, 가방 구성 등)은 레거시로 남아 있을 뿐, **신규 작업·개선 대상이 아니다.**

- 작업 요청이 들어오면 **`manage` 범위인지 먼저 확인**한다. manage 밖이면 작업 전에 사용자에게 범위를 확인받는다.
- `manage`가 의존하는 공유 자원(Firestore `gear` 컬렉션, 이미지 업로드 서버, Algolia 인덱스, `functions/`)은 manage 동작에 필요한 한도에서만 건드린다.
- manage와 무관한 코드는 읽기/참고는 가능하되, 함부로 수정·리팩토링하지 않는다.

## 1. spec-driven 워크플로우 (manage 작업의 필수 절차)

`manage`의 단일 진실 공급원(source of truth)은 [`docs/manage/ManageSpec.md`](docs/manage/ManageSpec.md)다. **코드보다 스펙이 먼저다.**

manage에 기능 추가·버그 수정·리팩토링을 할 때 반드시 아래 순서를 따른다.

1. **스펙 확인** — `docs/manage/ManageSpec.md`에서 관련 절을 먼저 읽는다.
2. **스펙 갱신** — 동작이 바뀐다면 **코드보다 먼저** 스펙을 고친다. 스펙과 코드가 어긋난 채로 진행하지 않는다.
   - 새 동작은 해당 절에 명세를 추가/수정한다.
   - "현재 동작 기록"(§8 등)과 충돌하면 그 항목도 함께 갱신한다.
3. **테스트 작성** — 검증 가능한 변경이면 구현 전에 테스트를 먼저 만든다.
4. **구현** — 스펙에 맞춰 구현한다. (서브에이전트 활용은 글로벌 규칙을 따른다)
5. **검증** — `npm run lint`, `npm run build`(= `tsc -b && vite build`)가 통과하는지 확인한다.
6. **리뷰** — 스펙 컴플라이언스 + 코드 품질 2단계 리뷰. **스펙과 구현, 문서가 모두 일치**하는지 확인한다.

> 핵심 원칙: **스펙에 없는 동작을 코드에 넣지 않는다. 코드에 있는 동작은 스펙에 반드시 적혀 있어야 한다.** 둘이 어긋나면 그것이 버그다.

### 스펙을 건드리지 않아도 되는 경우
단순 질문/탐색/설명, 또는 동작이 전혀 바뀌지 않는 변경(오타, 주석, 포맷팅)은 스펙 갱신을 생략할 수 있다.

## 2. manage 코드 지도

| 위치 | 역할 |
|---|---|
| [`src/manage/ManageView.tsx`](src/manage/ManageView.tsx) | 화면 조립 · 접근 제어 · 테이블/툴바/모달 |
| [`src/manage/model/Manage.ts`](src/manage/model/Manage.ts) | 상태·비즈니스 로직 (MobX) |
| [`src/manage/store/ManageStore.ts`](src/manage/store/ManageStore.ts) | Firestore / Algolia 데이터 접근 |
| [`src/manage/model/ManagerGear.ts`](src/manage/model/ManagerGear.ts) | 장비 도메인 모델 |
| [`src/manage/GearRow.tsx`](src/manage/GearRow.tsx) | 행 렌더링 · 인라인 편집 |
| [`src/manage/component/`](src/manage/component) | 추가/엑셀/네이버 이미지 모달 |
| [`functions/index.js`](functions/index.js) | `naverShoppingSearch` 등 백엔드 |

자세한 동작은 스펙 문서를 본다.

## 3. 코딩 컨벤션

다음 세 레이어를 모두 적용하며, **아래로 갈수록 우선**한다.

1. **글로벌 컨벤션** — `~/.claude/CLAUDE.md` (네이밍, 화살표 함수, enum, 컴포넌트 분리 등)
2. **프로젝트 컨벤션** — [`.cursor/rules/drive-web.mdc`](.cursor/rules/drive-web.mdc)
   - 클래스: 속성 `private`, 메서드 접근제한자 명시, 정적 속성 최상단, getter/setter 지양, 변경 없는 속성 `readonly`, 파일 하단 `export default 클래스명`.
   - 컴포넌트: 파일명 뒤 `View` 접미사, 함수형 컴포넌트, Props는 `interface Props {}`, 선언부/실행부 1줄 개행.
   - 모든 텍스트(문서·커밋 메시지)는 **한글**로 작성.
3. **기존 manage 코드 스타일** — 위 규칙과 충돌하지 않는 한, 주변 코드의 관례(MobX 모델/스토어 3계층, antd 사용 패턴)를 따른다.

> 참고: 현재 manage 코드는 일부 컨벤션(예: 일부 파일명 `View` 미접미사, `any` 사용)을 완전히 지키지 않는다. **새 코드는 컨벤션을 지키고**, 기존 코드는 해당 영역을 작업할 때 점진적으로 정리한다.

## 4. 검증 명령

```bash
npm run lint     # eslint
npm run build    # tsc -b && vite build (타입 + 빌드 검증)
npm run dev      # 로컬 개발 서버 (vite)
```

배포는 `npm run deploy`(= predeploy build 후 `firebase deploy`). 배포는 사용자가 명시적으로 요청할 때만 수행한다.

## 5. Git / PR

글로벌 `~/.claude/CLAUDE.md`의 Git/PR 규칙을 따른다. 요약:
- 작업 시작 시 베이스 브랜치에서 새 작업 브랜치를 먼저 딴다(워크트리 자동 생성 브랜치 위에 쌓지 않는다).
- PR assignee는 항상 본인(`@me`).
- 커밋/푸시는 사용자가 요청할 때만.
