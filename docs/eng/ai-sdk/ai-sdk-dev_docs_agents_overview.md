# Agents: Overview

> Source: https://ai-sdk.dev/docs/agents/overview
> Saved: 2025-12-28

AgentsOverview

Copy markdown

# Agents

Agents are **large language models (LLMs)** that use **tools** in a **loop** to accomplish tasks.

These components work together:

- **LLMs** process input and decide the next action
- **Tools** extend capabilities beyond text generation (reading files, calling APIs, writing to databases)
- **Loop** orchestrates execution through:
- **Context management** - Maintaining conversation history and deciding what the model sees (input) at each step
- **Stopping conditions** - Determining when the loop (task) is complete

## ToolLoopAgent Class

The ToolLoopAgent class handles these three components. Here's an agent that uses multiple tools in a loop to accomplish a task:

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { ToolLoopAgent, stepCountIs, tool } from 'ai';2import { z } from 'zod';3
4const weatherAgent = new ToolLoopAgent({5  model: "anthropic/claude-sonnet-4.5",6  tools: {7    weather: tool({8      description: 'Get the weather in a location (in Fahrenheit)',9      inputSchema: z.object({10        location: z.string().describe('The location to get the weather for'),11      }),12      execute: async ({ location }) => ({13        location,14        temperature: 72 + Math.floor(Math.random() * 21) - 10,15      }),16    }),17    convertFahrenheitToCelsius: tool({18      description: 'Convert temperature from Fahrenheit to Celsius',19      inputSchema: z.object({20        temperature: z.number().describe('Temperature in Fahrenheit'),21      }),22      execute: async ({ temperature }) => {23        const celsius = Math.round((temperature - 32) * (5 / 9));24        return { celsius };25      },26    }),27  },28  // Agent's default behavior is to stop after a maximum of 20 steps29  // stopWhen: stepCountIs(20),30});31
32const result = await weatherAgent.generate({33  prompt: 'What is the weather in San Francisco in celsius?',34});35
36console.log(result.text); // agent's final answer37console.log(result.steps); // steps taken by the agent
```

The agent automatically:

1. Calls the `weather` tool to get the temperature in Fahrenheit
2. Calls `convertFahrenheitToCelsius` to convert it
3. Generates a final text response with the result

The Agent class handles the loop, context management, and stopping conditions.

## Why Use the Agent Class?

The Agent class is the recommended approach for building agents with the AI SDK because it:

- **Reduces boilerplate** - Manages loops and message arrays
- **Improves reusability** - Define once, use throughout your application
- **Simplifies maintenance** - Single place to update agent configuration

For most use cases, start with the Agent class. Use core functions (`generateText`, `streamText`) when you need explicit control over each step for complex structured workflows.

## Structured Workflows

Agents are flexible and powerful, but non-deterministic. When you need reliable, repeatable outcomes with explicit control flow, use core functions with structured workflow patterns combining:

- Conditional statements for explicit branching
- Standard functions for reusable logic
- Error handling for robustness
- Explicit control flow for predictability

Explore workflow patterns to learn more about building structured, reliable systems.

## Next Steps

- **Building Agents** - Guide to creating agents with the Agent class
- **Workflow Patterns** - Structured patterns using core functions for complex workflows
- **Loop Control** - Execution control with stopWhen and prepareStep

Previous
Agents

Next
Building Agents