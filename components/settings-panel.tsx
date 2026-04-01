"use client";

import { ChangeEvent, useMemo, useState } from "react";

type Settings = {
  threshold: number;
  timezone: string;
  cutoff_time: string;
  paused: boolean;
  tweet_template: string;
};

type ShameImage = {
  id: number;
  url: string;
  content_type: string;
  original_filename: string | null;
};

type Props = {
  initialSettings: Settings;
  initialShameImage: ShameImage | null;
};

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_MB = 4;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export function SettingsPanel({ initialSettings, initialShameImage }: Props) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [currentShameImage, setCurrentShameImage] = useState<ShameImage | null>(
    initialShameImage
  );
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const previewSrc = useMemo(() => {
    if (localPreviewUrl) {
      return localPreviewUrl;
    }

    return currentShameImage?.url ?? null;
  }, [currentShameImage?.url, localPreviewUrl]);

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

  function validateImage(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return "Unsupported image type. Use PNG, JPEG, or WEBP.";
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return `Image too large. Maximum file size is ${MAX_UPLOAD_MB} MB.`;
    }

    return null;
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFileName("");
      setLocalPreviewUrl(null);
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setUploadStatus(validationError);
      setSelectedFileName("");
      setLocalPreviewUrl(null);
      event.target.value = "";
      return;
    }

    setUploadStatus("");
    setSelectedFileName(file.name);
    setLocalPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadShameImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setUploadStatus(validationError);
      event.target.value = "";
      return;
    }

    setUploading(true);
    setUploadStatus("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/shame-image/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        shame_asset?: ShameImage;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.shame_asset) {
        throw new Error(data.error ?? "Failed to upload shame image.");
      }

      setCurrentShameImage(data.shame_asset);
      setLocalPreviewUrl(null);
      setSelectedFileName("");
      event.target.value = "";
      setUploadStatus(data.message ?? "Shame image armed.");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
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

      <section className="shame-image-panel" aria-label="Shame image upload">
        <h3 className="settings-title shame-image-title">Shame Image</h3>
        <p className="settings-subtitle">
          Upload the one image used for consequences. New upload replaces the current one.
        </p>

        {previewSrc ? (
          <img className="shame-image-preview" src={previewSrc} alt="Current shame image preview" />
        ) : (
          <p className="settings-status">No shame image uploaded yet.</p>
        )}

        <label className="shame-upload-label">
          <span className="btn btn-secondary shame-upload-btn" aria-disabled={uploading}>
            {uploading ? "Uploading..." : currentShameImage ? "Replace Shame Image" : "Upload Shame Image"}
          </span>
          <input
            className="shame-upload-input"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            disabled={uploading}
            onChange={async (event) => {
              handleFileSelection(event);
              await uploadShameImage(event);
            }}
          />
        </label>

        <p className="settings-status">
          Allowed: PNG, JPEG, WEBP • Max {MAX_UPLOAD_MB} MB
          {selectedFileName ? ` • Selected: ${selectedFileName}` : ""}
        </p>

        {uploadStatus ? <p className="settings-status">{uploadStatus}</p> : null}
      </section>
    </section>
  );
}
