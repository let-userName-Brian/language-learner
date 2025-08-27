import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../services/supabase-init";
import { pickExcelFile, readFileContent } from "./FilePicker";
import { showErrorAlert, showSuccessAlert } from "./ShowAlert";

interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  parent_email: string;
  parent_first_name?: string;
  parent_last_name?: string;
}

interface UploadRosterModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadComplete: (results: any[]) => void;
}

export default function UploadRosterModal({
  visible,
  onClose,
  onUploadComplete,
}: UploadRosterModalProps) {
  const [uploading, setUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    rows: RosterRow[];
    errors: string[];
  } | null>(null);

  const findColumn = (headers: string[], possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const index = headers.findIndex(
        (h) => h.toLowerCase().trim() === name.toLowerCase()
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const parseCSVContent = (
    content: string
  ): { rows: RosterRow[]; errors: string[] } => {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return {
        rows: [],
        errors: ["CSV must have at least a header row and one data row"],
      };
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"(.*)"$/, "$1"));
    const rows: RosterRow[] = [];
    const errors: string[] = [];

    // Enhanced column mapping for first/last names
    const columnMap = {
      student_id: findColumn(headers, [
        "student id",
        "student_id",
        "studentid",
        "id",
        "student number",
      ]),
      first_name: findColumn(headers, [
        "first name",
        "first_name",
        "firstname",
        "given name",
      ]),
      last_name: findColumn(headers, [
        "last name",
        "last_name",
        "lastname",
        "surname",
        "family name",
      ]),
      grade_level: findColumn(headers, ["grade", "grade level", "grade_level"]),
      parent_email: findColumn(headers, [
        "parent email",
        "parent_email",
        "parentemail",
        "guardian email",
        "email",
      ]),
      parent_first_name: findColumn(headers, [
        "parent first name",
        "parent_first_name",
        "guardian first name",
      ]),
      parent_last_name: findColumn(headers, [
        "parent last name",
        "parent_last_name",
        "guardian last name",
      ]),
    };

    // Validation: Must have either first/last names OR full name
    // Validation: Must have first/last names (no more full name option)
    const hasFirstLast =
      columnMap.first_name !== -1 && columnMap.last_name !== -1;

    if (columnMap.student_id === -1) {
      errors.push("Missing required column: Student ID (or similar)");
    }
    if (!hasFirstLast) {
      errors.push(
        "Missing required columns: 'First Name' & 'Last Name' are both required"
      );
    }
    if (columnMap.grade_level === -1) {
      errors.push("Missing required column: Grade Level (or similar)");
    }
    if (columnMap.parent_email === -1) {
      errors.push("Missing required column: Parent Email (or similar)");
    }

    if (errors.length > 0) {
      return { rows, errors };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line
        .split(",")
        .map((p) => p.trim().replace(/^"(.*)"$/, "$1"));
      const rowNum = i + 1;

      const studentId = parts[columnMap.student_id]?.trim();
      const gradeLevel = parts[columnMap.grade_level]?.trim();
      const parentEmail = parts[columnMap.parent_email]?.trim();

      // Handle names - only from first/last columns now
      const firstName = parts[columnMap.first_name]?.trim() || "";
      const lastName = parts[columnMap.last_name]?.trim() || "";

      // Parent names (optional)
      const parentFirstName =
        columnMap.parent_first_name !== -1
          ? parts[columnMap.parent_first_name]?.trim()
          : undefined;
      const parentLastName =
        columnMap.parent_last_name !== -1
          ? parts[columnMap.parent_last_name]?.trim()
          : undefined;
      // Validation
      if (!studentId) {
        errors.push(`Row ${rowNum}: Missing Student ID`);
        continue;
      }
      if (!firstName) {
        errors.push(`Row ${rowNum}: Missing First Name`);
        continue;
      }
      if (!lastName) {
        errors.push(`Row ${rowNum}: Missing Last Name`);
        continue;
      }
      if (!gradeLevel) {
        errors.push(`Row ${rowNum}: Missing Grade Level`);
        continue;
      }
      if (!parentEmail) {
        errors.push(`Row ${rowNum}: Missing Parent Email`);
        continue;
      }

      if (!/^\d{3,10}$/.test(studentId)) {
        errors.push(
          `Row ${rowNum}: Student ID "${studentId}" should be 3-10 digits only`
        );
        continue;
      }

      if (!/^(6|7|8|9|10|11|12)$/.test(gradeLevel)) {
        errors.push(
          `Row ${rowNum}: Grade Level "${gradeLevel}" must be 6, 7, 8, 9, 10, 11, or 12`
        );
        continue;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        errors.push(
          `Row ${rowNum}: Invalid parent email format "${parentEmail}"`
        );
        continue;
      }

      if (rows.some((r) => r.student_id === studentId)) {
        errors.push(`Row ${rowNum}: Duplicate Student ID "${studentId}"`);
        continue;
      }

      rows.push({
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        grade_level: gradeLevel,
        parent_email: parentEmail,
        parent_first_name: parentFirstName,
        parent_last_name: parentLastName,
      });
    }

    return { rows, errors };
  };

  const handleFileUpload = async () => {
    try {
      const result = await pickExcelFile();

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];

        if (
          file.mimeType === "text/csv" ||
          file.name.toLowerCase().endsWith(".csv")
        ) {
          try {
            const content = await readFileContent(file);
            const { rows, errors } = parseCSVContent(content);

            setValidationResults({ rows, errors });

            if (errors.length > 0) {
              showErrorAlert(
                `Found ${errors.length} validation error(s). Please review and fix before uploading.`
              );
            } else {
              showSuccessAlert(
                `Validation successful! Found ${rows.length} valid student records. Ready to upload.`
              );
            }
          } catch (error: any) {
            showErrorAlert(`Failed to read CSV file: ${error.message}`);
          }
        } else {
          showErrorAlert(
            "Please select a CSV file. Excel files (.xlsx) are not yet supported for reading content."
          );
        }
      }
    } catch (error: any) {
      showErrorAlert(error.message || "Failed to process file");
    }
  };

  const uploadToDatabase = async () => {
    if (!validationResults || validationResults.errors.length > 0) {
      showErrorAlert("Please fix all validation errors before uploading.");
      return;
    }

    try {
      setUploading(true);

      // Get the access token and user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Get teacher's profile to get school info
      const { data: teacherProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", session.user.id)
        .single();

      if (profileError || !teacherProfile?.school_id) {
        throw new Error("Teacher profile or school information not found");
      }

      // Get school slug
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("slug")
        .eq("id", teacherProfile.school_id)
        .single();

      if (schoolError || !schoolData?.slug) {
        throw new Error("Could not load school information");
      }

      // Get current academic year
      let { data: currentYear } = await supabase
        .from("academic_years")
        .select("label")
        .eq("is_current", true)
        .maybeSingle();

      if (!currentYear) {
        // Create current academic year if it doesn't exist
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
          throw new Error("Could not create academic year");
        }
        currentYear = newYear;
      }

      // Convert to format expected by provision function
      const formattedRows = validationResults.rows.map((row) => ({
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        grade_level: row.grade_level,
        parent_email: row.parent_email,
        parent_first_name: row.parent_first_name,
        parent_last_name: row.parent_last_name,
      }));

      // Call the provision function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/provision-roster`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            school_slug: schoolData.slug,
            year_label: currentYear.label,
            rows: formattedRows,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Upload failed");
      }

      showSuccessAlert(
        `Successfully uploaded ${formattedRows.length} students!`
      );
      onUploadComplete(result.results);
      setValidationResults(null);
      onClose();
    } catch (error: any) {
      showErrorAlert(error.message || "Failed to upload roster");
    } finally {
      setUploading(false);
    }
  };

  const resetValidation = () => {
    setValidationResults(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Upload Roster</Text>
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 16, color: "#666" }}>✕</Text>
          </Pressable>
        </View>

        {!validationResults ? (
          <>
            {/* File Format Guide */}
            <View
              style={{
                backgroundColor: "#fff3cd",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#ffeaa7",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 12,
                  color: "#856404",
                }}
              >
                📋 Column Requirements (Option 1: Separate Names)
              </Text>
              <Text style={{ color: "#856404", marginBottom: 12 }}>
                Recommended format with separate name columns:
              </Text>

              <View style={{ marginLeft: 10, gap: 8, marginBottom: 16 }}>
                <View>
                  <Text style={{ color: "#856404", fontWeight: "600" }}>
                    ✅ Student ID (required)
                  </Text>
                  <Text style={{ color: "#856404", fontSize: 12 }}>
                    Also accepts: "Student Number", "ID", "StudentID"
                  </Text>
                </View>

                <View>
                  <Text style={{ color: "#856404", fontWeight: "600" }}>
                    ✅ First Name (required)
                  </Text>
                  <Text style={{ color: "#856404", fontSize: 12 }}>
                    Also accepts: "Given Name", "FirstName"
                  </Text>
                </View>

                <View>
                  <Text style={{ color: "#856404", fontWeight: "600" }}>
                    ✅ Last Name (required)
                  </Text>
                  <Text style={{ color: "#856404", fontSize: 12 }}>
                    Also accepts: "Surname", "Family Name", "LastName"
                  </Text>
                </View>

                <View>
                  <Text style={{ color: "#856404", fontWeight: "600" }}>
                    ✅ Grade Level (required)
                  </Text>
                  <Text style={{ color: "#856404", fontSize: 12 }}>
                    Must be 6-12 (or similar)
                  </Text>
                </View>

                <View>
                  <Text style={{ color: "#856404", fontWeight: "600" }}>
                    📧 Parent Email (required)
                  </Text>
                  <Text style={{ color: "#856404", fontSize: 12 }}>
                    Also accepts: "Guardian Email", "Email"
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleFileUpload}
              style={{
                backgroundColor: "#3b82f6",
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                📁 Select CSV File
              </Text>
            </Pressable>

            <View
              style={{
                backgroundColor: "#f0f9ff",
                borderRadius: 6,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: "#3b82f6",
              }}
            >
              <Text
                style={{ color: "#1e40af", fontSize: 12, fontStyle: "italic" }}
              >
                💡 Tip: Column names are case-insensitive and flexible. "First
                Name", "first_name", and "FirstName" all work!
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Validation Results */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}
              >
                Validation Results
              </Text>

              {validationResults.errors.length > 0 ? (
                <View
                  style={{
                    backgroundColor: "#fef2f2",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#fecaca",
                  }}
                >
                  <Text
                    style={{
                      color: "#dc2626",
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  >
                    ❌ Found {validationResults.errors.length} Error(s):
                  </Text>
                  {validationResults.errors.map((error, index) => (
                    <Text
                      key={index}
                      style={{
                        color: "#dc2626",
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      • {error}
                    </Text>
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#bbf7d0",
                  }}
                >
                  <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                    ✅ Validation Successful! Found{" "}
                    {validationResults.rows.length} valid student(s)
                  </Text>
                </View>
              )}

              {validationResults.rows.length > 0 && (
                <View
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                    Preview (first 3):
                  </Text>
                  {validationResults.rows.slice(0, 3).map((row, index) => (
                    <Text key={index} style={{ fontSize: 12, marginBottom: 4 }}>
                      {row.student_id}: {row.first_name} {row.last_name} (Grade{" "}
                      {row.grade_level})
                      {row.parent_email && ` - Parent: ${row.parent_email}`}
                    </Text>
                  ))}
                  {validationResults.rows.length > 3 && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontStyle: "italic",
                        color: "#666",
                      }}
                    >
                      ...and {validationResults.rows.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <Pressable
                onPress={resetValidation}
                style={{
                  flex: 1,
                  backgroundColor: "#6b7280",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  📁 Choose Different File
                </Text>
              </Pressable>

              {validationResults.errors.length === 0 && (
                <Pressable
                  onPress={uploadToDatabase}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    backgroundColor: uploading ? "#9ca3af" : "#16a34a",
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    {uploading ? "⏳ Uploading..." : "🚀 Upload to Database"}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}
