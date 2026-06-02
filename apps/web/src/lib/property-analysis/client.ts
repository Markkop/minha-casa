import { workspaceApi } from "$lib/workspace/client";
import type { ListingAnalysis, ListingAnalysisPipelineStep } from "$lib/property-analysis/types";
import type { ListingAnalysisResult } from "$lib/property-analysis/types";

function mapAnalysis(
  raw: Awaited<ReturnType<typeof workspaceApi.fetchLatestListingAnalysis>>["analysis"]
): ListingAnalysis | null {
  if (!raw) return null;
  return {
    id: raw.id,
    listingId: raw.listingId,
    workflowRunId: raw.workflowRunId,
    status: raw.status,
    input: raw.input,
    result: (raw.result as ListingAnalysisResult | null) ?? null,
    error: raw.error,
    insertedAt: raw.insertedAt,
    updatedAt: raw.updatedAt
  };
}

export async function fetchLatestListingAnalysis(
  listingId: string,
  _orgId?: string | null
): Promise<ListingAnalysis | null> {
  const { analysis } = await workspaceApi.fetchLatestListingAnalysis(listingId);
  return mapAnalysis(analysis);
}

export async function startListingAnalysis(
  listingId: string,
  options?: {
    addressOverride?: string;
    orgId?: string | null;
    collectionId?: string | null;
    force?: boolean;
  }
): Promise<ListingAnalysis> {
  const { analysis } = await workspaceApi.startListingAnalysis(listingId, {
    addressOverride: options?.addressOverride,
    collectionId: options?.collectionId ?? undefined,
    force: options?.force ?? true
  });
  return mapAnalysis(analysis)!;
}

export async function retryAmbienteXray(
  analysisId: string,
  ambienteId: string,
  _orgId?: string | null
): Promise<ListingAnalysis> {
  const { analysis } = await workspaceApi.retryAnalysisCardXray(analysisId, ambienteId);
  return mapAnalysis(analysis)!;
}

export async function retryAnalysisStep(
  analysisId: string,
  step: ListingAnalysisPipelineStep,
  _orgId?: string | null
): Promise<ListingAnalysis> {
  const { analysis } = await workspaceApi.retryAnalysisStep(analysisId, step);
  return mapAnalysis(analysis)!;
}

export async function fetchPropertyAnalysis(
  analysisId: string,
  _orgId?: string | null
): Promise<{ analysis: ListingAnalysis; workflow: unknown }> {
  const data = await workspaceApi.fetchPropertyAnalysis(analysisId);
  return {
    analysis: mapAnalysis(data.analysis)!,
    workflow: data.workflow
  };
}
