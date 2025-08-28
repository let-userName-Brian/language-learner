import { CircularProgress } from "@/components/CircularProgress";
import { ErrorPages } from "@/components/ErrorPage";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
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
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#9C27B0",
      "#F44336",
      "#00BCD4",
      "#FF5722",
      "#3F51B5",
      "#795548",
      "#607D8B",
    ];
    return colors[unitIndex % 10];
  };

  const getUnitLightColor = (unitIndex: number) => {
    const lightColors = [
      "#66BB6A",
      "#42A5F5",
      "#FFB74D",
      "#BA68C8",
      "#EF5350",
      "#26C6DA",
      "#FF7043",
      "#5C6BC0",
      "#8D6E63",
      "#78909C",
    ];
    return lightColors[unitIndex % 10];
  };

  const getUnitIcon = (unitIndex: number) => {
    const icons = [
      "star",
      "rocket",
      "trophy",
      "diamond",
      "flame",
      "flash",
      "heart",
      "medal",
      "ribbon",
      "shield",
    ];
    return icons[unitIndex % 10];
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        {/* Compact Header Skeleton */}
        <View
          style={{
            height: 120,
            backgroundColor: "#667eea",
            position: "relative",
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 16,
              left: 20,
              right: 20,
            }}
          >
            <View
              style={{
                height: 12,
                backgroundColor: "rgba(255,255,255,0.3)",
                borderRadius: 6,
                width: "30%",
                marginBottom: 4,
              }}
            />
            <View
              style={{
                height: 16,
                backgroundColor: "rgba(255,255,255,0.4)",
                borderRadius: 8,
                width: "50%",
                marginBottom: 4,
              }}
            />
            <View
              style={{
                height: 10,
                backgroundColor: "rgba(255,255,255,0.3)",
                borderRadius: 5,
                width: "40%",
              }}
            />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingTop: 16 }}
          contentContainerStyle={{ padding: 16 }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((index) => (
            <LessonSkeleton key={index} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (err) return ErrorPages.LessonNotFound();

  const handleRefresh = async () => {
    await loadLessonsAsUnits();
  };

  // Calculate overall progress
  const totalSections = lessonUnits.reduce(
    (sum, unit) => sum + unit.progress.total,
    0
  );
  const completedSections = lessonUnits.reduce(
    (sum, unit) => sum + unit.progress.completed,
    0
  );
  const overallProgress =
    totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Compact Enhanced Header */}
      <View
        style={{
          height: 100,
          backgroundColor: "#667eea",
          position: "relative",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          marginBottom: 16,
        }}
      >
        {/* Subtle overlay for depth */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(118, 75, 162, 0.3)",
          }}
        />

        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 20,
            right: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              {schoolName && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    fontWeight: "500",
                    marginBottom: 2,
                  }}
                >
                  {schoolName}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: "white",
                  marginBottom: 4,
                }}
              >
                {courseTitle || "Your Lessons"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                {completedSections} of {totalSections} sections complete
              </Text>
            </View>

            {/* Compact Progress Circle */}
            <CircularProgress
              percentage={overallProgress}
              size={58}
              strokeWidth={6}
              color="white"
              backgroundColor="rgba(255,255,255,0.3)"
            />
          </View>
        </View>
      </View>

      <PullToRefresh onRefresh={handleRefresh}>
        <ScrollView
          style={{ flex: 1, marginTop: -12 }}
          contentContainerStyle={{
            padding: 16,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {lessonUnits.map((lessonUnit, index) => {
            const isExpanded = expandedLessons.has(lessonUnit.lesson_id);
            const unitColor = getUnitColor(index);
            const unitLightColor = getUnitLightColor(index);
            const progressPercentage =
              lessonUnit.progress.total > 0
                ? (lessonUnit.progress.completed / lessonUnit.progress.total) *
                  100
                : 0;

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
                {/* Enhanced Lesson Header */}
                <Pressable
                  onPress={() => toggleLesson(lessonUnit.lesson_id)}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 16,
                    borderBottomLeftRadius: isExpanded ? 4 : 16,
                    borderBottomRightRadius: isExpanded ? 4 : 16,
                    shadowColor: unitColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                    overflow: "hidden",
                  }}
                >
                  {/*  Bar at Top */}
                  <View
                    style={{
                      height: 4,
                      backgroundColor: "#f1f5f9",
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `100%`,
                        backgroundColor: unitColor,
                      }}
                    />
                  </View>

                  <View style={{ padding: 20 }}>
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
                          gap: 16,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          {/* Unit Context */}
                          <View
                            style={{
                              backgroundColor: `${unitColor}15`,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                              alignSelf: "flex-start",
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: unitColor,
                                fontWeight: "700",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              {lessonUnit.unit_title}
                            </Text>
                          </View>

                          {/* Lesson Title */}
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "800",
                              color: "#1e293b",
                            }}
                          >
                            {lessonUnit.lesson_title}
                          </Text>

                          {/* Progress Text */}

                          <View
                            style={{ alignItems: "flex-start", width: "100%" }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                color: "#64748b",
                                fontWeight: "600",
                                marginBottom: 4,
                              }}
                            >
                              {lessonUnit.progress.completed} of{" "}
                              {lessonUnit.progress.total}
                            </Text>

                            {/* Line Progress Bar */}
                            <View
                              style={{
                                width: 80,
                                height: 6,
                                backgroundColor: "#f1f5f9",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <View
                                style={{
                                  height: "100%",
                                  width: `${progressPercentage}%`,
                                  backgroundColor: unitColor,
                                  borderRadius: 3,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        {/* Animated Expand Button */}
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: `${unitColor}10`,
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 2,
                            borderColor: `${unitColor}30`,
                          }}
                        >
                          <Animated.View
                            style={{
                              transform: [{ rotate: rotateInterpolate }],
                            }}
                          >
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={unitColor}
                            />
                          </Animated.View>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>

                {/* Enhanced Expanded Sections */}
                {isExpanded && (
                  <View
                    style={{
                      backgroundColor: "white",
                      borderTopWidth: 0,
                      borderBottomLeftRadius: 16,
                      borderBottomRightRadius: 16,
                      shadowColor: unitColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 2,
                      overflow: "hidden",
                    }}
                  >
                    {/* Connecting Line */}
                    <View
                      style={{
                        height: 2,
                        backgroundColor: `${unitColor}20`,
                        marginHorizontal: 20,
                      }}
                    />

                    <View style={{ padding: 16 }}>
                      {lessonUnit.sections.map((section, sectionIndex) => (
                        <Link
                          key={section.type}
                          href={`/lesson/section?id=${lessonUnit.lesson_id}&type=${section.type}&from=lessons`}
                          asChild
                        >
                          <Pressable
                            style={{
                              backgroundColor: section.completed
                                ? `${unitColor}08`
                                : "#f8fafc",
                              padding: 16,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderColor: section.completed
                                ? `${unitColor}40`
                                : "#e2e8f0",
                              marginBottom:
                                sectionIndex === lessonUnit.sections.length - 1
                                  ? 0
                                  : 12,
                              shadowColor: section.completed
                                ? unitColor
                                : "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: section.completed ? 0.1 : 0.05,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 16,
                              }}
                            >
                              {/* Section Icon */}
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 22,
                                  backgroundColor: section.completed
                                    ? unitColor
                                    : "#94a3b8",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  shadowColor: section.completed
                                    ? unitColor
                                    : "#000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 4,
                                  elevation: 2,
                                }}
                              >
                                <Ionicons
                                  name={getSectionIcon(section.type) as any}
                                  size={22}
                                  color="white"
                                />
                              </View>

                              {/* Section Info */}
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: "#1e293b",
                                    marginBottom: 2,
                                  }}
                                >
                                  {getSectionName(section.type)}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    color: "#64748b",
                                    fontWeight: "500",
                                  }}
                                >
                                  {section.count} items
                                </Text>
                              </View>

                              {/* Status */}
                              <View style={{ alignItems: "center" }}>
                                {section.completed ? (
                                  <View
                                    style={{
                                      backgroundColor: `${unitColor}20`,
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 16,
                                      borderWidth: 1,
                                      borderColor: `${unitColor}40`,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: "800",
                                        color: unitColor,
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                      }}
                                    >
                                      ✓ Done
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: "#f1f5f9",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      borderWidth: 2,
                                      borderColor: "#e2e8f0",
                                    }}
                                  >
                                    <Ionicons
                                      name="chevron-forward"
                                      size={16}
                                      color="#64748b"
                                    />
                                  </View>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        </Link>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </PullToRefresh>
    </View>
  );
}
