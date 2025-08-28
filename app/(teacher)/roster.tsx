import StudentListSkeleton from "@/components/StudentListSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery("");
    loadStudents(true);
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      android_ripple={{ color: "#e3f2fd" }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "600", fontSize: 16, color: "#212529" }}>
          {student.display_name}
        </Text>
        <Text style={{ color: "#6c757d", fontSize: 14, marginTop: 2 }}>
          ID: {student.student_id} • Grade {student.grade_level}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: "#007bff", fontSize: 18, fontWeight: "300" }}>
          ›
        </Text>
      </View>
    </Pressable>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={{ paddingVertical: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#007bff" />
        <Text style={{ color: "#6c757d", marginTop: 8, fontSize: 14 }}>
          Loading more students...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>
          {searchQuery ? "🔍" : "👥"}
        </Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#495057",
            marginBottom: 8,
          }}
        >
          {searchQuery ? "No students found" : "No students enrolled"}
        </Text>
        <Text style={{ color: "#6c757d", textAlign: "center", lineHeight: 20 }}>
          {searchQuery
            ? `No students match "${searchQuery}". Try a different search term.`
            : "Upload a roster or add individual students to get started!"}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <View
        style={{
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: "#f8f9fa",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.3)",
          }}
        >
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#007bff" }}>
              {Math.ceil(totalCount / 25) || 0}
            </Text>
            <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "500" }}>
              CLASSES
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: "#e9ecef",
              marginHorizontal: 16,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#28a745" }}>
              {totalCount || 0}
            </Text>
            <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "500" }}>
              STUDENTS
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: "#e9ecef",
              marginHorizontal: 16,
            }}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#ffc107" }}>
              {new Set(students.map((s) => s.grade_level)).size || 0}
            </Text>
            <Text style={{ fontSize: 12, color: "#6c757d", fontWeight: "500" }}>
              GRADES
            </Text>
          </View>
        </View>

        {/* Enhanced Search Bar */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 2,
              borderColor: searchQuery ? "#007bff" : "#e9ecef",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons
              name="search"
              size={22}
              color={searchQuery ? "#007bff" : "#6c757d"}
              style={{ marginRight: 12 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: "#212529",
                paddingVertical: 2,
                fontWeight: "500",
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
                  padding: 6,
                  borderRadius: 12,
                  backgroundColor: "#f8f9fa",
                }}
              >
                <Ionicons name="close" size={18} color="#6c757d" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
        <Pressable
          onPress={() => setShowUploadModal(true)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "#007bff",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Upload Roster
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowAddStudentModal(true)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "#28a745",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons
            name="person-add-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Add Student
          </Text>
        </Pressable>
      </View>

      {/* Upload Results */}
      {results.length > 0 && (
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View
            style={{
              padding: 16,
              backgroundColor: "#d4edda",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#c3e6cb",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#155724"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#155724" }}
              >
                Recent Student Additions
              </Text>
            </View>
            {results.slice(0, 3).map((result, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#155724", fontSize: 14 }}>
                  {result.student_id}
                </Text>
                <Text
                  style={{
                    color: result.status === "ok" ? "#155724" : "#721c24",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {result.status}
                </Text>
              </View>
            ))}
            {results.length > 3 && (
              <Text style={{ color: "#155724", fontSize: 12, marginTop: 4 }}>
                ...and {results.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Content Area */}
      {loading ? (
        <StudentListSkeleton />
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.user_id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 20,
          }}
        />
      )}

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
    </View>
  );
}
