import { PullToRefresh } from "@/components/PullToRefresh";
import StudentListSkeleton from "@/components/StudentListSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import AddStudentModal from "../../components/AddStudentModal";
import UploadRosterModal from "../../components/UploadRosterModal";
import { supabase } from "../../services/supabase-init";

type Student = {
  user_id: string;
  display_name: string;
  grade_level: number;
  student_id: string;
  role: string;
  school_id: string;
};

const STUDENTS_PER_PAGE = 20;

export default function TeacherRoster() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadStudents(true);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery !== "" && trimmedQuery.length >= 1) {
        searchStudents();
      } else if (trimmedQuery === "") {
        loadStudents(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUploadComplete = (uploadResults: any[]) => {
    setResults(uploadResults);
    console.log("uploadResults", uploadResults);
    loadStudents(true);
  };

  const handleStudentAdded = (studentResult: any) => {
    setResults((prev) => [studentResult, ...prev]);
    console.log("studentResult", studentResult);
    loadStudents(true);
  };

  const handleStudentPress = (student: Student) => {
    router.push(`/(teacher)/student/${student.user_id}` as any);
  };

  const loadStudents = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(0);
        setStudents([]);
      } else {
        setLoadingMore(true);
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get teacher's school_id from their profile
      const { data: teacherProfile } = await supabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", user.user.id)
        .single();

      if (!teacherProfile?.school_id) return;

      const page = reset ? 0 : currentPage;
      const from = page * STUDENTS_PER_PAGE;
      const to = from + STUDENTS_PER_PAGE - 1;

      // Get total count first (only on first load)
      let count = totalCount;
      if (reset) {
        const { count: totalStudents } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")
          .eq("school_id", teacherProfile.school_id);

        count = totalStudents || 0;
        setTotalCount(count);
      }

      // Load students with pagination
      const { data: studentsData, error } = await supabase
        .from("user_profiles")
        .select(
          "user_id, display_name, grade_level, student_id, role, school_id"
        )
        .eq("role", "student")
        .eq("school_id", teacherProfile.school_id)
        .order("display_name")
        .range(from, to);

      if (error) throw error;

      const newStudents = studentsData || [];

      if (reset) {
        setStudents(newStudents);
      } else {
        setStudents((prev) => [...prev, ...newStudents]);
      }

      setCurrentPage(page + 1);
      setHasMore(newStudents.length === STUDENTS_PER_PAGE);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const searchStudents = async () => {
    try {
      setLoading(true);
      setStudents([]);
      setHasMore(false);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: teacherProfile } = await supabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", user.user.id)
        .single();

      if (!teacherProfile?.school_id) return;

      // Clean the query but let Supabase handle escaping
      const cleanQuery = searchQuery.trim();

      if (!cleanQuery || cleanQuery.length < 1) {
        setStudents([]);
        return;
      }

      // Use multiple separate queries for better safety
      const [nameResults, idResults] = await Promise.all([
        supabase
          .from("user_profiles")
          .select(
            "user_id, display_name, grade_level, student_id, role, school_id"
          )
          .eq("role", "student")
          .eq("school_id", teacherProfile.school_id)
          .ilike("display_name", `%${cleanQuery}%`)
          .order("display_name")
          .limit(50),

        supabase
          .from("user_profiles")
          .select(
            "user_id, display_name, grade_level, student_id, role, school_id"
          )
          .eq("role", "student")
          .eq("school_id", teacherProfile.school_id)
          .ilike("student_id", `%${cleanQuery}%`)
          .order("display_name")
          .limit(50),
      ]);

      // Combine and deduplicate results
      const allResults = [
        ...(nameResults.data || []),
        ...(idResults.data || []),
      ];
      const uniqueResults = allResults.filter(
        (student, index, self) =>
          index === self.findIndex((s) => s.user_id === student.user_id)
      );

      setStudents(uniqueResults);
    } catch (error) {
      console.error("Failed to search students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearchQuery("");
    await loadStudents(true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore && searchQuery === "") {
      loadStudents(false);
    }
  };

  const renderStudent = ({
    item: student,
    index,
  }: {
    item: Student;
    index: number;
  }) => (
    <Pressable
      key={student.user_id}
      onPress={() => handleStudentPress(student)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
      }}
      android_ripple={{ color: "#e3f2fd" }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#2c3e50',
            marginBottom: 4,
          }}>
            {student.display_name}
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Ionicons name="school" size={14} color="#6c757d" />
            <Text style={{
              color: '#6c757d',
              fontSize: 14,
              marginLeft: 4,
            }}>
              ID: {student.student_id} • Grade {student.grade_level}
            </Text>
          </View>
        </View>
        
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#f0f9ff',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Ionicons name="chevron-forward" size={20} color="#2196F3" />
        </View>
      </View>
    </Pressable>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={{
        paddingVertical: 20,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
      }}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={{
          color: '#6c757d',
          marginTop: 8,
          fontSize: 14,
          fontWeight: '500',
        }}>
          Loading more students...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 40,
        marginHorizontal: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: searchQuery ? '#fff3cd' : '#f0f9ff',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons 
            name={searchQuery ? "search" : "people"} 
            size={40} 
            color={searchQuery ? "#f59e0b" : "#2196F3"} 
          />
        </View>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: '#2c3e50',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          {searchQuery ? "No students found" : "No students enrolled"}
        </Text>
        <Text style={{
          color: '#6c757d',
          textAlign: 'center',
          lineHeight: 22,
          fontSize: 16,
        }}>
          {searchQuery
            ? `No students match "${searchQuery}". Try a different search term.`
            : "Upload a roster or add individual students to get started!"}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <StudentListSkeleton />
      </View>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      {/* Header with Gradient */}
      <View style={{
        backgroundColor: '#16a085', // Teal gradient fallback
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
          Student Roster
        </Text>
        <Text style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: 20,
        }}>
          Manage your students and class organization
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
              {Math.ceil(totalCount / 25) || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              Classes
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
              {totalCount || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              Students
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
              {new Set(students.map((s) => s.grade_level)).size || 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'center' }}>
              Grades
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingTop: 0, marginTop: -20 }}>
        
        {/* Search Section */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 20,
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
            marginBottom: 16,
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
              <Ionicons name="search" size={24} color="#2196F3" />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#2c3e50',
            }}>
              Find Students
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 2,
            borderColor: searchQuery ? '#2196F3' : 'transparent',
          }}>
            <Ionicons
              name="search"
              size={20}
              color={searchQuery ? '#2196F3' : '#6c757d'}
              style={{ marginRight: 12 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#2c3e50',
                fontWeight: '500',
              }}
              placeholder="Search by name or student ID..."
              placeholderTextColor="#6c757d"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={{
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: '#e9ecef',
                }}
              >
                <Ionicons name="close" size={16} color="#6c757d" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 20,
          gap: 12,
        }}>
          <Pressable
            onPress={() => setShowUploadModal(true)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
              backgroundColor: '#2196F3',
              borderRadius: 16,
              shadowColor: '#2196F3',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons
              name="cloud-upload"
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: 16,
            }}>
              Upload Roster
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowAddStudentModal(true)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
              backgroundColor: '#4CAF50',
              borderRadius: 16,
              shadowColor: '#4CAF50',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons
              name="person-add"
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: 16,
            }}>
              Add Student
            </Text>
          </Pressable>
        </View>

        {/* Upload Results */}
        {results.length > 0 && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 20,
          }}>
            <View style={{
              backgroundColor: '#d1f2eb',
              borderRadius: 16,
              padding: 20,
              borderLeftWidth: 4,
              borderLeftColor: '#4CAF50',
              shadowColor: '#4CAF50',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#155724"
                  style={{ marginRight: 8 }}
                />
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#155724',
                }}>
                  Recent Student Additions
                </Text>
              </View>
              {results.slice(0, 3).map((result, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{
                    color: '#155724',
                    fontSize: 16,
                    fontWeight: '500',
                  }}>
                    {result.student_id}
                  </Text>
                  <Text style={{
                    color: result.status === "ok" ? '#155724' : '#721c24',
                    fontWeight: '700',
                    fontSize: 14,
                    textTransform: 'uppercase',
                  }}>
                    {result.status}
                  </Text>
                </View>
              ))}
              {results.length > 3 && (
                <Text style={{
                  color: '#155724',
                  fontSize: 14,
                  marginTop: 8,
                  fontStyle: 'italic',
                }}>
                  ...and {results.length - 3} more students added
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Student List */}
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.user_id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 20,
          }}
        />
      </View>

      <UploadRosterModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
      />

      <AddStudentModal
        visible={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onStudentAdded={handleStudentAdded}
      />
    </PullToRefresh>
  );
}
