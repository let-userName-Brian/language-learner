import { DimensionValue, View } from "react-native";

export const SkeletonBox = ({ width = "100%", height = 16 }: { width?: DimensionValue, height?: number }) => (
    <View
      style={{
        width,
        height,
        backgroundColor: "#e2e8f0",
        borderRadius: 4,
        opacity: 0.6,
      }}
    />
  );