import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View
} from "react-native";
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

    // Validation: Must have first/last names
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
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Header - matches AddStudentModal */}
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
          <View style={{ width: 50 }} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529" }}>
            Upload Roster
          </Text>
          <Pressable
            onPress={() => {
              setValidationResults(null);
              onClose();
            }}
          >
            <Text style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}>
              Cancel
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, padding: 16 }}>
          {!validationResults ? (
            <>
              {/* Instructions Card - Enhanced */}
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
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#212529",
                    marginBottom: 12,
                  }}
                >
                  📋 CSV File Requirements
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: "#6c757d",
                    marginBottom: 16,
                    lineHeight: 20,
                  }}
                >
                  Upload a CSV file with your student roster. Make sure your file includes these required columns:
                </Text>

                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#dc3545",
                      marginRight: 10,
                      marginTop: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#212529", fontWeight: "600", fontSize: 14 }}>
                        Student ID <Text style={{ color: "#dc3545" }}>*</Text>
                      </Text>
                      <Text style={{ color: "#6c757d", fontSize: 12, lineHeight: 16 }}>
                        3-10 digits only. Also accepts: "Student Number", "ID", "StudentID"
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#dc3545",
                      marginRight: 10,
                      marginTop: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#212529", fontWeight: "600", fontSize: 14 }}>
                        First Name & Last Name <Text style={{ color: "#dc3545" }}>*</Text>
                      </Text>
                      <Text style={{ color: "#6c757d", fontSize: 12, lineHeight: 16 }}>
                        Separate columns required. Also accepts: "Given Name", "Surname", "Family Name"
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#dc3545",
                      marginRight: 10,
                      marginTop: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#212529", fontWeight: "600", fontSize: 14 }}>
                        Grade Level <Text style={{ color: "#dc3545" }}>*</Text>
                      </Text>
                      <Text style={{ color: "#6c757d", fontSize: 12, lineHeight: 16 }}>
                        Must be 6, 7, 8, 9, 10, 11, or 12. Also accepts: "Grade"
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#dc3545",
                      marginRight: 10,
                      marginTop: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#212529", fontWeight: "600", fontSize: 14 }}>
                        Parent Email <Text style={{ color: "#dc3545" }}>*</Text>
                      </Text>
                      <Text style={{ color: "#6c757d", fontSize: 12, lineHeight: 16 }}>
                        Valid email address. Also accepts: "Guardian Email", "Email"
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#28a745",
                      marginRight: 10,
                      marginTop: 8
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#212529", fontWeight: "600", fontSize: 14 }}>
                        Parent First Name & Parent Last Name <Text style={{ color: "#28a745" }}>Optional</Text>
                      </Text>
                      <Text style={{ color: "#6c757d", fontSize: 12, lineHeight: 16 }}>
                        If provided, will be used for parent accounts
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Upload Button */}
              <Pressable
                onPress={handleFileUpload}
                style={{
                  padding: 18,
                  backgroundColor: "#2196F3",
                  borderRadius: 12,
                  shadowColor: "#2196F3",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                  marginBottom: 16,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  📁 Select CSV File
                </Text>
              </Pressable>

              {/* Tips Card */}
              <View
                style={{
                  backgroundColor: "#e3f2fd",
                  borderRadius: 12,
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: "#2196f3",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#1976d2",
                    marginBottom: 8,
                  }}
                >
                  💡 Helpful Tips
                </Text>
                
                <View style={{ gap: 4 }}>
                  <Text style={{ color: "#1565c0", fontSize: 12, lineHeight: 16 }}>
                    • Column names are case-insensitive and flexible
                  </Text>
                  <Text style={{ color: "#1565c0", fontSize: 12, lineHeight: 16 }}>
                    • Extra columns will be ignored (no need to remove them)
                  </Text>
                  <Text style={{ color: "#1565c0", fontSize: 12, lineHeight: 16 }}>
                    • Empty rows will be skipped automatically
                  </Text>
                  <Text style={{ color: "#1565c0", fontSize: 12, lineHeight: 16 }}>
                    • File will be validated before any uploads begin
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Validation Results */}
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
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: 12,
                  }}
                >
                  Validation Results
                </Text>

                {validationResults.errors.length > 0 ? (
                  <View
                    style={{
                      backgroundColor: "#fef2f2",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: "#dc2626",
                    }}
                  >
                    <Text
                      style={{
                        color: "#dc2626",
                        fontWeight: "600",
                        marginBottom: 8,
                        fontSize: 14,
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
                          lineHeight: 16,
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
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: "#16a34a",
                    }}
                  >
                    <Text
                      style={{
                        color: "#16a34a",
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      ✅ Validation Successful! Found{" "}
                      {validationResults.rows.length} valid student(s)
                    </Text>
                  </View>
                )}

                {validationResults.rows.length > 0 && (
                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        marginBottom: 8,
                        color: "#212529",
                        fontSize: 14,
                      }}
                    >
                      Preview (first 3):
                    </Text>
                    {validationResults.rows.slice(0, 3).map((row, index) => (
                      <Text
                        key={index}
                        style={{
                          fontSize: 12,
                          marginBottom: 4,
                          color: "#6c757d",
                          lineHeight: 16,
                        }}
                      >
                        {row.student_id}: {row.first_name} {row.last_name}{" "}
                        (Grade {row.grade_level})
                      </Text>
                    ))}
                    {validationResults.rows.length > 3 && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontStyle: "italic",
                          color: "#6c757d",
                        }}
                      >
                        ...and {validationResults.rows.length - 3} more
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={resetValidation}
                  style={{
                    flex: 1,
                    backgroundColor: "#6b7280",
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontWeight: "600", fontSize: 14 }}
                  >
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
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      shadowColor: uploading ? "transparent" : "#16a34a",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: uploading ? 0 : 4,
                    }}
                  >
                    {uploading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        🚀 Upload to Database
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
