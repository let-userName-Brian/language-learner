import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

type StudentProgress = {
  lesson_id: string;
  lesson_title: string;
  completed_sections: number;
  total_sections: number;
  last_activity: string;
  status: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  progress: StudentProgress[];
  studentName: string;
};

export default function StudentProgressModal({
  visible,
  onClose,
  progress,
  studentName,
}: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "#d1f2eb", text: "#155724", icon: "#4CAF50" };
      case "in_progress":
        return { bg: "#fff3cd", text: "#856404", icon: "#FF9800" };
      default:
        return { bg: "#f8f9fa", text: "#6c757d", icon: "#6c757d" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "in_progress":
        return "time";
      default:
        return "help-circle";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Modern Header */}
        <View
          style={{
            backgroundColor: "#4CAF50",
            paddingTop: 20,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: "#fff",
                }}
              >
                {studentName}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Detailed lesson breakdown
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {progress.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 40,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#f0f9ff",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="school" size={40} color="#2196F3" />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#2c3e50",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No Progress Yet
              </Text>
              <Text
                style={{
                  color: "#6c757d",
                  textAlign: "center",
                  lineHeight: 22,
                  fontSize: 16,
                }}
              >
                {studentName} hasn't started any lessons yet. Progress will
                appear here once they begin learning.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {progress.map((item, index) => {
                const statusInfo = getStatusColor(item.status);
                const progressPercentage = Math.round(
                  (item.completed_sections / item.total_sections) * 100
                );

                return (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 16,
                      padding: 20,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                      borderLeftWidth: 4,
                      borderLeftColor: statusInfo.icon,
                    }}
                  >
                    {/* Lesson Header */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#2c3e50",
                            marginBottom: 4,
                          }}
                        >
                          {item.lesson_title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6c757d",
                            marginBottom: 8,
                          }}
                        >
                          Last activity:{" "}
                          {new Date(item.last_activity).toLocaleDateString()}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: statusInfo.bg,
                        }}
                      >
                        <Ionicons
                          name={getStatusIcon(item.status) as any}
                          size={14}
                          color={statusInfo.icon}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: statusInfo.text,
                          }}
                        >
                          {item.status === "completed"
                            ? "Completed"
                            : "In Progress"}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Section */}
                    <View
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          Section Progress
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: statusInfo.icon,
                              marginRight: 8,
                            }}
                          >
                            {progressPercentage}%
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#6c757d",
                            }}
                          >
                            ({item.completed_sections}/{item.total_sections})
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 8,
                          backgroundColor: "#e9ecef",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${progressPercentage}%`,
                            backgroundColor: statusInfo.icon,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>

                    {/* Progress Indicator Circles */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: 16,
                        gap: 8,
                      }}
                    >
                      {Array.from({ length: item.total_sections }, (_, i) => (
                        <View
                          key={i}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor:
                              i < item.completed_sections
                                ? statusInfo.icon
                                : "#e9ecef",
                            borderWidth: 2,
                            borderColor:
                              i < item.completed_sections
                                ? statusInfo.icon
                                : "#e9ecef",
                          }}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
