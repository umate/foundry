# Overview

<Note>
  This page is a beginner-friendly introduction to high-level artificial
  intelligence (AI) concepts. To dive right into implementing the AI SDK, feel
  free to skip ahead to our [quickstarts](/docs/getting-started) or learn about
  our [supported models and providers](/docs/foundations/providers-and-models).
</Note>

The AI SDK standardizes integrating artificial intelligence (AI) models across [supported providers](/docs/foundations/providers-and-models). This enables developers to focus on building great AI applications, not waste time on technical details.

For example, here’s how you can generate text with various models using the AI SDK:

<PreviewSwitchProviders />

To effectively leverage the AI SDK, it helps to familiarize yourself with the following concepts:

## Generative Artificial Intelligence

**Generative artificial intelligence** refers to models that predict and generate various types of outputs (such as text, images, or audio) based on what’s statistically likely, pulling from patterns they’ve learned from their training data. For example:

- Given a photo, a generative model can generate a caption.
- Given an audio file, a generative model can generate a transcription.
- Given a text description, a generative model can generate an image.

## Large Language Models

A **large language model (LLM)** is a subset of generative models focused primarily on **text**. An LLM takes a sequence of words as input and aims to predict the most likely sequence to follow. It assigns probabilities to potential next sequences and then selects one. The model continues to generate sequences until it meets a specified stopping criterion.

LLMs learn by training on massive collections of written text, which means they will be better suited to some use cases than others. For example, a model trained on GitHub data would understand the probabilities of sequences in source code particularly well.

However, it's crucial to understand LLMs' limitations. When asked about less known or absent information, like the birthday of a personal relative, LLMs might "hallucinate" or make up information. It's essential to consider how well-represented the information you need is in the model.

## Embedding Models

An **embedding model** is used to convert complex data (like words or images) into a dense vector (a list of numbers) representation, known as an embedding. Unlike generative models, embedding models do not generate new text or data. Instead, they provide representations of semantic and syntactic relationships between entities that can be used as input for other models or other natural language processing tasks.

In the next section, you will learn about the difference between models providers and models, and which ones are available in the AI SDK.

# Providers and Models

Companies such as OpenAI and Anthropic (providers) offer access to a range of large language models (LLMs) with differing strengths and capabilities through their own APIs.

Each provider typically has its own unique method for interfacing with their models, complicating the process of switching providers and increasing the risk of vendor lock-in.

