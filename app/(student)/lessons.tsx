import { ErrorPages } from "@/components/ErrorPage";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { supabase } from "../../services/supabase-init";

type LessonUnit = {
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  unit_title: string;
  sections: {
    type: string;
    count: number;
    completed: boolean;
  }[];
  progress: {
    completed: number;
    total: number;
  };
  status: "not_started" | "in_progress" | "completed";
};

export default function Lessons() {
  const [lessonUnits, setLessonUnits] = useState<LessonUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    new Set()
  );
  const [schoolName, setSchoolName] = useState<string>("");
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [rotationValues] = useState<{ [key: string]: Animated.Value }>({});

  useFocusEffect(
    useCallback(() => {
      loadLessonsAsUnits();
    }, [])
  );

  const loadLessonsAsUnits = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Get user's school information
      if (user.user) {
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select(`school_id, schools!inner(name)`)
          .eq("user_id", user.user.id)
          .single();
        if (
          userProfile?.schools &&
          typeof userProfile.schools === "object" &&
          "name" in userProfile.schools
        ) {
          setSchoolName(userProfile.schools.name as string);
        }
      }

      // Get lessons with unit and course info
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select(
          `
          id,
          title,
          order,
          unit_id,
          units!inner(title, course_id, courses!inner(title))
        `
        )
        .order("order");

      if (lessonsError) throw lessonsError;

      // Extract course title from the first lesson's unit
      if (lessonsData && lessonsData.length > 0) {
        const firstLesson = lessonsData[0];
        const courseData = (firstLesson.units as any)?.courses;
        if (courseData?.title) setCourseTitle(courseData.title);
        else setCourseTitle("Your Lessons");
      }

      // Get all items to count by type for each lesson
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("lesson_id, kind");

      if (itemsError) throw itemsError;

      // Get progress if user is signed in
      let progressData: any[] = [];
      if (user.user) {
        const { data: progress } = await supabase
          .from("progress")
          .select("lesson_id, status, last_position")
          .eq("user_id", user.user.id);
        progressData = progress || [];
      }

      // Transform lessons into lesson units
      const lessonUnits: LessonUnit[] = (lessonsData || []).map((lesson) => {
        const lessonItems =
          itemsData?.filter((item) => item.lesson_id === lesson.id) || [];
        const progress = progressData.find((p) => p.lesson_id === lesson.id);

        // Create sections for each item type
        const sections = [
          {
            type: "vocab",
            count: lessonItems.filter((i) => i.kind === "vocab").length,
          },
          {
            type: "sentence",
            count: lessonItems.filter((i) => i.kind === "sentence").length,
          },
          {
            type: "picture-match",
            count: lessonItems.filter((i) => i.kind === "picture-match").length,
          },
          {
            type: "tile-build",
            count: lessonItems.filter((i) => i.kind === "tile-build").length,
          },
        ]
          .filter((section) => section.count > 0)
          .map((section) => ({
            ...section,
            completed:
              progress?.last_position?.completed_sections?.includes(
                section.type
              ) || false,
          }));

        // Calculate overall lesson status
        let status: "not_started" | "in_progress" | "completed" = "not_started";
        const completedSections = sections.filter((s) => s.completed).length;

        if (completedSections === 0) status = "not_started";
        else if (completedSections === sections.length && sections.length > 0)
          status = "completed";
        else status = "in_progress";

        // Override with actual section-based status regardless of what's in progress.status
        return {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          lesson_order: lesson.order,
          unit_title:
            (lesson.units as any)?.title ||
            `Unit ${lesson.unit_id.slice(0, 8)}`,
          sections,
          progress: {
            completed: completedSections,
            total: sections.length,
          },
          status,
        };
      });

      setLessonUnits(lessonUnits);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    const isExpanding = !newExpanded.has(lessonId);

    if (!rotationValues[lessonId]) {
      rotationValues[lessonId] = new Animated.Value(0);
    }

    Animated.timing(rotationValues[lessonId], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "vocab":
        return "📚";
      case "sentence":
        return "📝";
      case "picture-match":
        return "🖼️";
      case "tile-build":
        return "🧩";
      default:
        return "📄";
    }
  };

  const getSectionName = (type: string) => {
    switch (type) {
      case "vocab":
        return "Vocabulary";
      case "sentence":
        return "Sentence Match";
      case "picture-match":
        return "Picture Match";
      case "tile-build":
        return "Tile Builder";
      default:
        return type;
    }
  };

  const getUnitColor = (unitIndex: number) => {
    const colors = [
      "#4CAF50", // Green - Unit 1
      "#2196F3", // Blue - Unit 2
      "#FF9800", // Orange - Unit 3
      "#9C27B0", // Purple - Unit 4
      "#F44336", // Red - Unit 5
      "#00BCD4", // Cyan - Unit 6
      "#FF5722", // Deep Orange - Unit 7
      "#3F51B5", // Indigo - Unit 8
      "#795548", // Brown - Unit 9
      "#607D8B", // Blue Grey - Unit 10
    ];
    return colors[unitIndex % 10]; // Cycle every 10 units
  };

  const getUnitIcon = (unitIndex: number) => {
    const icons = [
      "🌱", // Unit 1 - Growth/Beginning
      "⭐", // Unit 2 - Star/Achievement
      "🚀", // Unit 3 - Rocket/Progress
      "🎯", // Unit 4 - Target/Goals
      "💎", // Unit 5 - Diamond/Mastery
      "🔥", // Unit 6 - Fire/Energy
      "⚡", // Unit 7 - Lightning/Power
      "🌟", // Unit 8 - Shining Star
      "🏆", // Unit 9 - Trophy/Victory
      "👑", // Unit 10 - Crown/Excellence
    ];
    return icons[unitIndex % 10]; // Cycle every 10 units
  };

  if (loading) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Header Skeleton */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              height: 16,
              backgroundColor: "#e9ecef",
              borderRadius: 8,
              width: "40%",
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 24,
              backgroundColor: "#e9ecef",
              borderRadius: 12,
              width: "60%",
            }}
          />
        </View>
        {[1, 2, 3, 4, 5, 6, 7].map((index) => (
          <LessonSkeleton key={index} />
        ))}
      </ScrollView>
    );
  }

  if (err) return ErrorPages.LessonNotFound();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Enhanced Header with School Name and Course Title */}
      <View style={{ marginBottom: 20 }}>
        {schoolName && (
          <Text style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}>
            {schoolName}
          </Text>
        )}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#212529",
            marginTop: 4,
          }}
        >
          {courseTitle || "Your Lessons"}
        </Text>
      </View>

      {lessonUnits.map((lessonUnit, index) => {
        const isExpanded = expandedLessons.has(lessonUnit.lesson_id);

        if (!rotationValues[lessonUnit.lesson_id]) {
          rotationValues[lessonUnit.lesson_id] = new Animated.Value(
            isExpanded ? 1 : 0
          );
        }

        const rotateInterpolate = rotationValues[
          lessonUnit.lesson_id
        ].interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        });

        return (
          <View key={lessonUnit.lesson_id} style={{ marginBottom: 16 }}>
            {/* Lesson Header */}
            <Pressable
              onPress={() => toggleLesson(lessonUnit.lesson_id)}
              style={{
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: isExpanded ? 12 : 12,
                borderBottomLeftRadius: isExpanded ? 4 : 12,
                borderBottomRightRadius: isExpanded ? 4 : 12,
                borderWidth: 1,
                borderColor: "#e9ecef",
                shadowColor: getUnitColor(index),
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
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
                    flex: 1,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: getUnitColor(index),
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: getUnitColor(index),
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{getUnitIcon(index)}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    {/* Unit Context - Small Gray */}
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6c757d",
                        fontWeight: "500",
                        marginBottom: 2,
                      }}
                    >
                      {lessonUnit.unit_title}
                    </Text>

                    {/* Lesson Title - Bold and Prominent */}
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#212529",
                        marginBottom: 4,
                      }}
                    >
                      {lessonUnit.lesson_title}
                    </Text>

                    {/* Progress - Small Gray */}
                    <Text style={{ fontSize: 14, color: "#6c757d" }}>
                      {lessonUnit.progress.completed} of{" "}
                      {lessonUnit.progress.total} sections completed
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Completion Badge */}
                  <View
                    style={{
                      backgroundColor:
                        lessonUnit.progress.completed ===
                        lessonUnit.progress.total
                          ? getUnitColor(index)
                          : "#e9ecef",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      minWidth: 50,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color:
                          lessonUnit.progress.completed ===
                          lessonUnit.progress.total
                            ? "white"
                            : "#6c757d",
                      }}
                    >
                      {lessonUnit.progress.completed ===
                      lessonUnit.progress.total
                        ? "✓ Done"
                        : `${Math.round(
                            (lessonUnit.progress.completed /
                              lessonUnit.progress.total) *
                              100
                          )}%`}
                    </Text>
                  </View>

                  {/* Animated Caret */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: `${getUnitColor(index)}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: `${getUnitColor(index)}40`,
                    }}
                  >
                    <Animated.View
                      style={{ transform: [{ rotate: rotateInterpolate }] }}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={getUnitColor(index)}
                      />
                    </Animated.View>
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Connected Dropdown Sections */}
            {isExpanded && (
              <View
                style={{
                  backgroundColor: "#f8f9fa",
                  borderWidth: 1,
                  borderColor: "#e9ecef",
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  padding: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {lessonUnit.sections.map((section, sectionIndex) => (
                  <Link
                    key={section.type}
                    href={`/lesson/section?id=${lessonUnit.lesson_id}&type=${section.type}&from=lessons`}
                    asChild
                  >
                    <Pressable
                      style={{
                        backgroundColor: "#fff",
                        padding: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: section.completed ? "#4CAF50" : "#e9ecef",
                        marginBottom:
                          sectionIndex === lessonUnit.sections.length - 1
                            ? 0
                            : 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {/* Section Icon */}
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: section.completed
                              ? "#4CAF50"
                              : "#9E9E9E",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>
                            {getSectionIcon(section.type)}
                          </Text>
                        </View>

                        {/* Section Info */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: "#212529",
                            }}
                          >
                            {getSectionName(section.type)}
                          </Text>
                          <Text style={{ fontSize: 14, color: "#6c757d" }}>
                            {section.count} items
                          </Text>
                        </View>

                        {/* Status */}
                        <View style={{ alignItems: "center" }}>
                          {section.completed ? (
                            <View
                              style={{
                                backgroundColor: "#e8f5e8",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "600",
                                  color: "#4CAF50",
                                }}
                              >
                                DONE
                              </Text>
                            </View>
                          ) : (
                            <Text style={{ color: "#999", fontSize: 16 }}>
                              →
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
