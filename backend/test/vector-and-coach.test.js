import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity } from '../src/utils/vector.js';

test('cosineSimilarity calculates correctly', async t => {
  await t.test('identical vectors return 1', () => {
    const vecA = [1, 2, 3];
    const vecB = [1, 2, 3];
    const score = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(score - 1.0) < 1e-6);
  });

  await t.test('orthogonal vectors return 0', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const score = cosineSimilarity(vecA, vecB);
    assert.strictEqual(score, 0);
  });

  await t.test('opposite vectors return -1', () => {
    const vecA = [1, 1];
    const vecB = [-1, -1];
    const score = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(score - (-1.0)) < 1e-6);
  });

  await t.test('empty or invalid vectors return 0', () => {
    assert.strictEqual(cosineSimilarity([], []), 0);
    assert.strictEqual(cosineSimilarity([1, 2], [1]), 0);
    assert.strictEqual(cosineSimilarity(null, [1]), 0);
    assert.strictEqual(cosineSimilarity([0, 0], [0, 0]), 0);
  });
});
