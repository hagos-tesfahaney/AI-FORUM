import { apiClient } from '../core/api.client.js';

/**
 * Posts an answer to a question.
 *
 * @param {number|Object} questionIdOrPayload - The ID of the question or payload object
 * @param {string} [content] - The text content of the answer
 * @returns {Promise<Object>}
 */
export async function postAnswer(questionIdOrPayload, content) {
  let payload;
  if (typeof questionIdOrPayload === 'object' && questionIdOrPayload !== null) {
    payload = questionIdOrPayload;
  } else {
    payload = { questionId: questionIdOrPayload, content };
  }

  const response = await apiClient.post('/api/answers', payload);
  return response.data;
}

export const createAnswer = postAnswer;
