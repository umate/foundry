# Foundations: Tools

> Source: https://ai-sdk.dev/docs/foundations/tools
> Saved: 2025-12-28

FoundationsTools

Copy markdown

# Tools

While large language models (LLMs) have incredible generation capabilities, they struggle with discrete tasks (e.g. mathematics) and interacting with the outside world (e.g. getting the weather).

Tools are actions that an LLM can invoke. The results of these actions can be reported back to the LLM to be considered in the next response.

For example, when you ask an LLM for the "weather in London", and there is a weather tool available, it could call a tool with London as the argument. The tool would then fetch the weather data and return it to the LLM. The LLM can then use this information in its response.

## What is a tool?

A tool is an object that can be called by the model to perform a specific task. You can use tools with `generateText` and `streamText` by passing one or more tools to the `tools` parameter.

A tool consists of three properties:

- **`description`**: An optional description of the tool that can influence when the tool is picked.
- **`inputSchema`**: A Zod schema or a JSON schema that defines the input required for the tool to run. The schema is consumed by the LLM, and also used to validate the LLM tool calls.
- **`execute`**: An optional async function that is called with the arguments from the tool call.

`streamUI` uses UI generator tools with a `generate` function that can return React components.

If the LLM decides to use a tool, it will generate a tool call. Tools with an `execute` function are run automatically when these calls are generated. The output of the tool calls are returned using tool result objects.

You can automatically pass tool results back to the LLM using multi-step calls with `streamText` and `generateText`.

## Schemas

Schemas are used to define and validate the tool input, tools outputs, and structured output generation.

The AI SDK supports the following schemas:

- Zod v3 and v4 directly or via `zodSchema()`
- Valibot via `valibotSchema()` from `@ai-sdk/valibot`
- Standard JSON Schema compatible schemas
- Raw JSON schemas via `jsonSchema()`

You can also use schemas for structured output generation with `generateText` and `streamText` using the `output` setting.

## Tool Packages

Given tools are JavaScript objects, they can be packaged and distributed through npm like any other library. This makes it easy to share reusable tools across projects and with the community.

### Using Ready-Made Tool Packages

Install a tool package and import the tools you need:

```
1pnpm add some-tool-package
```

Then pass them directly to `generateText`, `streamText`, or your agent definition:

```
1import { generateText, stepCountIs } from 'ai';2import { searchTool } from 'some-tool-package';3
4const { text } = await generateText({5  model: 'anthropic/claude-haiku-4.5',6  prompt: 'When was Vercel Ship AI?',7  tools: {8    webSearch: searchTool,9  },10  stopWhen: stepCountIs(10),11});
```

### Publishing Your Own Tools

You can publish your own tool packages to npm for others to use. Simply export your tool objects from your package:

```
1// my-tools/index.ts2export const myTool = {3  description: 'A helpful tool',4  inputSchema: z.object({5    query: z.string(),6  }),7  execute: async ({ query }) => {8    // your tool logic9    return result;10  },11};
```

Anyone can then install and use your tools by importing them.

To get started, you can use the AI SDK Tool Package Template which provides a ready-to-use starting point for publishing your own tools.

## Toolsets

When you work with tools, you typically need a mix of application-specific tools and general-purpose tools. The community has created various toolsets and resources to help you build and use tools.

### Ready-to-Use Tool Packages

These packages provide pre-built tools you can install and use immediately:

- **@exalabs/ai-sdk** - Web search tool that lets AI search the web and get real-time information.
- **@parallel-web/ai-sdk-tools** - Web search and extract tools powered by Parallel Web API for real-time information and content extraction.
- **@perplexity-ai/ai-sdk** - Search the web with real-time results and advanced filtering powered by Perplexity's Search API.
- **@tavily/ai-sdk** - Search, extract, crawl, and map tools for enterprise-grade agents to explore the web in real-time.
- **Stripe agent tools** - Tools for interacting with Stripe.
- **StackOne ToolSet** - Agentic integrations for hundreds of enterprise SaaS platforms.
- **agentic** - A collection of 20+ tools that connect to external APIs such as Exa or E2B.
- **Amazon Bedrock AgentCore** - Fully managed AI agent services including **Browser** (a fast and secure cloud-based browser runtime to enable agents to interact with web applications, fill forms, navigate websites, and extract information) and **Code Interpreter** (an isolated sandbox environment for agents to execute code in Python, JavaScript, and TypeScript, enhancing accuracy and expanding ability to solve complex end-to-end tasks).
- **@airweave/vercel-ai-sdk** - Unified semantic search across 35+ data sources (Notion, Slack, Google Drive, databases, and more) for AI agents.
- **Composio** - 250+ tools like GitHub, Gmail, Salesforce and more.
- **JigsawStack** - Over 30+ small custom fine-tuned models available for specific uses.
- **AI Tools Registry** - A Shadcn-compatible tool definitions and components registry for the AI SDK.
- **Toolhouse** - AI function-calling in 3 lines of code for over 25 different actions.

### MCP Tools

These are pre-built tools available as MCP servers:

- **Smithery** - An open marketplace of 6,000+ MCPs, including Browserbase and Exa.
- **Pipedream** - Developer toolkit that lets you easily add 3,000+ integrations to your app or AI agent.
- **Apify** - Apify provides a marketplace of thousands of tools for web scraping, data extraction, and browser automation.

### Tool Building Tutorials

These tutorials and guides help you build your own tools that integrate with specific services:

- **browserbase** - Tutorial for building browser tools that run a headless browser.
- **browserless** - Guide for integrating browser automation (self-hosted or cloud-based).
- **AI Tool Maker** - A CLI utility to generate AI SDK tools from OpenAPI specs.
- **Interlify** - Guide for converting APIs into tools.
- **DeepAgent** - A suite of 50+ AI tools and integrations, seamlessly connecting with APIs like Tavily, E2B, Airtable and more.

Do you have open source tools or tool libraries that are compatible with the AI SDK? Please file a pull request to add them to this list.

## Learn more

The AI SDK Core Tool Calling and Agents documentation has more information about tools and tool calling.

Previous
Prompts

Next
Streaming