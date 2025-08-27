import { useAudioPlayer } from "expo-audio";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ItemRow } from "../constants/types";

export default function SentenceCard({ item }: { item: ItemRow }) {
  const [glossIndex, setGlossIndex] = useState<number | null>(null);
  const player = useAudioPlayer();

  const words = item.latin.split(" ");

  const playAudio = async () => {
    const uri = item.media?.audio_classical || item.media?.audio_ecclesiastical;
    if (!uri) return;
    player.replace({ uri });
    player.play();
  };

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={playAudio} style={{ alignSelf: "flex-start", padding: 8, backgroundColor: "#F1F1F1", borderRadius: 8 }}>
        <Text>▶︎ Play audio</Text>
      </Pressable>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {words.map((w, idx) => (
          <Pressable key={idx} onPress={() => setGlossIndex(idx)} style={{ paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 20 }}>{w}</Text>
          </Pressable>
        ))}
      </View>

      {glossIndex !== null && (
        <View style={{ padding: 12, backgroundColor: "#fff8e1", borderRadius: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>
            {item.morph?.[glossIndex]?.form ?? words[glossIndex]}
          </Text>
          <Text>
            {[
              item.morph?.[glossIndex]?.pos && `POS: ${item.morph[glossIndex].pos}`,
              item.morph?.[glossIndex]?.case && `Case: ${item.morph[glossIndex].case}`,
              item.morph?.[glossIndex]?.num && `Number: ${item.morph[glossIndex].num}`,
              item.morph?.[glossIndex]?.tense && `Tense: ${item.morph[glossIndex].tense}`,
              item.morph?.[glossIndex]?.person && `Person: ${item.morph[glossIndex].person}`
            ].filter(Boolean).join(" · ")}
          </Text>
        </View>
      )}

      <View style={{ padding: 12, backgroundColor: "#eef6ff", borderRadius: 8 }}>
        <Text style={{ fontWeight: "600" }}>English</Text>
        <Text>{item.accepted_english[0]}</Text>
      </View>
    </View>
  );
}
