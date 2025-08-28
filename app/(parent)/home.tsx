import ErrorPage from "@/components/ErrorPage";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

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

//   useEffect(() => {
//     loadChildren();
//   }, []);

//   const loadChildren = async () => {
//     try {
//       const { data: user } = await supabase.auth.getUser();
//       if (!user.user) return;

//       // Get children linked to this parent
//       const { data: links, error: linksError } = await supabase
//         .from("parent_student_links")
//         .select(`
//           student_user_id,
//           user_profiles!parent_student_links_student_user_id_fkey (
//             display_name,
//             student_id,
//             grade_level,
//             user_id
//           )
//         `)
//         .eq("parent_user_id", user.user.id);

//       if (linksError) throw linksError;

//       if (!links || links.length === 0) {
//         setChildren([]);
//         return;
//       }

//       // Get total lessons count
//       const { data: lessonsData } = await supabase
//         .from("lessons")
//         .select("id");
//       const totalLessons = lessonsData?.length || 0;

//       // Get progress for all children
//       const childrenIds = links.map(link => link.student_user_id);
//       const { data: progressData } = await supabase
//         .from("progress")
//         .select(`
//           user_id,
//           lesson_id,
//           status,
//           updated_at,
//           lessons:lessons(title)
//         `)
//         .in("user_id", childrenIds);

//       // Build student progress data
//       const childrenProgress: StudentProgress[] = links.map(link => {
//         const profile = link.user_profiles;
//         const studentProgress = progressData?.filter(p => p.user_id === link.student_user_id) || [];
//         const completedLessons = studentProgress.filter(p => p.status === "completed");
        
//         // Get recent activity (last 5 completions)
//         const recentActivity = completedLessons
//           .map(p => ({
//             lesson_title: p.lessons?.title || "Unknown Lesson",
//             completed_at: p.updated_at,
//           }))
//           .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
//           .slice(0, 5);

//         return {
//           user_id: link.student_user_id,
//           display_name: profile?.display_name || "Unknown Student",
//           student_id: profile?.student_id || "",
//           grade_level: profile?.grade_level || "",
//           total_lessons: totalLessons,
//           completed_lessons: completedLessons.length,
//           recent_activity: recentActivity,
//         };
//       });

//       setChildren(childrenProgress);
//     } catch (error: any) {
//       showErrorAlert(error?.message ?? "Failed to load children's progress");
//     } finally {
//       setLoading(false);
//     }
//   };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <ErrorPage
        title="No Children Found"
        message="No children are linked to your account yet"
        subMessage="Ask your child's teacher to add you as a parent, or verify you're signed in with the correct email address."
        buttonText="Check Settings"
        onButtonPress={() => router.push("/(parent)/settings")}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Your Children's Progress
      </Text>

      {children.map((child) => (
        <View
          key={child.user_id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "600" }}>{child.display_name}</Text>
              <Text style={{ color: "#666", fontSize: 14 }}>
                Student ID: {child.student_id} • Grade {child.grade_level}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#0066cc" }}>
                {getProgressPercentage(child.completed_lessons, child.total_lessons)}%
              </Text>
              <Text style={{ fontSize: 12, color: "#666" }}>Complete</Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
              Lessons: {child.completed_lessons} of {child.total_lessons} completed
            </Text>
            <View style={{
              height: 8,
              backgroundColor: "#e0e0e0",
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <View style={{
                height: "100%",
                width: `${getProgressPercentage(child.completed_lessons, child.total_lessons)}%`,
                backgroundColor: "#0066cc",
              }} />
            </View>
          </View>

          {child.recent_activity.length > 0 && (
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Recent Activity
              </Text>
              {child.recent_activity.map((activity, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                    borderBottomWidth: index < child.recent_activity.length - 1 ? 1 : 0,
                    borderBottomColor: "#f0f0f0",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#333", flex: 1 }}>
                    {activity.lesson_title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    {formatDate(activity.completed_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {child.recent_activity.length === 0 && (
            <Text style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>
              No recent activity
            </Text>
          )}
        </View>
      ))}

      <Pressable
        onPress={() => {}}
        style={{
          backgroundColor: "#f0f0f0",
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ color: "#0066cc", fontWeight: "600" }}>Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

