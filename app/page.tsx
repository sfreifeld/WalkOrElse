import { StepStatusCard } from "@/components/step-status-card";

const paused = false;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="panel" aria-label="Walk Or Else status panel">
        <p className="eyebrow">WALK OR ELSE</p>

        {paused && <p className="paused-ribbon">PAUSED</p>}

        <StepStatusCard />

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
