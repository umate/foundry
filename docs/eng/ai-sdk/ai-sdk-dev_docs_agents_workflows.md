# Agents: Workflow Patterns

> Source: https://ai-sdk.dev/docs/agents/workflows
> Saved: 2025-12-28

AgentsWorkflow Patterns

Copy markdown

# Workflow Patterns

Combine the building blocks from the overview with these patterns to add structure and reliability to your agents:

- Sequential Processing - Steps executed in order
- Parallel Processing - Independent tasks run simultaneously
- Evaluation/Feedback Loops - Results checked and improved iteratively
- Orchestration - Coordinating multiple components
- Routing - Directing work based on context

## Choose Your Approach

Consider these key factors:

- **Flexibility vs Control** - How much freedom does the LLM need vs how tightly you must constrain its actions?
- **Error Tolerance** - What are the consequences of mistakes in your use case?
- **Cost Considerations** - More complex systems typically mean more LLM calls and higher costs
- **Maintenance** - Simpler architectures are easier to debug and modify

**Start with the simplest approach that meets your needs**. Add complexity only when required by:

1. Breaking down tasks into clear steps
2. Adding tools for specific capabilities
3. Implementing feedback loops for quality control
4. Introducing multiple agents for complex workflows

Let's look at examples of these patterns in action.

## Patterns with Examples

These patterns, adapted from Anthropic's guide on building effective agents, serve as building blocks you can combine to create comprehensive workflows. Each pattern addresses specific aspects of task execution. Combine them thoughtfully to build reliable solutions for complex problems.

## Sequential Processing (Chains)

