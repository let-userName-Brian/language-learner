import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

type StudentProgress = {
  lesson_id: string;
  lesson_title: string;
  completed_sections: number;
  total_sections: number;
  last_activity: string;
  status: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  progress: StudentProgress[];
  studentName: string;
};

export default function StudentProgressModal({ visible, onClose, progress, studentName }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        {/* Header */}
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
          <Pressable
            onPress={onClose}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
              marginRight: 12,
            }}
          >
            <Ionicons name="close" size={24} color="#007bff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>
              {studentName}'s Progress
            </Text>
            <Text style={{ color: "#666", fontSize: 14 }}>
              Detailed lesson progress
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {progress.length === 0 ? (
            <Text style={{ color: "#666", fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
              No progress data available yet. Student hasn't started any lessons.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {progress.map((item, index) => (
                <View
                  key={index}
                  style={{
                    padding: 16,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e9ecef",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontWeight: "600", flex: 1 }}>
                      {item.lesson_title}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: item.status === 'completed' ? '#d4edda' : '#fff3cd'
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: item.status === 'completed' ? '#155724' : '#856404'
                      }}>
                        {item.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: "#666", fontSize: 14 }}>
                      Progress: {item.completed_sections}/{item.total_sections} sections
                    </Text>
                    <Text style={{ color: "#666", fontSize: 14, fontWeight: "600" }}>
                      {Math.round((item.completed_sections / item.total_sections) * 100)}%
                    </Text>
                  </View>
                  
                  {/* Progress Bar */}
                  <View style={{ backgroundColor: "#e9ecef", height: 6, borderRadius: 3, marginBottom: 8 }}>
                    <View style={{
                      backgroundColor: item.status === 'completed' ? '#28a745' : '#ffc107',
                      height: 6,
                      borderRadius: 3,
                      width: `${(item.completed_sections / item.total_sections) * 100}%`
                    }} />
                  </View>
                  
                  <Text style={{ color: "#666", fontSize: 12 }}>
                    Last activity: {new Date(item.last_activity).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
