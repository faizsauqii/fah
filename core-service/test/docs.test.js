import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import { parse } from 'yaml';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { SPEC_URL } from '../src/routes/docs.js';

const JWT = { secret: 's'.repeat(32), issuer: 'jamhijau-auth', audience: 'jamhijau' };
const spec = parse(readFileSync(SPEC_URL, 'utf8'));
const METHODS = ['get', 'post', 'put', 'delete', 'patch'];

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({
    config: { nodeEnv: 'test', jwt: JWT },
    db,
    openMeteo: {
      async getHourlyConditions() {
        return { timezone: 'Asia/Jakarta', utcOffsetSeconds: 25200, hours: [] };
      },
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

function collectRefs(node, refs = []) {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, refs));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref') refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
}

test('spesifikasi OpenAPI 3.0.3 dengan server publik fah.stei.site', () => {
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.servers[0].url, 'https://fah.stei.site/api');
  assert.ok(spec.components.securitySchemes.BearerAuth);
  assert.equal(spec.components.securitySchemes.ApiKeyAuth.name, 'X-API-Key');
});

test('semua $ref mengarah ke komponen yang ada', () => {
  for (const ref of collectRefs(spec)) {
    const target = ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((node, key) => node?.[key], spec);
    assert.ok(target, `${ref} tidak ditemukan`);
  }
});

test('setiap operasi punya summary, tag, dan respons', () => {
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS.filter((m) => item[m])) {
      const op = item[method];
      assert.ok(op.summary, `${method} ${path} tanpa summary`);
      assert.ok(op.tags?.length, `${method} ${path} tanpa tag`);
      assert.ok(Object.keys(op.responses ?? {}).length, `${method} ${path} tanpa respons`);
    }
  }
});

test('setiap endpoint core-service yang terdokumentasi benar-benar ada di server', async () => {
  const token = jwt.sign({ role: 'user' }, JWT.secret, {
    algorithm: 'HS256',
    subject: '11111111-1111-4111-8111-111111111111',
    issuer: JWT.issuer,
    audience: JWT.audience,
    expiresIn: 600,
  });
  const corePaths = Object.keys(spec.paths).filter((p) => !p.startsWith('/auth') && p !== '/health');
  assert.ok(corePaths.length >= 8);
  for (const path of corePaths) {
    for (const method of METHODS.filter((m) => spec.paths[path][m])) {
      const url = `${baseUrl}/api${path.replace('{id}', '00000000-0000-4000-8000-000000000000')}`;
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: ['post', 'put'].includes(method) ? '{}' : undefined,
      });
      const text = await res.text();
      assert.doesNotMatch(text, /tidak ada\.?"/, `${method.toUpperCase()} ${path} tidak diimplementasikan`);
    }
  }
});

test('GET /api/openapi.yaml menyajikan spesifikasi', async () => {
  const res = await fetch(`${baseUrl}/api/openapi.yaml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /yaml/);
  assert.equal(parse(await res.text()).info.title, spec.info.title);
});

test('GET /api/docs menyajikan Swagger UI dengan SRI', async () => {
  const res = await fetch(`${baseUrl}/api/docs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /swagger-ui-dist@5\.34\.1\/swagger-ui-bundle\.js" integrity="sha384-/);
  assert.match(html, /\/api\/docs\/init\.js/);
  const init = await fetch(`${baseUrl}/api/docs/init.js`);
  assert.match(await init.text(), /\/api\/openapi\.yaml/);
});

test('dokumentasi tetap bisa dibuka walau header Authorization rusak', async () => {
  const res = await fetch(`${baseUrl}/api/docs`, { headers: { authorization: 'Bearer rusak' } });
  assert.equal(res.status, 200);
});
