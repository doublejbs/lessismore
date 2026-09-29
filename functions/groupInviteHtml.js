import admin from "firebase-admin";
import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

const REGION = "asia-northeast3";
const MAX_INSTANCES = 10;

const WEB_BASE_URL = "https://lessismore-7e070.web.app";

// 배포된 SPA 의 index.html. 정적 파일이 리라이트보다 먼저 서빙되므로
// 이 요청은 이 함수로 되돌아오지 않는다(§7).
const TEMPLATE_URL = `${WEB_BASE_URL}/index.html`;
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

// 미리보기 크롤러는 오래 기다리지 않는다 — 부가 정보에 시간을 다 쓰지 않는다.
const TEMPLATE_FETCH_TIMEOUT_MS = 3000;
const FIRESTORE_READ_TIMEOUT_MS = 3000;

const CACHE_CONTROL = "public, max-age=300, s-maxage=600";

const APP_SCHEME_JOIN_URL = "lessismoreapp://group/join";
const APP_STORE_URL = "https://apps.apple.com/kr/app/id6751174681";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.doublejbs.useless";

const GROUP_PATH_PREFIX = "group";

const DEFAULT_TITLE = "useless 그룹 초대";
const DEFAULT_DESCRIPTION = "useless 앱에서 그룹에 참여하세요";
const CLOSED_DESCRIPTION = "초대가 마감된 그룹이에요";
const DESCRIPTION_SUFFIX = " — useless에서 함께 준비해요";
const DESCRIPTION_SEPARATOR = " · ";

// 값을 바꾸는 태그. og:image·og:type·og:site_name 은 템플릿 값을 그대로 둔다(§7).
const TITLE_META_KEYS = ["og:title", "twitter:title"];
const DESCRIPTION_META_KEYS = ["og:description", "twitter:description"];
const URL_META_KEYS = ["og:url", "twitter:url"];

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// 인스턴스 메모리 캐시. 실패 시에도 묵은 템플릿이 있으면 그걸 쓴다.
let templateCache = {text: "", fetchedAt: 0};

const readString = (value) => (typeof value === "string" ? value.trim() : "");

export const escapeHtml = (value) =>
  String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
};

// Firestore 문서 id 로 쓸 수 없는 값은 읽지 않고 기본 태그로 떨어진다.
const isValidDocumentId = (id) => {
  if (id.length === 0 || id.length > 1500) {
    return false;
  }

  if (id === "." || id === ".." || id.includes("/")) {
    return false;
  }

  return !/^__.*__$/.test(id);
};

// `/group/{id}` 에서 원본 groupId 를 꺼낸다. 쿼리·끝 슬래시는 무시한다.
// 형태가 다르면 null(잘못된 링크).
export const parseGroupId = (path) => {
  const pathOnly = String(path || "").split(/[?#]/)[0];
  const segments = pathOnly.split("/").filter((segment) => segment.length > 0);

  if (segments.length !== 2 || segments[0] !== GROUP_PATH_PREFIX) {
    return null;
  }

  const groupId = safeDecode(segments[1]);

  if (groupId === null || !isValidDocumentId(groupId)) {
    return null;
  }

  return groupId;
};

const formatDate = (value) => {
  const match = DATE_PATTERN.exec(readString(value));

  if (!match) {
    return "";
  }

  return `${match[1]}.${match[2]}.${match[3]}`;
};

// §4 와 같은 형식: `YYYY.MM.DD ~ YYYY.MM.DD`, 같은 날이면 하나.
export const formatPeriod = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end && start !== end) {
    return `${start} ~ ${end}`;
  }

  return start || end;
};

const readMemberCount = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
};

const getInviteUrl = (groupId) =>
  `${WEB_BASE_URL}/group/${encodeURIComponent(groupId)}`;

// 초대 요약(없으면 null)으로 태그 값을 만든다. 값은 이스케이프 전 원문이다.
export const buildGroupInviteMeta = (invite, groupId, requestUrl) => {
  const fallbackMeta = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: requestUrl,
  };

  if (!groupId || !invite) {
    return fallbackMeta;
  }

  const name = readString(invite.name);
  const url = getInviteUrl(groupId);

  if (invite.inviteEnabled === false) {
    return {
      title: name || DEFAULT_TITLE,
      description: CLOSED_DESCRIPTION,
      url,
    };
  }

  const memberCount = readMemberCount(invite.memberCount);
  const pieces = [
    formatPeriod(invite.startDate, invite.endDate),
    readString(invite.destinationName),
    memberCount === null ? "" : `멤버 ${memberCount}명`,
  ].filter((piece) => piece.length > 0);

  const description = pieces.length > 0 ?
    `${pieces.join(DESCRIPTION_SEPARATOR)}${DESCRIPTION_SUFFIX}` :
    DEFAULT_DESCRIPTION;

  return {
    title: name ? `${name} 그룹에 초대받았어요` : DEFAULT_TITLE,
    description,
    url,
  };
};

