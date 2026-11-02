// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, once parsed.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job in a night. Times are kept as the log wrote them, offset included.
export type DigestRow = {
  job: string;
  owner: string | null; // null is kept; views show it as —
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // the newest error this job logged, if any
  firstAt: string;
  lastAt: string;
};

// Lines per status over the whole night (bad lines not included).
export type StatusCounts = Record<RunStatus, number>;

export type NightDigest = {
  night: string; // YYYY-MM-DD, the file name
  rows: DigestRow[]; // sorted by job; the page and the JSON use this order as is
  counts: StatusCounts;
  badLines: number; // lines that did not parse: counted, never thrown
};

// null when the night has no file (the routes answer 404). An empty file is a digest with no rows.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
