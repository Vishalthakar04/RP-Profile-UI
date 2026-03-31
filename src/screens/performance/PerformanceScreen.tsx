import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";

const smallCards = [
  { label: "Detail Verification", value: "85%", subtitle: "12/15 schools", status: "good" },
  { label: "School Visit", value: "45%", subtitle: "9/20 schools", status: "avg" },
];

export default function PerformanceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Performance Meter</Text>
          <Text style={styles.headerSubText}>Updated: Today</Text>
        </View>

        <View style={styles.cardPrimary}>
          <View style={styles.cardPrimaryRow}>
            <View>
              <Text style={styles.cardPrimaryLabel}>OVERALL PERFORMANCE</Text>
              <Text style={styles.cardPrimaryValue}>78%</Text>
              <View style={styles.progressBackground}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.cardPrimaryTimestamp}>Updated: Today, 09:45 AM</Text>
            </View>
            <View style={styles.deltaBox}>
              <Text style={styles.deltaText}>+5.2%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>KEY PERFORMANCE INDICATORS</Text>
        <View style={styles.grid}>
          {smallCards.map((item) => (
            <View key={item.label} style={styles.smallCard}>
              <View style={[styles.gaugeBase, item.status === "good" ? styles.gaugeGood : styles.gaugeAvg]}>
                <View style={[styles.needle, item.status === "good" ? styles.needleGood : styles.needleAvg, { transform: [{ rotate: `${(parseInt(item.value) / 100) * 180 - 90}deg` }] }]} />
              </View>
              <View style={styles.tickLabels}>
                <Text style={styles.tickText}>0</Text>
                <Text style={styles.tickText}>50</Text>
                <Text style={styles.tickText}>100</Text>
              </View>
              <Text style={[styles.circleValue, item.status === "good" ? styles.circleGoodText : styles.circleAvgText]}>{item.value}</Text>
              <Text style={styles.smallCardLabel}>{item.label}</Text>
              <Text style={styles.smallCardSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailGaugeWrapper}>
            <View style={styles.detailGauge}>
              <View style={[styles.detailNeedle, { transform: [{ rotate: `${(20 / 100) * 180 - 90}deg` }] }]} />
            </View>
            <View style={styles.detailTickLabels}>
              <Text style={styles.detailTickText}>0</Text>
              <Text style={styles.detailTickText}>50</Text>
              <Text style={styles.detailTickText}>100</Text>
            </View>
            <Text style={styles.detailCircleValue}>20%</Text>
          </View>
          <View style={styles.detailTextWrapper}>
            <Text style={styles.detailTitle}>Classes Observed</Text>
            <Text style={styles.detailSubtitle}>4 out of 20 scheduled observations completed this week.</Text>
            <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>Action Required</Text></View>
          </View>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
            <Text style={styles.legendText}>CRITICAL (0-29%)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
            <Text style={styles.legendText}>AVERAGE (30-59%)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
            <Text style={styles.legendText}>GOOD (60-100%)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  contentContainer: { padding: 16, paddingBottom: 100 },

  headerRow: { marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#0F172A" },
  headerSubText: { marginTop: 4, color: "#6B7280", fontSize: 14 },

  cardPrimary: {
    backgroundColor: "#F59E0B",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardPrimaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrimaryLabel: { color: "#FEF3C7", fontSize: 12, letterSpacing: 1, marginBottom: 6 },
  cardPrimaryValue: { color: "#fff", fontSize: 56, fontWeight: "800" },
  progressBackground: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#374151",
    marginTop: 8,
    width: 180,
    overflow: "hidden",
  },
  progressFill: { width: "78%", height: "100%", backgroundColor: "#EF4444" },
  cardPrimaryTimestamp: { marginTop: 8, color: "#FEF3C7", fontSize: 12 },
  deltaBox: { backgroundColor: "#D97706", borderRadius: 18, paddingVertical: 4, paddingHorizontal: 10 },
  deltaText: { color: "#fff", fontSize: 12 },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  smallCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gaugeBase: {
    width: 64,
    height: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 2,
    borderColor: "#ccc",
    borderBottomWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  gaugeGood: { backgroundColor: "#DBF9EC" },
  gaugeAvg: { backgroundColor: "#FEF3C7" },
  needle: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: 2,
    height: 16,
    marginLeft: -1,
  },
  needleGood: { backgroundColor: "#10B981" },
  needleAvg: { backgroundColor: "#EA580C" },
  tickLabels: { flexDirection: "row", justifyContent: "space-between", width: 64, marginBottom: 4 },
  tickText: { fontSize: 10, color: "#6B7280" },
  circleValue: { fontSize: 18, fontWeight: "700" },
  circleGoodText: { color: "#10B981" },
  circleAvgText: { color: "#EA580C" },
  smallCardLabel: { fontWeight: "700", color: "#0F172A", marginBottom: 3 },
  smallCardSubtitle: { color: "#6B7280", fontSize: 12 },

  detailCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  detailGaugeWrapper: { justifyContent: "center", alignItems: "center", marginRight: 12 },
  detailGauge: {
    width: 60,
    height: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 4,
    borderColor: "#F87171",
    borderBottomWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  detailNeedle: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    width: 2,
    height: 15,
    backgroundColor: "#EF4444",
    marginLeft: -1,
  },
  detailTickLabels: { flexDirection: "row", justifyContent: "space-between", width: 60, marginTop: 4 },
  detailTickText: { fontSize: 10, color: "#6B7280" },
  detailCircleValue: { fontSize: 18, fontWeight: "700", color: "#EF4444", marginTop: 4 },
  detailTextWrapper: { flex: 1 },
  detailTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  detailSubtitle: { color: "#6B7280", marginTop: 3, marginBottom: 8 },
  actionBadge: { backgroundColor: "#FEE2E2", padding: 6, borderRadius: 8, alignSelf: "flex-start" },
  actionBadgeText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },

  legendContainer: { marginTop: 16, borderTopWidth: 1, borderColor: "#E5E7EB", paddingTop: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { color: "#6B7280", fontSize: 12, textTransform: "uppercase" },
});
