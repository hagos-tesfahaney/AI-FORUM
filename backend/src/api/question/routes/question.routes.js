import express from 'express';
import { authenticateUser } from '../../../middleware/authentication.js';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';
import {
  createQuestionController,
  getQuestionsController,
  getSingleQuestionController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
  generateQuestionDraftCoachController,
  assessAnswerAgainstQuestionController,
} from '../controller/question.controller.js';
import {
  createQuestionValidation,
  getQuestionsValidation,
  getSingleQuestionValidation,
  searchQuestionsValidation,
  getSimilarQuestionsValidation,
  generateQuestionDraftCoachValidation,
  assessAnswerFitValidation,
} from '../validations/question.validation.js';

const router = express.Router();

/**
 * All question routes require authentication.
 */
router.use(authenticateUser);

/**
 * @route POST /api/questions/draft-coach
 * @desc Get AI feedback and suggestions on a draft question
 * @access Protected
 */
router.post(
  '/draft-coach',
  generateQuestionDraftCoachValidation,
  validationErrorHandler,
  generateQuestionDraftCoachController,
);

/**
 * @route GET /api/questions/search
 * @desc Search questions semantically via AI vector similarity
 * @access Protected
 */
router.get(
  '/search',
  searchQuestionsValidation,
  validationErrorHandler,
  searchQuestionsSemanticController,
);

/**
 * @route POST /api/questions
 * @desc Create a new question and auto-generate vector embedding
 * @access Protected
 */
router.post(
  '/',
  createQuestionValidation,
  validationErrorHandler,
  createQuestionController,
);

/**
 * @route GET /api/questions
 * @desc List questions with optional keyword and author filters
 * @access Protected
 */
router.get(
  '/',
  getQuestionsValidation,
  validationErrorHandler,
  getQuestionsController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Find similar questions based on question vector embedding
 * @access Protected
 */
router.get(
  '/:questionHash/similar',
  getSimilarQuestionsValidation,
  validationErrorHandler,
  getSimilarQuestionsController,
);

/**
 * @route POST /api/questions/:questionHash/answer-fit
 * @desc Evaluate how well a proposed answer fits the question
 * @access Protected
 */
router.post(
  '/:questionHash/answer-fit',
  assessAnswerFitValidation,
  validationErrorHandler,
  assessAnswerAgainstQuestionController,
);

/**
 * @route GET /api/questions/:questionHash
 * @desc Get single question details with all associated answers
 * @access Protected
 */
router.get(
  '/:questionHash',
  getSingleQuestionValidation,
  validationErrorHandler,
  getSingleQuestionController,
);

export default router;
