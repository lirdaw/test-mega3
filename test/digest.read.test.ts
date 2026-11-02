import { describe, expect, it } from 'vitest';
import { digestLines, isMarked, parseLine, readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const d = readNight('runs', '2026-10-28');

  it('reads 5 jobs and counts 1 bad line', () => {
    expect(d).not.toBeNull();
    expect(d!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(d!.badLines).toBe(1);
    expect(d!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('keeps a null owner', () => {
    expect(d!.rows.find((r) => r.job === 'digest/render')).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok' });
  });

  it('counts runs and retries, keeps the last status and error and the log offset', () => {
    expect(d!.rows.find((r) => r.job === 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(d!.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(d!.rows.find((r) => r.job === 'lane/sync')).toMatchObject({
      runs: 8,
      retries: 1,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });

  it('marks 3+ retries and fails only', () => {
    expect(d!.rows.filter(isMarked).map((r) => r.job)).toEqual(['fixtures/refresh', 'notes/backup']);
  });
});

describe('reader edges', () => {
  it('returns null for a night with no file or a name that is not a night', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('an empty night has no rows', () => {
    expect(digestLines('2026-01-02', [''])).toEqual({
      night: '2026-01-02',
      rows: [],
      counts: { ok: 0, retry: 0, fail: 0 },
      badLines: 0,
    });
  });

  it('a line with the wrong shape is bad, not thrown', () => {
    expect(parseLine('{"at":"x","job":"a","status":"maybe","owner":null}')).toBeNull();
    expect(parseLine('[1,2]')).toBeNull();
    expect(parseLine('{"at":"x","job":"a","status":"ok","owner":7}')).toBeNull();
    expect(parseLine('{"at":"x","job":"a","status":"ok","owner":null}')).toEqual({ at: 'x', job: 'a', status: 'ok', owner: null });
  });
});
