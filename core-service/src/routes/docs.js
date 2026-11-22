import { Router } from 'express';
import { readFileSync } from 'node:fs';

export const SPEC_URL = new URL('../../openapi.yaml', import.meta.url);

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.1';
const CSS_SRI = 'sha384-4c3vsE5f+trhFyHrFrLM1fFGUn531NIaC7dcqEWIJdoRQJ5CkJbSuSCwXLpaS1KF';
const JS_SRI = 'sha384-XFYN47VzPiDY6qPtxYKg0nqUeW/upo20xf1j2SUE7gT/i35FJB4cuS/71Iegzk8Z';

const PAGE = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JamHijau API</title>
<link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" integrity="${CSS_SRI}" crossorigin="anonymous">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${SWAGGER_UI}/swagger-ui-bundle.js" integrity="${JS_SRI}" crossorigin="anonymous"></script>
<script src="/api/docs/init.js"></script>
</body>
</html>
`;

const INIT = `window.ui = SwaggerUIBundle({ url: '/api/openapi.yaml', dom_id: '#swagger-ui', deepLinking: true });\n`;

export function docsRouter() {
  const router = Router();
  const spec = readFileSync(SPEC_URL, 'utf8');

  router.get('/api/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(spec);
  });
  router.get('/api/docs', (_req, res) => {
    res.type('html').send(PAGE);
  });
  router.get('/api/docs/init.js', (_req, res) => {
    res.type('application/javascript').send(INIT);
  });

  return router;
}
