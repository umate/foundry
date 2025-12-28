# Agents: Loop Control

> Source: https://ai-sdk.dev/docs/agents/loop-control
> Saved: 2025-12-28

AgentsLoop Control

Copy markdown

# Loop Control

You can control both the execution flow and the settings at each step of the agent loop. The loop continues until:

- A finish reasoning other than tool-calls is returned, or
- A tool that is invoked does not have an execute function, or
- A tool call needs approval, or
- A stop condition is met

The AI SDK provides built-in loop control through two parameters: `stopWhen` for defining stopping conditions and `prepareStep` for modifying settings (model, tools, messages, and more) between steps.

## Stop Conditions

The `stopWhen` parameter controls when to stop execution when there are tool results in the last step. By default, agents stop after 20 steps using `stepCountIs(20)`.

When you provide `stopWhen`, the agent continues executing after tool calls until a stopping condition is met. When the condition is an array, execution stops when any of the conditions are met.

### Use Built-in Conditions

The AI SDK provides several built-in stopping conditions:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent, stepCountIs } from 'ai';2
3const agent = new ToolLoopAgent({4  model: "anthropic/claude-sonnet-4.5",5  tools: {6    // your tools7  },8  stopWhen: stepCountIs(20), // Default state: stop after 20 steps maximum9});10
11const result = await agent.generate({12  prompt: 'Analyze this dataset and create a summary report',13});
```

### Combine Multiple Conditions

Combine multiple stopping conditions. The loop stops when it meets any condition:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent, stepCountIs, hasToolCall } from 'ai';2
3const agent = new ToolLoopAgent({4  model: "anthropic/claude-sonnet-4.5",5  tools: {6    // your tools7  },8  stopWhen: [9    stepCountIs(20), // Maximum 20 steps10    hasToolCall('someTool'), // Stop after calling 'someTool'11  ],12});13
14const result = await agent.generate({15  prompt: 'Research and analyze the topic',16});
```

### Create Custom Conditions

Build custom stopping conditions for specific requirements:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent, StopCondition, ToolSet } from 'ai';2
3const tools = {4  // your tools5} satisfies ToolSet;6
7const hasAnswer: StopCondition<typeof tools> = ({ steps }) => {8  // Stop when the model generates text containing "ANSWER:"9  return steps.some(step => step.text?.includes('ANSWER:')) ?? false;10};11
12const agent = new ToolLoopAgent({13  model: "anthropic/claude-sonnet-4.5",14  tools,15  stopWhen: hasAnswer,16});17
18const result = await agent.generate({19  prompt: 'Find the answer and respond with "ANSWER: [your answer]"',20});
```

Custom conditions receive step information across all steps:

```
1const budgetExceeded: StopCondition<typeof tools> = ({ steps }) => {2  const totalUsage = steps.reduce(3    (acc, step) => ({4      inputTokens: acc.inputTokens + (step.usage?.inputTokens ?? 0),5      outputTokens: acc.outputTokens + (step.usage?.outputTokens ?? 0),6    }),7    { inputTokens: 0, outputTokens: 0 },8  );9
10  const costEstimate =11    (totalUsage.inputTokens * 0.01 + totalUsage.outputTokens * 0.03) / 1000;12  return costEstimate > 0.5; // Stop if cost exceeds $0.5013};
```

## Prepare Step

The `prepareStep` callback runs before each step in the loop and defaults to the initial settings if you don't return any changes. Use it to modify settings, manage context, or implement dynamic behavior based on execution history.

### Dynamic Model Selection

Switch models based on step requirements:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent } from 'ai';2
3const agent = new ToolLoopAgent({4  model: 'openai/gpt-4o-mini', // Default model5  tools: {6    // your tools7  },8  prepareStep: async ({ stepNumber, messages }) => {9    // Use a stronger model for complex reasoning after initial steps10    if (stepNumber > 2 && messages.length > 10) {11      return {12        model: "anthropic/claude-sonnet-4.5",13      };14    }15    // Continue with default settings16    return {};17  },18});19
20const result = await agent.generate({21  prompt: '...',22});
```

### Context Management

Manage growing conversation history in long-running loops:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent } from 'ai';2
3const agent = new ToolLoopAgent({4  model: "anthropic/claude-sonnet-4.5",5  tools: {6    // your tools7  },8  prepareStep: async ({ messages }) => {9    // Keep only recent messages to stay within context limits10    if (messages.length > 20) {11      return {12        messages: [13          messages[0], // Keep system instructions14          ...messages.slice(-10), // Keep last 10 messages15        ],16      };17    }18    return {};19  },20});21
22const result = await agent.generate({23  prompt: '...',24});
```

### Tool Selection

Control which tools are available at each step:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent } from 'ai';2
3const agent = new ToolLoopAgent({4  model: "anthropic/claude-sonnet-4.5",5  tools: {6    search: searchTool,7    analyze: analyzeTool,8    summarize: summarizeTool,9  },10  prepareStep: async ({ stepNumber, steps }) => {11    // Search phase (steps 0-2)12    if (stepNumber <= 2) {13      return {14        activeTools: ['search'],15        toolChoice: 'required',16      };17    }18
19    // Analysis phase (steps 3-5)20    if (stepNumber <= 5) {21      return {22        activeTools: ['analyze'],23      };24    }25
26    // Summary phase (step 6+)27    return {28      activeTools: ['summarize'],29      toolChoice: 'required',30    };31  },32});33
34const result = await agent.generate({35  prompt: '...',36});
```

You can also force a specific tool to be used:

```
1prepareStep: async ({ stepNumber }) => {2  if (stepNumber === 0) {3    // Force the search tool to be used first4    return {5      toolChoice: { type: 'tool', toolName: 'search' },6    };7  }8
9  if (stepNumber === 5) {10    // Force the summarize tool after analysis11    return {12      toolChoice: { type: 'tool', toolName: 'summarize' },13    };14  }15
16  return {};17};
```

### Message Modification

Transform messages before sending them to the model:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent } from 'ai';2
3const agent = new ToolLoopAgent({4  model: "anthropic/claude-sonnet-4.5",5  tools: {6    // your tools7  },8  prepareStep: async ({ messages, stepNumber }) => {9    // Summarize tool results to reduce token usage10    const processedMessages = messages.map(msg => {11      if (msg.role === 'tool' && msg.content.length > 1000) {12        return {13          ...msg,14          content: summarizeToolResult(msg.content),15        };16      }17      return msg;18    });19
20    return { messages: processedMessages };21  },22});23
24const result = await agent.generate({25  prompt: '...',26});
```

## Access Step Information

Both `stopWhen` and `prepareStep` receive detailed information about the current execution:

```
1prepareStep: async ({2  model, // Current model configuration3  stepNumber, // Current step number (0-indexed)4  steps, // All previous steps with their results5  messages, // Messages to be sent to the model6}) => {7  // Access previous tool calls and results8  const previousToolCalls = steps.flatMap(step => step.toolCalls);9  const previousResults = steps.flatMap(step => step.toolResults);10
11  // Make decisions based on execution history12  if (previousToolCalls.some(call => call.toolName === 'dataAnalysis')) {13    return {14      toolChoice: { type: 'tool', toolName: 'reportGenerator' },15    };16  }17
18  return {};19},
```

## Manual Loop Control

For scenarios requiring complete control over the agent loop, you can use AI SDK Core functions (`generateText` and `streamText`) to implement your own loop management instead of using `stopWhen` and `prepareStep`. This approach provides maximum flexibility for complex workflows.

### Implementing a Manual Loop

Build your own agent loop when you need full control over execution:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateText, ModelMessage } from 'ai';2
3const messages: ModelMessage[] = [{ role: 'user', content: '...' }];4
5let step = 0;6const maxSteps = 10;7
8while (step < maxSteps) {9  const result = await generateText({10    model: "anthropic/claude-sonnet-4.5",11    messages,12    tools: {13      // your tools here14    },15  });16
17  messages.push(...result.response.messages);18
19  if (result.text) {20    break; // Stop when model generates text21  }22
23  step++;24}
```

This manual approach gives you complete control over:

- Message history management
- Step-by-step decision making
- Custom stopping conditions
- Dynamic tool and model selection
- Error handling and recovery

Learn more about manual agent loops in the cookbook.

Previous
Workflow Patterns

Next
Configuring Call Options