import { showErrorAlert } from "@/components/ShowAlert";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../services/supabase-init";

function normalizeName(n: string) {
  return n.replace(/\s+/g, " ").trim();
}

export default function SignIn() {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) router.replace("/home");
      } catch (e) {
        console.log("signin error", e);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    const idOk = /^\d{3,}$/.test(studentId.trim());
    const nameOk = normalizeName(name).length >= 2;
    return idOk && nameOk && !busy;
  }, [studentId, name, busy]);

  const doSignIn = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const id = studentId.trim();
      const nmDisplay = normalizeName(name);
      const nmLower = nmDisplay.toLowerCase();

      // 1) Try to resolve the school slug from student profile
      let schoolSlug: string | null = null;
      try {
        // Look up student by ID to get their school
        const { data: studentData } = await supabase
          .from("user_profiles")
          .select(`
            school_id,
            schools:schools(slug)
          `)
          .eq("student_id", id)
          .eq("role", "student")
          .eq("display_name", nmDisplay)
          .maybeSingle();
        
        if (studentData?.schools?.[0]?.slug) {
          schoolSlug = studentData.schools[0].slug;
        }
      } catch {
        // Fallback if lookup fails
      }

      // 2) Build creds (prefer resolved slug; otherwise MVP default)
      const slug = schoolSlug ?? "mountdesales";
      const email = `${id}+${slug}@example.org`;
      const password = `${slug}:${id}:${nmLower}`;

      // 3) Sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Show clearer guidance for common cases
        const msg =
          error.code === "invalid_credentials"
            ? "Check your Student ID and the exact spelling of your name."
            : error.message || "Sign in failed.";
        throw new Error(msg);
      }
    } catch (e: any) {
      showErrorAlert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      contentContainerStyle={{ 
        padding: 24,
        paddingTop: 60,
        justifyContent: "center",
        minHeight: "100%"
      }}
    >
      {/* Header */}
      <View style={{ 
        alignItems: "center", 
        marginBottom: 40 
      }}>
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: "#4CAF50",
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          shadowColor: "#4CAF50",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ fontSize: 36, color: "white" }}>📚</Text>
        </View>
        
        <Text style={{ 
          fontSize: 28, 
          fontWeight: "700", 
          color: "#212529",
          marginBottom: 8,
          textAlign: "center"
        }}>
          Welcome Back!
        </Text>
        
        <Text style={{ 
          fontSize: 16, 
          color: "#6c757d",
          textAlign: "center",
          lineHeight: 22
        }}>
          Sign in to continue your learning journey
        </Text>
      </View>

      {/* Form Container */}
      <View style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 24,
      }}>
        {/* Student ID Field */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Student ID
          </Text>
          <TextInput
            value={studentId}
            onChangeText={(t) => setStudentId(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder="Enter your student ID"
            style={{
              borderWidth: 2,
              borderColor: studentId ? "#4CAF50" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
        </View>

        {/* Name Field */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Full Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            style={{
              borderWidth: 2,
              borderColor: name ? "#4CAF50" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
        </View>

        {/* Sign In Button */}
        <Pressable
          onPress={doSignIn}
          disabled={!canSubmit}
          style={{
            padding: 18,
            backgroundColor: canSubmit ? "#4CAF50" : "#e9ecef",
            borderRadius: 12,
            shadowColor: canSubmit ? "#4CAF50" : "transparent",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: canSubmit ? 4 : 0,
          }}
        >
          {busy ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              style={{ 
                color: canSubmit ? "white" : "#6c757d", 
                textAlign: "center", 
                fontWeight: "700",
                fontSize: 16
              }}
            >
              Sign In
            </Text>
          )}
        </Pressable>
      </View>

      {/* Portal Selector */}
      <View style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: "600", 
          color: "#212529",
          textAlign: "center",
          marginBottom: 16
        }}>
          Need a different account?
        </Text>
        
        <View style={{ gap: 8 }}>
          <Pressable 
            onPress={() => router.replace("/teacher-signin")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: "#2196F3",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, color: "white" }}>👩‍��</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                Teacher Portal
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Manage your classroom
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.replace("/parent-signin")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: "#FF9800",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, color: "white" }}>👨‍👩‍👧‍👦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                Parent Portal
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Track your child's progress
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => router.push("/teacher-signup")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: "#4CAF50",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, color: "white" }}>➕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                New Teacher?
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Create an educator account
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
