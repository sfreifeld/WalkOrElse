import { SettingsPanel } from "@/components/settings-panel";
import { StepStatusCard } from "@/components/step-status-card";
import { readSettings } from "@/lib/persistence";

export default async function Home() {
  const settings = await readSettings();

  return (
    <main className="page-shell">
      <section className="panel" aria-label="Walk Or Else status panel">
        <p className="eyebrow">WALK OR ELSE</p>

        {settings.paused && <p className="paused-ribbon">PAUSED</p>}

        <StepStatusCard threshold={settings.threshold} />

        <SettingsPanel
          initialSettings={{
            threshold: settings.threshold,
            timezone: settings.timezone,
            cutoff_time: settings.cutoff_time,
            paused: settings.paused,
            tweet_template: settings.tweet_template,
          }}
        />

        <p className="hash">#WALKORELSE</p>
      </section>
    </main>
  );
}
