"use client";

import { useState } from "react";

type Settings = {
  threshold: number;
  timezone: string;
  cutoff_time: string;
  paused: boolean;
  tweet_template: string;
};

type Props = {
  initialSettings: Settings;
};

export function SettingsPanel({ initialSettings }: Props) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
        settings?: Settings;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save settings.");
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      setStatus(data.message ?? "Settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-panel" aria-label="Walk Or Else settings">
      <h2 className="settings-title">Threat Settings</h2>
      <p className="settings-subtitle">Tune your daily consequences. No excuses.</p>

      <div className="settings-grid">
        <label className="settings-field">
          Step Threshold
          <input
            className="settings-input"
            type="number"
            min={1}
            max={100000}
            value={settings.threshold}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                threshold: Number(event.target.value || 0),
              }))
            }
          />
        </label>

        <label className="settings-field">
          Timezone
          <input
            className="settings-input"
            type="text"
            value={settings.timezone}
            onChange={(event) =>
              setSettings((current) => ({ ...current, timezone: event.target.value }))
            }
            placeholder="America/New_York"
          />
        </label>

        <label className="settings-field">
          Cutoff Time
          <input
            className="settings-input"
            type="time"
            value={settings.cutoff_time}
            onChange={(event) =>
              setSettings((current) => ({ ...current, cutoff_time: event.target.value }))
            }
          />
        </label>

        <label className="settings-field settings-toggle">
          <span>Paused</span>
          <input
            type="checkbox"
            checked={settings.paused}
            onChange={(event) =>
              setSettings((current) => ({ ...current, paused: event.target.checked }))
            }
          />
        </label>

        <label className="settings-field settings-full-width">
          Shame Post Text
          <textarea
            className="settings-input settings-textarea"
            value={settings.tweet_template}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                tweet_template: event.target.value,
              }))
            }
            maxLength={500}
            placeholder="I failed to hit {{steps}} steps by {{cutoff_time}}. Drag me."
          />
        </label>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary settings-save" type="button" disabled={saving} onClick={saveSettings}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {status ? <p className="settings-status">{status}</p> : null}
      </div>
    </section>
  );
}
