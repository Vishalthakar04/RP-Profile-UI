// src/screens/tabs/profile.tsx

import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";

import { fetchProfile } from "../../services/profile";
import AppHeader from "../../components/AppHeader";
import BottomNavBar from "../../components/BottomNavbar";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const profileRes = await fetchProfile();
      if (profileRes?.success && profileRes?.data) {
        const {
          first_name = "",
          last_name = "",
          email_address = "",
          phone_number = "",
          joining_date = "",
          status = "",
          zone = "",
        } = profileRes.data;
        setName(`${first_name} ${last_name}`.trim() || "User");
        setEmail(email_address || "");
        setPhone(phone_number || "");
        setJoiningDate(
          joining_date
            ? new Date(joining_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : ""
        );
        setStatus(status || "");
        setZone(zone || "");
      }
    } catch (error) {
      console.error("Profile load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
          navigation.replace("Login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HEADER */}
        <AppHeader
          title="My Profile"
          showBack={true}
          rightIcon="settings-outline"
          onRightPress={() => navigation.navigate("Settings")}
        />

        {/* AVATAR SECTION */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require("../../../assets/images/avatar.png")}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.userName}>{name}</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={14} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={styles.infoText}>{email || "john.doe@example.com"}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={14} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={styles.infoText}>{phone || "+91 98765 43210"}</Text>
          </View>

        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LAST LOGIN</Text>
            <Text style={styles.statValue}>Today, 10:30 AM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL VISITS</Text>
            <Text style={[styles.statValue, { fontSize: 22, color: "#1D4ED8" }]}>48</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>JOINING DATE</Text>
            <Text style={styles.statValue} numberOfLines={2}>{joiningDate || "—"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ZONE</Text>
            <Text style={styles.statValue} numberOfLines={2}>{zone || "—"}</Text>
          </View>
        </View>

        {/* ACCOUNT SETTINGS */}
        <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>

        <View style={styles.menuContainer}>
          {menuItem("person-outline", "Edit Profile", "Update your personal details", () =>
            navigation.navigate("EditProfile")
          )}
          {menuItem("lock-closed-outline", "Change Password", "Update your personal details", () =>
            navigation.navigate("ChangePassword")
          )}
          {/* {menuItem("notifications-outline", "Notification Preferences", "Update your personal details", () =>
            navigation.navigate("NotificationPreferences")
          )}
          {menuItem("help-circle-outline", "Help & Support", "Update your personal details", () =>
            navigation.navigate("HelpSupport")
          )} */}
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* VERSION */}
        <Text style={styles.versionText}>APP VERSION 2.4.1 (STABLE)</Text>
      </ScrollView>

      {/* BOTTOM NAV */}
        <BottomNavBar />
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function menuItem(icon: string, title: string, subtitle: string, onPress: () => void) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconBox}>
        <Ionicons name={icon} size={20} color="#6B7280" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: { marginTop: 16, color: "#6B7280", fontSize: 16 },

  // Avatar
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3B5BDB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  infoText: { fontSize: 13, color: "#6B7280" },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 20,
    marginBottom: 24,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginBottom: 6, letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Section
  sectionTitle: {
    marginLeft: 20,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },

  // Menu
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  menuTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  menuSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    marginBottom: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },

  // Version
  versionText: { textAlign: "center", fontSize: 11, color: "#D1D5DB", marginBottom: 10 },

  // Bottom Nav
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  navItem: { alignItems: "center", justifyContent: "center" },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F97316",
    marginTop: 3,
  },
});