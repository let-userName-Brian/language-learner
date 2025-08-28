import AuthPortalSwitcher from "@/components/AuthPortalSwitcher";
import { showErrorAlert, showSuccessAlert } from "@/components/ShowAlert";
import { supabase } from "@/services/supabase-init";
import { createShadowStyle } from "@/utils/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type School = { id: string; slug: string; name: string };

export default function TeacherSignUp() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  // Load schools for picker
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id,slug,name")
          .order("name");
        if (error) throw error;
        const rows = (data || []) as School[];
        setSchools(rows);
        if (rows.length) setSchoolSlug(rows[0].slug);
      } catch {
        const fallback = [
          { id: "fallback", slug: "mountdesales", name: "Mount DeSales" },
        ];
        setSchools(fallback);
        setSchoolSlug(fallback[0].slug);
      }
    })();
  }, []);

  const getSelectedSchoolName = () => {
    if (!schoolSlug) return "Select your school";
    const selectedSchool = schools.find((s) => s.slug === schoolSlug);
    return selectedSchool?.name || "Select your school";
  };

  const canSubmit = useMemo(() => {
    const firstNameOk = firstName.trim().length >= 1;
    const lastNameOk = lastName.trim().length >= 1;
    const emOk = /\S+@\S+\.\S+/.test(email.trim());
    const pwOk = pw.length >= 8 && pw === pw2;
    const schoolOk = !!schoolSlug.trim();
    return firstNameOk && lastNameOk && emOk && pwOk && schoolOk && !busy;
  }, [firstName, lastName, email, pw, pw2, schoolSlug, busy]);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const first_name = firstName.trim();
      const last_name = lastName.trim();
      const display_name = `${first_name} ${last_name}`;
      const school_slug = schoolSlug.trim();
      const emailTrim = email.trim();

      const { error: signUpErr } = await supabase.auth.signUp({
        email: emailTrim,
        password: pw,
        options: { data: { role: "teacher", display_name, school_slug } },
      });
      if (signUpErr) throw signUpErr;

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Auth succeeded, but no user in session.");

      const { data: schoolRow, error: sErr } = await supabase
        .from("schools")
        .select("id")
        .eq("slug", school_slug)
        .single();
      if (sErr) throw sErr;
      const school_id = schoolRow.id;

      const { error: rpcErr } = await supabase.rpc("ensure_teacher_profile", {
        p_first_name: first_name,
        p_last_name: last_name,
        p_display_name: display_name,
        p_school_id: school_id,
      });
      if (rpcErr) throw rpcErr;

      showSuccessAlert("Teacher account created. Welcome!", () =>
        router.replace("/(teacher)/home")
      );
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : "Sign up failed.");
      showErrorAlert(msg);
      console.log("teacher-signup error", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/*  Gradient Header - Extended for overlap effect */}
      <View
        style={{
          height: 220,
          backgroundColor: "#8e44ad",
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
            backgroundColor: "rgba(142, 68, 173, 0.2)",
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
            paddingBottom: 20,
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
            <Ionicons name="add-circle" size={35} color="white" />
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
            Join as Teacher
          </Text>
        </View>
      </View>
      <View
        style={{
          flex: 1,
          marginTop: -53,
          paddingHorizontal: 24,
        }}
      >
        {/*  Form Container */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 24,
            ...createShadowStyle(12, "#000", 0.15, 24),
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "rgba(142, 68, 173, 0.1)",
          }}
        >
          {/* School Field */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>School</Text>
            </Text>
            <Pressable
              onPress={() => setShowSchoolPicker(true)}
              style={{
                borderWidth: 2,
                borderColor: schoolSlug ? "#8e44ad" : "#e2e8f0",
                borderRadius: 16,
                padding: 18,
                backgroundColor: "#f8fafc",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                ...(schoolSlug ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: schoolSlug ? "#1e293b" : "#94a3b8",
                  fontWeight: "500",
                }}
              >
                {getSelectedSchoolName()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Name Fields */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "700" }}>First Name</Text>
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Jordan"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                style={{
                  borderWidth: 2,
                  borderColor: firstName ? "#8e44ad" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(firstName ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "700" }}>Last Name</Text>
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Smith"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                style={{
                  borderWidth: 2,
                  borderColor: lastName ? "#8e44ad" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(lastName ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
                }}
              />
            </View>
          </View>

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
                placeholder="teacher@school.org"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 2,
                  borderColor: email ? "#8e44ad" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52, // Add space for icon
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(email ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
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
                  backgroundColor: email ? "#8e44ad" : "#94a3b8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="mail" size={14} color="white" />
              </View>
            </View>
          </View>

          {/* Password Fields */}
          <View style={{ marginBottom: 20 }}>
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
                placeholder="At least 8 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={{
                  borderWidth: 2,
                  borderColor: pw ? "#8e44ad" : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52, // Add space for icon
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(pw ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
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
                  backgroundColor: pw ? "#8e44ad" : "#94a3b8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="lock-closed" size={14} color="white" />
              </View>
            </View>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>Confirm Password</Text>
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={pw2}
                onChangeText={setPw2}
                placeholder="Re-enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={{
                  borderWidth: 2,
                  borderColor:
                    pw2 && pw === pw2
                      ? "#4CAF50"
                      : pw2 && pw !== pw2
                      ? "#f44336"
                      : "#e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  paddingLeft: 52, // Add space for icon
                  fontSize: 16,
                  backgroundColor: "#f8fafc",
                  fontWeight: "500",
                  ...(pw2 ? createShadowStyle(
                    2,
                    pw2 && pw === pw2 ? "#4CAF50" : pw2 && pw !== pw2 ? "#f44336" : "#000",
                    0.1
                  ) : {}),
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
                  backgroundColor:
                    pw2 && pw === pw2
                      ? "#4CAF50"
                      : pw2 && pw !== pw2
                      ? "#f44336"
                      : "#94a3b8",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="lock-closed" size={14} color="white" />
              </View>
            </View>
            {pw2 && pw !== pw2 ? (
              <Text
                style={{
                  color: "#f44336",
                  fontSize: 12,
                  marginTop: 6,
                  marginLeft: 4,
                  fontWeight: "500",
                }}
              >
                Passwords don't match
              </Text>
            ) : null}
          </View>

          {/*  Create Account Button */}
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              backgroundColor: canSubmit ? "#8e44ad" : "#e2e8f0",
              borderRadius: 16,
              ...(canSubmit ? createShadowStyle(6, "#8e44ad", 0.3, 12) : {}),
              borderWidth: canSubmit ? 0 : 1,
              borderColor: "#e2e8f0",
            }}
          >
            {!busy && (
              <Ionicons
                name="person-add"
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
                Create Teacher Account
              </Text>
            )}
          </Pressable>
        </View>
        {/* </ScrollView> */}
      </View>
      {/*  School Picker Modal */}
      <Modal
        visible={showSchoolPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSchoolPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
          onPress={() => setShowSchoolPicker(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 320,
              maxHeight: "70%",
              ...createShadowStyle(12, "#000", 0.3, 24),
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 20,
                color: "#1e293b",
              }}
            >
              Select School
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              <View style={{ gap: 8 }}>
                {schools.map((school) => (
                  <Pressable
                    key={school.slug}
                    onPress={() => {
                      setSchoolSlug(school.slug);
                      setShowSchoolPicker(false);
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor:
                        schoolSlug === school.slug ? "#8e44ad" : "#f8fafc",
                      borderWidth: 2,
                      borderColor:
                        schoolSlug === school.slug ? "#8e44ad" : "#e2e8f0",
                      ...(schoolSlug === school.slug ? createShadowStyle(2, "#8e44ad", 0.1) : {}),
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "700",
                        fontSize: 16,
                        color: schoolSlug === school.slug ? "white" : "#1e293b",
                      }}
                    >
                      {school.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Floating Portal Switcher */}
      <AuthPortalSwitcher
        title="Already have an account?"
        currentPortal="teacher-signup"
        headerColor="#8e44ad"
      />
    </View>
  );
}
