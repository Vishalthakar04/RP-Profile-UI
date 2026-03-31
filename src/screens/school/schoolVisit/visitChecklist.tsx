// screens/visit/VisitChecklist.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useVisit } from "../../../context/VisitContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import SchoolBanner from "../../../components/SchoolBanner";
import AppHeader from "../../../components/AppHeader";
import StepBar from "../../../components/StepBar";
import {
  getVisitChecklist,
  updateChecklistItem,
  type ChecklistItemKey,
  type ChecklistData,
} from "../../../services/observation";

// ─── Map backend keys → display config ───────────────────────────────────────

type ConfigItem = {
  key: ChecklistItemKey | "observation_completed" | "media_uploaded";
  icon: string;
  title: string;
  patchable: boolean;
};

const CHECKLIST_CONFIG: ConfigItem[] = [
  { key: "principal_verified",    icon: "shield-checkmark", title: "Principal Details Verified",   patchable: true  },
  { key: "headmaster_verified",   icon: "person",           title: "Headmaster Details Verified",  patchable: true  },
  { key: "coordinator_verified",  icon: "people",           title: "Coordinator Details Verified", patchable: true  },
  { key: "sections_verified",     icon: "list",             title: "Sections & Strength Verified", patchable: true  },
  { key: "teacher_verified",      icon: "card",             title: "Teacher Assignment Verified",  patchable: true  },
  { key: "observation_completed", icon: "eye",              title: "Observation Completed",        patchable: false },
  { key: "media_uploaded",        icon: "images",           title: "Media Uploaded",               patchable: false },
];

// ─── Checklist Item ───────────────────────────────────────────────────────────

type ItemProps = {
  icon: string;
  title: string;
  verified: boolean;
  patchable: boolean;
  updating: boolean;
  subError?: string | null;
  onPress: () => void;
};

