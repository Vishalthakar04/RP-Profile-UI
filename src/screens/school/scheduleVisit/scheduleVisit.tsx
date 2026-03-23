import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import {
  getVisitSchedules,
  getUpcomingVisits,
} from "../../../services/scheduleVisit";

const VisitScheduleScreen = () => {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 🔥 API CALLS
      const upcomingRes = await getUpcomingVisits();
      const allRes = await getVisitSchedules(1, 10);

      console.log("UPCOMING:", upcomingRes);
      console.log("ALL:", allRes);

      if (upcomingRes?.success) {
        setUpcoming(upcomingRes.data || []);
      }

      if (allRes?.success) {
        setAllVisits(allRes.data?.visits || []);
      }
    } catch (error) {
      console.error("Visit Screen Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 📅 Format Date
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text>Loading visits...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Visit Schedule</Text>

        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* UPCOMING */}
      <Text style={styles.sectionTitle}>
        Upcoming Visits <Text style={styles.subText}>(Next 30 Days)</Text>
      </Text>

      {upcoming.length === 0 && (
        <Text style={{ color: "#777" }}>No upcoming visits</Text>
      )}

      {upcoming.map((item, index) => (
        <View
          key={index}
          style={[
            styles.card,
            { borderLeftColor: item.status === "today" ? "green" : "#3b82f6" },
          ]}
        >
          <Text style={styles.id}>ID: {item.visit_code}</Text>

          <Text style={styles.school}>
            {item.school_name || "School Name"}
          </Text>

          <Text style={styles.meta}>
            {formatDate(item.visit_date)}
          </Text>

          <Text style={styles.meta}>
            {item.district || ""} {item.zone ? `, ${item.zone}` : ""}
          </Text>

          <TouchableOpacity style={styles.viewBtn}>
            <Text>View Details →</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ALL VISITS */}
      <Text style={styles.sectionTitle}>All Scheduled Visits</Text>

      <View style={styles.table}>
        {allVisits.length === 0 && (
          <Text style={{ color: "#777" }}>No visits found</Text>
        )}

        {allVisits.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.date}>
              {formatDate(item.visit_date)}
            </Text>

            <View>
              <Text style={styles.school}>
                {item.school_name}
              </Text>
              <Text style={styles.small}>
                ID: {item.visit_code}
              </Text>
            </View>

            <Text>{item.district}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default VisitScheduleScreen;

// ───────────────── STYLES ─────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
    padding: 15,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  addBtn: {
    backgroundColor: "#f97316",
    padding: 10,
    borderRadius: 8,
  },

  addBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },

  subText: {
    color: "#777",
    fontSize: 12,
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
  },

  id: {
    color: "#f97316",
    fontWeight: "600",
  },

  school: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 5,
  },

  meta: {
    color: "#666",
    fontSize: 13,
  },

  viewBtn: {
    backgroundColor: "#f1f1f1",
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  table: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  date: {
    width: 110,
    fontSize: 12,
  },

  small: {
    fontSize: 12,
    color: "#888",
  },
});