// screens/Schools.tsx
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import React, { useEffect, useState,useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  latitude?: number;
  longitude?: number;
  status?: string;
  last_visited?: string;
  active_visit?: {
  visit_id: string;
  visit_status: string;
  check_in_time: string;
  check_out_time?: string;
} | null;
is_adopted?: boolean;
payment_category?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Schools() {
  const navigation = useNavigation<any>();
  const { visitId, currentSchool } = useVisit();

  const [schools, setSchools]       = useState<School[]>([]);
  const [filtered, setFiltered]     = useState<School[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [activeType, setActiveType]         = useState<string | null>(null);
const [activeVisitStatus, setActiveVisitStatus] = useState<string | null>(null);
const [dropdownOpen, setDropdownOpen]     = useState(false);
const [visitDropdownOpen, setVisitDropdownOpen] = useState(false);

  // ── Load schools ─────────────────────────────────────────────────────────
  const loadSchools = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await getAssignedSchools();
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to load schools.');

   const data: School[] = res.data.map((s: any) => ({
  ...s,
  status:       s.school_status,
  last_visited: s.last_visited_on ?? s.active_visit?.check_in_time ?? null,
  active_visit: s.active_visit ?? null,
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

  useFocusEffect(
  useCallback(() => {
    loadSchools();
  }, [])
);

  // ── Search & filter ──────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...schools];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s => s.school_name?.toLowerCase().includes(q) || s.id.includes(q),
      );
    }
    if (activeType) result = result.filter(s => s.school_type === activeType);
// CHANGE TO:
if (activeVisitStatus) {
  result = result.filter(s =>
    s.active_visit?.visit_status?.trim().toLowerCase() === activeVisitStatus.trim().toLowerCase()
  );
}
    setFiltered(result);
  }, [search, schools, activeType, activeVisitStatus]);

  const types = [...new Set(schools.map(s => s.school_type).filter(Boolean))] as string[];
 const hasActiveFilter = !!(search.trim() || activeType || activeVisitStatus);

const clearAllFilters = () => {
  setSearch('');
  setActiveType(null);
  setActiveVisitStatus(null);
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

      {/* FILTER DROPDOWNS */}
<View style={styles.filterRow}>
  <TouchableOpacity
    style={[styles.dropdownTrigger, activeType ? styles.dropdownTriggerActive : null]}
    onPress={() => setDropdownOpen(true)}
    activeOpacity={0.85}
  >
          {/* <Icon
            name="school-outline"
            size={16}
            color={activeType ? '#fff' : '#F97316'}
          /> */}
          <Text
            style={[styles.dropdownTriggerText, activeType ? styles.dropdownTriggerTextActive : null]}
            numberOfLines={1}
          >
            {activeType ?? 'Types'}
          </Text>
          {activeType ? (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setActiveType(null)}
            >
              <Icon name="close-circle" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-down" size={16} color="#F97316" />
          )}
        </TouchableOpacity>

        {/* Visit status filter trigger */}
        <TouchableOpacity
          style={[styles.dropdownTrigger, activeVisitStatus ? styles.dropdownTriggerActive : null]}
          onPress={() => setVisitDropdownOpen(true)}
          activeOpacity={0.85}
        >
          {/* <Icon name="flag-outline" size={16} color={activeVisitStatus ? '#fff' : '#F97316'} /> */}
          <Text style={[styles.dropdownTriggerText, activeVisitStatus ? styles.dropdownTriggerTextActive : null]} numberOfLines={1}>
            {activeVisitStatus ?? 'Status'}
          </Text>
          {activeVisitStatus ? (
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setActiveVisitStatus(null)}>
              <Icon name="close-circle" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-down" size={16} color="#F97316" />
          )}
        </TouchableOpacity>

        {/* Results count badge */}
        <View style={styles.resultsBadge}>
          <Text style={styles.resultsBadgeText}>{filtered.length} schools</Text>
        </View>
      </View>

      {/* DROPDOWN MODAL */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>

                {/* Sheet header */}
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Filter by School Type</Text>
                  <TouchableOpacity
                    onPress={() => setDropdownOpen(false)}
                    style={styles.sheetClose}
                  >
                    <Icon name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* All option */}
                <TouchableOpacity
                  style={[styles.sheetItem, !activeType && styles.sheetItemActive]}
                  onPress={() => { setActiveType(null); setDropdownOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sheetItemIcon, !activeType && styles.sheetItemIconActive]}>
                    <Icon name="apps-outline" size={16} color={!activeType ? '#fff' : '#9CA3AF'} />
                  </View>
                  <Text style={[styles.sheetItemText, !activeType && styles.sheetItemTextActive]}>
                    All School Types
                  </Text>
                  {!activeType && (
                    <View style={styles.checkCircle}>
                      <Icon name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.sheetDivider} />

                {/* Type options */}
                {types.map((type, index) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.sheetItem,
                      activeType === type && styles.sheetItemActive,
                      index === types.length - 1 && { marginBottom: 0 },
                    ]}
                    onPress={() => { setActiveType(type); setDropdownOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sheetItemIcon, activeType === type && styles.sheetItemIconActive]}>
                      <Icon name="school-outline" size={16} color={activeType === type ? '#fff' : '#9CA3AF'} />
                    </View>
                    <Text style={[styles.sheetItemText, activeType === type && styles.sheetItemTextActive]}>
                      {type}
                    </Text>
                    {activeType === type && (
                      <View style={styles.checkCircle}>
                        <Icon name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    {/* VISIT STATUS DROPDOWN MODAL */}
<Modal
  visible={visitDropdownOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setVisitDropdownOpen(false)}
>
  <TouchableWithoutFeedback onPress={() => setVisitDropdownOpen(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.modalSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by Visit Status</Text>
            <TouchableOpacity onPress={() => setVisitDropdownOpen(false)} style={styles.sheetClose}>
              <Icon name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* All option */}
          <TouchableOpacity
            style={[styles.sheetItem, !activeVisitStatus && styles.sheetItemActive]}
            onPress={() => { setActiveVisitStatus(null); setVisitDropdownOpen(false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetItemIcon, !activeVisitStatus && styles.sheetItemIconActive]}>
              <Icon name="apps-outline" size={16} color={!activeVisitStatus ? '#fff' : '#9CA3AF'} />
            </View>
            <Text style={[styles.sheetItemText, !activeVisitStatus && styles.sheetItemTextActive]}>All</Text>
            {!activeVisitStatus && <View style={styles.checkCircle}><Icon name="checkmark" size={12} color="#fff" /></View>}
          </TouchableOpacity>

          <View style={styles.sheetDivider} />

          {[
            { label: 'In Progress', value: 'In Progress',  icon: 'radio-button-on-outline',  color: '#F97316' },
            { label: 'Incomplete',  value: 'incomplete',   icon: 'alert-circle-outline',      color: '#EAB308' },
            { label: 'Completed',   value: 'completed',    icon: 'checkmark-circle-outline',  color: '#16A34A' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetItem, activeVisitStatus === opt.value && styles.sheetItemActive]}
              onPress={() => { setActiveVisitStatus(opt.value); setVisitDropdownOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetItemIcon, activeVisitStatus === opt.value && styles.sheetItemIconActive]}>
                <Icon name={opt.icon} size={16} color={activeVisitStatus === opt.value ? '#fff' : '#9CA3AF'} />
              </View>
              <Text style={[styles.sheetItemText, activeVisitStatus === opt.value && styles.sheetItemTextActive]}>
                {opt.label}
              </Text>
              {activeVisitStatus === opt.value && <View style={styles.checkCircle}><Icon name="checkmark" size={12} color="#fff" /></View>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

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
            filtered.length === 0 ? styles.scrollEmpty : { paddingBottom: 120 }
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
              {hasActiveFilter ? (
                <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters}>
                  <Icon name="close-circle-outline" size={16} color="#fff" />
                  <Text style={styles.clearBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.clearBtn} onPress={() => loadSchools()}>
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
/>
            ))
          )}
        </ScrollView>
      )}

      {/* BOTTOM NAV */}
      {/* <View style={styles.bottomNav}>
        <NavItem icon="school" label="SCHOOLS" active />
      </View> */}

    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SchoolCard({
  school, navigation,
}: {
  school: School; navigation: any;
}) {
  const { setCurrentSchool } = useVisit();
  const isInProgress = school.active_visit?.visit_status === 'In Progress';


  // SchoolCard — schoolPayload
const schoolPayload = {
  id:         school.id,
  name:       school.school_name,
  address:    school.address,
  latitude:   school.latitude,
  longitude:  school.longitude,
  is_adopted: school.is_adopted ?? false,   // ← ADD
};

  const goTo = (screen: string) => {
    setCurrentSchool(schoolPayload);
    navigation.navigate(screen, { school: schoolPayload });
  };

  return (
    <View style={styles.card}>
     

      <Text style={styles.schoolName}>{school.school_name}</Text>

      {school.address && (
        <View style={styles.row}>
          <Icon name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.subText}>{school.address}</Text>
        </View>
      )}
<View style={styles.tagRow}>
  {school.school_type && (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{school.school_type}</Text>
    </View>
  )}
  {/* Visit status — only show if In Progress or incomplete */}
  {school.active_visit?.visit_status &&
    ['In Progress', 'incomplete'].includes(school.active_visit.visit_status) && (
    <View style={[styles.tag, {
      backgroundColor:
        school.active_visit.visit_status === 'In Progress' ? '#FFF4E6' : '#FEF9C3',
      borderWidth: 1,
      borderColor:
        school.active_visit.visit_status === 'In Progress' ? '#F97316' : '#EAB308',
    }]}>
      <Text style={[styles.tagText, {
        color: school.active_visit.visit_status === 'In Progress' ? '#F97316' : '#854D0E',
      }]}>
        {school.active_visit.visit_status === 'In Progress' ? 'In Progress' : 'Incomplete'}
      </Text>
    </View>
  )}
  {/* Payment category */}
  {school.payment_category && (
    <View style={[styles.tag, { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }]}>
      <Text style={[styles.tagText, { color: '#1D4ED8' }]}>
        Category {school.payment_category}
      </Text>
    </View>
  )}
  {school.last_visited && (
    <View style={styles.lastVisitedTag}>
      <Icon name="time-outline" size={11} color="#6B7280" />
      <Text style={styles.lastVisitedText}>
        {new Date(school.last_visited).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        })}
      </Text>
    </View>
  )}
</View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => goTo('SchoolDetails')}>
          <Icon name="information-circle-outline" size={20} color="#F97316" />
          <Text style={styles.actionText}>DETAILS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => goTo('ProgramsList')}>
          <Icon name="grid-outline" size={20} color="#F97316" />
          <Text style={styles.actionText}>SECTIONS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => goTo('ModuleProgress')}>
          <Icon name="bar-chart-outline" size={20} color="#F97316" />
          <Text style={styles.actionText}>PROGRESS</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.startBtn, isInProgress && styles.startBtnActive]}
        onPress={() => goTo('VisitCheckin')}
      >
        <Icon name={isInProgress ? 'arrow-forward-circle' : 'location'} size={18} color="#fff" />
        <Text style={styles.startText}>
          {isInProgress ? 'Continue Visit' : 'Start Visit'}
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

  // ── Filter row ──
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FCD9B6',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownTriggerActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownTriggerTextActive: {
    color: '#fff',
  },
  resultsBadge: {
    backgroundColor: '#FFF4E6',
    borderWidth: 1.5,
    borderColor: '#FCD9B6',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },

  // ── Modal sheet ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  sheetItemActive: {
    backgroundColor: '#FFF4E6',
  },
  sheetItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemIconActive: {
    backgroundColor: '#F97316',
  },
  sheetItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  sheetItemTextActive: {
    color: '#F97316',
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  scrollEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 120 },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
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
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  actionBtn: {
    backgroundColor: '#FFF4E6', paddingVertical: 14,
    borderRadius: 14, alignItems: 'center', width: '31%',
  },
  actionText: { marginTop: 5, fontSize: 11, color: '#F97316', fontWeight: '600' },

  startBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 14,
  },
  startBtnActive: { backgroundColor: '#EA6C00' },
  startText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  // ── In progress badge ──
  inProgressBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF4E6', borderWidth: 1.5, borderColor: '#F97316',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, zIndex: 1,
  },
  inProgressDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#F97316' },
  inProgressText: { fontSize: 9, fontWeight: '800', color: '#F97316', letterSpacing: 0.5 },

  // ── Bottom nav ──
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff',
    paddingVertical: 12, borderTopWidth: 1, borderColor: '#E5E7EB',
  },
  navItem:       { alignItems: 'center' },
  navItemActive: { alignItems: 'center' },
  navText:       { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  navTextActive: { fontSize: 11, color: '#F97316', marginTop: 4 },
  lastVisitedTag: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: '#F3F4F6',
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 8,
},
lastVisitedText: {
  fontSize: 11,
  color: '#6B7280',
  fontWeight: '500',
},
});