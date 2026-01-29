/**
 * Server-side registry of active agent AbortControllers, keyed by feature ID.
 * Allows the abort endpoint to look up and cancel a running agent stream.
 */

const activeStreams = new Map<string, AbortController>();

export function registerAgentStream(featureId: string, controller: AbortController) {
  activeStreams.set(featureId, controller);
}

export function unregisterAgentStream(featureId: string) {
  activeStreams.delete(featureId);
}

export function abortAgentStream(featureId: string): boolean {
  const controller = activeStreams.get(featureId);
  if (controller) {
    controller.abort();
    activeStreams.delete(featureId);
    return true;
  }
  return false;
}
