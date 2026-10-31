// 여행 도우미 모드 호출 gear_fill 스모크 테스트 (앱 레포 specs/Assistant.md AS-1·AS-13).
//   테스트 계정으로 로그인 → 그 계정의 테스트 배낭 2개(여행지 있음 / 없음)를 찾거나 만들고
//   → 각각 mode: "gear_fill"을 호출해 result(items·missingGroups·warehouseEmpty)를 출력한다.
//   배낭은 지우지 않는다(재사용). 호출 1회 = 사용량 1회(assistant-usage/{uid}.count) —
//   단, 이 배낭에 안 담긴 창고 장비가 0개면 서버가 모델을 부르지 않고 세지도 않는다.
//
//   실행: node scripts/assistant-gear-fill-smoke.mjs <계정 파일> [--only with|without]
//     계정 파일: 1행 이메일, 2행 비밀번호(assistant-smoke.mjs가 만든 파일).
import fs from 'node:fs';
import process from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
};
const WITH_LOCATION_NAME = '스모크 세석 1박';
const WITHOUT_LOCATION_NAME = '스모크 여행지 없음 1박';
const SESEOK_LOCATION = {
  name: '지리산 세석대피소',
  latitude: 35.3211,
  longitude: 127.7108,
  campSpotId: 'bbZHDooXcxZvKrUjdJeN',
};
const KST_OFFSET_MS = 9 * 3600 * 1000;
const DAY_MS = 86400000;

const accountFile = process.argv[2];
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex > 0 ? process.argv[onlyIndex + 1] : null;

if (!accountFile || !fs.existsSync(accountFile)) {
  console.error('사용법: node scripts/assistant-gear-fill-smoke.mjs <계정 파일> [--only with|without]');
  process.exit(1);
}

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const call = httpsCallable(getFunctions(app, 'asia-northeast3'), 'tripAssistant', { timeout: 130000 });

const todayKst = () => new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);

// 다음 주 토~일(KST). 앱처럼 KST 자정을 toISOString()으로 저장한다.
const nextWeekWeekend = () => {
  const today = todayKst();
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const toSaturday = ((6 - dow + 7) % 7 || 7) + 7;
  const sat = new Date(Date.parse(`${today}T00:00:00Z`) + toSaturday * DAY_MS).toISOString().slice(0, 10);
  const sun = new Date(Date.parse(`${sat}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  const toIso = (d) => new Date(`${d}T00:00:00+09:00`).toISOString();

  return { startDate: toIso(sat), endDate: toIso(sun), label: `${sat}~${sun}` };
};

const findOrCreateBag = async (uid, name, location) => {
  const snap = await getDocs(query(collection(db, 'bag'), where('userId', '==', uid)));
  const found = snap.docs.find((d) => d.data().name === name);

  if (found) {
    return { id: found.id, created: false };
  }

  const { startDate, endDate } = nextWeekWeekend();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, 'bag'), {
    name,
    startDate,
    endDate,
    gears: [],
    weight: 0,
    shared: false,
    userId: uid,
    createdAt: now,
    editDate: now,
    ...(location ? { location } : {}),
  });

  await setDoc(doc(db, 'users', uid), { bags: arrayUnion(ref.id) }, { merge: true });

  return { id: ref.id, created: true };
};

const runFill = async (label, bagId) => {
  const started = Date.now();

  try {
    const { data } = await call({ mode: 'gear_fill', context: { bagId }, locale: 'ko', today: todayKst() });
    const ms = Date.now() - started;
    const r = data.result;

    console.log(`\n=== ${label} (bag ${bagId}, ${ms}ms, ${data.provider}/${data.model}) ===`);
    console.log(`refused=${data.refused} remaining=${data.remaining}`);

    if (!r) {
      return;
    }

    console.log(`headline: ${r.headline}`);
    console.log(`trip: ${JSON.stringify(r.trip)}`);
    console.log(`warehouseEmpty=${r.warehouseEmpty} missingGroups=${JSON.stringify(r.missingGroups)}`);
    console.log(`items ${r.items.length}개 (essential ${r.items.filter((i) => i.priority === 'essential').length}, recommended ${r.items.filter((i) => i.priority === 'recommended').length}, 창고 밖 ${r.items.filter((i) => i.source !== 'warehouse').length}):`);

    for (const i of r.items) {
      console.log(`  · [${i.priority}] ${i.name} / ${i.brand} / ${i.weightG}g / ${i.group} / ${i.source} — ${i.reason}`);
    }

    console.log(`notes: ${JSON.stringify(r.notes)}`);
  } catch (e) {
    console.log(`\n=== ${label} 실패 (${Date.now() - started}ms): ${e.code} ${e.message} ${e.details ? JSON.stringify(e.details) : ''}`);
  }
};

const main = async () => {
  const [email, password] = fs.readFileSync(accountFile, 'utf8').trim().split('\n');
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const targets = [
    ['with', '여행지 있음', WITH_LOCATION_NAME, SESEOK_LOCATION],
    ['without', '여행지 없음', WITHOUT_LOCATION_NAME, null],
  ].filter(([key]) => !only || key === only);

  console.log(`다음 주 주말: ${nextWeekWeekend().label}`);

  for (const [, label, name, location] of targets) {
    const bag = await findOrCreateBag(user.uid, name, location);

    console.log(`배낭 ${bag.created ? '생성' : '재사용'}: ${name} → ${bag.id}`);
    await runFill(label, bag.id);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error('\n오류:', e.code ?? '', e.message);
  process.exit(1);
});
