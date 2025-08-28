import ErrorPage, { ErrorPages } from "@/components/ErrorPage";
import { LessonItemSkeleton } from "@/components/LessonItemSkeleton";
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

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
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
        }}
      >
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
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#212529",
              }}
            >
              {lesson.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6c757d",
                marginTop: 2,
              }}
            >
              {completedSections.size} of {sections.length} sections completed
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {/* Progress Overview */}
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e9ecef",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#212529",
              marginBottom: 12,
            }}
          >
            Learning Sections
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: "#e9ecef",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: `${(completedSections.size / sections.length) * 100}%`,
                height: "100%",
                backgroundColor: "#4CAF50",
                borderRadius: 4,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              color: "#6c757d",
            }}
          >
            {Math.round((completedSections.size / sections.length) * 100)}%
            Complete
          </Text>
        </View>

        {/* Section Cards */}
        {sections.map((section, index) => {
          const isCompleted = completedSections.has(section.type);
          const isPrevious =
            index > 0 && !completedSections.has(sections[index - 1].type);
          const isLocked =
            index > 0 && !completedSections.has(sections[index - 1].type);

          return (
            <View
              key={section.type}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                borderWidth: 2,
                borderColor: isCompleted
                  ? section.borderColor
                  : isLocked
                  ? "#dee2e6"
                  : "#e9ecef",
                opacity: isLocked ? 0.6 : 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {/* Section Header */}
              <View
                style={{
                  backgroundColor: isCompleted
                    ? section.color
                    : isLocked
                    ? "#f8f9fa"
                    : section.color,
                  padding: 16,
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e9ecef",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{section.icon}</Text>
                    <View>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: isLocked ? "#6c757d" : section.borderColor,
                        }}
                      >
                        {section.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isLocked ? "#6c757d" : section.borderColor,
                        }}
                      >
                        {section.items.length} items
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isCompleted
                        ? "#4CAF50"
                        : isLocked
                        ? "#6c757d"
                        : section.borderColor,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      {isCompleted ? "✓" : isLocked ? "🔒" : index + 1}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section Content */}
              <View style={{ padding: 16 }}>
                {isLocked ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#6c757d",
                        textAlign: "center",
                      }}
                    >
                      Complete "{sections[index - 1]?.title}" first
                    </Text>
                  </View>
                ) : isCompleted ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#4CAF50",
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      Section Completed! 🎉
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6c757d",
                        textAlign: "center",
                      }}
                    >
                      You've mastered this section
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* Preview of items */}
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#212529",
                          marginBottom: 8,
                        }}
                      >
                        What you'll learn:
                      </Text>
                      {section.items.slice(0, 3).map((item, itemIndex) => (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: section.borderColor,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#495057",
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {item.latin}
                          </Text>
                        </View>
                      ))}
                      {section.items.length > 3 && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6c757d",
                            marginTop: 4,
                            fontStyle: "italic",
                          }}
                        >
                          +{section.items.length - 3} more items
                        </Text>
                      )}
                    </View>

                    {/* Start Section Button */}
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(student)/lesson/section?id=${lessonId}&type=${section.type}&from=lesson`
                        )
                      }
                      style={{
                        backgroundColor: section.borderColor,
                        padding: 16,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Start {section.title}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Overall Completion */}
        {allSectionsCompleted && (
          <View
            style={{
              backgroundColor: "#e8f5e8",
              padding: 20,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "#4CAF50",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 24,
                marginBottom: 8,
              }}
            >
              🎉
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#4CAF50",
                marginBottom: 4,
              }}
            >
              Lesson Complete!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#388E3C",
                textAlign: "center",
              }}
            >
              Great job! You've completed all sections of this lesson.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
