import { describe, expect, it } from 'vitest';
import { initialState } from '../src/domain/types';
import { parseSave } from '../src/storage';
describe('save envelope validation', () => {
  it('rejects truncated snapshots, unsupported versions, oversized files and missing settings', () => {
    expect(() => parseSave('{')).toThrow('valid version 1');
    expect(() => parseSave(JSON.stringify({ ...initialState, version: 2 }))).toThrow(
      'valid version 1',
    );
    expect(() => parseSave(' '.repeat(8_000_001))).toThrow('8 MB');
    expect(() => parseSave('{"version":1,"careers":[],"activeId":null}')).toThrow(
      'valid version 1',
    );
    expect(parseSave(JSON.stringify(initialState))).toEqual(initialState);
  });
});
