import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board links each night to its digest', () => {
  it('links both nights on disk, with counts, to a digest that renders', async () => {
    const app = createApp(config);
    const html = await (await app.request('/')).text();
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('ok 7 · retry 0 · fail 0');
    for (const night of ['2026-10-27', '2026-10-28']) {
      const res = await app.request(`/digest/${night}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain(`digest · ${night}`);
    }
  });
});