// `<meta property|name="{key}" content="...">` 를 새 값으로 바꾼다.
// 속성 순서·따옴표 종류와 무관하게 잡고, 원래 쓰던 속성 이름(property/name)을 유지한다.
// 태그가 없으면 </head> 앞에 넣는다.
const replaceMetaTag = (html, key, value) => {
  const keyPattern = escapeRegExp(key);
  const tagPattern = new RegExp(
      `<meta\\b[^>]*?\\b(property|name)\\s*=\\s*(["'])${keyPattern}\\2[^>]*>`,
      "gi",
  );
  const escapedValue = escapeHtml(value);
  let isReplaced = false;

  const replaced = html.replace(tagPattern, (_match, attribute) => {
    isReplaced = true;

    return `<meta ${attribute.toLowerCase()}="${key}" ` +
      `content="${escapedValue}" />`;
  });

  if (isReplaced) {
    return replaced;
  }

  return insertBeforeHeadEnd(
      replaced,
      `<meta property="${key}" content="${escapedValue}" />`,
  );
};

const insertBeforeHeadEnd = (html, tag) => {
  const headEndPattern = /<\/head\s*>/i;

  if (!headEndPattern.test(html)) {
    return `${tag}\n${html}`;
  }

  return html.replace(headEndPattern, (headEnd) => `    ${tag}\n  ${headEnd}`);
};

const replaceTitleTag = (html, title) => {
  const titlePattern = /<title\b[^>]*>[\s\S]*?<\/title\s*>/i;
  const titleTag = `<title>${escapeHtml(title)}</title>`;

  if (titlePattern.test(html)) {
    return html.replace(titlePattern, () => titleTag);
  }

  return insertBeforeHeadEnd(html, titleTag);
};

// 템플릿 HTML 의 <title>·OG·트위터 태그만 바꾼다. 본문과 스크립트는 그대로다.
export const injectMeta = (html, meta) => {
  let result = replaceTitleTag(html, meta.title);

  TITLE_META_KEYS.forEach((key) => {
    result = replaceMetaTag(result, key, meta.title);
  });

  DESCRIPTION_META_KEYS.forEach((key) => {
    result = replaceMetaTag(result, key, meta.description);
  });

  URL_META_KEYS.forEach((key) => {
    result = replaceMetaTag(result, key, meta.url);
  });

  return result;
};

// 템플릿을 못 가져왔을 때의 최소 HTML. 302 로 넘기지 않는다(루프 위험, §7).
export const buildMinimalHtml = (meta, groupId) => {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = escapeHtml(`${WEB_BASE_URL}/logo.JPG`);
  const appLink = groupId ?
    `<p><a href="${escapeHtml(
        `${APP_SCHEME_JOIN_URL}?groupId=${encodeURIComponent(groupId)}`,
    )}">useless 앱에서 열기</a></p>\n    ` :
    "";

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:site_name" content="USELESS" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${url}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description}" />
    <meta property="twitter:image" content="${image}" />
  </head>
  <body>
    <h1>${title}</h1>
    <p>${description}</p>
    ${appLink}<p>
      <a href="${escapeHtml(APP_STORE_URL)}">App Store</a> ·
      <a href="${escapeHtml(PLAY_STORE_URL)}">Google Play</a>
    </p>
  </body>
</html>
`;
};

const withTimeout = (promise, timeoutMs, label) => {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
        () => reject(new Error(`${label} timed out`)),
        timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// 템플릿을 5분 캐시한다. 가져오기에 실패하면 묵은 캐시를, 그마저 없으면 null.
const getTemplate = async () => {
  const now = Date.now();

  const isCacheFresh = templateCache.text.length > 0 &&
    now - templateCache.fetchedAt < TEMPLATE_CACHE_TTL_MS;

  if (isCacheFresh) {
    return templateCache.text;
  }

  try {
    const response = await fetch(TEMPLATE_URL, {
      signal: AbortSignal.timeout(TEMPLATE_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`template fetch failed: ${response.status}`);
    }

    const text = await response.text();

    if (!/<\/head\s*>/i.test(text)) {
      throw new Error("template has no </head>");
    }

    templateCache = {text, fetchedAt: now};

    return text;
  } catch (error) {
    logger.warn("groupInviteHtml template fetch failed", {
      error: error.message,
      hasStaleCache: templateCache.text.length > 0,
    });

    return templateCache.text || null;
  }
};

// 초대 요약을 읽는다. 문서 없음·실패는 모두 null(축소 형태, §3·§4).
const readInvite = async (groupId) => {
  if (!groupId) {
    return null;
  }

  try {
    const snapshot = await withTimeout(
        db.collection("groupInvites").doc(groupId).get(),
        FIRESTORE_READ_TIMEOUT_MS,
        "groupInvites read",
    );

    return snapshot.exists ? snapshot.data() : null;
  } catch (error) {
    logger.warn("groupInviteHtml invite read failed", {
      groupId,
      error: error.message,
    });

    return null;
  }
};

// 그룹 초대 링크(/group/{id})의 미리보기 태그를 채운 HTML(§7).
export const groupInviteHtml = onRequest({
  region: REGION,
  maxInstances: MAX_INSTANCES,
}, async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.set("Allow", "GET, HEAD");
    res.status(405).send("Method Not Allowed");

    return;
  }

  const groupId = parseGroupId(req.path);
  const requestUrl = `${WEB_BASE_URL}${req.path}`;
  const [invite, template] = await Promise.all([
    readInvite(groupId),
    getTemplate(),
  ]);
  const meta = buildGroupInviteMeta(invite, groupId, requestUrl);
  const html = template ?
    injectMeta(template, meta) :
    buildMinimalHtml(meta, groupId);

  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", CACHE_CONTROL);
  res.status(200).send(html);
});
