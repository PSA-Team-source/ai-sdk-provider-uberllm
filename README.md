# @uberllm/ai-sdk-provider

[UberLLM](https://uberllm.dev) provider for the [Vercel AI SDK](https://ai-sdk.dev).
One OpenAI-compatible API key for hundreds of chat models (GPT, Claude, Gemini,
DeepSeek, Qwen, GLM, Kimi and others) and image models, usually below list price.

- Models and live prices: <https://uberllm.dev/models>
- Docs: <https://uberllm.dev/docs/ai-sdk>
- Get a key: <https://uberllm.dev/signup> (prepaid credit; failed requests are not billed)

Built on the official `@ai-sdk/openai-compatible` provider, with UberLLM's base
URL, the `UBERLLM_API_KEY` environment variable, token usage on streamed replies,
JSON-schema structured output and image generation set up for you.

## Install

```sh
npm i @uberllm/ai-sdk-provider ai zod
```

Until the package is on npm, install it from GitHub (it builds on install):

```sh
npm i github:PSA-Team-source/ai-sdk-provider-uberllm ai zod
```

Requires `ai` 7 and Node.js 22 or later (ESM).

## Set your key

```sh
export UBERLLM_API_KEY="ull_..."
```

Create the key in **Dashboard → Keys** on <https://uberllm.dev>. The key is read
when a request is made, so importing the provider never throws.

## Generate text

```ts
import { uberllm } from '@uberllm/ai-sdk-provider';
import { generateText } from 'ai';

const { text, usage } = await generateText({
  model: uberllm('deepseek/deepseek-v4-flash'),
  prompt: 'Say hello in five words.',
});
```

Any chat model id from <https://uberllm.dev/models> works, for example
`anthropic/claude-sonnet-5.5`, `openai/gpt-5.5` or `google/gemini-3.5-flash`.

## Stream

```ts
import { streamText } from 'ai';

const result = streamText({
  model: uberllm('deepseek/deepseek-v4-flash'),
  prompt: 'Count from 1 to 5.',
});
for await (const delta of result.textStream) process.stdout.write(delta);
console.log(await result.usage);
```

## Tools

```ts
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model: uberllm('deepseek/deepseek-v4-flash'),
  tools: {
    weather: tool({
      description: 'Get the current temperature in a city, in Celsius',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ city, celsius: 21 }),
    }),
  },
  stopWhen: stepCountIs(3),
  prompt: 'What is the temperature in Paris right now?',
});
```

## Structured output

```ts
import { generateText, Output } from 'ai';

const { output } = await generateText({
  model: uberllm('deepseek/deepseek-v4-flash'),
  output: Output.object({ schema: z.object({ name: z.string(), age: z.number() }) }),
  prompt: 'Ada is 36 years old. Extract the person.',
});
// { name: 'Ada', age: 36 }
```

The provider sends `response_format: { type: "json_schema" }`. For a model that
only takes `json_object`, use `createUberLLM({ supportsStructuredOutputs: false })`.

## Images

```ts
import { generateImage } from 'ai';

const { image } = await generateImage({
  model: uberllm.imageModel('black-forest-labs/flux.2-klein-4b'),
  prompt: 'A red bicycle on a white background',
  size: '1024x1024',
});
// image.uint8Array holds the picture
```

Image ids are listed under Images on <https://uberllm.dev/models>. Picture edits,
video and music are jobs on other routes; see <https://uberllm.dev/docs/media>.

## Settings

```ts
import { createUberLLM } from '@uberllm/ai-sdk-provider';

const uberllm = createUberLLM({
  apiKey: process.env.MY_UBERLLM_KEY, // default: UBERLLM_API_KEY; may be an async function
  baseURL: 'https://api.uberllm.dev/v1', // default
  appName: 'My App', // sent as X-Title; apps can be listed on https://uberllm.dev/apps
  appUrl: 'https://myapp.example', // sent as HTTP-Referer
  headers: {}, // extra headers on every request
  supportsStructuredOutputs: true, // default
});
```

## Cap what a request can cost

UberLLM's routing options go in `providerOptions.uberllm`. `provider.max_price`
(USD per 1M tokens) skips any seller priced above it:

```ts
await generateText({
  model: uberllm('deepseek/deepseek-v4-flash'),
  prompt: 'Hi',
  providerOptions: {
    uberllm: { provider: { max_price: { prompt: 0.2, completion: 0.4 } } },
  },
});
```

Every request, with its cost, is listed in **Dashboard → Activity**.

## List models and prices

```ts
import { listModels } from '@uberllm/ai-sdk-provider';

for (const m of await listModels()) {
  // chat models; { type: 'image' | 'video' | 'music' | 'audio' | 'all' } for others
  console.log(m.id, m.pricing?.input_usd, m.pricing?.output_usd, m.context_length);
}
```

Prices are USD per 1M tokens; `list_input_usd` / `list_output_usd`, when present,
are the official list price for the same model.

UberLLM has no embeddings endpoint, so `embeddingModel()` throws.

## Development

```sh
npm install
npm run typecheck
npm test                                    # offline, fake fetch
UBERLLM_API_KEY=ull_... npm run test:live   # live, about two US cents
npm run build
```

## Support

support@uberllm.dev · [Docs](https://uberllm.dev/docs/ai-sdk) · [Terms](https://uberllm.dev/terms)

UberLLM is operated by AL Global LLC and is not affiliated with Uber Technologies, Inc.

## License

MIT
