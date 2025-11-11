const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const KenoController = require('../controllers/kenoController');
const LimboController = require('../controllers/limboController');
const CrashController = require('../controllers/crashController');
const DragonTowerController = require('../controllers/dragonTowerController');
const DiceController = require('../controllers/diceController');
const { validate } = require('../middleware/validation');
const {
  diceValidation,
  kenoValidation,
  crashValidation,
  limboValidation,
  dragonTowerInitValidation,
  dragonTowerPlayValidation
} = require('../middleware/gameValidations');

// Create an instance of DragonTowerController
const dragonTowerController = new DragonTowerController();

// All game routes require authentication
router.use(authMiddleware);

// Game routes with validation
router.post('/keno', kenoValidation, validate, KenoController.playKeno);
router.post('/limbo', limboValidation, validate, LimboController.playLimbo);

// Crash game routes (multiplayer)
router.get('/crash/current', CrashController.getCurrentGame);
router.post('/crash/bet', crashValidation, validate, CrashController.placeBet);
router.post('/crash/cashout', CrashController.cashOut);
router.post('/dragon-tower/init', dragonTowerInitValidation, validate, dragonTowerController.initGame);
router.post('/dragon-tower', dragonTowerPlayValidation, validate, dragonTowerController.playDragonTower);
router.post('/dice', diceValidation, validate, DiceController.playDice);

module.exports = router;