import AuthPortalSwitcher from "@/components/AuthPortalSwitcher";
import { showErrorAlert } from "@/components/ShowAlert";
import { createShadowStyle } from "@/utils/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View
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

      let schoolSlug: string | null = null;
      try {
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

      const slug = schoolSlug ?? "mountdesales";
      const email = `${id}+${slug}@example.org`;
      const password = `${slug}:${id}:${nmLower}`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
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
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Gradient Header - Extended */}
      <View style={{
        height: 260,
        backgroundColor: "#4CAF50",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Gradient overlay */}
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(76, 175, 80, 0.2)",
        }} />
        
        {/* Decorative circles */}
        <View style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "rgba(255,255,255,0.1)",
        }} />
        <View style={{
          position: "absolute",
          bottom: -20,
          left: -20,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(255,255,255,0.05)",
        }} />

        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: 20,
        }}>
          {/* App Icon */}
          <View style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: "rgba(255,255,255,0.2)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.3)",
            ...createShadowStyle(8),
          }}>
            <Ionicons name="book" size={35} color="white" />
          </View>
          
          <Text style={{
            fontSize: 26,
            fontWeight: "800",
            color: "white",
            textAlign: "center",
            marginBottom: 4,
          }}>
            Welcome Back!
          </Text>
          <Text style={{
            fontSize: 16,
            fontWeight: "500",
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            marginBottom: 8,
          }}>
            Continue your learning journey
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ 
        flex: 1,
        marginTop: -30,
        paddingHorizontal: 24,
      }}>
        {/* Form Container */}
        <View style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: 28,
          ...createShadowStyle(12, "#000", 0.15, 24, 12),
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "rgba(76, 175, 80, 0.1)",
        }}>
          {/* Student ID Field */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: 8,
            }}>
              <Text style={{ fontWeight: "700" }}>Student ID</Text>
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={studentId}
                onChangeText={(t) => setStudentId(t.replace(/[^\d]/g, ""))}
                keyboardType="number-pad"
                placeholder="Enter your student ID"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 2,
                  borderColor: studentId ? "#4CAF50" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(studentId ? createShadowStyle(2, "#4CAF50", 0.1) : {}),
                }}
              />
              <View style={{
                position: "absolute",
                left: 16,
                top: 18,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: studentId ? "#4CAF50" : "#94a3b8",
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Ionicons name="card" size={14} color="white" />
              </View>
            </View>
          </View>

          {/* Name Field */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: 8,
            }}>
              <Text style={{ fontWeight: "700" }}>Full Name</Text>
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                style={{
                  borderWidth: 2,
                  borderColor: name ? "#4CAF50" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(name ? createShadowStyle(2, "#4CAF50", 0.1) : {}),
                }}
              />
              <View style={{
                position: "absolute",
                left: 16,
                top: 18,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: name ? "#4CAF50" : "#94a3b8",
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Ionicons name="person" size={14} color="white" />
              </View>
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={doSignIn}
            disabled={!canSubmit}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              backgroundColor: canSubmit ? "#4CAF50" : "#e2e8f0",
              borderRadius: 16,
              ...(canSubmit ? createShadowStyle(6, "#4CAF50", 0.3, 12) : {}),
              borderWidth: canSubmit ? 0 : 1,
              borderColor: "#e2e8f0",
            }}
          >
            {!busy && (
              <Ionicons 
                name="log-in" 
                size={18} 
                color={canSubmit ? "white" : "#94a3b8"} 
                style={{ marginRight: 8 }} 
              />
            )}
            {busy ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{
                color: canSubmit ? "white" : "#94a3b8",
                textAlign: "center",
                fontWeight: "700",
                fontSize: 16,
              }}>
                Sign In
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Floating Portal Switcher*/}
      <AuthPortalSwitcher 
        title="Different Account Type?"
        currentPortal="student"
        headerColor="#4CAF50"
      />
    </View>
  );
}
