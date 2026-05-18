class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function notFound(message = 'Resource not found') {
  return new AppError(message, 404, 'NOT_FOUND');
}

function unauthorized(message = 'Unauthorized') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

function forbidden(message = 'Forbidden') {
  return new AppError(message, 403, 'FORBIDDEN');
}

module.exports = {
  AppError,
  notFound,
  unauthorized,
  forbidden
};
