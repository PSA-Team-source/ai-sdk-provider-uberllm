import { type FetchFunction, withoutTrailingSlash } from '@ai-sdk/provider-utils';
import { UBERLLM_BASE_URL } from './uberllm-provider';

export interface UberLLMModelPricing {
  /** USD per 1M input tokens (chat models). */
  input_usd?: number;
  /** USD per 1M output tokens (chat models). */
  output_usd?: number;
  /** Official list price for the same model, when known. */
  list_input_usd?: number;
  list_output_usd?: number;
  /** USD per unit for media models (see `unit`). */
  usd?: number;
  list_usd?: number;
  unit?: string;
  [key: string]: unknown;
}

export interface UberLLMModel {
  id: string;
  type?: string;
  display_name?: string;
  context_length?: number;
  max_output_tokens?: number;
  endpoints?: string[];
  supports_tools?: boolean;
  supports_vision?: boolean;
  supports_reasoning?: boolean;
  available?: boolean;
  pricing?: UberLLMModelPricing;
  [key: string]: unknown;
}

export interface ListModelsOptions {
  /** `chat` (default), `image`, `video`, `music`, `audio` or `all`. */
  type?: 'chat' | 'image' | 'video' | 'music' | 'audio' | 'all';
  /** Optional: the catalog is public. Defaults to `UBERLLM_API_KEY` if set. */
  apiKey?: string;
  baseURL?: string;
  fetch?: FetchFunction;
  signal?: AbortSignal;
}

/**
 * The live UberLLM model catalog (`GET /v1/models`), with prices.
 * Same data as https://uberllm.dev/models.
 */
export async function listModels(
  options: ListModelsOptions = {},
): Promise<UberLLMModel[]> {
  const baseURL = withoutTrailingSlash(options.baseURL ?? UBERLLM_BASE_URL);
  const url = new URL(`${baseURL}/models`);
  if (options.type && options.type !== 'chat') {
    url.searchParams.set('type', options.type);
  }
  const key =
    options.apiKey ??
    (typeof process !== 'undefined' ? process.env?.UBERLLM_API_KEY : undefined);
  const doFetch = options.fetch ?? globalThis.fetch;
  const res = await doFetch(url.toString(), {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    signal: options.signal,
  });
  if (!res.ok) {
    throw new Error(
      `UberLLM GET /v1/models failed: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { data?: UberLLMModel[] };
  return body.data ?? [];
}
