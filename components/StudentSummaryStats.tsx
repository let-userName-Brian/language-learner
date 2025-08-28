import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type ProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  lastActivity: string | null;
  progressPercentage: number;
};

type Props = {
  summary: ProgressSummary;
  onViewDetails: () => void;
};

export default function StudentSummaryStats({ summary, onViewDetails }: Props) {
  return (
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
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
        📊 Learning Progress
      </Text>
      
      <View style={{ gap: 12 }}>
        {/* Overall Progress */}
        <View style={{ backgroundColor: "#f8f9fa", padding: 12, borderRadius: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ color: "#666" }}>Overall Progress:</Text>
            <Text style={{ fontWeight: "600" }}>{summary.progressPercentage}%</Text>
          </View>
          <View style={{ backgroundColor: "#e9ecef", height: 8, borderRadius: 4 }}>
            <View style={{
              backgroundColor: "#28a745",
              height: 8,
              borderRadius: 4,
              width: `${summary.progressPercentage}%`
            }} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: "#d4edda", borderRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#155724" }}>
              {summary.completedLessons}
            </Text>
            <Text style={{ fontSize: 12, color: "#155724", textAlign: "center" }}>
              Completed
            </Text>
          </View>
          
          <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: "#fff3cd", borderRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#856404" }}>
              {summary.inProgressLessons}
            </Text>
            <Text style={{ fontSize: 12, color: "#856404", textAlign: "center" }}>
              In Progress
            </Text>
          </View>
          
          <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: "#f8d7da", borderRadius: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#721c24" }}>
              {summary.totalLessons - summary.completedLessons - summary.inProgressLessons}
            </Text>
            <Text style={{ fontSize: 12, color: "#721c24", textAlign: "center" }}>
              Not Started
            </Text>
          </View>
        </View>

        {/* Last Activity */}
        {summary.lastActivity && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#666" }}>Last Activity:</Text>
            <Text style={{ fontWeight: "500" }}>
              {new Date(summary.lastActivity).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* View Details Button */}
        <Pressable
          onPress={onViewDetails}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            backgroundColor: "#007bff",
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          <Ionicons name="analytics-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            View Detailed Progress
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
