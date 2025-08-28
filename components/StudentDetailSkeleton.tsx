import { ScrollView, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

export default function StudentDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header Skeleton */}
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
        {/* Back button skeleton */}
        <View style={{ marginRight: 12, borderRadius: 8 }}>
          <SkeletonBox width={40} height={40} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          {/* Student name skeleton */}
          <SkeletonBox width="60%" height={24} />
          {/* Student info skeleton */}
          <SkeletonBox width="80%" height={16} />
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Student Info Card Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          {/* Card title */}
          <View style={{ marginBottom: 12 }}>
            <SkeletonBox width="50%" height={20} />
          </View>

          {/* Info rows */}
          <View style={{ gap: 8 }}>
            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <SkeletonBox width="40%" height={16} />
                <SkeletonBox width="35%" height={16} />
              </View>
            ))}
          </View>
        </View>

        {/* Progress Summary Card Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          {/* Card title */}
          <View style={{ marginBottom: 12 }}>
            <SkeletonBox width="45%" height={20} />
          </View>

          {/* Progress bar section */}
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <SkeletonBox width="40%" height={14} />
              <SkeletonBox width="20%" height={14} />
            </View>
            <View style={{ borderRadius: 4 }}>
              <SkeletonBox width="100%" height={8} />
            </View>
          </View>

          {/* Stats grid */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: 12,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8,
                }}
              >
                <View style={{ marginBottom: 4 }}>
                  <SkeletonBox width={30} height={24} />
                </View>
                <SkeletonBox width="70%" height={12} />
              </View>
            ))}
          </View>

          {/* Last activity */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <SkeletonBox width="35%" height={14} />
            <SkeletonBox width="40%" height={14} />
          </View>
        </View>

        {/* Actions Card Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          {/* Card title */}
          <View style={{ marginBottom: 12 }}>
            <SkeletonBox width="30%" height={20} />
          </View>

          {/* Action buttons */}
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={{ borderRadius: 8 }}>
                <SkeletonBox width="100%" height={44} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
