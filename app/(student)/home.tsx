import { AchievementBadge } from "@/components/AchievementBadge";
import { CircularProgress } from "@/components/CircularProgress";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SkeletonBox } from "@/components/SkeletonBox";
import { createShadowStyle } from "@/utils/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
  progress?: number; 
};

export default function HomeScreen() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [currentLesson, setCurrentLesson] = useState<CurrentLesson | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentName, setStudentName] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        setLoading(false);
        return;
      }

      // Get student name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name")
        .eq("user_id", user.user.id)
        .single();

      if (profile?.first_name) {
        setStudentName(profile.first_name);
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
          currentStreak: 0,
          totalItemsCompleted: completed * 5,
        };

        setStats(stats);

        // Find current lesson (first not completed)
        const currentLessonData = lessonsData.find((lesson) => {
          const progress = progressMap.get(lesson.id);

          // First check if lesson has no progress at all (not started)
          if (!progress) return true;

          // Check actual section completion rather than just progress.status
          const lessonItems = itemsData.filter(
            (item) => item.lesson_id === lesson.id
          );
          const uniqueSectionTypes = [
            ...new Set(lessonItems.map((item) => item.kind)),
          ];
          const completedSections =
            progress.last_position?.completed_sections || [];

          // This lesson is current if not all sections are completed
          const allSectionsActuallyCompleted =
            uniqueSectionTypes.length > 0 &&
            uniqueSectionTypes.every((type) =>
              completedSections.includes(type)
            );

          return !allSectionsActuallyCompleted;
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
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadDashboardData(true);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getAchievements = () => {
    if (!stats) return [];
    
    const progressPercentage = Math.round((stats.completedLessons / stats.totalLessons) * 100);
    
    return [
      { 
        icon: "star", 
        label: "First Lesson", 
        achieved: stats.completedLessons >= 1, 
        color: "#FFD700" 
      },
      { 
        icon: "flame", 
        label: "5 Lessons", 
        achieved: stats.completedLessons >= 5, 
        color: "#FF6B35" 
      },
      { 
        icon: "trophy", 
        label: "10 Lessons", 
        achieved: stats.completedLessons >= 10, 
        color: "#4ECDC4" 
      },
      { 
        icon: "medal", 
        label: "25% Complete", 
        achieved: progressPercentage >= 25, 
        color: "#45B7D1" 
      },
      { 
        icon: "diamond", 
        label: "50% Complete", 
        achieved: progressPercentage >= 50, 
        color: "#96CEB4" 
      },
      { 
        icon: "ribbon", 
        label: "Course Complete", 
        achieved: progressPercentage === 100, 
        color: "#FFEAA7" 
      },
    ];
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonBox width="100%" height={200} />
          <View style={{ height: 20 }} />
          <SkeletonBox width="100%" height={150} />
          <View style={{ height: 20 }} />
          <SkeletonBox width="100%" height={200} />
        </ScrollView>
      </View>
    );
  }

  const progressPercentage = stats ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      {/* Blue Background Header */}
      <View style={{
        backgroundColor: '#3498db',
        paddingTop: 20,
        paddingBottom: 80, // Shorter padding so it extends behind the card
        paddingHorizontal: 16,
      }}>
        <Text style={{
          fontSize: 32,
          fontWeight: '800',
          color: '#fff',
          marginBottom: 8,
        }}>
          {studentName ? `${getGreeting()}, ${studentName}!` : `${getGreeting()}!`}
        </Text>
        <Text style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: 20,
        }}>
          Ready to continue your learning journey?
        </Text>

        {/* Quick Progress Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 20,
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
              {stats?.completedLessons || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              Completed
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
              {progressPercentage}%
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              Progress
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
              {stats?.inProgressLessons || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              In Progress
            </Text>
          </View>
        </View>
      </View>

      {/* Current Lesson Card */}
      {currentLesson && (
        <View style={{
          marginTop: -60,
          marginHorizontal: 16,
          marginBottom: 20,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 20,
            ...createShadowStyle(8, '#000', 0.15, 16, 8),
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: currentLesson.status === "in_progress" ? "#FFF3E0" : "#E3F2FD",
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons 
                  name={currentLesson.status === "in_progress" ? "play-circle" : "rocket"} 
                  size={24} 
                  color={currentLesson.status === "in_progress" ? "#f59e0b" : "#3498db"}
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}>
                  {currentLesson.status === "in_progress" ? "Continue Learning" : "Start Learning"}
                </Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#212529',
                }}>
                  {currentLesson.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6c757d',
                }}>
                  {currentLesson.unit_title}
                </Text>
              </View>
            </View>

            {currentLesson.progress && currentLesson.progress > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{
                  height: 8,
                  backgroundColor: '#e9ecef',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    width: `${currentLesson.progress}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    borderRadius: 4,
                  }} />
                </View>
                <Text style={{
                  fontSize: 12,
                  color: '#6c757d',
                  marginTop: 4,
                }}>
                  {currentLesson.progress}% complete
                </Text>
              </View>
            ) : null}

            <Link href={`/lesson/${currentLesson.id}?from=home`} asChild>
              <Pressable style={{
                backgroundColor: '#4CAF50',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                ...createShadowStyle(6, '#4CAF50', 0.3, 8, 4),
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                  {currentLesson.status === "in_progress" ? "Continue Lesson" : "Start Lesson"}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      )}

      {/* Main Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 0 }}>
        
        {/* Achievements Section */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginHorizontal: 16,
          marginBottom: 20,
          ...createShadowStyle(6, '#000', 0.1, 12, 4),
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
              <Ionicons name="trophy" size={24} color="#f59e0b" />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#2c3e50',
            }}>
              Your Achievements
            </Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -8 }}
          >
            {getAchievements().map((achievement, index) => (
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

        {/* Progress Overview */}
        {stats && (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            marginHorizontal: 16,
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
                backgroundColor: '#e8f5e8',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="analytics" size={24} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#2c3e50',
                }}>
                  Your Progress
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6c757d',
                }}>
                  Keep up the great work!
                </Text>
              </View>
              
              <CircularProgress 
                percentage={progressPercentage}
                size={70}
                color={progressPercentage >= 75 ? "#4CAF50" : progressPercentage >= 50 ? "#FF9800" : "#3498db"}
              />
            </View>

            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: '#e8f5e8',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#4CAF50',
                }}>
                  {stats.completedLessons}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#4CAF50',
                }}>
                  Completed
                </Text>
              </View>

              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: '#fff3cd',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#FF9800',
                }}>
                  {stats.inProgressLessons}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#FF9800',
                }}>
                  In Progress
                </Text>
              </View>

              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: '#f0f9ff',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#3498db',
                }}>
                  {progressPercentage}%
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#3498db',
                }}>
                  Course Progress
                </Text>
              </View>

              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: '#f8f9fa',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#6c757d',
                }}>
                  {stats.notStartedLessons}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#6c757d',
                }}>
                  Not Started
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
            marginHorizontal: 16,
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
                backgroundColor: '#f3e5f5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="time" size={24} color="#9c27b0" />
              </View>
              <Text style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#2c3e50',
              }}>
                Recent Activity
              </Text>
            </View>

            {recentActivity.map((activity, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: index === 0 ? '#e8f5e8' : '#f8f9fa',
                  borderRadius: 12,
                  marginBottom: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: index === 0 ? '#4CAF50' : '#9c27b0',
                }}
              >
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === 0 ? '#4CAF50' : '#9c27b0',
                  marginRight: 12,
                }} />
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#2c3e50',
                    marginBottom: 2,
                  }}>
                    {activity.lesson_title}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#6c757d',
                  }}>
                    Completed {new Date(activity.completed_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={index === 0 ? '#4CAF50' : '#9c27b0'} 
                />
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginHorizontal: 16,
          marginBottom: 20,
          ...createShadowStyle(6, '#000', 0.1, 12, 4),
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
              backgroundColor: '#e3f2fd',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="flash" size={24} color="#2196F3" />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#2c3e50',
            }}>
              Quick Actions
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Link href="/(student)/lessons" asChild>
              <Pressable style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f0f9ff',
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#2196F3',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#2196F3',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="library" size={20} color="#fff" />
                </View>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#2c3e50',
                }}>
                  Browse All Lessons
                </Text>
              </Pressable>
            </Link>

            <Link href="/(student)/settings" asChild>
              <Pressable style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f8f9fa',
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#6c757d',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#6c757d',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#2c3e50',
                }}>
                  View Profile
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </PullToRefresh>
  );
}
