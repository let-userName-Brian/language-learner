import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import ErrorPage, { ErrorPages } from "../../../components/ErrorPage";
import {
    showErrorBanner,
    showSuccessBanner,
} from "../../../components/ShowAlert";
import StudentDetailSkeleton from "../../../components/StudentDetailSkeleton";
import StudentProgressModal from "../../../components/StudentProgressModal";
import StudentSummaryStats from "../../../components/StudentSummaryStats";
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
  const [parents, setParents] = useState<ParentInfo[]>([]); // Changed to array
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
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
        supabase.from("lessons").select("id"),
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
    }
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
        }}
      >
        <Pressable
          onPress={handleGoBack}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: "#f8f9fa",
            marginRight: 12,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            {student.display_name}
          </Text>
          <Text style={{ color: "#666", fontSize: 14 }}>
            Student ID: {student.student_id} • Grade {student.grade_level}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Progress Summary */}
        {summary && (
          <StudentSummaryStats 
            summary={summary} 
            onViewDetails={() => setShowDetailModal(true)}
          />
        )}
        {/* Student Info Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            📋 Student Information
          </Text>
          
          <View style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: "#666" }}>Display Name:</Text>
              <Text style={{ fontWeight: "500" }}>{student.display_name}</Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: "#666" }}>Student ID:</Text>
              <Text style={{ fontWeight: "500" }}>{student.student_id}</Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: "#666" }}>Grade Level:</Text>
              <Text style={{ fontWeight: "500" }}>
                Grade {student.grade_level}
              </Text>
            </View>
          </View>
        </View>

        {/* Parent Info Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            👨‍👩‍👧‍👦 Parent Information
          </Text>

          {parents.length > 0 ? (
            <View style={{ gap: 12 }}>
              {parents.map((parent, index) => (
                <View
                  key={parent.user_id}
                  style={{
                    padding: 12,
                    backgroundColor: "#f8f9fa",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#e9ecef",
                  }}
                >
                  {parents.length > 1 && (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#495057",
                        marginBottom: 8,
                      }}
                    >
                      Parent {index + 1}
                    </Text>
                  )}

                  <View style={{ gap: 6 }}>
                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between" }}
                    >
                      <Text style={{ color: "#666", fontSize: 14 }}>Name:</Text>
                      <Text style={{ fontWeight: "500", fontSize: 14 }}>
                        {parent.first_name ? (
                          `${parent.first_name} ${parent.last_name}`
                        ) : (
                          <Text
                            style={{
                              fontWeight: "400",
                              fontSize: 14,
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            No name on file
                          </Text>
                        )}
                      </Text>
                    </View>

                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between" }}
                    >
                      <Text style={{ color: "#666", fontSize: 14 }}>Email:</Text>
                      <Text
                        style={{
                          fontWeight: "500",
                          fontSize: 13,
                          flex: 1,
                          textAlign: "right",
                        }}
                      >
                        {parent.email}
                      </Text>
                    </View>

                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <Text style={{ color: "#666", fontSize: 14 }}>Account:</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "#28a745",
                              marginRight: 6,
                            }}
                          />
                          <Text style={{ fontWeight: "500", fontSize: 13 }}>
                            Active
                          </Text>
                        </View>
                        
                        {/* Parent Actions Menu */}
                        <View style={{ position: 'relative' }}>
                          <Pressable
                            onPress={() => toggleParentMenu(parent.user_id)}
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              backgroundColor: "#f8f9fa",
                              borderWidth: 1,
                              borderColor: "#dee2e6",
                            }}
                          >
                            <Ionicons 
                              name={showParentMenu[parent.user_id] ? "chevron-up" : "chevron-down"} 
                              size={14} 
                              color="#6c757d" 
                            />
                          </Pressable>
                          
                          {/* Dropdown Menu */}
                          {showParentMenu[parent.user_id] && (
                            <View
                              style={{
                                position: 'absolute',
                                bottom: 32, // Changed from top: 32 to bottom: 32
                                right: 0,
                                backgroundColor: '#fff',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#e9ecef',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 5,
                                minWidth: 140,
                                zIndex: 1000,
                              }}
                            >
                              <Pressable
                                onPress={() => {
                                  resendParentEmail(parent.email, parent.first_name ? `${parent.first_name} ${parent.last_name}` : 'Parent');
                                  toggleParentMenu(parent.user_id);
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  padding: 12,
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#f8f9fa',
                                }}
                              >
                                <Ionicons name="mail-outline" size={16} color="#007bff" style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 14, color: '#495057' }}>Resend Email</Text>
                              </Pressable>
                              
                              {/* Send Message option */}
                              <Pressable
                                disabled={true}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  padding: 12,
                                  opacity: 0.5,
                                }}
                              >
                                <Ionicons name="chatbubble-outline" size={16} color="#6c757d" style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 14, color: '#6c757d' }}>Message</Text>
                                <View style={{ 
                                  backgroundColor: '#7C24FF',
                                  paddingHorizontal: 4,
                                  paddingVertical: 1,
                                  borderRadius: 3,
                                  marginLeft: 4,
                                }}>
                                  <Text style={{ fontSize: 9, color: '#fff', fontWeight: '500' }}>Soon</Text>
                                </View>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                padding: 12,
                backgroundColor: "#fff3cd",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#ffeaa7",
              }}
            >
              <Text
                style={{ color: "#856404", fontSize: 14, textAlign: "center" }}
              >
                ⚠️ No parent accounts found for this student
              </Text>
            </View>
          )}
        </View>

       

        {/* Progress Detail Modal */}
        <StudentProgressModal
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          progress={progress}
          studentName={student.display_name}
        />
      </ScrollView>
    </View>
  );
}
