import crypto from 'crypto';
import { safeExecute } from '../../../../db/config.js';
import { NotFoundError } from '../../../utils/errors/index.js';
import { generateEmbedding } from '../../../services/gemini.service.js';
import { cosineSimilarity } from '../../../utils/vector.js';

const DEFAULT_RECOMMEND_THRESHOLD = process.env.RECOMMEND_THRESHOLD
  ? parseFloat(process.env.RECOMMEND_THRESHOLD)
  : 0.75;
const DEFAULT_RECOMMEND_K = process.env.RECOMMEND_K
  ? parseInt(process.env.RECOMMEND_K, 10)
  : 5;

/**
 * Creates a new question and automatically generates a vector embedding.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.content
 * @param {number} params.userId
 * @returns {Promise<Object>}
 */
export const createQuestionWithVectorService = async ({
  title,
  content,
  userId,
}) => {
  const questionHash = crypto.randomBytes(8).toString('hex');

  const insertSql =
    'INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)';
  const result = await safeExecute(insertSql, [
    questionHash,
    userId,
    title,
    content,
  ]);
  const questionId = result.insertId;

  // Generate vector embedding via Gemini
  try {
    const embedding = await generateEmbedding(title, 'RETRIEVAL_DOCUMENT');
    const vectorSql =
      'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)';
    await safeExecute(vectorSql, [
      questionId,
      title,
      JSON.stringify(embedding),
      'ready',
    ]);
  } catch (vectorError) {
    // If embedding generation fails, record vector status as 'failed'
    try {
      const failedVectorSql =
        'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)';
      await safeExecute(failedVectorSql, [
        questionId,
        title,
        JSON.stringify([]),
        'failed',
      ]);
    } catch (ignoreErr) {
      // Ignore secondary error if vector row insertion fails
    }
  }

  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };
};

/**
 * Lists questions with optional keyword search and "mine" filter.
 *
 * @param {Object} params
 * @param {string} [params.search]
 * @param {boolean} [params.mine]
 * @param {number} params.userId
 * @returns {Promise<Object>}
 */
