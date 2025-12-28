# Foundations: Prompts

> Source: https://ai-sdk.dev/docs/foundations/prompts
> Saved: 2025-12-28

FoundationsPrompts

Copy markdown

# Prompts

Prompts are instructions that you give a large language model (LLM) to tell it what to do. It's like when you ask someone for directions; the clearer your question, the better the directions you'll get.

Many LLM providers offer complex interfaces for specifying prompts. They involve different roles and message types. While these interfaces are powerful, they can be hard to use and understand.

In order to simplify prompting, the AI SDK supports text, message, and system prompts.

## Text Prompts

Text prompts are strings. They are ideal for simple generation use cases, e.g. repeatedly generating content for variants of the same prompt text.

You can set text prompts using the `prompt` property made available by AI SDK functions like `streamText` or `generateObject`. You can structure the text in any way and inject variables, e.g. using a template literal.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  prompt: 'Invent a new holiday and describe its traditions.',4});
```

You can also use template literals to provide dynamic data to your prompt.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  prompt:4    `I am planning a trip to ${destination} for ${lengthOfStay} days. ` +5    `Please suggest the best tourist activities for me to do.`,6});
```

## System Prompts

System prompts are the initial set of instructions given to models that help guide and constrain the models' behaviors and responses. You can set system prompts using the `system` property. System prompts work with both the `prompt` and the `messages` properties.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  system:4    `You help planning travel itineraries. ` +5    `Respond to the users' request with a list ` +6    `of the best stops to make in their destination.`,7  prompt:8    `I am planning a trip to ${destination} for ${lengthOfStay} days. ` +9    `Please suggest the best tourist activities for me to do.`,10});
```

When you use a message prompt, you can also use system messages instead of a system prompt.

## Message Prompts

A message prompt is an array of user, assistant, and tool messages. They are great for chat interfaces and more complex, multi-modal prompts. You can use the `messages` property to set message prompts.

