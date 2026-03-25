// src/screens/school/scheduleVisit/VisitSchedule.tsx

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal,
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import AppHeader from '../../../components/AppHeader'
import {
  getVisitSchedules,
  getUpcomingVisits,
  deleteVisitSchedule,
} from '../../../services/schedulevisit'

const VisitSchedule = () => {
  const navigation = useNavigation<any>()

  const [upcomingVisits, setUpcomingVisits]   = useState<any[]>([])
  const [allVisits, setAllVisits]             = useState<any[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingAll, setLoadingAll]           = useState(true)
  const [refreshing, setRefreshing]           = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)

  const [page, setPage]       = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 4

  // Filter states
  const [selectedStatus, setSelectedStatus]         = useState('All')
  const [selectedSchool, setSelectedSchool]         = useState('All')
  const [schoolSearchText, setSchoolSearchText]     = useState('')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false)

  const statusOptions = ['All', 'Scheduled', 'Upcoming', 'Today', 'Done', 'Completed']

  const uniqueSchools = Array.from(
    new Map(
      [...upcomingVisits, ...allVisits]
        .filter(item => item.school?.school_name || item.school?.name || item.school_name)
        .map(item => [item.school?.school_name || item.school?.name || item.school_name, item.school?.school_name || item.school?.name || item.school_name])
    ).values()
  ).sort() as string[]

  const filteredSchools = schoolSearchText
    ? uniqueSchools.filter(s => s.toLowerCase().includes(schoolSearchText.toLowerCase()))
    : uniqueSchools

  const filterVisit = (item: any) => {
    const schoolValue = item.school?.school_name || item.school?.name || item.school_name || ''
    const schoolMatch = selectedSchool === 'All' || schoolValue === selectedSchool

    const statusValue = (item.status || '').toString().toLowerCase()
    let statusMatch = selectedStatus === 'All'

    if (!statusMatch) {
      const selected = selectedStatus.toLowerCase()

      if (selected === 'upcoming') {
        statusMatch = statusValue === 'upcoming' || statusValue === 'scheduled'
      } else if (selected === 'scheduled') {
        statusMatch = statusValue === 'scheduled'
      } else {
        statusMatch = statusValue === selected
      }
    }

    return schoolMatch && statusMatch
  }

  // ── Fetch upcoming visits ───────────────────────────────────────────────
  const fetchUpcoming = async () => {
    try {
      setLoadingUpcoming(true)
      const res = await getUpcomingVisits()
      setUpcomingVisits(res?.data || [])
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load upcoming visits')
    } finally {
      setLoadingUpcoming(false)
    }
  }

  // ── Fetch all visits (page 1 reset) ────────────────────────────────────
  const fetchAllVisits = async (reset = false) => {
    try {
      setLoadingAll(true)
      const currentPage = reset ? 1 : page
      const res = await getVisitSchedules(currentPage, LIMIT)
      const data = res?.data?.data || res?.data || []
      const total = res?.data?.total || data.length

      if (reset) {
        setAllVisits(data)
        setPage(1)
        setHasMore(data.length < total)
      } else {
        setAllVisits(prev => {
          const next = currentPage === 1 ? data : [...prev, ...data]
          setHasMore(next.length < total)
          return next
        })
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load schedules')
    } finally {
      setLoadingAll(false)
    }
  }

  // ── Load more (pagination) ──────────────────────────────────────────────
  const loadMore = async () => {
    if (!hasMore || loadingAll) return
    const nextPage = page + 1
    setPage(nextPage)
    try {
      const res = await getVisitSchedules(nextPage, LIMIT)
      const data = res?.data?.data || res?.data || []
      const total = res?.data?.total || 0
      setAllVisits(prev => {
        const next = [...prev, ...data]
        setHasMore(next.length < total)
        return next
      })
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load more')
    }
  }

  // ── Pull to refresh ─────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchUpcoming(), fetchAllVisits(true)])
    setRefreshing(false)
  }

  // ── Re-fetch when screen comes into focus (after add/edit) ──────────────
  useFocusEffect(
    useCallback(() => {
      fetchUpcoming()
      fetchAllVisits(true)
    }, [])
  )

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this scheduled visit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id)
              await deleteVisitSchedule(id)
              setAllVisits(prev => prev.filter(v => v.id !== id))
              setUpcomingVisits(prev => prev.filter(v => v.id !== id))
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Delete failed')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  // ── Status badge style ──────────────────────────────────────────────────
  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'today')    return { bg: '#DCFCE7', text: '#16A34A', border: '#16A34A' }
    if (s === 'upcoming') return { bg: '#EEF2FF', text: '#3A57E8', border: '#3A57E8' }
    if (s === 'done' || s === 'completed') return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    return { bg: '#FFF3E8', text: '#FF7A00', border: '#FF7A00' }
  }

  // ── Format date ─────────────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12  = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  // ── Render upcoming card ────────────────────────────────────────────────
  const renderCard = (item: any) => {
    const statusStyle = getStatusStyle(item.status || 'upcoming')
    return (
      <View
        key={item.id || item._id}
        style={[styles.card, { borderLeftColor: statusStyle.border }]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.visitId}>ID: {item.id || '-'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status || 'Upcoming'}
            </Text>
          </View>
        </View>

        <Text style={styles.schoolName}>
          {item.school?.school_name || item.school?.name || item.school_name || 'N/A'}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
          <Text style={styles.infoText}>
            {formatDate(item.visit_date)}
            {item.visit_time ? ` • ${formatTime(item.visit_time)}` : ''}
          </Text>
        </View>

        {item.school?.address || item.location ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color="#9CA3AF" />
            <Text style={styles.infoText}>
              {item.school?.address || item.location}
            </Text>
          </View>
        ) : null}

        {item.remark ? (
          <View style={styles.infoRow}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color="#9CA3AF" />
            <Text style={styles.infoText} numberOfLines={2}>{item.remark}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => navigation.navigate('AddVisit' as never, { editData: item })}
        >
          <Text style={styles.detailBtnText}>View Details</Text>
          <Ionicons name="arrow-forward" size={14} color="#FF7A00" />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.headerWrapper}>
        <AppHeader 
          title="Visit Schedule"
          showBack={false}
        />
        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AddVisit' as never)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.headerBtnText}>Add Schedule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF7A00']}
            tintColor="#FF7A00"
          />
        }
      >

        {/* FILTERS */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            {/* Status Dropdown */}
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
              >
                <Text style={styles.dropdownLabel}>Status</Text>
                <Ionicons
                  name={statusDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#FF7A00"
                />
              </TouchableOpacity>
              {statusDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {statusOptions.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedStatus(status)
                        setStatusDropdownOpen(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedStatus === status && styles.dropdownItemActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* School Dropdown */}
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setSchoolDropdownOpen(!schoolDropdownOpen)}
              >
                <Text style={styles.dropdownLabel}>School</Text>
                <Ionicons
                  name={schoolDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#FF7A00"
                />
              </TouchableOpacity>
              {schoolDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <View style={styles.schoolSearchBox}>
                    <Ionicons name="search" size={16} color="#9CA3AF" />
                    <TextInput
                      style={styles.schoolSearchInput}
                      placeholder="Search school..."
                      value={schoolSearchText}
                      onChangeText={setSchoolSearchText}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedSchool('All')
                      setSchoolDropdownOpen(false)
                      setSchoolSearchText('')
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedSchool === 'All' && styles.dropdownItemActive,
                      ]}
                    >
                      All Schools
                    </Text>
                  </TouchableOpacity>
                  {filteredSchools.map(school => (
                    <TouchableOpacity
                      key={school}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedSchool(school)
                        setSchoolDropdownOpen(false)
                        setSchoolSearchText('')
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedSchool === school && styles.dropdownItemActive,
                        ]}
                      >
                        {school}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* UPCOMING SECTION */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Visits</Text>
          <Text style={styles.sectionSub}>Next 30 Days</Text>
        </View>

        {(() => {
          const filteredUpcoming = upcomingVisits.filter(filterVisit)

          return loadingUpcoming ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator color="#FF7A00" />
            </View>
          ) : filteredUpcoming.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No upcoming visits</Text>
            </View>
          ) : (
            filteredUpcoming.map(renderCard)
          )
        })()}

        {/* ALL VISITS TABLE */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>All Scheduled Visits</Text>
        {(() => {
            const filteredAllVisits = allVisits.filter(filterVisit)
            return filteredAllVisits.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredAllVisits.length}</Text>
              </View>
            )
          })()}
        </View>

        {(() => {
          const filteredAllVisits = allVisits.filter(filterVisit)

          return loadingAll && allVisits.length === 0 ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator color="#FF7A00" />
            </View>
          ) : filteredAllVisits.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No scheduled visits</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>DATE</Text>
                <Text style={[styles.th, { flex: 2 }]}>SCHOOL</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>EDIT</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>DEL</Text>
              </View>

              {filteredAllVisits.map((item: any, index: number) => (
                <View
                  key={item.id || item._id}
                  style={[styles.tr, index % 2 === 0 && { backgroundColor: '#FAFAFA' }]}
                >
                  <Text style={[styles.td, { flex: 2 }]}>
                    {formatDate(item.visit_date)}
                  </Text>
                  <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                    {item.school?.school_name || item.school?.name || item.school_name || 'N/A'}
                  </Text>

                  <View style={[styles.actionCell, { flex: 1 }]}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('AddVisit' as never, { editData: item })}
                    >
                      <Ionicons name="create-outline" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.actionCell, { flex: 1 }]}>
                    {deletingId === (item.id || item._id) ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id || item._id)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {/* LOAD MORE */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMore}
                  disabled={loadingAll}
                >
                  {loadingAll ? (
                    <ActivityIndicator size="small" color="#FF7A00" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )
        })()}

      </ScrollView>
    </SafeAreaView>
  )
}

