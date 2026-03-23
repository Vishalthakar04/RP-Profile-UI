// src/screens/school/SchoolDetails.tsx

import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";

import AppHeader from "../../../components/AppHeader";
import { useVisit } from "../../../context/VisitContext";

import {
  getSchoolDetail,
  getSchoolPrograms,
  updateContact,
} from "../../../services/school";

export default function SchoolDetails() {
  const navigation = useNavigation<any>();
  const { currentSchool } = useVisit();

  const [loading, setLoading]     = useState(true);
  const [schoolData, setSchoolData] = useState<any>(null);

  // programs from getSchoolPrograms — has program_id + contact info merged
  const [programs, setPrograms]   = useState<any[]>([]);

  const [editMode, setEditMode]   = useState(false);
  const [principalName, setPrincipalName] = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!currentSchool?.id) {
      Alert.alert("Error", "School ID missing");
      return;
    }

    try {
      setLoading(true);

      // Run both in parallel
      const [detailRes, programsRes] = await Promise.all([
        getSchoolDetail(currentSchool.id),
        getSchoolPrograms(currentSchool.id),
      ]);

      // ── School detail ──────────────────────────────────────────────────────
      if (detailRes?.success) {
        const data = detailRes.data;
        setSchoolData(data);

        const contact = data?.school_contact || {};
        setPrincipalName(contact.principal_name || "");
        setPhone(contact.principal_phone || "");
        setEmail(contact.principal_email || "");
      } else {
        Alert.alert("Error", detailRes?.message || "Failed to load school");
      }

      // ── Programs ───────────────────────────────────────────────────────────
      // getSchoolPrograms returns:
      // [{ id, program_id, program_name, status, program: { id, name, type, duration_years } }]
      // getSchoolDetail returns programs as programContacts (headmaster/coordinator)
      // Merge both so ProgramDetails gets everything it needs
      if (programsRes?.success && programsRes?.data?.length) {
        const detailPrograms = detailRes?.data?.programs || [];

        const merged = programsRes.data.map((sp: any) => {
          // find matching contact info from detail response
          const contact = detailPrograms.find((dp: any) => dp.program_id === sp.id || dp.program_name === sp.program_name) || {};
          return {
            // from getSchoolPrograms — has program_id (UUID for levels API)
            id:           sp.id,              // SchoolProgram id (used as cid in updateContact)
            program_id:   sp.program_id,      // FK integer
            program_name: sp.program_name,
            status:       sp.status,
            program:      sp.program,         // { id (UUID), name, type, duration_years }
            // from getSchoolDetail programs (contact info)
            headmaster_name:    contact.headmaster_name    || null,
            headmaster_phone:   contact.headmaster_phone   || null,
            headmaster_email:   contact.headmaster_email   || null,
            coordinator_name:   contact.coordinator_name   || null,
            coordinator_phone:  contact.coordinator_phone  || null,
            coordinator_email:  contact.coordinator_email  || null,
          };
        });

        console.log("Merged programs:", JSON.stringify(merged));
        setPrograms(merged);
      } else {
        // fallback to programs from detail response
        setPrograms(detailRes?.data?.programs || []);
      }

    } catch (e) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await updateContact(currentSchool!.id, "principal", {
        person_name: principalName,
        phone,
        email,
      });

      if (res?.success) {
        Alert.alert("Success", "Updated");
        setEditMode(false);
      } else {
        Alert.alert("Error", res?.message || "Failed");
      }
    } catch (e) {
      Alert.alert("Error", "Update failed");
    }
  };

  const getProgramStyle = (name: string) => {
    const n = name?.toLowerCase() || "";
    if (n.includes("acp") || n.includes("advanced"))  return { bg: "#FFEAD5", text: "#F97316" };
    if (n.includes("foundational"))                    return { bg: "#E0ECFF", text: "#2563EB" };
    if (n.includes("stem"))                            return { bg: "#EFE1FF", text: "#7C3AED" };
    return { bg: "#F3F4F6", text: "#374151" };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="School Details" />

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* HEADER */}
        <View style={styles.schoolHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="school" size={24} color="#F97316" />
          </View>
          <View>
            <Text style={styles.name}>{currentSchool?.name}</Text>
          </View>
        </View>

        {/* SCHOOL INFO */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>SCHOOL INFORMATION</Text>
            <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
          </View>
          {infoRow("Full Registered Name", schoolData?.school_name)}
          {infoRow("Master ID Number", schoolData?.id)}
          {infoRow("Address", schoolData?.address)}
          <View style={styles.divider} />
          <Text style={styles.note}>School master information cannot be edited.</Text>
        </View>

        {/* PRINCIPAL */}
        <View style={styles.card}>
          <Text style={styles.title}>PRINCIPAL DETAILS</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, editMode && styles.inputActive]}
            value={principalName}
            editable={editMode}
            onChangeText={setPrincipalName}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, editMode && styles.inputActive]}
            value={phone}
            editable={editMode}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, editMode && styles.inputActive]}
            value={email}
            editable={editMode}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <View style={{ marginTop: 10 }}>
            {editMode ? (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                <Text style={{ color: "#F97316", fontWeight: "700" }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PROGRAMS */}
        <View style={styles.card}>
          <View style={styles.programHeader}>
            <Text style={styles.title}>Programs Running</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>{programs.length} Active</Text>
            </View>
          </View>

          {programs.length ? (
            programs.map((p: any, i: number) => {
              const short = p.program?.name?.substring(0, 3).toUpperCase()
                ?? p.program_name?.substring(0, 3).toUpperCase()
                ?? "PRG";
              const colors = getProgramStyle(p.program_name || p.program?.name || "");

             return (
  <TouchableOpacity
    key={String(p.id ?? i)}
    style={styles.programCard}
    onPress={() =>
      navigation.navigate("ProgramDetails", {
        program:    p,
        schoolId:   currentSchool?.id,
        schoolName: currentSchool?.name,
      })
    }
  >
    <View style={[styles.programIcon, { backgroundColor: colors.bg }]}>
      <Text style={[styles.programIconText, { color: colors.text }]}>{short}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.programName}>{p.program_name || p.program?.name}</Text>
      <Text style={styles.programMeta}>
        {p.program?.type ?? ""}{p.program?.duration_years ? ` · ${p.program.duration_years} yrs` : ""}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);
            })
          ) : (
            <Text style={{ color: "#9CA3AF" }}>No programs available</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const infoRow = (label: string, value: string) => (
  <View style={{ marginBottom: 12 }} key={label}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "N/A"}</Text>
  </View>
);

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  schoolHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  iconBox:      { backgroundColor: "#FFEAD5", padding: 12, borderRadius: 12, marginRight: 10 },
  name:         { fontWeight: "700", fontSize: 18 },

  infoCard:   { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 15, marginBottom: 20 },
  infoHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  infoTitle:  { fontWeight: "700", color: "#374151" },
  infoLabel:  { color: "#6B7280", fontSize: 12 },
  infoValue:  { fontWeight: "600", marginTop: 2 },
  divider:    { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  note:       { fontSize: 12, color: "#9CA3AF" },

  card:  { backgroundColor: "#fff", padding: 15, borderRadius: 14, marginBottom: 20 },
  title: { fontWeight: "700", marginBottom: 10, fontSize: 14, color: "#374151" },
  label: { marginTop: 10, color: "#6B7280", fontSize: 12 },

  input: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 10,
    marginTop: 5,
    color: "#111827",
  },
  inputActive: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#F97316",
  },

  editBtn: { backgroundColor: "#FFEAD5", padding: 12, borderRadius: 10, alignItems: "center" },
  saveBtn: { backgroundColor: "#F97316", padding: 12, borderRadius: 10, alignItems: "center" },

  programHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  activeBadge:    { backgroundColor: "#FFEAD5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeText:     { color: "#F97316", fontSize: 12, fontWeight: "600" },

  programCard:     { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, marginBottom: 10 },
  programIcon:     { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginRight: 10 },
  programIconText: { fontWeight: "700" },
  programName:     { fontWeight: "600", marginBottom: 2 },
  programMeta:     { fontSize: 12, color: "#6B7280" },
});