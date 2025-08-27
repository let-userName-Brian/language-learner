import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SkeletonBox } from "../../components/SkeletonBox";
import { supabase } from "../../services/supabase-init";

type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  currentStreak: number;
  totalItemsCompleted: number;
};

type CurrentLesson = {
  id: string;
  title: string;
  unit_title: string;
  status: "not_started" | "in_progress" | "completed";
  progress?: number; // Percentage of items viewed
};

export default function HomeScreen() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [currentLesson, setCurrentLesson] = useState<CurrentLesson | null>(
    null
  );
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        setLoading(false);
        return;
      }

      // Get student name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.user.id)
        .single();

      if (profile?.display_name) {
        setStudentName(profile.display_name);
      }

      // Get all lessons with units
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select(
          `
          id, title, unit_id, order,
          units!inner(id, title)
        `
        )
        .order("order");

      // Get progress data
      const { data: progressData } = await supabase
        .from("progress")
        .select("lesson_id, status, updated_at, last_position")
        .eq("user_id", user.user.id);

      // Get item counts for lessons
      const { data: itemsData } = await supabase
        .from("items")
        .select("lesson_id, id, kind");

      if (lessonsData && progressData !== null && itemsData) {
        // Calculate stats
        const progressMap = new Map(progressData.map((p) => [p.lesson_id, p]));
        const itemCountsMap = itemsData.reduce((acc, item) => {
          acc[item.lesson_id] = (acc[item.lesson_id] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;

        lessonsData.forEach((lesson) => {
          const progress = progressMap.get(lesson.id);
          if (progress?.status === "completed") completed++;
          else if (progress?.status === "in_progress") inProgress++;
          else notStarted++;
        });

        const stats: ProgressStats = {
          totalLessons: lessonsData.length,
          completedLessons: completed,
          inProgressLessons: inProgress,
          notStartedLessons: notStarted,
          currentStreak: 0, // TODO: Calculate streak
          totalItemsCompleted: completed * 5, // Rough estimate
        };

        setStats(stats);

        // Find current lesson (first not completed)
        const currentLessonData = lessonsData.find((lesson) => {
          const progress = progressMap.get(lesson.id);
          return progress?.status !== "completed";
        });

        if (currentLessonData) {
          const progress = progressMap.get(currentLessonData.id);
          const unitInfo = Array.isArray(currentLessonData.units)
            ? currentLessonData.units[0]
            : currentLessonData.units;

          // Calculate actual progress from completed sections
          let actualProgress = 0;
          if (progress?.last_position?.completed_sections) {
            // Get total section types for this lesson from itemsData
            const lessonItems = itemsData.filter(
              (item) => item.lesson_id === currentLessonData.id
            );
            const uniqueSectionTypes = [
              ...new Set(lessonItems.map((item) => item.kind)),
            ];
            const completedSections = progress.last_position.completed_sections;

            actualProgress = Math.round(
              (completedSections.length / uniqueSectionTypes.length) * 100
            );
          }

          setCurrentLesson({
            id: currentLessonData.id,
            title: currentLessonData.title,
            unit_title:
              (unitInfo as any)?.title || (unitInfo as any)?.name || "Unit",
            status: progress?.status || "not_started",
            progress: actualProgress, // Use actual section progress calculation
          });
        }

        // Recent activity (last 3 completed lessons)
        const recentCompleted = progressData
          .filter((p) => p.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          )
          .slice(0, 3)
          .map((p) => {
            const lesson = lessonsData.find((l) => l.id === p.lesson_id);
            return {
              lesson_title: lesson?.title || "Unknown",
              completed_at: p.updated_at,
            };
          });

        setRecentActivity(recentCompleted);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#f8f9fa" }}
        contentContainerStyle={{ padding: 16, gap: 20 }}
      >
        {/* Header Skeleton */}
        <View style={{ marginTop: 40 }}>
          <View style={{ marginBottom: 8 }}>
            <SkeletonBox width="60%" height={32} />
          </View>
          <View style={{ marginBottom: 8 }}>
            <SkeletonBox width="40%" height={32} />
          </View>
          <SkeletonBox width="80%" height={16} />
        </View>

        {/* Current Lesson Card Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View style={{ borderRadius: 24, overflow: "hidden" }}>
              <SkeletonBox width={48} height={48} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ marginBottom: 4 }}>
                <SkeletonBox width="40%" height={12} />
              </View>
              <View style={{ marginBottom: 4 }}>
                <SkeletonBox width="80%" height={18} />
              </View>
              <SkeletonBox width="60%" height={14} />
            </View>
          </View>
          <View style={{ marginBottom: 8 }}>
            <SkeletonBox width="100%" height={8} />
          </View>
          <View style={{ marginBottom: 16 }}>
            <SkeletonBox width="30%" height={12} />
          </View>
          <SkeletonBox width="100%" height={48} />
        </View>

        {/* Stats Overview Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View style={{ marginBottom: 16 }}>
            <SkeletonBox width="40%" height={18} />
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={{ flex: 1, minWidth: "45%" }}>
                <View style={{ marginBottom: 8 }}>
                  <SkeletonBox width="60%" height={32} />
                </View>
                <SkeletonBox width="80%" height={14} />
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View style={{ marginBottom: 16 }}>
            <SkeletonBox width="40%" height={18} />
          </View>
          <View style={{ gap: 12 }}>
            <SkeletonBox width="100%" height={44} />
            <SkeletonBox width="100%" height={44} />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      contentContainerStyle={{ padding: 16, gap: 20 }}
    >
      {/* Greeting Header */}
      <View style={{ marginBottom: 10 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#212529",
            marginBottom: 4,
          }}
        >
          {getGreeting()}
          {studentName ? `,` : "!"}
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#212529",
            marginBottom: 4,
          }}
        >
          {studentName ? `${studentName}!` : ""}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6c757d",
          }}
        >
          Ready to continue learning?
        </Text>
      </View>

      {/* Current Lesson Card */}
      {currentLesson && (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
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
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  currentLesson.status === "in_progress"
                    ? "#FFF3E0"
                    : "#E3F2FD",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 24 }}>
                {currentLesson.status === "in_progress" ? "📖" : "🚀"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#6c757d",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {currentLesson.status === "in_progress"
                  ? "Continue Learning"
                  : "Start Learning"}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#212529",
                }}
              >
                {currentLesson.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6c757d",
                }}
              >
                {currentLesson.unit_title}
              </Text>
            </View>
          </View>

          {currentLesson.progress && currentLesson.progress > 0 ? (
            <View style={{ marginBottom: 16 }}>
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
                    width: `${currentLesson.progress}%`,
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
                  marginTop: 4,
                }}
              >
                {currentLesson.progress}% complete
              </Text>
            </View>
          ) : null}

          <Link href={`/lesson/${currentLesson.id}?from=home`} asChild>
            <Pressable
              style={{
                backgroundColor: "#4CAF50",
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
                {currentLesson.status === "in_progress"
                  ? "Continue Lesson"
                  : "Start Lesson"}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      {/* Stats Overview */}
      {stats && (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#212529",
              marginBottom: 16,
            }}
          >
            Your Progress
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <View style={{ flex: 1, minWidth: "45%" }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#4CAF50",
                }}
              >
                {stats.completedLessons}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6c757d",
                }}
              >
                Lessons Completed
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: "45%" }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#2196F3",
                }}
              >
                {Math.round(
                  (stats.completedLessons / stats.totalLessons) * 100
                )}
                %
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6c757d",
                }}
              >
                Course Progress
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: "45%" }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#FF9800",
                }}
              >
                {stats.inProgressLessons}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6c757d",
                }}
              >
                In Progress
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: "45%" }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#9E9E9E",
                }}
              >
                {stats.notStartedLessons}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6c757d",
                }}
              >
                Not Started
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#212529",
              marginBottom: 16,
            }}
          >
            Recent Activity
          </Text>

          {recentActivity.map((activity, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 8,
                borderBottomWidth: index < recentActivity.length - 1 ? 1 : 0,
                borderBottomColor: "#f1f3f4",
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#e8f5e8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16 }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#212529",
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
                  Completed{" "}
                  {new Date(activity.completed_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: "#e9ecef",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#212529",
            marginBottom: 16,
          }}
        >
          Quick Actions
        </Text>

        <View style={{ gap: 12 }}>
          <Link href="/(student)/lessons" asChild>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e9ecef",
              }}
            >
              <Text style={{ fontSize: 20 }}>📚</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#212529",
                }}
              >
                Browse All Lessons
              </Text>
            </Pressable>
          </Link>

          <Link href="/(student)/settings" asChild>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e9ecef",
              }}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#212529",
                }}
              >
                View Profile
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
