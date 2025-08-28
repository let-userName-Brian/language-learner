import { ScrollView, View } from "react-native";
import { SkeletonBox } from "./SkeletonBox";

export const ParentHomeSkeleton = () => {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <View style={{ padding: 16 }}>
          {/* Header Skeleton */}
          <SkeletonBox width="80%" height={32} />
          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <SkeletonBox width="60%" height={20} />
          </View>
  
          {/* Student Progress Cards Skeleton */}
          {[1, 2].map((_, index) => (
            <View
              key={index}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {/* Student Header Skeleton */}
              <View 
                style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: 16 
                }}
              >
                <View style={{ flex: 1 }}>
                  <SkeletonBox width="70%" height={24} />
                  <View style={{ marginTop: 4 }}>
                    <SkeletonBox width="85%" height={16} />
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 16 }}>
                  <SkeletonBox width={50} height={28} />
                  <View style={{ marginTop: 4 }}>
                    <SkeletonBox width={60} height={14} />
                  </View>
                </View>
              </View>
  
              {/* Progress Bar Skeleton */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ marginBottom: 8 }}>
                  <SkeletonBox width="75%" height={16} />
                </View>
                <SkeletonBox width="100%" height={10} />
              </View>
  
              {/* Recent Activity Skeleton */}
              <View>
                <View style={{ marginBottom: 12 }}>
                  <SkeletonBox width="50%" height={20} />
                </View>
                {[1, 2, 3].map((_, activityIndex) => (
                  <View
                    key={activityIndex}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: "#f8f9fa",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <SkeletonBox width="65%" height={16} />
                    <SkeletonBox width="20%" height={14} />
                  </View>
                ))}
              </View>
            </View>
          ))}
  
          {/* Refresh Button Skeleton */}
          <SkeletonBox width="100%" height={52} />
        </View>
      </ScrollView>
    );
  };