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
  // add these two lines near your other state
const [savedPrincipal, setSavedPrincipal] = useState("");
const [savedPhone, setSavedPhone]         = useState("");
const [savedEmail, setSavedEmail]         = useState("");
const [saving, setSaving] = useState(false);
const [errors, setErrors] = useState({
  phone: "",
  altPhone: "",
  email: "",
});
const [altPhone, setAltPhone] = useState("");
const [savedAltPhone, setSavedAltPhone] = useState("");

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

    const [detailRes, programsRes] = await Promise.all([
      getSchoolDetail(currentSchool.id),
      getSchoolPrograms(currentSchool.id),
    ]);

    // ── School detail ─────────────────────────
    if (detailRes?.success) {
      const data = detailRes.data;
      setSchoolData(data);

      const contact = data?.school_contact || {};

      setPrincipalName(contact.principal_name || "");
      setPhone(contact.principal_phone || "");
      setAltPhone(contact.principal_alt_phone || ""); // ✅ FIXED
      setEmail(contact.principal_email || "");
    } else {
      Alert.alert("Error", detailRes?.message || "Failed to load school");
    }

    // ── Programs merge ────────────────────────
    if (programsRes?.success && programsRes?.data?.length) {
      const detailPrograms = detailRes?.data?.programs || [];

      const merged = programsRes.data.map((sp: any) => {
        const contact =
          detailPrograms.find(
            (dp: any) =>
              dp.program_id === sp.id ||
              dp.program_name === sp.program_name
          ) || {};

        return {
          id: sp.id,
          program_id: sp.program_id,
          program_name: sp.program_name,
          status: sp.status,
          program: sp.program,

          headmaster_name: contact.headmaster_name || null,
          headmaster_phone: contact.headmaster_phone || null,
          headmaster_email: contact.headmaster_email || null,
          coordinator_name: contact.coordinator_name || null,
          coordinator_phone: contact.coordinator_phone || null,
          coordinator_email: contact.coordinator_email || null,
        };
      });

      setPrograms(merged);
    } else {
      setPrograms(detailRes?.data?.programs || []);
    }
  } catch (e) {
    Alert.alert("Error", "Something went wrong");
  } finally {
    setLoading(false);
  }
};

 const handleSave = async () => {
  const newErrors = { phone: "", altPhone: "", email: "" };

  if (phone && !isValidPhone(phone)) {
    newErrors.phone = "Enter a valid 10-digit mobile number";
  }

  if (altPhone && !isValidPhone(altPhone)) {
    newErrors.altPhone = "Enter a valid alternate number";
  }

  // optional: prevent same number
  if (phone && altPhone && phone === altPhone) {
    newErrors.altPhone = "Alternate number must be different";
  }

  if (email && !isValidEmail(email)) {
    newErrors.email = "Enter a valid email address";
  }

  if (newErrors.phone || newErrors.altPhone || newErrors.email) {
    setErrors(newErrors);
    return;
  }

  setErrors({ phone: "", altPhone: "", email: "" });

  try {
    setSaving(true);

    const res = await updateContact(currentSchool!.id, "principal", {
      person_name: principalName,
      phone,
      alt_phone: altPhone, // ✅ INCLUDED
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
  } finally {
    setSaving(false);
  }
};

const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

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
          {infoRow("VE Code", schoolData?.ve_code)}
          {infoRow("Address", schoolData?.address)}
          <View style={styles.divider} />
          <Text style={styles.note}>School master information cannot be edited.</Text>
        </View>

        {/* PRINCIPAL */}
        {/* PRINCIPAL */}
<View style={styles.card}>
  <View style={styles.principalHeader}>
    <Text style={styles.title}>PRINCIPAL DETAILS</Text>
    {!editMode && (
      <View style={styles.verifiedBadge}>
        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
        <Text style={styles.verifiedText}>Verified</Text>
      </View>
    )}
  </View>

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
{errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

<Text style={styles.label}>Alternate Phone</Text>
<TextInput
  style={[styles.input, editMode && styles.inputActive]}
  value={altPhone}
  editable={editMode}
  onChangeText={setAltPhone}
  keyboardType="phone-pad"
/>
{errors.altPhone ? <Text style={styles.errorText}>{errors.altPhone}</Text> : null}


  <Text style={styles.label}>Email</Text>
  <TextInput
    style={[styles.input, editMode && styles.inputActive]}
    value={email}
    editable={editMode}
    onChangeText={setEmail}
    keyboardType="email-address"
  />
{errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

  <View style={styles.actionBtnRow}>
  {/* Confirm — active only when in edit mode */}
 <TouchableOpacity
  style={[styles.confirmBtn, (!editMode || saving) && styles.confirmBtnDisabled]}
  onPress={editMode && !saving ? handleSave : undefined}
  disabled={!editMode || saving}
>
  {saving ? (
    <ActivityIndicator size="small" color="#9CA3AF" />
  ) : (
    <Ionicons name="checkmark-circle-outline" size={16} color={editMode ? "#fff" : "#9CA3AF"} />
  )}
  <Text style={[styles.confirmBtnText, (!editMode || saving) && styles.confirmBtnTextDisabled]}>
    {saving ? "Saving..." : "Confirm"}
  </Text>
</TouchableOpacity>

  {/* Edit / Cancel — always visible, label + style toggles */}
  <TouchableOpacity
    style={[styles.editBtn, editMode && styles.cancelBtn]}
onPress={() => {
  if (editMode) {
    // CANCEL
    setPrincipalName(savedPrincipal);
    setPhone(savedPhone);
    setAltPhone(savedAltPhone);   // ✅ FIX
    setEmail(savedEmail);

    setErrors({ phone: "", altPhone: "", email: "" }); // ✅ FIX
    setEditMode(false);
  } else {
    // ENTER EDIT
    setSavedPrincipal(principalName);
    setSavedPhone(phone);
    setSavedAltPhone(altPhone);   // ✅ FIX
    setSavedEmail(email);

    setEditMode(true);
  }
}}
  >
    <Ionicons
      name={editMode ? "close-circle-outline" : "create-outline"}
      size={16}
      color={editMode ? "#EF4444" : "#F97316"}
    />
    <Text style={[{ fontWeight: "700", marginLeft: 5 }, editMode ? styles.cancelBtnText : { color: "#F97316" }]}>
      {editMode ? "Cancel" : "Edit Details"}
    </Text>
  </TouchableOpacity>
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
  <View
    key={String(p.id ?? i)}
    style={styles.programCard}
  >
    <View style={[styles.programIcon, { backgroundColor: colors.bg }]}>
      <Text style={[styles.programIconText, { color: colors.text }]}>{short}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.programName}>{p.program_name || p.program?.name}</Text>
     <Text style={styles.programMeta}>
  {p.program?.duration_years
    ? ` · ${p.program.duration_years} ${
        p.program.duration_years === 1 ? "year" : "years"
      }`
    : ""}
</Text>
    </View>
  </View>
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

  editBtn: { 
  flex: 1,                    // ← add this
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  backgroundColor: "#FFEAD5", 
  padding: 12, 
  borderRadius: 10, 
},
  saveBtn: { backgroundColor: "#F97316", padding: 12, borderRadius: 10, alignItems: "center" },

  programHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  activeBadge:    { backgroundColor: "#FFEAD5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeText:     { color: "#F97316", fontSize: 12, fontWeight: "600" },

  programCard:     { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, marginBottom: 10 },
  programIcon:     { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginRight: 10 },
  programIconText: { fontWeight: "700" },
  programName:     { fontWeight: "600", marginBottom: 2 },
  programMeta:     { fontSize: 12, color: "#6B7280" },
  principalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},
verifiedBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "#DCFCE7",
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 20,
},
verifiedText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#16A34A",
},
actionBtnRow: {
  flexDirection: "row",
  gap: 10,
  marginTop: 14,
},
confirmBtn: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  backgroundColor: "#F97316",
  padding: 12,
  borderRadius: 10,
},
errorText: {
  color: "#DC2626",
  fontSize: 11,
  marginTop: 4,
  marginLeft: 2,
},
confirmBtnDisabled: {
  backgroundColor: "#F3F4F6",
  borderWidth: 1,
  borderColor: "#E5E7EB",
},
confirmBtnText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
},
confirmBtnTextDisabled: {
  color: "#9CA3AF",
},
cancelBtn: {
  backgroundColor: "#FEF2F2",
  borderWidth: 1,
  borderColor: "#FECACA",
},
cancelBtnText: {
  color: "#EF4444",
},
});