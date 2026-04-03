import type { Json } from "@/lib/supabase/database.types";

function isJsonObject(
  value: Json | null
): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function jsonToRecord(value: Json | null): Record<string, unknown> {
  return isJsonObject(value) ? (value as Record<string, unknown>) : {};
}

export function jsonToStringArray(value: Json | null): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (isJsonObject(value) && Array.isArray(value.choices)) {
    return value.choices.filter((item): item is string => typeof item === "string");
  }

  return null;
}
