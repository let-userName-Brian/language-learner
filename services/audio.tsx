// File: services/audio.ts
import { supabase } from "./supabase-init";

const EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-or-make-tts`;

export type Dialect = "classical" | "ecclesiastical";
export type AudioKind = "word" | "sentence";

interface AudioCache {
  [key: string]: Promise<string>;
}

// In-flight request cache to prevent duplicate requests
const inflightRequests: AudioCache = {};

/**
 * Get user's preferred Latin pronunciation dialect
 */
export async function getPreferredDialect(): Promise<Dialect> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "classical";

    const { data } = await supabase
      .from("user_profiles")
      .select("pronunciation")
      .eq("user_id", user.id)
      .maybeSingle();

    return data?.pronunciation === "ecclesiastical"
      ? "ecclesiastical"
      : "classical";
  } catch (error) {
    console.warn("Failed to get user dialect preference:", error);
    return "classical";
  }
}

/**
 * Get or generate audio for Latin text
 */
export async function getOrMakeAudio(
  itemId: string,
  text: string,
  dialect: Dialect,
  kind: AudioKind = "word"
): Promise<string> {
  const cacheKey = `${itemId}:${text}:${dialect}:${kind}`;

  // Check if request is already in flight
  const existingRequest = inflightRequests[cacheKey];
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = makeAudioRequest(itemId, text, dialect, kind);
  inflightRequests[cacheKey] = requestPromise;

  try {
    const result = await requestPromise;
    return result;
  } finally {
    delete inflightRequests[cacheKey];
  }
}

async function makeAudioRequest(
  itemId: string,
  text: string,
  dialect: Dialect,
  kind: AudioKind
): Promise<string> {
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${
          session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
        }`,
      },
      body: JSON.stringify({
        item_id: itemId,
        text: text.trim(),
        dialect,
        kind,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Audio API error: ${errorText}`);
      throw new Error(
        `Audio generation failed: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();

    if (!result.url) throw new Error("No audio URL returned from server");

    return result.url;
  } catch (error) {
    console.error("Audio generation error:", error);
    throw new Error(
      `Failed to generate audio: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
/**
 * Get audio URL from item's media field or generate if missing
 */
export async function getItemAudio(
  item: { id: string; latin: string; kind: string; media?: any },
  dialect?: Dialect
): Promise<string> {
  const selectedDialect = dialect || (await getPreferredDialect());
  const audioKey =
    selectedDialect === "classical"
      ? "audio_classical"
      : "audio_ecclesiastical";

  // Check if audio already exists
  if (item.media && item.media[audioKey]) {
    return item.media[audioKey];
  }

  // Generate audio if not present
  const kind = item.kind === "vocab" ? "word" : "sentence";
  return getOrMakeAudio(item.id, item.latin, selectedDialect, kind);
}

/**
 * Preload audio for current item (called when item becomes active)
 */
export async function preloadItemAudio(
  item: { id: string; latin: string; kind: string; media?: any },
  dialect?: Dialect
): Promise<void> {
  try {
    await getItemAudio(item, dialect);
  } catch (error) {
    console.warn(`Failed to preload audio for item ${item.id}:`, error);
  }
}
