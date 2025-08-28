import AuthPortalSwitcher from "@/components/AuthPortalSwitcher";
import { showErrorAlert } from "@/components/ShowAlert";
import { createShadowStyle } from "@/utils/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../services/supabase-init";

export default function ParentSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit =
    /\S+@\S+\.\S+/.test(email.trim()) && pw.length >= 1 && !busy;

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
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Gradient Header */}
      <View
        style={{
          height: 260,
          backgroundColor: "#FF6B35",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 107, 53, 0.2)",
          }}
        />

        {/* Decorative circles */}
        <View
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 20,
          }}
        >
          {/* App Icon */}
          <View
            style={{
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
            }}
          >
            <Ionicons name="people" size={35} color="white" />
          </View>

          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: "white",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Parent Dashboard
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              color: "rgba(255,255,255,0.9)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Track your child's progress
          </Text>
        </View>
      </View>

      {/* Main Content  */}
      <View
        style={{
          flex: 1,
          marginTop: -30,
          paddingHorizontal: 24,
        }}
      >
        {/* Form Container */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 28,
            ...createShadowStyle(12, "#000", 0.15, 24),
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "rgba(255, 107, 53, 0.1)",
          }}
        >
          {/* Email Field */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>Email Address</Text>
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="parent@email.com"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 2,
                  borderColor: email ? "#FF6B35" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(email ? createShadowStyle(2, "#FF6B35", 0.1) : {}),
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: 16,
                  top: 18,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: email ? "#FF6B35" : "#94a3b8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="mail" size={14} color="white" />
              </View>
            </View>
          </View>

          {/* Password Field */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>Password</Text>
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 2,
                  borderColor: pw ? "#FF6B35" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(pw ? createShadowStyle(2, "#FF6B35", 0.1) : {}),
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: 16,
                  top: 18,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: pw ? "#FF6B35" : "#94a3b8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="lock-closed" size={14} color="white" />
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
              backgroundColor: canSubmit ? "#FF6B35" : "#e2e8f0",
              borderRadius: 16,
              ...(canSubmit ? createShadowStyle(6, "#FF6B35", 0.3, 12) : {}),
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
              <Text
                style={{
                  color: canSubmit ? "white" : "#94a3b8",
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                Sign In
              </Text>
            )}
          </Pressable>
        </View>

        {/* Info Banner */}
        <View
          style={{
            backgroundColor: "#fff3e0",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#ffcc80",
            ...createShadowStyle(2, "#000", 0.05),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Ionicons
              name="mail"
              size={18}
              color="#e65100"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 14,
                color: "#e65100",
                fontWeight: "700",
              }}
            >
              Parent Invitation
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: "#e65100",
              lineHeight: 18,
              fontWeight: "500",
            }}
          >
            If you received an invitation email, click the link in that email to
            set up your account first.
          </Text>
        </View>
      </View>

      {/* Floating Portal Switcher */}
      <AuthPortalSwitcher
        title="Different Account Type?"
        currentPortal="parent"
        headerColor="#FF6B35"
      />
    </View>
  );
}
