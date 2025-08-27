import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { supabase } from "../../services/supabase";

type LessonRow = { id: string; title: string; unit_id: string; order: number };

export default function HomeScreen() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // adjust this query if you want a specific course/unit
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .order("order");
        if (error) throw error;
        setLessons((data || []) as LessonRow[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load lessons");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <View style={{flex:1, justifyContent:"center", alignItems:"center"}}><ActivityIndicator/></View>;
  }
  if (err) return <View style={{ padding: 16 }}><Text>{err}</Text></View>;

  return (
    <FlatList
      data={lessons}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <Link href={`/(tabs)/lesson/${item.id}`} asChild>
          <Pressable style={{ padding: 16, backgroundColor: "#eee", borderRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.title}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
