// 어드민 화면(장비 관리 / 공지) 접근이 허용된 운영자 UID 목록.
// manage와 announcement 화면이 동일한 운영자 기준을 공유하기 위해 이곳에 단일 정의한다.
// ⚠️ 클라이언트 사이드 게이팅이며, 실제 쓰기 보호는 Firestore 보안 규칙에 의존한다.
export const ALLOWED_UIDS = ['M3yk9SzrGZN3veiyd2SE6LmTrsk1', 'KkmaLpxPYLbmJKGkSTLMuMcD5l82'];
