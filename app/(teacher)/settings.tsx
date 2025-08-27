import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { pickFile } from "../../components/FilePicker";
import { showErrorAlert, showSuccessAlert } from "../../components/ShowAlert";
import { supabase } from "../../services/supabase-init";

interface TeacherProfile {
  display_name: string;
  avatar_url?: string;
  students_call_me?: string;
  bio?: string;
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

      // Get current profile
      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select("display_name, avatar_url, students_call_me, bio")
        .eq("user_id", user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error loading profile:", error);
      } else if (profileData) {
        setProfile({
          display_name: String(profileData.display_name || ""),
          avatar_url: profileData.avatar_url || undefined,
          students_call_me: String(profileData.students_call_me || ""),
          bio: String(profileData.bio || ""),
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
        type: ['image/jpeg', 'image/png', 'image/gif'],
        multiple: false
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Upload to Supabase Storage
      const fileExt = file.name?.split('.')?.pop() || 'jpg';
      const fileName = `${user.user.id}/avatar.${fileExt}`;

      // For web, we need to convert the file URI to a File object
      let fileToUpload;
      if (file.uri.startsWith('data:')) {
        // Data URI - convert to Blob
        const response = await fetch(file.uri);
        fileToUpload = await response.blob();
      } else {
        // File URI - read as File
        const response = await fetch(file.uri);
        fileToUpload = await response.blob();
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileToUpload, {
          upsert: true,
          contentType: file.mimeType
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
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

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>Settings</Text>
      
      <View style={{
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      }}>
        <View style={{ alignItems: "center" }}>
          {/* Avatar Section */}
          <View style={{
            position: "relative",
            marginBottom: 16,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#e2e8f0",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: "#cbd5e1"
            }}>
              {profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 74, height: 74, borderRadius: 37 }}
                />
              ) : (
                <Text style={{
                  fontSize: 28,
                  fontWeight: "600",
                  color: "#64748b"
                }}>
                  {profile.display_name?.charAt(0)?.toUpperCase() || "T"}
                </Text>
              )}
            </View>

            <Pressable
              onPress={uploadAvatar}
              style={{
                position: "absolute",
                bottom: -8,
                right: -8,
                backgroundColor: "#3b82f6",
                borderRadius: 16,
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#ffffff"
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>+</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 4 }}>
            {profile.display_name || "Teacher"}
          </Text>
          {email && (
            <Text style={{ color: "#64748b", marginBottom: 8 }}>{email}</Text>
          )}
        </View>
      </View>

      {/* Form Fields Section */}
      <View style={{
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0"
      }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
          Profile Information
        </Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#374151" }}>
            Display Name
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              backgroundColor: "#ffffff"
            }}
            value={profile.display_name || ""}
            onChangeText={(text) => setProfile(prev => ({ ...prev, display_name: text }))}
            placeholder="Enter your display name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#374151" }}>
            How you&apos;d like students to address you
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              backgroundColor: "#ffffff"
            }}
            value={profile.students_call_me || ""}
            onChangeText={(text) => setProfile(prev => ({ ...prev, students_call_me: text }))}
            placeholder="e.g., Ms. Smith, Teacher Sarah"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#374151" }}>
            Bio
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              backgroundColor: "#ffffff",
              minHeight: 80
            }}
            value={profile.bio || ""}
            onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
            placeholder="Tell students about yourself..."
            placeholderTextColor="#9ca3af"
            multiline={true}
            textAlignVertical="top"
          />
        </View>

        <Pressable
          onPress={saveProfile}
          style={{
            backgroundColor: "#3b82f6",
            borderRadius: 10,
            padding: 16,
            alignItems: "center",
            marginTop: 16
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Save Changes
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={signOut}
        style={{
          padding: 16,
          backgroundColor: "#fff5f5",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#ffdddd",
          marginBottom: 32
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#d32f2f" }}>
          Sign Out
        </Text>
      </Pressable>
    </ScrollView>
  );
}