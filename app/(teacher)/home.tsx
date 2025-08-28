import { CircularProgress } from "@/components/CircularProgress";
import { HelloWave } from "@/components/HelloWave";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SkeletonBox } from "@/components/SkeletonBox";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadAnalytics(true);
  }, []);

  const completionRate =
    analytics && analytics.totalLessons > 0 && analytics.totalStudents > 0
      ? Math.round(
          (analytics.completedLessons /
            (analytics.totalStudents * analytics.totalLessons)) *
            100
        )
      : 0;

  const engagementRate = analytics && analytics.totalStudents > 0 
    ? Math.round((analytics.activeStudents / analytics.totalStudents) * 100)
    : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <SkeletonBox width="100%" height={200} />
          <View style={{ height: 20 }} />
          <SkeletonBox width="100%" height={100} />
          <View style={{ height: 20 }} />
          <SkeletonBox width="100%" height={300} />
        </ScrollView>
      </View>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      <ScrollView style={{ flex: 1 }}>
        {/* Header with Gradient */}
        <View style={{
          backgroundColor: '#7c3aed', // Purple gradient fallback
          paddingTop: 20,
          paddingBottom: 30,
          paddingHorizontal: 16,
        }}>
          <Text style={{
            fontSize: 32,
            fontWeight: '800',
            color: '#fff',
            marginBottom: 8,
          }}>
            Teacher Dashboard <HelloWave />
          </Text>
          <Text style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 20,
          }}>
            Monitor your class progress and student achievements
          </Text>

          {/* Stats Cards */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginRight: 8,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                {analytics?.totalStudents || 0}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
                Total Students
              </Text>
            </View>
            
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginHorizontal: 4,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                {completionRate}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
                Completion Rate
              </Text>
            </View>

            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginLeft: 8,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                {engagementRate}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
                Weekly Active
              </Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={{ padding: 16, paddingTop: 0, marginTop: -20 }}>
          
          {/* Performance Overview */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#fef3c7',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="analytics" size={24} color="#f59e0b" />
              </View>
              <Text style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#2c3e50',
              }}>
                Class Performance Overview
              </Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#2c3e50',
                  marginBottom: 8,
                }}>
                  Overall Completion Rate
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6c757d',
                  marginBottom: 16,
                }}>
                  {analytics?.completedLessons || 0} of {(analytics?.totalStudents || 0) * (analytics?.totalLessons || 0)} total lessons completed
                </Text>
                
                <View style={{
                  height: 8,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    height: '100%',
                    width: `${completionRate}%`,
                    backgroundColor: completionRate >= 75 ? "#4CAF50" : completionRate >= 50 ? "#FF9800" : "#f59e0b",
                    borderRadius: 4,
                  }} />
                </View>
              </View>
              
              <CircularProgress 
                percentage={completionRate}
                size={80}
                color={completionRate >= 75 ? "#4CAF50" : completionRate >= 50 ? "#FF9800" : "#f59e0b"}
              />
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={{
            flexDirection: 'row',
            marginBottom: 20,
          }}>
            <PerformanceBadge
              icon="people"
              value={analytics?.activeStudents || 0}
              label="Active This Week"
              color="#4CAF50"
              backgroundColor="#f0fdf4"
            />
            <PerformanceBadge
              icon="checkmark-circle"
              value={analytics?.completedLessons || 0}
              label="Lessons Completed"
              color="#2196F3"
              backgroundColor="#f0f9ff"
            />
            <PerformanceBadge
              icon="school"
              value={analytics?.totalLessons || 0}
              label="Total Lessons"
              color="#9C27B0"
              backgroundColor="#faf5ff"
            />
          </View>

          {/* Top Performers */}
          {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#ecfdf5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="trophy" size={24} color="#059669" />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#2c3e50',
                }}>
                  Top Performers
                </Text>
              </View>

              {analytics.topPerformers.slice(0, 3).map((student, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: index === 0 ? '#ecfdf5' : '#f8f9fa',
                    borderRadius: 12,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#6b7280',
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#6b7280',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: '700',
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#2c3e50',
                      marginBottom: 2,
                    }}>
                      {student.student_name}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#6c757d',
                    }}>
                      {student.completed_count} lessons completed
                    </Text>
                  </View>
                  <Ionicons 
                    name={index === 0 ? "star" : index === 1 ? "medal" : "ribbon"} 
                    size={20} 
                    color={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#6b7280'} 
                  />
                </View>
              ))}
            </View>
          )}

          {/* Students Who Need Encouragement */}
          {analytics?.strugglingStudents && analytics.strugglingStudents.length > 0 && (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#fff3cd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="heart" size={24} color="#f59e0b" />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#2c3e50',
                }}>
                  Students Who Need Encouragement
                </Text>
              </View>

              {analytics.strugglingStudents.slice(0, 3).map((student, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: '#fff3cd',
                    borderRadius: 12,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: '#f59e0b',
                  }}
                >
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#f59e0b',
                    marginRight: 12,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#92400e',
                      marginBottom: 2,
                    }}>
                      {student.student_name}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#92400e',
                    }}>
                      {student.completed_count} lessons completed
                    </Text>
                  </View>
                  <Ionicons name="hand-right" size={20} color="#f59e0b" />
                </View>
              ))}
            </View>
          )}

          {/* Recent Activity Timeline */}
          {analytics?.recentActivity && analytics.recentActivity.length > 0 && (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#f3f4f6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="time" size={24} color="#6b7280" />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#2c3e50',
                }}>
                  Recent Completions
                </Text>
              </View>

              {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: index === 0 ? '#f0fdf4' : '#f8f9fa',
                    borderRadius: 10,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: index === 0 ? '#10b981' : '#6b7280',
                  }}
                >
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === 0 ? '#10b981' : '#6b7280',
                    marginRight: 12,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#2c3e50',
                      marginBottom: 2,
                    }}>
                      {activity.student_name}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#6c757d',
                      marginBottom: 2,
                    }}>
                      {activity.lesson_title}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#6c757d',
                    }}>
                      {new Date(activity.completed_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={index === 0 ? '#10b981' : '#6b7280'} 
                  />
                </View>
              ))}
            </View>
          )}

          {/* Getting Started Message */}
          {analytics?.totalStudents === 0 && (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#fef3c7',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="rocket" size={24} color="#f59e0b" />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#2c3e50',
                }}>
                  Getting Started
                </Text>
              </View>

              <Text style={{
                fontSize: 16,
                color: '#6c757d',
                marginBottom: 20,
                lineHeight: 24,
              }}>
                Welcome to your teaching dashboard! To get the most out of your account, here's what you should do next:
              </Text>

              <View style={{
                backgroundColor: '#fef3c7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#f59e0b',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Ionicons name="people" size={20} color="#92400e" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#92400e',
                    marginLeft: 8,
                  }}>
                    Upload Your Student Roster
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: '#92400e',
                  lineHeight: 20,
                }}>
                  Go to the Roster tab to upload your class list and automatically create student accounts
                </Text>
              </View>

              <View style={{
                backgroundColor: '#fef3c7',
                borderRadius: 12,
                padding: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#f59e0b',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Ionicons name="settings" size={20} color="#92400e" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#92400e',
                    marginLeft: 8,
                  }}>
                    Complete Your Profile
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: '#92400e',
                  lineHeight: 20,
                }}>
                  Visit the Settings tab to update your teacher profile and class preferences
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </PullToRefresh>
  );
}
