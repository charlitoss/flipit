// A self-correcting interval aligned to the wall clock. setInterval drifts and
// starts at an arbitrary phase, so the displayed seconds would tick a little
// after the real second — visibly out of step with the blinking colon (which is
// wall-clock aligned). This fires cb right after each `period` boundary
// (…:000, :250, :500, :750 for period=250) so the digits and the colon change
// together. Returns a cleanup function.
export function alignedInterval(cb: () => void, period: number): () => void {
  let timer: number | undefined;
  const schedule = () => {
    // +3ms so we land just past the boundary (after Date has rolled over).
    const delay = period - (Date.now() % period) + 3;
    timer = window.setTimeout(() => {
      cb();
      schedule();
    }, delay);
  };
  schedule();
  return () => window.clearTimeout(timer);
}
