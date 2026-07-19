import { formatApiError } from "$lib/api/error-message";
import {
  fetchLatestListingAnalysis,
  fetchPropertyAnalysis,
  retryAmbienteXray,
  retryAnalysisStep,
  startListingAnalysis
} from "$lib/property-analysis/client";
import type { ListingAnalysis, ListingAnalysisPipelineStep } from "$lib/property-analysis/types";
import { hasPendingAmbienteXray } from "$lib/property-analysis/types";

const POLL_MS = 2000;
const POLL_MAX_MS = 600_000;

function hasRunningSteps(analysis: ListingAnalysis | null | undefined): boolean {
  return (analysis?.result?.runningSteps?.length ?? 0) > 0;
}

function shouldPollAnalysis(analysis: ListingAnalysis): boolean {
  if (analysis.status === "queued" || analysis.status === "running") return true;
  if (hasRunningSteps(analysis)) return true;
  if (hasPendingAmbienteXray(analysis.result?.ambientes?.cards)) return true;
  return false;
}

function isPollTerminal(analysis: ListingAnalysis): boolean {
  if (hasRunningSteps(analysis)) return false;
  if (hasPendingAmbienteXray(analysis.result?.ambientes?.cards)) return false;
  return analysis.status === "completed" || analysis.status === "failed";
}

export function createPropertyAnalysis(listingId: () => string | null, orgId?: () => string | null) {
  let analysis = $state<ListingAnalysis | null>(null);
  let isLoading = $state(false);
  let isStarting = $state(false);
  let error = $state<string | null>(null);

  let pollId: ReturnType<typeof setInterval> | null = null;
  let pollStartedAt: number | null = null;

  function stopPolling() {
    if (pollId !== null) {
      clearInterval(pollId);
      pollId = null;
    }
    pollStartedAt = null;
  }

  async function refresh(analysisId?: string) {
    const id = listingId();
    if (!id) return;
    isLoading = true;
    error = null;
    try {
      if (analysisId) {
        const data = await fetchPropertyAnalysis(analysisId, orgId?.() ?? null);
        analysis = data.analysis;
      } else {
        analysis = await fetchLatestListingAnalysis(id, orgId?.() ?? null);
      }
    } catch (err) {
      error = formatApiError(err);
    } finally {
      isLoading = false;
    }
  }

  function startPolling(analysisId: string) {
    stopPolling();
    pollStartedAt = Date.now();
    pollId = setInterval(() => {
      void (async () => {
        if (pollStartedAt && Date.now() - pollStartedAt > POLL_MAX_MS) {
          stopPolling();
          error = "A análise está demorando mais que o esperado. Tente atualizar.";
          return;
        }
        try {
          const data = await fetchPropertyAnalysis(analysisId, orgId?.() ?? null);
          analysis = data.analysis;
          if (isPollTerminal(data.analysis)) stopPolling();
        } catch {
          /* keep polling */
        }
      })();
    }, POLL_MS);
  }

  async function runAnalysis(addressOverride?: string, collectionId?: string | null) {
    const id = listingId();
    if (!id) return;
    isStarting = true;
    error = null;
    stopPolling();
    analysis = null;
    try {
      const started = await startListingAnalysis(id, {
        addressOverride,
        orgId: orgId?.() ?? null,
        collectionId,
        force: true
      });
      analysis = started;
      if (shouldPollAnalysis(started)) startPolling(started.id);
    } catch (err) {
      error = formatApiError(err);
    } finally {
      isStarting = false;
    }
  }

  async function retryStep(step: ListingAnalysisPipelineStep) {
    if (!analysis?.id) return;
    error = null;
    try {
      const updated = await retryAnalysisStep(analysis.id, step, orgId?.() ?? null);
      analysis = updated;
      if (shouldPollAnalysis(updated)) startPolling(updated.id);
    } catch (err) {
      error = formatApiError(err);
    }
  }

  async function retryAmbienteXrayStep(ambienteId: string) {
    if (!analysis?.id) return;
    error = null;
    try {
      const updated = await retryAmbienteXray(analysis.id, ambienteId, orgId?.() ?? null);
      analysis = updated;
      if (shouldPollAnalysis(updated)) startPolling(updated.id);
    } catch (err) {
      error = formatApiError(err);
    }
  }

  $effect(() => {
    const id = listingId();
    stopPolling();
    analysis = null;
    if (!id) return;
    void refresh();
    return () => stopPolling();
  });

  $effect(() => {
    if (analysis && shouldPollAnalysis(analysis) && pollId === null) {
      startPolling(analysis.id);
    }
  });

  const isRunning = $derived(
    analysis?.status === "queued" || analysis?.status === "running"
  );

  return {
    get analysis() {
      return analysis;
    },
    get isLoading() {
      return isLoading;
    },
    get isStarting() {
      return isStarting;
    },
    get isRunning() {
      return isRunning;
    },
    get error() {
      return error;
    },
    refresh,
    runAnalysis,
    retryStep,
    retryAmbienteXray: retryAmbienteXrayStep
  };
}