Each message has a `role` and a `content` property. The content can either be text (for user and assistant messages), or an array of relevant parts (data) for that message type.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'user', content: 'Hi!' },5    { role: 'assistant', content: 'Hello, how can I help?' },6    { role: 'user', content: 'Where can I buy the best Currywurst in Berlin?' },7  ],8});
```

Instead of sending a text in the `content` property, you can send an array of parts that includes a mix of text and other content parts.

Not all language models support all message and content types. For example, some models might not be capable of handling multi-modal inputs or tool messages. Learn more about the capabilities of select models.

### Provider Options

You can pass through additional provider-specific metadata to enable provider-specific functionality at 3 levels.

#### Function Call Level

Functions like `streamText` or `generateText` accept a `providerOptions` property.

Adding provider options at the function call level should be used when you do not need granular control over where the provider options are applied.

```
1const { text } = await generateText({2  model: azure('your-deployment-name'),3  providerOptions: {4    openai: {5      reasoningEffort: 'low',6    },7  },8});
```

#### Message Level

For granular control over applying provider options at the message level, you can pass `providerOptions` to the message object:

```
1import { ModelMessage } from 'ai';2
3const messages: ModelMessage[] = [4  {5    role: 'system',6    content: 'Cached system message',7    providerOptions: {8      // Sets a cache control breakpoint on the system message9      anthropic: { cacheControl: { type: 'ephemeral' } },10    },11  },12];
```

#### Message Part Level

Certain provider-specific options require configuration at the message part level:

```
1import { ModelMessage } from 'ai';2
3const messages: ModelMessage[] = [4  {5    role: 'user',6    content: [7      {8        type: 'text',9        text: 'Describe the image in detail.',10        providerOptions: {11          openai: { imageDetail: 'low' },12        },13      },14      {15        type: 'image',16        image:17          'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',18        // Sets image detail configuration for image part:19        providerOptions: {20          openai: { imageDetail: 'low' },21        },22      },23    ],24  },25];
```

AI SDK UI hooks like `useChat` return arrays of `UIMessage` objects, which do not support provider options. We recommend using the `convertToModelMessages` function to convert `UIMessage` objects to `ModelMessage` objects before applying or appending message(s) or message parts with `providerOptions`.

### User Messages

#### Text Parts

Text content is the most common type of content. It is a string that is passed to the model.

If you only need to send text content in a message, the `content` property can be a string, but you can also use it to send multiple content parts.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    {5      role: 'user',6      content: [7        {8          type: 'text',9          text: 'Where can I buy the best Currywurst in Berlin?',10        },11      ],12    },13  ],14});
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

```
1const result = await generateText({2  model,3  messages: [4    {5      role: 'user',6      content: [7        { type: 'text', text: 'Describe the image in detail.' },8        {9          type: 'image',10          image: fs.readFileSync('./data/comic-cat.png'),11        },12      ],13    },14  ],15});
```

##### Example: Base-64 encoded image (string)

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    {5      role: 'user',6      content: [7        { type: 'text', text: 'Describe the image in detail.' },8        {9          type: 'image',10          image: fs.readFileSync('./data/comic-cat.png').toString('base64'),11        },12      ],13    },14  ],15});
```

##### Example: Image URL (string)

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    {5      role: 'user',6      content: [7        { type: 'text', text: 'Describe the image in detail.' },8        {9          type: 'image',10          image:11            'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',12        },13      ],14    },15  ],16});
```

#### File Parts

Only a few providers and models currently support file parts: Google Generative AI, Google Vertex AI, OpenAI (for `wav` and `mp3` audio with `gpt-4o-audio-preview`), Anthropic, OpenAI (for `pdf`).

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

```
1import { google } from '@ai-sdk/google';2import { generateText } from 'ai';3
4const result = await generateText({5  model: google('gemini-1.5-flash'),6  messages: [7    {8      role: 'user',9      content: [10        { type: 'text', text: 'What is the file about?' },11        {12          type: 'file',13          mediaType: 'application/pdf',14          data: fs.readFileSync('./data/example.pdf'),15          filename: 'example.pdf', // optional, not used by all providers16        },17      ],18    },19  ],20});
```

##### Example: mp3 audio file from Buffer

```
1import { openai } from '@ai-sdk/openai';2import { generateText } from 'ai';3
4const result = await generateText({5  model: openai('gpt-4o-audio-preview'),6  messages: [7    {8      role: 'user',9      content: [10        { type: 'text', text: 'What is the audio saying?' },11        {12          type: 'file',13          mediaType: 'audio/mpeg',14          data: fs.readFileSync('./data/galileo.mp3'),15        },16      ],17    },18  ],19});
```

#### Custom Download Function (Experimental)

You can use custom download functions to implement throttling, retries, authentication, caching, and more.

The default download implementation automatically downloads files in parallel when they are not supported by the model.

Custom download function can be passed via the `experimental_download` property:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  experimental_download: async (4    requestedDownloads: Array<{5      url: URL;6      isUrlSupportedByModel: boolean;7    }>,8  ): PromiseLike<9    Array<{10      data: Uint8Array;11      mediaType: string | undefined;12    } | null>13  > => {14    // ... download the files and return an array with similar order15  },16  messages: [17    {18      role: 'user',19      content: [20        {21          type: 'file',22          data: new URL('https://api.company.com/private/document.pdf'),23          mediaType: 'application/pdf',24        },25      ],26    },27  ],28});
```

The `experimental_download` option is experimental and may change in future releases.

### Assistant Messages

Assistant messages are messages that have a role of `assistant`. They are typically previous responses from the assistant and can contain text, reasoning, and tool call parts.

#### Example: Assistant message with text content

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'user', content: 'Hi!' },5    { role: 'assistant', content: 'Hello, how can I help?' },6  ],7});
```

#### Example: Assistant message with text content in array

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'user', content: 'Hi!' },5    {6      role: 'assistant',7      content: [{ type: 'text', text: 'Hello, how can I help?' }],8    },9  ],10});
```

#### Example: Assistant message with tool call content

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'user', content: 'How many calories are in this block of cheese?' },5    {6      role: 'assistant',7      content: [8        {9          type: 'tool-call',10          toolCallId: '12345',11          toolName: 'get-nutrition-data',12          input: { cheese: 'Roquefort' },13        },14      ],15    },16  ],17});
```

#### Example: Assistant message with file content

This content part is for model-generated files. Only a few models support this, and only for file types that they can generate.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'user', content: 'Generate an image of a roquefort cheese!' },5    {6      role: 'assistant',7      content: [8        {9          type: 'file',10          mediaType: 'image/png',11          data: fs.readFileSync('./data/roquefort.jpg'),12        },13      ],14    },15  ],16});
```

### Tool messages

Tools (also known as function calling) are programs that you can provide an LLM to extend its built-in functionality. This can be anything from calling an external API to calling functions within your UI. Learn more about Tools in the next section.

For models that support tool calls, assistant messages can contain tool call parts, and tool messages can contain tool output parts. A single assistant message can call multiple tools, and a single tool message can contain multiple tool results.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    {5      role: 'user',6      content: [7        {8          type: 'text',9          text: 'How many calories are in this block of cheese?',10        },11        { type: 'image', image: fs.readFileSync('./data/roquefort.jpg') },12      ],13    },14    {15      role: 'assistant',16      content: [17        {18          type: 'tool-call',19          toolCallId: '12345',20          toolName: 'get-nutrition-data',21          input: { cheese: 'Roquefort' },22        },23        // there could be more tool calls here (parallel calling)24      ],25    },26    {27      role: 'tool',28      content: [29        {30          type: 'tool-result',31          toolCallId: '12345', // needs to match the tool call id32          toolName: 'get-nutrition-data',33          output: {34            type: 'json',35            value: {36              name: 'Cheese, roquefort',37              calories: 369,38              fat: 31,39              protein: 22,40            },41          },42        },43        // there could be more tool results here (parallel calling)44      ],45    },46  ],47});
```

#### Multi-modal Tool Results

Multi-part tool results are experimental and only supported by Anthropic.

Tool results can be multi-part and multi-modal, e.g. a text and an image. You can use the `experimental_content` property on tool parts to specify multi-part tool results.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    // ...5    {6      role: 'tool',7      content: [8        {9          type: 'tool-result',10          toolCallId: '12345', // needs to match the tool call id11          toolName: 'get-nutrition-data',12          // for models that do not support multi-part tool results,13          // you can include a regular output part:14          output: {15            type: 'json',16            value: {17              name: 'Cheese, roquefort',18              calories: 369,19              fat: 31,20              protein: 22,21            },22          },23        },24        {25          type: 'tool-result',26          toolCallId: '12345', // needs to match the tool call id27          toolName: 'get-nutrition-data',28          // for models that support multi-part tool results,29          // you can include a multi-part content part:30          output: {31            type: 'content',32            value: [33              {34                type: 'text',35                text: 'Here is an image of the nutrition data for the cheese:',36              },37              {38                type: 'media',39                data: fs40                  .readFileSync('./data/roquefort-nutrition-data.png')41                  .toString('base64'),42                mediaType: 'image/png',43              },44            ],45          },46        },47      ],48    },49  ],50});
```

### System Messages

System messages are messages that are sent to the model before the user messages to guide the assistant's behavior. You can alternatively use the `system` property.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1const result = await generateText({2  model: "anthropic/claude-sonnet-4.5",3  messages: [4    { role: 'system', content: 'You help planning travel itineraries.' },5    {6      role: 'user',7      content:8        'I am planning a trip to Berlin for 3 days. Please suggest the best tourist activities for me to do.',9    },10  ],11});
```

Previous
Providers and Models

Next
Tools