export const getQuestionsService = async ({ search, mine, userId }) => {
  let sql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    INNER JOIN users u ON q.user_id = u.user_id
    LEFT JOIN answers a ON q.question_id = a.question_id
  `;

  const whereClauses = [];
  const params = [];

  if (mine && userId) {
    whereClauses.push('q.user_id = ?');
    params.push(userId);
  }

  if (search && search.trim().length > 0) {
    whereClauses.push('(q.title LIKE ? OR q.content LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  sql += `
    GROUP BY q.question_id, u.user_id
    ORDER BY q.created_at DESC
    LIMIT 100
  `;

  const rows = await safeExecute(sql, params);

  const data = rows.map(row => ({
    id: row.id,
    questionHash: row.questionHash,
    title: row.title,
    content: row.content,
    answerCount: Number(row.answerCount) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.author_id,
      firstName: row.author_firstName,
      lastName: row.author_lastName,
    },
  }));

  return {
    data,
    meta: {
      limit: 100,
      total: data.length,
      sortBy: 'newest',
      sortOrder: 'desc',
    },
  };
};

/**
 * Retrieves a single question along with all of its answers.
 *
 * @param {string} questionHash
 * @returns {Promise<Object>}
 */
export const getSingleQuestionService = async questionHash => {
  const questionSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    INNER JOIN users u ON q.user_id = u.user_id
    LEFT JOIN answers a ON q.question_id = a.question_id
    WHERE q.question_hash = ?
    GROUP BY q.question_id, u.user_id
    LIMIT 1
  `;

  const questionRows = await safeExecute(questionSql, [questionHash]);

  if (!questionRows || questionRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const qRow = questionRows[0];

  const answersSql = `
    SELECT 
      a.answer_id AS id,
      a.content,
      a.created_at AS createdAt,
      a.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName
    FROM answers a
    INNER JOIN users u ON a.user_id = u.user_id
    WHERE a.question_id = ?
    ORDER BY a.created_at ASC
    LIMIT 100
  `;

  const answerRows = await safeExecute(answersSql, [qRow.id]);

  const answers = answerRows.map(ans => ({
    id: ans.id,
    content: ans.content,
    createdAt: ans.createdAt,
    updatedAt: ans.updatedAt,
    author: {
      id: ans.author_id,
      firstName: ans.author_firstName,
      lastName: ans.author_lastName,
    },
  }));

  return {
    question: {
      id: qRow.id,
      questionHash: qRow.questionHash,
      title: qRow.title,
      content: qRow.content,
      answerCount: answers.length,
      createdAt: qRow.createdAt,
      updatedAt: qRow.updatedAt,
      author: {
        id: qRow.author_id,
        firstName: qRow.author_firstName,
        lastName: qRow.author_lastName,
      },
    },
    answers,
    answersMeta: {
      limit: 100,
      total: answers.length,
    },
  };
};

/**
 * Searches questions semantically using Gemini query vector and cosine similarity.
 *
 * @param {Object} params
 * @param {string} params.query
 * @param {number} [params.k]
 * @param {number} [params.threshold]
 * @returns {Promise<Object>}
 */
export const searchQuestionsSemanticService = async ({
  query,
  k = DEFAULT_RECOMMEND_K,
  threshold = DEFAULT_RECOMMEND_THRESHOLD,
}) => {
  let queryEmbedding;
  try {
    queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');
  } catch (error) {
    // If Gemini query embedding fails, fallback to empty or handle gracefully
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query,
        questionHash: null,
      },
    };
  }

  const vectorsSql =
    "SELECT question_id, embedding FROM question_vectors WHERE status = 'ready'";
  const vectorRows = await safeExecute(vectorsSql, []);

  const scoredMatches = [];
  for (const row of vectorRows) {
    try {
      const vector =
        typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : row.embedding;
      const score = cosineSimilarity(queryEmbedding, vector);
      if (score >= threshold) {
        scoredMatches.push({ questionId: row.question_id, score });
      }
    } catch (parseErr) {
      // Skip invalid vector row
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);
  const topMatches = scoredMatches.slice(0, k);

  if (topMatches.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query,
        questionHash: null,
      },
    };
  }

  const ids = topMatches.map(m => m.questionId);
  const placeholders = ids.map(() => '?').join(',');
  const questionsSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    INNER JOIN users u ON q.user_id = u.user_id
    LEFT JOIN answers a ON q.question_id = a.question_id
    WHERE q.question_id IN (${placeholders})
    GROUP BY q.question_id, u.user_id
  `;

  const questionRows = await safeExecute(questionsSql, ids);

  const questionMap = new Map();
  for (const q of questionRows) {
    questionMap.set(q.id, q);
  }

  const data = [];
  for (const match of topMatches) {
    const q = questionMap.get(match.questionId);
    if (q) {
      data.push({
        id: q.id,
        questionHash: q.questionHash,
        title: q.title,
        content: q.content,
        answerCount: Number(q.answerCount) || 0,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        author: {
          id: q.author_id,
          firstName: q.author_firstName,
          lastName: q.author_lastName,
        },
        score: match.score,
      });
    }
  }

  return {
    data,
    meta: {
      total: data.length,
      k,
      threshold,
      query,
      questionHash: null,
    },
  };
};

/**
 * Finds similar questions based on an existing question's vector embedding.
 *
 * @param {Object} params
 * @param {string} params.questionHash
 * @param {number} [params.k]
 * @param {number} [params.threshold]
 * @returns {Promise<Object>}
 */
export const getSimilarQuestionsService = async ({
  questionHash,
  k = DEFAULT_RECOMMEND_K,
  threshold = DEFAULT_RECOMMEND_THRESHOLD,
}) => {
  const sourceSql = `
    SELECT q.question_id, qv.embedding, qv.status
    FROM questions q
    LEFT JOIN question_vectors qv ON q.question_id = qv.question_id
    WHERE q.question_hash = ?
    LIMIT 1
  `;
  const sourceRows = await safeExecute(sourceSql, [questionHash]);

  if (!sourceRows || sourceRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const source = sourceRows[0];
  if (!source.embedding || source.status !== 'ready') {
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query: null,
        questionHash,
      },
    };
  }

  let sourceVector;
  try {
    sourceVector =
      typeof source.embedding === 'string'
        ? JSON.parse(source.embedding)
        : source.embedding;
  } catch (err) {
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query: null,
        questionHash,
      },
    };
  }

  const otherVectorsSql = `
    SELECT question_id, embedding 
    FROM question_vectors 
    WHERE status = 'ready' AND question_id != ?
  `;
  const otherRows = await safeExecute(otherVectorsSql, [source.question_id]);

  const scoredMatches = [];
  for (const row of otherRows) {
    try {
      const vec =
        typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : row.embedding;
      const score = cosineSimilarity(sourceVector, vec);
      if (score >= threshold) {
        scoredMatches.push({ questionId: row.question_id, score });
      }
    } catch (parseErr) {
      // skip
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);
  const topMatches = scoredMatches.slice(0, k);

  if (topMatches.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        k,
        threshold,
        query: null,
        questionHash,
      },
    };
  }

  const ids = topMatches.map(m => m.questionId);
  const placeholders = ids.map(() => '?').join(',');
  const questionsSql = `
    SELECT 
      q.question_id AS id,
      q.question_hash AS questionHash,
      q.title,
      q.content,
      q.created_at AS createdAt,
      q.updated_at AS updatedAt,
      u.user_id AS author_id,
      u.first_name AS author_firstName,
      u.last_name AS author_lastName,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    INNER JOIN users u ON q.user_id = u.user_id
    LEFT JOIN answers a ON q.question_id = a.question_id
    WHERE q.question_id IN (${placeholders})
    GROUP BY q.question_id, u.user_id
  `;

  const questionRows = await safeExecute(questionsSql, ids);
  const questionMap = new Map();
  for (const q of questionRows) {
    questionMap.set(q.id, q);
  }

  const data = [];
  for (const match of topMatches) {
    const q = questionMap.get(match.questionId);
    if (q) {
      data.push({
        id: q.id,
        questionHash: q.questionHash,
        title: q.title,
        content: q.content,
        answerCount: Number(q.answerCount) || 0,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        author: {
          id: q.author_id,
          firstName: q.author_firstName,
          lastName: q.author_lastName,
        },
        score: match.score,
      });
    }
  }

  return {
    data,
    meta: {
      total: data.length,
      k,
      threshold,
      query: null,
      questionHash,
    },
  };
};
