// src/screens/school/scheduleVisit/AddVisit.tsx

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  createVisitSchedule,
  updateVisitSchedule,
  getVisitSchedules,
} from '../../../services/schedulevisit'
import { getAssignedSchools } from '../../../services/school'

const DAYS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const AddVisit = () => {
  const navigation = useNavigation<any>()
  const route      = useRoute<any>()
  const editData   = route?.params?.editData

  // ── Schools ─────────────────────────────────────────────────────────────
  const [schools, setSchools]           = useState<any[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [selectedSchool, setSelectedSchool] = useState<any>(null)
  const [schoolSearch, setSchoolSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // ── Calendar ─────────────────────────────────────────────────────────────
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear())
  const [selectedDay,  setSelectedDay]  = useState(today.getDate())

  // ── Time ─────────────────────────────────────────────────────────────────
  const [hour,   setHour]   = useState(10)
  const [minute, setMinute] = useState(0)
  const [period, setPeriod] = useState('AM')

  // ── Remarks + submit ─────────────────────────────────────────────────────
  const [remarks,    setRemarks]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [existingVisits, setExistingVisits] = useState<any[]>([])

  // ── Load schools ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true)
        const res = await getAssignedSchools()
        
        console.log('Schools API Response:', res)
        
        // Check if API response was successful
        if (!res?.success) {
          console.error('Schools API Error:', res?.message)
          Alert.alert('Error', res?.message || 'Failed to load schools')
          setSchools([])
          return
        }
        
        const data = Array.isArray(res?.data) ? res.data : []
        console.log('Schools Data:', data)
        setSchools(data)

        // If editing, pre-select the school
        if (editData) {
          const match = data.find(
            (s: any) => s.id === editData.school_id || 
                       (s.school_name || s.name) === (editData.school?.name || editData.school_name)
          )
          setSelectedSchool(match || { id: editData.school_id, school_name: editData.school?.name || editData.school_name })
        }
      } catch (e: any) {
        console.error('Schools Load Error:', e)
        Alert.alert('Error', e?.message || 'Failed to load schools')
      } finally {
        setLoadingSchools(false)
      }
    }

    loadSchools()

    const loadExistingVisits = async () => {
      try {
        const res = await getVisitSchedules(1, 1000)
        const data = res?.data?.data || res?.data || []
        setExistingVisits(data)
      } catch (e: any) {
        console.error('Existing visits load error', e)
      }
    }

    loadExistingVisits()

    // Pre-fill edit data
    if (editData) {
      if (editData.visit_date) {
        const d = new Date(editData.visit_date)
        setSelectedDay(d.getDate())
        setCurrentMonth(d.getMonth())
        setCurrentYear(d.getFullYear())
      }
      if (editData.visit_time) {
        const [h, m] = editData.visit_time.split(':')
        const hNum = parseInt(h)
        setPeriod(hNum >= 12 ? 'PM' : 'AM')
        setHour(hNum % 12 || 12)
        setMinute(parseInt(m))
      }
      if (editData.remark) setRemarks(editData.remark)
    }
  }, [])

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const getDaysInMonth     = (m: number, y: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay()

  const isPastDate = (day: number, month: number, year: number) => {
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const testDate  = new Date(year, month, day)
    return testDate < todayOnly
  }

  const handlePrevMonth = () => {
    if (currentYear < today.getFullYear()) return
    if (currentYear === today.getFullYear() && currentMonth <= today.getMonth()) return

    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
    setSelectedDay(1)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0); setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
    setSelectedDay(1)
  }

  const renderCalendar = () => {
    const daysInMonth   = getDaysInMonth(currentMonth, currentYear)
    const firstDay      = getFirstDayOfMonth(currentMonth, currentYear)
    const prevMonthDays = getDaysInMonth(
      currentMonth === 0 ? 11 : currentMonth - 1,
      currentMonth === 0 ? currentYear - 1 : currentYear
    )

    const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = []
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ day: prevMonthDays - i, type: 'prev' })
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ day: d, type: 'current' })
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++)
      cells.push({ day: d, type: 'next' })

    const rows = []
    for (let i = 0; i < cells.length; i += 7)
      rows.push(cells.slice(i, i + 7))

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.calRow}>
        {row.map((cell, colIndex) => {
          const isSelected = cell.type === 'current' && cell.day === selectedDay
          const isToday =
            cell.type === 'current' &&
            cell.day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()

          return (
            <TouchableOpacity
              key={colIndex}
              style={[styles.calCell, isSelected && styles.calSelected, (cell.type === 'current' && isPastDate(cell.day, currentMonth, currentYear)) && styles.calDisabled]}
              onPress={() => {
                if (cell.type === 'current' && !isPastDate(cell.day, currentMonth, currentYear)) {
                  setSelectedDay(cell.day)
                }
              }}
              disabled={cell.type !== 'current' || isPastDate(cell.day, currentMonth, currentYear)}
            >
              <Text style={[
                styles.calText,
                cell.type !== 'current' && styles.calGray,
                isSelected && styles.calSelectedText,
                !isSelected && isToday && styles.calTodayText,
              ]}>
                {cell.day}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    ))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedSchool) {
      Alert.alert('Validation', 'Please select a school')
      return
    }

    // Build visit_date as YYYY-MM-DD
    const mm = String(currentMonth + 1).padStart(2, '0')
    const dd = String(selectedDay).padStart(2, '0')
    const visit_date = `${currentYear}-${mm}-${dd}`

    // Prevent past visit_date
    if (isPastDate(selectedDay, currentMonth, currentYear)) {
      Alert.alert('Validation', 'Please choose today or a future date.')
      return
    }

    // Prevent duplicate school visit on same date
    if (isSchoolScheduled(selectedSchool)) {
      Alert.alert('Validation', 'A visit is already scheduled for this school on the selected date.')
      return
    }

    // Build visit_time as HH:MM in 24hr
    let h24 = hour
    if (period === 'AM' && hour === 12) h24 = 0
    if (period === 'PM' && hour !== 12) h24 = hour + 12
    const visit_time = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    const payload = {
      school_id:  selectedSchool.id,
      visit_date,
      visit_time,
      remark: remarks.trim(),
    }

    try {
      setSubmitting(true)

      if (editData?.id) {
        await updateVisitSchedule(editData.id, {
          visit_date,
          visit_time,
          remark: remarks.trim(),
        })
        Alert.alert('Success', 'Visit updated successfully', [
          { text: 'OK', onPress: () => navigation.navigate('VisitSchedule' as never) }
        ])
      } else {
        await createVisitSchedule(payload)
        Alert.alert('Success', 'Visit scheduled successfully', [
          { text: 'OK', onPress: () => navigation.navigate('VisitSchedule' as never) }
        ])
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedVisitDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`

  const isSchoolScheduled = (school: any) => {
    const schoolId = school?.id
    const schoolName = school.school_name || school.name

    return existingVisits.some((visit: any) => {
      if (editData?.id && visit.id === editData.id) return false
      const visitSchoolId = visit.school_id || visit.school?.id
      const visitSchoolName = visit.school?.school_name || visit.school?.name || visit.school_name
      const sameSchool = (schoolId && visitSchoolId && schoolId === visitSchoolId) ||
        (schoolName && visitSchoolName && schoolName === visitSchoolName)
      return sameSchool && visit.visit_date === selectedVisitDate
    })
  }

  const filteredSchools = schools
    .filter(s => (s.school_name || s.name || '').toLowerCase().includes(schoolSearch.toLowerCase()))
    .filter(s => !isSchoolScheduled(s))

  const handleGoBack = () => navigation.goBack()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editData ? 'Edit Visit' : 'Add New Visit'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* SCHOOL NAME */}
        <Text style={styles.label}>School Name</Text>

        {loadingSchools ? (
          <View style={styles.dropdownBox}>
            <ActivityIndicator size="small" color="#FF7A00" />
            <Text style={styles.placeholder}>Loading schools...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.dropdownBox, showDropdown && styles.dropdownBoxActive]}
              onPress={() => setShowDropdown(v => !v)}
              activeOpacity={0.8}
              disabled={!!editData}
            >
              <Ionicons name="business-outline" size={18} color="#9CA3AF" />
              <Text style={[styles.dropdownText, !selectedSchool && styles.placeholder]}>
                {selectedSchool ? (selectedSchool.school_name || selectedSchool.name) : 'Select or search school'}
              </Text>
              {!editData && (
                <Ionicons
                  name={showDropdown ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#9CA3AF"
                />
              )}
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdown}>
                <View style={styles.searchRow}>
                  <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search school..."
                    placeholderTextColor="#9CA3AF"
                    value={schoolSearch}
                    onChangeText={setSchoolSearch}
                    autoFocus
                  />
                </View>
                {filteredSchools.length === 0 ? (
                  <Text style={styles.noResults}>No schools found</Text>
                ) : (
                  filteredSchools.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedSchool(item)
                        setShowDropdown(false)
                        setSchoolSearch('')
                      }}
                    >
                      <View style={styles.schoolDot} />
                      <Text style={styles.dropdownItemText}>{item.school_name || item.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={14} color="#FF7A00" />
          <Text style={styles.note}>
            You cannot schedule duplicate visits to the same school on the same day.
          </Text>
        </View>

        {/* VISIT DATE */}
        <Text style={styles.label}>Visit Date</Text>

        <View style={styles.calendarBox}>
          <View style={styles.calHeader}>
            <TouchableOpacity style={styles.calNavBtn} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.calMonth}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity style={styles.calNavBtn} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          <View style={styles.calRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.calDayHeader}>{d}</Text>
            ))}
          </View>
          {renderCalendar()}
        </View>

        {/* VISIT TIME */}
        <Text style={styles.label}>Visit Time</Text>

        <View style={styles.timeBox}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>HOUR</Text>
            <TouchableOpacity style={styles.timeArrow} onPress={() => setHour(h => Math.min(h + 1, 12))}>
              <Ionicons name="chevron-up" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.timeValue}>{hour < 10 ? `0${hour}` : hour}</Text>
            <TouchableOpacity style={styles.timeArrow} onPress={() => setHour(h => Math.max(h - 1, 1))}>
              <Ionicons name="chevron-down" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <Text style={styles.timeColon}>:</Text>

          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>MIN</Text>
            <TouchableOpacity style={styles.timeArrow} onPress={() => setMinute(m => Math.min(m + 5, 55))}>
              <Ionicons name="chevron-up" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.timeValue}>{minute < 10 ? `0${minute}` : minute}</Text>
            <TouchableOpacity style={styles.timeArrow} onPress={() => setMinute(m => Math.max(m - 5, 0))}>
              <Ionicons name="chevron-down" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
              onPress={() => setPeriod('AM')}
            >
              <Text style={[styles.periodBtnText, period === 'AM' && styles.periodBtnTextActive]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
              onPress={() => setPeriod('PM')}
            >
              <Text style={[styles.periodBtnText, period === 'PM' && styles.periodBtnTextActive]}>PM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* REMARKS */}
        <Text style={styles.label}>
          Remarks <Text style={styles.optional}>(Optional)</Text>
        </Text>

        <TextInput
          style={styles.textArea}
          placeholder="Add any specific instructions or notes for this visit..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={remarks}
          onChangeText={setRemarks}
        />

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleGoBack}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.saveText}>
                  {editData ? 'Update Schedule' : 'Save Schedule'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

export default AddVisit

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  scrollContainer: { padding: 16, paddingBottom: 50 },

  label:    { fontWeight: '700', fontSize: 14, marginTop: 20, marginBottom: 8, color: '#111827' },
  optional: { fontWeight: '400', color: '#9CA3AF', fontSize: 13 },

  dropdownBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
  },
  dropdownBoxActive: { borderColor: '#FF7A00' },
  dropdownText:      { flex: 1, fontSize: 14, color: '#111827' },
  placeholder:       { color: '#9CA3AF', flex: 1, fontSize: 14 },

  dropdown: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 6, overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
    borderBottomWidth: 1, borderColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1, paddingVertical: 12,
    fontSize: 14, color: '#111827',
  },
  noResults:       { padding: 14, textAlign: 'center', color: '#9CA3AF', fontSize: 13 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 13,
    borderBottomWidth: 1, borderColor: '#F9FAFB',
  },
  schoolDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF7A00' },
  dropdownItemText: { fontSize: 14, color: '#374151' },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 },
  note:    { fontSize: 12, color: '#FF7A00', flex: 1, lineHeight: 17 },

  calendarBox: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  calHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  calNavBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  calMonth:     { fontWeight: '700', fontSize: 15, color: '#111827' },
  calRow:       { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  calDayHeader: {
    width: 36, textAlign: 'center',
    fontSize: 12, color: '#9CA3AF',
    fontWeight: '600', paddingBottom: 6,
  },
  calCell:         { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  calSelected:     { backgroundColor: '#FF7A00' },
  calText:         { fontSize: 13, color: '#374151' },
  calGray:         { color: '#D1D5DB' },
  calDisabled:     { backgroundColor: '#F3F4F6' },
  calSelectedText: { color: '#fff', fontWeight: '700' },
  calTodayText:    { color: '#FF7A00', fontWeight: '700' },

  timeBox: {
    backgroundColor: '#fff', padding: 20, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  timeColumn:  { alignItems: 'center', flex: 1 },
  timeLabel:   { fontSize: 10, color: '#9CA3AF', marginBottom: 8, fontWeight: '700', letterSpacing: 1 },
  timeArrow:   { padding: 6, backgroundColor: '#F3F4F6', borderRadius: 6 },
  timeValue:   { fontSize: 30, fontWeight: '700', color: '#111827', marginVertical: 8 },
  timeColon:   { fontSize: 26, fontWeight: '700', color: '#111827', marginHorizontal: 4, marginBottom: 12 },
  periodContainer:      { marginLeft: 16, gap: 8 },
  periodBtn:            { backgroundColor: '#F3F4F6', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10 },
  periodBtnActive:      { backgroundColor: '#FF7A00' },
  periodBtnText:        { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  periodBtnTextActive:  { color: '#fff' },

  textArea: {
    backgroundColor: '#fff', height: 110, borderRadius: 12,
    padding: 14, fontSize: 14, color: '#374151',
    textAlignVertical: 'top', borderWidth: 1,
    borderColor: '#E5E7EB', lineHeight: 20,
  },

  footer:    { flexDirection: 'row', marginTop: 24, gap: 12 },
  cancelBtn: {
    flex: 1, backgroundColor: '#fff', padding: 16,
    borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cancelText: { fontWeight: '600', color: '#6B7280', fontSize: 14 },
  saveBtn: {
    flex: 2, backgroundColor: '#FF7A00', padding: 16,
    borderRadius: 12, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})