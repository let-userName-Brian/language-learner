import { SkeletonBox } from "@/components/SkeletonBox";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../services/supabase-init";

interface Analytics {
  totalStudents: number;
  activeStudents: number;
  completedLessons: number;
  totalLessons: number;
  recentActivity: Array<{
    student_name: string;
    lesson_title: string;
    completed_at: string;
  }>;
  topPerformers: Array<{
    student_name: string;
    completed_count: number;
  }>;
  strugglingStudents: Array<{
    student_name: string;
    completed_count: number;
  }>;
}

export default function TeacherHome() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get teacher's school_id from their profile
      const { data: teacherProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      // Get total lessons count
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, title");
      const totalLessons = lessonsData?.length || 0;
      
      // Get all students from user_profiles
      const { data: studentsData } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .eq("role", "student")
        .eq("school_id", teacherProfile.school_id);

      // Get all progress data with lesson titles
      const { data: progressData } = await supabase
        .from("progress")
        .select(`
          user_id,
          lesson_id,
          status,
          updated_at,
          lessons:lessons(title)
        `);

      if (studentsData && progressData) {
        const totalStudents = studentsData.length;

        // Students with any completed lesson in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeStudents = studentsData.filter((student) =>
          progressData.some(
            (p: any) =>
              p.user_id === student.user_id &&
              p.status === "completed" && 
              new Date(p.updated_at) > sevenDaysAgo
          )
        ).length;

        // Total completed lessons across all students
        const completedLessons = progressData.filter((p: any) => p.status === "completed").length;

        // Recent activity - last 10 completions with proper lesson titles
        const recentCompletions = progressData
          .filter((p: any) => p.status === "completed")
          .map((p: any) => {
            const student = studentsData.find(s => s.user_id === p.user_id);
            return {
              student_name: student?.display_name || "Unknown Student",
              lesson_title: p.lessons?.title || "Unknown Lesson",
              completed_at: p.updated_at,
            };
          })
          .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
          .slice(0, 10);

        // Calculate completion counts per student
        const studentStats = studentsData.map((student) => ({
          student_name: student.display_name,
          completed_count: progressData.filter(
            (p: any) => p.user_id === student.user_id && p.status === "completed"
          ).length,
        }));

        // Top performers (most completions)
        const topPerformers = studentStats
          .filter((s) => s.completed_count > 0)
          .sort((a, b) => b.completed_count - a.completed_count)
          .slice(0, 5);

        // Struggling students (fewer than 2 completions)
        const strugglingStudents = studentStats
          .filter((s) => s.completed_count < 2)
          .sort((a, b) => a.completed_count - b.completed_count)
          .slice(0, 5);

        setAnalytics({
          totalStudents,
          activeStudents,
          completedLessons,
          totalLessons,
          recentActivity: recentCompletions,
          topPerformers,
          strugglingStudents,
        });
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate =
    analytics && analytics.totalLessons > 0 && analytics.totalStudents > 0
      ? Math.round(
          (analytics.completedLessons /
            (analytics.totalStudents * analytics.totalLessons)) *
            100
        )
      : 0;

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#1a1a1a" }}>
          Welcome back! 👋
        </Text>
        <Text style={{ fontSize: 16, color: "#666", marginTop: 4 }}>
          Here's how your students are progressing
        </Text>
      </View>

      {/* Quick Stats */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            backgroundColor: "#f0f9ff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#bae6fd",
          }}
        >
          {loading ? (
            <>
              <SkeletonBox width={60} height={28} />
              <View style={{ marginTop: 8 }}>
                <SkeletonBox width={90} height={16} />
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 28, fontWeight: "700", color: "#0369a1" }}>
                {analytics?.totalStudents || 0}
              </Text>
              <Text style={{ color: "#0284c7", fontWeight: "600" }}>
                Total Students
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            backgroundColor: "#f0fdf4",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#bbf7d0",
          }}
        >
          {loading ? (
            <>
              <SkeletonBox width={60} height={28} />
              <View style={{ marginTop: 8 }}>
                <SkeletonBox width={110} height={16} />
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 28, fontWeight: "700", color: "#059669" }}>
                {analytics?.activeStudents || 0}
              </Text>
              <Text style={{ color: "#047857", fontWeight: "600" }}>
                Active This Week
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Progress Overview */}
      <View
        style={{
          padding: 16,
          backgroundColor: "#fefce8",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#fde047",
        }}
      >
        {loading ? (
          <>
            <SkeletonBox width={120} height={18} />
            <View style={{ marginTop: 12 }}>
              <SkeletonBox width="80%" height={14} />
            </View>
            <View style={{ marginTop: 6 }}>
              <SkeletonBox width="60%" height={14} />
            </View>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#a16207",
                marginBottom: 8,
              }}
            >
              Class Progress
            </Text>
            <Text style={{ fontSize: 14, color: "#92400e" }}>
              {analytics?.completedLessons || 0} lessons completed out of {analytics?.totalLessons || 0} available
            </Text>
            <Text style={{ fontSize: 14, color: "#92400e", marginTop: 4 }}>
              Overall completion rate: {completionRate}%
            </Text>
          </>
        )}
      </View>

      {/* Top Performers */}
      {(loading || (analytics?.topPerformers && analytics.topPerformers.length > 0)) && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#ecfdf5",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#a7f3d0",
          }}
        >
          {loading ? (
            <>
              <SkeletonBox width={140} height={16} />
              <View style={{ marginTop: 12, gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <SkeletonBox width={120} height={14} />
                    <SkeletonBox width={60} height={14} />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#065f46",
                  marginBottom: 8,
                }}
              >
                🌟 Top Performers
              </Text>
              {analytics?.topPerformers.slice(0, 3).map((student, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontWeight: "500", color: "#047857" }}>
                    {student.student_name}
                  </Text>
                  <Text
                    style={{ color: "#059669", fontSize: 14, fontWeight: "600" }}
                  >
                    {student.completed_count} lessons
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Students Who Need Help */}
      {(loading || (analytics?.strugglingStudents && analytics.strugglingStudents.length > 0)) && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#fef2f2",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#fecaca",
          }}
        >
          {loading ? (
            <>
              <SkeletonBox width={200} height={16} />
              <View style={{ marginTop: 12, gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <SkeletonBox width={120} height={14} />
                    <SkeletonBox width={60} height={14} />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#dc2626",
                  marginBottom: 8,
                }}
              >
                🎯 Students Who Need Encouragement
              </Text>
              {analytics?.strugglingStudents.slice(0, 3).map((student, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontWeight: "500", color: "#dc2626" }}>
                    {student.student_name}
                  </Text>
                  <Text style={{ color: "#ef4444", fontSize: 14 }}>
                    {student.completed_count} lessons
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Recent Activity */}
      {(loading || (analytics?.recentActivity && analytics.recentActivity.length > 0)) && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          {loading ? (
            <>
              <SkeletonBox width={150} height={16} />
              <View style={{ marginTop: 12, gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <SkeletonBox width={100} height={14} />
                      <SkeletonBox width={60} height={12} />
                    </View>
                    <SkeletonBox width={140} height={12} />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 12,
                }}
              >
                Recent Completions 🎉
              </Text>
              {analytics?.recentActivity.slice(0, 5).map((activity, index) => (
                <View
                  key={index}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: index < 4 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: "500", color: "#374151", flex: 1 }}>
                      {activity.student_name}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      {new Date(activity.completed_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                    {activity.lesson_title}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Getting Started Guide / Success Message */}
      {!loading && (
        analytics?.totalStudents === 0 ? (
          <View style={{
            padding: 16,
            backgroundColor: "#fff3cd",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#ffeaa7",
            marginTop: 8,
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: "700", 
              color: "#856404",
              marginBottom: 12 
            }}>
              🚀 Getting Started
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: "#856404", 
              marginBottom: 16 
            }}>
              Welcome to your teaching dashboard! To get the most out of your account, here's what you should do next:
            </Text>
            
            <View style={{ gap: 12 }}>
              <View style={{
                flexDirection: "row",
                alignItems: "flex-start",
                padding: 12,
                backgroundColor: "#fff",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#f0f0f0"
              }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: "#856404", marginBottom: 4 }}>
                    Upload Your Student Roster
                  </Text>
                  <Text style={{ fontSize: 13, color: "#856404" }}>
                    Go to the Roster tab to upload your class list and automatically create student accounts
                  </Text>
                </View>
              </View>
              
              <View style={{
                flexDirection: "row",
                alignItems: "flex-start",
                padding: 12,
                backgroundColor: "#fff",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#f0f0f0"
              }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>⚙️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: "#856404", marginBottom: 4 }}>
                    Complete Your Profile
                  </Text>
                  <Text style={{ fontSize: 13, color: "#856404" }}>
                    Visit the Settings tab to update your teacher profile and class preferences
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={{ 
              fontSize: 12, 
              color: "#856404", 
              fontStyle: "italic",
              textAlign: "center",
              marginTop: 12
            }}>
              Once you've uploaded students, this dashboard will show their progress and analytics!
            </Text>
          </View>
        ) : (
          <View style={{
            padding: 16,
            backgroundColor: "#d4edda",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#c3e6cb",
            marginTop: 8,
          }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: "600", 
              color: "#155724",
              textAlign: "center"
            }}>
              🎉 Great job! Your class is active with {analytics?.totalStudents || 0} students
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: "#155724",
              textAlign: "center",
              marginTop: 4
            }}>
              Keep monitoring their progress and celebrate their achievements!
            </Text>
          </View>
        )
      )}

      {/* Loading skeleton for bottom section */}
      {loading && (
        <View style={{
          padding: 16,
          backgroundColor: "#f8f9fa",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e9ecef",
          marginTop: 8,
        }}>
          <SkeletonBox width={150} height={18} />
          <View style={{ marginTop: 12 }}>
            <SkeletonBox width="90%" height={14} />
          </View>
          <View style={{ marginTop: 8 }}>
            <SkeletonBox width="70%" height={14} />
          </View>
        </View>
      )}
    </View>
  );
}