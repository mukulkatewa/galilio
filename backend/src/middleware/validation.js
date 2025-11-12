const { validationResult } = require('express-validator');
const { body } = require('express-validator');

// Common validation rules
exports.registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain alphanumeric characters and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

exports.loginValidation = [
  // Accept either email or username for login - make both optional but validate at least one exists
  body('email').optional({ nullable: true, checkFalsy: true }),
  body('username').optional({ nullable: true, checkFalsy: true }),
  body('password').notEmpty().withMessage('Password is required'),
  // Custom validation to ensure at least one of email or username is provided
  body().custom((value) => {
    if (!value.email && !value.username) {
      throw new Error('Either email or username is required');
    }
    return true;
  })
];

// Middleware to check for validation errors
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};
