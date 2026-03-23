// screens/visit/VisitForm.tsx
import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import StepBar from '../../../components/StepBar'
import { updateVisitPurpose } from '../../../services/visit'
import { fetchAllRPs } from '../../../services/profile'

const PURPOSES = [
  'Class Observation',
  'Adopted Class',
  'Enabling Session',
  'No Class Observed',
  'Impact Survey',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface RPUser {
  id:            string | number
  first_name:    string
  last_name:     string
  email_address: string
  phone_number:  string
  rp_code:       string
  rp_type:       string
  zone:          string
  status:        string
}

// ─── Purpose Dropdown (centered popup) ───────────────────────────────────────

function PurposeDropdown({
  value, options, placeholder, onChange,
}: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[s.triggerText, !value && s.triggerPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={s.popupWrap} pointerEvents="box-none">
          <View style={s.popup}>
            <View style={s.popupHeader}>
              <Text style={s.popupTitle}>Select Visit Purpose</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {options.map((opt, i) => {
              const selected = value === opt
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.popupItem, i === options.length - 1 && { borderBottomWidth: 0 }, selected && s.popupItemActive]}
                  onPress={() => { onChange(opt); setOpen(false) }}
                  activeOpacity={0.6}
                >
                  <Text style={[s.popupItemText, selected && s.popupItemTextActive]}>{opt}</Text>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color="#F97316" />
                    : <View style={s.popupCircle} />
                  }
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </Modal>
    </>
  )
}

// ─── RP Search Dropdown (bottom sheet) ───────────────────────────────────────

function RPSearchDropdown({
  selected, onSelect,
}: {
  selected: RPUser | null; onSelect: (rp: RPUser | null) => void
}) {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [rpList,     setRpList]     = useState<RPUser[]>([])
  const [loading,    setLoading]    = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch once when modal first opens — cache result in rpList
  const loadRPs = useCallback(async () => {
    if (rpList.length > 0) return
    setLoading(true)
    setFetchError(null)
    const res = await fetchAllRPs()
    if (res.success && Array.isArray(res.data)) {
      setRpList(res.data)
    } else {
      setFetchError(res.message || 'Failed to load resource persons')
    }
    setLoading(false)
  }, [rpList.length])

  const handleOpen = () => { setOpen(true); loadRPs() }

  const filtered = query.trim()
    ? rpList.filter(rp => {
        const full = `${rp.first_name} ${rp.last_name}`.toLowerCase()
        const q    = query.toLowerCase()
        return full.includes(q) || rp.rp_code?.toLowerCase().includes(q) || rp.zone?.toLowerCase().includes(q)
      })
    : rpList

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity style={s.trigger} onPress={handleOpen} activeOpacity={0.7}>
        {selected ? (
          <View style={s.rpSelectedRow}>
            <View style={s.rpAvatar}>
              <Text style={s.rpAvatarText}>{selected.first_name[0]}{selected.last_name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rpSelectedName}>{selected.first_name} {selected.last_name}</Text>
              <Text style={s.rpSelectedMeta}>{selected.rp_code}{selected.zone ? ` · ${selected.zone}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => onSelect(null)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.triggerPlaceholder}>Search and select person...</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </>
        )}
      </TouchableOpacity>

      {/* Bottom-sheet modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Dim backdrop — tap to close */}
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />

        <View style={s.rpSheet}>
          {/* Drag handle */}
          <View style={s.rpSheetHandle} />

          {/* Header */}
          <View style={s.rpSheetHeader}>
            <Text style={s.rpSheetTitle}>Select Resource Person</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.rpSearchBox}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Name, RP code, or zone..."
              placeholderTextColor="#9CA3AF"
              style={s.rpSearchInput}
              autoFocus
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          {loading ? (
            <View style={s.rpCenterBox}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={s.rpCenterText}>Loading resource persons...</Text>
            </View>
          ) : fetchError ? (
            <View style={s.rpCenterBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
              <Text style={[s.rpCenterText, { color: '#DC2626' }]}>{fetchError}</Text>
              <TouchableOpacity style={s.rpRetryBtn} onPress={() => { setRpList([]); loadRPs() }}>
                <Text style={s.rpRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.rpCenterBox}>
              <Ionicons name="person-outline" size={40} color="#D1D5DB" />
              <Text style={s.rpCenterText}>
                {query ? `No results for "${query}"` : 'No resource persons found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSel = selected?.id === item.id
                return (
                  <TouchableOpacity
                    style={[s.rpItem, isSel && s.rpItemSelected]}
                    onPress={() => { onSelect(item); setOpen(false); setQuery('') }}
                    activeOpacity={0.7}
                  >
                    <View style={[s.rpItemAvatar, isSel && s.rpItemAvatarSel]}>
                      <Text style={[s.rpItemAvatarText, isSel && { color: '#fff' }]}>
                        {item.first_name[0]}{item.last_name[0]}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[s.rpItemName, isSel && { color: '#F97316' }]}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <View style={s.rpChipRow}>
                        {item.rp_code ? (
                          <View style={s.rpChip}>
                            <Ionicons name="card-outline" size={10} color="#6B7280" />
                            <Text style={s.rpChipText}>{item.rp_code}</Text>
                          </View>
                        ) : null}
                        {item.zone ? (
                          <View style={s.rpChip}>
                            <Ionicons name="location-outline" size={10} color="#6B7280" />
                            <Text style={s.rpChipText}>{item.zone}</Text>
                          </View>
                        ) : null}
                        {item.rp_type ? (
                          <View style={s.rpChip}>
                            <Ionicons name="briefcase-outline" size={10} color="#6B7280" />
                            <Text style={s.rpChipText}>{item.rp_type}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {isSel && <Ionicons name="checkmark-circle" size={20} color="#F97316" />}
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>
      </Modal>
    </>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VisitForm() {
  const navigation = useNavigation()
  const route      = useRoute()
  const { visitId } = (route.params ?? {}) as { visitId?: string | number }

  const [purpose,    setPurpose]    = useState('')
  const [selectedRP, setSelectedRP] = useState<RPUser | null>(null)
  const [saving,     setSaving]     = useState(false)

  const canProceed = purpose !== ''

  const handleNext = async () => {
    if (!canProceed) return
    if (!visitId) { Alert.alert('Error', 'Visit ID is missing.'); return }
    setSaving(true)
    const res = await updateVisitPurpose(visitId, [purpose])
    setSaving(false)
    if (!res.success) { Alert.alert('Error', res.message || 'Could not save purpose.'); return }
    navigation.navigate('ClassObservation' as never, {
      purpose,
      visitId,
      additionalRpId: selectedRP?.id ?? null,
    } as never)
  }

  const handleSaveDraft = async () => {
    if (!purpose || !visitId) return
    setSaving(true)
    await updateVisitPurpose(visitId, [purpose])
    setSaving(false)
    Alert.alert('Saved', 'Draft saved successfully.')
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Form" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <StepBar current={2} />
        <SchoolBanner />

        <View style={s.card}>

          {/* Visit Purpose */}
          <Text style={s.fieldLabel}>Visit Purpose <Text style={s.star}>*</Text></Text>
          <PurposeDropdown
            value={purpose}
            options={PURPOSES}
            placeholder="Select a purpose"
            onChange={setPurpose}
          />
          {!purpose && <Text style={s.hint}>Please select a visit purpose to continue</Text>}

          {/* Additional Resource Person */}
          <Text style={[s.fieldLabel, { marginTop: 20 }]}>Additional Resource Person</Text>
          <Text style={s.fieldSubLabel}>Optional — select if another RP accompanied you</Text>
          <RPSearchDropdown selected={selectedRP} onSelect={setSelectedRP} />

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.outlineBtn, (!canProceed || saving) && s.outlineBtnDisabled]}
              onPress={handleSaveDraft}
              disabled={!canProceed || saving}
              activeOpacity={0.7}
            >
              <Text style={[s.outlineBtnText, (!canProceed || saving) && { color: '#9CA3AF' }]}>
                Save Draft
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.solidBtn, (!canProceed || saving) && s.solidBtnDisabled]}
              onPress={handleNext}
              disabled={!canProceed || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Text style={s.solidBtnText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                  </>
              }
            </TouchableOpacity>
          </View>

        </View>

        <Text style={s.footnote}>Complete all required fields to proceed</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { paddingBottom: 60 },

  card: {
    backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  fieldLabel:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  fieldSubLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  star:          { color: '#EF4444' },
  hint:          { fontSize: 11, color: '#9CA3AF', marginTop: 5 },

  // ── Shared trigger ──
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, minHeight: 48,
  },
  triggerText:        { flex: 1, fontSize: 14, color: '#111827' },
  triggerPlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },

  // ── Purpose popup ──
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  popupWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  popup: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  popupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  popupTitle:          { fontSize: 15, fontWeight: '700', color: '#111827' },
  popupItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff',
  },
  popupItemActive:     { backgroundColor: '#FFF7ED' },
  popupItemText:       { fontSize: 14, color: '#374151' },
  popupItemTextActive: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  popupCircle:         { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB' },

  // ── RP trigger (selected state) ──
  rpSelectedRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rpAvatar:       { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  rpAvatarText:   { fontSize: 11, fontWeight: '700', color: '#F97316' },
  rpSelectedName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  rpSelectedMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  // ── RP bottom sheet ──
  rpSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '82%', paddingTop: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  rpSheetHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  rpSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rpSheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  rpSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  rpSearchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  rpCenterBox:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  rpCenterText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  rpRetryBtn:   { backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  rpRetryText:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  rpItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  rpItemSelected:   { backgroundColor: '#FFF7ED' },
  rpItemAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  rpItemAvatarSel:  { backgroundColor: '#F97316' },
  rpItemAvatarText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  rpItemName:       { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },

  rpChipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rpChip:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rpChipText:{ fontSize: 10, color: '#6B7280', fontWeight: '500' },

  // ── Buttons ──
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 28 },

  outlineBtn:         { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#F97316', alignItems: 'center' },
  outlineBtnDisabled: { borderColor: '#D1D5DB' },
  outlineBtnText:     { fontSize: 14, fontWeight: '600', color: '#F97316' },

  solidBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F97316',
    elevation: 2, shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  solidBtnDisabled: { backgroundColor: '#D1D5DB', elevation: 0, shadowOpacity: 0 },
  solidBtnText:     { fontSize: 14, fontWeight: '600', color: '#fff' },

  footnote: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 4 },
})