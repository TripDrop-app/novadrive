import messages from "@/messages/mk.json";

type Messages = typeof messages;

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

export function t(key: string): string {
  return getNested(messages as Record<string, unknown>, key);
}

export { messages };
export type { Messages };
