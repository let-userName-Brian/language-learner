import { View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

export default function StudentListSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
            paddingHorizontal: 12,
            marginBottom: 8,
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 6 }}>
              <SkeletonBox width="70%" height={18} />
            </View>
            <SkeletonBox width="50%" height={14} />
          </View>
          
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ marginBottom: 6 }}>
              <SkeletonBox width={20} height={18} />
            </View>
            <SkeletonBox width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
