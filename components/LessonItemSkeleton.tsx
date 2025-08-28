import { ScrollView, View } from "react-native";

export const LessonItemSkeleton = () => {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header Skeleton */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: 50,
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
            {/* Title Skeleton */}
            <View
              style={{
                height: 18,
                backgroundColor: "#e9ecef",
                borderRadius: 9,
                width: "70%",
                marginBottom: 6,
              }}
            />
            {/* Progress Text Skeleton */}
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
        {/* Progress Overview Skeleton */}
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View
            style={{
              height: 16,
              backgroundColor: "#e9ecef",
              borderRadius: 8,
              width: "40%",
              marginBottom: 12,
            }}
          />
          <View
            style={{
              height: 8,
              backgroundColor: "#e9ecef",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 12,
              backgroundColor: "#e9ecef",
              borderRadius: 6,
              width: "30%",
            }}
          />
        </View>

        {/* Section Card Skeletons */}
        {[1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "#e9ecef",
            }}
          >
            {/* Section Header Skeleton */}
            <View
              style={{
                backgroundColor: "#f8f9fa",
                padding: 16,
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#e9ecef",
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
                    gap: 12,
                  }}
                >
                  {/* Icon Skeleton */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: "#e9ecef",
                      borderRadius: 12,
                    }}
                  />
                  <View>
                    {/* Title Skeleton */}
                    <View
                      style={{
                        height: 18,
                        backgroundColor: "#e9ecef",
                        borderRadius: 9,
                        width: 120,
                        marginBottom: 4,
                      }}
                    />
                    {/* Items Count Skeleton */}
                    <View
                      style={{
                        height: 14,
                        backgroundColor: "#e9ecef",
                        borderRadius: 7,
                        width: 60,
                      }}
                    />
                  </View>
                </View>

                {/* Status Badge Skeleton */}
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

            {/* Section Content Skeleton */}
            <View style={{ padding: 16, gap: 16 }}>
              {/* "What you'll learn" Text Skeleton */}
              <View
                style={{
                  height: 14,
                  backgroundColor: "#e9ecef",
                  borderRadius: 7,
                  width: "40%",
                  marginBottom: 8,
                }}
              />

              {/* Item List Skeletons */}
              {[1, 2, 3].map((itemIndex) => (
                <View
                  key={itemIndex}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  {/* Bullet Point Skeleton */}
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#e9ecef",
                    }}
                  />
                  {/* Text Skeleton */}
                  <View
                    style={{
                      height: 14,
                      backgroundColor: "#e9ecef",
                      borderRadius: 7,
                      flex: 1,
                    }}
                  />
                </View>
              ))}

              {/* Button Skeleton */}
              <View
                style={{
                  backgroundColor: "#e9ecef",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    height: 16,
                    backgroundColor: "#dee2e6",
                    borderRadius: 8,
                    width: "50%",
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
