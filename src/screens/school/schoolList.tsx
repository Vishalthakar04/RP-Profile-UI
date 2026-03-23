// screens/Schools.tsx
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAssignedSchools } from '../../services/school';
import { useVisit } from '../../context/VisitContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface School {
  id: string;
  school_name: string;
  address?: string;
  zone?: string;
  school_type?: string;
  school_status?: string;
  last_visited_on?: string | null;
  // normalized aliases
  status?: string;
  last_visited?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Schools() {
  const navigation = useNavigation<any>();
  const { visitId, currentSchool } = useVisit(); // ✅ read active visit state

  const [schools, setSchools]       = useState<School[]>([]);
  const [filtered, setFiltered]     = useState<School[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [activeZone,   setActiveZone]   = useState<string | null>(null);
  const [activeType,   setActiveType]   = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  // ── Load schools via service ──────────────────────────────────────────────
  const loadSchools = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await getAssignedSchools();

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to load schools.');
      }

      const data: School[] = res.data.map((s: any) => ({
        ...s,
        status:       s.school_status,
        last_visited: s.last_visited_on,
      }));

      setSchools(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load schools.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadSchools(); }, []);

  // ── Search & filter ──────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...schools];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s =>
          s.school_name?.toLowerCase().includes(q) ||
          s.id.includes(q),
      );
    }
    if (activeZone)   result = result.filter(s => s.zone === activeZone);
    if (activeType)   result = result.filter(s => s.school_type === activeType);
    if (activeStatus) result = result.filter(s => s.status === activeStatus);

    setFiltered(result);
  }, [search, schools, activeZone, activeType, activeStatus]);

  // ── Derived filter options ───────────────────────────────────────────────
  const zones    = [...new Set(schools.map(s => s.zone).filter(Boolean))]        as string[];
  const types    = [...new Set(schools.map(s => s.school_type).filter(Boolean))] as string[];
  const statuses = [...new Set(schools.map(s => s.status).filter(Boolean))]      as string[];

  const hasActiveFilter = !!(search.trim() || activeZone || activeType || activeStatus);

  const cycleFilter = (
    options: string[],
    current: string | null,
    setter: (v: string | null) => void,
  ) => {
    if (!options.length) return;
    if (!current) { setter(options[0]); return; }
    const idx = options.indexOf(current);
    setter(idx + 1 < options.length ? options[idx + 1] : null);
  };

  const clearAllFilters = () => {
    setSearch('');
    setActiveZone(null);
    setActiveType(null);
    setActiveStatus(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="search" size={20} color="#F97316" />
        <TextInput
          placeholder="Search schools by name or ID"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* FILTERS */}
      <View style={styles.filterRow}>
        <FilterButton
          label={activeZone ?? 'Zone'}
          active={!!activeZone}
          onPress={() => cycleFilter(zones, activeZone, setActiveZone)}
        />
        <FilterButton
          label={activeType ?? 'School Type'}
          active={!!activeType}
          onPress={() => cycleFilter(types, activeType, setActiveType)}
        />
        <FilterButton
          label={activeStatus ?? 'Status'}
          active={!!activeStatus}
          onPress={() => cycleFilter(statuses, activeStatus, setActiveStatus)}
        />
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading schools…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={56} color="#F97316" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadSchools()}>
            <Icon name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filtered.length === 0
              ? styles.scrollEmpty
              : { paddingBottom: 120 }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadSchools(false); }}
              colors={['#F97316']}
              tintColor="#F97316"
            />
          }
        >
          {filtered.length === 0 ? (

            /* ── EMPTY STATE ─────────────────────────────────────────────── */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Icon name="school-outline" size={48} color="#F97316" />
              </View>

              <Text style={styles.emptyTitle}>
                {hasActiveFilter ? 'No Matches Found' : 'No Schools Assigned'}
              </Text>

              <Text style={styles.emptySubText}>
                {hasActiveFilter
                  ? 'No schools match your current search\nor filters. Try adjusting them.'
                  : 'There are no schools assigned to\nyour account yet. Pull down to refresh.'}
              </Text>

              {hasActiveFilter && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={clearAllFilters}
                >
                  <Icon name="close-circle-outline" size={16} color="#fff" />
                  <Text style={styles.clearBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}

              {!hasActiveFilter && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => loadSchools()}
                >
                  <Icon name="refresh-outline" size={16} color="#fff" />
                  <Text style={styles.clearBtnText}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>

          ) : (
            filtered.map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                navigation={navigation}
                activeVisitSchoolId={visitId ? currentSchool?.id ?? null : null} // ✅ pass active school id
              />
            ))
          )}
        </ScrollView>
      )}

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <NavItem icon="school" label="SCHOOLS" active />
      </View>

    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterButton({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
      <Icon
        name={active ? 'close-circle' : 'chevron-down'}
        size={16}
        color={active ? '#fff' : '#F97316'}
      />
    </TouchableOpacity>
  );
}