To solve these challenges, AI SDK Core offers a standardized approach to interacting with LLMs through a [language model specification](https://github.com/vercel/ai/tree/main/packages/provider/src/language-model/v2) that abstracts differences between providers. This unified interface allows you to switch between providers with ease while using the same API for all providers.

Here is an overview of the AI SDK Provider Architecture:

<MDXImage
  srcLight="/images/ai-sdk-diagram.png"
  srcDark="/images/ai-sdk-diagram-dark.png"
  width={800}
  height={800}
/>

## AI SDK Providers

The AI SDK comes with a wide range of providers that you can use to interact with different language models:

- [xAI Grok Provider](/providers/ai-sdk-providers/xai) (`@ai-sdk/xai`)
- [OpenAI Provider](/providers/ai-sdk-providers/openai) (`@ai-sdk/openai`)
- [Azure OpenAI Provider](/providers/ai-sdk-providers/azure) (`@ai-sdk/azure`)
- [Anthropic Provider](/providers/ai-sdk-providers/anthropic) (`@ai-sdk/anthropic`)
- [Amazon Bedrock Provider](/providers/ai-sdk-providers/amazon-bedrock) (`@ai-sdk/amazon-bedrock`)
- [Google Generative AI Provider](/providers/ai-sdk-providers/google-generative-ai) (`@ai-sdk/google`)
- [Google Vertex Provider](/providers/ai-sdk-providers/google-vertex) (`@ai-sdk/google-vertex`)
- [Mistral Provider](/providers/ai-sdk-providers/mistral) (`@ai-sdk/mistral`)
- [Together.ai Provider](/providers/ai-sdk-providers/togetherai) (`@ai-sdk/togetherai`)
- [Cohere Provider](/providers/ai-sdk-providers/cohere) (`@ai-sdk/cohere`)
- [Fireworks Provider](/providers/ai-sdk-providers/fireworks) (`@ai-sdk/fireworks`)
- [DeepInfra Provider](/providers/ai-sdk-providers/deepinfra) (`@ai-sdk/deepinfra`)
- [DeepSeek Provider](/providers/ai-sdk-providers/deepseek) (`@ai-sdk/deepseek`)
- [Cerebras Provider](/providers/ai-sdk-providers/cerebras) (`@ai-sdk/cerebras`)
- [Groq Provider](/providers/ai-sdk-providers/groq) (`@ai-sdk/groq`)
- [Perplexity Provider](/providers/ai-sdk-providers/perplexity) (`@ai-sdk/perplexity`)
- [ElevenLabs Provider](/providers/ai-sdk-providers/elevenlabs) (`@ai-sdk/elevenlabs`)
- [LMNT Provider](/providers/ai-sdk-providers/lmnt) (`@ai-sdk/lmnt`)
- [Hume Provider](/providers/ai-sdk-providers/hume) (`@ai-sdk/hume`)
- [Rev.ai Provider](/providers/ai-sdk-providers/revai) (`@ai-sdk/revai`)
- [Deepgram Provider](/providers/ai-sdk-providers/deepgram) (`@ai-sdk/deepgram`)
- [Gladia Provider](/providers/ai-sdk-providers/gladia) (`@ai-sdk/gladia`)
- [LMNT Provider](/providers/ai-sdk-providers/lmnt) (`@ai-sdk/lmnt`)
- [AssemblyAI Provider](/providers/ai-sdk-providers/assemblyai) (`@ai-sdk/assemblyai`)
- [Baseten Provider](/providers/ai-sdk-providers/baseten) (`@ai-sdk/baseten`)

You can also use the [OpenAI Compatible provider](/providers/openai-compatible-providers) with OpenAI-compatible APIs:

- [LM Studio](/providers/openai-compatible-providers/lmstudio)
- [Heroku](/providers/openai-compatible-providers/heroku)

Our [language model specification](https://github.com/vercel/ai/tree/main/packages/provider/src/language-model/v2) is published as an open-source package, which you can use to create [custom providers](/providers/community-providers/custom-providers).

Additionally, any self-hosted provider that supports the OpenAI specification can be used with the [OpenAI Compatible Provider](/providers/openai-compatible-providers).

## Model Capabilities

The AI providers support different language models with various capabilities.
Here are the capabilities of popular models:

<Note>
  This table is not exhaustive. Additional models can be found in the provider
  documentation pages and on the provider websites.
</Note>

# Prompts

Prompts are instructions that you give a [large language model (LLM)](/docs/foundations/overview#large-language-models) to tell it what to do.
It's like when you ask someone for directions; the clearer your question, the better the directions you'll get.

Many LLM providers offer complex interfaces for specifying prompts. They involve different roles and message types.
While these interfaces are powerful, they can be hard to use and understand.

In order to simplify prompting, the AI SDK supports text, message, and system prompts.

## Text Prompts

Text prompts are strings.
They are ideal for simple generation use cases,
e.g. repeatedly generating content for variants of the same prompt text.

You can set text prompts using the `prompt` property made available by AI SDK functions like [`streamText`](/docs/reference/ai-sdk-core/stream-text) or [`generateObject`](/docs/reference/ai-sdk-core/generate-object).
You can structure the text in any way and inject variables, e.g. using a template literal.

```ts highlight="3"
const result = await generateText({
  model: __MODEL__,
  prompt: "Invent a new holiday and describe its traditions."
});
```

You can also use template literals to provide dynamic data to your prompt.

```ts highlight="3-5"
const result = await generateText({
  model: __MODEL__,
  prompt:
    `I am planning a trip to ${destination} for ${lengthOfStay} days. ` +
    `Please suggest the best tourist activities for me to do.`
});
```

## System Prompts

System prompts are the initial set of instructions given to models that help guide and constrain the models' behaviors and responses.
You can set system prompts using the `system` property.
System prompts work with both the `prompt` and the `messages` properties.

```ts highlight="3-6"
const result = await generateText({
  model: __MODEL__,
  system:
    `You help planning travel itineraries. ` +
    `Respond to the users' request with a list ` +
    `of the best stops to make in their destination.`,
  prompt:
    `I am planning a trip to ${destination} for ${lengthOfStay} days. ` +
    `Please suggest the best tourist activities for me to do.`
});
```

<Note>
  When you use a message prompt, you can also use system messages instead of a
  system prompt.
</Note>

## Message Prompts

A message prompt is an array of user, assistant, and tool messages.
They are great for chat interfaces and more complex, multi-modal prompts.
You can use the `messages` property to set message prompts.

Each message has a `role` and a `content` property. The content can either be text (for user and assistant messages), or an array of relevant parts (data) for that message type.

```ts highlight="3-7"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "user", content: "Hi!" },
    { role: "assistant", content: "Hello, how can I help?" },
    { role: "user", content: "Where can I buy the best Currywurst in Berlin?" }
  ]
});
```

Instead of sending a text in the `content` property, you can send an array of parts that includes a mix of text and other content parts.

<Note type="warning">
  Not all language models support all message and content types. For example,
  some models might not be capable of handling multi-modal inputs or tool
  messages. [Learn more about the capabilities of select
  models](./providers-and-models#model-capabilities).
</Note>

### Provider Options

You can pass through additional provider-specific metadata to enable provider-specific functionality at 3 levels.

#### Function Call Level

Functions like [`streamText`](/docs/reference/ai-sdk-core/stream-text#provider-options) or [`generateText`](/docs/reference/ai-sdk-core/generate-text#provider-options) accept a `providerOptions` property.

Adding provider options at the function call level should be used when you do not need granular control over where the provider options are applied.

```ts
const { text } = await generateText({
  model: azure("your-deployment-name"),
  providerOptions: {
    openai: {
      reasoningEffort: "low"
    }
  }
});
```

#### Message Level

For granular control over applying provider options at the message level, you can pass `providerOptions` to the message object:

```ts
import { ModelMessage } from "ai";

