import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

// A temp runs dir: runs/ is read-only.
let runsDir: string;
let app: ReturnType<typeof createApp>;

const line = (o: object) => JSON.stringify(o);

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(runsDir, '2026-11-01.jsonl'),
    [
      line({ at: '2026-11-01T23:00:00+01:00', job: 'b/job', status: 'ok', owner: 'rook' }),
      line({ at: '2026-11-01T23:10:00+01:00', job: 'a/job', status: 'retry', owner: null, error: 'boom' }),
      line({ at: '2026-11-01T23:11:00+01:00', job: 'a/job', status: 'retry', owner: null, error: 'boom' }),
      line({ at: '2026-11-01T23:12:00+01:00', job: 'a/job', status: 'retry', owner: null, error: 'boom' }),
      line({ at: '2026-11-01T23:13:00+01:00', job: 'a/job', status: 'ok', owner: null }),
      line({ at: '2026-11-02T01:00:00+01:00', job: 'c/job', status: 'fail', owner: 'lane-07', error: 'disk full' }),
      '{"at":"2026-11-02T02:00:00+01:00","job":"b/j',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('200: one table sorted by job, banner, marks, — for a null owner, offsets kept, bad line counted', async () => {
    vi.stubEnv('LANE_MARKER', 'ROUTE-MARKER');
    const res = await app.request('/digest/2026-11-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('ROUTE-MARKER');
    expect(html.match(/<table>/g)).toHaveLength(1);
    const jobs = [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(jobs).toEqual(['a/job', 'b/job', 'c/job']);
    expect(html).toContain('<tr class="warn"><td>a/job</td><td>—</td>');
    expect(html).toContain('<strong>3 !</strong>');
    expect(html).toContain('<tr class="warn"><td>c/job</td>');
    expect(html).toContain('<strong>fail !</strong>');
    expect(html).toContain('<tr><td>b/job</td>');
    expect(html).toContain('2026-11-01T23:10:00+01:00');
    expect(html).toContain('1 line in the log did not parse');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for this night');
  });

  it('404 for a name that is not a night', async () => {
    expect((await app.request('/digest/..%2Frig')).status).toBe(404);
  });

  it('the empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table>');
  });
});

describe('GET /api/digest/:night', () => {
  it('200: the same jobs in the same order as the page', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as NightDigest;
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job', 'c/job']);
    expect(body.rows[0]).toEqual({
      job: 'a/job',
      owner: null,
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'boom',
      firstAt: '2026-11-01T23:10:00+01:00',
      lastAt: '2026-11-01T23:13:00+01:00',
    });
    expect(body.badLines).toBe(1);
    expect(body.counts).toEqual({ ok: 2, retry: 3, fail: 1 });

    const html = await (await app.request('/digest/2026-11-01')).text();
    const pageJobs = [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(pageJobs).toEqual(body.rows.map((r) => r.job));
  });

  it('page and JSON agree on runs/2026-10-28', async () => {
    const real = createApp({ adapter: 'shim', installed: '', beatEverySeconds: 60, runsDir: 'runs' });
    const body = (await (await real.request('/api/digest/2026-10-28')).json()) as NightDigest;
    const html = await (await real.request('/digest/2026-10-28')).text();
    const pageJobs = [...html.matchAll(/<tr(?: class="warn")?><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(pageJobs).toEqual(body.rows.map((r) => r.job));
    expect(pageJobs).toHaveLength(5);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for this night', night: '2026-10-30' });
  });

  it('the empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-11-02', rows: [], counts: { ok: 0, retry: 0, fail: 0 }, badLines: 0 });
  });
});