function SchoolCard({
  school,
  navigation,
  activeVisitSchoolId, // ✅ new prop
}: {
  school: School;
  navigation: any;
  activeVisitSchoolId?: string | null; // ✅ new prop type
}) {
  const { setCurrentSchool } = useVisit();
  const isInProgress = activeVisitSchoolId === school.id; // ✅ true only for the active school

  const schoolPayload = {
    id:      school.id,
    name:    school.school_name,
    address: school.address,
  };

  const goTo = (screen: string) => {
    setCurrentSchool(schoolPayload);
    navigation.navigate(screen, { school: schoolPayload });
  };

  return (
    <View style={styles.card}>

      {/* ✅ IN PROGRESS badge — top-right, only on the active visit school */}
      {isInProgress && (
        <View style={styles.inProgressBadge}>
          <View style={styles.inProgressDot} />
          <Text style={styles.inProgressText}>IN PROGRESS</Text>
        </View>
      )}

      <Text style={styles.schoolName}>{school.school_name}</Text>

      {school.address && (
        <View style={styles.row}>
          <Icon name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.subText}>{school.address}</Text>
        </View>
      )}

      {(school.zone || school.school_type) && (
        <View style={styles.tagRow}>
          {school.zone && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{school.zone}</Text>
            </View>
          )}
          {school.school_type && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{school.school_type}</Text>
            </View>
          )}
          {school.status && (
            <View style={[
              styles.tag,
              school.status === 'ACTIVE' ? styles.tagActive : styles.tagInactive,
            ]}>
              <Text style={styles.tagText}>{school.status}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => goTo('SchoolDetails')}
  >
    <Icon name="information-circle-outline" size={20} color="#F97316" />
    <Text style={styles.actionText}>DETAILS</Text>
  </TouchableOpacity>

  {/* ✅ NEW: Sections button */}
  <TouchableOpacity
    style={[styles.actionBtn, styles.actionBtnSections]}
    onPress={() => goTo('ProgramsList')}
  >
    <Icon name="grid-outline" size={20} color="#16A34A" />
    <Text style={[styles.actionText, styles.actionTextSections]}>SECTIONS</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => goTo('ModuleProgress')}
  >
    <Icon name="bar-chart-outline" size={20} color="#F97316" />
    <Text style={styles.actionText}>PROGRESS</Text>
  </TouchableOpacity>
</View>

      <TouchableOpacity
        style={[styles.startBtn, isInProgress && styles.startBtnActive]} // ✅ tint button when in progress
        onPress={() => goTo('VisitCheckin')}
      >
        <Icon name={isInProgress ? 'arrow-forward-circle' : 'location'} size={18} color="#fff" />
        <Text style={styles.startText}>
          {isInProgress ? 'Continue Visit' : 'Start Visit'} {/* ✅ dynamic label */}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

function NavItem({
  icon, label, active, onPress,
}: { icon: string; label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={active ? styles.navItemActive : styles.navItem}
      onPress={onPress}
    >
      <Icon name={icon} size={22} color={active ? '#F97316' : '#9CA3AF'} />
      <Text style={active ? styles.navTextActive : styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 20, paddingHorizontal: 15, paddingVertical: 12,
    borderRadius: 14, marginTop: 10, marginBottom: 15,
  },
  searchInput: { marginLeft: 10, flex: 1, color: '#111827' },

  filterRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEAD5',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  filterBtnActive: { backgroundColor: '#F97316' },
  filterText: { marginRight: 5, color: '#F97316', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },

  // ── Center states ──
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  errorTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#111827' },
  errorText: { marginTop: 6, color: '#EF4444', textAlign: 'center', fontSize: 13 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20, backgroundColor: '#F97316',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Empty state ──
  scrollEmpty: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingBottom: 120,
  },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    marginBottom: 8, textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F97316',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  clearBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Card ──
  card: {
    backgroundColor: '#fff', marginHorizontal: 20,
    padding: 18, borderRadius: 18, marginBottom: 20,
  },
  schoolName: { fontSize: 18, fontWeight: '700', marginVertical: 6, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  subText: { marginLeft: 6, color: '#6B7280', flex: 1 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  tag: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 8,
  },
  tagActive:   { backgroundColor: '#D1FAE5' },
  tagInactive: { backgroundColor: '#FEE2E2' },
  tagText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  actionBtn: {
  backgroundColor: '#FFF4E6', paddingVertical: 14,
  borderRadius: 14, alignItems: 'center', width: '31%', // ← was 48%
},
  actionBtnSections: {
  backgroundColor: '#F0FDF4',
  borderWidth: 1.5,
  borderColor: '#86EFAC',
},
actionTextSections: { color: '#16A34A' },
  actionText: { marginTop: 5, fontSize: 11, color: '#F97316', fontWeight: '600' },

  startBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 14,
  },
  startBtnActive: { // ✅ slightly deeper orange when visit is in progress
    backgroundColor: '#EA6C00',
  },
  startText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  // ✅ IN PROGRESS badge styles
  inProgressBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF4E6',
    borderWidth: 1.5,
    borderColor: '#F97316',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  inProgressDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F97316',
  },
  inProgressText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.5,
  },

  // ── Bottom nav ──
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff',
    paddingVertical: 12, borderTopWidth: 1, borderColor: '#E5E7EB',
  },
  navItem:       { alignItems: 'center' },
  navItemActive: { alignItems: 'center' },
  navText:       { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  navTextActive: { fontSize: 11, color: '#F97316', marginTop: 4 },
});