// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { updateSchoolProgram, getProgramLevels, getSchoolContacts } from "../../../services/school";

export default function ProgramDetails({ navigation, route }) {

  const program  = route?.params?.program;
  const schoolId = route?.params?.schoolId;

  const [editMode, setEditMode] = useState(false);

  const [headmasterName,  setHeadmasterName]  = useState("");
  const [headmasterPhone, setHeadmasterPhone] = useState("");
  const [headmasterEmail, setHeadmasterEmail] = useState("");

  const [coordName,  setCoordName]  = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [coordEmail, setCoordEmail] = useState("");

  // ── Levels from API ───────────────────────────────────────────────────────
  const [levels,        setLevels]        = useState([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  useEffect(() => {
    if (schoolId && program?.id) {
      loadContacts();
    }
  }, []);

  const loadContacts = async () => {
    try {
      const res = await getSchoolContacts(schoolId);
      if (res?.success && res.data?.program_specific?.length) {
        // Find the matching program by SchoolProgram id
        const match = res.data.program_specific.find(
          (p: any) => String(p.program_id) === String(program.id)
        );
        if (match) {
          setHeadmasterName(match.headmaster?.name   || "");
          setHeadmasterPhone(match.headmaster?.phone || "");
          setHeadmasterEmail(match.headmaster?.email || "");
          setCoordName(match.coordinator?.name       || "");
          setCoordPhone(match.coordinator?.phone     || "");
          setCoordEmail(match.coordinator?.email     || "");
          return;
        }
      }
      // Fallback to route params if API doesn't have data
      if (program) {
        setHeadmasterName(program.headmaster_name   || "");
        setHeadmasterPhone(program.headmaster_phone || "");
        setHeadmasterEmail(program.headmaster_email || "");
        setCoordName(program.coordinator_name       || "");
        setCoordPhone(program.coordinator_phone     || "");
        setCoordEmail(program.coordinator_email     || "");
      }
    } catch (e) {
      console.error("loadContacts error:", e);
    }
  };

  // ── Load levels on mount ──────────────────────────────────────────────────
  useEffect(() => {
    console.log("ProgramDetails → program object:", JSON.stringify(program));
    // program.program.id is the Program table UUID e.g. "5e2c4ef6-..."
    // This comes from getSchoolPrograms → sp.program.id
    const pid = program?.program?.id;
    console.log("ProgramDetails → calling getProgramLevels with:", pid);
    if (pid) {
      loadLevels(pid);
    } else {
      console.warn("program.program.id missing — check SchoolDetails passes full merged program object");
    }
  }, []);

  const loadLevels = async (programId) => {
    setLoadingLevels(true);
    try {
      const res = await getProgramLevels(programId);
      console.log("getProgramLevels res:", JSON.stringify(res));
      if (res.success && res.data?.levels?.length) {
        setLevels(res.data.levels);
      } else {
        setLevels([]);
      }
    } catch (e) {
      console.error("loadLevels error:", e);
      setLevels([]);
    }
    setLoadingLevels(false);
  };

  // ── Save contacts ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      // program.id is the SchoolProgram id
      const res = await updateSchoolProgram(schoolId, String(program.id), {
        headmaster_name:   headmasterName,
        headmaster_phone:  headmasterPhone,
        headmaster_email:  headmasterEmail,
        coordinator_name:  coordName,
        coordinator_phone: coordPhone,
        coordinator_email: coordEmail,
      });

      if (res?.success) {
        Alert.alert("Success", "Updated successfully");
        setEditMode(false);
      } else {
        Alert.alert("Error", res?.message || "Update failed");
      }
    } catch (e) {
      Alert.alert("Error", "Update failed");
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Program Details</Text>
          <Text style={styles.headerSubtitle}>
            {program?.program_name || "Program"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Text style={styles.editText}>{editMode ? "Preview" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADMASTER */}
        <Section title="Headmaster Details" icon="person" />
        <Card>
          <InputField label="NAME"  value={headmasterName}  onChange={setHeadmasterName}  editable={editMode} />
          <InputField label="PHONE" value={headmasterPhone} onChange={setHeadmasterPhone} editable={editMode} />
          <InputField label="EMAIL" value={headmasterEmail} onChange={setHeadmasterEmail} editable={editMode} />
        </Card>

        {/* COORDINATOR */}
        <Section title="Coordinator Details" icon="person-outline" />
        <Card>
          <InputField label="NAME"  value={coordName}  onChange={setCoordName}  editable={editMode} />
          <InputField label="PHONE" value={coordPhone} onChange={setCoordPhone} editable={editMode} />
          <InputField label="EMAIL" value={coordEmail} onChange={setCoordEmail} editable={editMode} />
        </Card>

        {/* SAVE */}
        {editMode && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        {/* LEVELS LIST */}
        <View style={styles.classHeader}>
          <Text style={styles.classTitle}>Levels</Text>
          {!loadingLevels && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{levels.length} Levels</Text>
            </View>
          )}
        </View>

        {loadingLevels ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#F97316" size="large" />
            <Text style={styles.loaderText}>Loading levels...</Text>
          </View>
        ) : levels.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="layers-outline" size={40} color="#E5E7EB" />
            <Text style={styles.emptyText}>No levels found for this program</Text>
          </View>
        ) : (
          levels.map((level, idx) => (
            <LevelCard
              key={String(level.id)}
              number={String(idx + 1)}
              title={level.name}
              totalUnits={level.total_units}
              moduleCount={level.modules?.length ?? 0}
              onPress={() =>
                navigation.navigate("SectionsManagement", {
                  levelName:    level.name,
                  levelId:      level.id,
                  schoolId,
                  schoolName:   route?.params?.schoolName,
                  programId:    program?.program?.id,    // Program UUID for getProgramLevels
                  programIntId: program?.program_id,     // integer FK for getTrainedTeachers
                  programName:  program?.program_name ?? program?.program?.name ?? "",
                })
              }
            />
          ))
        )}

      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Section({ title, icon }) {
  return (
    <View style={styles.sectionRow}>
      <MaterialIcons name={icon} size={22} color="#F97316" />
      <Text style={styles.section}>{title}</Text>
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function InputField({ label, value, onChange, editable }) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, editable && styles.inputActive]}
        value={value}
        editable={editable}
        onChangeText={onChange}
        placeholderTextColor="#9CA3AF"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </View>
  );
}

