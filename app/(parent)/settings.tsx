import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { useEffect, useState } from "react";
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
          school_name: profileData.schools?.[0]?.name || undefined,
        });
      }
    } catch (error) {
      console.error("Error in loadProfile:", error);
    } finally {
      setLoading(false);
    }
  };

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
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Parent ID Card */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: "#FF6B35",
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
            backgroundColor: "#FF6B35",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
          }}
        />

        {/* Edit Button */}
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
            shadowColor: "#FF6B35",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 999,
            borderWidth: 1.5,
            borderColor: "#FF6B35",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "#FF6B35",
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

        {/* Parent Info Section */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {/* Avatar */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#fff4f1",
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
            <Text style={{ fontSize: 48 }}>👨‍👩‍👧‍👦</Text>
          </View>

          {/* Parent Name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#1e293b",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {profile.display_name || "Parent"}
          </Text>

          {/* Parent Badge */}
          <View
            style={{
              backgroundColor: "#10B981",
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
              PARENT
            </Text>
          </View>
        </View>

        {/* Parent ID Section */}
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
                PARENT ID
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontFamily: "monospace",
                }}
              >
                {email?.split("@")[0]?.toUpperCase() || "PARENT"}
              </Text>
            </View>

            {/* Family Icon */}
            <View
              style={{
                width: 50,
                height: 50,
                backgroundColor: "#FF6B35",
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
                  style={{ fontSize: 20, fontWeight: "bold", color: "#FF6B35" }}
                >
                  ♥
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Decorative Elements */}
        <View
          style={{
            position: "absolute",
            top: 80,
            left: -10,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "rgba(255, 107, 53, 0.1)",
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
            backgroundColor: "rgba(16, 185, 129, 0.1)",
          }}
        />
      </View>

      {/* Info Cards - Compact version */}
      <View style={{ gap: 12, marginBottom: 20 }}>
        {/* Parent Access Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderLeftWidth: 4,
            borderLeftColor: "#10B981",
          }}
        >
          <View 
            style={{ 
              flexDirection: "row", 
              alignItems: "center"
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#10B981",
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: "white" }}>👁️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={{ 
                  fontSize: 16, 
                  fontWeight: "700", 
                  color: "#1f2937",
                  marginBottom: 2
                }}
              >
                Parent Access
              </Text>
              <Text 
                style={{ 
                  fontSize: 13, 
                  color: "#6b7280", 
                  lineHeight: 18
                }}
              >
                View your children's progress and learning journey.
              </Text>
            </View>
          </View>
        </View>

        {/* Support Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderLeftWidth: 4,
            borderLeftColor: "#3B82F6",
          }}
        >
          <View 
            style={{ 
              flexDirection: "row", 
              alignItems: "center"
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#3B82F6",
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: "white" }}>💬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={{ 
                  fontSize: 16, 
                  fontWeight: "700", 
                  color: "#1f2937",
                  marginBottom: 2
                }}
              >
                Need Help?
              </Text>
              <Text 
                style={{ 
                  fontSize: 13, 
                  color: "#6b7280", 
                  lineHeight: 18
                }}
              >
                Contact your child's teacher or school administrator.
              </Text>
            </View>
          </View>
        </View>
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
            <Pressable onPress={() => setShowEditModal(false)}>
              <Text
                style={{ fontSize: 16, color: "#6c757d", fontWeight: "500" }}
              >
                Cancel
              </Text>
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529" }}>
              Edit Name
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#212529",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Update Your Name
              </Text>

              {/* First Name */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#212529",
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
                    padding: 14,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
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
                    fontWeight: "600",
                    color: "#212529",
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
                    padding: 14,
                    fontSize: 16,
                    backgroundColor: "#f8f9fa",
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
                disabled={saving || (profile.first_name.trim().length === 0 || profile.last_name.trim().length === 0)}
                style={{
                  padding: 16,
                  backgroundColor: (!saving && profile.first_name.trim().length > 0 && profile.last_name.trim().length > 0) ? "#FF6B35" : "#e9ecef",
                  borderRadius: 12,
                  shadowColor: (!saving && profile.first_name.trim().length > 0 && profile.last_name.trim().length > 0) ? "#FF6B35" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: (!saving && profile.first_name.trim().length > 0 && profile.last_name.trim().length > 0) ? 4 : 0,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: (!saving && profile.first_name.trim().length > 0 && profile.last_name.trim().length > 0) ? "#ffffff" : "#6c757d",
                  }}
                >
                  {saving ? "Updating Name..." : "Update Name"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
