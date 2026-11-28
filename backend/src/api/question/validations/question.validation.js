import { body, param, query } from 'express-validator';

/**
 * Validation schema for creating a new question.
 */
export const createQuestionValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters'),
];

/**
 * Validation schema for listing questions.
 */
export const getQuestionsValidation = [
  query('search')
    .optional()
    .isString()
    .trim()
    .withMessage('Search query must be a string'),
  query('mine')
    .optional()
    .customSanitizer(value => value === true || value === 'true' || value === '1'),
];

/**
 * Validation schema for retrieving a single question.
 */
export const getSingleQuestionValidation = [
  param('questionHash')
    .trim()
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a valid 16-character hex string'),
];

/**
 * Validation schema for semantic search on questions.
 */
export const searchQuestionsValidation = [
  query('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 3 })
    .withMessage('Query must be at least 3 characters'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a float between 0 and 1')
    .toFloat(),
];

/**
 * Validation schema for similar questions recommendation.
 */
export const getSimilarQuestionsValidation = [
  param('questionHash')
    .trim()
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a valid 16-character hex string'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a float between 0 and 1')
    .toFloat(),
];

/**
 * Validation schema for AI Question Draft Coach.
 */
export const generateQuestionDraftCoachValidation = [
  body('title')
    .optional()
    .isString()
    .trim(),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 5 })
    .withMessage('Content must be at least 5 characters for coaching'),
];

/**
 * Validation schema for AI Answer Fit Assessment.
 */
export const assessAnswerFitValidation = [
  param('questionHash')
    .trim()
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a valid 16-character hex string'),
  body('answerText')
    .trim()
    .notEmpty()
    .withMessage('answerText is required')
    .isLength({ min: 20 })
    .withMessage('answerText must be at least 20 characters'),
];
