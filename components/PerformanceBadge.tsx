import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export const PerformanceBadge = ({ 
    icon, 
    value, 
    label, 
    color = "#2196F3",
    backgroundColor = "#f0f9ff"
  }: {
    icon: string;
    value: string | number;
    label: string;
    color?: string;
    backgroundColor?: string;
  }) => (
    <View style={{
      flex: 1,
      backgroundColor: backgroundColor,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginHorizontal: 4,
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }}>
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <Ionicons name={icon as any} size={24} color="#fff" />
      </View>
      <Text style={{
        fontSize: 24,
        fontWeight: '800',
        color: color,
        marginBottom: 4,
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: color,
        textAlign: 'center',
      }}>
        {label}
      </Text>
    </View>
  );