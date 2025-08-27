import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

interface LessonInfo {
  id: string;
  title: string;
  unit_id: string;
  order: number;
  student_progress: {
    student_name: string;
    status: "not_started" | "in_progress" | "completed";
    last_updated?: string;
  }[];
}

export default function ParentLessons() {
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadLessons();
//   }, []);

//   const loadLessons = async () => {
//     try {
//       const { data: user } = await supabase.auth.getUser();
//       if (!user.user) return;

//       // Get children linked to this parent
//       const { data: links } = await supabase
//         .from("parent_student_links")
//         .select(`
//           student_user_id,
//           user_profiles!parent_student_links_student_user_id_fkey (
//             display_name,
//             user_id
//           )
//         `)
//         .eq("parent_user_id", user.user.id);

//       if (!links || links.length === 0) {
//         setLessons([]);
//         return;
//       }

//       // Get all lessons
//       const { data: lessonsData } = await supabase
//         .from("lessons")
//         .select("id, title, unit_id, order")
//         .order("order");

//       if (!lessonsData) {
//         setLessons([]);
//         return;
//       }

//       // Get progress for all children
//       const childrenIds = links.map(link => link.student_user_id);
//       const { data: progressData } = await supabase
//         .from("progress")
//         .select("user_id, lesson_id, status, updated_at")
//         .in("user_id", childrenIds);

//       // Build lessons with student progress
//       const lessonsWithProgress: LessonInfo[] = lessonsData.map(lesson => {
//         const studentProgress = links.map(link => {
//           const progress = progressData?.find(
//             p => p.user_id === link.student_user_id && p.lesson_id === lesson.id
//           );
          
//           return {
//             student_name: link.user_profiles?.display_name || "Unknown Student",
//             status: progress?.status || "not_started",
//             last_updated: progress?.updated_at,
//           };
//         });

//         return {
//           ...lesson,
//           student_progress: studentProgress,
//         };
//       });

//       setLessons(lessonsWithProgress);
//     } catch (error: any) {
//       showErrorAlert(error?.message ?? "Failed to load lessons");
//     } finally {
//       setLoading(false);
//     }
//   };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#4CAF50";
      case "in_progress": return "#FF9800";
      default: return "#9E9E9E";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      default: return "Not Started";
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (lessons.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, textAlign: "center", color: "#666" }}>
          No lessons available or no children linked to your account.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Lesson Progress
      </Text>

      {lessons.map((lesson, index) => (
        <View
          key={lesson.id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            {index + 1}. {lesson.title}
          </Text>

          {lesson.student_progress.map((progress, studentIndex) => (
            <View
              key={studentIndex}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "500" }}>
                {progress.student_name}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: getStatusColor(progress.status)
                }}>
                  {getStatusText(progress.status)}
                </Text>
                {progress.last_updated && progress.status !== "not_started" && (
                  <Text style={{ fontSize: 10, color: "#666" }}>
                    {new Date(progress.last_updated).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

