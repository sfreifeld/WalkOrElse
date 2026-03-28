"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OuraDailyActivityResponse = {
  ok: boolean;
  error?: string;
  oura_activity?: {
    steps?: number;
  } | null;
  persisted?: {
    latest_steps?: number | null;
    last_checked_at?: string | null;
  } | null;
};

type LoadState = "loading" | "success" | "empty" | "error";

const THRESHOLD = 5000;

function formatSyncedTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsed);
}

export function StepStatusCard() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [steps, setSteps] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLatestActivity = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/oura/daily-activity", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as OuraDailyActivityResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load latest Oura activity.");
      }

      const syncedSteps =
        data.persisted?.latest_steps ?? data.oura_activity?.steps ?? null;
      const syncedAt = data.persisted?.last_checked_at ?? null;

      setSteps(syncedSteps);
      setLastCheckedAt(syncedAt);

      if (syncedSteps === null && !syncedAt) {
        setLoadState("empty");
        return;
      }

      setLoadState("success");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while syncing steps."
      );
    }
  }, []);

  useEffect(() => {
    void fetchLatestActivity();
  }, [fetchLatestActivity]);

  const readableLastSynced = useMemo(
    () => formatSyncedTime(lastCheckedAt),
    [lastCheckedAt]
  );

  if (loadState === "loading") {
    return (
      <div className="step-wrap" role="status" aria-live="polite">
        <p className="step-count">---</p>
        <p className="step-label">SYNCING THREATS...</p>
        <p className="sync-copy">PULLING YOUR LATEST OURA STEPS.</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="step-wrap" role="status" aria-live="polite">
        <p className="step-count">!!!</p>
        <p className="step-label">SYNC FAILURE</p>
        <p className="sync-copy">{errorMessage ?? "Could not read Oura data."}</p>
        <button className="btn btn-secondary retry-btn" onClick={() => void fetchLatestActivity()} type="button">
          Retry Sync
        </button>
      </div>
    );
  }

  if (loadState === "empty") {
    return (
      <div className="step-wrap" role="status" aria-live="polite">
        <p className="step-count">0</p>
        <p className="step-label">NO SYNC YET</p>
        <p className="sync-copy">CONNECT OURA AND SYNC TO SEE TODAY&apos;S STEPS.</p>
      </div>
    );
  }

  const safeSteps = steps ?? 0;

  return (
    <>
      <div className="step-wrap" role="status" aria-live="polite">
        <p className="step-count">{safeSteps.toLocaleString()}</p>
        <p className="step-label">STEPS</p>
      </div>

      <p className="status-copy">
        {safeSteps >= THRESHOLD ? "YOU SURVIVED TODAY." : "YOU FAILED TODAY."}
      </p>

      <p className="sync-copy">
        LAST SYNCED: {readableLastSynced ?? "UNKNOWN"}
      </p>
    </>
  );
}
