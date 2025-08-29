import { PullToRefresh } from "@/components/PullToRefresh";
import { SettingsSkeleton } from "@/components/SettingsSkeleton";
import { useAuth } from "@/store/store";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

export default function SettingsScreen() {
  const auth = useAuth();
  const handleRefresh = useCallback(async () => {
    await auth.actions.loadUser();
  }, []);

  const signOut = async () => {
    await auth.actions.signOut();
  };

  if (auth.loading || !auth.userProfile) {
    return <SettingsSkeleton />;
  }

  const profile = auth.userProfile;

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshing={auth.loading}
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
    >
      {/* Header with Gradient */}
      <View
        style={{
          backgroundColor: "#4CAF50",
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
          Student Profile
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 20,
          }}
        >
          Your learning journey information
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
              name="school"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Student
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
              name="library"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Grade {profile.grade}
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
              name="checkmark-circle"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: "#fff", fontSize: 12, textAlign: "center" }}>
              Active
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingTop: 0, marginTop: -20 }}>
        {/* Student ID Card */}
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
                  color: "#4CAF50",
                  textAlign: "center",
                }}
              >
                {profile.school_name || "School Name"}
              </Text>
            </View>
          </View>

          {/* Student Profile Section */}
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
                  backgroundColor: "#e8f5e8",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: "#4CAF50",
                  shadowColor: "#4CAF50",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Ionicons name="school" size={60} color="#4CAF50" />
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
                  backgroundColor: "#FF9800",
                  borderWidth: 3,
                  borderColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="star" size={12} color="#fff" />
              </View>
            </View>

            {/* Student Name */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#2c3e50",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {profile.display_name || profile.first_name || "Student Name"}
            </Text>

            {/* Grade Badge */}
            <View
              style={{
                backgroundColor: "#FF9800",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginBottom: 16,
                shadowColor: "#FF9800",
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
                Grade {profile.grade}
              </Text>
            </View>
          </View>

          {/* Student ID Section */}
          <View
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 16,
              padding: 20,
              borderLeftWidth: 4,
              borderLeftColor: "#4CAF50",
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
                  Student ID
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#2c3e50",
                    fontFamily: "monospace",
                  }}
                >
                  {profile.student_id}
                </Text>
              </View>

              <View
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: "#4CAF50",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#4CAF50",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="qr-code" size={30} color="#fff" />
              </View>
            </View>
          </View>

          {/* Learning Info Section */}
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
              <Ionicons name="book-outline" size={16} color="#2196F3" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#2196F3",
                  marginLeft: 8,
                }}
              >
                Learning Progress
              </Text>
            </View>
            <Text
              style={{
                fontSize: 16,
                color: "#2c3e50",
                lineHeight: 24,
              }}
            >
              Keep up the great work! Your progress is tracked automatically as
              you complete lessons. Your teacher and parents can see your
              progress and help support your learning journey.
            </Text>
          </View>
        </View>

        {/* Learning Tips Card - Keep existing JSX */}
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
              <Ionicons name="bulb" size={24} color="#f59e0b" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#2c3e50",
              }}
            >
              Learning Tips
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "#f0f9ff",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: "#2196F3",
              }}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color="#2196F3"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: "#2c3e50",
                  flex: 1,
                }}
              >
                Take breaks between lessons to help remember what you learned
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "#e8f5e8",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: "#4CAF50",
              }}
            >
              <Ionicons
                name="repeat-outline"
                size={16}
                color="#4CAF50"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: "#2c3e50",
                  flex: 1,
                }}
              >
                Practice speaking out loud to improve your pronunciation
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "#fff3cd",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: "#f59e0b",
              }}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color="#f59e0b"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: "#2c3e50",
                  flex: 1,
                }}
              >
                Ask your teacher or parents for help when you need it
              </Text>
            </View>
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
                backgroundColor: "#fef2f2",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="settings" size={24} color="#dc3545" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#2c3e50",
              }}
            >
              Account
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
    </PullToRefresh>
  );
}
