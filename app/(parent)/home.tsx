import { AchievementBadge } from "@/components/AchievementBadge";
import { CircularProgress } from "@/components/CircularProgress";
import { ParentHomeSkeleton } from "@/components/ParentSkeletonHome";
import ParentStudentDetailModal from "@/components/ParentStudentDetailModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import { showErrorBanner } from "@/components/ShowAlert";
import { supabase } from "@/services/supabase-init";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface StudentProgress {
  user_id: string;
  display_name: string;
  student_id: string;
  grade_level: string;
  total_lessons: number;
  completed_lessons: number;
  recent_activity: {
    lesson_title: string;
    completed_at: string;
  }[];
}

export default function ParentHome() {
  const [children, setChildren] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    user_id: string;
    display_name: string;
  } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [])
  );

  const loadChildren = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get children linked to this parent
      const { data: links, error: linksError } = await supabase
        .from("parent_student_links")
        .select("student_user_id")
        .eq("parent_user_id", user.user.id);

      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        setChildren([]);
        return;
      }

      // Get student profiles
      const studentIds = links.map((link) => link.student_user_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, student_id, grade_level")
        .in("user_id", studentIds)
        .eq("role", "student");

      if (studentsError) throw studentsError;

      // Get total lessons count
      const { data: lessonsData } = await supabase.from("lessons").select("id");
      const totalLessons = lessonsData?.length || 0;

      // Get progress for all children
      const { data: progressData } = await supabase
        .from("progress")
        .select(
          `
          user_id,
          lesson_id,
          status,
          updated_at,
          lessons(title)
        `
        )
        .in("user_id", studentIds);

      // Build student progress data
      const childrenProgress: StudentProgress[] = (studentsData || []).map(
        (student) => {
          const studentProgress =
            progressData?.filter((p) => p.user_id === student.user_id) || [];
          const completedLessons = studentProgress.filter(
            (p) => p.status === "completed"
          );

          // Get recent activity (last 5 completions)
          const recentActivity = completedLessons
            .map((p) => ({
              lesson_title: (p.lessons as any)?.title || "Unknown Lesson",
              completed_at: p.updated_at,
            }))
            .sort(
              (a, b) =>
                new Date(b.completed_at).getTime() -
                new Date(a.completed_at).getTime()
            )
            .slice(0, 5);

          return {
            user_id: student.user_id,
            display_name: student.display_name || "Unknown Student",
            student_id: student.student_id || "",
            grade_level: student.grade_level || "",
            total_lessons: totalLessons,
            completed_lessons: completedLessons.length,
            recent_activity: recentActivity,
          };
        }
      );

      setChildren(childrenProgress);
    } catch (error: any) {
      showErrorBanner(error?.message ?? "Failed to load children's progress");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadChildren(true);
  }, []);

  const handleStudentPress = (child: StudentProgress) => {
    setSelectedStudent({
      user_id: child.user_id,
      display_name: child.display_name,
    });
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getTotalStats = () => {
    const totalStudents = children.length;
    const totalCompleted = children.reduce(
      (sum, child) => sum + child.completed_lessons,
      0
    );
    const totalLessons = children.reduce(
      (sum, child) => sum + child.total_lessons,
      0
    );
    const avgProgress =
      totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
    const recentlyActive = children.filter(
      (child) =>
        child.recent_activity.length > 0 &&
        new Date(child.recent_activity[0].completed_at) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return { totalStudents, totalCompleted, avgProgress, recentlyActive };
  };

  const getAchievements = (child: StudentProgress) => {
    const percentage = getProgressPercentage(
      child.completed_lessons,
      child.total_lessons
    );
    return [
      {
        icon: "star",
        label: "First Lesson",
        achieved: child.completed_lessons >= 1,
        color: "#FFD700",
      },
      {
        icon: "flame",
        label: "5 Lessons",
        achieved: child.completed_lessons >= 5,
        color: "#FF6B35",
      },
      {
        icon: "trophy",
        label: "10 Lessons",
        achieved: child.completed_lessons >= 10,
        color: "#4ECDC4",
      },
      {
        icon: "medal",
        label: "25% Complete",
        achieved: percentage >= 25,
        color: "#45B7D1",
      },
      {
        icon: "diamond",
        label: "50% Complete",
        achieved: percentage >= 50,
        color: "#96CEB4",
      },
      {
        icon: "ribbon",
        label: "Completed!",
        achieved: percentage === 100,
        color: "#FFEAA7",
      },
    ];
  };

  const stats = getTotalStats();

  if (loading) return <ParentHomeSkeleton />;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      <ScrollView style={{ flex: 1 }}>
        {/* Header with Gradient */}
        <View
          style={{
            backgroundColor: "#667eea", // Fallback for React Native
            paddingTop: 20,
            paddingBottom: 30,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: "#fff",
              marginBottom: 8,
            }}
          >
            Family Dashboard
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.9)",
              marginBottom: 20,
            }}
          >
            Track your children's learning journey
          </Text>

          {/* Stats Cards */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                padding: 16,
                flex: 1,
                marginRight: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
                {stats.totalStudents}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Children
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                padding: 16,
                flex: 1,
                marginHorizontal: 4,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
                {stats.avgProgress}%
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                Avg Progress
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                padding: 16,
                flex: 1,
                marginLeft: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
                {stats.recentlyActive}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Active This Week
              </Text>
            </View>
          </View>
        </View>

        {/* Student Cards */}
        <View style={{ padding: 16, paddingTop: 0, marginTop: -20 }}>
          {children.map((child) => {
            const achievements = getAchievements(child);
            const progressPercentage = getProgressPercentage(
              child.completed_lessons,
              child.total_lessons
            );

            return (
              <Pressable
                key={child.user_id}
                onPress={() => handleStudentPress(child)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 24,
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 6,
                }}
                android_ripple={{ color: "#e3f2fd" }}
              >
                {/* Student Header with Circular Progress */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: "#2c3e50",
                        marginBottom: 4,
                      }}
                    >
                      {child.display_name}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons name="school" size={14} color="#6c757d" />
                      <Text
                        style={{
                          color: "#6c757d",
                          fontSize: 14,
                          marginLeft: 4,
                        }}
                      >
                        ID: {child.student_id} • Grade {child.grade_level}
                      </Text>
                    </View>
                  </View>

                  <CircularProgress
                    percentage={progressPercentage}
                    size={70}
                    color={
                      progressPercentage >= 75
                        ? "#4CAF50"
                        : progressPercentage >= 50
                        ? "#FF9800"
                        : "#2196F3"
                    }
                  />
                </View>

                {/* Achievement Badges */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#2c3e50",
                      marginBottom: 12,
                    }}
                  >
                    Achievements
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -8 }}
                  >
                    {achievements.map((achievement, index) => (
                      <AchievementBadge
                        key={index}
                        icon={achievement.icon}
                        label={achievement.label}
                        color={achievement.color}
                        achieved={achievement.achieved}
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* Progress Stats */}
                <View
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#2c3e50",
                      }}
                    >
                      Learning Progress
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#2196F3",
                      }}
                    >
                      {child.completed_lessons} / {child.total_lessons} lessons
                    </Text>
                  </View>

                  <View
                    style={{
                      height: 8,
                      backgroundColor: "#e9ecef",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${progressPercentage}%`,
                        backgroundColor:
                          progressPercentage >= 75
                            ? "#4CAF50"
                            : progressPercentage >= 50
                            ? "#FF9800"
                            : "#2196F3",
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </View>

                {/* Recent Activity Timeline */}
                {child.recent_activity.length > 0 ? (
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#2c3e50",
                        marginBottom: 12,
                      }}
                    >
                      Recent Activity
                    </Text>
                    {child.recent_activity
                      .slice(0, 3)
                      .map((activity, index) => (
                        <View
                          key={index}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            backgroundColor:
                              index === 0 ? "#e8f5e8" : "#f8f9fa",
                            borderRadius: 10,
                            marginBottom: 8,
                            borderLeftWidth: 4,
                            borderLeftColor:
                              index === 0 ? "#4CAF50" : "#2196F3",
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor:
                                index === 0 ? "#4CAF50" : "#2196F3",
                              marginRight: 12,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: "#2c3e50",
                                marginBottom: 2,
                              }}
                            >
                              {activity.lesson_title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#6c757d",
                              }}
                            >
                              Completed {formatDate(activity.completed_at)}
                            </Text>
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={index === 0 ? "#4CAF50" : "#2196F3"}
                          />
                        </View>
                      ))}
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#fff3cd",
                      borderRadius: 10,
                      padding: 16,
                      alignItems: "center",
                      borderLeftWidth: 4,
                      borderLeftColor: "#ffc107",
                    }}
                  >
                    <Ionicons name="time-outline" size={24} color="#856404" />
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#856404",
                        fontWeight: "500",
                        marginTop: 8,
                      }}
                    >
                      Waiting for first lesson completion
                    </Text>
                  </View>
                )}

                {/* Call to Action */}
                <View
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: "#e9ecef",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#007bff"
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#007bff",
                      fontWeight: "600",
                      marginLeft: 6,
                    }}
                  >
                    Tap for teacher info & helpful hints
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Student Detail Modal */}
      <ParentStudentDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        studentUserId={selectedStudent?.user_id || ""}
        studentName={selectedStudent?.display_name || ""}
      />
    </PullToRefresh>
  );
}
