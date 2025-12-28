# Foundations: Streaming

> Source: https://ai-sdk.dev/docs/foundations/streaming
> Saved: 2025-12-28

FoundationsStreaming

Copy markdown

# Streaming

Streaming conversational text UIs (like ChatGPT) have gained massive popularity over the past few months. This section explores the benefits and drawbacks of streaming and blocking interfaces.

Large language models (LLMs) are extremely powerful. However, when generating long outputs, they can be very slow compared to the latency you're likely used to. If you try to build a traditional blocking UI, your users might easily find themselves staring at loading spinners for 5, 10, even up to 40s waiting for the entire LLM response to be generated. This can lead to a poor user experience, especially in conversational applications like chatbots. Streaming UIs can help mitigate this issue by **displaying parts of the response as they become available**.

Blocking UI

Blocking responses wait until the full response is available before displaying it.

Streaming UI

Streaming responses can transmit parts of the response as they become available.

## Real-world Examples

Here are 2 examples that illustrate how streaming UIs can improve user experiences in a real-world setting – the first uses a blocking UI, while the second uses a streaming UI.

### Blocking UI

Come up with the first 200 characters of the first book in the Harry Potter series.
Generate

...

### Streaming UI

Come up with the first 200 characters of the first book in the Harry Potter series.
Generate

...

As you can see, the streaming UI is able to start displaying the response much faster than the blocking UI. This is because the blocking UI has to wait for the entire response to be generated before it can display anything, while the streaming UI can display parts of the response as they become available.

While streaming interfaces can greatly enhance user experiences, especially with larger language models, they aren't always necessary or beneficial. If you can achieve your desired functionality using a smaller, faster model without resorting to streaming, this route can often lead to simpler and more manageable development processes.

However, regardless of the speed of your model, the AI SDK is designed to make implementing streaming UIs as simple as possible. In the example below, we stream text generation from OpenAI's `gpt-4.1` in under 10 lines of code using the SDK's `streamText` function:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { streamText } from 'ai';2
3const { textStream } = streamText({4  model: "anthropic/claude-sonnet-4.5",5  prompt: 'Write a poem about embedding models.',6});7
8for await (const textPart of textStream) {9  console.log(textPart);10}
```

For an introduction to streaming UIs and the AI SDK, check out our Getting Started guides.

Previous
Tools

Next
Getting Started