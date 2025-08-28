import { ScrollView, View } from "react-native";

export const SectionSkeleton = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header Skeleton */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: 20,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Back Button Skeleton */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#e9ecef",
            }}
          />

          <View style={{ flex: 1 }}>
            {/* Lesson Title Skeleton */}
            <View
              style={{
                height: 12,
                backgroundColor: "#e9ecef",
                borderRadius: 6,
                width: "60%",
                marginBottom: 4,
              }}
            />

            {/* Section Title Skeleton */}
            <View
              style={{
                height: 18,
                backgroundColor: "#e9ecef",
                borderRadius: 9,
                width: "40%",
                marginBottom: 4,
              }}
            />

            {/* Progress Skeleton */}
            <View
              style={{
                height: 14,
                backgroundColor: "#e9ecef",
                borderRadius: 7,
                width: "50%",
              }}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {/* Main Latin Text Card Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e9ecef",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          {/* Latin Text Skeleton */}
          <View
            style={{
              height: 32,
              backgroundColor: "#e9ecef",
              borderRadius: 16,
              marginBottom: 16,
            }}
          />

          {/* Audio Button Skeleton */}
          <View
            style={{
              height: 56,
              backgroundColor: "#e9ecef",
              borderRadius: 12,
              marginVertical: 8,
            }}
          />
        </View>

        {/* English Translation Card Skeleton */}
        <View
          style={{
            padding: 20,
            backgroundColor: "#f8f9fa",
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: "#e9ecef",
          }}
        >
          <View
            style={{
              height: 16,
              backgroundColor: "#e9ecef",
              borderRadius: 8,
              width: "25%",
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 24,
              backgroundColor: "#e9ecef",
              borderRadius: 12,
              width: "80%",
            }}
          />
        </View>

        {/* Navigation Controls Skeleton */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 20,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 48,
              backgroundColor: "#e9ecef",
              borderRadius: 12,
            }}
          />
          <View
            style={{
              flex: 1,
              height: 48,
              backgroundColor: "#e9ecef",
              borderRadius: 12,
            }}
          />
        </View>

        {/* Progress Indicator Skeleton */}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: "#f8f9fa",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View
            style={{
              height: 14,
              backgroundColor: "#e9ecef",
              borderRadius: 7,
              width: "70%",
              alignSelf: "center",
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
};
