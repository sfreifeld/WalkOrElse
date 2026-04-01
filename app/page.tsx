import { SettingsPanel } from "@/components/settings-panel";
import { StepStatusCard } from "@/components/step-status-card";
import { readSettings, readShameAssetById } from "@/lib/persistence";

export default async function Home() {
  const settings = await readSettings();
  const currentShameAsset = settings.shame_asset_id
    ? await readShameAssetById(settings.shame_asset_id)
    : null;

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
          initialShameImage={
            currentShameAsset?.asset_url
              ? {
                  id: currentShameAsset.id,
                  url: currentShameAsset.asset_url,
                  content_type: currentShameAsset.content_type,
                  original_filename: currentShameAsset.original_filename,
                }
              : null
          }
        />

        <p className="hash">#WALKORELSE</p>
      </section>
    </main>
  );
}
