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
import { getDashboardStats } from "../../services/school";
import BottomNavBar from "../../components/BottomNavbar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_schools_assigned: number;
  visits_completed: number;
  visits_pending: number;
  month_scheduled_visits: number;
  month: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
      console.log("Dashboard → access_token exists?", !!token);

      if (!token) {
        console.log("No access_token → redirecting to Login");
        navigation.replace("Login");
        return;
      }

      // Fetch profile and stats in parallel
      const [profileRes, statsRes] = await Promise.all([
        fetchProfile(),
        getDashboardStats(),
      ]);

      // Profile
      console.log("PROFILE RESPONSE:", profileRes);
      if (profileRes?.success && profileRes?.data) {
        const { first_name = "", last_name = "" } = profileRes.data;
        setName(`${first_name} ${last_name}`.trim() || "User");
        if (profileRes.data.phone_number)
          await AsyncStorage.setItem("user_phone", profileRes.data.phone_number);
        if (profileRes.data.rp_code)
          await AsyncStorage.setItem("rp_code", profileRes.data.rp_code);
      } else {
        console.warn("Profile fetch failed:", profileRes?.message);
      }

      // Dashboard stats
      console.log("STATS RESPONSE:", statsRes);
      if (statsRes?.success && statsRes?.data) {
        setStats(statsRes.data);
      } else {
        console.warn("Stats fetch failed:", statsRes?.message);
        setStats({
          total_schools_assigned: 0,
          visits_completed: 0,
          visits_pending: 0,
          month_scheduled_visits: 0,
          month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
        });
      }
    } catch (error: any) {
      console.error("Dashboard load error:", error);
      if (error?.message?.includes("401") || error?.message?.includes("token")) {
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
              <Ionicons name="location-outline" size={14} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")}> 
            <Ionicons name="notifications" size={22} color="#F97316" />
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Schools")}
          >
            <MaterialIcons name="school" size={28} color="#F97316" />
            <Text style={styles.quickText}>Schools</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("VisitSchedule")}
          >
            <MaterialIcons name="event" size={28} color="#F97316" />
            <Text style={styles.quickText}>Schedule Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("Expense")}
          >
            <MaterialIcons name="event" size={28} color="#F97316" />
            <Text style={styles.quickText}>Expense</Text>
          </TouchableOpacity>
          {quickItem("event-busy", "Leave")}
          {quickItem("description", "Reports", () => navigation.navigate("Reports"))}
          {quickItem("trending-up", "Performance", () => navigation.navigate("Performance"))}
        </View>

        {/* ALERTS & ACTIONS */}
        <Text style={styles.sectionTitle}>
          ALERTS & ACTIONS{stats?.month ? ` — ${stats.month}` : ""}
        </Text>

        {alertCard(
          "school",
          "#F97316",
          "Total Schools Assigned",
          "Active assignments",
          String(stats?.total_schools_assigned ?? 0)
        )}

        {alertCard(
          "check-circle",
          "#16A34A",
          "Visits Completed",
          "This month",
          String(stats?.visits_completed ?? 0)
        )}

        {alertCard(
          "pending-actions",
          "#EF4444",
          "Visits Pending",
          "Incomplete visits",
          String(stats?.visits_pending ?? 0)
        )}

        {alertCard(
          "event-note",
          "#6366F1",
          "Scheduled Visits",
          "This month",
          String(stats?.month_scheduled_visits ?? 0)
        )}
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNavBar />
    </View>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function alertCard(
  icon: string,
  color: string,
  title: string,
  sub: string,
  count: string
) {
  return (
    <View style={[styles.alertCard, { borderLeftColor: color }]} key={title}>
      <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertSub}>{sub}</Text>
      </View>
      <Text style={[styles.alertCount, { color }]}>{count}</Text>
    </View>
  );
}

function quickItem(icon: string, label: string, onPress?: () => void) {
  return (
    <TouchableOpacity style={styles.quickCard} key={label} onPress={onPress}>
      <MaterialIcons name={icon} size={28} color="#F97316" />
      <Text style={styles.quickText}>{label}</Text>
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 40,
  },
  topLeft: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 12, color: "#6B7280", marginRight: 10 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeText: { fontSize: 10, color: "#16A34A", fontWeight: "600" },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: "#F97316",
    borderRadius: 40,
    padding: 2,
    marginRight: 15,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  hello: { fontSize: 22, fontWeight: "700" },
  role: { color: "#6B7280" },
  inspirationCard: {
    backgroundColor: "#F97316",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  inspirationTitle: { color: "#FFEAD5", fontSize: 12, marginBottom: 10 },
  quote: { color: "#fff", fontStyle: "italic", lineHeight: 22 },
  author: { color: "#fff", textAlign: "right", marginTop: 10 },
  sectionTitle: { marginLeft: 20, marginBottom: 10, fontWeight: "600", color: "#6B7280" },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  alertTitle: { fontWeight: "600" },
  alertSub: { color: "#6B7280", fontSize: 12 },
  alertCount: { fontWeight: "700", fontSize: 18 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  quickText: { marginTop: 8, fontSize: 12, textAlign: "center" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
});