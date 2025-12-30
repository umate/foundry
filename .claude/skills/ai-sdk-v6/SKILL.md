---
name: ai-sdk-v6
description: AI SDK v6 development patterns and guidance. Triggers on AI SDK, generateText, streamText, ToolLoopAgent, tool, agent, LLM, structured output, generateObject, useChat, @ai-sdk/react, createAgentUIStreamResponse, Output.object, stepCountIs, UIMessage, ModelMessage keywords.
---

# AI SDK v6 Development Guide

This skill provides up-to-date AI SDK v6 patterns. The AI SDK v6 has significant API changes from previous versions - always use these patterns instead of outdated v3/v4/v5 syntax.

## Quick Reference: What Changed in v6

| Old (v5 and earlier)          | New (v6)                             |
| ----------------------------- | ------------------------------------ |
| `parameters: z.object({...})` | `inputSchema: z.object({...})`       |
| `maxSteps: 10`                | `stopWhen: stepCountIs(10)`          |
| Manual agent loops            | `ToolLoopAgent` class                |
| `result.toAIStreamResponse()` | `result.toUIMessageStreamResponse()` |
| Direct message passing        | `convertToModelMessages(messages)`   |

## Core Patterns

### 1. Tool Definition (v6)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'What this tool does',
  inputSchema: z.object({           // NOT 'parameters'
    query: z.string().describe('The search query'),
    limit: z.number().optional().default(10),
  }),
  execute: async ({ query, limit }) => {
    // Tool implementation
    return { results: [...] };
  },
});
```

### 2. Agent with ToolLoopAgent (v6)

```typescript
import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { z } from "zod";

const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5", // or use gateway("anthropic/claude-sonnet-4.5")
  instructions: "You are a helpful assistant.",
  stopWhen: stepCountIs(10), // NOT maxSteps
  tools: {
    search: tool({
      description: "Search the web",
      inputSchema: z.object({
        query: z.string()
      }),
      execute: async ({ query }) => {
        return { results: await searchWeb(query) };
      }
    })
  }
});

// Use the agent
const result = await agent.generate({ prompt: "Find information about..." });
console.log(result.text);

// Or stream
const stream = agent.stream({ prompt: "Tell me about..." });
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 3. API Route Handler (v6)

```typescript
// app/api/chat/route.ts
import { createAgentUIStreamResponse } from "ai";
import { myAgent } from "@/lib/ai/agents/my-agent";

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createAgentUIStreamResponse({
    agent: myAgent,
    messages
  });
}
```

### 4. Streaming without Agent (v6)

```typescript
import { streamText, UIMessage, convertToModelMessages } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    messages: await convertToModelMessages(messages), // Convert UIMessage to ModelMessage
    stopWhen: stepCountIs(5),
    tools: {
      /* ... */
    }
  });

  return result.toUIMessageStreamResponse(); // NOT toAIStreamResponse()
}
```

### 5. Structured Output (v6)

```typescript
import { generateText, Output } from "ai";
import { z } from "zod";

const { output } = await generateText({
  model: "anthropic/claude-sonnet-4.5",
  prompt: "Analyze this customer feedback...",
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(["positive", "neutral", "negative"]),
      summary: z.string(),
      keyPoints: z.array(z.string())
    })
  })
});

// output is fully typed: { sentiment, summary, keyPoints }
```

### 6. Client-Side with useChat (v6)

```typescript
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}:
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "text":
                return <span key={i}>{part.text}</span>;
              case "tool-myTool": // tool-{toolName} for tool results
                return <pre key={i}>{JSON.stringify(part, null, 2)}</pre>;
            }
          })}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

## Loop Control

```typescript
import { stepCountIs, ToolLoopAgent } from "ai";

const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",
  stopWhen: stepCountIs(20), // Allow up to 20 steps
  // Or combine conditions:
  stopWhen: [stepCountIs(20), customStopCondition()]
});
```

The loop continues until:

- A finish reason other than tool-calls is returned
- A tool without an execute function is invoked
- A tool call needs approval
- A stop condition is met

## Common Imports

```typescript
// Core functions
import {
  generateText,
  streamText,
  tool,
  Output,
  stepCountIs,
  ToolLoopAgent,
  UIMessage,
  ModelMessage,
  convertToModelMessages,
  createAgentUIStreamResponse,
  InferAgentUIMessage
} from "ai";

// React hooks
import { useChat } from "@ai-sdk/react";

// Schema validation
import { z } from "zod";
```

## Provider Setup

```typescript
// Using gateway (default, recommended)
model: "anthropic/claude-sonnet-4.5";

// Or explicit gateway import
import { gateway } from "ai";
model: gateway("anthropic/claude-sonnet-4.5");

// Or specific provider
import { anthropic } from "@ai-sdk/anthropic";
model: anthropic("claude-sonnet-4-5-20241022");

import { openai } from "@ai-sdk/openai";
model: openai("gpt-4o");

import { google } from "@ai-sdk/google";
model: google("gemini-2.5-pro");
```

## Documentation References

For detailed patterns, refer to the project documentation:

- [docs/eng/ai-sdk-6.md](docs/eng/ai-sdk-6.md) - Comprehensive overview
- [docs/eng/ai-sdk/ai-sdk-dev_docs_agents_building-agents.md](docs/eng/ai-sdk/ai-sdk-dev_docs_agents_building-agents.md) - Agent patterns
- [docs/eng/ai-sdk/ai-sdk-dev_docs_foundations_tools.md](docs/eng/ai-sdk/ai-sdk-dev_docs_foundations_tools.md) - Tool definitions
- [docs/eng/ai-sdk/ai-sdk-dev_docs_agents_workflows.md](docs/eng/ai-sdk/ai-sdk-dev_docs_agents_workflows.md) - Workflow patterns
- [docs/eng/ai-sdk/ai-sdk-dev_docs_agents_loop-control.md](docs/eng/ai-sdk/ai-sdk-dev_docs_agents_loop-control.md) - Loop control
