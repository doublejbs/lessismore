// Standalone push server — crawl.js와 별개로 독립 실행.
// 한 번 띄워두면 크롤 종료 후에도 계속 살아있음.
// Usage: node .claude/skills/crawl-gear/server.js
import { createServer } from 'node:http';
import { bulkUpsert } from './push-firestore.js';

const PORT = 3847;

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/push') {
    res.writeHead(404); res.end('Not found'); return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { gears } = JSON.parse(body);
      console.log(`\n[push] ${gears.length}개 → gear`);
      const result = await bulkUpsert(gears);
      console.log(`[push] done: inserted=${result.inserted} updated=${result.updated} failed=${result.failed.length}`);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error(`[push] error: ${e.message}`);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`포트 ${PORT} 이미 사용 중입니다. 기존 서버가 실행 중인지 확인하세요.`);
  } else {
    console.error(e.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[push 서버] http://127.0.0.1:${PORT} 대기 중 (Ctrl+C로 종료)`);
});
