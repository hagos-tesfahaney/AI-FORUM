import { body } from 'express-validator';

/**
 * Validation schema for creating an answer to a question.
 */
export const createAnswerValidation = [
  body('questionId')
    .notEmpty()
    .withMessage('questionId is required')
    .isInt({ min: 1 })
    .withMessage('questionId must be a positive integer')
    .toInt(),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 20 })
    .withMessage('Content must be at least 20 characters'),
];
