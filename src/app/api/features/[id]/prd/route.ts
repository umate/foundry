import { NextRequest, NextResponse } from "next/server";
import { featureRepository } from "@/db/repositories/feature.repository";
import { z } from "zod";

const updatePRDSchema = z.object({
  prdMarkdown: z.string()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: featureId } = await params;
    const body = await request.json();

    // Validate request body
    const { prdMarkdown } = updatePRDSchema.parse(body);

    // Verify feature exists
    const existingFeature = await featureRepository.findById(featureId);
    if (!existingFeature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Update the feature's PRD markdown
    const updatedFeature = await featureRepository.update(featureId, {
      prdMarkdown
    });

    return NextResponse.json({ feature: updatedFeature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }

    console.error("Failed to update PRD:", error);
    return NextResponse.json({ error: "Failed to update PRD" }, { status: 500 });
  }
}
