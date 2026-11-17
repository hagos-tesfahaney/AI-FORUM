import { safeExecute } from '../../../../db/config.js';
import { BadRequestError, NotFoundError } from '../../../utils/errors/index.js';

/**
 * Creates an answer for a question.
 * Ensures the question exists and the user is not answering their own question.
 *
 * @param {Object} params
 * @param {number} params.questionId
 * @param {string} params.content
 * @param {number} params.userId
 * @returns {Promise<Object>}
 */
export const createAnswerService = async ({ questionId, content, userId }) => {
  // Verify question existence and ownership
  const qSql =
    'SELECT question_id, user_id FROM questions WHERE question_id = ? LIMIT 1';
  const qRows = await safeExecute(qSql, [questionId]);

  if (!qRows || qRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const question = qRows[0];
  if (question.user_id === userId) {
    throw new BadRequestError('You cannot answer your own question');
  }

  // Insert answer
  const insertSql =
    'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)';
  const insertResult = await safeExecute(insertSql, [
    questionId,
    userId,
    content,
  ]);
  const answerId = insertResult.insertId;

  // Retrieve newly created answer with author details
  const answerSql = `
    SELECT 
      a.answer_id AS id,
      a.question_id AS questionId,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName
    FROM answers a
    INNER JOIN users u ON a.user_id = u.user_id
    WHERE a.answer_id = ?
    LIMIT 1
  `;
  const answerRows = await safeExecute(answerSql, [answerId]);
  const row = answerRows[0];

  return {
    id: row.id,
    questionId: row.questionId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.author_id,
      firstName: row.author_firstName,
      lastName: row.author_lastName,
    },
  };
};
