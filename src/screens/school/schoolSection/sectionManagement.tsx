// SectionsManagement.tsx
// @ts-nocheck

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
  updateSchoolSection,   // ← replaces updateSectionStatus
  deleteSchoolSection,
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
  greenLight:  "#DCFCE7",
  red:         "#DC2626",
  redLight:    "#FEF2F2",
  blue:        "#2563EB",
  blueLight:   "#EFF6FF",
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
  status?: string;
  class_name?: string;
  level_id?: string | number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getClassOptions(programName: string, levelIndex: number): DDOption[] {
  const n = (programName || "").toLowerCase();
  if (n.includes("acp")) {
    const map: Record<number, string[]> = { 0: ["6","7"], 1: ["7","8"], 2: ["8","9"] };
    return (map[levelIndex] ?? []).map(c => ({ label: `Class ${c}`, value: c }));
  }
  if (n.includes("fcp") || n.includes("foundational"))
    return [
      { label: "Class 6", value: "6" },
      { label: "Class 7", value: "7" },
      { label: "Class 8", value: "8" },
      { label: "Class 9", value: "9" },
    ];
  if (n.includes("awk") || n.includes("awakening")) {
    const c = String(levelIndex + 1);
    return [{ label: `Class ${c}`, value: c }];
  }
  if (n.includes("nav") && (n.includes("jagran") || n.includes("jagaran")))
    return [{ label: "Class 6", value: "6" }];
  if (n.includes("aact"))
    return [
      { label: "Class 7", value: "7" },
      { label: "Class 8", value: "8" },
      { label: "Class 9", value: "9" },
    ];
  return [];
}

function normalizeStatus(raw?: string): "Adopted" | "Not Adopted" {
  return raw === "adopted" || raw === "Adopted" ? "Adopted" : "Not Adopted";
}

