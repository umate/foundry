import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { featureRepository } from '@/db/repositories/feature.repository';

const featureMetadataSchema = z.object({
  title: z.string().describe('Professional feature title, 3-7 words'),
  description: z.string().describe('One sentence description of what this feature enables'),
});

const SYSTEM_PROMPT = `Extract a professional title and description from the user's raw idea.

Title requirements:
- 3-7 words maximum
- Use title case
- Be specific, not generic
- Focus on the benefit or action
- Do NOT include words like "Feature" or "Functionality"

Description requirements:
- One clear sentence
- Explain what users can do or achieve
- Focus on the outcome, not implementation

Examples:
Input: "I want users to upload files and have them transcribed"
→ Title: "Audio File Transcription Upload"
→ Description: "Users can upload audio files and receive automatic text transcriptions."

Input: "Add a way to export features as a markdown checklist"
→ Title: "Markdown Checklist Export"
→ Description: "Export features as formatted markdown checklists for external tracking."

Input: "Let users drag and drop to reorder items"
→ Title: "Drag-and-Drop Item Reordering"
→ Description: "Users can reorder items by dragging and dropping them into new positions."`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: featureId } = await params;

    const feature = await featureRepository.findById(featureId);
    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // No initial idea to generate from - return current values
    if (!feature.initialIdea) {
      return NextResponse.json({ title: feature.title, description: feature.description });
    }

    // Already generated - description is only set by LLM, so its presence means we're done
    if (feature.description) {
      return NextResponse.json({ title: feature.title, description: feature.description });
    }

    const { output } = await generateText({
      model: 'google/gemini-2.0-flash',
      output: Output.object({ schema: featureMetadataSchema }),
      system: SYSTEM_PROMPT,
      prompt: feature.initialIdea,
      temperature: 0.3,
    });

    // Update feature with generated title and description
    await featureRepository.update(featureId, {
      title: output.title,
      description: output.description,
    });

    return NextResponse.json({ title: output.title, description: output.description });
  } catch (error) {
    console.error('Feature metadata generation failed:', error);

    // On failure, return current values (no change)
    try {
      const { id: featureId } = await params;
      const feature = await featureRepository.findById(featureId);
      return NextResponse.json({
        title: feature?.title || 'New Feature',
        description: feature?.description || null,
      });
    } catch {
      return NextResponse.json({ title: 'New Feature', description: null });
    }
  }
}
