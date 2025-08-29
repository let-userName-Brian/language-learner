import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../services/supabase-init";
import { showErrorBanner, showSuccessBanner } from "./ShowAlert";

interface AddStudentModalProps {
  visible: boolean;
  onClose: () => void;
  onStudentAdded: (result: any) => void;
}

interface StudentFormData {
  student_id: string;
  first_name: string;
  grade_level: string;
  parent_email: string;
}

const GRADE_LEVELS = ["6", "7", "8", "9", "10", "11", "12"];

export default function AddStudentModal({
  visible,
  onClose,
  onStudentAdded,
}: AddStudentModalProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    student_id: "",
    first_name: "",
    grade_level: "",
    parent_email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.student_id.trim()) {
      errors.push("Student ID is required");
    } else if (!/^\d{3,10}$/.test(formData.student_id.trim())) {
      errors.push("Student ID should be 3-10 digits only");
    }

    if (!formData.first_name.trim()) {
      errors.push("First Name is required");
    }
    if (!formData.grade_level.trim()) {
      errors.push("Grade Level is required");
    } else if (!GRADE_LEVELS.includes(formData.grade_level.trim())) {
      errors.push("Grade Level must be 6, 7, 8, 9, 10, 11, or 12");
    }

    if (!formData.parent_email.trim()) {
      errors.push("Parent Email is required");
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent_email.trim())
    ) {
      errors.push("Invalid parent email format");
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      showErrorBanner(
        `Please fix the following errors: ${errors.join(", ")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        showErrorBanner("You must be signed in");
        return;
      }

      // Get teacher's profile
      const { data: teacherProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("school_id, display_name")
        .eq("user_id", user.user.id)
        .single();

      if (profileError || !teacherProfile?.school_id) {
        showErrorBanner("Teacher profile missing school information");
        return;
      }

      // Get school info
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("slug")
        .eq("id", teacherProfile.school_id)
        .single();

      if (schoolError) {
        showErrorBanner("Could not load school information");
        return;
      }

      // Get or create academic year
      let { data: currentYear } = await supabase
        .from("academic_years")
        .select("label")
        .eq("is_current", true)
        .maybeSingle();

      if (!currentYear) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const startYear =
          currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1;
        const endYear = startYear + 1;
        const yearLabel = `${startYear}-${endYear}`;

        const { data: newYear } = await supabase
          .from("academic_years")
          .insert({
            label: yearLabel,
            starts_on: `${startYear}-08-01`,
            ends_on: `${endYear}-07-31`,
            is_current: true,
          })
          .select("label")
          .single();

        if (!newYear) {
          showErrorBanner("Could not create academic year");
          return;
        }
        currentYear = newYear;
      }

      // Create student directly via provision function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/provision-roster`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            school_slug: schoolData.slug,
            year_label: currentYear.label,
            rows: [
              {
                student_id: formData.student_id.trim(),
                first_name: formData.first_name.trim(),
                grade_level: formData.grade_level.trim(),
                parent_email: formData.parent_email.trim(),
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        const studentName = formData.first_name;
        showSuccessBanner(
          `Student ${studentName} added successfully!`,
          () => {
            resetForm();
            onStudentAdded(result);
            onClose();
          }
        );
      } else {
        showErrorBanner(result.error || "Failed to add student");
      }
    } catch (error) {
      showErrorBanner("Failed to add student");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      first_name: "",
      grade_level: "",
      parent_email: "",
    });
  };

  const isFormComplete = (): boolean => {
    return (
      formData.student_id.trim() !== "" &&
      formData.first_name.trim() !== "" &&
      formData.grade_level.trim() !== "" &&
      formData.parent_email.trim() !== ""
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Header - matches teacher settings pattern */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#ffffff",
            borderBottomWidth: 1,
            borderBottomColor: "#e9ecef",
          }}
        >
          <Pressable
            onPress={() => {
              resetForm();
              onClose();
            }}
          ></Pressable>
          <View style={{}} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529" }}>
            Add Student
          </Text>
          <Pressable
            onPress={() => {
              resetForm();
              onClose();
            }}
          >
            <Text style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}>
              Cancel
            </Text>
          </Pressable>
        </View>

        {/* Content - No ScrollView, designed to fit */}
        <View style={{ flex: 1, padding: 16 }}>
          {/* Form Container */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
              flex: 1,
            }}
          >
            {/* Student ID - Compact */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#212529",
                  marginBottom: 6,
                }}
              >
                Student ID
              </Text>
              <TextInput
                value={formData.student_id}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    student_id: text.replace(/[^\d]/g, ""),
                  })
                }
                placeholder="e.g., 12345"
                keyboardType="number-pad"
                maxLength={10}
                style={{
                  borderWidth: 2,
                  borderColor: formData.student_id ? "#2196F3" : "#e9ecef",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#f8f9fa",
                }}
              />
            </View>

            {/* Name Fields Row - More compact */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: 6,
                  }}
                >
                  First Name
                </Text>
                <TextInput
                  value={formData.first_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, first_name: text })
                  }
                  placeholder="Emma"
                  autoCapitalize="words"
                  style={{
                    borderWidth: 2,
                    borderColor: formData.first_name ? "#2196F3" : "#e9ecef",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                  }}
                />
              </View>
            </View>

            {/* Grade Level - Compact */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#212529",
                  marginBottom: 6,
                }}
              >
                Grade Level
              </Text>
              <Pressable
                onPress={() => setShowGradePicker(true)}
                style={{
                  borderWidth: 2,
                  borderColor: formData.grade_level ? "#2196F3" : "#e9ecef",
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: "#f8f9fa",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: formData.grade_level ? "#212529" : "#6c757d",
                  }}
                >
                  {formData.grade_level
                    ? `Grade ${formData.grade_level}`
                    : "Select grade level"}
                </Text>
                <Text style={{ color: "#6c757d", fontSize: 16 }}>▼</Text>
              </Pressable>
            </View>

            {/* Parent Email - Compact */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#212529",
                  marginBottom: 6,
                }}
              >
                Parent Email
              </Text>
              <TextInput
                value={formData.parent_email}
                onChangeText={(text) =>
                  setFormData({ ...formData, parent_email: text })
                }
                placeholder="parent@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 2,
                  borderColor: formData.parent_email ? "#2196F3" : "#e9ecef",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#f8f9fa",
                }}
              />
            </View>

            {/* What happens info - More detailed version */}
            <View
              style={{
                backgroundColor: "#e3f2fd",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 3,
                borderLeftColor: "#2196f3",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#1976d2",
                  marginBottom: 10,
                }}
              >
                What happens when you add this student:
              </Text>
              
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: "#1976d2",
                    marginRight: 8,
                    marginTop: 6
                  }} />
                  <Text style={{ color: "#1565c0", fontSize: 12, flex: 1, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "600" }}>Student account created</Text> with secure login credentials (Name + Student ID)
                  </Text>
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: "#1976d2",
                    marginRight: 8,
                    marginTop: 6
                  }} />
                  <Text style={{ color: "#1565c0", fontSize: 12, flex: 1, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "600" }}>Automatically enrolled</Text> in your class for immediate access
                  </Text>
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: "#1976d2",
                    marginRight: 8,
                    marginTop: 6
                  }} />
                  <Text style={{ color: "#1565c0", fontSize: 12, flex: 1, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "600" }}>Parent invitation sent</Text> to connect and monitor progress
                  </Text>
                </View>
              </View>
            </View>

            {/* Spacer to push button to bottom */}
            <View style={{ flex: 1 }} />

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !isFormComplete()}
              style={{
                padding: 16,
                backgroundColor:
                  submitting || !isFormComplete() ? "#e9ecef" : "#2196F3",
                borderRadius: 12,
                shadowColor:
                  submitting || !isFormComplete() ? "transparent" : "#2196F3",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: submitting || !isFormComplete() ? 0 : 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  style={{
                    color:
                      submitting || !isFormComplete() ? "#6c757d" : "white",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Add Student
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Grade Level Picker Modal */}
        <Modal
          visible={showGradePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGradePicker(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            onPress={() => setShowGradePicker(false)}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 20,
                width: "100%",
                maxWidth: 300,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: 16,
                  color: "#212529",
                }}
              >
                Select Grade Level
              </Text>

              <View style={{ gap: 8 }}>
                {GRADE_LEVELS.map((grade) => (
                  <Pressable
                    key={grade}
                    onPress={() => {
                      setFormData({ ...formData, grade_level: grade });
                      setShowGradePicker(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor:
                        formData.grade_level === grade ? "#2196F3" : "#f8f9fa",
                      borderWidth: 2,
                      borderColor:
                        formData.grade_level === grade ? "#2196F3" : "#e9ecef",
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: 14,
                        color:
                          formData.grade_level === grade ? "white" : "#212529",
                      }}
                    >
                      Grade {grade}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}
