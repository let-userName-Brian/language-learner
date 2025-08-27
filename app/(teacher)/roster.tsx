import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import AddStudentModal from "../../components/AddStudentModal";
import UploadRosterModal from "../../components/UploadRosterModal";
import { supabase } from "../../services/supabase-init";

export default function TeacherRoster() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
  }, []);

  const handleUploadComplete = (uploadResults: any[]) => {
    setResults(uploadResults);
    console.log("uploadResults", uploadResults);
    loadStudents();
  };

  const handleStudentAdded = (studentResult: any) => {
    // Add the single student result to our results array
    setResults((prev) => [studentResult, ...prev]);
    console.log("studentResult", studentResult);
    loadStudents();
  };

  const loadStudents = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get teacher's school_id from their profile
      const { data: teacherProfile } = await supabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", user.user.id)
        .single();

      if (!teacherProfile?.school_id) return;

      // Load students from user_profiles - simple role check first
      const { data: studentsData } = await supabase
        .from("user_profiles")
        .select(
          "user_id, display_name, grade_level, student_id, role, school_id"
        )
        .eq("role", "student")
        .eq("school_id", teacherProfile.school_id)
        .order("display_name");

      setStudents(studentsData || []);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Student Roster</Text>
        <Text style={{ color: "#666", marginTop: 4 }}>
          Manage your students and their progress.
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => setShowUploadModal(true)}
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: "#007bff",
            borderRadius: 10,
          }}
        >
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}
          >
            📁 Upload Roster
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowAddStudentModal(true)}
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: "#28a745",
            borderRadius: 10,
          }}
        >
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}
          >
            👤 Add Student
          </Text>
        </Pressable>
      </View>

      {/* Upload Results */}
      {results.length > 0 && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#d4edda",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#c3e6cb",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 8,
              color: "#155724",
            }}
          >
            📊 Recent Student Additions
          </Text>
          {results.slice(0, 5).map((result, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 2,
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
          {results.length > 5 && (
            <Text style={{ color: "#155724", fontSize: 12, marginTop: 4 }}>
              ...and {results.length - 5} more
            </Text>
          )}
        </View>
      )}

      {/* Current Students */}
      <View
        style={{
          flex: 1,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e9ecef",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
          👥 Current Students ({students.length})
        </Text>
        {students.length === 0 ? (
          <Text style={{ color: "#666" }}>
            No students enrolled yet. Upload a roster or add individual students
            to get started!
          </Text>
        ) : (
          <ScrollView>
            {students.map((student, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: index < students.length - 1 ? 1 : 0,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <Text style={{ fontWeight: "500" }}>
                  {student.display_name}
                </Text>
                <Text style={{ color: "#666" }}>
                  Grade {student.grade_level}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
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
    </View>
  );
}
