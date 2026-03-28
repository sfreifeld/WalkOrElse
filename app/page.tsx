const steps = 0;
const threshold = 5000;
const lastSync = '11:00 PM';
const paused = false;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="panel" aria-label="Walk Or Else status panel">
        <p className="eyebrow">WALK OR ELSE</p>

        {paused && <p className="paused-ribbon">PAUSED</p>}

        <div className="step-wrap">
          <p className="step-count">{steps.toLocaleString()}</p>
          <p className="step-label">STEPS</p>
        </div>

        <p className="status-copy">
          {steps >= threshold ? 'YOU SURVIVED TODAY.' : 'YOU FAILED TODAY.'}
        </p>

        <p className="sync-copy">LAST SYNC: {lastSync}</p>

        <div className="actions">
          <button className="btn btn-secondary" type="button">
            Pause
          </button>
          <button className="btn btn-primary" type="button">
            Upload Image
          </button>
        </div>

        <p className="hash">#WALKORELSE</p>
      </section>
    </main>
  );
}
