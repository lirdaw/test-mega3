import { isMarked } from '../digest/read.js';
import type { NightDigest } from '../digest/types.js';

const dash = (v: string | null) => v ?? '—';

export function Digest({ digest }: { digest: NightDigest }) {
  const { night, rows, badLines } = digest;
  return (
    <>
      <h1>digest · {night}</h1>
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class={isMarked(r) ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{dash(r.owner)}</td>
                <td>{r.runs}</td>
                <td>{r.retries >= 3 ? <strong>{r.retries} !</strong> : r.retries}</td>
                <td>{r.lastStatus === 'fail' ? <strong>fail !</strong> : r.lastStatus}</td>
                <td>{dash(r.lastError)}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > 0 && <p class="mute">! marks 3 or more retries, or a fail.</p>}
      {badLines > 0 && (
        <p class="warn">
          {badLines} {badLines === 1 ? 'line' : 'lines'} in the log did not parse and {badLines === 1 ? 'was' : 'were'} skipped.
        </p>
      )}
    </>
  );
}

export function NoNight({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="warn">no run log for this night</p>
    </>
  );
}
