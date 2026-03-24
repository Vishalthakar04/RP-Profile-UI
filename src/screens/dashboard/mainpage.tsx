// src/screens/tabs/dashboard.tsx

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
} from "react-native";

import { fetchProfile } from "../../services/profile";
import { getAssignedSchools } from "../../services/school";
import BottomNavBar from "../../components/BottomNavbar";

export default function Dashboard() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const formatted = `${now.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })} • ${now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;

      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      const profileRes = await fetchProfile();

      if (profileRes?.success && profileRes?.data) {
        const { first_name = "", last_name = "" } = profileRes.data;
        const fullName = `${first_name} ${last_name}`.trim();
        setName(fullName || "User");
      }

      const schoolRes = await getAssignedSchools();

      if (schoolRes?.success) {
        setSchools(schoolRes.data || []);
      }
    } catch (error: any) {
      if (error?.message?.includes("401")) {
        await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
        navigation.replace("Login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Text style={styles.dateText}>{currentTime}</Text>
            <View style={styles.activeBadge}>
              <Ionicons name="location-outline" size={14} color="#16A34A" />
              <Text style={styles.activeText}> ACTIVE</Text>
            </View>
          </View>
          <Ionicons name="notifications" size={22} color="#F97316" />
        </View>

        {/* PROFILE */}
        <View style={styles.profileRow}>
          <View style={styles.avatarBorder}>
            <Image
              source={require("../../../assets/images/avatar.png")}
              style={styles.avatar}
            />
          </View>
          <View>
            <Text style={styles.hello}>Hello, {name || "User"}</Text>
            <Text style={styles.role}>Resource Person</Text>
          </View>
        </View>

        {/* INSPIRATION */}
        <View style={styles.inspirationCard}>
          <Text style={styles.inspirationTitle}>DAILY INSPIRATION</Text>
          <Text style={styles.quote}>
            "Education is the most powerful weapon which you can use to change the world."
          </Text>
          <Text style={styles.author}>— Nelson Mandela</Text>
        </View>

        {/* QUICK ACCESS */}
        <Text style={styles.sectionTitle}>QUICK ACCESS</Text>

        <View style={styles.grid}>
          {/* Schools */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Schools")}
          >
            <MaterialIcons name="school" size={28} color="#F97316" />
            <Text style={styles.quickText}>Schools</Text>
          </TouchableOpacity>

          {/* 🔥 Schedule Visit (ADDED NAVIGATION) */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("VisitSchedule")}
          >
            <MaterialIcons name="event" size={28} color="#F97316" />
            <Text style={styles.quickText}>Schedule Visit</Text>
          </TouchableOpacity>

          {/* Expense */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Expense")}
          >
            <MaterialIcons name="payments" size={28} color="#F97316" />
            <Text style={styles.quickText}>Expense</Text>
          </TouchableOpacity>

          {/* Leave */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Leave")}
          >
            <MaterialIcons name="event-busy" size={28} color="#F97316" />
            <Text style={styles.quickText}>Leave</Text>
          </TouchableOpacity>

          {/* Reports */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <MaterialIcons name="description" size={28} color="#F97316" />
            <Text style={styles.quickText}>Reports</Text>
          </TouchableOpacity>

          {/* Performance */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Performance")}
          >
            <MaterialIcons name="trending-up" size={28} color="#F97316" />
            <Text style={styles.quickText}>Performance</Text>
          </TouchableOpacity>
        </View>

        {/* ALERTS */}
        <Text style={styles.sectionTitle}>ALERTS & ACTIONS</Text>

        <View style={[styles.alertCard, { borderLeftColor: "#F97316" }]}>
          <View style={[styles.iconBox, { backgroundColor: "#F9731620" }]}>
            <MaterialIcons name="school" size={24} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Total Schools Assigned</Text>
            <Text style={styles.alertSub}>Across all zones</Text>
          </View>
          <Text style={[styles.alertCount, { color: "#F97316" }]}>
            {schools.length}
          </Text>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNavBar />
    </View>
  );
}

// ── STYLES (same as yours) ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: { marginTop: 16, color: "#6B7280", fontSize: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 40 },
  topLeft: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 12, color: "#6B7280", marginRight: 10 },
  activeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeText: { fontSize: 10, color: "#16A34A", fontWeight: "600" },
  profileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginTop: 20, marginBottom: 20 },
  avatarBorder: { borderWidth: 3, borderColor: "#F97316", borderRadius: 40, padding: 2, marginRight: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  hello: { fontSize: 22, fontWeight: "700" },
  role: { color: "#6B7280" },
  inspirationCard: { backgroundColor: "#F97316", marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 25 },
  inspirationTitle: { color: "#FFEAD5", fontSize: 12, marginBottom: 10 },
  quote: { color: "#fff", fontStyle: "italic", lineHeight: 22 },
  author: { color: "#fff", textAlign: "right", marginTop: 10 },
  sectionTitle: { marginLeft: 20, marginBottom: 10, fontWeight: "600", color: "#6B7280" },
  alertCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 20, padding: 15, borderRadius: 16, marginBottom: 15, borderLeftWidth: 4 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  alertTitle: { fontWeight: "600" },
  alertSub: { color: "#6B7280", fontSize: 12 },
  alertCount: { fontWeight: "700", fontSize: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 25 },
  quickCard: { width: "30%", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 22, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  quickText: { marginTop: 8, fontSize: 12, textAlign: "center" },
});