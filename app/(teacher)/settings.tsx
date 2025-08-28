import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { pickFile } from "../../components/FilePicker";
import { showErrorAlert, showSuccessAlert } from "../../components/ShowAlert";
import { supabase } from "../../services/supabase-init";

interface TeacherProfile {
  display_name: string;
  avatar_url?: string;
  students_call_me?: string;
  bio?: string;
  school_name?: string;
}

export default function TeacherSettings() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<TeacherProfile>({
    display_name: "",
    avatar_url: undefined,
    students_call_me: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        setLoading(false);
        return;
      }

      setEmail(user.user.email || null);

      // Get current profile with school information
      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select(
          `
          display_name, 
          avatar_url, 
          students_call_me, 
          bio,
          school_id,
          schools:schools(name)
        `
        )
        .eq("user_id", user.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      } else if (profileData) {
        setProfile({
          display_name: String(profileData.display_name || ""),
          avatar_url: profileData.avatar_url || undefined,
          students_call_me: String(profileData.students_call_me || ""),
          bio: String(profileData.bio || ""),
          school_name:
            profileData?.schools &&
            typeof profileData.schools === "object" &&
            "name" in profileData.schools
              ? (profileData.schools.name as string)
              : "",
        });
      }
    } catch (error) {
      console.error("Error in loadProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async () => {
    try {
      const result = await pickFile({
        type: ["image/jpeg", "image/png", "image/gif"],
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Upload to Supabase Storage
      const fileExt = file.name?.split(".")?.pop() || "jpg";
      const fileName = `${user.user.id}/avatar.${fileExt}`;

      // For web, we need to convert the file URI to a File object
      let fileToUpload;
      if (file.uri.startsWith("data:")) {
        // Data URI - convert to Blob
        const response = await fetch(file.uri);
        fileToUpload = await response.blob();
      } else {
        // File URI - read as File
        const response = await fetch(file.uri);
        fileToUpload = await response.blob();
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, fileToUpload, {
          upsert: true,
          contentType: file.mimeType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      showSuccessAlert("Avatar uploaded successfully!");
    } catch (error: any) {
      showErrorAlert(error.message || "Failed to upload avatar");
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from("user_profiles").upsert({
        user_id: user.user.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        students_call_me: profile.students_call_me,
        bio: profile.bio,
        role: "teacher", // Ensure role is set
      });

      if (error) throw error;

      showSuccessAlert("Profile updated successfully!");
    } catch (error: any) {
      showErrorAlert(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Teacher ID Card */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 2,
            borderColor: "#3b82f6",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* School Badge Header */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 60,
              backgroundColor: "#3b82f6",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          />

          {/* Edit Button - Simple Modern Style */}
          <Pressable
            onPress={() => setShowEditModal(true)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "#ffffff",
              borderRadius: 18,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5,
              zIndex: 999,
              borderWidth: 1.5,
              borderColor: "#3b82f6",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#3b82f6",
                fontWeight: "600",
                lineHeight: 14,
              }}
            >
              ✎
            </Text>
          </Pressable>

          {/* School Name Banner */}
          <View
            style={{
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
              }}
            >
              {profile.school_name || "School Name"}
            </Text>
          </View>

          {/* Teacher Info Section */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            {/* Avatar */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "#f1f5f9",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 4,
                borderColor: "#fff",
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              {profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 92, height: 92, borderRadius: 46 }}
                />
              ) : (
                <Text style={{ fontSize: 48 }}>👩‍🏫</Text>
              )}
            </View>

            {/* Teacher Name */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#1e293b",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {profile.display_name || "Teacher"}
            </Text>

            {/* "Students Call Me" Badge */}
            {profile.students_call_me && (
              <View
                style={{
                  backgroundColor: "#8b5cf6",
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  {profile.students_call_me}
                </Text>
              </View>
            )}
          </View>

          {/* Teacher ID Section */}
          <View
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  TEACHER ID
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#1e293b",
                    fontFamily: "monospace",
                  }}
                >
                  {email?.split("@")[0]?.toUpperCase() || "TEACHER"}
                </Text>
              </View>

              {/* Badge Icon */}
              <View
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: "#3b82f6",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: "#fff",
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    ✓
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          {profile.bio && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#f9fafb",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
                {profile.bio}
              </Text>
            </View>
          )}

          {/* Decorative Elements */}
          <View
            style={{
              position: "absolute",
              top: 80,
              left: -10,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "rgba(59, 130, 246, 0.1)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 120,
              right: -15,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(139, 92, 246, 0.1)",
            }}
          />
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={signOut}
          style={{
            padding: 16,
            backgroundColor: "#fff5f5",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#ffdddd",
            marginBottom: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#d32f2f" }}>
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
          {/* Header */}
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
              Edit Profile
            </Text>
            <Pressable onPress={() => setShowEditModal(false)}>
              <Text
                style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          {/* Content - No ScrollView */}
          <View style={{ flex: 1, padding: 16 }}>
            {/* Avatar Upload Section - Compact */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                alignItems: "center",
              }}
            >
              <Pressable
                onPress={uploadAvatar}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#f8f9fa",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "#e9ecef",
                    marginBottom: 8,
                  }}
                >
                  {profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{ width: 74, height: 74, borderRadius: 37 }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "600",
                        color: "#6c757d",
                      }}
                    >
                      {profile.display_name?.charAt(0)?.toUpperCase() || "T"}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#3b82f6",
                    fontWeight: "600",
                  }}
                >
                  Tap to change photo
                </Text>
              </Pressable>
            </View>

            {/* Form Fields - Flex to fill remaining space */}
            <View
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: 16,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {/* Display Name */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: 8,
                  }}
                >
                  Display Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.display_name ? "#3b82f6" : "#e9ecef",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                  }}
                  value={profile.display_name || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, display_name: text }))
                  }
                  placeholder="Enter your display name"
                  placeholderTextColor="#6c757d"
                />
              </View>

              {/* Students Call Me */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: 8,
                  }}
                >
                  How students should address you
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.students_call_me
                      ? "#3b82f6"
                      : "#e9ecef",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                  }}
                  value={profile.students_call_me || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, students_call_me: text }))
                  }
                  placeholder="e.g., Ms. Smith, Teacher Sarah"
                  placeholderTextColor="#6c757d"
                />
              </View>

              {/* Bio - Takes remaining space */}
              <View style={{ flex: 1, marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#212529",
                    marginBottom: 8,
                  }}
                >
                  Bio
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: profile.bio ? "#3b82f6" : "#e9ecef",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    textAlignVertical: "top",
                  }}
                  value={profile.bio || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, bio: text }))
                  }
                  placeholder="Tell students about yourself..."
                  placeholderTextColor="#6c757d"
                  multiline={true}
                />
              </View>

              {/* Save Button */}
              <Pressable
                onPress={async () => {
                  await saveProfile();
                  setShowEditModal(false);
                }}
                disabled={saving}
                style={{
                  padding: 16,
                  backgroundColor: !saving ? "#3b82f6" : "#e9ecef",
                  borderRadius: 12,
                  shadowColor: !saving ? "#3b82f6" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#ffffff",
                  }}
                >
                  {saving ? "Updating Profile..." : "Update Profile"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
