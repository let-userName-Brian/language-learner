import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../services/supabase-init";
import { showErrorAlert, showSuccessAlert } from "./ShowAlert";

interface AddStudentModalProps {
  visible: boolean;
  onClose: () => void;
  onStudentAdded: (result: any) => void;
}

interface StudentFormData {
  student_id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  parent_email: string;
}

export default function AddStudentModal({
  visible,
  onClose,
  onStudentAdded,
}: AddStudentModalProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    student_id: "",
    first_name: "",
    last_name: "",
    grade_level: "",
    parent_email: "",
  });
  const [submitting, setSubmitting] = useState(false);

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

    if (!formData.last_name.trim()) {
      errors.push("Last Name is required");
    }

    if (!formData.grade_level.trim()) {
      errors.push("Grade Level is required");
    } else if (!/^(6|7|8|9|10|11|12)$/.test(formData.grade_level.trim())) {
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
      showErrorAlert(
        `Please fix the following errors:\n\n${errors.join("\n")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        showErrorAlert("You must be signed in");
        return;
      }

      // Get teacher's profile
      const { data: teacherProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("school_id, display_name")
        .eq("user_id", user.user.id)
        .single();

      if (profileError || !teacherProfile?.school_id) {
        showErrorAlert("Teacher profile missing school information");
        return;
      }

      // Get school info
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("slug")
        .eq("id", teacherProfile.school_id)
        .single();

      if (schoolError) {
        showErrorAlert("Could not load school information");
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
          showErrorAlert("Could not create academic year");
          return;
        }
        currentYear = newYear;
      }

      // Create student directly via provision function (simplified)
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
                last_name: formData.last_name.trim(),
                grade_level: formData.grade_level.trim(),
                parent_email: formData.parent_email.trim(),
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        showSuccessAlert(
          `Student ${formData.first_name} ${formData.last_name} added successfully!`,
          () => {
            setFormData({
              student_id: "",
              first_name: "",
              last_name: "",
              grade_level: "",
              parent_email: "",
            });
            onClose();
          }
        );
      } else {
        showErrorAlert(result.error || "Failed to add student");
      }
    } catch (error) {
      showErrorAlert("Failed to add student");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };
  const resetForm = () => {
    setFormData({
      student_id: "",
      first_name: "",
      last_name: "",
      grade_level: "",
      parent_email: "",
    });
  };

  const isFormComplete = (): boolean => {
    return (
      formData.student_id.trim() !== "" &&
      formData.first_name.trim() !== "" &&
      formData.last_name.trim() !== "" &&
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
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#e9ecef",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            Add New Student
          </Text>
          <Pressable
            onPress={() => {
              resetForm();
              onClose();
            }}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: "#f8f9fa",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#666" }}>
              ✕
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: "#666", marginBottom: 20 }}>
            Add a single student to your class. This will create their account
            and send a parent invitation.
          </Text>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            {/* Student ID */}
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Student ID <Text style={{ color: "#dc3545" }}>*</Text>
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
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontSize: 16,
                }}
              />
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                3-10 digits only
              </Text>
            </View>

            {/* First Name */}
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                First Name <Text style={{ color: "#dc3545" }}>*</Text>
              </Text>
              <TextInput
                value={formData.first_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, first_name: text })
                }
                placeholder="e.g., Emma"
                autoCapitalize="words"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontSize: 16,
                }}
              />
            </View>

            {/* Last Name */}
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Last Name <Text style={{ color: "#dc3545" }}>*</Text>
              </Text>
              <TextInput
                value={formData.last_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, last_name: text })
                }
                placeholder="e.g., Johnson"
                autoCapitalize="words"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontSize: 16,
                }}
              />
            </View>

            {/* Grade Level */}
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Grade Level <Text style={{ color: "#dc3545" }}>*</Text>
              </Text>
              <TextInput
                value={formData.grade_level}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    grade_level: text.replace(/[^\d]/g, ""),
                  })
                }
                placeholder="e.g., 9"
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontSize: 16,
                }}
              />
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                Must be 6, 7, 8, 9, 10, 11, or 12
              </Text>
            </View>

            {/* Parent Email */}
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Parent Email <Text style={{ color: "#dc3545" }}>*</Text>
              </Text>
              <TextInput
                value={formData.parent_email}
                onChangeText={(text) =>
                  setFormData({ ...formData, parent_email: text })
                }
                placeholder="e.g., parent@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: "#fff",
                  fontSize: 16,
                }}
              />
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                A parent invitation will be sent
              </Text>
            </View>
          </View>

          {/* Info Box */}
          <View
            style={{
              marginTop: 20,
              padding: 16,
              backgroundColor: "#d1ecf1",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#bee5eb",
            }}
          >
            <Text style={{ fontSize: 14, color: "#0c5460", fontWeight: "600" }}>
              What happens when you add a student:
            </Text>
            <Text style={{ fontSize: 14, color: "#0c5460", marginTop: 8 }}>
              • Student account is created with login credentials
            </Text>
            <Text style={{ fontSize: 14, color: "#0c5460" }}>
              • Student is enrolled in your class
            </Text>
            <Text style={{ fontSize: 14, color: "#0c5460" }}>
              • Parent invitation is sent
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !isFormComplete()}
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor:
                submitting || !isFormComplete() ? "#ccc" : "#28a745",
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              {submitting ? "Adding Student..." : "Add Student"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