const messages: ModelMessage[] = [
  {
    role: "system",
    content: "Cached system message",
    providerOptions: {
      // Sets a cache control breakpoint on the system message
      anthropic: { cacheControl: { type: "ephemeral" } }
    }
  }
];
```

#### Message Part Level

Certain provider-specific options require configuration at the message part level:

```ts
import { ModelMessage } from "ai";

const messages: ModelMessage[] = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Describe the image in detail.",
        providerOptions: {
          openai: { imageDetail: "low" }
        }
      },
      {
        type: "image",
        image: "https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true",
        // Sets image detail configuration for image part:
        providerOptions: {
          openai: { imageDetail: "low" }
        }
      }
    ]
  }
];
```

<Note type="warning">
  AI SDK UI hooks like [`useChat`](/docs/reference/ai-sdk-ui/use-chat) return
  arrays of `UIMessage` objects, which do not support provider options. We
  recommend using the
  [`convertToModelMessages`](/docs/reference/ai-sdk-ui/convert-to-core-messages)
  function to convert `UIMessage` objects to
  [`ModelMessage`](/docs/reference/ai-sdk-core/model-message) objects before
  applying or appending message(s) or message parts with `providerOptions`.
</Note>

### User Messages

#### Text Parts

Text content is the most common type of content. It is a string that is passed to the model.

If you only need to send text content in a message, the `content` property can be a string,
but you can also use it to send multiple content parts.

```ts highlight="7-10"
const result = await generateText({
  model: __MODEL__,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Where can I buy the best Currywurst in Berlin?"
        }
      ]
    }
  ]
});
```

#### Image Parts

User messages can include image parts. An image can be one of the following:

- base64-encoded image:
  - `string` with base-64 encoded content
  - data URL `string`, e.g. `data:image/png;base64,...`
- binary image:
  - `ArrayBuffer`
  - `Uint8Array`
  - `Buffer`
- URL:
  - http(s) URL `string`, e.g. `https://example.com/image.png`
  - `URL` object, e.g. `new URL('https://example.com/image.png')`

