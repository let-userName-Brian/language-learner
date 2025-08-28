import { PullToRefresh } from "@/components/PullToRefresh";
import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { showErrorBanner, showSuccessBanner } from "../../components/ShowAlert";
import { supabase } from "../../services/supabase-init";

interface ParentProfile {
  display_name: string;
  first_name: string;
  last_name: string;
  school_name?: string;
}

export default function ParentSettings() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ParentProfile>({
    display_name: "",
    first_name: "",
    last_name: "",
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
          first_name,
          last_name,
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
          first_name: String(profileData.first_name || ""),
          last_name: String(profileData.last_name || ""),
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const display_name =
        `${profile.first_name.trim()} ${profile.last_name.trim()}`.trim();

      const { error } = await supabase.from("user_profiles").upsert({
        user_id: user.user.id,
        display_name,
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        role: "parent",
      });

      if (error) throw error;

      // Update local state
      setProfile((prev) => ({ ...prev, display_name }));
      showSuccessBanner("Profile updated successfully!");
    } catch (error: any) {
      showErrorBanner(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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
          backgroundColor: "#FF6B35", // Orange gradient for parent theme
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
          Parent Profile
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 20,
          }}
        >
          Manage your account and view children's progress
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
              name="people"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Parent Account
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
        {/* Parent ID Card */}
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
              backgroundColor: "#FF6B35",
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#FF6B35",
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
                  color: "#FF6B35",
                  textAlign: "center",
                }}
              >
                {profile.school_name || "School Name"}
              </Text>
            </View>
          </View>

          {/* Parent Profile Section */}
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
                  backgroundColor: "#fff5f5",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: "#FF6B35",
                  shadowColor: "#FF6B35",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Ionicons name="people" size={60} color="#FF6B35" />
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

            {/* Parent Name */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#2c3e50",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {profile.display_name || "Parent"}
            </Text>

            {/* Role Badge */}
            <View
              style={{
                backgroundColor: "#FF6B35",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginBottom: 16,
                shadowColor: "#FF6B35",
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
                Parent Account
              </Text>
            </View>
          </View>

          {/* Parent Email Section */}
          <View
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 16,
              padding: 20,
              borderLeftWidth: 4,
              borderLeftColor: "#FF6B35",
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
                  Email Address
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                  }}
                >
                  {email || "No email"}
                </Text>
              </View>

              <View
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: "#FF6B35",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#FF6B35",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="mail" size={30} color="#fff" />
              </View>
            </View>
          </View>

          {/* Parent Access Info */}
          <View
            style={{
              backgroundColor: "#e3f2fd",
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
              <Ionicons name="eye-outline" size={16} color="#2196F3" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#2196F3",
                  marginLeft: 8,
                }}
              >
                Parent Dashboard Access
              </Text>
            </View>
            <Text
              style={{
                fontSize: 16,
                color: "#2c3e50",
                lineHeight: 24,
              }}
            >
              You can view your children's learning progress, achievements, and detailed lesson completion data. Stay connected with their educational journey.
            </Text>
          </View>
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
              backgroundColor: "#FF6B35",
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
              {/* First Name */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                    marginBottom: 8,
                  }}
                >
                  First Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.first_name ? "#FF6B35" : "#e9ecef",
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    fontWeight: "500",
                  }}
                  value={profile.first_name || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, first_name: text }))
                  }
                  placeholder="Enter your first name"
                  placeholderTextColor="#6c757d"
                />
              </View>

              {/* Last Name */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#2c3e50",
                    marginBottom: 8,
                  }}
                >
                  Last Name
                </Text>
                <TextInput
                  style={{
                    borderWidth: 2,
                    borderColor: profile.last_name ? "#FF6B35" : "#e9ecef",
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
                    fontWeight: "500",
                  }}
                  value={profile.last_name || ""}
                  onChangeText={(text) =>
                    setProfile((prev) => ({ ...prev, last_name: text }))
                  }
                  placeholder="Enter your last name"
                  placeholderTextColor="#6c757d"
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
                  backgroundColor: !saving ? "#FF6B35" : "#e9ecef",
                  borderRadius: 12,
                  shadowColor: !saving ? "#FF6B35" : "transparent",
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