function LevelCard({ number, title, totalUnits, moduleCount, onPress }) {
  return (
    <TouchableOpacity style={styles.classCard} onPress={onPress}>
      <View style={styles.classNumber}>
        <Text style={styles.classNumText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.className}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {moduleCount > 0 && (
            <View style={styles.metaBadge}>
              <Ionicons name="book-outline" size={11} color="#F97316" />
              <Text style={styles.metaBadgeText}>{moduleCount} Modules</Text>
            </View>
          )}
          {totalUnits > 0 && (
            <View style={styles.metaBadge}>
              <Ionicons name="layers-outline" size={11} color="#6B7280" />
              <Text style={[styles.metaBadgeText, { color: "#6B7280" }]}>{totalUnits} Units</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  headerTitle:    { fontSize: 20, fontWeight: "700" },
  headerSubtitle: { color: "#6B7280", fontSize: 12 },
  editText:       { color: "#F97316", fontWeight: "700" },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },
  section: { fontSize: 18, fontWeight: "700", marginLeft: 8 },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
  },

  label: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    color: "#111827",
  },
  inputActive: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#F97316",
  },

  saveBtn: {
    backgroundColor: "#F97316",
    margin: 20,
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", marginLeft: 8 },

  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  classTitle: { fontSize: 18, fontWeight: "700" },
  badge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, color: "#374151" },

  loaderWrap: { alignItems: "center", paddingVertical: 32 },
  loaderText: { color: "#9CA3AF", marginTop: 8, fontSize: 13 },

  emptyWrap: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: "#9CA3AF", marginTop: 8, fontSize: 13 },

  classCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  classNumber: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FDE7D8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  classNumText: { color: "#F97316", fontWeight: "700" },
  className:    { fontWeight: "700", fontSize: 15, color: "#111827" },

  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaBadgeText: { fontSize: 11, color: "#F97316", fontWeight: "600" },
});