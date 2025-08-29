import { CircularProgress } from "@/components/CircularProgress";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import ErrorPage, { ErrorPages } from "../../../components/ErrorPage";
import {
  showErrorBanner,
  showSuccessBanner,
} from "../../../components/ShowAlert";
import StudentDetailSkeleton from "../../../components/StudentDetailSkeleton";
import StudentProgressModal from "../../../components/StudentProgressModal";
import { supabase } from "../../../services/supabase-init";

type StudentProfile = {
  user_id: string;
  display_name: string;
  grade_level: number;
  student_id: string;
  role: string;
  school_id: string;
};

type StudentProgress = {
  lesson_id: string;
  lesson_title: string;
  completed_sections: number;
  total_sections: number;
  last_activity: string;
  status: string;
};

type ProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  lastActivity: string | null;
  progressPercentage: number;
};

// Update the ParentInfo type to match actual data structure
type ParentInfo = {
  user_id: string;
  email: string;
  role: string;
  school_id: string;
  first_name: string | null;
  last_name: string | null;
};

export default function StudentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const studentUserId = params.id;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastResendTime, setLastResendTime] = useState<{[email: string]: number}>({});
  const [showParentMenu, setShowParentMenu] = useState<{[userId: string]: boolean}>({});

  useEffect(() => {
    if (studentUserId) {
      loadStudentDetails();
    } else {
      setError("No student ID provided");
      setLoading(false);
    }
  }, [studentUserId]);

  const loadStudentDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setError("Not authenticated");
        return;
      }

      const { data: teacherProfile } = await supabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", user.user.id)
        .single();

      if (!teacherProfile?.school_id) {
        setError("Teacher profile not found");
        return;
      }

      const { data: studentData, error: studentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", studentUserId)
        .eq("school_id", teacherProfile.school_id)
        .single();

      if (studentError) {
        if (studentError.code === "PGRST116") {
          setError("Student not found or not in your school");
        } else {
          setError("Failed to load student information");
        }
        return;
      }

      setStudent(studentData);

      // Load parent information using the parent_student_links table
      const { data: parentLinks, error: linksError } = await supabase
        .from("parent_student_links")
        .select("parent_user_id")
        .eq("student_user_id", studentUserId);

      if (!linksError && parentLinks && parentLinks.length > 0) {
        // Get parent IDs and then query user_profiles separately
        const parentIds = parentLinks.map((link) => link.parent_user_id);

        const { data: parentsData, error: parentsError } = await supabase
          .from("user_profiles")
          .select("user_id, email, role, school_id, first_name, last_name")
          .in("user_id", parentIds)
          .eq("role", "parent")
          .eq("school_id", teacherProfile.school_id); // Add this line

        if (!parentsError && parentsData) {
          setParents(parentsData);
        }
      }

      // Get total lessons and progress data
      const [lessonsResult, progressResult] = await Promise.all([
        supabase.from("lessons").select("id, title, unit_id, order"),
        supabase.from("progress").select(`
          lesson_id, status, updated_at, last_position, user_id, lessons(title)
        `),
      ]);

      if (lessonsResult.error) {
        console.error("Failed to load lessons:", lessonsResult.error);
      }

      if (progressResult.error) {
        console.error("Failed to load progress:", progressResult.error);
      }

      const totalLessons = lessonsResult.data?.length || 0;
      const studentProgress =
        progressResult.data?.filter((p) => p.user_id === studentUserId) || [];

      const formattedProgress = studentProgress.map((item) => {
        let completedSections = 0;
        const totalSections = 2;

        try {
          const lastPos = item.last_position || {};
          completedSections = lastPos.completed_sections?.length || 0;
        } catch (e) {
          console.log("Error accessing last_position:", e);
        }

        return {
          lesson_id: item.lesson_id,
          lesson_title: (item.lessons as any)?.title || "Unknown Lesson",
          completed_sections: completedSections,
          total_sections: totalSections,
          last_activity: item.updated_at,
          status: item.status,
        };
      });

      setProgress(formattedProgress);

      // Calculate summary
      const completedCount = studentProgress.filter(
        (p) => p.status === "completed"
      ).length;
      const inProgressCount = studentProgress.filter(
        (p) => p.status === "in_progress"
      ).length;
      const lastActivityDate =
        studentProgress.length > 0
          ? studentProgress.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )[0].updated_at
          : null;

      setSummary({
        totalLessons,
        completedLessons: completedCount,
        inProgressLessons: inProgressCount,
        lastActivity: lastActivityDate,
        progressPercentage:
          totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : 0,
      });
    } catch (err) {
      console.error("Failed to load student details:", err);
      setError("An unexpected error occurred while loading student details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadStudentDetails(true);
  }, []);

  const handleGoBack = () => {
    router.push("/(teacher)/roster");
  };

  const handleRetry = () => {
    loadStudentDetails();
  };

  if (loading) return <StudentDetailSkeleton />;

  if (error) {
    if (error === "Student not found or not in your school") {
      return (
        <ErrorPage
          title="Student Not Found"
          message="This student could not be found"
          subMessage="The student may not exist or may not be in your school"
          buttonText="Back to Roster"
          onButtonPress={handleGoBack}
        />
      );
    }

    if (error === "Not authenticated") {
      return ErrorPages.NetworkError(handleRetry);
    }

    if (error === "No student ID provided") {
      return (
        <ErrorPage
          title="Invalid Student"
          message="No student ID provided"
          subMessage="Please select a student from the roster"
          buttonText="Back to Roster"
          onButtonPress={handleGoBack}
        />
      );
    }

    // Generic error
    return ErrorPages.LoadingError(handleRetry);
  }

  // Student not found (shouldn't happen with proper error handling above)
  if (!student) {
    return (
      <ErrorPage
        title="Student Not Found"
        message="Student information could not be loaded"
        buttonText="Back to Roster"
        onButtonPress={handleGoBack}
      />
    );
  }

  const resendParentEmail = async (parentEmail: string, parentName: string) => {
    // Check rate limiting (5 minutes = 300000 ms)
    const now = Date.now();
    const lastSent = lastResendTime[parentEmail] || 0;
    const timeDiff = now - lastSent;
    const cooldownTime = 5 * 60 * 1000; // 5 minutes

    if (timeDiff < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - timeDiff) / 1000 / 60);
      showErrorBanner(`Please wait ${remainingTime} minutes before resending another email.`);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('resend-parent-invitation', {
        body: {
          email: parentEmail,
          name: parentName,
        },
      });

      if (error) throw error;

      // Update last resend time
      setLastResendTime(prev => ({
        ...prev,
        [parentEmail]: now
      }));

      // Show dev credentials if available
      if (data.devCredentials) {
        console.log('=== PARENT LOGIN CREDENTIALS ===');
        console.log('Email:', data.devCredentials.email);
        console.log('Password:', data.devCredentials.password);
        console.log('================================');
        
        showSuccessBanner(
          `Dev Mode: Login credentials logged to console. Email: ${data.devCredentials.email} | Password: ${data.devCredentials.password}`
        );
      } else {
        showSuccessBanner(`Invitation email resent to ${parentEmail}`);
      }
    } catch (error: any) {
      console.error('Error resending email:', error);
      showErrorBanner(error.message || 'Failed to resend invitation email. Please try again.');
    }
  };

  // Function to toggle parent menu
  const toggleParentMenu = (parentUserId: string) => {
    setShowParentMenu(prev => ({
      ...prev,
      [parentUserId]: !prev[parentUserId]
    }));
  };

  const progressPercentage = summary?.progressPercentage || 0;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      {/* Header with Gradient */}
      <View style={{
        backgroundColor: '#e74c3c', // Red gradient fallback for student focus
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 16,
      }}>
        {/* Back Button */}
        <Pressable
          onPress={handleGoBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <Text style={{
          fontSize: 28,
          fontWeight: '800',
          color: '#fff',
          marginBottom: 8,
        }}>
          {student.display_name}
        </Text>
        <Text style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: 20,
        }}>
          Student ID: {student.student_id} • Grade {student.grade_level}
        </Text>

        {/* Quick Stats */}
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
              {summary?.completedLessons || 0}
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
              {summary?.inProgressLessons || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              In Progress
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingTop: 0, marginTop: -20 }}>
        
        {/* Progress Overview Card */}
        {summary && (
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
                  Learning Progress
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6c757d',
                }}>
                  {summary.totalLessons} total lessons available
                </Text>
              </View>
              
              <CircularProgress 
                percentage={progressPercentage}
                size={70}
                color={progressPercentage >= 75 ? "#4CAF50" : progressPercentage >= 50 ? "#FF9800" : "#e74c3c"}
              />
            </View>

            <View style={{
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#2c3e50',
                }}>
                  Overall Progress
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#4CAF50',
                }}>
                  {summary.completedLessons} / {summary.totalLessons} lessons
                </Text>
              </View>
              
              <View style={{
                height: 8,
                backgroundColor: '#e9ecef',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%',
                  width: `${progressPercentage}%`,
                  backgroundColor: progressPercentage >= 75 ? "#4CAF50" : progressPercentage >= 50 ? "#FF9800" : "#e74c3c",
                  borderRadius: 4,
                }} />
              </View>
            </View>

            <Pressable
              onPress={() => setShowDetailModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backgroundColor: '#4CAF50',
                borderRadius: 12,
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="list" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#fff',
              }}>
                View Detailed Progress
              </Text>
            </Pressable>
          </View>
        )}

        {/* Student Information Card */}
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
              backgroundColor: '#f0f9ff',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="person" size={24} color="#2196F3" />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#2c3e50',
            }}>
              Student Information
            </Text>
          </View>
          
          <View style={{ gap: 16 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
            }}>
              <Ionicons name="person-outline" size={20} color="#6c757d" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6c757d', fontWeight: '600' }}>
                  DISPLAY NAME
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2c3e50' }}>
                  {student.display_name}
                </Text>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
            }}>
              <Ionicons name="id-card-outline" size={20} color="#6c757d" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6c757d', fontWeight: '600' }}>
                  STUDENT ID
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2c3e50', fontFamily: 'monospace' }}>
                  {student.student_id}
                </Text>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#f8f9fa',
              borderRadius: 12,
            }}>
              <Ionicons name="school-outline" size={20} color="#6c757d" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6c757d', fontWeight: '600' }}>
                  GRADE LEVEL
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2c3e50' }}>
                  Grade {student.grade_level}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Parent Information Card */}
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
              backgroundColor: '#fff3cd',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="people" size={24} color="#f59e0b" />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#2c3e50',
            }}>
              Parent Information
            </Text>
          </View>

          {parents.length > 0 ? (
            <View style={{ gap: 16 }}>
              {parents.map((parent, index) => (
                <View
                  key={parent.user_id}
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: 16,
                    padding: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: '#f59e0b',
                  }}
                >
                  {parents.length > 1 && (
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#f59e0b',
                      marginBottom: 12,
                    }}>
                      Parent {index + 1}
                    </Text>
                  )}

                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="person-outline" size={16} color="#6c757d" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 12, color: '#6c757d', fontWeight: '600' }}>NAME</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#2c3e50', marginLeft: 24 }}>
                      {parent.first_name ? (
                        `${parent.first_name}${parent.last_name ? ` ${parent.last_name}` : ""}`
                      ) : (
                        <Text style={{ fontStyle: 'italic', color: '#6c757d' }}>
                          No name on file
                        </Text>
                      )}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Ionicons name="mail-outline" size={16} color="#6c757d" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 12, color: '#6c757d', fontWeight: '600' }}>EMAIL</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#2c3e50', marginLeft: 24 }}>
                      {parent.email}
                    </Text>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#e9ecef',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#4CAF50',
                          marginRight: 8,
                        }} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4CAF50' }}>
                          Active Account
                        </Text>
                      </View>
                      
                      {/* Parent Actions Menu */}
                      <View style={{ position: 'relative' }}>
                        <Pressable
                          onPress={() => toggleParentMenu(parent.user_id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: '#fff',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#e9ecef',
                          }}
                        >
                          <Text style={{ fontSize: 14, color: '#2c3e50', marginRight: 4 }}>
                            Actions
                          </Text>
                          <Ionicons 
                            name={showParentMenu[parent.user_id] ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color="#6c757d" 
                          />
                        </Pressable>
                        
                        {/* Enhanced Dropdown Menu */}
                        {showParentMenu[parent.user_id] && (
                          <View style={{
                            position: 'absolute',
                            bottom: 40,
                            right: 0,
                            backgroundColor: '#fff',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e9ecef',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 8,
                            minWidth: 160,
                            zIndex: 1000,
                          }}>
                            <Pressable
                              onPress={() => {
                                const parentName = parent.first_name 
                                  ? `${parent.first_name}${parent.last_name ? ` ${parent.last_name}` : ""}`
                                  : 'Parent';
                                resendParentEmail(parent.email, parentName);
                                toggleParentMenu(parent.user_id);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#f8f9fa',
                              }}
                            >
                              <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#e3f2fd',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12,
                              }}>
                                <Ionicons name="mail" size={16} color="#2196F3" />
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#2c3e50' }}>
                                Resend Email
                              </Text>
                            </Pressable>
                            
                            <Pressable
                              disabled={true}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                opacity: 0.5,
                              }}
                            >
                              <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#f3e5f5',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12,
                              }}>
                                <Ionicons name="chatbubble" size={16} color="#9c27b0" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6c757d' }}>
                                  Send Message
                                </Text>
                                <Text style={{ fontSize: 10, color: '#9c27b0', fontWeight: '600' }}>
                                  Coming Soon
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{
              backgroundColor: '#fff3cd',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              borderLeftWidth: 4,
              borderLeftColor: '#ffc107',
            }}>
              <Ionicons name="alert-circle" size={32} color="#856404" style={{ marginBottom: 12 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#856404',
                textAlign: 'center',
              }}>
                No Parent Accounts Found
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#856404',
                textAlign: 'center',
                marginTop: 4,
              }}>
                This student doesn't have any linked parent accounts
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Detail Modal */}
      <StudentProgressModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        progress={progress}
        studentName={student.display_name}
      />
    </PullToRefresh>
  );
}
