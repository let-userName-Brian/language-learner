import { supabase } from "@/services/supabase-init";
import { useAuth, useLessons } from "@/store/store";
import type { Session } from "@supabase/supabase-js";
import { Redirect, Slot, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"teacher" | "student" | "parent" | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const { actions: authActions } = useAuth();
  const { actions: lessonsActions } = useLessons();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);

        const uid = data.session?.user?.id;
        if (uid) {
          console.log("Initializing store from session...");
          await authActions.loadUser();
          // Load all dashboard data once at app startup
          await lessonsActions.loadDashboardData();
          console.log("Store initialized from session");

          const { data: prof } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("user_id", uid)
            .maybeSingle();
          setRole(
            (prof?.role as any) ??
              data.session?.user?.user_metadata?.role ??
              null
          );
        } else {
          setRole(null);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const first =
    Array.isArray(segments) && segments.length ? String(segments[0]) : "";
  const inAuth = first === "(auth)";
  const inTeacher = first === "(teacher)";
  const inParent = first === "(parent)";

  // Not signed in -> go to auth stack
  if (!session && !inAuth) return <Redirect href="/(auth)/signin" />;

  // Signed in teachers -> push into teacher area unless already there
  if (session && role === "teacher" && !inTeacher)
    return <Redirect href="/(teacher)/home" />;

  // Signed in parents -> push into parent area unless already there
  if (session && role === "parent" && !inParent)
    return <Redirect href="/(parent)/home" />;

  // Signed in non-teachers/non-parents in teacher area -> bounce to appropriate home
  if (session && role !== "teacher" && inTeacher) {
    return role === "parent" ? (
      <Redirect href="/(parent)/home" />
    ) : (
      <Redirect href="/(student)/home" />
    );
  }

  // Signed in non-parents in parent area -> bounce to appropriate home
  if (session && role !== "parent" && inParent) {
    return role === "teacher" ? (
      <Redirect href="/(teacher)/home" />
    ) : (
      <Redirect href="/(student)/home" />
    );
  }

  // Signed in but on auth pages -> send to appropriate home
  if (session && inAuth) {
    return role === "teacher" ? (
      <Redirect href="/(teacher)/home" />
    ) : role === "parent" ? (
      <Redirect href="/(parent)/home" />
    ) : (
      <Redirect href="/(student)/home" />
    );
  }

  return <Slot />;
}
