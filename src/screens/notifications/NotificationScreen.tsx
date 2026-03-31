import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const notifications = [
  {
    id: "1",
    title: "New visit assigned: Green Valley High",
    subtitle: "Scheduled for Oct 24, 2023 · 10 minutes ago",
    type: "Admin Alerts",
    icon: "school",
    variants: "new",
  },
  {
    id: "2",
    title: "Profile completion required",
    subtitle: "Update your credentials to maintain access · 45 minutes ago",
    type: "Admin Alerts",
    icon: "person",
    variants: "new",
  },
  {
    id: "3",
    title: "Expense report #123 approved",
    subtitle: "Processed by Finance Dept · 2 hours ago",
    type: "Earlier",
    icon: "receipt",
    variants: "approved",
  },
  {
    id: "4",
    title: "Monthly report submitted",
    subtitle: "Visit logs for September finalized · Yesterday",
    type: "Earlier",
    icon: "checkmark-circle",
    variants: "completed",
  },
  {
    id: "5",
    title: "System Maintenance Notice",
    subtitle: "Scheduled for Saturday, 10:00 PM · 2 days ago",
    type: "Earlier",
    icon: "information-circle",
    variants: "info",
  },
];

export default function NotificationScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.clearButtonContainer}>
          <Text style={styles.clearText}>Clear All</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <Text style={[styles.tabItem, styles.tabItemActive]}>Admin Alerts</Text>
        <Text style={styles.tabItem}>System Alerts</Text>
        <Text style={styles.tabItem}>Urgent Tasks</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>NEW</Text>
        {notifications.filter((n) => n.variants === "new").map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={18} color="#0845A7" />
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>EARLIER</Text>
        {notifications.filter((n) => n.variants !== "new").map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconCircleLight}>
                <Ionicons name={item.icon} size={18} color="#ffffff" />
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 4,
  },
  backButton: { width: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitle: { fontSize: 22, color: "#0f172a", fontWeight: "bold" },
  clearButtonContainer: { minWidth: 80, alignItems: "flex-end" },
  clearText: { color: "#2563eb", fontWeight: "600" },

  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  tabItem: { color: "#6B7280", fontWeight: "600" },
  tabItemActive: { color: "#0f172a", borderBottomWidth: 2, borderColor: "#0f172a", paddingBottom: 8 },

  content: { padding: 15, paddingBottom: 120 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#0f172a", marginBottom: 10 },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardLeft: { marginRight: 10 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FDDBC3",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleLight: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#D97706",
    justifyContent: "center",
    alignItems: "center",
  },
  cardRight: { flex: 1 },
  cardTitle: { fontWeight: "700", color: "#0f172a" },
  cardSubtitle: { color: "#64748b", marginTop: 4 },
});
