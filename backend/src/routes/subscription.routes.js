const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const subscriptionController = require('../modules/subscription/subscription.controller');

const router = Router();

router.get('/current', authMiddleware, asyncHandler(subscriptionController.current));
router.post('/validate', authMiddleware, asyncHandler(subscriptionController.validate));

module.exports = router;