The simplest workflow pattern executes steps in a predefined order. Each step's output becomes input for the next step, creating a clear chain of operations. Use this pattern for tasks with well-defined sequences, like content generation pipelines or data transformation processes.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateText, generateObject } from 'ai';2import { z } from 'zod';3
4async function generateMarketingCopy(input: string) {5  const model = "anthropic/claude-sonnet-4.5";6
7  // First step: Generate marketing copy8  const { text: copy } = await generateText({9    model,10    prompt: `Write persuasive marketing copy for: ${input}. Focus on benefits and emotional appeal.`,11  });12
13  // Perform quality check on copy14  const { object: qualityMetrics } = await generateObject({15    model,16    schema: z.object({17      hasCallToAction: z.boolean(),18      emotionalAppeal: z.number().min(1).max(10),19      clarity: z.number().min(1).max(10),20    }),21    prompt: `Evaluate this marketing copy for:22    1. Presence of call to action (true/false)23    2. Emotional appeal (1-10)24    3. Clarity (1-10)25
26    Copy to evaluate: ${copy}`,27  });28
29  // If quality check fails, regenerate with more specific instructions30  if (31    !qualityMetrics.hasCallToAction ||32    qualityMetrics.emotionalAppeal < 7 ||33    qualityMetrics.clarity < 734  ) {35    const { text: improvedCopy } = await generateText({36      model,37      prompt: `Rewrite this marketing copy with:38      ${!qualityMetrics.hasCallToAction ? '- A clear call to action' : ''}39      ${qualityMetrics.emotionalAppeal < 7 ? '- Stronger emotional appeal' : ''}40      ${qualityMetrics.clarity < 7 ? '- Improved clarity and directness' : ''}41
42      Original copy: ${copy}`,43    });44    return { copy: improvedCopy, qualityMetrics };45  }46
47  return { copy, qualityMetrics };48}
```

## Routing

This pattern lets the model decide which path to take through a workflow based on context and intermediate results. The model acts as an intelligent router, directing the flow of execution between different branches of your workflow. Use this when handling varied inputs that require different processing approaches. In the example below, the first LLM call's results determine the second call's model size and system prompt.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateObject, generateText } from 'ai';2import { z } from 'zod';3
4async function handleCustomerQuery(query: string) {5  const model = "anthropic/claude-sonnet-4.5";6
7  // First step: Classify the query type8  const { object: classification } = await generateObject({9    model,10    schema: z.object({11      reasoning: z.string(),12      type: z.enum(['general', 'refund', 'technical']),13      complexity: z.enum(['simple', 'complex']),14    }),15    prompt: `Classify this customer query:16    ${query}17
18    Determine:19    1. Query type (general, refund, or technical)20    2. Complexity (simple or complex)21    3. Brief reasoning for classification`,22  });23
24  // Route based on classification25  // Set model and system prompt based on query type and complexity26  const { text: response } = await generateText({27    model:28      classification.complexity === 'simple'29        ? 'openai/gpt-4o-mini'30        : 'openai/o4-mini',31    system: {32      general:33        'You are an expert customer service agent handling general inquiries.',34      refund:35        'You are a customer service agent specializing in refund requests. Follow company policy and collect necessary information.',36      technical:37        'You are a technical support specialist with deep product knowledge. Focus on clear step-by-step troubleshooting.',38    }[classification.type],39    prompt: query,40  });41
42  return { response, classification };43}
```

## Parallel Processing

Break down tasks into independent subtasks that execute simultaneously. This pattern uses parallel execution to improve efficiency while maintaining the benefits of structured workflows. For example, analyze multiple documents or process different aspects of a single input concurrently (like code review).

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateText, generateObject } from 'ai';2import { z } from 'zod';3
4// Example: Parallel code review with multiple specialized reviewers5async function parallelCodeReview(code: string) {6  const model = "anthropic/claude-sonnet-4.5";7
8  // Run parallel reviews9  const [securityReview, performanceReview, maintainabilityReview] =10    await Promise.all([11      generateObject({12        model,13        system:14          'You are an expert in code security. Focus on identifying security vulnerabilities, injection risks, and authentication issues.',15        schema: z.object({16          vulnerabilities: z.array(z.string()),17          riskLevel: z.enum(['low', 'medium', 'high']),18          suggestions: z.array(z.string()),19        }),20        prompt: `Review this code:21      ${code}`,22      }),23
24      generateObject({25        model,26        system:27          'You are an expert in code performance. Focus on identifying performance bottlenecks, memory leaks, and optimization opportunities.',28        schema: z.object({29          issues: z.array(z.string()),30          impact: z.enum(['low', 'medium', 'high']),31          optimizations: z.array(z.string()),32        }),33        prompt: `Review this code:34      ${code}`,35      }),36
37      generateObject({38        model,39        system:40          'You are an expert in code quality. Focus on code structure, readability, and adherence to best practices.',41        schema: z.object({42          concerns: z.array(z.string()),43          qualityScore: z.number().min(1).max(10),44          recommendations: z.array(z.string()),45        }),46        prompt: `Review this code:47      ${code}`,48      }),49    ]);50
51  const reviews = [52    { ...securityReview.object, type: 'security' },53    { ...performanceReview.object, type: 'performance' },54    { ...maintainabilityReview.object, type: 'maintainability' },55  ];56
57  // Aggregate results using another model instance58  const { text: summary } = await generateText({59    model,60    system: 'You are a technical lead summarizing multiple code reviews.',61    prompt: `Synthesize these code review results into a concise summary with key actions:62    ${JSON.stringify(reviews, null, 2)}`,63  });64
65  return { reviews, summary };66}
```

## Orchestrator-Worker

A primary model (orchestrator) coordinates the execution of specialized workers. Each worker optimizes for a specific subtask, while the orchestrator maintains overall context and ensures coherent results. This pattern excels at complex tasks requiring different types of expertise or processing.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateObject } from 'ai';2import { z } from 'zod';3
4async function implementFeature(featureRequest: string) {5  // Orchestrator: Plan the implementation6  const { object: implementationPlan } = await generateObject({7    model: "anthropic/claude-sonnet-4.5",8    schema: z.object({9      files: z.array(10        z.object({11          purpose: z.string(),12          filePath: z.string(),13          changeType: z.enum(['create', 'modify', 'delete']),14        }),15      ),16      estimatedComplexity: z.enum(['low', 'medium', 'high']),17    }),18    system:19      'You are a senior software architect planning feature implementations.',20    prompt: `Analyze this feature request and create an implementation plan:21    ${featureRequest}`,22  });23
24  // Workers: Execute the planned changes25  const fileChanges = await Promise.all(26    implementationPlan.files.map(async file => {27      // Each worker is specialized for the type of change28      const workerSystemPrompt = {29        create:30          'You are an expert at implementing new files following best practices and project patterns.',31        modify:32          'You are an expert at modifying existing code while maintaining consistency and avoiding regressions.',33        delete:34          'You are an expert at safely removing code while ensuring no breaking changes.',35      }[file.changeType];36
37      const { object: change } = await generateObject({38        model: "anthropic/claude-sonnet-4.5",39        schema: z.object({40          explanation: z.string(),41          code: z.string(),42        }),43        system: workerSystemPrompt,44        prompt: `Implement the changes for ${file.filePath} to support:45        ${file.purpose}46
47        Consider the overall feature context:48        ${featureRequest}`,49      });50
51      return {52        file,53        implementation: change,54      };55    }),56  );57
58  return {59    plan: implementationPlan,60    changes: fileChanges,61  };62}
```

