import test from 'node:test';
import assert from 'node:assert/strict';
import { panView } from '../src/data/map-pan.mjs';

test('drag follows pointer at the SVG scale and keeps viewport size', () => {
  assert.deepEqual(panView([100, 120, 300, 300], 40, -20, {a: .5, b: 0, c: 0, d: .5}), [80, 130, 300, 300]);
});
test('drag stays within map bounds, including at full extent', () => {
  const matrix = {a: 1, b: 0, c: 0, d: 1};
  assert.deepEqual(panView([100, 100, 300, 300], 1000, -1000, matrix), [0, 300, 300, 300]);
  assert.deepEqual(panView([0, 0, 600, 600], 100, 100, matrix), [0, 0, 600, 600]);
});
