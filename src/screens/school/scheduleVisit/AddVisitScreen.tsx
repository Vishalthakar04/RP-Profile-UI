import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import {
  getAssignedSchools,
  createVisitSchedule,
} from "../../../services/schedulevisit";

export default function AddVisitScreen() {
  const navigation = useNavigation<any>();

  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(30);
  const [period, setPeriod] = useState("AM");

  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const res = await getAssignedSchools();
      if (res?.success) {
        setSchools(res.data || []);
      }
    } catch (error) {
      console.error("School load error:", error);
    }
  };

  // 🔥 SAVE API
  const handleSave = async () => {
    if (!selectedSchool) {
      Alert.alert("Error", "Please select a school");
      return;
    }

    try {
      setLoading(true);

      // convert time
      let finalHour = hour;
      if (period === "PM" && hour < 12) finalHour += 12;
      if (period === "AM" && hour === 12) finalHour = 0;

      const visitDate = new Date(date);
      visitDate.setHours(finalHour);
      visitDate.setMinutes(minute);

      const payload = {
        school_id: selectedSchool.id,
        visit_date: visitDate.toISOString(),
        remarks,
      };

      console.log("PAYLOAD:", payload);

      const res = await createVisitSchedule(payload);

      if (res?.success) {
        Alert.alert("Success", "Visit Scheduled Successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", res?.message || "Failed");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // 📅 Simple Date Format
  const formatDate = () => {
    return date.toDateString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f6f8" }}>
      <ScrollView style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Add New Visit</Text>
        </View>

        {/* SCHOOL */}
        <Text style={styles.label}>School Name</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {schools.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.schoolChip,
                selectedSchool?.id === item.id && styles.selectedChip,
              ]}
              onPress={() => setSelectedSchool(item)}
            >
              <Text
                style={{
                  color:
                    selectedSchool?.id === item.id ? "#fff" : "#000",
                }}
              >
                {item.school_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.note}>
          Note: Cannot schedule duplicate visits same day
        </Text>

        {/* DATE */}
        <Text style={styles.label}>Visit Date</Text>

        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => {
            // you can integrate date picker later
            setDate(new Date());
          }}
        >
          <Text>{formatDate()}</Text>
        </TouchableOpacity>

        {/* TIME */}
        <Text style={styles.label}>Visit Time</Text>

        <View style={styles.timeBox}>
          {/* Hour */}
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>HOUR</Text>

            <TouchableOpacity onPress={() => setHour((h) => (h === 12 ? 1 : h + 1))}>
              <Ionicons name="chevron-up" size={20} />
            </TouchableOpacity>

            <Text style={styles.timeValue}>{hour}</Text>

            <TouchableOpacity onPress={() => setHour((h) => (h === 1 ? 12 : h - 1))}>
              <Ionicons name="chevron-down" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 20 }}>:</Text>

          {/* Minute */}
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>MIN</Text>

            <TouchableOpacity onPress={() => setMinute((m) => (m + 5) % 60)}>
              <Ionicons name="chevron-up" size={20} />
            </TouchableOpacity>

            <Text style={styles.timeValue}>{minute}</Text>

            <TouchableOpacity onPress={() => setMinute((m) => (m - 5 + 60) % 60)}>
              <Ionicons name="chevron-down" size={20} />
            </TouchableOpacity>
          </View>

          {/* AM PM */}
          <View style={{ marginLeft: 15 }}>
            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === "AM" && styles.activePeriod,
              ]}
              onPress={() => setPeriod("AM")}
            >
              <Text>AM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === "PM" && styles.activePeriod,
              ]}
              onPress={() => setPeriod("PM")}
            >
              <Text>PM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* REMARKS */}
        <Text style={styles.label}>Remarks (Optional)</Text>

        <TextInput
          style={styles.input}
          placeholder="Add notes..."
          multiline
          value={remarks}
          onChangeText={setRemarks}
        />
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff" }}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ───────────────── STYLES ─────────────────

const styles = StyleSheet.create({
  container: { padding: 15 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },

  label: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },

  schoolChip: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginRight: 10,
  },

  selectedChip: {
    backgroundColor: "#f97316",
  },

  note: {
    fontSize: 12,
    color: "#777",
    marginVertical: 10,
  },

  dateBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
  },

  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
  },

  timeItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },

  timeLabel: {
    fontSize: 10,
    color: "#777",
  },

  timeValue: {
    fontSize: 20,
    fontWeight: "bold",
  },

  periodBtn: {
    padding: 8,
    backgroundColor: "#eee",
    borderRadius: 6,
    marginBottom: 5,
  },

  activePeriod: {
    backgroundColor: "#f97316",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
  },

  footer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
  },

  cancelBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },

  saveBtn: {
    flex: 2,
    padding: 12,
    backgroundColor: "#f97316",
    borderRadius: 8,
    alignItems: "center",
  },
});