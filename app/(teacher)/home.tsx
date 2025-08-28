import { HelloWave } from "@/components/HelloWave";
import { SkeletonBox } from "@/components/SkeletonBox";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
      const { data: progressData } = await supabase.from("progress").select(`
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
        const completedLessons = progressData.filter(
          (p: any) => p.status === "completed"
        ).length;

        // Recent activity - last 10 completions with proper lesson titles
        const recentCompletions = progressData
          .filter((p: any) => p.status === "completed")
          .map((p: any) => {
            const student = studentsData.find((s) => s.user_id === p.user_id);
            return {
              student_name: student?.display_name || "Unknown Student",
              lesson_title: p.lessons?.title || "Unknown Lesson",
              completed_at: p.updated_at,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.completed_at).getTime() -
              new Date(a.completed_at).getTime()
          )
          .slice(0, 10);

        // Calculate completion counts per student
        const studentStats = studentsData.map((student) => ({
          student_name: student.display_name,
          completed_count: progressData.filter(
            (p: any) =>
              p.user_id === student.user_id && p.status === "completed"
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
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: "#1a1a1a",
              marginBottom: 8,
            }}
          >
            Welcome back! <HelloWave />
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#666",
              lineHeight: 22,
            }}
          >
            Here's how your students are progressing
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          {/* Total Students */}
          <View
            style={{
              flex: 1,
              minWidth: 150,
              padding: 20,
              backgroundColor: "#f0f9ff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#bae6fd",
              shadowColor: "#0369a1",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {loading ? (
              <>
                <SkeletonBox width={60} height={32} />
                <SkeletonBox width={100} height={16} />
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: "#0369a1",
                    marginBottom: 4,
                  }}
                >
                  {analytics?.totalStudents || 0}
                </Text>
                <Text
                  style={{
                    color: "#0284c7",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Total Students
                </Text>
              </>
            )}
          </View>

          {/* Active Students */}
          <View
            style={{
              flex: 1,
              minWidth: 150,
              padding: 20,
              backgroundColor: "#ecfdf5",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#a7f3d0",
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {loading ? (
              <>
                <SkeletonBox width={60} height={32} />
                <SkeletonBox width={110} height={16} />
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: "#059669",
                    marginBottom: 4,
                  }}
                >
                  {analytics?.activeStudents || 0}
                </Text>
                <Text
                  style={{
                    color: "#047857",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Active This Week
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Progress Overview Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#fef3c7",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 16 }}>📊</Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#1a1a1a",
                }}
              >
                Class Progress
              </Text>
            </View>

            {loading ? (
              <View style={{ gap: 8 }}>
                <SkeletonBox width="100%" height={16} />
                <SkeletonBox width="80%" height={16} />
                <SkeletonBox width="60%" height={16} />
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: "#f59e0b",
                      }}
                    >
                      {completionRate}%
                    </Text>
                    <Text style={{ fontSize: 14, color: "#666" }}>
                      Overall Completion Rate
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      borderWidth: 6,
                      borderColor: "#fef3c7",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#fffbeb",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: "#f59e0b",
                      }}
                    >
                      {completionRate}%
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: "#fef3c7",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#92400e" }}>
                    {analytics?.completedLessons || 0} lessons completed out of{" "}
                    {analytics?.totalLessons || 0} available
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Top Performers */}
        {(loading ||
          (analytics?.topPerformers && analytics.topPerformers.length > 0)) && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#ecfdf5",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🌟</Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1a1a1a",
                  }}
                >
                  Top Performers
                </Text>
              </View>

              {loading ? (
                <View style={{ gap: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <SkeletonBox width={120} height={16} />
                      <SkeletonBox width={60} height={16} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {analytics?.topPerformers
                    .slice(0, 3)
                    .map((student, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 12,
                          backgroundColor: "#f0fdf4",
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: "#059669",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: "#059669",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              {index + 1}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontWeight: "600",
                              color: "#047857",
                              flex: 1,
                            }}
                          >
                            {student.student_name}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#059669",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {student.completed_count} lessons
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Students Who Need Help */}
        {(loading ||
          (analytics?.strugglingStudents &&
            analytics.strugglingStudents.length > 0)) && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#fef2f2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🎯</Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1a1a1a",
                  }}
                >
                  Students Who Need Encouragement
                </Text>
              </View>

              {loading ? (
                <View style={{ gap: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <SkeletonBox width={120} height={16} />
                      <SkeletonBox width={60} height={16} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {analytics?.strugglingStudents
                    .slice(0, 3)
                    .map((student, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 12,
                          backgroundColor: "#fef2f2",
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: "#dc2626",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <Ionicons
                            name="heart"
                            size={20}
                            color="#dc2626"
                            style={{ marginRight: 12 }}
                          />
                          <Text
                            style={{
                              fontWeight: "600",
                              color: "#dc2626",
                              flex: 1,
                            }}
                          >
                            {student.student_name}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#fecaca",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: "#dc2626",
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {student.completed_count} lessons
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        {(loading ||
          (analytics?.recentActivity &&
            analytics.recentActivity.length > 0)) && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#f3f4f6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🎉</Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1a1a1a",
                  }}
                >
                  Recent Completions
                </Text>
              </View>

              {loading ? (
                <View style={{ gap: 16 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ gap: 8 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <SkeletonBox width={100} height={16} />
                        <SkeletonBox width={60} height={14} />
                      </View>
                      <SkeletonBox width={140} height={14} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {analytics?.recentActivity
                    .slice(0, 5)
                    .map((activity, index) => (
                      <View
                        key={index}
                        style={{
                          paddingBottom: 16,
                          borderBottomWidth: index < 4 ? 1 : 0,
                          borderBottomColor: "#f3f4f6",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: "600",
                              color: "#1a1a1a",
                              flex: 1,
                              fontSize: 16,
                            }}
                          >
                            {activity.student_name}
                          </Text>
                          <View
                            style={{
                              backgroundColor: "#f3f4f6",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: "#6b7280",
                                fontSize: 12,
                                fontWeight: "500",
                              }}
                            >
                              {new Date(
                                activity.completed_at
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            color: "#6b7280",
                            fontSize: 14,
                            lineHeight: 20,
                          }}
                        >
                          Completed: {activity.lesson_title}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Getting Started or Success Message */}
        {!loading && analytics?.totalStudents === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              overflow: "hidden",
            }}
          >
            <View style={{ height: 4, backgroundColor: "#f59e0b" }} />
            <View style={{ padding: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#fef3c7",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🚀</Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1a1a1a",
                  }}
                >
                  Getting Started
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: "#666",
                  marginBottom: 20,
                  lineHeight: 20,
                }}
              >
                Welcome to your teaching dashboard! To get the most out of your
                account, here's what you should do next:
              </Text>

              <View style={{ gap: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: "#fef3c7",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#fbbf24",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#f59e0b",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Text style={{ fontSize: 20, color: "white" }}>👥</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: 4,
                      }}
                    >
                      Upload Your Student Roster
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#92400e",
                        lineHeight: 18,
                      }}
                    >
                      Go to the Roster tab to upload your class list and
                      automatically create student accounts
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: "#fef3c7",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#fbbf24",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#f59e0b",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons name="settings" size={20} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: 4,
                      }}
                    >
                      Complete Your Profile
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#92400e",
                        lineHeight: 18,
                      }}
                    >
                      Visit the Settings tab to update your teacher profile and
                      class preferences
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#fef3c7",
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#92400e",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  Once you've uploaded students, this dashboard will show their
                  progress and analytics!
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