function ChecklistItem({ icon, title, verified, patchable, updating, subError, onPress }: ItemProps) {
  return (
    <View style={[s.cardWrapper, !verified && s.cardWrapperError]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={patchable ? 0.8 : 1}
        style={s.card}
        disabled={!patchable || updating}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, !verified && s.iconBoxError]}>
            <Ionicons name={icon as any} size={20} color="#fff" />
          </View>

          <View style={s.cardTextWrap}>
            <Text style={[s.cardTitle, !verified && s.cardTitleError]}>{title}</Text>
            {!verified && subError ? (
              <Text style={s.subErrorText}>{subError}</Text>
            ) : null}
            {!patchable && (
              <Text style={s.computedText}>Auto-computed</Text>
            )}
          </View>

          {updating ? (
            <ActivityIndicator size="small" color="#F97316" />
          ) : (
            <Ionicons
              name={verified ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={verified ? "#22C55E" : "#EF4444"}
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VisitChecklist() {
  const navigation = useNavigation<any>();
  const route      = useRoute();
  const { setLastScreen } = useVisit();

  const { currentSchool, visitId: contextVisitId } = useVisit();
  const { visitId: routeVisitId } = (route.params ?? {}) as { visitId?: string | number };
  const visitId = routeVisitId ?? contextVisitId;

  const [checklist,   setChecklist]   = useState<ChecklistData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    setLastScreen({ name: "VisitChecklist", params: { visitId } });
  }, [visitId]);

  // ── Load checklist from API ─────────────────────────────────────────────
  const loadChecklist = useCallback(async () => {
    if (!visitId) {
      Alert.alert("Error", "Visit ID missing");
      return;
    }
    setLoading(true);
    try {
      const res = await getVisitChecklist(visitId);
      if (res?.success && res.data) {
        setChecklist(res.data);
      } else {
        Alert.alert("Error", res?.message || "Failed to load checklist");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // ── Toggle a patchable item ─────────────────────────────────────────────
  const handleToggle = async (key: ChecklistItemKey) => {
    if (!visitId || !checklist) return;

    const current  = checklist.checklist[key]?.completed ?? false;
    const newValue = !current;

    setUpdatingKey(key);

    // Optimistic update locally
    setChecklist(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          [key]: { ...prev.checklist[key], completed: newValue },
        },
      };
    });

    const res = await updateChecklistItem(visitId, key, newValue);

    if (!res?.success) {
      // Roll back on failure
      setChecklist(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          checklist: {
            ...prev.checklist,
            [key]: { ...prev.checklist[key], completed: current },
          },
        };
      });
      Alert.alert("Error", res?.message || "Failed to update");
    }

    setUpdatingKey(null);
  };

  // ── Derived counts ──────────────────────────────────────────────────────
  const totalItems    = CHECKLIST_CONFIG.length;
  const verifiedCount = checklist
    ? CHECKLIST_CONFIG.filter(c => checklist.checklist[c.key]?.completed).length
    : 0;

  // ── Finish visit — always allowed ───────────────────────────────────────
  const finishVisit = () => {
    if (!visitId) {
      Alert.alert("Error", "Visit ID missing. Please restart the visit.");
      return;
    }
    console.log('[VisitChecklist] navigating to FinishVisit with visitId:', visitId);
    navigation.navigate("FinishVisit", { visitId });
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <AppHeader title="Visit Checklist" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={{ color: "#9CA3AF", marginTop: 10 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Checklist" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <StepBar current={5} />
        <SchoolBanner />

        <Text style={s.title}>Final School Checklist</Text>
        <Text style={s.subtitle}>
          Review all tasks before finishing the visit.
        </Text>

        {/* Progress card */}
        <View style={s.progressCard}>
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>Checklist Progress</Text>
            <Text style={s.progressCount}>
              <Text style={{ color: "#F97316", fontWeight: "800" }}>{verifiedCount}</Text>
              /{totalItems} verified
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(verifiedCount / totalItems) * 100}%` as any }]} />
          </View>
        </View>

        {CHECKLIST_CONFIG.map((config) => {
          const entry    = checklist?.checklist[config.key];
          const verified = entry?.completed ?? false;

          let subError: string | null = null;
          if (config.key === "observation_completed" && !verified && entry?.detail?.length) {
            const pending = entry.detail.filter((d: any) => !d.isComplete);
            subError = pending.map((d: any) => d.message).join(" · ");
          }
          if (config.key === "teacher_verified" && !verified) {
            subError = "Assignments pending";
          }

          return (
            <ChecklistItem
              key={config.key}
              icon={config.icon}
              title={config.title}
              verified={verified}
              patchable={config.patchable}
              updating={updatingKey === config.key}
              subError={subError}
              onPress={() => {
                if (config.patchable) handleToggle(config.key as ChecklistItemKey);
              }}
            />
          );
        })}
      </ScrollView>

      {/* Bottom area */}
      <View style={s.bottomArea}>
        <TouchableOpacity
          style={s.finishBtn}
          onPress={finishVisit}
          activeOpacity={0.85}
        >
          <Text style={s.finishText}>Finish Visit</Text>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },

  title:    { fontSize: 26, fontWeight: "800", color: "#111827", marginHorizontal: 20, marginTop: 12, marginBottom: 6, textAlign: "center" },
  subtitle: { color: "#6B7280", fontSize: 13.5, marginHorizontal: 30, marginBottom: 16, textAlign: "center", lineHeight: 20 },

  progressCard:  { marginHorizontal: 16, marginBottom: 18, backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  progressInfo:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  progressCount: { fontSize: 13, color: "#374151" },
  progressTrack: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#F97316", borderRadius: 3 },

  cardWrapper:      { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardWrapperError: { backgroundColor: "#FFF1F2", elevation: 0, shadowOpacity: 0 },
  card:             { padding: 14 },
  cardRow:          { flexDirection: "row", alignItems: "center" },
  iconBox:          { width: 42, height: 42, borderRadius: 12, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", marginRight: 14 },
  iconBoxError:     { backgroundColor: "#EF4444" },
  cardTextWrap:     { flex: 1 },
  cardTitle:        { fontWeight: "600", fontSize: 15, color: "#111827" },
  cardTitleError:   { fontWeight: "700", color: "#111827" },
  subErrorText:     { color: "#EF4444", fontSize: 12, marginTop: 2 },
  computedText:     { color: "#9CA3AF", fontSize: 11, marginTop: 2 },

  bottomArea: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#F3F4F6", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  finishBtn:  { backgroundColor: "#F97316", paddingVertical: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#F97316", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  finishText: { fontWeight: "800", color: "#fff", fontSize: 16 },
});