// File: components/ErrorPage.tsx
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

interface ErrorPageProps {
  title?: string;
  message?: string;
  subMessage?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  showBackButton?: boolean;
}

export default function ErrorPage({
  title = "Something went wrong",
  message = "An unexpected error occurred",
  subMessage,
  buttonText = "Go Back",
  onButtonPress,
  showBackButton = true,
}: ErrorPageProps) {
  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress();
    } else {
      // Default behavior - go back or to lessons
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push("/(student)/lessons");
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#f8f9fa",
      }}
    >
      {/* Error Icon */}
      <Text
        style={{
          fontSize: 64,
          marginBottom: 16,
        }}
      >
        ⚠️
      </Text>

      {/* Title */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: "#dc3545",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        {title}
      </Text>

      {/* Main Message */}
      <Text
        style={{
          fontSize: 16,
          color: "#495057",
          textAlign: "center",
          marginBottom: 8,
          lineHeight: 24,
        }}
      >
        {message}
      </Text>

      {/* Sub Message */}
      {subMessage && (
        <Text
          style={{
            fontSize: 14,
            color: "#6c757d",
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
          }}
        >
          {subMessage}
        </Text>
      )}

      {/* Action Button */}
      {showBackButton && (
        <Pressable
          onPress={handleButtonPress}
          style={{
            backgroundColor: "#007bff",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            minWidth: 120,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            {buttonText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Preset error configurations
export const ErrorPages = {
  SectionNotFound: (lessonId?: string) => (
    <ErrorPage
      title="Section Not Found"
      message="This section could not be loaded"
      subMessage="The lesson may not have items for this section type"
      buttonText="Back to Lessons"
      onButtonPress={() => router.push("/(student)/lessons")}
    />
  ),

  LessonNotFound: () => (
    <ErrorPage
      title="Lesson Not Found"
      message="This lesson could not be found"
      subMessage="It may have been removed or you don't have access"
      buttonText="Back to Lessons"
      onButtonPress={() => router.push("/(student)/lessons")}
    />
  ),

  NetworkError: (retryFunction?: () => void) => (
    <ErrorPage
      title="Connection Error"
      message="Unable to connect to the server"
      subMessage="Please check your internet connection and try again"
      buttonText={retryFunction ? "Retry" : "Go Back"}
      onButtonPress={retryFunction}
    />
  ),

  LoadingError: (retryFunction?: () => void) => (
    <ErrorPage
      title="Loading Failed"
      message="Failed to load content"
      subMessage="Please try again"
      buttonText="Retry"
      onButtonPress={retryFunction}
    />
  ),
};
