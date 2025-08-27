import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { supabase } from "../../services/supabase-init";

type LessonWithDetails = {
  id: string;
  title: string;
  unit_id: string;
  order: number;
  status?: "not_started" | "in_progress" | "completed";
  item_counts: {
    sentence: number;
    vocab: number;
    "picture-match": number;
    "tile-build": number;
    total: number;
  };
};

type UnitData = {
  id: string;
  title?: string;
  name?: string;
  order?: number;
};

type UnitGroup = {
  unit_id: string;
  unit_title: string;
  lessons: LessonWithDetails[];
  progress: {
    completed: number;
    total: number;
  };
};

export default function Lessons() {
  const [units, setUnits] = useState<UnitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [schoolName, setSchoolName] = useState<string>("");
  const [progressData, setProgressData] = useState<any[]>([]);
  
  // Animation values for each unit
  const [rotationValues] = useState<{ [key: string]: Animated.Value }>({});

  useFocusEffect(
    useCallback(() => {
      loadLessonsGroupedByUnit();
    }, [])
  );

  const loadLessonsGroupedByUnit = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: user } = await supabase.auth.getUser();

      // Get user's school information
      if (user.user) {
        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select(
            `
            school_id,
            schools!inner(name)
          `
          )
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

      // Try to get units data first
      const { data: unitsData } = await supabase
        .from("units")
        .select("*")
        .order("order");

      // Get all lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .order("order");

      if (lessonsError) throw lessonsError;

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
      setProgressData(progressData);

      // Create unit lookup map
      const unitLookup: { [key: string]: string } = {};
      if (unitsData) {
        unitsData.forEach((unit: UnitData) => {
          // Use title, name, or fallback to ID
          unitLookup[unit.id] = unit.title || unit.name || `Unit ${unit.id}`;
        });
      }

      // Process lessons with item counts and ACTUAL section progress
      const lessonsWithDetails: LessonWithDetails[] = (lessonsData || []).map(
        (lesson) => {
          const lessonItems =
            itemsData?.filter((item) => item.lesson_id === lesson.id) || [];
          const progress = progressData.find((p) => p.lesson_id === lesson.id);

          const itemCounts = {
            sentence: lessonItems.filter((i) => i.kind === "sentence").length,
            vocab: lessonItems.filter((i) => i.kind === "vocab").length,
            "picture-match": lessonItems.filter(
              (i) => i.kind === "picture-match"
            ).length,
            "tile-build": lessonItems.filter((i) => i.kind === "tile-build")
              .length,
            total: lessonItems.length,
          };

          // Calculate ACTUAL status based on completed sections
          let actualStatus: "not_started" | "in_progress" | "completed" = "not_started";
          
          if (progress?.last_position?.completed_sections) {
            const completedSections = progress.last_position.completed_sections;
            const availableTypes = ["vocab", "sentence", "picture-match", "tile-build"].filter(
              type => itemCounts[type as keyof typeof itemCounts] > 0
            );
            
            if (completedSections.length === 0) {
              actualStatus = "not_started";
            } else if (completedSections.length === availableTypes.length) {
              actualStatus = "completed";
            } else {
              actualStatus = "in_progress";
            }
          } else if (progress?.status) {
            // Fallback to old status if no section data
            actualStatus = progress.status;
          }

          return {
            ...lesson,
            status: actualStatus,
            item_counts: itemCounts,
          };
        }
      );

      // Group by unit_id
      const unitGroups: { [key: string]: UnitGroup } = {};
      lessonsWithDetails.forEach((lesson) => {
        if (!unitGroups[lesson.unit_id]) {
          unitGroups[lesson.unit_id] = {
            unit_id: lesson.unit_id,
            // Use actual unit title from database or fallback
            unit_title:
              unitLookup[lesson.unit_id] ||
              `Unit ${lesson.unit_id.slice(0, 8)}...`,
            lessons: [],
            progress: { completed: 0, total: 0 },
          };
        }
        unitGroups[lesson.unit_id].lessons.push(lesson);
      });

      // Calculate progress for each unit based on SECTIONS completed
      Object.values(unitGroups).forEach((unit) => {
        let totalSections = 0;
        let completedSections = 0;
        
        unit.lessons.forEach((lesson) => {
          // Count available section types for this lesson
          const availableTypes = ["vocab", "sentence", "picture-match", "tile-build"].filter(
            type => lesson.item_counts[type as keyof typeof lesson.item_counts] > 0
          );
          totalSections += availableTypes.length;
          
          // Count completed sections for this lesson
          const progress = progressData.find((p) => p.lesson_id === lesson.id);
          if (progress?.last_position?.completed_sections) {
            completedSections += progress.last_position.completed_sections.length;
          }
        });
        
        unit.progress.total = totalSections;
        unit.progress.completed = completedSections;
        unit.lessons.sort((a, b) => a.order - b.order);
      });

      // Sort units by their first lesson's order (or unit order if available)
      const sortedUnits = Object.values(unitGroups).sort((a, b) => {
        // If we have units data with order, use that
        const aUnitOrder = unitsData?.find(
          (u: UnitData) => u.id === a.unit_id
        )?.order;
        const bUnitOrder = unitsData?.find(
          (u: UnitData) => u.id === b.unit_id
        )?.order;

        if (aUnitOrder !== undefined && bUnitOrder !== undefined) {
          return aUnitOrder - bUnitOrder;
        }

        // Fallback to first lesson order
        const aFirstOrder = Math.min(...a.lessons.map((l) => l.order));
        const bFirstOrder = Math.min(...b.lessons.map((l) => l.order));
        return aFirstOrder - bFirstOrder;
      });

      setUnits(sortedUnits);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    const isExpanding = !newExpanded.has(unitId);
    
    // Initialize rotation value if it doesn't exist
    if (!rotationValues[unitId]) {
      rotationValues[unitId] = new Animated.Value(0);
    }
    
    // Animate rotation
    Animated.timing(rotationValues[unitId], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "in_progress":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "◐";
      default:
        return "○";
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "sentence":
        return "📝";
      case "vocab":
        return "📚";
      case "picture-match":
        return "🖼️";
      case "tile-build":
        return "🧩";
      default:
        return "📄";
    }
  };

  const getUnitCompletionBadge = (completed: number, total: number) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const isComplete = percentage === 100;

    return (
      <View
        style={{
          backgroundColor: isComplete ? "#4CAF50" : "#e9ecef",
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
            color: isComplete ? "white" : "#6c757d",
          }}
        >
          {isComplete ? "✓ Done" : `${Math.round(percentage)}%`}
        </Text>
      </View>
    );
  };

  const getLessonSectionProgress = (lesson: LessonWithDetails, progressData: any[]) => {
    const progress = progressData.find((p) => p.lesson_id === lesson.id);
    const completedSections = progress?.last_position?.completed_sections || [];
    
    const availableTypes = ["vocab", "sentence", "picture-match", "tile-build"].filter(
      type => lesson.item_counts[type as keyof typeof lesson.item_counts] > 0
    );
    
    return {
      completed: completedSections.length,
      total: availableTypes.length,
      completedSections,
      availableTypes
    };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (err) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "red" }}>{err}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Enhanced Header with School Name */}
      <View style={{ marginBottom: 20 }}>
        {schoolName && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: "#6c757d",
                fontWeight: "500",
              }}
            >
              {schoolName}
            </Text>
            <Text style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}>
              - All Lessons
            </Text>
          </View>
        )}
      </View>

      {units.map((unit) => {
        const isExpanded = expandedUnits.has(unit.unit_id);
        
        // Initialize rotation value if it doesn't exist
        if (!rotationValues[unit.unit_id]) {
          rotationValues[unit.unit_id] = new Animated.Value(isExpanded ? 1 : 0);
        }
        
        const rotateInterpolate = rotationValues[unit.unit_id].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        });

        return (
          <View key={unit.unit_id} style={{ marginBottom: 16 }}>
            {/* Unit Header */}
            <Pressable
              onPress={() => toggleUnit(unit.unit_id)}
              style={{
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: isExpanded ? 12 : 12,
                borderBottomLeftRadius: isExpanded ? 4 : 12,
                borderBottomRightRadius: isExpanded ? 4 : 12,
                borderWidth: 1,
                borderColor: "#e9ecef",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
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
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#212529",
                    }}
                  >
                    {unit.unit_title}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#6c757d", marginTop: 2 }}
                  >
                    {unit.progress.completed} of {unit.progress.total} lessons
                    completed
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Completion Badge */}
                  {getUnitCompletionBadge(
                    unit.progress.completed,
                    unit.progress.total
                  )}

                  {/* Animated Caret */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#f8f9fa",
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#e9ecef",
                    }}
                  >
                    <Animated.Text
                      style={{
                        fontSize: 14,
                        color: "#6c757d",
                        transform: [{ rotate: rotateInterpolate }],
                      }}
                    >
                      ▼
                    </Animated.Text>
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Connected Dropdown Lessons */}
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
                {unit.lessons.map((lesson, index) => (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}?from=lessons`}
                    asChild
                  >
                    <Pressable
                      style={{
                        backgroundColor: "#fff",
                        padding: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          lesson.status === "completed"
                            ? "#4CAF50"
                            : lesson.status === "in_progress"
                            ? "#FF9800"
                            : "#e9ecef",
                        marginBottom: index === unit.lessons.length - 1 ? 0 : 8,
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
                        {/* Enhanced Status Icon */}
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: getStatusColor(lesson.status),
                            justifyContent: "center",
                            alignItems: "center",
                            shadowColor: getStatusColor(lesson.status),
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}
                          >
                            {getStatusIcon(lesson.status)}
                          </Text>
                        </View>

                        {/* Lesson Info */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              marginBottom: 4,
                              color: "#212529",
                            }}
                          >
                            {lesson.title}
                          </Text>

                          {/* Add Section Progress Bar */}
                          {(() => {
                            const sectionProgress = getLessonSectionProgress(lesson, progressData);
                            const progressPercent = sectionProgress.total > 0 ? (sectionProgress.completed / sectionProgress.total) * 100 : 0;
                            
                            return (
                              <View style={{ marginBottom: 8 }}>
                                <View style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 4
                                }}>
                                  <Text style={{ fontSize: 12, color: "#6c757d" }}>
                                    Sections: {sectionProgress.completed}/{sectionProgress.total}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "500" }}>
                                    {Math.round(progressPercent)}%
                                  </Text>
                                </View>
                                
                                {/* Progress Bar */}
                                <View style={{
                                  height: 4,
                                  backgroundColor: "#e9ecef",
                                  borderRadius: 2,
                                  overflow: "hidden"
                                }}>
                                  <View style={{
                                    height: "100%",
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressPercent === 100 ? "#4CAF50" : "#FF9800",
                                    borderRadius: 2
                                  }} />
                                </View>
                              </View>
                            );
                          })()}

                          {/* Enhanced Item Types */}
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            {lesson.item_counts.sentence > 0 && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  backgroundColor: "#e3f2fd",
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 12,
                                }}
                              >
                                <Text style={{ fontSize: 12 }}>
                                  {getItemTypeIcon("sentence")}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#1976D2",
                                    fontWeight: "500",
                                  }}
                                >
                                  {lesson.item_counts.sentence}
                                </Text>
                              </View>
                            )}
                            {lesson.item_counts.vocab > 0 && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  backgroundColor: "#f3e5f5",
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 12,
                                }}
                              >
                                <Text style={{ fontSize: 12 }}>
                                  {getItemTypeIcon("vocab")}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#7B1FA2",
                                    fontWeight: "500",
                                  }}
                                >
                                  {lesson.item_counts.vocab}
                                </Text>
                              </View>
                            )}
                            {lesson.item_counts["picture-match"] > 0 && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  backgroundColor: "#e8f5e8",
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 12,
                                }}
                              >
                                <Text style={{ fontSize: 12 }}>
                                  {getItemTypeIcon("picture-match")}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#388E3C",
                                    fontWeight: "500",
                                  }}
                                >
                                  {lesson.item_counts["picture-match"]}
                                </Text>
                              </View>
                            )}
                            {lesson.item_counts["tile-build"] > 0 && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  backgroundColor: "#fff3e0",
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 12,
                                }}
                              >
                                <Text style={{ fontSize: 12 }}>
                                  {getItemTypeIcon("tile-build")}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#F57C00",
                                    fontWeight: "500",
                                  }}
                                >
                                  {lesson.item_counts["tile-build"]}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={{
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {lesson.status === "completed" && (
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
                          )}
                          <Text style={{ color: "#999", fontSize: 16 }}>→</Text>
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
