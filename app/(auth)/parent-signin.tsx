import { showErrorAlert } from "@/components/ShowAlert";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { supabase } from "../../services/supabase-init";

export default function ParentSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim()) && pw.length >= 1 && !busy;

  const doSignIn = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;
      
      const user = (await supabase.auth.getUser()).data.user;
      const role = user?.user_metadata?.role;
      
      if (role !== "parent") {
        await supabase.auth.signOut();
        throw new Error("This account is not a parent account.");
      }
    } catch (e: any) {
      showErrorAlert(e?.message ?? "Sign in failed.");
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
          backgroundColor: "#FF9800",
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          shadowColor: "#FF9800",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ fontSize: 36, color: "white" }}>👨‍👩‍👧‍👦</Text>
        </View>
        
        <Text style={{ 
          fontSize: 28, 
          fontWeight: "700", 
          color: "#212529",
          marginBottom: 8,
          textAlign: "center"
        }}>
          Parent Dashboard
        </Text>
        
        <Text style={{ 
          fontSize: 16, 
          color: "#6c757d",
          textAlign: "center",
          lineHeight: 22
        }}>
          Track your child's learning progress
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
        {/* Email Field */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="parent@email.com"
            style={{
              borderWidth: 2,
              borderColor: email ? "#FF9800" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
        </View>

        {/* Password Field */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Password
          </Text>
          <TextInput
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            placeholder="Enter your password"
            style={{
              borderWidth: 2,
              borderColor: pw ? "#FF9800" : "#e9ecef",
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
            backgroundColor: canSubmit ? "#FF9800" : "#e9ecef",
            borderRadius: 12,
            shadowColor: canSubmit ? "#FF9800" : "transparent",
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

      {/* Info Banner */}
      <View style={{ 
        backgroundColor: "#fff3e0", 
        borderRadius: 12, 
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#ffcc80"
      }}>
        <Text style={{ 
          fontSize: 14, 
          color: "#e65100", 
          textAlign: "center",
          lineHeight: 20,
          fontWeight: "500"
        }}>
          💌 If you received an invitation email, click the link in that email to set up your account first.
        </Text>
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
            onPress={() => router.replace("/signin")}
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
              <Text style={{ fontSize: 20, color: "white" }}>📚</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                Student Portal
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Continue your learning journey
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
          
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
        </View>
      </View>
    </ScrollView>
  );
}
