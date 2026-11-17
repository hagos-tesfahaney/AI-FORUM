import { apiClient } from '../core/api.client.js';

/**
 * Creates a new question and triggers background embedding.
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 * @returns {Promise<Object>}
 */
export async function createQuestion({ title, content }) {
  const response = await apiClient.post('/api/questions', { title, content });
  return response.data;
}

/**
 * Lists questions with optional keyword filter and "mine" author filter.
 *
 * @param {Object} [params]
 * @param {string} [params.search]
 * @param {boolean} [params.mine]
 * @returns {Promise<Object>}
 */
export async function getQuestions(params = {}) {
  const queryParams = {};
  if (params.search) queryParams.search = params.search;
  if (params.mine) queryParams.mine = true;

  const response = await apiClient.get('/api/questions', { params: queryParams });
  return response.data;
}

/**
 * Retrieves a single question along with all its answers.
 *
 * @param {string} questionHash
 * @returns {Promise<Object>}
 */
export async function getSingleQuestion(questionHash) {
  const response = await apiClient.get(`/api/questions/${questionHash}`);
  return response.data;
}

/**
 * Semantically searches questions using vector cosine similarity.
 *
 * @param {string} query
 * @param {number} [k]
 * @param {number} [threshold]
 * @returns {Promise<Object>}
 */
export async function searchQuestionsSemantic(query, k, threshold) {
  const params = { query };
  if (k) params.k = k;
  if (threshold !== undefined) params.threshold = threshold;

  const response = await apiClient.get('/api/questions/search', { params });
  return response.data;
}

/**
 * Finds similar questions based on question vector.
 *
 * @param {string} questionHash
 * @param {number} [k]
 * @param {number} [threshold]
 * @returns {Promise<Object>}
 */
export async function getSimilarQuestions(questionHash, k, threshold) {
  const params = {};
  if (k) params.k = k;
  if (threshold !== undefined) params.threshold = threshold;

  const response = await apiClient.get(
    `/api/questions/${questionHash}/similar`,
    { params },
  );
  return response.data;
}

/**
 * Requests AI Draft Coach feedback and tips for a question draft.
 *
 * @param {Object} data
 * @param {string} [data.title]
 * @param {string} data.content
 * @returns {Promise<Object>}
 */
export async function generateQuestionDraftCoach({ title, content }) {
  const response = await apiClient.post('/api/questions/draft-coach', {
    title,
    content,
  });
  return response.data;
}

/**
 * Requests AI Answer Fit assessment against a specific question.
 *
 * @param {string} questionHash
 * @param {string} answerText
 * @returns {Promise<Object>}
 */
export async function assessAnswerFit(questionHash, answerText) {
  const response = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    { answerText },
  );
  return response.data;
}
