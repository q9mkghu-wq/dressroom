// 저장소(Redis) 연결
// 1) Upstash REST 방식: KV_REST_API_URL + KV_REST_API_TOKEN (또는 UPSTASH_REDIS_REST_URL/TOKEN) → fetch로 바로 호출
// 2) 일반 Redis 주소: REDIS_URL (Vercel의 Redis Cloud 연결 등) → redis 패키지로 접속
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;

export const hasDb = () => Boolean((REST_URL && REST_TOKEN) || REDIS_URL);

// 서버리스 함수가 살아 있는 동안 연결을 다시 씁니다
let clientPromise = null;
async function tcpClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import('redis');
      const c = createClient({ url: REDIS_URL, socket: { connectTimeout: 8000, reconnectStrategy: n => (n > 3 ? false : 200) } });
      c.on('error', err => console.error('Redis 연결 오류', err.message));
      await c.connect();
      return c;
    })().catch(e => { clientPromise = null; throw e; });
  }
  return clientPromise;
}

export async function cmd(...args) {
  if (!hasDb()) { const e = new Error('저장소(Redis)가 연결되지 않았어요.'); e.code = 'DB_NOT_CONFIGURED'; throw e; }
  if (REST_URL && REST_TOKEN) {
    const r = await fetch(REST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || `Redis 오류 (${r.status})`);
    return j.result;
  }
  const c = await tcpClient();
  return c.sendCommand(args.map(String));
}

export async function getJSON(key) {
  const v = await cmd('GET', key);
  return v ? JSON.parse(v) : null;
}
export const setJSON = (key, value) => cmd('SET', key, JSON.stringify(value));
