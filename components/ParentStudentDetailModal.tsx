import { getItemAudio, getPreferredDialect } from "@/services/audio";
import { supabase } from "@/services/supabase-init";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { showErrorBanner } from "./ShowAlert";
import { SkeletonBox } from "./SkeletonBox";

interface StudentDetailInfo {
  user_id: string;
  display_name: string;
  student_id: string;
  grade_level: string;
  teacher?: {
    display_name: string;
    students_call_me: string;
    email: string;
  };
  current_lesson?: {
    title: string;
    unit_title: string;
    progress_percentage: number;
    sections_completed: number;
    total_sections: number;
  };
  lesson_hints: Array<{
    text: string;
    item?: any;
    type: "header" | "item" | "general";
  }>;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  studentUserId: string;
  studentName: string;
};

export default function ParentStudentDetailModal({
  visible,
  onClose,
  studentUserId,
  studentName,
}: Props) {
  const [studentDetail, setStudentDetail] = useState<StudentDetailInfo | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState<string | null>(null);
  const [lastPlayTime, setLastPlayTime] = useState<{ [key: string]: number }>(
    {}
  );
  const [preferredDialect, setPreferredDialect] = useState<
    "classical" | "ecclesiastical"
  >("classical");

  const player = useAudioPlayer();

  useEffect(() => {
    getPreferredDialect().then(setPreferredDialect);
  }, []);

  useEffect(() => {
    if (visible && studentUserId) {
      loadStudentDetails();
    }
  }, [visible, studentUserId]);

  const loadStudentDetails = async () => {
    setLoading(true);
    try {
      // Get student profile with school info
      const { data: studentData, error: studentError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, student_id, grade_level, school_id")
        .eq("user_id", studentUserId)
        .single();

      if (studentError) throw studentError;

      // Get teacher info for this school
      const { data: teacherData, error: teacherError } = await supabase
        .from("user_profiles")
        .select("display_name, students_call_me, email")
        .eq("school_id", studentData.school_id)
        .eq("role", "teacher")
        .maybeSingle();

      // Get current lesson progress
      const { data: progressData, error: progressError } = await supabase
        .from("progress")
        .select(
          `
          lesson_id,
          status,
          last_position,
          lessons!inner(
            title,
            units!inner(title)
          )
        `
        )
        .eq("user_id", studentUserId)
        .order("updated_at", { ascending: false })
        .limit(1);

      let currentLesson = null;
      let currentLessonItems: any[] = [];

      if (progressData && progressData.length > 0) {
        const lesson = progressData[0];
        const lastPos = lesson.last_position || {};
        const completedSections = lastPos.completed_sections?.length || 0;
        const totalSections = 2;

        currentLesson = {
          title: (lesson.lessons as any)?.title || "Unknown Lesson",
          unit_title: (lesson.lessons as any)?.units?.title || "Unknown Unit",
          progress_percentage: Math.round(
            (completedSections / totalSections) * 100
          ),
          sections_completed: completedSections,
          total_sections: totalSections,
        };

        // Get items for the current lesson to access parent tips
        const { data: itemsData } = await supabase
          .from("items")
          .select("id, kind, latin, accepted_english, parent_tip, media") // Make sure to include 'id' and 'media'
          .eq("lesson_id", lesson.lesson_id)
          .order("id");

        currentLessonItems = itemsData || [];
      }

      // Generate helpful hints based on current lesson status and parent tips
      const generateHints = () => {
        const hints: Array<{
          text: string;
          item?: any;
          type: "header" | "item" | "general";
        }> = [];

        if (currentLesson && currentLessonItems.length > 0) {
          const { progress_percentage, sections_completed } = currentLesson;

          const vocabItems = currentLessonItems.filter(
            (item) => item.kind === "vocab"
          );
          const sentenceItems = currentLessonItems.filter(
            (item) => item.kind === "sentence"
          );

          if (progress_percentage === 0) {
            hints.push({
              text: `Starting "${currentLesson.title}"`,
              type: "header",
            });

            // Show vocabulary section
            if (vocabItems.length > 0) {
              vocabItems.forEach((item) => {
                if (item.parent_tip) {
                  const english = Array.isArray(item.accepted_english)
                    ? item.accepted_english[0]
                    : item.accepted_english;
                  hints.push({
                    text: `Latin: ${item.latin}\nEnglish: ${english}\nHint: ${item.parent_tip}`,
                    item: item,
                    type: "item",
                  });
                }
              });
            }
          } else if (progress_percentage < 100) {
            if (sections_completed === 1) {
              // Show sentences section
              if (sentenceItems.length > 0) {
                sentenceItems.forEach((item) => {
                  if (item.parent_tip) {
                    const english = Array.isArray(item.accepted_english)
                      ? item.accepted_english[0]
                      : item.accepted_english;
                    hints.push({
                      text: `Latin: ${item.latin}\nEnglish: ${english}\nHint: ${item.parent_tip}`,
                      item: item,
                      type: "item",
                    });
                  }
                });
              }
            } else {
              // Still on vocabulary - show vocab items
              if (vocabItems.length > 0) {
                vocabItems.forEach((item) => {
                  if (item.parent_tip) {
                    const english = Array.isArray(item.accepted_english)
                      ? item.accepted_english[0]
                      : item.accepted_english;
                    hints.push({
                      text: `Latin: ${item.latin}\nEnglish: ${english}\nHint: ${item.parent_tip}`,
                      item: item,
                      type: "item",
                    });
                  }
                });
              }
            }
          } else {
            // Completed lesson - show both sections organized
            hints.push({
              text: `Completed "${currentLesson.title}"`,
              type: "header",
            });

            if (vocabItems.length > 0) {
              vocabItems.forEach((item) => {
                if (item.parent_tip) {
                  const english = Array.isArray(item.accepted_english)
                    ? item.accepted_english[0]
                    : item.accepted_english;
                  hints.push({
                    text: `Latin: ${item.latin}\nEnglish: ${english}\nHint: ${item.parent_tip}`,
                    item: item,
                    type: "item",
                  });
                }
              });
            }

            if (sentenceItems.length > 0) {
              sentenceItems.forEach((item) => {
                if (item.parent_tip) {
                  const english = Array.isArray(item.accepted_english)
                    ? item.accepted_english[0]
                    : item.accepted_english;
                  hints.push({
                    text: `Latin: ${item.latin}\nEnglish: ${english}\nHint: ${item.parent_tip}`,
                    item: item,
                    type: "item",
                  });
                }
              });
            }
          }
        } else {
          hints.push({
            text: "Ready to start their first lesson!",
            type: "general",
          });
        }

        return hints;
      };

      setStudentDetail({
        ...studentData,
        teacher: teacherError ? undefined : teacherData || undefined,
        current_lesson: currentLesson || undefined,
        lesson_hints: generateHints(),
      });
    } catch (error: any) {
      showErrorBanner(error?.message ?? "Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const playItemAudio = async (item: any) => {
    if (!item?.id || !item?.latin) return;

    // Debounce: prevent playing same item within 2 seconds
    const now = Date.now();
    const lastTime = lastPlayTime[item.id] || 0;
    if (now - lastTime < 2000) return;

    setLastPlayTime((prev) => ({ ...prev, [item.id]: now }));
    setAudioLoading(item.id);

    try {
      const audioUrl = await getItemAudio(item, preferredDialect);

      if (audioUrl) {
        try {
          player.pause();
        } catch (e) {
          // Ignore pause errors
        }

        player.replace({ uri: audioUrl });
        player.play();
      }
    } catch (error) {
      showErrorBanner("Failed to play audio. Please try again.");
    } finally {
      setAudioLoading(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#e9ecef",
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
              marginRight: 12,
            }}
          >
            <Ionicons name="close" size={24} color="#007bff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>
              {studentName}
            </Text>
            <Text style={{ color: "#666", fontSize: 14 }}>
              Learning Details & Helpful Hints
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {loading ? (
            <View style={{ gap: 16 }}>
              {/* Teacher Information Skeleton */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <SkeletonBox width="60%" height={24} />
                <View style={{ marginTop: 16, gap: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <SkeletonBox width="30%" height={16} />
                    <SkeletonBox width="40%" height={16} />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <SkeletonBox width="35%" height={16} />
                    <SkeletonBox width="30%" height={16} />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <SkeletonBox width="25%" height={16} />
                    <SkeletonBox width="50%" height={16} />
                  </View>
                </View>
              </View>

              {/* Current Lesson Skeleton */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <SkeletonBox width="50%" height={24} />
                <View style={{ marginTop: 16, gap: 12 }}>
                  <View>
                    <SkeletonBox width="40%" height={14} />
                    <SkeletonBox width="80%" height={20} />
                  </View>
                  <View>
                    <SkeletonBox width="20%" height={14} />
                    <View style={{ marginTop: 4 }}>
                      <SkeletonBox width="60%" height={16} />
                    </View>
                  </View>
                  <View>
                    <SkeletonBox width="70%" height={14} />
                    <View style={{ marginTop: 8 }}>
                      <SkeletonBox width="100%" height={12} />
                    </View>
                    <View style={{ marginTop: 4, alignSelf: "flex-end" }}>
                      <SkeletonBox width="30%" height={16} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Helpful Hints Skeleton */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <SkeletonBox width="60%" height={24} />
                <View style={{ marginTop: 16, gap: 12 }}>
                  {[1, 2, 3].map((_, index) => (
                    <View
                      key={index}
                      style={{
                        padding: 12,
                        backgroundColor: "#f8f9fa",
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: "#e2e8f0",
                        gap: 8,
                      }}
                    >
                      <SkeletonBox width="40%" height={16} />
                      <SkeletonBox width="60%" height={16} />
                      <SkeletonBox width="90%" height={16} />
                      <View style={{ marginTop: 4, alignSelf: "flex-end" }}>
                        <SkeletonBox width="30%" height={12} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : studentDetail ? (
            <View style={{ gap: 16 }}>
              {/* Teacher Information */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
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
                    fontWeight: "700",
                    marginBottom: 16,
                    color: "#212529",
                  }}
                >
                  👩‍🏫 Teacher Information
                </Text>

                {studentDetail.teacher ? (
                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#666", fontSize: 16 }}>
                        Teacher:
                      </Text>
                      <Text style={{ fontWeight: "600", fontSize: 16 }}>
                        {studentDetail.teacher.display_name}
                      </Text>
                    </View>

                    {studentDetail.teacher.students_call_me && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#666", fontSize: 16 }}>
                          Students call them:
                        </Text>
                        <Text style={{ fontWeight: "600", fontSize: 16 }}>
                          {studentDetail.teacher.students_call_me}
                        </Text>
                      </View>
                    )}

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#666", fontSize: 16 }}>
                        Contact:
                      </Text>
                      <Text style={{ fontWeight: "600", fontSize: 16 }}>
                        {studentDetail.teacher.email}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: "#666", fontStyle: "italic" }}>
                    No teacher information available
                  </Text>
                )}
              </View>

              {/* Current Lesson Progress */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
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
                    fontWeight: "700",
                    marginBottom: 16,
                    color: "#212529",
                  }}
                >
                  📚 Current Lesson & Unit
                </Text>

                {studentDetail.current_lesson ? (
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text
                        style={{ color: "#666", fontSize: 14, marginBottom: 4 }}
                      >
                        Current Lesson:
                      </Text>
                      <Text
                        style={{
                          fontWeight: "600",
                          fontSize: 18,
                          color: "#212529",
                        }}
                      >
                        {studentDetail.current_lesson.title}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={{ color: "#666", fontSize: 14, marginBottom: 4 }}
                      >
                        Unit:
                      </Text>
                      <Text
                        style={{
                          fontWeight: "500",
                          fontSize: 16,
                          color: "#495057",
                        }}
                      >
                        {studentDetail.current_lesson.unit_title}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={{ color: "#666", fontSize: 14, marginBottom: 8 }}
                      >
                        Progress:{" "}
                        {studentDetail.current_lesson.sections_completed} of{" "}
                        {studentDetail.current_lesson.total_sections} sections
                        completed
                      </Text>

                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 12,
                          backgroundColor: "#e9ecef",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${studentDetail.current_lesson.progress_percentage}%`,
                            backgroundColor: "#28a745",
                          }}
                        />
                      </View>

                      <Text
                        style={{
                          color: "#28a745",
                          fontWeight: "600",
                          fontSize: 16,
                          textAlign: "right",
                          marginTop: 4,
                        }}
                      >
                        {studentDetail.current_lesson.progress_percentage}%
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: "#666", fontStyle: "italic" }}>
                    No lesson started yet
                  </Text>
                )}
              </View>

              {/* Helpful Hints */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
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
                    fontWeight: "700",
                    marginBottom: 16,
                    color: "#212529",
                  }}
                >
                  💡 Helpful Hints for Parents
                </Text>

                <View style={{ gap: 12 }}>
                  {studentDetail.lesson_hints.map((hint, index) => (
                    <Pressable
                      key={index}
                      onPress={
                        hint.type === "item" && hint.item
                          ? () => playItemAudio(hint.item)
                          : undefined
                      }
                      disabled={
                        hint.type !== "item" ||
                        !hint.item ||
                        audioLoading === hint.item?.id
                      }
                      style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: 12,
                        backgroundColor:
                          hint.type === "item" ? "#f8f9fa" : "#f8f9fa",
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: "#007bff",
                        opacity: audioLoading === hint.item?.id ? 0.7 : 1,
                      }}
                      android_ripple={
                        hint.type === "item" ? { color: "#e3f2fd" } : undefined
                      }
                    >
                      {hint.type === "item" ? (
                        <View style={{ flex: 1 }}>
                          {hint.text.split("\n").map((line, lineIndex) => {
                            const [prefix, ...rest] = line.split(": ");
                            const content = rest.join(": ");
                            return (
                              <Text
                                key={lineIndex}
                                style={{
                                  fontSize: 16,
                                  lineHeight: 24,
                                  color: "#495057",
                                }}
                              >
                                <Text style={{ fontWeight: "bold" }}>
                                  {prefix}:
                                </Text>{" "}
                                {content}
                              </Text>
                            );
                          })}
                          <View
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTopWidth: 1,
                              borderTopColor: "#e9ecef",
                              width: "100%",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#007bff",
                                fontWeight: "500",
                                textAlign: "right",
                              }}
                            >
                              Tap to hear audio
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontSize: 16,
                            lineHeight: 24,
                            color: "#495057",
                            flex: 1,
                          }}
                        >
                          {hint.text}
                        </Text>
                      )}

                      {hint.type === "item" &&
                        hint.item &&
                        audioLoading === hint.item.id && (
                          <ActivityIndicator
                            size="small"
                            color="#007bff"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <Text
              style={{
                color: "#666",
                fontStyle: "italic",
                textAlign: "center",
                marginTop: 40,
              }}
            >
              Unable to load student details
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
