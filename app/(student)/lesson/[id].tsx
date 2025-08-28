import { CircularProgress } from "@/components/CircularProgress";
import ErrorPage, { ErrorPages } from "@/components/ErrorPage";
import { LessonItemSkeleton } from "@/components/LessonItemSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
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

type ItemSection = {
  type: string;
  title: string;
  icon: string;
  items: ItemRow[];
  color: string;
  borderColor: string;
  completed: boolean;
};

export default function LessonScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    from?: string;
  }>();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const from = params.from || "home";

  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [sections, setSections] = useState<ItemSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!lessonId) return;
    loadLessonData();
  }, [lessonId]);

  useFocusEffect(
    useCallback(() => {
      if (sections.length > 0) loadSectionProgress(sections);
    }, [sections, lessonId])
  );

  const loadLessonData = async () => {
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

      // Organize items into pedagogical sections
      const itemsByType = (it || []).reduce(
        (acc: { [key: string]: ItemRow[] }, item: ItemRow) => {
          if (!acc[item.kind]) acc[item.kind] = [];
          acc[item.kind].push(item);
          return acc;
        },
        {}
      );

      const sectionOrder = [
        {
          type: "vocab",
          title: "Vocabulary",
          icon: "📚",
          color: "#f3e5f5",
          borderColor: "#9C27B0",
        },
        {
          type: "sentence",
          title: "Sentences",
          icon: "📝",
          color: "#e3f2fd",
          borderColor: "#2196F3",
        },
        {
          type: "picture-match",
          title: "Picture Match",
          icon: "🖼️",
          color: "#e8f5e8",
          borderColor: "#4CAF50",
        },
        {
          type: "tile-build",
          title: "Tile Builder",
          icon: "🧩",
          color: "#fff3e0",
          borderColor: "#FF9800",
        },
      ];

      const organizedSections: ItemSection[] = sectionOrder
        .filter((sectionDef) => itemsByType[sectionDef.type]?.length > 0)
        .map((sectionDef) => ({
          ...sectionDef,
          items: itemsByType[sectionDef.type],
          completed: false,
        }));

      setSections(organizedSections);

      await loadSectionProgress(organizedSections);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  const loadSectionProgress = async (sections: ItemSection[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: progress } = await supabase
        .from("progress")
        .select("lesson_id, status, last_position")
        .eq("user_id", user.user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (progress?.last_position?.completed_sections) {
        setCompletedSections(
          new Set(progress.last_position.completed_sections)
        );
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const handleBack = () => {
    if (from === "lessons") router.push("/(student)/lessons");
    else if (from === "home") router.push("/(student)/home");
    else router.push("/(student)/lessons");
  };

  const allSectionsCompleted = sections.every((section) =>
    completedSections.has(section.type)
  );

  const getSectionColor = (type: string) => {
    switch (type) {
      case "vocab":
        return { main: "#9C27B0", light: "#E1BEE7", background: "#F3E5F5" };
      case "sentence":
        return { main: "#2196F3", light: "#90CAF9", background: "#E3F2FD" };
      case "picture-match":
        return { main: "#4CAF50", light: "#A5D6A7", background: "#E8F5E8" };
      case "tile-build":
        return { main: "#FF9800", light: "#FFCC02", background: "#FFF3E0" };
      default:
        return { main: "#607D8B", light: "#90A4AE", background: "#ECEFF1" };
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "vocab":
        return "book-outline";
      case "sentence":
        return "create-outline";
      case "picture-match":
        return "image-outline";
      case "tile-build":
        return "grid-outline";
      default:
        return "document-outline";
    }
  };

  if (loading) return <LessonItemSkeleton />;

  if (err || !lesson) {
    if (err) {
      return (
        <ErrorPage
          title="Failed to Load Lesson"
          message={err}
          subMessage="Please check your connection and try again"
          buttonText="Back to Lessons"
          onButtonPress={() => router.push("/(student)/lessons")}
        />
      );
    }
    return ErrorPages.LessonNotFound();
  }

  const completionPercentage = sections.length > 0 ? (completedSections.size / sections.length) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Enhanced Header - Match lessons page size */}
      <View style={{
        backgroundColor: "#667eea",
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 20,
        height: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
        {/* Subtle overlay */}
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(118, 75, 162, 0.3)",
        }} />

        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          gap: 16,
          position: "relative",
          zIndex: 1,
          marginTop: 'auto',
          marginBottom: 'auto',
        }}>
          <Pressable
            onPress={handleBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: "800",
              color: "white",
              marginBottom: 2,
            }}>
              {lesson.title}
            </Text>
            <Text style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.9)",
              fontWeight: "500",
            }}>
              {completedSections.size} of {sections.length} sections completed
            </Text>
          </View>

          {/* Circular Progress - Match lessons page size */}
          <CircularProgress 
            percentage={completionPercentage}
            size={48}
            strokeWidth={4}
            color="white"
            backgroundColor="rgba(255,255,255,0.3)"
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Section Cards */}
        {sections.map((section, index) => {
          const isCompleted = completedSections.has(section.type);
          const isLocked = index > 0 && !completedSections.has(sections[index - 1].type);
          const colors = getSectionColor(section.type);

          return (
            <View
              key={section.type}
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                marginBottom: 16,
                overflow: "hidden",
                shadowColor: colors.main,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isCompleted ? 0.15 : 0.1,
                shadowRadius: 8,
                elevation: 4,
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              {/* Enhanced Section Header */}
              <View style={{
                backgroundColor: isCompleted ? colors.background : isLocked ? "#f8fafc" : colors.background,
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#f1f5f9",
              }}>
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    flex: 1,
                  }}>
                    {/* Enhanced Icon */}
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isCompleted ? "#4CAF50" : isLocked ? "#94a3b8" : colors.main,
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: isCompleted ? "#4CAF50" : colors.main,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                      <Ionicons
                        name={getSectionIcon(section.type) as any}
                        size={24}
                        color="white"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      {/* Section Badge */}
                      <View style={{
                        backgroundColor: isCompleted ? "#4CAF5020" : `${colors.main}15`,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 8,
                        alignSelf: "flex-start",
                        marginBottom: 4,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: isCompleted ? "#4CAF50" : colors.main,
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}>
                          Section {index + 1}
                        </Text>
                      </View>

                      <Text style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: isLocked ? "#64748b" : "#1e293b",
                        marginBottom: 2,
                      }}>
                        {section.title}
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: "#64748b",
                        fontWeight: "500",
                      }}>
                        {section.items.length} items to learn
                      </Text>
                    </View>
                  </View>

                  {/* Enhanced Status Badge */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isCompleted ? "#4CAF50" : isLocked ? "#94a3b8" : colors.main,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: isCompleted ? "#4CAF50" : colors.main,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={20} color="white" />
                    ) : isLocked ? (
                      <Ionicons name="lock-closed" size={16} color="white" />
                    ) : (
                      <Text style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "800",
                      }}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Enhanced Section Content */}
              <View style={{ padding: 20 }}>
                {isLocked ? (
                  <View style={{
                    alignItems: "center",
                    paddingVertical: 20,
                  }}>
                    <View style={{
                      backgroundColor: "#f8fafc",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                    }}>
                      <Text style={{
                        fontSize: 16,
                        color: "#64748b",
                        textAlign: "center",
                        fontWeight: "600",
                      }}>
                        Complete "{sections[index - 1]?.title}" first
                      </Text>
                    </View>
                  </View>
                ) : isCompleted ? (
                  <View style={{
                    alignItems: "center",
                    paddingVertical: 20,
                  }}>
                    <View style={{
                      backgroundColor: "#4CAF5010",
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#4CAF5040",
                    }}>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#4CAF50",
                        textAlign: "center",
                        marginBottom: 4,
                      }}>
                        Section Completed! 🎉
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: "#388E3C",
                        textAlign: "center",
                        fontWeight: "500",
                      }}>
                        You've mastered this section
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* Enhanced Preview */}
                    <View>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: 12,
                      }}>
                        What you'll learn:
                      </Text>
                      {section.items.slice(0, 3).map((item, itemIndex) => (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 8,
                            backgroundColor: "#f8fafc",
                            padding: 12,
                            borderRadius: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: colors.main,
                          }}
                        >
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.main,
                          }} />
                          <Text style={{
                            fontSize: 15,
                            color: "#334155",
                            flex: 1,
                            fontWeight: "500",
                          }} numberOfLines={1}>
                            {item.latin}
                          </Text>
                        </View>
                      ))}
                      {section.items.length > 3 && (
                        <Text style={{
                          fontSize: 13,
                          color: "#64748b",
                          marginTop: 8,
                          fontWeight: "500",
                          textAlign: "center",
                        }}>
                          +{section.items.length - 3} more items to discover
                        </Text>
                      )}
                    </View>

                    {/* Enhanced Start Button */}
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(student)/lesson/section?id=${lessonId}&type=${section.type}&from=lesson`
                        )
                      }
                      style={{
                        backgroundColor: colors.main,
                        padding: 16,
                        borderRadius: 12,
                        alignItems: "center",
                        shadowColor: colors.main,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                    >
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}>
                        <Text style={{
                          color: "white",
                          fontSize: 16,
                          fontWeight: "700",
                        }}>
                          Start {section.title}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Enhanced Overall Completion */}
        {allSectionsCompleted && (
          <View style={{
            backgroundColor: "white",
            padding: 24,
            borderRadius: 20,
            alignItems: "center",
            shadowColor: "#4CAF50",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 2,
            borderColor: "#4CAF5040",
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#4CAF50",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              shadowColor: "#4CAF50",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <Ionicons name="trophy" size={40} color="white" />
            </View>
            <Text style={{
              fontSize: 24,
              fontWeight: "800",
              color: "#4CAF50",
              marginBottom: 8,
            }}>
              Lesson Complete!
            </Text>
            <Text style={{
              fontSize: 16,
              color: "#388E3C",
              textAlign: "center",
              fontWeight: "500",
              lineHeight: 22,
            }}>
              Excellent work! You've mastered all sections{"\n"}of this lesson.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
