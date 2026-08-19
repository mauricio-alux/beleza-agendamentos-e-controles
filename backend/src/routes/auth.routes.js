const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const authController = require('../modules/auth/auth.controller');

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/recover-password', asyncHandler(authController.recoverPassword));
router.post('/reset-password', asyncHandler(authController.resetPassword));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authMiddleware, asyncHandler(authController.logout));
router.get('/me', authMiddleware, asyncHandler(authController.me));

module.exports = router;
