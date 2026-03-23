// src/screens/auth/login.tsx

import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { requestOtp } from "../../services/auth";

export default function Login() {
  const navigation = useNavigation<any>();
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!contact) {
      Alert.alert("Error", "Please enter phone number with country code");
      return;
    }

    try {
      setLoading(true);
      const data = await requestOtp(contact);
      console.log("SEND OTP:", data);

      if (data.success) {
        Alert.alert("Success", "OTP Sent Successfully");
        navigation.navigate("VerifyOtp", { phone: contact });
      } else {
        Alert.alert("Error", data.message || "OTP sending failed");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Server Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F3F4F6" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO */}
       <View>
  <Image
    source={require("../../../assets/images/VIVEKANANDA.png")}
    style={styles.logoImage}
  />

  <Text style={styles.appTitle}>
    RAMAKRISHNA MISSION GURUGRAM VIVEKANANDA INSTITUTE OF VALUES
  </Text>
  <View style={styles.titleDivider} />
</View>

      

    <View style={{ flex: 1, justifyContent: "center" }}>
  <Text style={styles.label}>Mobile Number or Email</Text>

  <View style={styles.inputBox}>
    <Ionicons name="call-outline" size={20} color="#9CA3AF" />
    <TextInput
      placeholder="Enter registered contact details"
      placeholderTextColor="#9CA3AF"
      style={styles.input}
      // keyboardType="number-pad"
      value={contact}
      onChangeText={setContact}
    />
  </View>

  <TouchableOpacity style={styles.button} onPress={sendOtp}>
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.buttonText}>Send OTP</Text>
    )}
  </TouchableOpacity>
</View>
        

        {/* FOOTER */}
       <View style={styles.footer}>
  <View style={styles.dividerRow}>
    <View style={styles.line} />
    <Text style={styles.portalText}>OFFICIAL PORTAL</Text>
    <View style={styles.line} />
  </View>

  <Text style={styles.footerText}>
    By logging in, you agree to our{" "}
    <Text style={styles.link}>Terms of Service</Text> and {"\n"}
    <Text style={styles.link}>Privacy Policy</Text>
  </Text>

  <View style={styles.authorizedRow}>
    <Ionicons name="shield-checkmark" size={16} color="#9CA3AF" />
    <Text style={styles.authorizedText}>AUTHORIZED PERSONNEL ONLY</Text>
  </View>
</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
 container: {
  flexGrow: 1,
  backgroundColor: "#F3F4F6",
  paddingHorizontal: 20,
  paddingTop: 40,
  paddingBottom: 30,
  justifyContent: "space-between", // 👈 important
},
  // Logo
  logoImage: {
    width: 130,
    height: 130,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 10,
  },
footer: {
  alignItems: "center",
},
  // Title
  appTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#F97316",
    marginBottom: 20,
    lineHeight: 28,
    paddingHorizontal: 6,
    letterSpacing: 0.3,
  },

  loginTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subTitle: {
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
    fontSize: 13,
  },
titleDivider: {
  height: 3,
  width: 80,              // small line (not full width)
  backgroundColor: "#F97316",
  alignSelf: "center",
  borderRadius: 2,
  marginTop: 8,
  marginBottom: 10,
},
  // Input
  label: {
    alignSelf: "flex-start",
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    marginLeft: 10,
    flex: 1,
    color: "#111827",
    fontSize: 15,
  },

  // Button
  button: {
    backgroundColor: "#F97316",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  // Footer
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  portalText: {
    marginHorizontal: 10,
    color: "#9CA3AF",
    fontSize: 12,
    letterSpacing: 2,
  },
  footerText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 15,
  },
  link: {
    color: "#F97316",
    fontWeight: "600",
  },
  authorizedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  authorizedText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#9CA3AF",
  },
});