// ─── DropdownField — uses Modal overlay to avoid pushing content down ─────────
function DropdownField({
  id, label, displayValue, options, onSelect, openDD, setOpenDD,
  loading = false, disabled = false, emptyText = "No options found",
}: {
  id: string; label: string; displayValue: string;
  options: DDOption[]; onSelect: (v: string) => void;
  openDD: string; setOpenDD: (v: string) => void;
  loading?: boolean; disabled?: boolean; emptyText?: string;
}) {
  const isOpen = openDD === id;
  const [btnLayout, setBtnLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const btnRef = React.useRef<TouchableOpacity>(null);

  const handleOpen = () => {
    if (disabled) return;
    if (isOpen) { setOpenDD(""); return; }
    btnRef.current?.measure((_fx, _fy, width, height, px, py) => {
      setBtnLayout({ x: px, y: py, width, height });
      setOpenDD(id);
    });
  };

  // Determine if dropdown should open downward or upward
  const screenH = Dimensions.get("window").height;
  const dropdownH = Math.min(options.length * 48 + 16, 220);
  const openUpward = btnLayout ? (btnLayout.y + btnLayout.height + dropdownH > screenH - 60) : false;

  return (
    <View>
      <Text style={fm.label}>{label}</Text>
      <TouchableOpacity
        ref={btnRef}
        style={[fm.fieldBox, isOpen && fm.fieldBoxOpen, disabled && fm.fieldBoxDisabled]}
        activeOpacity={disabled ? 1 : 0.85}
        onPress={handleOpen}
      >
        {loading && <ActivityIndicator size="small" color={C.orange} style={{ marginRight: 8 }} />}
        <Text style={[fm.fieldVal, disabled && { color: C.inkGhost }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={15} color={C.inkGhost} />
      </TouchableOpacity>

      {/* Dropdown rendered in Modal so it overlays everything */}
      {isOpen && btnLayout && (
        <Modal
          visible={true}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setOpenDD("")}
        >
          {/* Invisible full-screen backdrop to catch outside taps */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setOpenDD("")}
          >
            <View
              style={[
                fm.ddPanel,
                {
                  position: "absolute",
                  left: btnLayout.x,
                  width: btnLayout.width,
                  ...(openUpward
                    ? { bottom: Dimensions.get("window").height - btnLayout.y }
                    : { top: btnLayout.y + btnLayout.height + 4 }),
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                  {options.length === 0 ? (
                    <View style={fm.ddEmpty}>
                      <Text style={fm.ddEmptyText}>{loading ? "Loading…" : emptyText}</Text>
                    </View>
                  ) : (
                    options.map(o => {
                      const sel = displayValue === o.label;
                      return (
                        <TouchableOpacity
                          key={o.value}
                          style={[fm.ddItem, sel && fm.ddItemSel]}
                          onPress={() => { onSelect(o.value); setOpenDD(""); }}
                        >
                          <Text style={[fm.ddText, sel && fm.ddTextSel]}>{o.label}</Text>
                          {sel && <Ionicons name="checkmark-circle" size={16} color={C.orange} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({ visible, sectionName, className, deleting, onConfirm, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={del.backdrop} activeOpacity={1} onPress={deleting ? undefined : onClose}>
          <TouchableOpacity activeOpacity={1} style={{ width: "100%", alignItems: "center" }}>
            <View style={del.popup}>
              <View style={del.iconCircle}>
                <Ionicons name="trash-outline" size={28} color={C.red} />
              </View>
              <Text style={del.title}>Delete Section?</Text>
              <Text style={del.sub}>
                You're about to delete{" "}
                <Text style={{ fontWeight: "700", color: C.ink }}>
                  {[sectionName, className].filter(Boolean).join(" · ")}
                </Text>
                {". "}This action cannot be undone.
              </Text>
              <View style={del.btnRow}>
                <TouchableOpacity style={del.btnCancel} onPress={onClose} disabled={deleting}>
                  <Text style={del.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[del.btnDelete, deleting && { opacity: 0.65 }]}
                  onPress={onConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={15} color="#fff" />
                      <Text style={del.btnDeleteText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SectionsManagement({ route }: any) {
  const schoolId     = route?.params?.schoolId;
  const schoolName   = route?.params?.schoolName || "School";
  const programId    = route?.params?.programId;
  const programIntId = route?.params?.programIntId;
  const programName  = route?.params?.programName || "";
  const levelId      = route?.params?.levelId;
  const levelName    = route?.params?.levelName || "";

 const isAdopted  = route?.params?.isAdopted ?? false;
const showStatus = isAdopted;

  const [sections,        setSections]        = useState<Section[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editAddIndex,    setEditAddIndex]    = useState<number | null>(null);
  const [saving,          setSaving]          = useState(false);

  // delete modal
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteIdx,     setDeleteIdx]     = useState<number | null>(null);
  const [deleting,      setDeleting]      = useState(false);

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

  // ── Create or Update section ───────────────────────────────────────────────
  const handleSave = async (data: any) => {
    if (!schoolId) return;
    try {
      setSaving(true);

      const rawClass = data.class_name || "";
      const cleanClass = rawClass.replace("Class ", "").trim() || rawClass;

      if (editAddIndex !== null) {
        // ── EDIT: PUT /schools/:id/sections/:sectionId ──
        const existing = sections[editAddIndex];
        if (!existing?.id) return;

        const payload: any = {
          level_id:     data.level_id     || existing.level_id,
          class_name:   cleanClass        || existing.class_name,
          section_name: data.section_name || existing.section_name,
          strength:     data.strength     ? parseInt(data.strength) : undefined,
          infra:        data.infra,
          slot:         data.slot === "Yes" ? "yes" : "no",
          status: data.status || "Not Adopted",
        };

        // Only send teacher_id if a real teacher selected (not "Not Available")
        if (data.teacher_id && data.teacher_id !== "not_available") {
          payload.teacher_id = data.teacher_id;
        }

        const res = await updateSchoolSection(schoolId, existing.id, payload);
        if (!res?.success) {
          Alert.alert("Error", res?.message || "Failed to update section");
          return;
        }
        await fetchSections();

      } else {
        // ── CREATE: POST /schools/:id/sections ──
        const payload: any = {
          level_id:     data.level_id || levelId,
          class_name:   cleanClass,
          section_name: data.section_name,
          strength:     data.strength ? parseInt(data.strength) : undefined,
          infra:        data.infra,
          slot:         data.slot === "Yes" ? "yes" : "no",
          status: data.status || "Not Adopted",
        };
        if (data.teacher_id && data.teacher_id !== "not_available") {
          payload.teacher_id = data.teacher_id;
        }

        const res = await createSchoolSection(schoolId, payload);
        if (!res?.success) {
          Alert.alert("Error", res?.message || "Failed to create section");
          return;
        }
        // Assign teacher separately if needed
        if (data.teacher_id && data.teacher_id !== "not_available" && res.data?.id) {
          await assignTeacherToSection(schoolId, res.data.id, { teacher_id: data.teacher_id });
        }
        await fetchSections();
      }

      setEditAddIndex(null);
      setAddModalVisible(false);
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ────────────────────────────────────────────────────────
  const openDeleteModal = (idx: number) => { setDeleteIdx(idx); setDeleteModal(true); };

  const handleDeleteConfirm = async () => {
    if (deleteIdx === null) return;
    const section = sections[deleteIdx];
    if (!section?.id || !schoolId) {
      setSections(sections.filter((_, i) => i !== deleteIdx));
      setDeleteModal(false); setDeleteIdx(null);
      return;
    }
    try {
      setDeleting(true);
      const res = await deleteSchoolSection(schoolId, section.id);
      if (!res?.success) { Alert.alert("Error", res?.message || "Failed to delete section"); return; }
      setSections(sections.filter((_, i) => i !== deleteIdx));
      setDeleteModal(false); setDeleteIdx(null);
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const getTeacherName = (item: Section) => {
    if (typeof item.teacher === "object" && item.teacher?.name) return item.teacher.name;
    if (typeof item.teacher === "string") return item.teacher;
    return item.teacher_name || "—";
  };

  const deleteTargetSection = deleteIdx !== null ? sections[deleteIdx] : null;

  return (
    <View style={s.root}>
      <AppHeader title={schoolName} />

      <View style={s.heroBand}>
        <View style={s.heroContent}>
          <Text style={s.heroLabel}>
            {levelName ? `${levelName.toUpperCase()} · ` : ""}SECTIONS
          </Text>
          <Text style={s.heroTitle}>Sections Management</Text>
          <Text style={s.heroSub}>Manage student strength and assigned teachers</Text>
          {levelName ? (
            <View style={s.classTag}><Text style={s.classTagText}>{levelName}</Text></View>
          ) : null}
        </View>
        <TouchableOpacity
          style={s.addBtn}
          activeOpacity={0.85}
          onPress={() => { setEditAddIndex(null); setAddModalVisible(true); }}
        >
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
              <View style={s.emptyRing}>
                <Ionicons name="layers-outline" size={32} color={C.inkGhost} />
              </View>
              <Text style={s.emptyTitle}>No sections added yet</Text>
              <Text style={s.emptySub}>Tap "Add Section" above to create one</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* ── Table Header ── */}
                <View style={s.thead}>
                  {[
                    "Section", "Class", "Teacher", "Strength", "Infra", "Slot",
                    ...(showStatus ? ["Status"] : []),
                    "", "",   // edit + delete columns
                  ].map((h, i) => (
                    <View key={i} style={[s.th, h === "" && { width: 52 }]}>
                      <Text style={s.thTxt}>{h}</Text>
                    </View>
                  ))}
                </View>

                {/* ── Table Rows ── */}
                {sections.map((item, idx) => {
                  const isItemAdopted = item.status === "Adopted" || item.status === "adopted";
                  const statusLabel =
                    isItemAdopted ? "Adopted"
                    : (item.status === "Not Adopted" || item.status === "not_adopted") ? "Not Adopted"
                    : item.status || "—";

                  return (
                    <View
                      key={idx}
                      style={[s.trow, idx === sections.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={s.td}><Text style={s.tdMain}>{item.section_name || "—"}</Text></View>
                      <View style={s.td}><Text style={s.tdMain}>{item.class_name || "—"}</Text></View>
                      <View style={s.td}>
                        <Text style={s.tdMain} numberOfLines={1}>{getTeacherName(item)}</Text>
                      </View>
                      <View style={s.td}><Text style={s.tdMain}>{item.strength ?? "—"}</Text></View>
                      <View style={s.td}>
                        <Text style={[s.tdMain, {
                          color: item.infra === "Available" ? C.green
                            : item.infra === "Unavailable" ? C.red : C.slate,
                        }]}>
                          {item.infra === "Unavailable" ? "Unavail."
                            : item.infra === "Not Applicable" ? "N/A"
                            : item.infra || "—"}
                        </Text>
                      </View>
                      <View style={s.td}>
                        <Text style={[s.tdMain, {
                          color: item.slot === "Yes" || item.slot === "yes" ? C.blue : C.inkSoft,
                        }]}>
                          {item.slot
                            ? (item.slot === "yes" ? "Yes" : item.slot === "no" ? "No" : item.slot)
                            : "—"}
                        </Text>
                      </View>

                      {/* Status badge — FCP adopted only */}
                      {showStatus && (
                        <View style={s.td}>
                          <View style={[s.badge, isItemAdopted ? s.badgeGreen : s.badgeGray]}>
                            <Text style={[s.badgeText, { color: isItemAdopted ? C.green : C.inkSoft }]}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Edit icon — always shown */}
                      <View style={[s.td, { width: 52, alignItems: "center" }]}>
                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: C.blueLight }]}
                          onPress={() => { setEditAddIndex(idx); setAddModalVisible(true); }}
                          hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                        >
                          <Ionicons name="create-outline" size={19} color={C.blue} />
                        </TouchableOpacity>
                      </View>

                      {/* Delete icon — always shown */}
                      <View style={[s.td, { width: 52, alignItems: "center" }]}>
                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: C.redLight }]}
                          onPress={() => openDeleteModal(idx)}
                          hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                        >
                          <Ionicons name="trash-outline" size={19} color={C.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* ── Delete Modal ── */}
      <DeleteConfirmModal
        visible={deleteModal}
        sectionName={deleteTargetSection?.section_name || ""}
        className={deleteTargetSection?.class_name}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => { if (!deleting) { setDeleteModal(false); setDeleteIdx(null); } }}
      />

      {/* ── Add / Edit Section Modal ── */}
      <SectionModal
        visible={addModalVisible}
        onClose={() => { setAddModalVisible(false); setEditAddIndex(null); }}
        onSave={handleSave}
        saving={saving}
        programId={programId}
        programIntId={programIntId}
        programName={programName}
        schoolId={schoolId}
        defaultLevelId={levelId}
        defaultLevelName={levelName}
        editData={editAddIndex !== null ? sections[editAddIndex] : null}
        isFcp={showStatus}
      />
    </View>
  );
}

// ─── Add / Edit Section Modal ─────────────────────────────────────────────────
function SectionModal({ visible, onClose, onSave, saving,
  programId, programIntId, programName,
  schoolId, defaultLevelId, defaultLevelName,
  editData, isFcp }: any) {

  const [form, setForm] = useState({
    level_id: "", level_index: 0, class_name: "Select Class",
    section_name: "", teacher_id: "", teacher_name: "Select Teacher",
    strength: "", infra: "Available", slot: "Yes", status: isFcp ? "Adopted" : "Not Adopted",
  });

  const [openDD,          setOpenDD]          = useState("");
  const [levels,          setLevels]          = useState<Level[]>([]);
  const [teachers,        setTeachers]        = useState<Teacher[]>([]);
  const [classOptions,    setClassOptions]    = useState<DDOption[]>([]);
  const [loadingLevels,   setLoadingLevels]   = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // "Not Available" is always injected as the last teacher option
  const teacherOptions: DDOption[] = [
    ...teachers.map(t => ({ label: t.name, value: String(t.id) })),
    { label: "Not Available", value: "not_available" },
  ];

  useEffect(() => {
    if (!visible) return;
    setOpenDD("");
    setTeachers([]);
    setClassOptions([]);

    if (editData) {
      // Pre-fill form from existing section data
      let teacherName = "Select Teacher";
      if (typeof editData.teacher === "object" && editData.teacher?.name) {
        teacherName = editData.teacher.name;
      } else if (editData.teacher_name) {
        teacherName = editData.teacher_name;
      } else if (typeof editData.teacher === "string") {
        teacherName = editData.teacher;
      }

      // Normalize class_name — stored as "7" or "Class 7"
      const rawClass = editData.class_name || "";
      const displayClass = rawClass
        ? (rawClass.startsWith("Class ") ? rawClass : `Class ${rawClass}`)
        : "Select Class";

      setForm({
        level_id:     String(editData.level_id || defaultLevelId || ""),
        level_index:  0,
        class_name:   displayClass,
        section_name: editData.section_name || "",
        teacher_id:   editData.teacher_id ? String(editData.teacher_id) : "",
        teacher_name: teacherName,
        strength:     editData.strength ? String(editData.strength) : "",
        infra:        editData.infra || "Available",
        slot:         editData.slot === "yes" ? "Yes" : editData.slot === "no" ? "No" : (editData.slot || "Yes"),
        status: isFcp ? normalizeStatus(editData.status) : "Not Adopted",
      });
    } else {
      setForm({
        level_id:     defaultLevelId ? String(defaultLevelId) : "",
        level_index:  0,
        class_name: "Select Class",
        section_name: "",
        teacher_id:   "",
        teacher_name: "Select Teacher",
        strength:     "",
        infra:        "Available",
        slot:         "Yes",
        status: "Not Adopted",

      });
    }

    if (programId) fetchLevels(programId);
  }, [visible]);

  // Once levels load, compute class options and fetch teachers
  useEffect(() => {
    if (levels.length > 0 && form.level_id) {
      const idx = levels.findIndex(l => String(l.id) === String(form.level_id));
      if (idx !== -1) {
        setClassOptions(getClassOptions(programName, idx));
        if (schoolId && programIntId) fetchTeachers();
      }
    }
  }, [levels]);

  const fetchLevels = async (pid: string | number) => {
    try {
      setLoadingLevels(true);
      setLevels([]);
      const res = await getProgramLevels(pid);
      if (res?.success && res.data?.levels?.length) setLevels(res.data.levels);
    } catch (e) { console.error("fetchLevels error:", e); }
    finally { setLoadingLevels(false); }
  };

  const fetchTeachers = async () => {
    if (!schoolId || !programIntId) return;
    try {
      setLoadingTeachers(true);
      setTeachers([]);
      const res = await getTrainedTeachers(schoolId, programIntId);
      if (res?.success && res.data?.length) setTeachers(res.data);
    } catch (e) { console.error("fetchTeachers error:", e); }
    finally { setLoadingTeachers(false); }
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleLevelSelect = (lid: string) => {
    const levelIndex = levels.findIndex(l => String(l.id) === lid);
    const opts = getClassOptions(programName, levelIndex);
    set("level_id",    lid);
    set("level_index", levelIndex);
    set("class_name",  "Select Class");
    set("teacher_id",   "");
    set("teacher_name", "Select Teacher");
    setClassOptions(opts);
    fetchTeachers();
  };

  const handleSubmit = () => {
  if (!form.level_id) { Alert.alert("Validation", "Please select a level."); return; }
  if (classOptions.length > 0 && (!form.class_name || form.class_name === "Select Class")) {
    Alert.alert("Validation", "Please select a class."); return;
  }
  if (!form.section_name.trim()) { Alert.alert("Validation", "Please enter a section name."); return; }
  if (!form.teacher_id) { Alert.alert("Validation", "Please select a teacher or choose 'Not Available'."); return; }
  if (!form.strength.trim()) { Alert.alert("Validation", "Please enter student strength."); return; }
  if (!form.infra) { Alert.alert("Validation", "Please select infra status."); return; }
  if (!form.slot) { Alert.alert("Validation", "Please select slot availability."); return; }
  if (isFcp && !form.status) { Alert.alert("Validation", "Please select a status."); return; }
  onSave({ ...form });
};

  const levelOptions = levels.map(l => ({ label: l.name, value: String(l.id) }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={fm.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={{ width: "100%" }}>
            <View style={fm.popup}>

              {/* Header */}
              <View style={fm.head}>
                <View style={fm.headLeft}>
                  <View style={fm.headIcon}>
                    <Ionicons name={editData ? "create" : "add"} size={17} color={C.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fm.headTitle}>{editData ? "Edit Section" : "New Section"}</Text>
                    <Text style={fm.headSub}>{editData ? "Update section details" : "Fill in section details"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={fm.closeX} onPress={onClose}>
                  <Ionicons name="close" size={16} color={C.inkSoft} />
                </TouchableOpacity>
              </View>
              <View style={fm.hairline} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={fm.body}
              >
              
                {/* Class */}
                {form.level_id ? (
  classOptions.length > 0 ? (
                    <DropdownField
                      id="class" label="Class"
                      displayValue={form.class_name}
                      options={classOptions}
                      onSelect={v => set("class_name", `Class ${v}`)}
                      openDD={openDD} setOpenDD={setOpenDD}
                      emptyText="No classes for this program/level"
                    />
                  ) : (
    <View style={{ marginTop: 2 }}>
      <Text style={fm.label}>Class</Text>
      <View style={[fm.fieldBox, { opacity: 0.5 }]}>
        <Text style={[fm.fieldVal, { color: C.inkGhost }]}>No class assigned for this program</Text>
      </View>
    </View>
  )
) : null}

                {/* Section Name */}
                <Text style={fm.label}>Section Name</Text>
                <TextInput
                  style={fm.textInput}
                  value={form.section_name}
                  onChangeText={v => set("section_name", v)}
                  placeholder="e.g. A"
                  placeholderTextColor={C.inkGhost}
                />

                {/* Teacher — always shows "Not Available" at bottom */}
                <DropdownField
                  id="teacher" label="Teacher"
                  displayValue={form.teacher_name}
                  options={teacherOptions}
                  onSelect={v => {
                    if (v === "not_available") {
                      set("teacher_id",   "not_available");
                      set("teacher_name", "Not Available");
                    } else {
                      const t = teachers.find(x => String(x.id) === v);
                      set("teacher_id",   v);
                      set("teacher_name", t?.name || v);
                    }
                  }}
                  openDD={openDD} setOpenDD={setOpenDD}
                  loading={loadingTeachers}
                  disabled={!form.level_id}
                  emptyText="No trained teachers found"
                />

                {/* Strength */}
                <Text style={fm.label}>Strength</Text>
                <TextInput
                  style={fm.textInput}
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
                    { label: "Available",      value: "Available" },
                    { label: "Unavailable",    value: "Unavailable" },
                    { label: "Not Applicable", value: "Not Applicable" },
                  ]}
                  onSelect={v => set("infra", v)}
                  openDD={openDD} setOpenDD={setOpenDD}
                />

                {/* Slot */}
                <DropdownField
                  id="slot" label="Slot"
                  displayValue={form.slot}
                  options={["Yes","No"].map(o => ({ label: o, value: o }))}
                  onSelect={v => set("slot", v)}
                  openDD={openDD} setOpenDD={setOpenDD}
                />

                {/* Status — FCP adopted only */}
               {isFcp && (
  <DropdownField
    id="status" label="Status"
    displayValue={form.status}
    options={[
      { label: "Adopted",     value: "Adopted" },
      { label: "Not Adopted", value: "Not Adopted" },
    ]}
    onSelect={v => set("status", v)}
    openDD={openDD} setOpenDD={setOpenDD}
  />
)}

                {/* Action buttons */}
                <View style={fm.btnRow}>
                  <TouchableOpacity style={fm.btnCancel} onPress={onClose} disabled={saving}>
                    <Text style={fm.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[fm.btnSave, saving && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={editData ? "checkmark-done" : "checkmark"} size={16} color="#fff" />
                        <Text style={fm.btnSaveText}>{editData ? "Update" : "Save"}</Text>
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
  root:         { flex: 1, backgroundColor: C.surfaceAlt },
  heroBand:     { backgroundColor: C.orange, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  heroContent:  { flex: 1, marginRight: 14 },
  heroLabel:    { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1.4, marginBottom: 6 },
  heroTitle:    { fontSize: 22, fontWeight: "800", color: C.surface, letterSpacing: -0.4, lineHeight: 28 },
  heroSub:      { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 17 },
  classTag:     { marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  classTagText: { fontSize: 11, fontWeight: "700", color: C.surface },
  addBtn:       { backgroundColor: C.surface, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  addBtnText:   { color: C.orange, fontWeight: "700", fontSize: 13 },
  body:         { flex: 1 },
  bodyContent:  { padding: 16, paddingBottom: 40 },
  tableCard:    { backgroundColor: C.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.line },
  thead:        { flexDirection: "row", backgroundColor: C.surfaceAlt, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 },
  th:           { width: 100, paddingHorizontal: 10 },
  thTxt:        { fontSize: 10, fontWeight: "700", color: C.inkGhost, textTransform: "uppercase", letterSpacing: 0.7 },
  trow:         { flexDirection: "row", backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.lineFaint, paddingVertical: 13 },
  td:           { width: 100, paddingHorizontal: 10, justifyContent: "center" },
  tdMain:       { fontSize: 13, color: C.inkMid, fontWeight: "500" },
  badge:        { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeGreen:   { backgroundColor: C.greenLight },
  badgeGray:    { backgroundColor: C.lineFaint },
  badgeText:    { fontSize: 11, fontWeight: "700" },
  iconBtn:      { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: C.lineFaint },
  stateBox:     { alignItems: "center", paddingVertical: 52, paddingHorizontal: 24 },
  stateText:    { marginTop: 10, color: C.inkGhost, fontSize: 13 },
  emptyRing:    { width: 68, height: 68, borderRadius: 34, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle:   { fontSize: 15, fontWeight: "700", color: C.inkMid, marginBottom: 4 },
  emptySub:     { fontSize: 13, color: C.inkGhost, textAlign: "center", lineHeight: 19 },
});

// ─── Delete Modal Styles ──────────────────────────────────────────────────────
const DEL_W = Math.min(SCREEN_W - 48, 340);

const del = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  popup:         { backgroundColor: C.surface, borderRadius: 20, width: DEL_W, padding: 24, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 32, elevation: 20 },
  iconCircle:    { width: 64, height: 64, borderRadius: 32, backgroundColor: C.redLight, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:         { fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 8, textAlign: "center" },
  sub:           { fontSize: 13, color: C.inkSoft, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  btnRow:        { flexDirection: "row", gap: 10, width: "100%" },
  btnCancel:     { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  btnCancelText: { fontSize: 13, color: C.inkSoft, fontWeight: "600" },
  btnDelete:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: C.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, shadowColor: C.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnDeleteText: { fontSize: 13, color: "#fff", fontWeight: "700" },
});

// ─── Add / Edit Section Modal Styles ─────────────────────────────────────────
const FM_W = Math.min(SCREEN_W - 32, 420);

const fm = StyleSheet.create({
  backdrop:         { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  popup:            { backgroundColor: C.surface, borderRadius: 20, width: FM_W, maxHeight: "88%", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 36, elevation: 20 },
  head:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
  headLeft:         { flexDirection: "row", alignItems: "center", gap: 11, flex: 1, marginRight: 8 },
  headIcon:         { width: 36, height: 36, borderRadius: 10, backgroundColor: C.orangeLight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.orangeFade, flexShrink: 0 },
  headTitle:        { fontSize: 15, fontWeight: "800", color: C.ink },
  headSub:          { fontSize: 11, color: C.inkGhost, marginTop: 2 },
  closeX:           { width: 28, height: 28, borderRadius: 14, backgroundColor: C.lineFaint, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  hairline:         { height: 1, backgroundColor: C.lineFaint },
  body:             { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 24 },
  label:            { fontSize: 11, fontWeight: "700", color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 16, marginBottom: 6 },
  textInput:        { width: "100%", borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.ink, backgroundColor: C.surfaceAlt },
  fieldBox:         { width: "100%", borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: C.surfaceAlt, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldBoxOpen:     { borderColor: C.orange, backgroundColor: C.orangeLight },
  fieldBoxDisabled: { opacity: 0.45 },
  fieldVal:         { fontSize: 14, color: C.ink, flex: 1, marginRight: 6 },
  ddPanel:          { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
  ddItem:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.lineFaint },
  ddItemSel:        { backgroundColor: C.orangeLight },
  ddText:           { fontSize: 14, color: C.inkMid },
  ddTextSel:        { color: C.orange, fontWeight: "700" },
  ddEmpty:          { padding: 16, alignItems: "center" },
  ddEmptyText:      { fontSize: 13, color: C.inkGhost },
  btnRow:           { flexDirection: "row", marginTop: 24, gap: 10 },
  btnCancel:        { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: C.surface },
  btnCancelText:    { color: C.inkSoft, fontWeight: "600", fontSize: 14 },
  btnSave:          { flex: 2, backgroundColor: C.orange, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  btnSaveText:      { color: "#fff", fontWeight: "800", fontSize: 14 },
});