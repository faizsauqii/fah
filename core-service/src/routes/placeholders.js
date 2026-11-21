import { Router } from 'express';
import { errors } from '../errors.js';

// Endpoint yang sudah ada di kontrak tapi belum dibuat. Menjawab 501 dengan
// format error bersama, supaya Anggota S sudah bisa menguji routing Nginx
// (/api/* -> core-service) sebelum logikanya selesai.
// Hapus baris yang bersangkutan setiap kali endpoint aslinya selesai.
export function placeholderRouter() {
  const router = Router();
  const notYet = (_req, _res, next) => next(errors.notImplemented());

  router.get('/api/risk', notYet);
  router.get('/api/profiles', notYet);

  router.get('/api/me/health-profile', notYet);
  router.put('/api/me/health-profile', notYet);

  router.get('/api/me/locations', notYet);
  router.post('/api/me/locations', notYet);
  router.put('/api/me/locations/:id', notYet);
  router.delete('/api/me/locations/:id', notYet);

  router.get('/api/me/plans', notYet);
  router.post('/api/me/plans', notYet);
  router.delete('/api/me/plans/:id', notYet);
  router.get('/api/me/plans/:id/recommendation', notYet);

  return router;
}
