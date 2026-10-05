// Upstash Redis REST 클라이언트 (외부 패키지 없이 fetch 사용)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasDb = () => Boolean(URL_ && TOKEN);

export async function cmd(...args) {
  if (!hasDb()) { const e = new Error('저장소(Upstash Redis)가 연결되지 않았어요.'); e.code = 'DB_NOT_CONFIGURED'; throw e; }
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Redis 오류 (${r.status})`);
  return j.result;
}

export async function getJSON(key) {
  const v = await cmd('GET', key);
  return v ? JSON.parse(v) : null;
}
export const setJSON = (key, value) => cmd('SET', key, JSON.stringify(value));
