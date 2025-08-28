import { ScrollView, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

export const SettingsSkeleton = () => {
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* School Badge Skeleton */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 2,
          borderColor: "#e9ecef",
        }}
      >
        {/* Header Skeleton */}
        <SkeletonBox width="100%" height={60} />

        {/* Avatar Skeleton */}
        <View style={{ alignItems: "center", marginTop: 20, marginBottom: 20 }}>
          <SkeletonBox width={100} height={100} />
          <View style={{ marginTop: 16, alignItems: "center", gap: 8 }}>
            <SkeletonBox width={150} height={24} />
            <SkeletonBox width={80} height={20} />
          </View>
        </View>

        {/* ID Section Skeleton */}
        <View style={{ gap: 8 }}>
          <SkeletonBox width="100%" height={16} />
          <SkeletonBox width="60%" height={20} />
        </View>
      </View>

      {/* Additional Info Card Skeleton */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#e9ecef",
        }}
      >
        <SkeletonBox width={140} height={20} />
        <View style={{ marginTop: 12, gap: 6 }}>
          <SkeletonBox width="100%" height={16} />
          <SkeletonBox width="85%" height={16} />
          <SkeletonBox width="70%" height={16} />
        </View>
      </View>

      {/* Sign Out Button Skeleton */}
      <SkeletonBox width="100%" height={48} />
    </ScrollView>
  );
};
