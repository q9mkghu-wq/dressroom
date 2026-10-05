import { send } from './_lib/http.js';
import { hasDb } from './_lib/redis.js';

export default function handler(req, res) {
  send(res, 200, { tossClientKey: process.env.TOSS_CLIENT_KEY || null, dbReady: hasDb() });
}