##### Example: Binary image (Buffer)

```ts highlight="8-11"
const result = await generateText({
  model,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe the image in detail." },
        {
          type: "image",
          image: fs.readFileSync("./data/comic-cat.png")
        }
      ]
    }
  ]
});
```

##### Example: Base-64 encoded image (string)

```ts highlight="8-11"
const result = await generateText({
  model: __MODEL__,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe the image in detail." },
        {
          type: "image",
          image: fs.readFileSync("./data/comic-cat.png").toString("base64")
        }
      ]
    }
  ]
});
```

##### Example: Image URL (string)

```ts highlight="8-12"
const result = await generateText({
  model: __MODEL__,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe the image in detail." },
        {
          type: "image",
          image: "https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true"
        }
      ]
    }
  ]
});
```

#### File Parts

<Note type="warning">
  Only a few providers and models currently support file parts: [Google
  Generative AI](/providers/ai-sdk-providers/google-generative-ai), [Google
  Vertex AI](/providers/ai-sdk-providers/google-vertex),
  [OpenAI](/providers/ai-sdk-providers/openai) (for `wav` and `mp3` audio with
  `gpt-4o-audio-preview`), [Anthropic](/providers/ai-sdk-providers/anthropic),
  [OpenAI](/providers/ai-sdk-providers/openai) (for `pdf`).
</Note>

User messages can include file parts. A file can be one of the following:

- base64-encoded file:
  - `string` with base-64 encoded content
  - data URL `string`, e.g. `data:image/png;base64,...`
- binary data:
  - `ArrayBuffer`
  - `Uint8Array`
  - `Buffer`
- URL:
  - http(s) URL `string`, e.g. `https://example.com/some.pdf`
  - `URL` object, e.g. `new URL('https://example.com/some.pdf')`

You need to specify the MIME type of the file you are sending.

##### Example: PDF file from Buffer

```ts highlight="12-15"
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const result = await generateText({
  model: google("gemini-1.5-flash"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is the file about?" },
        {
          type: "file",
          mediaType: "application/pdf",
          data: fs.readFileSync("./data/example.pdf"),
          filename: "example.pdf" // optional, not used by all providers
        }
      ]
    }
  ]
});
```

##### Example: mp3 audio file from Buffer

```ts highlight="12-14"
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const result = await generateText({
  model: openai("gpt-4o-audio-preview"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is the audio saying?" },
        {
          type: "file",
          mediaType: "audio/mpeg",
          data: fs.readFileSync("./data/galileo.mp3")
        }
      ]
    }
  ]
});
```

#### Custom Download Function (Experimental)

You can use custom download functions to implement throttling, retries, authentication, caching, and more.

The default download implementation automatically downloads files in parallel when they are not supported by the model.

Custom download function can be passed via the `experimental_download` property:

```ts
const result = await generateText({
  model: __MODEL__,
  experimental_download: async (
    requestedDownloads: Array<{
      url: URL;
      isUrlSupportedByModel: boolean;
    }>
  ): PromiseLike<
    Array<{
      data: Uint8Array;
      mediaType: string | undefined;
    } | null>
  > => {
    // ... download the files and return an array with similar order
  },
  messages: [
    {
      role: "user",
      content: [
        {
          type: "file",
          data: new URL("https://api.company.com/private/document.pdf"),
          mediaType: "application/pdf"
        }
      ]
    }
  ]
});
```

<Note>
  The `experimental_download` option is experimental and may change in future
  releases.
</Note>

### Assistant Messages

Assistant messages are messages that have a role of `assistant`.
They are typically previous responses from the assistant
and can contain text, reasoning, and tool call parts.

