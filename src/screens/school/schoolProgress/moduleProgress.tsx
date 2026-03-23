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
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native'
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
  teacher_name: string | null
  current_module: {
    module_id: number | null
    module_name: string | null
    module_number: number | null
    level: { id: number | string; name: string } | null
  }
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
const C = { sec: 110, teacher: 120, last: 140, update: 120 }

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
  const listTop  = (SCREEN_H - (pos.y + pos.h) - MARGIN) >= estH ? pos.y + pos.h + 4 : pos.y - estH - 4

  return (
    <>
      <TouchableOpacity ref={ref} style={[s.dropdown, disabled && { opacity: 0.5 }]} onPress={openDrop} activeOpacity={0.85}>
        <Text style={s.dropdownValue} numberOfLines={1}>{value || 'Select...'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
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
                      style={[s.floatOpt, selected && s.floatOptActive, i < options.length - 1 && s.floatOptBorder]}
                      onPress={() => { onSelect(opt.value); setOpen(false) }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.floatOptText, selected && s.floatOptTextActive]} numberOfLines={2}>{opt.label}</Text>
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

// ─── ModuleDrop ───────────────────────────────────────────────────────────────
function ModuleDrop({
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

  const MENU_W = 160
  const MENU_H = Math.min(modules.length * 44, 300)
  const openDrop = () => { ref.current?.measureInWindow((x, y, w, h) => { setPos({ x, y, w, h }); setOpen(true) }) }
  const menuLeft = Math.max(8, Math.min(pos.x, SCREEN_W - MENU_W - 8))
  const menuTop  = (SCREEN_H - (pos.y + pos.h) - 16) >= MENU_H ? pos.y + pos.h + 4 : pos.y - MENU_H - 4
  const selectedModule = modules.find(m => String(m.id) === String(value))

  return (
    <>
      <TouchableOpacity ref={ref} style={s.modTrigger} onPress={openDrop} activeOpacity={0.85}>
        <Text style={s.modTriggerText} numberOfLines={1}>
          {selectedModule ? `M${selectedModule.module_number}` : 'Select'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
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
                      style={[s.floatOpt, selected && s.floatOptActive, locked && s.floatOptDim, i < modules.length - 1 && s.floatOptBorder]}
                      onPress={() => { if (!locked) { onSelect(m.id); setOpen(false) } }}
                      activeOpacity={locked ? 1 : 0.75}
                    >
                      {locked
                        ? <Ionicons name="lock-closed-outline" size={11} color="#D1D5DB" style={{ marginRight: 4 }} />
                        : <View style={{ width: 15 }} />
                      }
                      <Text style={[s.floatOptText, selected && s.floatOptTextActive, locked && s.floatOptTextDim]}>{m.name}</Text>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ModuleProgress() {
  const navigation = useNavigation<any>()
  const route      = useRoute<any>()
  const school     = route.params?.school  // { id, name, address }

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

  // ── 1. Load school programs on mount ──────────────────────────────────────
  useEffect(() => {
    if (school?.id) loadPrograms()
  }, [])

  const loadPrograms = async () => {
    setLoadingPrograms(true)
    const res = await getSchoolPrograms(school.id)
    if (res.success && res.data?.length) {
      // map to { id: Program UUID, name: program_name }
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

  // ── 2. Program changed → load levels ──────────────────────────────────────
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

  // ── 3. Level changed → reload progress filtered by this level ─────────────
  useEffect(() => {
    if (!selectedLevelId || !school?.id) return
    loadProgress(selectedLevelId)
  }, [selectedLevelId])

  const loadProgress = async (levelId: string | number) => {
    setLoadingProgress(true)
    setSections([])
    const res = await getModuleProgress(school.id)
    if (res.success && res.data?.sections) {
      const allRows: SectionRow[] = res.data.sections.map((sec: ApiSection) => ({
        ...sec,
        selectedModuleId: sec.next_module?.module_id ?? null,
        isDirty: false,
      }))

      // Filter by selected level — compare both as strings to avoid type mismatch
      const filtered = allRows.filter(row =>
        row.current_module?.level?.id !== null &&
        row.current_module?.level?.id !== undefined &&
        String(row.current_module.level.id) === String(levelId)
      )

      setSections(filtered)
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
      loadProgress(selectedLevelId!)
    } else {
      Alert.alert('Partial Save', `${successCount} saved, ${failCount} failed. Please retry.`)
    }
  }

  const programOptions = programs.map(p => ({ label: p.name, value: String(p.id) }))
  const levelOptions   = levels.map(l => ({ label: l.name, value: String(l.id) }))

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Module Progress" />

      {toast && (
        <View style={s.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={s.toastText}>Module progress updated successfully</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 18 }}><SchoolBanner /></View>

        {/* Program */}
        <View style={s.fieldBlock}>
          <Text style={s.fieldLabel}>Select Program</Text>
          {loadingPrograms ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 8 }} />
          ) : programOptions.length === 0 ? (
            <View style={s.emptyField}>
              <Ionicons name="alert-circle-outline" size={16} color="#9CA3AF" />
              <Text style={s.emptyFieldText}>No programs assigned to this school</Text>
            </View>
          ) : (
            <FloatDropdown
              value={programOptions.find(p => p.value === String(selectedProgramId))?.label ?? ''}
              options={programOptions}
              onSelect={v => setSelectedProgramId(v)}  // ← string UUID, not Number()
            />
          )}
        </View>

        {/* Level */}
        <View style={s.fieldBlock}>
          <Text style={s.fieldLabel}>Select Level</Text>
          {loadingLevels ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 8 }} />
          ) : levelOptions.length === 0 && selectedProgramId ? (
            <View style={s.emptyField}>
              <Ionicons name="alert-circle-outline" size={16} color="#9CA3AF" />
              <Text style={s.emptyFieldText}>No levels found for this program</Text>
            </View>
          ) : (
            <FloatDropdown
              value={levelOptions.find(l => l.value === String(selectedLevelId))?.label ?? ''}
              options={levelOptions}
              onSelect={v => setSelectedLevelId(v)}   // ← string UUID, not Number()
              disabled={!levelOptions.length}
            />
          )}
        </View>

        {/* Table */}
        <View style={s.tableCard}>
          <View style={s.tableTitleBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={s.tableTitleIcon}>
                <Ionicons name="grid" size={13} color="#F97316" />
              </View>
              <Text style={s.tableTitleText}>Section-wise Progress</Text>
            </View>
            {/* <TouchableOpacity
              style={s.manageSectionsBtn}
              onPress={() => navigation.navigate('SectionsManagement', { school })}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={12} color="#F97316" />
              <Text style={s.manageSectionsBtnText}>Manage</Text>
            </TouchableOpacity> */}
          </View>

          {loadingProgress ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator color="#F97316" size="large" />
              <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13 }}>Loading sections...</Text>
            </View>
          ) : sections.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Ionicons name="school-outline" size={40} color="#E5E7EB" />
              <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13 }}>No sections found for this level</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <View>
                <View style={s.thead}>
                  {[['SECTION', C.sec], ['ASSIGNED\nTEACHER', C.teacher], ['LAST MODULE\nUPDATED', C.last], ['UPDATE\nMODULE', C.update]].map(([label, width], i) => (
                    <View key={i} style={[s.th, { width: width as number }, i === 3 && { borderRightWidth: 0 }]}>
                      <Text style={s.thText}>{label as string}</Text>
                    </View>
                  ))}
                </View>

                {sections.map((item, index) => {
                  const isLast    = index === sections.length - 1
                  const selMod    = moduleOptions.find(m => String(m.id) === String(item.selectedModuleId))
                  const isWarning = item.isDirty && item.selectedModuleId !== null &&
                    item.current_module.module_number !== null &&
                    (selMod?.module_number ?? 0) <= item.current_module.module_number
                  const isUpdated = item.isDirty && !isWarning

                  const lastUpdatedDate = item.last_updated
                    ? new Date(item.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'
                  const lastUpdatedTime = item.last_updated
                    ? new Date(item.last_updated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : ''

                  return (
                    <View key={String(item.section_id)} style={[s.trow, isWarning && s.trowWarning, !isLast && s.trowBorder]}>
                      <View style={[s.td, { width: C.sec }]}>
                        <Text style={s.tdClass}>{item.class_name ?? '—'}</Text>
                        <Text style={s.tdDash}>-</Text>
                        <Text style={s.tdSection}>{item.section_name ?? '—'}</Text>
                        {isUpdated && <View style={s.pillGreen}><Text style={s.pillGreenText}>Updated</Text></View>}
                      </View>
                      <View style={[s.td, { width: C.teacher }]}>
                        <Text style={s.tdTeacher}>{item.teacher_name ?? 'Not assigned'}</Text>
                      </View>
                      <View style={[s.td, { width: C.last }]}>
                        <Text style={s.tdModName}>{item.current_module.module_name ?? 'No data'}</Text>
                        <Text style={s.tdDate}>{lastUpdatedDate}</Text>
                        {lastUpdatedTime ? <Text style={s.tdDate}>{lastUpdatedTime}</Text> : null}
                      </View>
                      <View style={[s.td, { width: C.update, alignItems: 'center', borderRightWidth: 0 }]}>
                        <ModuleDrop
                          value={item.selectedModuleId}
                          modules={moduleOptions}
                          currentModuleNumber={item.current_module.module_number}
                          onSelect={v => updateSection(index, v)}
                        />
                        {isWarning && (
                          <View style={s.inlineWarning}>
                            <Text style={s.inlineWarningText}>Module lower than current progress.</Text>
                            <Text style={s.inlineEntry}>Current: {item.current_module.module_name}</Text>
                          </View>
                        )}
                        {isUpdated && (
                          <View style={s.inlineSuccess}>
                            <Text style={s.inlineSuccessText}>Current: {item.current_module.module_name}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <View style={s.saveWrap}>
        <TouchableOpacity style={s.saveBtn} onPress={saveProgress} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={s.saveBtnText}>Save Module Progress</Text></>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  toast: { position:'absolute', top:68, left:16, right:16, zIndex:999, backgroundColor:'#10B981', padding:14, borderRadius:12, flexDirection:'row', alignItems:'center', gap:10, shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.18, shadowRadius:8, elevation:10 },
  toastText: { color:'#fff', fontWeight:'700', fontSize:13, flex:1 },
  fieldBlock: { marginHorizontal:16, marginBottom:12 },
  fieldLabel: { fontSize:13, fontWeight:'700', color:'#374151', marginBottom:6 },
  emptyField: { flexDirection:'row', alignItems:'center', backgroundColor:'#F9FAFB', borderWidth:1.5, borderColor:'#E5E7EB', borderRadius:12, paddingHorizontal:14, paddingVertical:14, gap:8 },
  emptyFieldText: { fontSize:13, color:'#9CA3AF', fontStyle:'italic' },
  dropdown:      { backgroundColor:'#fff', paddingHorizontal:14, paddingVertical:14, borderRadius:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderColor:'#E5E7EB' },
  dropdownValue: { fontSize:14, color:'#111827', fontWeight:'500', flex:1, marginRight:8 },
  floatList: { position:'absolute', backgroundColor:'#fff', borderRadius:12, borderWidth:1.5, borderColor:'#E5E7EB', overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.14, shadowRadius:14, elevation:14, zIndex:9999 },
  floatOpt:           { flexDirection:'row', alignItems:'center', paddingVertical:13, paddingHorizontal:14 },
  floatOptBorder:     { borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  floatOptActive:     { backgroundColor:'#FFF7ED' },
  floatOptDim:        { backgroundColor:'#FAFAFA' },
  floatOptText:       { fontSize:13, color:'#374151', flex:1 },
  floatOptTextActive: { color:'#F97316', fontWeight:'700' },
  floatOptTextDim:    { color:'#D1D5DB' },
  tableCard: { backgroundColor:'#fff', marginHorizontal:16, marginBottom:16, borderRadius:14, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  tableTitleBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  tableTitleIcon: { width:24, height:24, borderRadius:6, backgroundColor:'#FFF7ED', alignItems:'center', justifyContent:'center' },
  tableTitleText: { fontWeight:'800', fontSize:14, color:'#111827' },
  thead: { flexDirection:'row', backgroundColor:'#F8FAFC', borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  th: { paddingVertical:10, paddingHorizontal:10, borderRightWidth:1, borderRightColor:'#E5E7EB', justifyContent:'center' },
  thText: { fontSize:9, fontWeight:'800', color:'#9CA3AF', letterSpacing:0.5, textTransform:'uppercase', lineHeight:14 },
  trow:        { flexDirection:'row' },
  trowWarning: { backgroundColor:'#FFF5F5' },
  trowBorder:  { borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  td: { paddingVertical:14, paddingHorizontal:10, borderRightWidth:1, borderRightColor:'#F1F5F9', justifyContent:'flex-start' },
  tdClass:   { fontSize:13, fontWeight:'800', color:'#111827' },
  tdDash:    { fontSize:12, color:'#9CA3AF' },
  tdSection: { fontSize:12, color:'#374151' },
  tdTeacher: { fontSize:12, color:'#374151', lineHeight:18 },
  tdModName: { fontSize:13, fontWeight:'700', color:'#111827' },
  tdDate:    { fontSize:11, color:'#9CA3AF', lineHeight:16 },
  pillGreen:     { backgroundColor:'#DCFCE7', paddingHorizontal:7, paddingVertical:3, borderRadius:20, marginTop:6, alignSelf:'flex-start' },
  pillGreenText: { color:'#16A34A', fontSize:10, fontWeight:'700' },
  modTrigger:     { flexDirection:'row', alignItems:'center', gap:4, borderWidth:1.5, borderColor:'#E5E7EB', borderRadius:8, paddingHorizontal:10, paddingVertical:7, backgroundColor:'#FAFAFA', alignSelf:'center' },
  modTriggerText: { fontSize:13, fontWeight:'700', color:'#111827' },
  inlineWarning:     { backgroundColor:'#FEF2F2', borderRadius:8, padding:6, marginTop:8, borderLeftWidth:3, borderLeftColor:'#EF4444', width:100 },
  inlineWarningText: { color:'#DC2626', fontSize:9, fontWeight:'600', lineHeight:13 },
  inlineEntry:       { color:'#9CA3AF', fontSize:9, marginTop:3, lineHeight:12 },
  inlineSuccess:     { backgroundColor:'#F0FDF4', borderRadius:8, padding:6, marginTop:8, borderLeftWidth:3, borderLeftColor:'#22C55E', width:100 },
  inlineSuccessText: { color:'#9CA3AF', fontSize:9, lineHeight:12 },
  manageSectionsBtn:     { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#FFF7ED', paddingHorizontal:10, paddingVertical:5, borderRadius:20, borderWidth:1, borderColor:'#FED7AA' },
  manageSectionsBtnText: { fontSize:11, fontWeight:'700', color:'#F97316' },
  saveWrap:    { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#F3F4F6', paddingHorizontal:16, paddingTop:10, paddingBottom:24 },
  saveBtn:     { backgroundColor:'#F97316', paddingVertical:16, borderRadius:14, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10 },
  saveBtnText: { color:'#fff', fontWeight:'800', fontSize:16 },
})