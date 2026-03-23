// src/components/SchoolBanner.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useVisit } from "../context/VisitContext";

export default function SchoolBanner() {
  const { currentSchool } = useVisit();

  if (!currentSchool) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSchoolText}>
          No School Selected
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        
        {/* ICON */}
        <View style={styles.iconBox}>
          <Ionicons name="school" size={22} color="#F97316" />
        </View>

        {/* SCHOOL INFO */}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {currentSchool.name}
          </Text>

          {/* <Text style={styles.id}>
            ID: {currentSchool.id}
          </Text> */}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FFEAD5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
  },

  id: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  noSchoolText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 10,
  },
});