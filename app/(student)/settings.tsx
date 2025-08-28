import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../../services/supabase-init";

interface StudentProfile {
  display_name: string;
  student_id: string;
  grade_level: string;
  school_name?: string;
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState<StudentProfile>({
    display_name: "",
    student_id: "",
    grade_level: "",
    school_name: "",
  });
  const [loading, setLoading] = useState(true);

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

      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select(
          `
          display_name,
          student_id,
          grade_level,
          schools!inner(name)
        `
        )
        .eq("user_id", user.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      } else if (profileData) {
        setProfile({
          display_name: String(profileData.display_name || ""),
          student_id: String(profileData.student_id || ""),
          grade_level: String(profileData.grade_level || ""),
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* School Badge Design */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: "#4CAF50",
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
            backgroundColor: "#4CAF50",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
          }}
        />

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

        {/* Student Info Section */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {/* Cartoon Avatar */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#e3f2fd",
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
            <Text style={{ fontSize: 48 }}>🎓</Text>
          </View>

          {/* Student Name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#212529",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {profile.display_name || "Student Name"}
          </Text>

          {/* Grade Badge */}
          <View
            style={{
              backgroundColor: "#FF9800",
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
              Grade {profile.grade_level || "?"}
            </Text>
          </View>
        </View>

        {/* Student ID Section */}
        <View
          style={{
            backgroundColor: "#f8f9fa",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
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
                  color: "#6c757d",
                  marginBottom: 4,
                }}
              >
                STUDENT ID
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#212529",
                  fontFamily: "monospace",
                }}
              >
                {profile.student_id || "000000"}
              </Text>
            </View>

            {/* QR Code Placeholder */}
            <View
              style={{
                width: 50,
                height: 50,
                backgroundColor: "#000",
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
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Simple QR pattern */}
                {[...Array(25)].map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 3,
                      height: 3,
                      backgroundColor:
                        Math.random() > 0.5 ? "#000" : "transparent",
                      margin: 0.5,
                    }}
                  />
                ))}
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
            backgroundColor: "rgba(76, 175, 80, 0.1)",
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
            backgroundColor: "rgba(255, 152, 0, 0.1)",
          }}
        />
      </View>

      {/* Additional Info Card */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#e9ecef",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
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
          📚 Learning Progress
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6c757d",
            lineHeight: 20,
          }}
        >
          Keep up the great work! Your progress is tracked automatically as you
          complete lessons. Your teacher and your parents will be able to see
          your progress and your parents have some helpful tools to help you
          learn.
        </Text>
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
  );
}
