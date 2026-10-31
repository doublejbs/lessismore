// 여행 도우미 callable(tripAssistant) 스모크 테스트 (앱 레포 specs/Assistant.md AS-1).
//   클라이언트 SDK로 테스트 계정에 로그인해 배포된 함수를 3턴 대본으로 부른다.
//   create_trip 제안이 오면 실제로 만들지 않고 skipped 결과를 보내 응답이 이어지는지만 본다.
//   (서버는 Firestore에 사용량 카운터 assistant-usage/{uid}만 쓴다.)
//
//   실행: node scripts/assistant-smoke.mjs <계정 파일> [--confirm]
//     --confirm: 3턴에서 create_trip이 안 오면 4턴째 확인 발화를 한 번 더 보낸다(발화 1회 추가 소모).
//     계정 파일: 1행 이메일, 2행 비밀번호. 파일이 없으면 난수 비밀번호로 계정을 만들고 저장한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import process from 'node:process';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
};
const EMAIL = 'assistant.smoke@magmacorp.kr';
const SCRIPT = [
  '다음 주말 1박으로 지리산 가려고. 코스 알려줘',
  '두 번째 코스로 할게. 박지는 어디가 좋아?',
  '좋아, 장비까지 챙겨서 여행 만들어줘',
];
// 모델이 3턴에서 create_trip 대신 확인을 물으면 한 번 더 확인해 쓰기 경로를 확인한다.
const CONFIRM_TEXT = '응, 그대로 만들어줘';
const RETRY_WAIT_MS = 30000;
const MAX_RETRIES = 2;

const accountFile = process.argv[2];
const CONFIRM = process.argv.includes('--confirm');

if (!accountFile) {
  console.error('사용법: node scripts/assistant-smoke.mjs <계정 파일>');
  process.exit(1);
}

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const call = httpsCallable(getFunctions(app, 'asia-northeast3'), 'tripAssistant', { timeout: 130000 });

const signIn = async () => {
  if (fs.existsSync(accountFile)) {
    const [email, password] = fs.readFileSync(accountFile, 'utf8').trim().split('\n');
    await signInWithEmailAndPassword(auth, email, password);

    return;
  }

  const password = crypto.randomBytes(18).toString('base64url');
  await createUserWithEmailAndPassword(auth, EMAIL, password);
  fs.writeFileSync(accountFile, `${EMAIL}\n${password}\n`, { mode: 0o600 });
  console.log(`테스트 계정 생성 → ${accountFile}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const callWithRetry = async (payload) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const started = Date.now();
      const { data } = await call(payload);

      return { data, ms: Date.now() - started };
    } catch (e) {
      if (e.code === 'functions/unavailable' && attempt < MAX_RETRIES) {
        console.log(`  (unavailable — ${RETRY_WAIT_MS / 1000}초 뒤 재시도 ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(RETRY_WAIT_MS);
        continue;
      }

      throw e;
    }
  }
};

const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const main = async () => {
  await signIn();

  const history = [];
  let provider;
  const base = { locale: 'ko', today: todayKst(), context: {} };

  const send = async (label, extra) => {
    const { data, ms } = await callWithRetry({ ...base, ...(provider ? { provider } : {}), history, ...extra });

    provider = data.provider;
    history.push(...data.appended);
    console.log(`\n=== ${label} (${ms}ms, ${data.provider}/${data.model}) ===`);
    console.log(data.text);
    console.log(`-- stopReason=${data.stopReason} remaining=${data.remaining} appended=${data.appended.length} history=${history.length}`);

    for (const a of data.pendingActions) {
      console.log(`-- pendingAction ${a.name} id=${a.id}`);
      console.log(JSON.stringify(a.input, null, 1));
    }

    return data;
  };

  let sawCreateTrip = false;
  const script = [...SCRIPT];

  for (let i = 0; i < script.length; i += 1) {
    const text = script[i];
    console.log(`\n>>> 사용자 ${i + 1}: ${text}`);
    let data = await send(`턴 ${i + 1}`, { userText: text });

    if (i === 0) {
      console.log(`-- 첫 메시지 접두 블록: ${JSON.stringify(history[0]).slice(0, 260)}`);
    }

    // 쓰기 제안은 적용하지 않고 건너뜀 결과로 이어 보낸다(실제 여행을 만들지 않음).
    while (data.pendingActions.length > 0) {
      sawCreateTrip ||= data.pendingActions.some((a) => a.name === 'create_trip');
      const toolResults = data.pendingActions.map((a) => ({
        id: a.id,
        name: a.name,
        content: { status: 'skipped', reason: '스모크 테스트' },
        isError: false,
      }));
      console.log(`\n>>> toolResults: ${toolResults.map((r) => `${r.name}=skipped`).join(', ')}`);
      data = await send(`턴 ${i + 1} 이어 보내기`, { toolResults });
    }

    if (CONFIRM && i === script.length - 1 && !sawCreateTrip && script.length === SCRIPT.length) {
      script.push(CONFIRM_TEXT);
    }
  }

  console.log(`\n기록 크기: ${Buffer.byteLength(JSON.stringify(history))}B, 메시지 ${history.length}개`);
  process.exit(0);
};

main().catch((e) => {
  console.error('\n오류:', e.code ?? '', e.message, e.details ? JSON.stringify(e.details) : '');
  process.exit(1);
});
