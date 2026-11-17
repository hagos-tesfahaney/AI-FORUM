import { StatusCodes } from 'http-status-codes';
import {
  createQuestionWithVectorService,
  getQuestionsService,
  getSingleQuestionService,
  searchQuestionsSemanticService,
  getSimilarQuestionsService,
} from '../service/question.service.js';
import {
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
} from '../service/geminiTextCoach.service.js';

/**
 * Handles question creation.
 */
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const data = await createQuestionWithVectorService({
      title,
      content,
      userId,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Question posted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles listing questions with optional filters.
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;
    const userId = req.user?.id;

    const result = await getQuestionsService({
      search,
      mine,
      userId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Questions fetched successfully.',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieving a single question and its answers.
 */
export const getSingleQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    const result = await getSingleQuestionService(questionHash);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question fetched successfully',
      question: result.question,
      answers: result.answers,
      answersMeta: result.answersMeta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles semantic search for questions.
 */
export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const { query, k, threshold } = req.query;

    const result = await searchQuestionsSemanticService({
      query,
      k,
      threshold,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Semantic search completed successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles finding similar questions based on vector similarity.
 */
export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { k, threshold } = req.query;

    const result = await getSimilarQuestionsService({
      questionHash,
      k,
      threshold,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Similar questions fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles AI Question Draft Coach suggestions.
 */
export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const result = await generateQuestionDraftCoachService({
      title,
      content,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Draft suggestions generated',
      data: {
        tips: result.tips,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles AI Answer Fit evaluation against a specific question.
 */
export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const result = await assessAnswerAgainstQuestionService({
      questionHash,
      answerText,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer fit assessed',
      data: {
        level: result.level,
        note: result.note,
      },
    });
  } catch (error) {
    next(error);
  }
};
