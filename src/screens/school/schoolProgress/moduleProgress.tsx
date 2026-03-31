import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StatusBar,
  Alert,
} from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import {
  getModuleProgress,
  getSchoolPrograms,
  getProgramLevels,
  recordModuleProgress,
} from '../../../services/school'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiSection = {
  section_id: string | number
  section_name: string | null
  class_name: string | null
  teacher: { id: number | string; name: string } | null
  current_module: {
    module_id: number | null
    module_name: string | null
    module_number: number | null
    level: { id: number | string; name: string } | null
  } | null
  next_module: {
    module_id: number
    module_name: string
    module_number: number
  } | null
  last_updated: string | null
  update_source: string | null
}

type Program = { id: string | number; name: string; type: string; duration_years: number }
type Module  = { id: string | number; name: string; module_number: number; start_week?: number; end_week?: number }
type Level   = { id: string | number; name: string; order_index: number; total_units: number; modules: Module[] }

type SectionRow = ApiSection & {
  selectedModuleId: string | number | null
  isDirty: boolean
}

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// Column widths — adjusted for a balanced, readable table
const COL = { section: 120, teacher: 140, lastMod: 160, update: 160 }

// ─── FloatDropdown ────────────────────────────────────────────────────────────
function FloatDropdown({
  value, options, onSelect, disabled = false,
}: {
  value: string
  options: { label: string; value: string }[]
  onSelect: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<View>(null)
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const openDrop = () => {
    if (disabled) return
    ref.current?.measureInWindow((x, y, w, h) => { setPos({ x, y, w, h }); setOpen(true) })
  }

  const MARGIN = 16, MAX_H = 260
  const listW    = Math.min(Math.max(pos.w, 200), SCREEN_W - MARGIN * 2)
  const listLeft = Math.max(MARGIN, Math.min(pos.x, SCREEN_W - listW - MARGIN))
  const estH     = Math.min(options.length * 50, MAX_H)
  const listTop  = (SCREEN_H - (pos.y + pos.h) - MARGIN) >= estH
    ? pos.y + pos.h + 4
    : pos.y - estH - 4

  return (
    <>
      <TouchableOpacity
        ref={ref}
        style={[s.dropdown, disabled && s.dropdownDisabled]}
        onPress={openDrop}
        activeOpacity={0.85}
      >
        <Text style={s.dropdownValue} numberOfLines={1}>{value || 'Select...'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill}>
            <View style={[s.floatList, { top: listTop, left: listLeft, width: listW, maxHeight: MAX_H }]}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {options.map((opt, i) => {
                  const selected = opt.value === value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        s.floatOpt,
                        selected && s.floatOptActive,
                        i < options.length - 1 && s.floatOptBorder,
                      ]}
                      onPress={() => { onSelect(opt.value); setOpen(false) }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[s.floatOptText, selected && s.floatOptTextActive]}
                        numberOfLines={2}
                      >
                        {opt.label}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={14} color="#F97316" />}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

// ─── ModuleDropdown ───────────────────────────────────────────────────────────
function ModuleDropdown({
  value, modules, currentModuleNumber, onSelect,
}: {
  value: string | number | null
  modules: Module[]
  currentModuleNumber: number | null
  onSelect: (moduleId: string | number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref  = useRef<View>(null)
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const MENU_W = 200
  const MENU_H = Math.min(modules.length * 48, 300)
  const openDrop = () => {
    ref.current?.measureInWindow((x, y, w, h) => { setPos({ x, y, w, h }); setOpen(true) })
  }
  const menuLeft = Math.max(8, Math.min(pos.x, SCREEN_W - MENU_W - 8))
  const menuTop  = (SCREEN_H - (pos.y + pos.h) - 16) >= MENU_H
    ? pos.y + pos.h + 4
    : pos.y - MENU_H - 4

  const selectedModule = modules.find(m => String(m.id) === String(value))

  return (
    <>
      <TouchableOpacity ref={ref} style={s.modTrigger} onPress={openDrop} activeOpacity={0.85}>
        <Text style={s.modTriggerText} numberOfLines={1}>
          {selectedModule ? selectedModule.name : 'Select module'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color="#6B7280" />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill}>
            <View style={[s.floatList, { top: menuTop, left: menuLeft, width: MENU_W, maxHeight: 300 }]}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {modules.map((m, i) => {
                  const locked   = currentModuleNumber !== null && m.module_number <= currentModuleNumber
                  const selected = String(m.id) === String(value)
                  return (
                    <TouchableOpacity
                      key={String(m.id)}
                      style={[
                        s.floatOpt,
                        selected && s.floatOptActive,
                        locked && s.floatOptDim,
                        i < modules.length - 1 && s.floatOptBorder,
                      ]}
                      onPress={() => { if (!locked) { onSelect(m.id); setOpen(false) } }}
                      activeOpacity={locked ? 1 : 0.75}
                    >
                      {locked
                        ? <Ionicons name="lock-closed-outline" size={11} color="#D1D5DB" style={{ marginRight: 6 }} />
                        : <View style={{ width: 17 }} />
                      }
                      <Text
                        style={[
                          s.floatOptText,
                          selected && s.floatOptTextActive,
                          locked && s.floatOptTextDim,
                        ]}
                        numberOfLines={2}
                      >
                        {m.name}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={13} color="#F97316" />}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

// ─── Table Header Cell ────────────────────────────────────────────────────────
function TH({ label, width, last }: { label: string; width: number; last?: boolean }) {
  return (
    <View style={[s.th, { width }, last && s.thLast]}>
      <Text style={s.thText}>{label}</Text>
    </View>
  )
}

// ─── Table Data Cell ──────────────────────────────────────────────────────────
function TD({ width, last, children }: { width: number; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[s.td, { width }, last && s.tdLast]}>
      {children}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ModuleProgress() {
  const navigation = useNavigation<any>()
  const route      = useRoute<any>()
  const school     = route.params?.school

  const [programs,          setPrograms]          = useState<Program[]>([])
  const [levels,            setLevels]            = useState<Level[]>([])
  const [sections,          setSections]          = useState<SectionRow[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string | number | null>(null)
  const [selectedLevelId,   setSelectedLevelId]   = useState<string | number | null>(null)

  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingLevels,   setLoadingLevels]   = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [toast,           setToast]           = useState(false)

  useEffect(() => { if (school?.id) loadPrograms() }, [])

  const loadPrograms = async () => {
    setLoadingPrograms(true)
    const res = await getSchoolPrograms(school.id)
    if (res.success && res.data?.length) {
      const mapped: Program[] = res.data.map((p: any) => ({
        id:             p.program?.id ?? p.program_id,
        name:           p.program_name ?? p.program?.name ?? '',
        type:           p.program?.type ?? '',
        duration_years: p.program?.duration_years ?? 0,
      }))
      setPrograms(mapped)
      setSelectedProgramId(mapped[0].id)
    }
    setLoadingPrograms(false)
  }

  useEffect(() => {
    if (!selectedProgramId) return
    loadLevels(selectedProgramId)
  }, [selectedProgramId])

  const loadLevels = async (programId: string | number) => {
    setLoadingLevels(true)
    setLevels([])
    setSelectedLevelId(null)
    setSections([])
    const res = await getProgramLevels(programId)
    if (res.success && res.data?.levels?.length) {
      setLevels(res.data.levels)
      setSelectedLevelId(res.data.levels[0].id)
    }
    setLoadingLevels(false)
  }

  useEffect(() => {
    if (!selectedLevelId || !selectedProgramId || !school?.id) return
    loadProgress(selectedProgramId, selectedLevelId)
  }, [selectedLevelId])

  const loadProgress = async (programId: string | number, levelId: string | number) => {
    setLoadingProgress(true)
    setSections([])
    const res = await getModuleProgress(school.id, { program_id: programId, level_id: levelId })
    if (res.success && res.data?.sections) {
      const rows: SectionRow[] = res.data.sections.map((sec: ApiSection) => ({
        ...sec,
        selectedModuleId: sec.next_module?.module_id ?? null,
        isDirty: false,
      }))
      setSections(rows)
    }
    setLoadingProgress(false)
  }

  const currentLevel  = levels.find(l => String(l.id) === String(selectedLevelId))
  const moduleOptions = currentLevel?.modules ?? []

  const updateSection = (index: number, moduleId: string | number) => {
    setSections(prev => prev.map((row, i) =>
      i !== index ? row : { ...row, selectedModuleId: moduleId, isDirty: true }
    ))
  }

  const saveProgress = async () => {
    const dirty = sections.filter(s => s.isDirty && s.selectedModuleId)
    if (!dirty.length) {
      Alert.alert('No Changes', 'Please select a new module for at least one section.')
      return
    }
    setSaving(true)
    let successCount = 0, failCount = 0
    for (const row of dirty) {
      const res = await recordModuleProgress(school.id, {
        section_id: row.section_id,
        module_id:  row.selectedModuleId!,
      })
      if (res.success) successCount++
      else failCount++
    }
    setSaving(false)
    if (failCount === 0) {
      setToast(true)
      setTimeout(() => setToast(false), 3000)
      loadProgress(selectedProgramId!, selectedLevelId!)
    } else {
      Alert.alert('Partial Save', `${successCount} saved, ${failCount} failed. Please retry.`)
    }
  }

  const programOptions = programs.map(p => ({ label: p.name, value: String(p.id) }))
  const levelOptions   = levels.map(l => ({ label: l.name, value: String(l.id) }))
  const dirtyCount     = sections.filter(s => s.isDirty).length

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Module Progress" />

      {/* ── Toast ── */}
      {toast && (
        <View style={s.toast}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={s.toastText}>Module progress updated successfully</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 16 }}><SchoolBanner /></View>

        {/* ── Filters ── */}
        <View style={s.filtersCard}>
          <View style={s.filterRow}>
            {/* Program */}
            <View style={s.filterField}>
              <Text style={s.filterLabel}>Program</Text>
              {loadingPrograms
                ? <ActivityIndicator color="#F97316" style={{ marginTop: 6 }} />
                : programOptions.length === 0
                  ? <EmptyField text="No programs assigned" />
                  : (
                    <FloatDropdown
                      value={programOptions.find(p => p.value === String(selectedProgramId))?.label ?? ''}
                      options={programOptions}
                      onSelect={v => setSelectedProgramId(v)}
                    />
                  )
              }
            </View>

            {/* Level */}
            <View style={[s.filterField, { marginLeft: 12 }]}>
              <Text style={s.filterLabel}>Level</Text>
              {loadingLevels
                ? <ActivityIndicator color="#F97316" style={{ marginTop: 6 }} />
                : levelOptions.length === 0 && selectedProgramId
                  ? <EmptyField text="No levels for this program" />
                  : (
                    <FloatDropdown
                      value={levelOptions.find(l => l.value === String(selectedLevelId))?.label ?? ''}
                      options={levelOptions}
                      onSelect={v => setSelectedLevelId(v)}
                      disabled={!levelOptions.length}
                    />
                  )
              }
            </View>
          </View>
        </View>

        {/* ── Table Card ── */}
        <View style={s.tableCard}>
          {/* Table Header Bar */}
          <View style={s.tableHeader}>
            <View style={s.tableHeaderLeft}>
              <View style={s.tableHeaderIcon}>
                <Ionicons name="grid" size={13} color="#F97316" />
              </View>
              <Text style={s.tableHeaderTitle}>Section-wise progress</Text>
            </View>
            {sections.length > 0 && (
              <View style={s.sectionCountBadge}>
                <Text style={s.sectionCountText}>{sections.length} sections</Text>
              </View>
            )}
          </View>

          {loadingProgress ? (
            <View style={s.stateContainer}>
              <ActivityIndicator color="#F97316" size="large" />
              <Text style={s.stateText}>Loading sections...</Text>
            </View>
          ) : sections.length === 0 ? (
            <View style={s.stateContainer}>
              <Ionicons name="school-outline" size={36} color="#D1D5DB" />
              <Text style={s.stateText}>No sections found for this level</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <View>
                {/* ── Column Headers ── */}
                <View style={s.thead}>
                  <TH label="Section" width={COL.section} />
                  <TH label="Assigned Teacher" width={COL.teacher} />
                  <TH label="Last Module Updated" width={COL.lastMod} />
                  <TH label="Update Module" width={COL.update} last />
                </View>

                {/* ── Rows ── */}
                {sections.map((item, index) => {
                  const isLast        = index === sections.length - 1
                  const currentModNum = item.current_module?.module_number ?? null
                  const selMod        = moduleOptions.find(m => String(m.id) === String(item.selectedModuleId))
                  const isWarning     = item.isDirty
                    && item.selectedModuleId !== null
                    && currentModNum !== null
                    && (selMod?.module_number ?? 0) <= currentModNum
                  const isUpdated = item.isDirty && !isWarning

                  const fmtDate = item.last_updated
                    ? new Date(item.last_updated).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : null
                  const fmtTime = item.last_updated
                    ? new Date(item.last_updated).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      })
                    : null

                  return (
                    <View
                      key={String(item.section_id)}
                      style={[
                        s.trow,
                        isWarning && s.trowWarning,
                        isUpdated && s.trowUpdated,
                        !isLast && s.trowBorder,
                      ]}
                    >
                      {/* Section */}
                      <TD width={COL.section}>
                        <Text style={s.cellPrimary}>
                          {item.class_name ?? '—'}
                          <Text style={s.cellDivider}> · </Text>
                          {item.section_name ?? '—'}
                        </Text>
                        {isUpdated && (
                          <View style={s.pillGreen}>
                            <Text style={s.pillGreenText}>Updated</Text>
                          </View>
                        )}
                      </TD>

                      {/* Teacher */}
                      <TD width={COL.teacher}>
                        {item.teacher?.name
                          ? <Text style={s.cellPrimary}>{item.teacher.name}</Text>
                          : <Text style={s.cellMuted}>Not assigned</Text>
                        }
                      </TD>

                      {/* Last Updated */}
                      <TD width={COL.lastMod}>
                        <Text style={s.cellPrimary}>
                          {item.current_module?.module_name ?? '—'}
                        </Text>
                        {item.current_module?.module_name && item.last_updated ? (
  <Text style={s.cellSub}>
    {fmtDate}{fmtTime ? `  ${fmtTime}` : ''}
  </Text>
) : (
  <Text style={s.cellMuted}>No module updated</Text>
)}
                      </TD>

                      {/* Module Selector */}
                      <TD width={COL.update} last>
                        <ModuleDropdown
                          value={item.selectedModuleId}
                          modules={moduleOptions}
                          currentModuleNumber={currentModNum}
                          onSelect={v => updateSection(index, v)}
                        />
                        {isWarning && (
                          <View style={s.inlineWarn}>
                            <Ionicons name="warning-outline" size={11} color="#DC2626" />
                            <View>
                              <Text style={s.inlineWarnText}>Lower than current progress</Text>
                              <Text style={s.inlineWarnSub}>
                                Current: {item.current_module?.module_name}
                              </Text>
                            </View>
                          </View>
                        )}
                        {isUpdated && (
                          <View style={s.inlineOk}>
                            <Text style={s.inlineOkText}>
                              Was: {item.current_module?.module_name ?? '—'}
                            </Text>
                          </View>
                        )}
                      </TD>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* ── Save Bar ── */}
      <View style={s.saveBar}>
        <View style={s.saveBarLeft}>
          {dirtyCount > 0
            ? (
              <>
                <View style={s.dirtyDot} />
                <Text style={s.saveBarHint}>
                  <Text style={s.saveBarHintBold}>{dirtyCount}</Text>
                  {` section${dirtyCount > 1 ? 's' : ''} pending save`}
                </Text>
              </>
            )
            : <Text style={s.saveBarHint}></Text>
          }
        </View>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveProgress}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                <Text style={s.saveBtnText}>Save Progress</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── EmptyField helper ────────────────────────────────────────────────────────
function EmptyField({ text }: { text: string }) {
  return (
    <View style={s.emptyField}>
      <Ionicons name="alert-circle-outline" size={14} color="#9CA3AF" />
      <Text style={s.emptyFieldText}>{text}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  // Toast
  toast: {
    position: 'absolute', top: 64, left: 16, right: 16, zIndex: 999,
    backgroundColor: '#10B981', padding: 13, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },

  // Filters
  filtersCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  filterRow: { flexDirection: 'row' },
  filterField: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  emptyField: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  emptyFieldText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  dropdown: {
    backgroundColor: '#F9FAFB', paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB',
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, marginRight: 6 },

  // Float list (shared by both dropdowns)
  floatList: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 14, zIndex: 9999,
  },
  floatOpt: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  floatOptBorder:     { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  floatOptActive:     { backgroundColor: '#FFF7ED' },
  floatOptDim:        { backgroundColor: '#FAFAFA' },
  floatOptText:       { fontSize: 13, color: '#374151', flex: 1 },
  floatOptTextActive: { color: '#F97316', fontWeight: '700' },
  floatOptTextDim:    { color: '#D1D5DB' },

  // Table card
  tableCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tableHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableHeaderIcon: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  tableHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sectionCountBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  sectionCountText: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  // Empty / loading states
  stateContainer: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  stateText: { color: '#9CA3AF', fontSize: 13 },

  // Table head
  thead: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  th: {
    paddingVertical: 11, paddingHorizontal: 12,
    borderRightWidth: 1, borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  thLast: { borderRightWidth: 0 },
  thText: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // Table rows
  trow:        { flexDirection: 'row', backgroundColor: '#fff' },
  trowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  trowWarning: { backgroundColor: '#FFF5F5' },
  trowUpdated: { backgroundColor: '#F0FDF4' },
  td: {
    paddingVertical: 14, paddingHorizontal: 12,
    borderRightWidth: 1, borderRightColor: '#F1F5F9',
    justifyContent: 'flex-start',
  },
  tdLast: { borderRightWidth: 0 },

  // Cell text
  cellPrimary:  { fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18 },
  cellDivider:  { color: '#CBD5E1', fontWeight: '400' },
  cellSub:      { fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: 16 },
  cellMuted:    { fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' },

  // Badges
  pillGreen:     { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, marginTop: 5, alignSelf: 'flex-start' },
  pillGreenText: { color: '#15803D', fontSize: 10, fontWeight: '700' },

  // Module trigger (inside table)
  modTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#F9FAFB', alignSelf: 'flex-start',
    maxWidth: COL.update - 24,
  },
  modTriggerText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },

  // Inline warning / success
  inlineWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    backgroundColor: '#FEF2F2', borderRadius: 7, padding: 7, marginTop: 8,
    borderLeftWidth: 2, borderLeftColor: '#EF4444',
  },
  inlineWarnText: { color: '#DC2626', fontSize: 10, fontWeight: '600', lineHeight: 14 },
  inlineWarnSub:  { color: '#9CA3AF', fontSize: 10, lineHeight: 13, marginTop: 1 },
  inlineOk: {
    backgroundColor: '#F0FDF4', borderRadius: 7, padding: 7, marginTop: 8,
    borderLeftWidth: 2, borderLeftColor: '#22C55E',
  },
  inlineOkText: { color: '#9CA3AF', fontSize: 10, lineHeight: 13 },

  // Save bar
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  saveBarLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dirtyDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F97316' },
  saveBarHint:     { fontSize: 13, color: '#6B7280' },
  saveBarHintBold: { fontWeight: '700', color: '#111827' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#F97316', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
})