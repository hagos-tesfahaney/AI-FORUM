import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';
import { createAnswerController } from '../controller/answer.controller.js';
import { createAnswerValidation } from '../validations/answer.validation.js';

const router = express.Router();

/**
 * All answer routes require authentication.
 */
router.use(authenticateUser);

/**
 * @route POST /api/answers
 * @desc Create a new answer to a question
 * @access Protected
 */
router.post(
  '/',
  createAnswerValidation,
  validationErrorHandler,
  createAnswerController,
);

export default router;
