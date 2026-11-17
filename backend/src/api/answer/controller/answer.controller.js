import { StatusCodes } from 'http-status-codes';
import { createAnswerService } from '../service/answer.service.js';

/**
 * Handles posting a new answer.
 */
export const createAnswerController = async (req, res, next) => {
  try {
    const { questionId, content } = req.body;
    const userId = req.user.id;

    const data = await createAnswerService({
      questionId,
      content,
      userId,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Answer posted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};
