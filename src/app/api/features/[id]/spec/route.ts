import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { featureRepository } from "@/db/repositories/feature.repository";
import { z } from "zod";

const updateSpecSchema = z.object({
  specMarkdown: z.string()
});

const summarySchema = z.object({
  summary: z.string().describe('A concise 1-2 sentence summary of the feature'),
});

const SUMMARY_SYSTEM_PROMPT = `Generate a concise summary of this feature spec for display on a Kanban card.

Requirements:
- Maximum 1-2 sentences
- Focus on what the feature does and its main benefit
- Use plain language, avoid technical jargon
- Be specific, not generic

Example spec:
"# User Authentication\n## Problem\nUsers need to log in securely.\n## Solution\nImplement OAuth with Google and GitHub providers."

Summary: "Secure login system using OAuth with Google and GitHub, enabling users to sign in with their existing accounts."`;

async function generateSummary(specMarkdown: string): Promise<string | null> {
  try {
    // Skip if spec is too short to be meaningful
    if (specMarkdown.length < 50) {
      return null;
    }

    const { output } = await generateText({
      model: 'google/gemini-2.0-flash',
      output: Output.object({ schema: summarySchema }),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: specMarkdown,
      temperature: 0.3,
    });

    return output.summary;
  } catch (error) {
    console.error('Summary generation failed:', error);
    return null;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: featureId } = await params;
    const body = await request.json();

    // Validate request body
    const { specMarkdown } = updateSpecSchema.parse(body);

    // Verify feature exists
    const existingFeature = await featureRepository.findById(featureId);
    if (!existingFeature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Generate summary from spec
    const summary = await generateSummary(specMarkdown);

    // Update the feature's spec markdown and summary
    const updatedFeature = await featureRepository.update(featureId, {
      specMarkdown,
      ...(summary ? { summary } : {}),
    });

    return NextResponse.json({ feature: updatedFeature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }

    console.error("Failed to update spec:", error);
    return NextResponse.json({ error: "Failed to update spec" }, { status: 500 });
  }
}
