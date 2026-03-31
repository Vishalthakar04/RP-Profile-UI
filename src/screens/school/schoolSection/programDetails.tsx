// @ts-nocheck
// src/screens/school/ProgramDetails.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Program Details: Coordinator | Headmaster
// - Multiple coordinators & headmasters per program
// - Paginated table (5 per page) with Add / Edit / Delete
// - POST API for adding, PATCH for editing, DELETE for removing
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../../components/AppHeader";
import {
  getProgramLevels,
  getSchoolPrograms,
  addSchoolProgram,             // for programs that show both coordinator + headmaster
  createProgramCoordinatorNew,     // ← NEW
  deleteProgramCoordinator,
  patchProgramCoordinator,
  putProgramCoordinator,
  patchProgramHeadmaster,
  getProgramCoordinator,
  createProgramHeadmasterNew,
  getAllCoordinators,           // ← NEW
  getAllHeadmasters,
} from "../../../services/school";
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ContactEntry {
  id?: string | number;
  name:      string | null;
  email:     string | null;
  phone:     string | null;
  alt_phone: string | null;
}

interface FormState {
  name:      string;
  email:     string;
  phone:     string;
  alt_phone: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", phone: "", alt_phone: "" };
const PAGE_SIZE = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v.trim());
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const entryIsEmpty = (c: ContactEntry | null) =>
  !c || (!c.name && !c.email && !c.phone && !c.alt_phone);

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ProgramDetails({ navigation, route }) {
  const program       = route?.params?.program;
  const schoolId      = route?.params?.schoolId;
  const schoolProgramId = program?.id;
  const masterProgramId = program?.program?.id;

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"coordinator" | "headmaster">("coordinator");
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: "coordinator" | "headmaster") => {
    setActiveTab(tab);
    setCoordPage(1);
    setHeadPage(1);
    Animated.spring(tabAnim, {
      toValue: tab === "coordinator" ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [coordinators, setCoordinators] = useState<ContactEntry[]>([]);
  const [headmasters,  setHeadmasters]  = useState<ContactEntry[]>([]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [coordPage, setCoordPage] = useState(1);
  const [headPage,  setHeadPage]  = useState(1);

  // ── Program name → show headmaster tab? ──────────────────────────────────
  const programName = (program?.program_name || program?.program?.name || "").toLowerCase();
  const showHeadmaster = programName.includes("awakening") || programName.includes("awk");

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode,    setModalMode]    = useState<"add" | "edit">("add");
  const [editingEntry, setEditingEntry] = useState<ContactEntry | null>(null);
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [formErrors,   setFormErrors]   = useState<Partial<FormState>>({});
  const [saving,       setSaving]       = useState(false);

  // ── Levels ────────────────────────────────────────────────────────────────
  const [levels,        setLevels]        = useState([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Load contacts
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => { loadContacts(); }, []);
  useEffect(() => { if (masterProgramId) loadLevels(masterProgramId); }, []);

 // ─────────────────────────────────────────────────────────────────────────
// Load contacts using NEW global APIs
// ─────────────────────────────────────────────────────────────────────────
const loadContacts = async (quiet = false) => {
  if (!quiet) setLoading(true);

  try {
    const [coordRes, headRes] = await Promise.all([
      getAllCoordinators(),
      getAllHeadmasters(),
    ]);

    // Filter coordinators for CURRENT schoolProgram only
    const filteredCoordinators = (coordRes?.success && coordRes.data)
      ? coordRes.data.filter((c: any) => 
          String(c.school_program_id) === String(schoolProgramId)
        )
      : [];

    // Filter headmasters for CURRENT schoolProgram only
    const filteredHeadmasters = (headRes?.success && headRes.data)
      ? headRes.data.filter((h: any) => 
          String(h.school_program_id) === String(schoolProgramId)
        )
      : [];

    setCoordinators(filteredCoordinators.map((c: any) => ({
      id:        c.id,
      name:      c.name,
      email:     c.email,
      phone:     c.phone,
      alt_phone: c.alt_phone,
    })));

    setHeadmasters(filteredHeadmasters.map((h: any) => ({
      id:        h.id,
      name:      h.name,
      email:     h.email,
      phone:     h.phone,
      alt_phone: h.alt_phone,
    })));

  } catch (error) {
    console.error("loadContacts error:", error);
    setCoordinators([]);
    setHeadmasters([]);
  } finally {
    setLoading(false);
  }
};

  const applyProgramData = (p: any) => {
    if (!p) return;

    // Support both array and single-object responses
    // coordinators array from API or fallback to single fields
    const coordList: ContactEntry[] = Array.isArray(p.coordinators)
      ? p.coordinators
      : p.coordinator_name || p.coordinator_email || p.coordinator_phone
        ? [{
            id:        p.id,
            name:      p.coordinator_name      ?? null,
            email:     p.coordinator_email     ?? null,
            phone:     p.coordinator_phone     ?? null,
            alt_phone: p.coordinator_alt_phone ?? null,
          }]
        : [];

    const headList: ContactEntry[] = Array.isArray(p.headmasters)
      ? p.headmasters
      : p.headmaster_name || p.headmaster_email || p.headmaster_phone
        ? [{
            id:        p.id,
            name:      p.headmaster_name      ?? null,
            email:     p.headmaster_email     ?? null,
            phone:     p.headmaster_phone     ?? null,
            alt_phone: p.headmaster_alt_phone ?? null,
          }]
        : [];

    setCoordinators(coordList.filter((c) => !entryIsEmpty(c)));
    setHeadmasters(headList.filter((c) => !entryIsEmpty(c)));
  };

  const loadLevels = async (programId) => {
    setLoadingLevels(true);
    try {
      const res = await getProgramLevels(programId);
      setLevels(res.success && res.data?.levels?.length ? res.data.levels : []);
    } catch {
      setLevels([]);
    }
    setLoadingLevels(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Modal helpers
  // ─────────────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setModalMode("add");
    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalVisible(true);
  };

  const openEdit = (entry: ContactEntry) => {
    setModalMode("edit");
    setEditingEntry(entry);
    setForm({
      name:      entry.name      ?? "",
      email:     entry.email     ?? "",
      phone:     entry.phone     ?? "",
      alt_phone: entry.alt_phone ?? "",
    });
    setFormErrors({});
    setModalVisible(true);
  };

  const validateForm = () => {
    const errs: Partial<FormState> = {};
    if (!form.name?.trim())                              errs.name      = "Name is required";
    if (form.phone     && !isValidPhone(form.phone))     errs.phone     = "Enter valid 10-digit mobile";
    if (form.alt_phone && !isValidPhone(form.alt_phone)) errs.alt_phone = "Enter valid 10-digit mobile";
    if (form.email     && !isValidEmail(form.email))     errs.email     = "Enter a valid email";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

 const handleSave = async () => {
  if (!validateForm()) return;
  setSaving(true);

  const isCoord = activeTab === "coordinator";

  try {
    let res;

    if (modalMode === "add") {
      // ─────────────────────────────────────────────────────────────
      // ADD - Use new multiple support APIs
      // ─────────────────────────────────────────────────────────────
      if (isCoord) {
        // Add Coordinator (works for ALL programs now)
        res = await createProgramCoordinatorNew(schoolId, schoolProgramId, {
          name:      form.name,
          email:     form.email || undefined,
          phone:     form.phone || undefined,
          alt_phone: form.alt_phone || undefined,
        });
      } else {
        // Add Headmaster (only shown for Awakening programs)
        res = await createProgramHeadmasterNew(schoolId, schoolProgramId, {
          name:      form.name,
          email:     form.email || undefined,
          phone:     form.phone || undefined,
          alt_phone: form.alt_phone || undefined,
        });
      }
    } 
    else {
      // ── EDIT (PATCH) ─────────────────────────────────────────────
      if (isCoord) {
        res = await patchProgramCoordinator(schoolId, editingEntry?.id ?? schoolProgramId, {
          coordinator_name:      form.name,
          coordinator_email:     form.email,
          coordinator_phone:     form.phone,
          coordinator_alt_phone: form.alt_phone,
        });
      } else {
        res = await patchProgramHeadmaster(schoolId, schoolProgramId, {
          headmaster_name:      form.name,
          headmaster_email:     form.email,
          headmaster_phone:     form.phone,
          headmaster_alt_phone: form.alt_phone,
        });
      }
    }

    if (!res?.success) {
      throw new Error(res?.message || "Save failed");
    }

    Alert.alert(
      "Success",
      `${isCoord ? "Coordinator" : "Headmaster"} ${modalMode === "add" ? "added" : "updated"} successfully`
    );

    setModalVisible(false);
    setForm(EMPTY_FORM);
    await loadContacts(true);   // Refresh the list
  } catch (e: any) {
    console.error("handleSave error:", e);
    Alert.alert("Error", e.message || "Save failed");
  } finally {
    setSaving(false);
  }
};

  const handleDelete = (entry: ContactEntry) => {
    const isCoord = activeTab === "coordinator";
    Alert.alert(
      `Remove ${isCoord ? "Coordinator" : "Headmaster"}`,
      `Remove ${entry.name || "this contact"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              let res;
              if (isCoord) {
                res = await deleteProgramCoordinator(schoolId, entry.id ?? schoolProgramId);
              } else {
                res = await patchProgramHeadmaster(schoolId, entry.id ?? schoolProgramId, {
                  headmaster_name: "", headmaster_email: "",
                  headmaster_phone: "", headmaster_alt_phone: "",
                });
              }
              if (!res?.success) throw new Error(res?.message);
              await loadContacts(true);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Delete failed");
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────
  const currentList  = activeTab === "coordinator" ? coordinators : headmasters;
  const currentPage  = activeTab === "coordinator" ? coordPage    : headPage;
  const setPage      = activeTab === "coordinator" ? setCoordPage : setHeadPage;
  const totalPages   = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const pagedEntries = currentList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ["1%", "51%"],
  });

  const displayName = program?.program_name || program?.program?.name || "Program";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── HEADER ── */}
    <AppHeader 
  title="Program Details" 
  showBack={true}
/>

      {/* ── TAB BAR ── */}
      {showHeadmaster && (
        <View style={s.tabBar}>
          <View style={s.tabTrack}>
            <Animated.View style={[s.tabIndicator, { left: tabIndicatorLeft }]} />
            <TouchableOpacity style={s.tabBtn} onPress={() => switchTab("coordinator")}>
              <MaterialIcons
                name="person-outline"
                size={15}
                color={activeTab === "coordinator" ? "#fff" : "#9CA3AF"}
              />
              <Text style={[s.tabLabel, activeTab === "coordinator" && s.tabLabelActive]}>
                Coordinator
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.tabBtn} onPress={() => switchTab("headmaster")}>
              <MaterialIcons
                name="manage-accounts"
                size={15}
                color={activeTab === "headmaster" ? "#fff" : "#9CA3AF"}
              />
              <Text style={[s.tabLabel, activeTab === "headmaster" && s.tabLabelActive]}>
                Headmaster
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={s.loadingText}>Loading details…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {/* ── Section header ── */}
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <MaterialIcons
                name={activeTab === "coordinator" ? "person-outline" : "manage-accounts"}
                size={16}
                color="#F97316"
              />
            </View>
            <Text style={s.sectionTitle}>
              {activeTab === "coordinator" ? "Coordinators" : "Headmasters"}
            </Text>
            <View style={s.countPill}>
              <Text style={s.countPillText}>{currentList.length} Total</Text>
            </View>
            <TouchableOpacity style={s.sectionAddBtn} onPress={openAdd}>
              <Ionicons name="add" size={14} color="#F97316" />
              <Text style={s.sectionAddText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* ── Table Card ── */}
          {currentList.length === 0 ? (
            <EmptyContactCard tab={activeTab} onAdd={openAdd} />
          ) : (
            <ContactTable
              entries={pagedEntries}
              tab={activeTab}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}

          {/* ── Pagination ── */}
          {currentList.length > PAGE_SIZE && (
            <PaginationBar
              page={currentPage}
              total={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              onPage={(p) => setPage(p)}
            />
          )}

          {/* ── LEVELS SECTION ── */}
          <View style={s.levelsHeader}>
            <Text style={s.levelsTitle}>Levels</Text>
            {!loadingLevels && (
              <View style={s.levelsBadge}>
                <Text style={s.levelsBadgeText}>{levels.length} Levels</Text>
              </View>
            )}
          </View>

          {loadingLevels ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color="#F97316" size="large" />
              <Text style={s.loaderText}>Loading levels…</Text>
            </View>
          ) : levels.length === 0 ? (
            <View style={s.emptyLevels}>
              <Ionicons name="layers-outline" size={40} color="#E5E7EB" />
              <Text style={s.emptyLevelsText}>No levels found for this program</Text>
            </View>
          ) : (
            levels.map((level, idx) => (
              <LevelCard
                key={String(level.id)}
                number={String(idx + 1)}
                title={level.name}
                onPress={() =>
                  navigation.navigate("SectionsManagement", {
                    levelName:    level.name,
                    levelId:      level.id,
                    schoolId,
                    schoolName:   route?.params?.schoolName,
                    programId:    program?.program?.id,
                    programIntId: program?.program_id,
                    programName:  program?.program_name ?? program?.program?.name ?? "",
                    isAdopted:    route?.params?.isAdopted ?? false,
                  })
                }
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <ContactModal
        visible={modalVisible}
        mode={modalMode}
        tab={activeTab}
        programName={displayName}
        form={form}
        errors={formErrors}
        saving={saving}
        onChange={(key, val) => {
          setForm((f) => ({ ...f, [key]: val }));
          if (formErrors[key]) setFormErrors((e) => ({ ...e, [key]: "" }));
        }}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactTable — horizontally scrollable, header aligned with rows
// ─────────────────────────────────────────────────────────────────────────────

// Column config — single source of truth for widths
const COL_WIDTHS = {
  name:    160,
  phone:   120,
  altPhone: 120,
  email:   180,
  actions:  80,
};
const TABLE_MIN_WIDTH =
  COL_WIDTHS.name + COL_WIDTHS.phone + COL_WIDTHS.altPhone +
  COL_WIDTHS.email + COL_WIDTHS.actions;  // = 660

function ContactTable({ entries, tab, onEdit, onDelete }) {
  return (
    <View style={s.tableCard}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        bounces={false}
        contentContainerStyle={{ minWidth: TABLE_MIN_WIDTH }}
      >
        <View style={{ width: TABLE_MIN_WIDTH }}>

          {/* ── Header ── */}
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { width: COL_WIDTHS.name }]}>Name</Text>
            <Text style={[s.tableHeaderCell, { width: COL_WIDTHS.phone }]}>Phone</Text>
            <Text style={[s.tableHeaderCell, { width: COL_WIDTHS.altPhone }]}>Alt. Phone</Text>
            <Text style={[s.tableHeaderCell, { width: COL_WIDTHS.email }]}>Email</Text>
            <Text style={[s.tableHeaderCell, { width: COL_WIDTHS.actions, textAlign: "center" }]}>
              Actions
            </Text>
          </View>

          {/* ── Rows ── */}
          {entries.map((entry, idx) => (
            <ContactRow
              key={entry.id ? String(entry.id) : String(idx)}
              entry={entry}
              isLast={idx === entries.length - 1}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))}

        </View>
      </ScrollView>
    </View>
  );
}

function ContactRow({ entry, isLast, onEdit, onDelete }) {
  const initials = entry.name
    ? entry.name.trim().split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : "?";

  return (
    <View style={[s.tableDataRow, !isLast && s.tableDataRowBorder]}>

      {/* Name */}
      <View style={[s.tableDataCell, { width: COL_WIDTHS.name, flexDirection: "row", alignItems: "center", gap: 8 }]}>
        <View style={s.rowAvatar}>
          <Text style={s.rowAvatarText}>{initials}</Text>
        </View>
        <Text style={[s.tableCellName, { flex: 1 }]} numberOfLines={1}>
          {entry.name || "—"}
        </Text>
      </View>

      {/* Phone */}
      <View style={[s.tableDataCell, { width: COL_WIDTHS.phone }]}>
        <Text style={s.tableCellValue} numberOfLines={1}>
          {entry.phone || "—"}
        </Text>
      </View>

      {/* Alt Phone */}
      <View style={[s.tableDataCell, { width: COL_WIDTHS.altPhone }]}>
        <Text style={s.tableCellValue} numberOfLines={1}>
          {entry.alt_phone || "—"}
        </Text>
      </View>

      {/* Email */}
      <View style={[s.tableDataCell, { width: COL_WIDTHS.email }]}>
        <Text style={s.tableCellValue} numberOfLines={1}>
          {entry.email || "—"}
        </Text>
      </View>

      {/* Actions */}
      <View style={[s.tableDataCell, { width: COL_WIDTHS.actions, flexDirection: "row", gap: 6, justifyContent: "center" }]}>
        <TouchableOpacity style={s.rowEditBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color="#F97316" />
        </TouchableOpacity>
        <TouchableOpacity style={s.rowDeleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PaginationBar
// ─────────────────────────────────────────────────────────────────────────────
function PaginationBar({ page, total, onPrev, onNext, onPage }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <View style={s.pagination}>
      <TouchableOpacity
        style={[s.pageNavBtn, page === 1 && s.pageNavBtnDisabled]}
        onPress={onPrev}
        disabled={page === 1}
      >
        <Ionicons name="chevron-back" size={15} color={page === 1 ? "#D1D5DB" : "#374151"} />
      </TouchableOpacity>

      <View style={s.pageNumbers}>
        {pages.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.pageNumBtn, p === page && s.pageNumBtnActive]}
            onPress={() => onPage(p)}
          >
            <Text style={[s.pageNumText, p === page && s.pageNumTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.pageNavBtn, page === total && s.pageNavBtnDisabled]}
        onPress={onNext}
        disabled={page === total}
      >
        <Ionicons name="chevron-forward" size={15} color={page === total ? "#D1D5DB" : "#374151"} />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyContactCard
// ─────────────────────────────────────────────────────────────────────────────
function EmptyContactCard({ tab, onAdd }) {
  const isCoord = tab === "coordinator";
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="person-add-outline" size={32} color="#F97316" />
      </View>
      <Text style={s.emptyCardTitle}>
        No {isCoord ? "Coordinators" : "Headmasters"} Added
      </Text>
      <Text style={s.emptyCardSub}>
        {isCoord
          ? "Add coordinators to manage this program"
          : "Add headmasters responsible for this program"}
      </Text>
      <TouchableOpacity style={s.emptyCardBtn} onPress={onAdd}>
        <Ionicons name="add" size={15} color="#fff" />
        <Text style={s.emptyCardBtnText}>
          Add {isCoord ? "Coordinator" : "Headmaster"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LevelCard
// ─────────────────────────────────────────────────────────────────────────────
function LevelCard({ number, title, onPress }) {
  return (
    <TouchableOpacity style={s.levelCard} onPress={onPress}>
      <View style={s.levelNumber}>
        <Text style={s.levelNumText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.levelName}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactModal
// ─────────────────────────────────────────────────────────────────────────────
function ContactModal({
  visible, mode, tab, programName, form, errors,
  saving, onChange, onClose, onSave,
}) {
  const isCoord = tab === "coordinator";
  const label   = isCoord ? "Coordinator" : "Headmaster";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalSheet}
        >
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.modalHeader}>
            <View style={s.modalTitleWrap}>
              <View style={s.modalIconBadge}>
                <Ionicons
                  name={isCoord ? "person-outline" : "person-circle-outline"}
                  size={18}
                  color="#F97316"
                />
              </View>
              <View>
                <Text style={s.modalTitle}>
                  {mode === "add" ? `Add ${label}` : `Edit ${label}`}
                </Text>
                <Text style={s.modalSubtitle} numberOfLines={1}>{programName}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={s.modalScroll}>
            <ModalField
              label="Full Name *"
              value={form.name}
              onChange={(v) => onChange("name", v)}
              error={errors.name}
              icon="person-outline"
            />
            <ModalField
              label="Phone"
              value={form.phone}
              onChange={(v) => onChange("phone", v)}
              error={errors.phone}
              keyboard="phone-pad"
              icon="call-outline"
            />
            <ModalField
              label="Alternate Phone"
              value={form.alt_phone}
              onChange={(v) => onChange("alt_phone", v)}
              error={errors.alt_phone}
              keyboard="phone-pad"
              icon="phone-portrait-outline"
            />
            <ModalField
              label="Email"
              value={form.email}
              onChange={(v) => onChange("email", v)}
              error={errors.email}
              keyboard="email-address"
              icon="mail-outline"
            />
          </ScrollView>

          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelModalBtn} onPress={onClose}>
              <Text style={s.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={saving ? undefined : onSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={16} color="#fff" />
              }
              <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ModalField({ label, value, onChange, error, keyboard = "default", icon }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldInputWrap, error && s.fieldInputWrapError]}>
        {icon && (
          <Ionicons name={icon} size={15} color="#9CA3AF" style={{ marginRight: 8 }} />
        )}
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={`Enter ${label.replace(" *", "").toLowerCase()}`}
          placeholderTextColor="#C4C4C4"
          keyboardType={keyboard}
          autoCapitalize="none"
        />
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  addFab: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F97316",
    alignItems: "center", justifyContent: "center",
  },

  // ── Tab bar ──
  tabBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4, bottom: 4,
    width: "48%",
    backgroundColor: "#F97316",
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    zIndex: 1,
  },
  tabLabel:       { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },
  tabLabelActive: { color: "#fff" },

  // ── List ──
  listContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#9CA3AF", marginTop: 12, fontSize: 13 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#FFF4E6",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111827", flex: 1 },
  countPill: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20,
  },
  countPillText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  sectionAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  sectionAddText: { fontSize: 12, fontWeight: "700", color: "#F97316" },

  // ── Table Card ──
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Data row
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  tableDataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  tableDataCell: {
    justifyContent: "center",
    paddingRight: 6,
  },

  // Row avatar
  rowAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#FDE7D8",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  rowAvatarText: { fontSize: 10, fontWeight: "800", color: "#F97316" },

  tableCellName: {
    fontSize: 12, fontWeight: "700", color: "#111827", flex: 1,
  },
  tableCellValue: {
    fontSize: 12, fontWeight: "500", color: "#374151",
  },
  tableCellEmpty: {
    fontSize: 12, color: "#D1D5DB", fontStyle: "italic",
  },

  // Action buttons in row
  rowEditBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#FFF4E6",
    alignItems: "center", justifyContent: "center",
  },
  rowDeleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center",marginRight: 16,
  },

  // ── Pagination ──
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  pageNavBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pageNavBtnDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#F3F4F6",
  },
  pageNumbers: {
    flexDirection: "row",
    gap: 4,
  },
  pageNumBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pageNumBtnActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  pageNumText: {
    fontSize: 13, fontWeight: "600", color: "#374151",
  },
  pageNumTextActive: {
    color: "#fff",
  },

  // ── Empty Contact Card ──
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  emptyIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#FFF4E6",
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 6 },
  emptyCardSub: {
    fontSize: 13, color: "#9CA3AF",
    textAlign: "center", lineHeight: 20, marginBottom: 20,
  },
  emptyCardBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F97316",
    paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: 12,
  },
  emptyCardBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // ── Levels ──
  levelsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelsTitle:     { fontSize: 17, fontWeight: "800", color: "#111827" },
  levelsBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  levelsBadgeText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  loaderWrap:      { alignItems: "center", paddingVertical: 32 },
  loaderText:      { color: "#9CA3AF", marginTop: 8, fontSize: 13 },
  emptyLevels:     { alignItems: "center", paddingVertical: 32 },
  emptyLevelsText: { color: "#9CA3AF", marginTop: 8, fontSize: 13 },

  levelCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  levelNumber: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#FDE7D8",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  levelNumText: { color: "#F97316", fontWeight: "700", fontSize: 14 },
  levelName:    { fontWeight: "700", fontSize: 15, color: "#111827" },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIconBadge: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: "#FFF4E6",
    alignItems: "center", justifyContent: "center",
  },
  modalTitle:    { fontSize: 16, fontWeight: "800", color: "#111827" },
  modalSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },

  // ── Modal fields ──
  modalScroll:   { maxHeight: 380 },
  fieldWrap:     { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: "#6B7280",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12, paddingHorizontal: 13, paddingVertical: 0,
    borderWidth: 1.5, borderColor: "transparent",
  },
  fieldInputWrapError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  fieldInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14, color: "#111827",
  },
  fieldError: { fontSize: 11, color: "#EF4444", marginTop: 4 },

  // ── Modal actions ──
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelModalBtn: {
    flex: 1, paddingVertical: 13,
    backgroundColor: "#F3F4F6", borderRadius: 12,
    alignItems: "center",
  },
  cancelModalText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  saveBtn: {
    flex: 2,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#F97316", borderRadius: 12,
    paddingVertical: 13,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: "#fff", fontWeight: "800", fontSize: 14 },
});