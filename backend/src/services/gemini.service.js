import { GoogleGenAI } from '@google/genai';

let aiClient = null;

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key === 'your_gemini_api_key_here') {
    return null;
  }
  return key;
};

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

/**
 * Generates vector embeddings for a given text using Gemini.
 *
 * @param {string} text - The input text to embed.
 * @param {string} [taskType='RETRIEVAL_DOCUMENT'] - Task type ('RETRIEVAL_DOCUMENT' or 'RETRIEVAL_QUERY').
 * @returns {Promise<number[]>} Array of floating point embedding values.
 */
export const generateEmbedding = async (
  text,
  taskType = 'RETRIEVAL_DOCUMENT',
) => {
  const ai = getClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  const response = await ai.models.embedContent({
    model,
    contents: text,
    config: taskType ? { taskType } : undefined,
  });

  const values =
    response?.embedding?.values ||
    response?.values ||
    response?.embedding ||
    null;

  if (!values || !Array.isArray(values)) {
    throw new Error('Failed to retrieve vector values from Gemini API response.');
  }

  return values;
};

/**
 * Generates text response using Gemini.
 *
 * @param {string} prompt - Prompt to send.
 * @returns {Promise<string>} Generated text response.
 */
export const generateTextContent = async prompt => {
  const ai = getClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || '';
};
