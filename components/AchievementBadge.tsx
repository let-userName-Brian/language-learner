import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export const AchievementBadge = ({
  icon,
  label,
  color = "#2196F3",
  achieved = false,
}: {
  icon: string;
  label: string;
  color?: string;
  achieved?: boolean;
}) => (
  <View
    style={{
      alignItems: "center",
      marginHorizontal: 8,
      opacity: achieved ? 1 : 0.3,
    }}
  >
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: achieved ? color : "#e9ecef",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
      }}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={achieved ? "#fff" : "#6c757d"}
      />
    </View>
    <Text
      style={{
        fontSize: 10,
        color: achieved ? color : "#6c757d",
        fontWeight: "600",
        textAlign: "center",
      }}
    >
      {label}
    </Text>
  </View>
);
