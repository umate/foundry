import { ToolLoopAgent } from "ai";

/**
 * Default chat agent for conversational interactions
 */
export const chatAgent = new ToolLoopAgent({
  model: process.env.AI_DEFAULT_MODEL || "google/gemini-3-flash",
  instructions: "You are a helpful assistant. Provide clear, concise, and accurate responses.",
});
