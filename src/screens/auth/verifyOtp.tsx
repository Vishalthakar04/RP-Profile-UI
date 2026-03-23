// src/screens/auth/verify-otp.tsx
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { verifyOtp } from "../../services/auth";

export default function VerifyOtpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone } = route.params; // coming from previous screen

  const [enteredOtp, setEnteredOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify OTP
      const verifyResponse = await verifyOtp(phone, enteredOtp);

      if (!verifyResponse?.success) {
        Alert.alert("Verification Failed", verifyResponse?.message || "Invalid or expired OTP");
        return;
      }

      const { access_token, refresh_token, user } = verifyResponse.data;

      if (!access_token || !refresh_token || !user?.id) {
        Alert.alert("Login Error", "Invalid response from server");
        return;
      }

      // Step 2: Save tokens & basic user info (all we need is already here)
      await Promise.all([
        AsyncStorage.setItem("access_token", access_token),
        AsyncStorage.setItem("refresh_token", refresh_token),
        AsyncStorage.setItem("user_id", user.id.toString()),
        AsyncStorage.setItem("user_role", user.role || "user"),
      ]);

      if (user.email_address) {
        await AsyncStorage.setItem("user_email", user.email_address);
      }

      if (user.first_name || user.last_name) {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        if (fullName) await AsyncStorage.setItem("user_name", fullName);
      }

      // Optional: store phone if returned by backend
      if (user.phone_number) {
        await AsyncStorage.setItem("user_phone", user.phone_number);
      }

      console.log("Auth tokens & user data saved successfully");

      // Step 3: Navigate to main app (no extra profile fetch needed)
      navigation.replace("Dashboard");
    } catch (error: any) {
      console.error("OTP verification flow error:", error);
      Alert.alert(
        "Error",
        error.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="key-outline" size={40} color="#F97316" />
      </View>

      <Text style={styles.title}>Verify OTP</Text>

      <Text style={styles.subTitle}>
        Enter the 6-digit code sent to{" "}
        <Text style={styles.highlight}>{phone}</Text>
      </Text>

      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="Enter 6 digit OTP"
          placeholderTextColor="#9CA3AF"
          value={enteredOtp}
          onChangeText={setEnteredOtp}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.resendText}>
        Didn't receive code?{" "}
        <Text
          style={styles.resendLink}
          onPress={() => {
            // TODO: implement resend OTP + countdown
            Alert.alert("Resend", "Resend functionality not implemented yet");
          }}
        >
          Resend OTP
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    padding: 20,
    justifyContent: "center",
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 60,
    backgroundColor: "#FDEDDC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  subTitle: {
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 25,
    fontSize: 16,
  },
  highlight: {
    color: "#F97316",
    fontWeight: "600",
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
    fontSize: 18,
    // letterSpacing: 2,
  },
  button: {
    backgroundColor: "#F97316",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#FDBA74",
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  resendText: {
    color: "#6B7280",
    fontSize: 14,
  },
  resendLink: {
    color: "#F97316",
    fontWeight: "600",
  },
});