import ErrorPage, { ErrorPages } from "@/components/ErrorPage";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { useLessons } from "@/store/store";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  showErrorBanner,
  showSuccessBanner,
} from "../../../components/ShowAlert";
import {
  getItemAudio,
  getPreferredDialect,
  preloadItemAudio,
} from "../../../services/audio";

type ItemRow = {
  id: string;
  lesson_id: string;
  kind: string;
  latin: string;
  accepted_english: string[];
  morph: any[];
  media?: { audio_classical?: string; audio_ecclesiastical?: string };
};

export default function SectionScreen() {
  const lessons = useLessons();
  const params = useLocalSearchParams<{
    id?: string | string[];
    type?: string | string[];
    from?: string;
  }>();
  

  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const sectionType = Array.isArray(params.type) ? params.type[0] : params.type;
  const from = params.from || "lesson";

  const [items, setItems] = useState<ItemRow[]>([]);
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const player = useAudioPlayer();
  const [audioLoading, setAudioLoading] = useState(false);
  const [preferredDialect, setPreferredDialect] = useState<
    "classical" | "ecclesiastical"
  >("classical");
  const [preloadingItems, setPreloadingItems] = useState<Set<string>>(
    new Set()
  );

  const currentItem = items[currentItemIndex];
  const allItemsViewed = viewedItems.size === items.length;

  useEffect(() => {
    getPreferredDialect().then(setPreferredDialect);
  }, []);

  useEffect(() => {
    if (!currentItem || preloadingItems.has(currentItem.id)) return;

    const preloadTimer = setTimeout(() => {
      if (currentItem) {
        setPreloadingItems((prev) => new Set([...prev, currentItem.id]));

        preloadItemAudio(currentItem, preferredDialect)
          .catch(console.error)
          .finally(() => {
            setPreloadingItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(currentItem.id);
              return newSet;
            });
          });
      }
    }, 300); // 300ms delay

    return () => clearTimeout(preloadTimer);
  }, [currentItem?.id, preferredDialect]);

  useEffect(() => {
    if (!lessonId || !sectionType) return;
    loadSectionItems();
  }, [lessonId, sectionType]);

  const loadSectionItems = async (retryCount = 0) => {
    setLoading(true);
    try {
      if (!lessonId) {
        setErr("No lesson ID provided");
        return;
      }
      let currentLessonData = lessons.lessons.find(l => l.id === lessonId);
      
      if (!currentLessonData) {
        await lessons.actions.loadDashboardData();
        currentLessonData = lessons.lessons.find(l => l.id === lessonId);
        
        if (!currentLessonData && retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await lessons.actions.loadDashboardData();
          currentLessonData = lessons.lessons.find(l => l.id === lessonId);
        }
      }
      
      if (!currentLessonData) {
        console.error("Lesson not found:", lessonId);
        setErr("Lesson not found");
        return;
      }

      setLessonTitle(currentLessonData.title);
      let it = lessons.items[lessonId];  
      if (!it || it.length === 0) {
        const itemsData = await lessons.actions.loadLessonItems(lessonId);
        it = itemsData;
      } 

      if (!it || it.length === 0) {
        console.error("No items found at all for lesson:", { lessonId });
        setErr("No lesson content found");
        return;
      }

      // Filter items by section type
      const sectionItems = (it || []).filter((item: ItemRow) => item.kind === sectionType);
      
      if (sectionItems.length === 0) {
        console.error("No items found for section:", { lessonId, sectionType, availableTypes: [...new Set(it.map(item => item.kind))] });
        setErr(`No ${sectionType} content found`);
        return;
      }

      setItems(sectionItems);

      if (sectionItems.length > 0)
        setViewedItems(new Set([sectionItems[0].id]));
    } catch (e: any) {
      setErr(e.message ?? "Failed to load section");
    } finally {
      setLoading(false);
    }
  };

  const getSectionInfo = () => {
    switch (sectionType) {
      case "vocab":
        return {
          title: "Vocabulary",
          icon: "book-outline",
          color: { main: "#9C27B0", light: "#E1BEE7", background: "#F3E5F5" },
        };
      case "sentence":
        return {
          title: "Sentences",
          icon: "create-outline",
          color: { main: "#2196F3", light: "#90CAF9", background: "#E3F2FD" },
        };
      case "picture-match":
        return {
          title: "Picture Match",
          icon: "image-outline",
          color: { main: "#4CAF50", light: "#A5D6A7", background: "#E8F5E8" },
        };
      case "tile-build":
        return {
          title: "Tile Builder",
          icon: "grid-outline",
          color: { main: "#FF9800", light: "#FFCC02", background: "#FFF3E0" },
        };
      default:
        return {
          title: "Learning",
          icon: "document-outline",
          color: { main: "#607D8B", light: "#90A4AE", background: "#ECEFF1" },
        };
    }
  };

  const sectionInfo = getSectionInfo();
  const progressPercentage = items.length > 0 ? (viewedItems.size / items.length) * 100 : 0;
 

  const play = async () => {
    if (!currentItem) return;

    setAudioLoading(true);
    try {
      let audioUrl =
        currentItem.media?.audio_classical ||
        currentItem.media?.audio_ecclesiastical;

      if (!audioUrl) {
        audioUrl = await getItemAudio(currentItem, preferredDialect);
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  media: {
                    ...item.media,
                    [preferredDialect === "classical"
                      ? "audio_classical"
                      : "audio_ecclesiastical"]: audioUrl,
                  },
                }
              : item
          )
        );
      }

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
      console.error("Audio playback failed:", error);
      showErrorBanner("Failed to play audio. Please try again.");
    } finally {
      setAudioLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentItemIndex > 0) {
      const newIndex = currentItemIndex - 1;
      setCurrentItemIndex(newIndex);
      setViewedItems((prev) => new Set([...prev, items[newIndex].id]));
    }
  };

  const goToNext = () => {
    if (currentItemIndex < items.length - 1) {
      const newIndex = currentItemIndex + 1;
      setCurrentItemIndex(newIndex);
      setViewedItems((prev) => new Set([...prev, items[newIndex].id]));
    }
  };

  const completeSection = async () => {
    try {
      const result = await lessons.actions.completeSection(lessonId as string, sectionType as string);
      
      if (result.allSectionsComplete) {
        showSuccessBanner("🎉 Lesson completed!", () => {
          if (from === "lessons") router.push("/(student)/lessons");
          else router.push(`/(student)/lesson/${lessonId}?from=lessons`);
        });
      } else {
        showSuccessBanner(`✓ ${sectionInfo.title} completed!`, () => {
          if (from === "lessons") router.push("/(student)/lessons");
          else router.push(`/(student)/lesson/${lessonId}?from=lessons`);
        });
      }
    } catch (error: any) {
      showErrorBanner(error.message || "Failed to save progress");
    }
  };

  const handleBack = () => {
    if (from === "lessons") router.push("/(student)/lessons");
    else if (from === "lesson") router.push(`/(student)/lesson/${lessonId}?from=lessons`);
    else router.push("/(student)/lessons");
  };

  if (loading) return <SectionSkeleton />;

  if (err || !currentItem) {
    if (err) {
      console.log("Error loading section screen:", err);
      return (
        <ErrorPage
          title="Section Error"
          message={err}
          subMessage="Please try again or go back to lessons"
          buttonText="Back to Lessons"
          onButtonPress={() => router.push("/(student)/lessons")}
        />
      );
    }

    if (!currentItem && items.length === 0)
      return ErrorPages.SectionNotFound(lessonId);

    return <ErrorPage />;
  }

  const renderAudioButton = () => (
    <Pressable
      onPress={play}
      disabled={audioLoading || !currentItem}
      style={{
        backgroundColor: audioLoading ? "#94a3b8" : sectionInfo.color.main,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        opacity: audioLoading ? 0.7 : 1,
        shadowColor: sectionInfo.color.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginVertical: 16,
      }}
    >
      {audioLoading ? (
        <>
          <ActivityIndicator
            size="small"
            color="white"
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              color: "white",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Generating...
          </Text>
        </>
      ) : (
        <>
          <Ionicons
            name="volume-high"
            size={20}
            color="white"
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              color: "white",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Play{" "}
            {preferredDialect === "classical" ? "Classical" : "Ecclesiastical"}{" "}
            Latin
          </Text>
        </>
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Enhanced Header - Match lesson detail page */}
      <View
        style={{
          backgroundColor: "#667eea",
          paddingTop: 20,
          paddingBottom: 16,
          paddingHorizontal: 20,
          height: 100,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Subtle overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(118, 75, 162, 0.3)",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            position: "relative",
            zIndex: 1,
            marginTop: "auto",
            marginBottom: "auto",
          }}
        >
          <Pressable
            onPress={handleBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>

          <View style={{ flex: 1 }}>
            {/* Lesson Title */}
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                fontWeight: "500",
                marginBottom: 1,
              }}
            >
              {lessonTitle}
            </Text>

            {/* Section Title */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "white",
                marginBottom: 2,
              }}
            >
              {sectionInfo.title}
            </Text>

            {/* Progress Text */}
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.9)",
                fontWeight: "500",
              }}
            >
              Item {currentItemIndex + 1} of {items.length} • {viewedItems.size}{" "}
              viewed
            </Text>
          </View>
        </View>

        {/* Progress Bar at Bottom */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: "rgba(255,255,255,0.3)",
            zIndex: 1,
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${Math.round(progressPercentage)}%`,
              backgroundColor: "white",
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Latin Text Card */}
        <View
          style={{
            backgroundColor: "white",
            padding: 24,
            borderRadius: 20,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 8,
            borderLeftWidth: 4,
            borderLeftColor: sectionInfo.color.main,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#1e293b",
              textAlign: "center",
              lineHeight: 36,
              marginBottom: 8,
            }}
          >
            {currentItem.latin}
          </Text>

          {/* Enhanced Audio Button */}
          {renderAudioButton()}
        </View>

        {/* Enhanced English Translation */}
        {currentItem.accepted_english?.[0] && (
          <View
            style={{
              backgroundColor: sectionInfo.color.background,
              padding: 20,
              borderRadius: 16,
              marginBottom: 20,
              borderWidth: 2,
              borderColor: `${sectionInfo.color.main}30`,
              shadowColor: sectionInfo.color.main,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: sectionInfo.color.main,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="language" size={12} color="white" />
              </View>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color: sectionInfo.color.main,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                English
              </Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                color: sectionInfo.color.main,
                lineHeight: 26,
                fontWeight: "600",
              }}
            >
              {currentItem.accepted_english[0]}
            </Text>
          </View>
        )}

        {/* Enhanced Navigation Controls */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Pressable
            onPress={goToPrevious}
            disabled={currentItemIndex === 0}
            style={{
              flex: 1,
              padding: 16,
              backgroundColor: currentItemIndex === 0 ? "#f1f5f9" : "white",
              borderRadius: 16,
              borderWidth: 2,
              borderColor:
                currentItemIndex === 0 ? "#e2e8f0" : sectionInfo.color.main,
              opacity: currentItemIndex === 0 ? 0.5 : 1,
              shadowColor:
                currentItemIndex === 0 ? "#000" : sectionInfo.color.main,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={
                  currentItemIndex === 0 ? "#64748b" : sectionInfo.color.main
                }
              />
              <Text
                style={{
                  fontWeight: "700",
                  color:
                    currentItemIndex === 0 ? "#64748b" : sectionInfo.color.main,
                  fontSize: 16,
                }}
              >
                Previous
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={goToNext}
            disabled={currentItemIndex === items.length - 1}
            style={{
              flex: 1,
              padding: 16,
              backgroundColor:
                currentItemIndex === items.length - 1 ? "#f1f5f9" : "white",
              borderRadius: 16,
              borderWidth: 2,
              borderColor:
                currentItemIndex === items.length - 1
                  ? "#e2e8f0"
                  : sectionInfo.color.main,
              opacity: currentItemIndex === items.length - 1 ? 0.5 : 1,
              shadowColor:
                currentItemIndex === items.length - 1
                  ? "#000"
                  : sectionInfo.color.main,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color:
                    currentItemIndex === items.length - 1
                      ? "#64748b"
                      : sectionInfo.color.main,
                  fontSize: 16,
                }}
              >
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  currentItemIndex === items.length - 1
                    ? "#64748b"
                    : sectionInfo.color.main
                }
              />
            </View>
          </Pressable>
        </View>

        {/* Enhanced Complete Section Button */}
        {allItemsViewed && (
          <Pressable
            onPress={completeSection}
            style={{
              backgroundColor: sectionInfo.color.main,
              padding: 20,
              borderRadius: 16,
              shadowColor: sectionInfo.color.main,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  fontSize: 18,
                }}
              >
                Complete {sectionInfo.title}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Enhanced Progress Indicator */}
        {!allItemsViewed && (
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "#fbbf24",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#fbbf24",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="eye" size={16} color="white" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#92400e",
                }}
              >
                Keep Learning!
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: "#92400e",
                fontWeight: "500",
                lineHeight: 20,
              }}
            >
              View all {items.length} items to complete this section (
              {viewedItems.size}/{items.length} viewed)
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
