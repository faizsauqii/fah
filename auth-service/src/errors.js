// Format error bersama (docs/KESEPAKATAN-TEKNIS.md bagian 4):
// { "error": { "code": "...", "message": "...", "details": [...] } }

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  validation: (message, details) => new AppError(400, 'VALIDATION_ERROR', message, details),
  unauthenticated: (message = 'Perlu login.') => new AppError(401, 'UNAUTHENTICATED', message),
  invalidToken: (message = 'Token tidak valid atau sudah kedaluwarsa.') => new AppError(401, 'INVALID_TOKEN', message),
  invalidInternalToken: (message = 'Header X-Internal-Token tidak ada atau salah.') =>
    new AppError(401, 'INVALID_INTERNAL_TOKEN', message),
  forbidden: (message = 'Tidak punya akses ke sumber daya ini.') => new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Data tidak ditemukan.') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message) => new AppError(409, 'CONFLICT', message),
};

export function notFoundHandler(req, _res, next) {
  next(errors.notFound(`Path ${req.method} ${req.path} tidak ada.`));
}

// Express 5 meneruskan error dari handler async ke sini secara otomatis.
export function errorHandler(err, _req, res, _next) {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body JSON tidak valid.' } });
  }
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.status).json(body);
  }
  console.error('[auth-service] error tak terduga:', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan di server.' } });
}
