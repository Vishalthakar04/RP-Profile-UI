// SectionsManagement.tsx

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import AppHeader from "../../../components/AppHeader";
import {
  getSchoolSections,
  createSchoolSection,
  assignTeacherToSection,
  getProgramLevels,
  getTrainedTeachers,
} from "../../../services/school";

const SCREEN_W = Dimensions.get("window").width;

const C = {
  orange:      "#EA580C",
  orangeLight: "#FFF7ED",
  orangeFade:  "#FFEDD5",
  ink:         "#111827",
  inkMid:      "#374151",
  inkSoft:     "#6B7280",
  inkGhost:    "#9CA3AF",
  line:        "#E5E7EB",
  lineFaint:   "#F3F4F6",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F9FAFB",
  green:       "#16A34A",
  red:         "#DC2626",
  blue:        "#2563EB",
  slate:       "#64748B",
};

interface Section {
  id?: string | number;
  section_name: string;
  teacher_id?: string | number;
  teacher_name?: string;
  teacher?: { id: string | number; name: string } | string;
  strength?: string | number;
  infra?: string;
  slot?: string;
  adopted?: boolean;
  class_name?: string;
  level_id?: string | number;
  status?: string;
}

interface Level {
  id: string | number;
  name: string;
  order_index?: number;
  total_units?: number;
  modules?: any[];
}

interface Teacher {
  id: string | number;
  name: string;
}

interface DDOption {
  label: string;
  value: string;
}

// ─── Class options based on program name + level index (0-based) ─────────────
function getClassOptions(programName: string, levelIndex: number): DDOption[] {
  const n = (programName || "").toLowerCase();
  console.log("getClassOptions → programName:", programName, "| levelIndex:", levelIndex);

  if (n.includes("acp")) {
    const map: Record<number, string[]> = { 0: ["6","7"], 1: ["7","8"], 2: ["8","9"] };
    return (map[levelIndex] ?? []).map(c => ({ label: `Class ${c}`, value: c }));
  }
  if (n.includes("fcp") || n.includes("foundational")) {
    return [{ label: "Class 6", value: "6" }, { label: "Class 7", value: "7" }];
  }
  if (n.includes("awk") || n.includes("awakening")) {
    const classNum = String(levelIndex + 1);
    return [{ label: `Class ${classNum}`, value: classNum }];
  }
  if (n.includes("nav") && (n.includes("jagran") || n.includes("jagaran"))) {
    return [{ label: "Class 6", value: "6" }];
  }
  if (n.includes("aact")) {
    return [{ label: "Class 7", value: "7" }, { label: "Class 8", value: "8" }];
  }
  return [];
}