export default VisitSchedule

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  headerWrapper: {
    backgroundColor: '#fff',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7A00',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
    alignSelf: 'flex-end',
  },
  headerBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: '#111827' },
  sectionSub: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadge: {
    backgroundColor: '#FF7A00',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  loaderBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
  },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitId:     { color: '#FF7A00', fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  schoolName:  { fontWeight: '700', fontSize: 15, color: '#111827', marginBottom: 8 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  infoText:    { fontSize: 12, color: '#6B7280', flex: 1 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
    backgroundColor: '#FFF3E8',
    padding: 10,
    borderRadius: 8,
  },
  detailBtnText: { color: '#FF7A00', fontWeight: '600', fontSize: 13 },

  table: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  td:         { fontSize: 12, color: '#374151' },
  actionCell: { alignItems: 'center', justifyContent: 'center' },
  editBtn:    { backgroundColor: '#3A57E8', padding: 7, borderRadius: 7 },
  deleteBtn:  { backgroundColor: '#EF4444', padding: 7, borderRadius: 7 },
  loadMoreBtn: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  loadMoreText: { color: '#FF7A00', fontWeight: '600', fontSize: 13 },

  // Filter styles
  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dropdownWrapper: {
    flex: 1,
    zIndex: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FB923C',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7A00',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    maxHeight: 300,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownItemActive: {
    color: '#FF7A00',
    fontWeight: '700',
  },
  schoolSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  schoolSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#111827',
  },
})