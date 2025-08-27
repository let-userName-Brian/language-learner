import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { showErrorBanner, showSuccessBanner } from "../../../components/ShowAlert";
import { supabase } from "../../../services/supabase-init";

type ItemRow = {
  id: string;
  lesson_id: string;
  kind: string;
  latin: string;
  accepted_english: string[];
  morph: any[];
  media?: { audio_classical?: string; audio_ecclesiastical?: string };
};

export default function SectionScreen() {
  const params = useLocalSearchParams<{ 
    id?: string | string[]; 
    type?: string | string[]; 
    from?: string 
  }>();
  
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const sectionType = Array.isArray(params.type) ? params.type[0] : params.type;
  const from = params.from || 'lesson';
  
  const [items, setItems] = useState<ItemRow[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const player = useAudioPlayer();

  useEffect(() => {
    if (!lessonId || !sectionType) return;
    loadSectionItems();
  }, [lessonId, sectionType]);

  const loadSectionItems = async () => {
    setLoading(true);
    try {
      const { data: it, error: ie } = await supabase
        .from("items")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("kind", sectionType)
        .order("id");
      
      if (ie) throw ie;
      
      const sectionItems = (it || []) as ItemRow[];
      setItems(sectionItems);
      
      if (sectionItems.length > 0) {
        setViewedItems(new Set([sectionItems[0].id]));
      }
    } catch (e: any) {
      setErr(e.message ?? "Failed to load section");
    } finally {
      setLoading(false);
    }
  };

  const currentItem = items[currentItemIndex];
  const allItemsViewed = viewedItems.size === items.length;

  const getSectionInfo = () => {
    switch (sectionType) {
      case "vocab":
        return { title: "Vocabulary", icon: "📚", color: "#f3e5f5", borderColor: "#9C27B0" };
      case "sentence":
        return { title: "Sentences", icon: "📝", color: "#e3f2fd", borderColor: "#2196F3" };
      case "picture-match":
        return { title: "Picture Match", icon: "🖼️", color: "#e8f5e8", borderColor: "#4CAF50" };
      case "tile-build":
        return { title: "Tile Builder", icon: "🧩", color: "#fff3e0", borderColor: "#FF9800" };
      default:
        return { title: "Section", icon: "📄", color: "#f8f9fa", borderColor: "#6c757d" };
    }
  };

  const sectionInfo = getSectionInfo();

  const play = async () => {
    if (!currentItem) return;
    const uri = currentItem.media?.audio_classical || currentItem.media?.audio_ecclesiastical;
    if (!uri) return;
    player.replace({ uri });
    player.play();
  };

  const goToPrevious = () => {
    if (currentItemIndex > 0) {
      const newIndex = currentItemIndex - 1;
      setCurrentItemIndex(newIndex);
      setViewedItems(prev => new Set([...prev, items[newIndex].id]));
    }
  };

  const goToNext = () => {
    if (currentItemIndex < items.length - 1) {
      const newIndex = currentItemIndex + 1;
      setCurrentItemIndex(newIndex);
      setViewedItems(prev => new Set([...prev, items[newIndex].id]));
    }
  };

  const completeSection = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        showErrorBanner("Please sign in to save progress");
        return;
      }

      // Get existing progress
      const { data: existingProgress } = await supabase
        .from("progress")
        .select("last_position")
        .eq("user_id", user.user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle(); // Use maybeSingle() instead of single()

      const completedSections = existingProgress?.last_position?.completed_sections || [];
      const updatedSections = [...new Set([...completedSections, sectionType])];

      // Check if ALL sections are now complete by getting lesson's section types
      const { data: lessonItems } = await supabase
        .from("items")
        .select("kind")
        .eq("lesson_id", lessonId);

      const uniqueSectionTypes = [...new Set(lessonItems?.map(item => item.kind) || [])];
      const allSectionsComplete = uniqueSectionTypes.every(type => 
        updatedSections.includes(type)
      );

      const payload = {
        user_id: user.user.id,
        lesson_id: lessonId,
        status: allSectionsComplete ? "completed" : "in_progress", // Fix this!
        last_position: { 
          completed_sections: updatedSections,
          section_type: sectionType 
        },
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("progress")
        .upsert(payload, { onConflict: "user_id,lesson_id" });

      if (allSectionsComplete) {
        showSuccessBanner("🎉 Lesson completed!", () => {
          router.push(`/lesson/${lessonId}?from=lessons`);
        });
      } else {
        showSuccessBanner(`✓ ${sectionInfo.title} completed!`, () => {
          router.push(`/lesson/${lessonId}?from=lessons`);
        });
      }
    } catch (error) {
      showErrorBanner("Failed to save progress");
    }
  };

  const handleBack = () => {
    router.push(`/lesson/${lessonId}?from=lessons`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (err || !currentItem) {
    return (
      <View style={{ padding: 16 }}>
        <Text>{err || "Section not found"}</Text>
      </View>
    );
  }

  const hasAudio = !!currentItem?.media?.audio_classical || !!currentItem?.media?.audio_ecclesiastical;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: "#fff",
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={handleBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#f8f9fa",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#e9ecef",
            }}
          >
            <Text style={{ fontSize: 18, color: "#495057" }}>←</Text>
          </Pressable>
          
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: "700",
              color: "#212529",
            }}>
              {sectionInfo.icon} {sectionInfo.title}
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: "#6c757d",
              marginTop: 2,
            }}>
              Item {currentItemIndex + 1} of {items.length} • {viewedItems.size}/{items.length} viewed
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Audio Button */}
        <Pressable
          onPress={hasAudio ? play : undefined}
          style={{
            opacity: hasAudio ? 1 : 0.5,
            padding: 16,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: hasAudio ? "#e9ecef" : "#dee2e6",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: hasAudio ? "#4CAF50" : "#6c757d",
              justifyContent: "center",
              alignItems: "center",
            }}>
              <Text style={{ color: "white", fontSize: 18 }}>
                {hasAudio ? "▶" : "♪"}
              </Text>
            </View>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: "600",
              color: hasAudio ? "#212529" : "#6c757d" 
            }}>
              {hasAudio ? "Play Audio" : "No audio yet"}
            </Text>
          </View>
        </Pressable>

        {/* Latin Text */}
        <View style={{
          backgroundColor: "#fff",
          padding: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e9ecef",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: "500",
            color: "#212529",
            textAlign: "center",
            lineHeight: 32,
          }}>
            {currentItem.latin}
          </Text>
        </View>

        {/* English Translation */}
        {currentItem.accepted_english?.[0] && (
          <View style={{ 
            padding: 20, 
            backgroundColor: sectionInfo.color, 
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: sectionInfo.borderColor,
          }}>
            <Text style={{ 
              fontWeight: "600", 
              fontSize: 16,
              color: sectionInfo.borderColor,
              marginBottom: 8,
            }}>
              English
            </Text>
            <Text style={{ 
              fontSize: 16,
              color: sectionInfo.borderColor,
              lineHeight: 24,
            }}>
              {currentItem.accepted_english[0]}
            </Text>
          </View>
        )}

        {/* Navigation Controls */}
        <View style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 20,
        }}>
          <Pressable
            onPress={goToPrevious}
            disabled={currentItemIndex === 0}
            style={{
              flex: 1,
              padding: 16,
              backgroundColor: currentItemIndex === 0 ? "#f8f9fa" : "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: currentItemIndex === 0 ? "#dee2e6" : "#e9ecef",
              opacity: currentItemIndex === 0 ? 0.5 : 1,
            }}
          >
            <Text style={{
              textAlign: "center",
              fontWeight: "600",
              color: currentItemIndex === 0 ? "#6c757d" : "#212529",
            }}>
              ← Previous
            </Text>
          </Pressable>

          <Pressable
            onPress={goToNext}
            disabled={currentItemIndex === items.length - 1}
            style={{
              flex: 1,
              padding: 16,
              backgroundColor: currentItemIndex === items.length - 1 ? "#f8f9fa" : "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: currentItemIndex === items.length - 1 ? "#dee2e6" : "#e9ecef",
              opacity: currentItemIndex === items.length - 1 ? 0.5 : 1,
            }}
          >
            <Text style={{
              textAlign: "center",
              fontWeight: "600",
              color: currentItemIndex === items.length - 1 ? "#6c757d" : "#212529",
            }}>
              Next →
            </Text>
          </Pressable>
        </View>

        {/* Complete Section Button */}
        {allItemsViewed && (
          <Pressable
            onPress={completeSection}
            style={{
              marginTop: 20,
              padding: 16,
              backgroundColor: sectionInfo.borderColor,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Text style={{ 
              color: "white", 
              textAlign: "center", 
              fontWeight: "600",
              fontSize: 16,
            }}>
              Complete {sectionInfo.title}
            </Text>
          </Pressable>
        )}

        {/* Progress indicator */}
        {!allItemsViewed && (
          <View style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: "#fff3cd",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#ffeaa7",
          }}>
            <Text style={{
              textAlign: "center",
              fontSize: 14,
              color: "#856404",
              fontWeight: "500",
            }}>
              View all {items.length} items to complete section ({viewedItems.size}/{items.length} viewed)
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
