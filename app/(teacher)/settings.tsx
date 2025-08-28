import { PullToRefresh } from "@/components/PullToRefresh";
import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  if (loading) return <SettingsSkeleton />;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={refreshing}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      {/* Header with Gradient */}
      <View
        style={{
          backgroundColor: "#8e44ad", // Purple gradient fallback
          paddingTop: 20,
          paddingBottom: 30,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: "#fff",
            marginBottom: 8,
          }}
        >
          Teacher Profile
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 20,
          }}
        >
          Manage your teaching profile and preferences
        </Text>

        {/* Quick Stats */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginRight: 8,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="person"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Teacher Profile
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginHorizontal: 4,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="school"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              {profile.school_name || "School"}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginLeft: 8,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Verified
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingTop: 0, marginTop: -20 }}>
        {/* Teacher ID Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            marginHorizontal: 16,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Edit Button */}
          <Pressable
            onPress={() => setShowEditModal(true)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              backgroundColor: "#8e44ad",
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#8e44ad",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
              zIndex: 999,
            }}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
          </Pressable>

          {/* School Header Banner */}
          <View
            style={{
              marginBottom: 24,
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 8,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#8e44ad",
                  textAlign: "center",
                }}
              >
                {profile.school_name || "School Name"}
              </Text>
            </View>
          </View>

          {/* Teacher Profile Section */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            {/* Avatar with Status Ring */}
            <View
              style={{
                position: "relative",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#f8f9fa",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: "#8e44ad",
                  shadowColor: "#8e44ad",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                {profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 112, height: 112, borderRadius: 56 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: 56,
                      backgroundColor: "#8e44ad",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={60} color="#fff" />
                  </View>
                )}
              </View>

              {/* Online Status */}
              <View
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#4CAF50",
                  borderWidth: 3,
                  borderColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>

            {/* Teacher Name */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#2c3e50",
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
                  backgroundColor: "#8e44ad",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginBottom: 16,
                  shadowColor: "#8e44ad",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 16,
                    textAlign: "center",
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
              backgroundColor: "#f8f9fa",
              borderRadius: 16,
              padding: 20,
              borderLeftWidth: 4,
              borderLeftColor: "#8e44ad",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#6c757d",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Teacher ID
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#2c3e50",
                    fontFamily: "monospace",
                  }}
                >
                  {email?.split("@")[0]?.toUpperCase() || "TEACHER"}
                </Text>
              </View>

              <View
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: "#8e44ad",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#8e44ad",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="id-card" size={30} color="#fff" />
              </View>
            </View>
          </View>

          {/* Bio Section */}
          {profile.bio && (
            <View
              style={{
                backgroundColor: "#f0f9ff",
                borderRadius: 12,
                padding: 16,
                borderLeftWidth: 4,
                borderLeftColor: "#2196F3",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#2196F3" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#2196F3",
                    marginLeft: 8,
                  }}
                >
                  About Me
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  color: "#2c3e50",
                  lineHeight: 24,
                }}
              >
                {profile.bio}
              </Text>
            </View>
          )}
        </View>

        {/* Account Actions */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 20,
            marginHorizontal: 16,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#fff3cd",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="settings" size={24} color="#f59e0b" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#2c3e50",
              }}
            >
              Account Actions
            </Text>
          </View>

          <Pressable
            onPress={signOut}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              backgroundColor: "#fff5f5",
              borderRadius: 12,
              borderWidth: 2,
              borderColor: "#ffdddd",
              shadowColor: "#dc3545",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons
              name="log-out"
              size={20}
              color="#dc3545"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#dc3545",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </View>

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
              backgroundColor: "#8e44ad",
              paddingTop: 20,
              paddingBottom: 20,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Edit Profile
              </Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
          >
            {/* Avatar Upload Section */}
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
                marginBottom: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#2c3e50",
                  marginBottom: 16,
                }}
              >
                Profile Photo
              </Text>

              <Pressable
                onPress={uploadAvatar}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "#f8f9fa",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "#8e44ad",
                    marginBottom: 12,
                    shadowColor: "#8e44ad",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  {profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{ width: 94, height: 94, borderRadius: 47 }}
                    />
                  ) : (
                    <Ionicons name="camera" size={40} color="#8e44ad" />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#8e44ad",
                    fontWeight: "600",
                  }}
                >
                  Tap to change photo
                </Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {/* Display Name */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                    marginBottom: 8,
                  }}
                >
                  Display Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.display_name ? "#8e44ad" : "#e9ecef",
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    fontWeight: "500",
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
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                    marginBottom: 8,
                  }}
                >
                  How students should address you
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.students_call_me
                      ? "#8e44ad"
                      : "#e9ecef",
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    fontWeight: "500",
                  }}
                  value={profile.students_call_me || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, students_call_me: text }))
                  }
                  placeholder="e.g., Ms. Smith, Teacher Sarah"
                  placeholderTextColor="#6c757d"
                />
              </View>

              {/* Bio */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                    marginBottom: 8,
                  }}
                >
                  Bio
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.bio ? "#8e44ad" : "#e9ecef",
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    textAlignVertical: "top",
                    height: 120,
                    fontWeight: "500",
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
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 18,
                  backgroundColor: !saving ? "#8e44ad" : "#e9ecef",
                  borderRadius: 12,
                  shadowColor: !saving ? "#8e44ad" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Ionicons
                  name={saving ? "hourglass" : "checkmark-circle"}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  {saving ? "Updating Profile..." : "Update Profile"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </PullToRefresh>
  );
}
