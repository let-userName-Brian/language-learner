import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { supabase } from "../../services/supabase-init";

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      {email ? (
        <>
          <Text>Signed in as {email}</Text>
          <Pressable
            onPress={signOut}
            style={{ padding: 12, backgroundColor: "#eee", borderRadius: 8 }}
          >
            <Text>Sign Out</Text>
          </Pressable>
        </>
      ) : (
        <Text>You are not signed in.</Text>
      )}
    </View>
  );
}
