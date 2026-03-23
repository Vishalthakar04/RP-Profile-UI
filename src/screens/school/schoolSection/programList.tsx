// src/screens/school/ProgramsList.tsx

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import AppHeader from '../../../components/AppHeader';
import { useVisit } from '../../../context/VisitContext';
import { getSchoolPrograms } from '../../../services/school';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  program_id: string | number;
  program_name: string;
  status?: string;
  program?: {
    id: string;
    name: string;
    type?: string;
    duration_years?: number;
  };
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const getProgramColors = (name: string) => {
  const n = name?.toLowerCase() ?? '';
  if (n.includes('acp') || n.includes('advanced'))  return { bg: '#FFEAD5', text: '#C2410C', border: '#FED7AA' };
  if (n.includes('foundational'))                    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
  if (n.includes('stem'))                            return { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' };
  return { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' };
};

const getStatusColors = (status?: string) => {
  if (!status) return { bg: '#F3F4F6', text: '#6B7280' };
  switch (status.toUpperCase()) {
    case 'ACTIVE':   return { bg: '#D1FAE5', text: '#065F46' };
    case 'INACTIVE': return { bg: '#FEE2E2', text: '#991B1B' };
    case 'PENDING':  return { bg: '#FEF9C3', text: '#854D0E' };
    default:         return { bg: '#F3F4F6', text: '#6B7280' };
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgramsList() {
  const navigation  = useNavigation<any>();
  const { currentSchool } = useVisit();

  const [programs,   setPrograms]   = useState<Program[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => { loadPrograms(); }, []);

  const loadPrograms = async (showSpinner = true) => {
    if (!currentSchool?.id) {
      setError('School ID missing');
      setLoading(false);
      return;
    }

    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const res = await getSchoolPrograms(currentSchool.id);

      if (!res?.success) {
        throw new Error(res?.message ?? 'Failed to load programs');
      }

      setPrograms(res.data ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppHeader title="Sections / Programs" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading programs…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={56} color="#F97316" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadPrograms()}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            programs.length === 0 ? styles.scrollEmpty : styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadPrograms(false); }}
              colors={['#F97316']}
              tintColor="#F97316"
            />
          }
        >
          {/* School name sub-header */}
          {programs.length > 0 && (
            <View style={styles.schoolRow}>
              <View style={styles.schoolIconBox}>
                <Ionicons name="school" size={16} color="#F97316" />
              </View>
              <Text style={styles.schoolName} numberOfLines={1}>
                {currentSchool?.name}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{programs.length}</Text>
              </View>
            </View>
          )}

          {programs.length === 0 ? (
            /* ── Empty state ──────────────────────────────────────────────── */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="grid-outline" size={40} color="#F97316" />
              </View>
              <Text style={styles.emptyTitle}>No Programs Found</Text>
              <Text style={styles.emptySubText}>
                There are no programs assigned to{'\n'}this school yet.
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => loadPrograms()}>
                <Ionicons name="refresh-outline" size={15} color="#fff" />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            programs.map((p, i) => <ProgramCard key={String(p.id ?? i)} program={p} navigation={navigation} currentSchool={currentSchool} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── ProgramCard ──────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  navigation,
  currentSchool,
}: {
  program: Program;
  navigation: any;
  currentSchool: any;
}) {
  const displayName = program.program_name || program.program?.name || 'Unknown Program';
  const short       = displayName.substring(0, 3).toUpperCase();
  const colors      = getProgramColors(displayName);
  const statusColors = getStatusColors(program.status);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('ProgramDetails', {
          program,
          schoolId:   currentSchool?.id,
          schoolName: currentSchool?.name,
        })
      }
    >
      {/* Left: color icon */}
      <View style={[styles.programIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.programIconText, { color: colors.text }]}>{short}</Text>
      </View>

      {/* Middle: info */}
      <View style={styles.programInfo}>
        <Text style={styles.programName} numberOfLines={1}>{displayName}</Text>

        <View style={styles.metaRow}>
          {program.program?.type ? (
            <View style={styles.metaChip}>
              <Ionicons name="layers-outline" size={11} color="#6B7280" />
              <Text style={styles.metaChipText}>{program.program.type}</Text>
            </View>
          ) : null}
          {program.program?.duration_years ? (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={11} color="#6B7280" />
              <Text style={styles.metaChipText}>{program.program.duration_years} yrs</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right: status + chevron */}
      <View style={styles.rightCol}>
        {program.status ? (
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {program.status}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { paddingBottom: 120, paddingTop: 6 },
  scrollEmpty:  { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 120 },

  // ── Center states ──
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  errorTitle:  { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#111827' },
  errorText:   { marginTop: 6, color: '#EF4444', textAlign: 'center', fontSize: 13 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20, backgroundColor: '#F97316',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── School sub-header ──
  schoolRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12, marginTop: 8,
  },
  schoolIconBox: {
    backgroundColor: '#FFEAD5', padding: 6,
    borderRadius: 8, marginRight: 8,
  },
  schoolName: {
    flex: 1, fontSize: 14, fontWeight: '700', color: '#111827',
  },
  countBadge: {
    backgroundColor: '#FFEAD5', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 20,
  },
  countText: { fontSize: 12, fontWeight: '700', color: '#F97316' },

  // ── Card ──
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20, marginBottom: 10,
    padding: 14, borderRadius: 16,
    borderWidth: 0.5, borderColor: '#E5E7EB',
  },

  programIcon: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  programIconText: { fontSize: 13, fontWeight: '700' },

  programInfo: { flex: 1 },
  programName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 5 },

  metaRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  metaChipText: { fontSize: 11, color: '#6B7280' },

  rightCol: { alignItems: 'flex-end', marginLeft: 8 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // ── Empty state ──
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F97316',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});