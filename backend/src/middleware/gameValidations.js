const { body } = require('express-validator');

const diceValidation = [
  body('betAmount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Bet amount must be between 0.01 and 10,000'),
  body('target')
    .isFloat({ min: 1.01, max: 99.99 })
    .withMessage('Target must be between 1.01 and 99.99'),
  body('rollOver')
    .isBoolean()
    .withMessage('rollOver must be a boolean')
];

const kenoValidation = [
  body('betAmount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Bet amount must be between 0.01 and 10,000'),
  body('pickedNumbers')
    .isArray({ min: 1, max: 10 })
    .withMessage('You must pick between 1 and 10 numbers')
    .custom((value) => {
      if (new Set(value).size !== value.length) {
        throw new Error('Cannot pick duplicate numbers');
      }
      if (!value.every(n => Number.isInteger(n) && n >= 1 && n <= 80)) {
        throw new Error('Numbers must be between 1 and 80');
      }
      return true;
    })
];

const crashValidation = [
  body('betAmount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Bet amount must be between 0.01 and 10,000'),
  body('cashOutAt')
    .optional()
    .isFloat({ min: 1.01 })
    .withMessage('Cash out point must be at least 1.01x')
];

const dragonTowerInitValidation = [
  body('betAmount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Bet amount must be between 0.01 and 10,000')
];

const limboValidation = [
  body('betAmount')
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Bet amount must be between 0.01 and 10,000'),
  body('targetMultiplier')
    .isFloat({ min: 1.01 })
    .withMessage('Target multiplier must be at least 1.01x')
];

const dragonTowerPlayValidation = [
  body('gameId')
    .notEmpty()
    .withMessage('Game ID is required')
    .matches(/^dt_\d+$/)
    .withMessage('Invalid game ID format'),
  body('tile')
    .isInt({ min: 1, max: 4 })
    .withMessage('Tile must be a number between 1 and 4')
];

module.exports = {
  diceValidation,
  kenoValidation,
  crashValidation,
  limboValidation,
  dragonTowerInitValidation,
  dragonTowerPlayValidation
};
