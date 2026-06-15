import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase client instance.
 *
 * At build time the env vars may be empty — the client is still created
 * but all calls will fail gracefully at runtime if the values are missing.
 * This avoids crashing during Next.js static page generation.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

/** Returns true when the Supabase env vars are properly configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl) && Boolean(supabaseAnonKey);
}

/* ------------------------------------------------------------------ */
/*  Type definitions matching the Supabase schema                      */
/* ------------------------------------------------------------------ */

export interface Person {
  id: string;
  name: string;
  relationship: string;
  face_descriptor: number[];
  photo_url: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  person_id: string;
  note: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Memory helpers                                                     */
/* ------------------------------------------------------------------ */

/** Fetch the most recent memories for a person. */
export async function fetchMemories(
  personId: string,
  limit = 2
): Promise<Memory[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Fetch memories error:", error);
    return [];
  }
  return (data ?? []) as Memory[];
}

/** Insert a new memory note for a person. */
export async function insertMemory(
  personId: string,
  note: string
): Promise<Memory | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("memories")
    .insert({ person_id: personId, note })
    .select()
    .single();
  if (error) {
    console.error("Insert memory error:", error);
    return null;
  }
  return data as Memory;
}

/** Delete a memory note by ID. */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId);
  if (error) {
    console.error("Delete memory error:", error);
    return false;
  }
  return true;
}
