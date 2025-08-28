import { View } from "react-native";

export const LessonSkeleton = () => {
  return (
    <View style={{ marginBottom: 16 }}>
      {/* Lesson Header Skeleton */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e9ecef",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              gap: 12,
            }}
          >
            {/* Unit Icon Skeleton */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#e9ecef",
              }}
            />

            <View style={{ flex: 1 }}>
              {/* Unit Title Skeleton */}
              <View
                style={{
                  height: 12,
                  backgroundColor: "#e9ecef",
                  borderRadius: 6,
                  width: "40%",
                  marginBottom: 6,
                }}
              />

              {/* Lesson Title Skeleton */}
              <View
                style={{
                  height: 18,
                  backgroundColor: "#e9ecef",
                  borderRadius: 9,
                  width: "80%",
                  marginBottom: 6,
                }}
              />

              {/* Progress Text Skeleton */}
              <View
                style={{
                  height: 14,
                  backgroundColor: "#e9ecef",
                  borderRadius: 7,
                  width: "60%",
                }}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Badge Skeleton */}
            <View
              style={{
                backgroundColor: "#e9ecef",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                width: 50,
                height: 20,
              }}
            />

            {/* Caret Skeleton */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#e9ecef",
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};
