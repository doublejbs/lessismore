/**
 * 장비 사진 URL의 **소유권 판별**.
 *
 * 장비 이미지는 **사용자가 직접 올린 것만 노출한다** — 크롤한 브랜드 이미지는 저작권상
 * 표시하지 않는다(앱 레포 `specs/DataModel.md` §1, 2026-07-28 결정).
 *
 * `users/{uid}/gears/{id}.imageUrl`이 있다고 해서 본인이 올린 사진인 것은 아니다 —
 * 2026-07-28 이전 앱의 장비 등록 경로가 카탈로그(`gear/{id}`) 문서를 그대로 복사해
 * 사용자 문서에 저장했고, 그 페이로드에는 브랜드 크롤 이미지 URL이 들어 있었다.
 * 카탈로그 이미지가 42,369개인 반면 실제 개인 업로드는 819개뿐이라, 사용자 문서에 남은
 * `imageUrl`은 오히려 크롤 URL이 다수다.
 *
 * 그래서 값의 **출처를 URL 자체로** 가른다. Firebase 다운로드 URL에는 Storage 객체 경로가
 * URL 인코딩돼 들어 있고, 개인 업로드는 `{userId}/`로 시작하지만 크롤 이미지는
 * `gears/`로 시작한다.
 *
 * 애매한 입력은 **전부 "본인 것 아님"으로 기운다** — 남의 저작물을 잘못 노출하는 쪽이
 * 사진 한 장을 못 보여주는 쪽보다 훨씬 비싸다.
 *
 * 앱 레포(`lessismore-app`)의 `model/gear-image/GearImageOwnership.ts`와 **같은 규칙**이다.
 * 한쪽만 고치면 같은 배낭이 앱과 웹에서 다르게 보이므로 함께 고친다.
 */

// 앱 Firebase 프로젝트의 Storage 버킷. 같은 버킷을 콘솔이 두 도메인으로 표기하므로,
// 저장된 URL에 어느 쪽이 박혀 있든 인정한다. 여기에 없는 호스트(브랜드 사이트 직링크 등)는
// 우리 Storage가 아니라 판별 대상이 아니다.
const STORAGE_BUCKETS = [
  'lessismore-7e070.appspot.com',
  'lessismore-7e070.firebasestorage.app',
];

// Firebase Storage 다운로드 URL 형식:
//   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{URL 인코딩된 객체 경로}?alt=media&token=...
const DOWNLOAD_URL_PATTERN =
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/?#]+)\/o\/([^?#]+)/;

// 우리 버킷의 다운로드 URL에서 Storage 객체 경로를 꺼낸다. 형식이 아니거나 디코딩이
// 깨지면 빈 문자열 — 호출부는 그것을 "판별 불가 = 본인 것 아님"으로 읽는다.
const extractObjectPath = (downloadUrl: string): string => {
  const matched = DOWNLOAD_URL_PATTERN.exec(downloadUrl);

  if (!matched) {
    return '';
  }

  const [, bucket, encodedPath] = matched;

  if (!STORAGE_BUCKETS.includes(bucket)) {
    return '';
  }

  try {
    // 잘린 `%` 시퀀스 등으로 디코딩이 실패하면 URI가 깨졌다는 뜻이라 판별을 포기한다.
    return decodeURIComponent(encodedPath).replace(/^\/+/, '');
  } catch {
    return '';
  }
};

/**
 * 이 URL이 **해당 사용자가 본인 폴더(`/{userId}/`)에 올린 사진**인지 판별한다.
 *
 * 다음은 모두 `false`다 — 빈 URL, 우리 버킷이 아닌 URL(브랜드 사이트 직링크 포함),
 * `/o/` 객체 경로가 없는 URL, 디코딩이 깨지는 URL, `gears/`로 시작하는 카탈로그 크롤 이미지,
 * 다른 사용자 폴더의 파일, 그리고 `userId`가 비어 있는 경우.
 */
export const isOwnGearImageUrl = (
  imageUrl: string | undefined,
  userId: string | undefined
): boolean => {
  if (!imageUrl || !userId) {
    return false;
  }

  const objectPath = extractObjectPath(imageUrl);

  if (!objectPath) {
    return false;
  }

  return objectPath.startsWith(`${userId}/`);
};