## Evaluator-Optimizer

Add quality control to workflows with dedicated evaluation steps that assess intermediate results. Based on the evaluation, the workflow proceeds, retries with adjusted parameters, or takes corrective action. This creates robust workflows capable of self-improvement and error recovery.

Gateway

Provider

Custom

Claude Sonnet 4.5

```
1import { generateText, generateObject } from 'ai';2import { z } from 'zod';3
4async function translateWithFeedback(text: string, targetLanguage: string) {5  let currentTranslation = '';6  let iterations = 0;7  const MAX_ITERATIONS = 3;8
9  // Initial translation10  const { text: translation } = await generateText({11    model: "anthropic/claude-sonnet-4.5",12    system: 'You are an expert literary translator.',13    prompt: `Translate this text to ${targetLanguage}, preserving tone and cultural nuances:14    ${text}`,15  });16
17  currentTranslation = translation;18
19  // Evaluation-optimization loop20  while (iterations < MAX_ITERATIONS) {21    // Evaluate current translation22    const { object: evaluation } = await generateObject({23      model: "anthropic/claude-sonnet-4.5",24      schema: z.object({25        qualityScore: z.number().min(1).max(10),26        preservesTone: z.boolean(),27        preservesNuance: z.boolean(),28        culturallyAccurate: z.boolean(),29        specificIssues: z.array(z.string()),30        improvementSuggestions: z.array(z.string()),31      }),32      system: 'You are an expert in evaluating literary translations.',33      prompt: `Evaluate this translation:34
35      Original: ${text}36      Translation: ${currentTranslation}37
38      Consider:39      1. Overall quality40      2. Preservation of tone41      3. Preservation of nuance42      4. Cultural accuracy`,43    });44
45    // Check if quality meets threshold46    if (47      evaluation.qualityScore >= 8 &&48      evaluation.preservesTone &&49      evaluation.preservesNuance &&50      evaluation.culturallyAccurate51    ) {52      break;53    }54
55    // Generate improved translation based on feedback56    const { text: improvedTranslation } = await generateText({57      model: "anthropic/claude-sonnet-4.5",58      system: 'You are an expert literary translator.',59      prompt: `Improve this translation based on the following feedback:60      ${evaluation.specificIssues.join('\n')}61      ${evaluation.improvementSuggestions.join('\n')}62
63      Original: ${text}64      Current Translation: ${currentTranslation}`,65    });66
67    currentTranslation = improvedTranslation;68    iterations++;69  }70
71  return {72    finalTranslation: currentTranslation,73    iterationsRequired: iterations,74  };75}
```

Previous
Building Agents

Next
Loop Control