#### Example: Assistant message with text content

```ts highlight="5"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "user", content: "Hi!" },
    { role: "assistant", content: "Hello, how can I help?" }
  ]
});
```

#### Example: Assistant message with text content in array

```ts highlight="7"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "user", content: "Hi!" },
    {
      role: "assistant",
      content: [{ type: "text", text: "Hello, how can I help?" }]
    }
  ]
});
```

#### Example: Assistant message with tool call content

```ts highlight="7-14"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "user", content: "How many calories are in this block of cheese?" },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "12345",
          toolName: "get-nutrition-data",
          input: { cheese: "Roquefort" }
        }
      ]
    }
  ]
});
```

#### Example: Assistant message with file content

<Note>
  This content part is for model-generated files. Only a few models support
  this, and only for file types that they can generate.
</Note>

```ts highlight="9-11"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "user", content: "Generate an image of a roquefort cheese!" },
    {
      role: "assistant",
      content: [
        {
          type: "file",
          mediaType: "image/png",
          data: fs.readFileSync("./data/roquefort.jpg")
        }
      ]
    }
  ]
});
```

### Tool messages

<Note>
  [Tools](/docs/foundations/tools) (also known as function calling) are programs
  that you can provide an LLM to extend its built-in functionality. This can be
  anything from calling an external API to calling functions within your UI.
  Learn more about Tools in [the next section](/docs/foundations/tools).
</Note>

For models that support [tool](/docs/foundations/tools) calls, assistant messages can contain tool call parts, and tool messages can contain tool output parts.
A single assistant message can call multiple tools, and a single tool message can contain multiple tool results.

```ts highlight="14-42"
const result = await generateText({
  model: __MODEL__,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "How many calories are in this block of cheese?"
        },
        { type: "image", image: fs.readFileSync("./data/roquefort.jpg") }
      ]
    },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "12345",
          toolName: "get-nutrition-data",
          input: { cheese: "Roquefort" }
        }
        // there could be more tool calls here (parallel calling)
      ]
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "12345", // needs to match the tool call id
          toolName: "get-nutrition-data",
          output: {
            type: "json",
            value: {
              name: "Cheese, roquefort",
              calories: 369,
              fat: 31,
              protein: 22
            }
          }
        }
        // there could be more tool results here (parallel calling)
      ]
    }
  ]
});
```

#### Multi-modal Tool Results

<Note type="warning">
  Multi-part tool results are experimental and only supported by Anthropic.
</Note>

Tool results can be multi-part and multi-modal, e.g. a text and an image.
You can use the `experimental_content` property on tool parts to specify multi-part tool results.

```ts highlight="24-46"
const result = await generateText({
  model: __MODEL__,
  messages: [
    // ...
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "12345", // needs to match the tool call id
          toolName: "get-nutrition-data",
          // for models that do not support multi-part tool results,
          // you can include a regular output part:
          output: {
            type: "json",
            value: {
              name: "Cheese, roquefort",
              calories: 369,
              fat: 31,
              protein: 22
            }
          }
        },
        {
          type: "tool-result",
          toolCallId: "12345", // needs to match the tool call id
          toolName: "get-nutrition-data",
          // for models that support multi-part tool results,
          // you can include a multi-part content part:
          output: {
            type: "content",
            value: [
              {
                type: "text",
                text: "Here is an image of the nutrition data for the cheese:"
              },
              {
                type: "media",
                data: fs.readFileSync("./data/roquefort-nutrition-data.png").toString("base64"),
                mediaType: "image/png"
              }
            ]
          }
        }
      ]
    }
  ]
});
```

### System Messages

System messages are messages that are sent to the model before the user messages to guide the assistant's behavior.
You can alternatively use the `system` property.

```ts highlight="4"
const result = await generateText({
  model: __MODEL__,
  messages: [
    { role: "system", content: "You help planning travel itineraries." },
    {
      role: "user",
      content: "I am planning a trip to Berlin for 3 days. Please suggest the best tourist activities for me to do."
    }
  ]
});
```
