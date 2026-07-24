const { AppError } = require('../utils/errors');
const { getFriendlyErrorMessage, normalizeErrorDetails } = require('../utils/error-messages');
const { ZodError } = require('zod');

function errorMiddleware(error, req, res, next) {
  if (error instanceof ZodError) {
    const code = 'VALIDATION_ERROR';
    const message = getFriendlyErrorMessage(code);

    return res.status(422).json({
      success: false,
      code,
      message,
      error: {
        code,
        message,
        details: normalizeErrorDetails(error.issues)
      }
    });
  }

  if (error instanceof AppError) {
    const message = getFriendlyErrorMessage(error.code, error.message);

    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message,
      error: {
        code: error.code,
        message,
        details: error.details
      }
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: getFriendlyErrorMessage('INTERNAL_SERVER_ERROR'),
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: getFriendlyErrorMessage('INTERNAL_SERVER_ERROR')
    }
  });
}

module.exports = errorMiddleware;
