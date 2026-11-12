import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  type ImageModelV4,
  type LanguageModelV4,
  NoSuchModelError,
  type ProviderV4,
} from '@ai-sdk/provider';
import {
  type FetchFunction,
  type Resolvable,
  loadApiKey,
  resolve,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';

export const UBERLLM_BASE_URL = 'https://api.uberllm.dev/v1';

/**
 * Chat model ids. Any id from https://uberllm.dev/models works; the named
 * ones are only for editor autocomplete.
 */
export type UberLLMChatModelId =
  | 'deepseek/deepseek-v4-flash'
  | 'deepseek/deepseek-v4.1-flash'
  | 'anthropic/claude-opus-5.5'
  | 'anthropic/claude-sonnet-5.5'
  | 'anthropic/claude-haiku-4.5'
  | 'openai/gpt-5.5'
  | 'google/gemini-3.5-flash'
  | 'google/gemini-3.1-flash-lite'
  | 'google/gemini-3.1-pro'
  | 'z-ai/glm-5.3-flash'
  | 'moonshotai/kimi-k3'
  | (string & {});

/**
 * Image model ids for `generateImage`. Any image id from
 * https://uberllm.dev/models that takes /v1/images/generations works.
 */
export type UberLLMImageModelId =
  | 'black-forest-labs/flux.2-klein-4b'
  | 'black-forest-labs/flux.2-flex'
  | 'bytedance/seedream-4.5'
  | 'google/imagen-4'
  | 'google/imagen-4-fast'
  | 'venice/z-image-turbo'
  | (string & {});

export interface UberLLMProviderSettings {
  /**
   * UberLLM API key (`ull_...`). Defaults to the `UBERLLM_API_KEY`
   * environment variable. A function is called before each request and may
   * return a promise.
   */
  apiKey?: Resolvable<string | undefined>;

  /**
   * Base URL for API calls. Defaults to `https://api.uberllm.dev/v1`.
   */
  baseURL?: string;

  /**
   * Your app's name, sent as `X-Title`. Apps that send it can be listed on
   * https://uberllm.dev/apps.
   */
  appName?: string;

  /**
   * Your app's URL, sent as `HTTP-Referer`.
   */
  appUrl?: string;

  /**
   * Extra headers sent with every request.
   */
  headers?: Record<string, string>;

  /**
   * Send `response_format: json_schema` for structured output
   * (`Output.object`, `generateObject`). Defaults to `true`. Set `false` for a
   * model that only takes `json_object`.
   */
  supportsStructuredOutputs?: boolean;

  /**
   * Custom fetch implementation, for middleware or tests.
   */
  fetch?: FetchFunction;
}

export interface UberLLMProvider extends ProviderV4 {
  /** A chat model (`/v1/chat/completions`). */
  (modelId: UberLLMChatModelId): LanguageModelV4;

  /** A chat model (`/v1/chat/completions`). */
  languageModel(modelId: UberLLMChatModelId): LanguageModelV4;

  /** A chat model (`/v1/chat/completions`). */
  chatModel(modelId: UberLLMChatModelId): LanguageModelV4;

  /** An image model (`/v1/images/generations`), for `generateImage`. */
  imageModel(modelId: UberLLMImageModelId): ImageModelV4;

  /** UberLLM has no embeddings endpoint; this always throws. */
  embeddingModel(modelId: string): never;

  /** @deprecated Use `embeddingModel` instead. Always throws. */
  textEmbeddingModel(modelId: string): never;
}

/**
 * Create an UberLLM provider for the Vercel AI SDK.
 *
 * ```ts
 * import { createUberLLM } from '@uberllm/ai-sdk-provider';
 * const uberllm = createUberLLM({ apiKey: process.env.UBERLLM_API_KEY });
 * ```
 */
export function createUberLLM(
  options: UberLLMProviderSettings = {},
): UberLLMProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? UBERLLM_BASE_URL) ??
    UBERLLM_BASE_URL;

  const headers: Record<string, string> = {
    ...(options.appName ? { 'X-Title': options.appName } : {}),
    ...(options.appUrl ? { 'HTTP-Referer': options.appUrl } : {}),
    ...options.headers,
  };

  const base = createOpenAICompatible<
    UberLLMChatModelId,
    string,
    string,
    UberLLMImageModelId
  >({
    name: 'uberllm',
    baseURL,
    // Read lazily, so importing the default instance never throws.
    apiKey: async () =>
      loadApiKey({
        apiKey: await resolve(options.apiKey),
        environmentVariableName: 'UBERLLM_API_KEY',
        description: 'UberLLM',
      }),
    headers,
    includeUsage: true,
    supportsStructuredOutputs: options.supportsStructuredOutputs ?? true,
    fetch: options.fetch,
  });

  const noEmbeddings = (modelId: string): never => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'embeddingModel',
      message: 'UberLLM has no embeddings endpoint.',
    });
  };

  const provider = ((modelId: UberLLMChatModelId) =>
    base.chatModel(modelId)) as UberLLMProvider;
  (provider as { specificationVersion: 'v4' }).specificationVersion = 'v4';
  provider.languageModel = (modelId) => base.chatModel(modelId);
  provider.chatModel = (modelId) => base.chatModel(modelId);
  provider.imageModel = (modelId) => base.imageModel(modelId);
  provider.embeddingModel = noEmbeddings;
  provider.textEmbeddingModel = noEmbeddings;
  return provider;
}

/**
 * Default UberLLM provider. Reads the key from `UBERLLM_API_KEY` when a
 * request is made.
 */
export const uberllm = createUberLLM();
