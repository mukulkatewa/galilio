const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AdminController = require('../controllers/adminController');

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', AdminController.getStats);
router.get('/house-stats', AdminController.getHouseStats);
router.get('/users', AdminController.getUsers);
router.post('/adjust-balance', AdminController.adjustBalance);

module.exports = router;