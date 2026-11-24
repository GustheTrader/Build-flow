/** Job numbers: JOB-1001, JOB-1002, ... People type them loosely ("1001", "job 1001", "JOB-1001", "#1001"). */
export const JOB_SEQ_KEY = 'projects:seq';
export const JOB_SEQ_START = 1000;
export const jobNumberKey = (n: string) => `projects:number:${n}`;
export const formatJobNumber = (n: number) => `JOB-${n}`;

export function normalizeJobNumber(raw: unknown): string | null {
  const m = /^\s*(?:job)?[\s#:_-]*0*(\d{1,7})\s*$/i.exec(String(raw ?? ''));
  return m ? formatJobNumber(Number(m[1])) : null;
}