// ─── DropdownField ────────────────────────────────────────────────────────────
function DropdownField({
  id, label, displayValue, options, onSelect, openDD, setOpenDD,
  loading = false, disabled = false, zIndex = 10, emptyText = "No options found",
}: {
  id: string; label: string; displayValue: string;
  options: DDOption[]; onSelect: (v: string) => void;
  openDD: string; setOpenDD: (v: string) => void;
  loading?: boolean; disabled?: boolean; zIndex?: number; emptyText?: string;
}) {
  const isOpen = openDD === id;
  return (
    <View style={{ zIndex: isOpen ? zIndex + 10 : zIndex }}>
      <Text style={m.label}>{label}</Text>
      <TouchableOpacity
        style={[m.fieldBox, isOpen && m.fieldBoxOpen, disabled && m.fieldBoxDisabled]}
        activeOpacity={disabled ? 1 : 0.85}
        onPress={() => { if (!disabled) setOpenDD(isOpen ? "" : id); }}
      >
        {loading && <ActivityIndicator size="small" color={C.orange} style={{ marginRight: 8 }} />}
        <Text style={[m.fieldVal, disabled && { color: C.inkGhost }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={15} color={C.inkGhost} />
      </TouchableOpacity>
      {isOpen && (
        <View style={m.ddPanel}>
          {options.length === 0 ? (
            <View style={m.ddEmpty}>
              <Text style={m.ddEmptyText}>{loading ? "Loading…" : emptyText}</Text>
            </View>
          ) : (
            options.map(o => {
              const sel = displayValue === o.label;
              return (
                <TouchableOpacity
                  key={o.value}
                  style={[m.ddItem, sel && m.ddItemSel]}
                  onPress={() => { onSelect(o.value); setOpenDD(""); }}
                >
                  <Text style={[m.ddText, sel && m.ddTextSel]}>{o.label}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={16} color={C.orange} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SectionsManagement({ route }: any) {
  const schoolId    = route?.params?.schoolId;
  const schoolName  = route?.params?.schoolName || "School";
  const programId   = route?.params?.programId;    // Program UUID for getProgramLevels
  const programIntId = route?.params?.programIntId; // integer FK for getTrainedTeachers
  const programName  = route?.params?.programName || "";
  const levelId      = route?.params?.levelId;
  const levelName    = route?.params?.levelName || "";

  const [sections,     setSections]     = useState<Section[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex,    setEditIndex]    = useState<number | null>(null);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { fetchSections(); }, [schoolId]);

  const fetchSections = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await getSchoolSections(schoolId);
      if (res?.success && Array.isArray(res.data)) {
        const data = levelId
          ? res.data.filter((s: Section) => String(s.level_id) === String(levelId))
          : res.data;
        setSections(data);
      } else {
        setSections([]);
      }
    } catch {
      Alert.alert("Error", "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    console.log("handleSave payload:", JSON.stringify(data));
    if (!schoolId) return;
    try {
      setSaving(true);
      if (editIndex !== null) {
        const existing = sections[editIndex];
        if (data.teacher_id && existing.id && String(data.teacher_id) !== String(existing.teacher_id)) {
          await assignTeacherToSection(schoolId, existing.id, { teacher_id: data.teacher_id });
        }
        const updated = [...sections];
        updated[editIndex] = { ...existing, ...data };
        setSections(updated);
      } else {
        const rawClass = data.class_name || "";
        const payload: any = {
          level_id:     data.level_id || levelId,
          class_name:   rawClass.replace("Class ", "").trim() || rawClass,
          section_name: data.section_name,
          strength:     data.strength ? parseInt(data.strength) : undefined,
          infra:        data.infra,        // "Available" | "Unavailable" | "Not Applicable"
          slot:         data.slot === "Yes" ? "yes" : "no",  // DB expects lowercase
          status:       data.adopted ? "Adopted" : "Not Adopted", // DB expects title case
        };
        if (data.teacher_id) payload.teacher_id = data.teacher_id;

        const res = await createSchoolSection(schoolId, payload);
        if (!res?.success) {
          Alert.alert("Error", res?.message || "Failed to create section");
          return;
        }
        if (data.teacher_id && res.data?.id) {
          await assignTeacherToSection(schoolId, res.data.id, { teacher_id: data.teacher_id });
        }
        await fetchSections();
      }
      setEditIndex(null);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (index: number) => {
    Alert.alert("Delete Section", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setSections(sections.filter((_, i) => i !== index)) },
    ]);
  };

  const getTeacherName = (item: Section) => {
    if (typeof item.teacher === "object" && item.teacher?.name) return item.teacher.name;
    if (typeof item.teacher === "string") return item.teacher;
    return item.teacher_name || "—";
  };

  return (
    <View style={s.root}>
      <AppHeader title={schoolName} />

      <View style={s.heroBand}>
        <View style={s.heroContent}>
          <Text style={s.heroLabel}>{levelName ? `${levelName.toUpperCase()} · ` : ""}SECTIONS</Text>
          <Text style={s.heroTitle}>Sections Management</Text>
          <Text style={s.heroSub}>Manage student strength and assigned teachers</Text>
          {levelName ? <View style={s.classTag}><Text style={s.classTagText}>{levelName}</Text></View> : null}
        </View>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={() => { setEditIndex(null); setModalVisible(true); }}>
          <Ionicons name="add-circle-outline" size={18} color={C.orange} />
          <Text style={s.addBtnText}>Add Section</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false} contentContainerStyle={s.bodyContent}>
        <View style={s.tableCard}>
          {loading ? (
            <View style={s.stateBox}>
              <ActivityIndicator color={C.orange} size="large" />
              <Text style={s.stateText}>Loading sections…</Text>
            </View>
          ) : sections.length === 0 ? (
            <View style={s.stateBox}>
              <View style={s.emptyRing}><Ionicons name="layers-outline" size={32} color={C.inkGhost} /></View>
              <Text style={s.emptyTitle}>No sections added yet</Text>
              <Text style={s.emptySub}>Tap "Add Section" above to create one</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={s.thead}>
                  {["Section","Class","Teacher","Strength","Infra","Slot","Status","Edit","Del"].map((h, i) => (
                    <View key={i} style={[s.th, i >= 7 && { width: 56 }]}>
                      <Text style={s.thTxt}>{h}</Text>
                    </View>
                  ))}
                </View>
                {sections.map((item, idx) => (
                  <View key={idx} style={[s.trow, idx === sections.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={s.td}><Text style={s.tdMain}>{item.section_name || "—"}</Text></View>
                    <View style={s.td}><Text style={s.tdMain}>{item.class_name || "—"}</Text></View>
                    <View style={s.td}><Text style={s.tdMain} numberOfLines={1}>{getTeacherName(item)}</Text></View>
                    <View style={s.td}><Text style={s.tdMain}>{item.strength ?? "—"}</Text></View>
                    <View style={s.td}>
                      <Text style={[s.tdMain, { color: item.infra === "Available" ? C.green : item.infra === "Unavailable" ? C.red : C.slate }]}>
                        {item.infra === "Unavailable" ? "Unavail." : item.infra === "Not Applicable" ? "N/A" : item.infra || "—"}
                      </Text>
                    </View>
                    <View style={s.td}><Text style={[s.tdMain, { color: item.slot === "Yes" ? C.blue : C.inkSoft }]}>{item.slot || "—"}</Text></View>
                    <View style={s.td}>
                      <Text style={[s.tdMain, { color: item.status === "adopted" ? C.green : C.inkSoft }]}>
                        {item.status === "adopted" ? "Adopted" : "Not Adopted"}
                      </Text>
                    </View>
                    <View style={[s.td, { width: 56, alignItems: "center" }]}>
                      <TouchableOpacity onPress={() => { setEditIndex(idx); setModalVisible(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.editLink}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[s.td, { width: 56, alignItems: "center" }]}>
                      <TouchableOpacity onPress={() => handleDelete(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.deleteLink}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <SectionModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditIndex(null); }}
        onSave={handleSave}
        saving={saving}
        programId={programId}
        programIntId={programIntId}
        programName={programName}
        schoolId={schoolId}
        defaultLevelId={levelId}
        defaultLevelName={levelName}
        editData={editIndex !== null ? sections[editIndex] : null}
      />
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function SectionModal({ visible, onClose, onSave, saving, programId, programIntId, programName, schoolId, defaultLevelId, defaultLevelName, editData }: any) {
  const [form, setForm] = useState({
    level_id:     "",
    level_index:  0,
    class_name:   "Select Class",
    section_name: "",
    teacher_id:   "",
    teacher_name: "Select Teacher",
    strength:     "",
    infra:        "Available",
    slot:         "Yes",
    adopted:      true,
  });
  const [openDD,        setOpenDD]        = useState("");
  const [levels,        setLevels]        = useState<Level[]>([]);
  const [teachers,      setTeachers]      = useState<Teacher[]>([]);
  const [classOptions,  setClassOptions]  = useState<DDOption[]>([]);
  const [loadingLevels,   setLoadingLevels]   = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setOpenDD("");
    setTeachers([]);
    setClassOptions([]);

    if (editData) {
      const teacherName = typeof editData.teacher === "object"
        ? editData.teacher?.name
        : editData.teacher_name || editData.teacher || "Select Teacher";
      setForm({
        level_id:     String(editData.level_id || defaultLevelId || ""),
        level_index:  0,
        class_name:   editData.class_name || defaultLevelName || "Select Class",
        section_name: editData.section_name || "",
        teacher_id:   String(editData.teacher_id || ""),
        teacher_name: teacherName,
        strength:     editData.strength ? String(editData.strength) : "",
        infra:        editData.infra  || "Available",
        slot:         editData.slot   || "Yes",
        adopted:      editData.status === "adopted",
      });
    } else {
      setForm({
        level_id:     defaultLevelId ? String(defaultLevelId) : "",
        level_index:  0,
        class_name:   "Select Class",
        section_name: "",
        teacher_id:   "",
        teacher_name: "Select Teacher",
        strength:     "",
        infra:        "Available",
        slot:         "Yes",
        adopted:      true,
      });
    }

    if (programId) fetchLevels(programId);
  }, [visible]);

  // Once levels load, compute class options for pre-selected level
  useEffect(() => {
    if (levels.length > 0 && form.level_id) {
      const idx = levels.findIndex(l => String(l.id) === String(form.level_id));
      if (idx !== -1) {
        setClassOptions(getClassOptions(programName, idx));
        // Also fetch teachers for pre-selected level
        if (schoolId && programIntId) fetchTeachers();
      }
    }
  }, [levels]);

  const fetchLevels = async (pid: string | number) => {
    try {
      setLoadingLevels(true);
      setLevels([]);
      const res = await getProgramLevels(pid);
      if (res?.success && res.data?.levels?.length) {
        setLevels(res.data.levels);
      }
    } catch (e) {
      console.error("fetchLevels error:", e);
    } finally {
      setLoadingLevels(false);
    }
  };

  const fetchTeachers = async () => {
    if (!schoolId || !programIntId) return;
    try {
      setLoadingTeachers(true);
      setTeachers([]);
      const res = await getTrainedTeachers(schoolId, programIntId);
      if (res?.success && res.data?.length) {
        setTeachers(res.data);
      }
    } catch (e) {
      console.error("fetchTeachers error:", e);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleLevelSelect = (levelId: string) => {
    const levelIndex = levels.findIndex(l => String(l.id) === levelId);
    const opts = getClassOptions(programName, levelIndex);
    set("level_id",     levelId);
    set("level_index",  levelIndex);
    set("class_name",   "Select Class");
    set("teacher_id",   "");
    set("teacher_name", "Select Teacher");
    setClassOptions(opts);
    fetchTeachers();
  };

  const handleSubmit = () => {
    console.log("handleSubmit → adopted:", form.adopted, "→ status:", form.adopted ? "Adopted" : "Not Adopted");
    if (!form.level_id) { Alert.alert("Validation", "Please select a level."); return; }
    if (classOptions.length > 0 && (!form.class_name || form.class_name === "Select Class")) {
      Alert.alert("Validation", "Please select a class."); return;
    }
    if (!form.section_name.trim()) { Alert.alert("Validation", "Please enter a section name."); return; }
    onSave(form);
  };

  const levelOptions = levels.map(l => ({ label: l.name, value: String(l.id) }));
  const teacherOptions = teachers.map(t => ({ label: t.name, value: String(t.id) }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1}>
            <View style={m.popup}>

              <View style={m.head}>
                <View style={m.headLeft}>
                  <View style={m.headIcon}>
                    <Ionicons name={editData ? "create" : "add"} size={17} color={C.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.headTitle}>{editData ? "Edit Section" : "New Section"}</Text>
                    <Text style={m.headSub}>{editData ? "Update the details" : "Fill in section details"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={m.closeX} onPress={onClose}>
                  <Ionicons name="close" size={16} color={C.inkSoft} />
                </TouchableOpacity>
              </View>

              <View style={m.hairline} />

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={m.body}>

                {/* Level */}
                {/* <DropdownField
                  id="level" label="Level"
                  displayValue={levelOptions.find(l => l.value === form.level_id)?.label || "Select Level"}
                  options={levelOptions}
                  onSelect={handleLevelSelect}
                  openDD={openDD} setOpenDD={setOpenDD}
                  loading={loadingLevels}
                  zIndex={60}
                  emptyText="No levels found for this program"
                /> */}

                {/* Class */}
                {form.level_id ? (
                  classOptions.length > 0 ? (
                    <DropdownField
                      id="class" label="Class"
                      displayValue={form.class_name}
                      options={classOptions}
                      onSelect={v => set("class_name", `Class ${v}`)}
                      openDD={openDD} setOpenDD={setOpenDD}
                      zIndex={50}
                      emptyText="No classes for this program/level"
                    />
                  ) : (
                    <View style={{ marginTop: 14 }}>
                      <Text style={m.label}>Class</Text>
                      <View style={[m.fieldBox, { opacity: 0.5 }]}>
                        <Text style={[m.fieldVal, { color: C.inkGhost }]}>No class assigned for this program</Text>
                      </View>
                    </View>
                  )
                ) : null}

                {/* Section Name */}
                <Text style={m.label}>Section Name</Text>
                <TextInput
                  style={m.textInput}
                  value={form.section_name}
                  onChangeText={v => set("section_name", v)}
                  placeholder="e.g. A"
                  placeholderTextColor={C.inkGhost}
                />

                {/* Teacher */}
                <DropdownField
                  id="teacher" label="Teacher (optional)"
                  displayValue={form.teacher_name}
                  options={teacherOptions}
                  onSelect={v => {
                    const t = teachers.find(x => String(x.id) === v);
                    set("teacher_id",   v);
                    set("teacher_name", t?.name || v);
                  }}
                  openDD={openDD} setOpenDD={setOpenDD}
                  loading={loadingTeachers}
                  disabled={!form.level_id}
                  zIndex={40}
                  emptyText={form.level_id ? "No trained teachers found" : "Select a level first"}
                />

                {/* Strength */}
                <Text style={m.label}>Strength</Text>
                <TextInput
                  style={m.textInput}
                  value={form.strength}
                  onChangeText={v => set("strength", v)}
                  keyboardType="numeric"
                  placeholder="Number of students"
                  placeholderTextColor={C.inkGhost}
                />

                {/* Infra */}
                <DropdownField
                  id="infra" label="Infra"
                  displayValue={form.infra}
                  options={[
                    { label: "Available",     value: "Available" },
                    { label: "Unavailable",   value: "Unavailable" },
                    { label: "Not Applicable", value: "Not Applicable" },
                  ]}
                  onSelect={v => set("infra", v)}
                  openDD={openDD} setOpenDD={setOpenDD}
                  zIndex={30}
                />

                {/* Slot */}
                <DropdownField
                  id="slot" label="Slot"
                  displayValue={form.slot}
                  options={["Yes","No"].map(o => ({ label: o, value: o }))}
                  onSelect={v => set("slot", v)}
                  openDD={openDD} setOpenDD={setOpenDD}
                  zIndex={20}
                />

                {/* Status */}
                <DropdownField
                  id="status" label="Status"
                  displayValue={form.adopted ? "Adopted" : "Not Adopted"}
                  options={[
                    { label: "Adopted",     value: "Adopted" },
                    { label: "Not Adopted", value: "Not Adopted" },
                  ]}
                  onSelect={v => setForm(p => ({ ...p, adopted: v === "Adopted" }))}
                  openDD={openDD} setOpenDD={setOpenDD}
                  zIndex={10}
                />

                <View style={m.btnRow}>
                  <TouchableOpacity style={m.btnCancel} onPress={onClose} disabled={saving}>
                    <Text style={m.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[m.btnSave, saving && { opacity: 0.7 }]} onPress={handleSubmit} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={editData ? "checkmark-done" : "checkmark"} size={16} color="#fff" />
                        <Text style={m.btnSaveText}>{editData ? "Update" : "Save"}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceAlt },
  heroBand: { backgroundColor: C.orange, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  heroContent: { flex: 1, marginRight: 14 },
  heroLabel:   { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1.4, marginBottom: 6 },
  heroTitle:   { fontSize: 22, fontWeight: "800", color: C.surface, letterSpacing: -0.4, lineHeight: 28 },
  heroSub:     { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 17 },
  classTag:    { marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  classTagText:{ fontSize: 11, fontWeight: "700", color: C.surface },
  addBtn:      { backgroundColor: C.surface, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  addBtnText:  { color: C.orange, fontWeight: "700", fontSize: 13 },
  body:        { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 40 },
  tableCard:   { backgroundColor: C.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.line },
  thead:       { flexDirection: "row", backgroundColor: C.surfaceAlt, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 },
  th:          { width: 100, paddingHorizontal: 10 },
  thTxt:       { fontSize: 10, fontWeight: "700", color: C.inkGhost, textTransform: "uppercase", letterSpacing: 0.7 },
  trow:        { flexDirection: "row", backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.lineFaint, paddingVertical: 13 },
  td:          { width: 100, paddingHorizontal: 10, justifyContent: "center" },
  tdMain:      { fontSize: 13, color: C.inkMid, fontWeight: "500" },
  editLink:    { fontSize: 12, fontWeight: "700", color: C.blue },
  deleteLink:  { fontSize: 12, fontWeight: "700", color: C.red },
  stateBox:    { alignItems: "center", paddingVertical: 52, paddingHorizontal: 24 },
  stateText:   { marginTop: 10, color: C.inkGhost, fontSize: 13 },
  emptyRing:   { width: 68, height: 68, borderRadius: 34, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle:  { fontSize: 15, fontWeight: "700", color: C.inkMid, marginBottom: 4 },
  emptySub:    { fontSize: 13, color: C.inkGhost, textAlign: "center", lineHeight: 19 },
});

const POPUP_W = Math.min(SCREEN_W - 32, 420);
const m = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  popup:         { backgroundColor: C.surface, borderRadius: 20, width: POPUP_W, maxHeight: "90%", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 36, elevation: 20 },
  head:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
  headLeft:      { flexDirection: "row", alignItems: "center", gap: 11, flex: 1, marginRight: 8 },
  headIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.orangeLight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.orangeFade, flexShrink: 0 },
  headTitle:     { fontSize: 15, fontWeight: "800", color: C.ink },
  headSub:       { fontSize: 11, color: C.inkGhost, marginTop: 2 },
  closeX:        { width: 28, height: 28, borderRadius: 14, backgroundColor: C.lineFaint, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  hairline:      { height: 1, backgroundColor: C.lineFaint },
  body:          { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 20 },
  label:         { fontSize: 11, fontWeight: "700", color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 14, marginBottom: 6 },
  textInput:     { width: "100%", borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.ink, backgroundColor: C.surfaceAlt },
  fieldBox:      { width: "100%", borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: C.surfaceAlt, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldBoxOpen:  { borderColor: C.orange, backgroundColor: C.orangeLight },
  fieldBoxDisabled: { opacity: 0.45 },
  fieldVal:      { fontSize: 14, color: C.ink, flex: 1, marginRight: 6 },
  ddPanel:       { width: "100%", borderWidth: 1.5, borderColor: C.line, borderRadius: 12, marginTop: 4, backgroundColor: C.surface, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 8 },
  ddItem:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.lineFaint },
  ddItemSel:     { backgroundColor: C.orangeLight },
  ddText:        { fontSize: 14, color: C.inkMid },
  ddTextSel:     { color: C.orange, fontWeight: "700" },
  ddEmpty:       { padding: 16, alignItems: "center" },
  ddEmptyText:   { fontSize: 13, color: C.inkGhost },
  btnRow:        { flexDirection: "row", marginTop: 24, gap: 10 },
  btnCancel:     { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: C.surface },
  btnCancelText: { color: C.inkSoft, fontWeight: "600", fontSize: 14 },
  btnSave:       { flex: 2, backgroundColor: C.orange, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  btnSaveText:   { color: "#fff", fontWeight: "800", fontSize: 14 },
});