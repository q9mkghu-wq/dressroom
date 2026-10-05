import crypto from 'node:crypto';

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = String(req.headers['x-admin-password'] || '');
  if (!expected || expected.length < 8) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function fail(res, err) {
  if (err && err.code === 'DB_NOT_CONFIGURED') return send(res, 503, { error: err.message, code: err.code });
  console.error(err);
  return send(res, 500, { error: '서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' });
}

export const tossAuth = () => 'Basic ' + Buffer.from((process.env.TOSS_SECRET_KEY || '') + ':').toString('base64');
