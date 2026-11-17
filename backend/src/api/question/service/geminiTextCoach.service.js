import { safeExecute } from '../../../../db/config.js';
import { NotFoundError } from '../../../utils/errors/index.js';
import { generateTextContent } from '../../../services/gemini.service.js';

/**
 * Fallback heuristic coach tips generator when AI service is unavailable.
 *
 * @param {string} title
 * @param {string} content
 * @returns {string[]} Array of actionable tips
 */
const getHeuristicDraftTips = (title = '', content = '') => {
  const tips = [];
  const text = `${title} ${content}`.toLowerCase();

  const hasCode = content.includes('```') || content.includes('`');
  if (!hasCode) {
    tips.push('Add a minimal reproducible code snippet inside fenced markdown blocks (```).');
  }

  const hasError =
    text.includes('error') ||
    text.includes('exception') ||
    text.includes('failed') ||
    text.includes('trace');
  if (!hasError && !text.includes('how to')) {
    tips.push('If encountering a bug, include the exact error message or terminal/console stack trace.');
  }

  if (!title || title.trim().length < 15) {
    tips.push('Make the title more descriptive, stating the specific symptom and technology involved.');
  }

  if (content.trim().length < 60) {
    tips.push('Describe the steps you took to reproduce the issue and what solutions you have already tried.');
  }

  if (
    !text.includes('expected') &&
    !text.includes('actual') &&
    !text.includes('instead')
  ) {
    tips.push('Clearly contrast what you expected to happen versus what actually happened.');
  }

  if (tips.length === 0) {
    tips.push('Your draft looks clear and well-structured! Ensure all sensitive tokens or credentials are removed before posting.');
  }

  return tips;
};

/**
 * Generates coaching tips for a question draft.
 *
 * @param {Object} params
 * @param {string} [params.title] - Draft question title
 * @param {string} params.content - Draft question body
 * @returns {Promise<{ tips: string[] }>}
 */
export const generateQuestionDraftCoachService = async ({ title = '', content }) => {
  const prompt = `You are an expert programming forum coach for a cohort-based software engineering forum.
Evaluate this user's question draft and provide 2 to 4 concise, actionable, and constructive bullet tips to make it easy for mentors and peers to reproduce and answer.
If code or error details are missing, suggest including them.

Draft Title: "${title || 'Untitled'}"
Draft Content:
"""
${content}
"""

Respond ONLY with valid JSON in this exact structure, with no markdown code blocks and no surrounding commentary:
{"tips": ["tip 1", "tip 2", "tip 3"]}`;

  try {
    const rawResponse = await generateTextContent(prompt);
    // Strip possible markdown fences
    const cleaned = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.tips) && parsed.tips.length > 0) {
      return { tips: parsed.tips };
    }
    return { tips: getHeuristicDraftTips(title, content) };
  } catch (error) {
    // Graceful fallback to heuristic tips
    return { tips: getHeuristicDraftTips(title, content) };
  }
};

/**
 * Fallback heuristic answer fit evaluator when AI service is unavailable.
 *
 * @param {string} questionTitle
 * @param {string} questionContent
 * @param {string} answerText
 * @returns {{ level: 'strong' | 'partial' | 'weak', note: string }}
 */
const getHeuristicAnswerFit = (questionTitle, questionContent, answerText) => {
  const qTokens = `${questionTitle} ${questionContent}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const aTokens = answerText
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const qSet = new Set(qTokens);
  const commonWords = aTokens.filter(t => qSet.has(t));
  const hasCode = answerText.includes('```') || answerText.includes('`');

  if (answerText.trim().length >= 120 && commonWords.length >= 3) {
    return {
      level: 'strong',
      note: 'Your answer is thorough, directly uses key terms from the question, and provides substantial context.',
    };
  }

  if (answerText.trim().length >= 40 && (commonWords.length >= 1 || hasCode)) {
    return {
      level: 'partial',
      note: 'Your answer is relevant, but consider adding further code examples or explaining why this solution works.',
    };
  }

  return {
    level: 'weak',
    note: 'The answer appears brief or tangential. Try directly addressing the problem described in the question.',
  };
};

/**
 * Assesses whether a proposed answer fits the question it is answering.
 *
 * @param {Object} params
 * @param {string} params.questionHash - The 16-hex question hash
 * @param {string} params.answerText - The proposed answer body
 * @returns {Promise<{ level: 'strong' | 'partial' | 'weak', note: string }>}
 */
export const assessAnswerAgainstQuestionService = async ({
  questionHash,
  answerText,
}) => {
  const sql =
    'SELECT question_id, title, content FROM questions WHERE question_hash = ? LIMIT 1';
  const rows = await safeExecute(sql, [questionHash]);

  if (!rows || rows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const question = rows[0];

  const prompt = `You are a technical forum evaluator. Assess how well the draft answer below addresses the specific question asked.
Rate the answer fit as either "strong", "partial", or "weak". Provide a clear, supportive 1-2 sentence note explaining your assessment.

Question Title: "${question.title}"
Question Content:
"""
${question.content}
"""

Draft Answer:
"""
${answerText}
"""

Respond ONLY with valid JSON in this exact structure, with no markdown code blocks and no surrounding commentary:
{"level": "strong", "note": "concise explanation here"}`;

  try {
    const rawResponse = await generateTextContent(prompt);
    const cleaned = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const validLevels = ['strong', 'partial', 'weak'];
    const level = validLevels.includes(parsed?.level?.toLowerCase())
      ? parsed.level.toLowerCase()
      : 'partial';

    return {
      level,
      note: parsed?.note || 'Draft evaluated for relevance to the question.',
    };
  } catch (error) {
    return getHeuristicAnswerFit(question.title, question.content, answerText);
  }
};
