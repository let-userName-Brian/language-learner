import { useAudioPlayer } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { supabase } from "../../../services/supabase-init";

type LessonRow = { id: string; title: string };
type ItemRow = {
  id: string;
  lesson_id: string;
  kind: string;
  latin: string;
  accepted_english: string[];
  morph: any[];
  media?: { audio_classical?: string; audio_ecclesiastical?: string };
};

export default function LessonScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id; // ✅ normalize
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const player = useAudioPlayer();

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: l, error: le } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .single();
        if (le) throw le;

        const { data: it, error: ie } = await supabase
          .from("items")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("id");
        if (ie) throw ie;

        setLesson(l as LessonRow);
        setItems((it || []) as ItemRow[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId]);

  const first = items.find((i) => i.kind === "sentence");

  const play = async () => {
    if (!first) return;
    const uri =
      first.media?.audio_classical || first.media?.audio_ecclesiastical;
    if (!uri) return;
    player.replace({ uri });
    player.play();
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  if (err || !lesson)
    return (
      <View style={{ padding: 16 }}>
        <Text>{err || "Lesson not found"}</Text>
      </View>
    );

  const hasAudio =
    !!first?.media?.audio_classical || !!first?.media?.audio_ecclesiastical;

  const markComplete = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      alert("Sign in to save progress.");
      return;
    }
    const payload = {
      user_id: user.id,
      lesson_id: lessonId,
      status: "completed",
      last_position: { item_id: items[0]?.id ?? null, step: 1 },
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("progress")
      .upsert(payload, { onConflict: "user_id,lesson_id" });
    if (error) alert(error.message);
    else alert("Marked complete.");
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>{lesson.title}</Text>

      {first ? (
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={hasAudio ? play : undefined}
            style={{
              opacity: hasAudio ? 1 : 0.5,
              padding: 8,
              backgroundColor: "#F1F1F1",
              borderRadius: 8,
            }}
          >
            <Text>{hasAudio ? "▶︎ Play audio" : "No audio yet"}</Text>
          </Pressable>

          <Text style={{ fontSize: 22 }}>{first.latin}</Text>

          <View
            style={{ padding: 12, backgroundColor: "#eef6ff", borderRadius: 8 }}
          >
            <Text style={{ fontWeight: "600" }}>English</Text>
            <Text>{first.accepted_english?.[0]}</Text>
          </View>
        </View>
      ) : (
        <Text>No sentence items yet.</Text>
      )}
      {items.length > 0 && (
        <Pressable
          onPress={markComplete}
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: "#222",
            borderRadius: 12,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Mark Complete
          </Text>
        </Pressable>
      )}
    </View>
  );
}
