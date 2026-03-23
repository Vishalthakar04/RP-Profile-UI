// screens/visit/ClassObservation.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { launchCamera, launchImageLibrary, MediaType } from 'react-native-image-picker'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import AppHeader from '../../../components/AppHeader'
import SchoolBanner from '../../../components/SchoolBanner'
import StepBar from '../../../components/StepBar'

// ─── Services ─────────────────────────────────────────────────────────────────
import { getSchoolPrograms, getProgramLevels, getSchoolSections } from '../../../services/school'
import {
  getQuestionSets,
  getScheduleStatus,
  createClassObservation,
  createAdoptedClass,
  createEnablingSession,
  createNoClassObserved,
  createImpactSurvey,
  uploadVisitMedia,
} from '../../../services/observation'

const SCREEN_HEIGHT = Dimensions.get('window').height

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleStatus = 'behind' | 'on_track' | 'ahead' | 'not_applicable'
type PurposeType    = 'Class Observation' | 'Adopted Class' | 'Enabling Session' | 'No Class Observed' | 'Impact Survey'
type MediaItem      = { uri: string; type: 'image' | 'video'; fileName?: string; mimeType?: string }

interface SchoolProgram {
  id:           string
  program_id:   string
  program_name: string
  status:       string
  program?: { id: string; name: string; type: string; duration_years: number }
}

interface ApiModule {
  id:            string
  name:          string
  module_number: number
  start_week:    number
  end_week:      number
}
interface ApiLevel {
  id:          string
  name:        string
  order_index: number
  total_units: number
  modules:     ApiModule[]
}
interface ApiSection {
  id:           string
  class_name:   string
  section_name: string
  status:       string
  teacher_id?:  string   // top-level from API
  teacher?: { id: string; name: string; phone: string; designation: string }
}

interface BackendOption      { score: number; label: string; is_na: boolean }
interface BackendQuestion    { id: string; label: string; order_index: number; is_na_allowed: boolean; options: BackendOption[] }
interface BackendQuestionSet { id: string; module_type: string; score_strong_min: number; score_developing_min: number; questions: BackendQuestion[] }

// ─── Static config ────────────────────────────────────────────────────────────

const SCHEDULE_STYLE: Record<string, { label: string; bg: string; color: string; border: string; icon: any }> = {
  behind:         { label:'BEHIND SCHEDULE', bg:'#FEF2F2', color:'#DC2626', border:'#FECACA', icon:'trending-down-outline' },
  on_track:       { label:'ON TRACK',        bg:'#F0FDF4', color:'#16A34A', border:'#BBF7D0', icon:'checkmark-circle-outline' },
  ahead:          { label:'AHEAD',           bg:'#EFF6FF', color:'#2563EB', border:'#BFDBFE', icon:'trending-up-outline' },
  not_applicable: { label:'N/A',             bg:'#F3F4F6', color:'#6B7280', border:'#E5E7EB', icon:'remove-circle-outline' },
}

const NO_CLASS_REASONS = ['School Holiday','Facilitator Absent','Class Cancelled','Exam / Assessment Week','Other']

const AACT_MENTOR_KW = [
  'Clear understanding of AACT goals','Partial understanding of program',
  'Needs more clarity on facilitation','Actively guiding student projects',
  'Providing occasional support','Limited progress on activities',
  'Yet to initiate project work','Difficulty managing time',
  'Requires additional guidance','Resource / technology constraints',
]
const AACT_STUDENT_KW = [
  'Enjoy working on projects','Find activities somewhat interesting',
  'Difficulty managing time','Learned new skills',
  'Connected to real-life issues','Enjoy working in groups',
  'Uneven participation in group','Mentor guidance helpful',
  'Difficulty generating ideas','Project work not started yet',
]
const DELAY_CHALLENGES_OPTIONS = [
  'Recently joined / transferred to the school','Exam or assessment period',
  'School events / functions','Holiday interruptions','Program started late',
  'Training received late','Training was unclear','Heavy academic syllabus',
  'Limited class periods available','Heavy workload / multiple duties',
  'Irregular class schedule','Class not yet assigned','Student absenteeism',
  'Large class size','Language difficulty with students','Sudden change in school timing',
  'Lack of preparation time','Smart class availability issue','Smartboard was not working',
  'On out-duty / official work','On leave','Difficulty managing class discussion time',
  'Delay in receiving program content','Any other',
]
const DELAY_CATCHUP_OPTIONS = [
  'Conduct extra classes','Use arrangement / substitute periods',
  'Integrate with regular subjects','Use morning assembly time',
  'Quick recap of previous modules','Better weekly time planning',
  'Complete two sessions in one class where possible',
  'Take support from other trained teachers','Any other',
]
const DELAY_SUGGESTIONS_OPTIONS = [
  'Focus on time management in class','Avoid explaining too much',
  'Keep discussions concise','Follow the process of navigating slides',
  'Read the modules in advance','Maintain a weekly tracking sheet',
  'Fix a regular value-education period','Collaborate with other trained teachers',
  'Seek support from RP','Follow the process of the activities as per manual',
  'Conduct missed sessions during free periods','Take arrangement classes if needed','Any other',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreResult(score: number, set: BackendQuestionSet) {
  if (score >= set.score_strong_min)     return { label:'Strong Facilitation', color:'#16A34A' }
  if (score >= set.score_developing_min) return { label:'Developing',          color:'#CA8A04' }
  return                                        { label:'Needs Support',        color:'#DC2626' }
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    Alert.alert('Camera Permission Required', 'Please allow camera access in settings.')
    return false
  }
  return true
}

async function uploadAllMedia(visitId: string | number, items: MediaItem[], tag: string): Promise<string[]> {
  const urls: string[] = []
  for (const item of items) {
    const fileName = item.fileName ?? `media_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`
    const mimeType = item.mimeType ?? (item.type === 'video' ? 'video/mp4' : 'image/jpeg')
    const res = await uploadVisitMedia(visitId, item.uri, fileName, mimeType, tag)
    if (res.success && res.data?.url) urls.push(res.data.url)
  }
  return urls
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RequiredLabel({ text }: { text: string }) {
  return (
    <View style={s.reqLabelRow}>
      <Text style={s.fieldLabel}>{text}</Text>
      <Text style={s.reqStar}>*</Text>
    </View>
  )
}

function Dropdown({ value, options, onChange, placeholder = 'Select', loading }: {
  value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; loading?: boolean
}) {
  const [open, setOpen]     = useState(false)
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0 })
  const ref = useRef<View>(null)

  const openDrop = () =>
    ref.current?.measure((_fx, _fy, width, _h, px, py) => {
      setLayout({ x: px, y: py + 46, width }); setOpen(true)
    })

  const opensDown = layout.y + 220 < SCREEN_HEIGHT
  const menuTop   = opensDown ? layout.y : layout.y - 220 - 46

  if (loading) {
    return (
      <View style={[s.dropdown, { justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color="#F97316" />
      </View>
    )
  }

  return (
    <>
      <TouchableOpacity ref={ref} style={s.dropdown} onPress={openDrop} activeOpacity={0.8}>
        <Text style={[s.dropdownText, !value && { color:'#9CA3AF' }]} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="#9CA3AF" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
        <View style={[s.ddMenu, { top: menuTop, left: layout.x, width: layout.width }]}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            {options.length === 0
              ? <View style={{ paddingHorizontal:16, paddingVertical:20, alignItems:'center' }}>
                  <Ionicons name="alert-circle-outline" size={22} color="#D1D5DB" />
                  <Text style={{ fontSize:12, color:'#9CA3AF', marginTop:6, textAlign:'center' }}>No options available</Text>
                </View>
              : options.map(opt => (
                  <TouchableOpacity key={opt} style={[s.ddItem, value === opt && s.ddItemActive]} onPress={() => { onChange(opt); setOpen(false) }}>
                    <Text style={[s.ddItemText, value === opt && s.ddItemTextActive]}>{opt}</Text>
                    {value === opt && <Ionicons name="checkmark" size={14} color="#F97316" />}
                  </TouchableOpacity>
                ))
            }
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

function LockedField({ value, badge }: { value: string; badge?: string }) {
  return (
    <View style={s.lockedField}>
      <Ionicons name="lock-closed" size={13} color="#8B5CF6" />
      <Text style={s.lockedFieldText}>{value || '—'}</Text>
      {badge && (<><View style={{ flex:1 }} /><View style={s.lockedBadge}><Text style={s.lockedBadgeText}>{badge}</Text></View></>)}
    </View>
  )
}

function FacilitatorField({ section }: { section: ApiSection | null }) {
  if (!section) {
    return (
      <View style={[s.lockedField, { opacity: 0.45 }]}>
        <Ionicons name="lock-closed" size={13} color="#8B5CF6" />
        <Text style={[s.lockedFieldText, { color:'#9CA3AF' }]}>Select section first</Text>
      </View>
    )
  }
  return <LockedField value={section.teacher?.name ?? 'No teacher assigned'} badge="ASSIGNED" />
}

function DelayOptionField({ label, icon, options, selected, onToggle, otherText, onOtherText }: {
  label: string; icon: any; options: string[]
  selected: string[]; onToggle: (v: string) => void
  otherText: string; onOtherText: (v: string) => void
}) {
  const hasAny = selected.length > 0
  return (
    <View style={s.delayFieldBlock}>
      <View style={s.delayFieldHeader}>
        <Ionicons name={icon} size={14} color="#DC2626" />
        <Text style={s.delayFieldLabel}>{label}</Text>
        <Text style={s.reqStar}>*</Text>
        {hasAny
          ? <View style={s.delayAnsweredBadge}><Ionicons name="checkmark-circle" size={12} color="#16A34A" /><Text style={s.delayAnsweredBadgeText}>{selected.length} selected</Text></View>
          : <View style={s.delayRequiredBadge}><Text style={s.delayRequiredBadgeText}>Required</Text></View>
        }
      </View>
      <View style={s.delayChipsWrap}>
        {options.map(opt => {
          const active = selected.includes(opt); const isOther = opt === 'Any other'
          return (
            <TouchableOpacity key={opt} style={[s.delayChip, active && s.delayChipActive, isOther && active && s.delayChipOtherActive]} onPress={() => onToggle(opt)} activeOpacity={0.75}>
              <View style={[s.delayCheckbox, active && (isOther ? s.delayCheckboxOther : s.delayCheckboxActive)]}>
                {active && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              <Text style={[s.delayChipText, active && s.delayChipTextActive, isOther && active && { color:'#7C3AED' }]}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {selected.includes('Any other') && (
        <TextInput value={otherText} onChangeText={onOtherText} placeholder="Please specify..." placeholderTextColor="#9CA3AF" multiline numberOfLines={2}
          style={[s.textArea, { marginTop:8, borderColor:'#DDD6FE', backgroundColor:'#FAF5FF' }]} />
      )}
    </View>
  )
}

function RadioGroup({ num, question, answers, setAnswer, subAnswers, setSubAnswer }: {
  num: number; question: BackendQuestion
  answers: Record<string, number>; setAnswer: (qId: string, optIdx: number) => void
  subAnswers: Record<string, boolean>; setSubAnswer: (key: string, val: boolean) => void
}) {
  const opts        = question.options ?? []
  const sel         = answers[question.id]
  const isAnswered  = sel !== undefined
  const earnedScore = isAnswered ? (opts[sel]?.score ?? 0) : null
  const pillColor   = (score: number, selected: boolean) => {
    if (!selected)   return { bg:'#F3F4F6', text:'#9CA3AF', border:'#E5E7EB' }
    if (score === 3) return { bg:'#F0FDF4', text:'#16A34A', border:'#86EFAC' }
    if (score === 2) return { bg:'#FEFCE8', text:'#CA8A04', border:'#FDE047' }
    if (score === 1) return { bg:'#FEF2F2', text:'#DC2626', border:'#FECACA' }
    return { bg:'#F3F4F6', text:'#9CA3AF', border:'#E5E7EB' }
  }
  return (
    <View style={s.questionBlock}>
      <View style={s.questionHeaderRow}>
        <View style={{ flex:1, flexDirection:'row', alignItems:'flex-start' }}>
          <Text style={s.questionText}><Text style={s.questionNum}>{num}. </Text>{question.label}</Text>
          <Text style={s.reqStar}> *</Text>
        </View>
        <View style={[s.questionScoreBadge, isAnswered ? s.questionScoreBadgeAnswered : s.questionScoreBadgeEmpty]}>
          <Text style={[s.questionScoreBadgeText, isAnswered ? s.questionScoreBadgeTextAnswered : s.questionScoreBadgeTextEmpty]}>
            {isAnswered ? earnedScore : '-'}/3
          </Text>
        </View>
      </View>
      <View style={s.optionsColumn}>
        {opts.map((opt, idx) => {
          const isSel = sel === idx; const isNA = (opt as any).is_na; const pc = pillColor(opt.score, isSel)
          return (
            <View key={idx}>
              <TouchableOpacity style={[s.optionCard, isSel && s.optionCardSelected]} onPress={() => setAnswer(question.id, idx)} activeOpacity={0.75}>
                <View style={s.optionCardRow}>
                  <View style={[s.radioOuter, isSel && s.radioOuterSelected]}>{isSel && <View style={s.radioInner} />}</View>
                  <Text style={[s.optionLabel, isSel && s.optionLabelSelected]} numberOfLines={2}>{opt.label}</Text>
                  {!isNA && <View style={[s.optionScorePill, { backgroundColor:pc.bg, borderColor:pc.border }]}><Text style={[s.optionScorePillText, { color:pc.text }]}>{opt.score} pt{opt.score !== 1 ? 's' : ''}</Text></View>}
                  {isSel && !isNA && <View style={s.checkCircle}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                </View>
              </TouchableOpacity>
              {isSel && !isNA && ((opt as any).sub_points ?? []).length > 0 && (
                <View style={s.subPointsContainer}>
                  {((opt as any).sub_points ?? []).map((pt: string, pi: number) => {
                    const subKey = `${question.id}_${idx}_${pi}`
                    const checked = subAnswers[subKey] ?? false
                    return (
                      <TouchableOpacity key={pi} style={[s.subPointCard, checked && s.subPointCardChecked]} onPress={() => setSubAnswer(subKey, !checked)} activeOpacity={0.75}>
                        <View style={[s.checkbox, checked && s.checkboxChecked]}>{checked && <Ionicons name="checkmark" size={11} color="#fff" />}</View>
                        <Text style={[s.subPointText, checked && s.subPointTextChecked]}>{pt}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function MediaSection({ mediaItems, setMediaItems }: {
  mediaItems: MediaItem[]; setMediaItems: (items: MediaItem[]) => void; optional?: boolean
}) {
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const takePhoto = async () => {
    if (!await requestCameraPermission()) return
    launchCamera({ mediaType:'photo' as MediaType, quality:0.85, saveToPhotos:true }, res => {
      if (!res.didCancel && res.assets?.[0]?.uri)
        setMediaItems([...mediaItems, { uri:res.assets[0].uri!, type:'image', fileName:res.assets[0].fileName, mimeType:res.assets[0].type }])
    })
  }
  const recordVideo = async () => {
    if (!await requestCameraPermission()) return
    launchCamera({ mediaType:'video' as MediaType, videoQuality:'medium', durationLimit:60 }, res => {
      if (!res.didCancel && res.assets?.[0]?.uri)
        setMediaItems([...mediaItems, { uri:res.assets[0].uri!, type:'video', fileName:res.assets[0].fileName, mimeType:res.assets[0].type }])
    })
  }
  const pickFromGallery = () => {
    launchImageLibrary({ mediaType:'mixed' as MediaType, quality:0.85, selectionLimit:10 }, res => {
      if (!res.didCancel && res.assets?.length)
        setMediaItems([...mediaItems, ...res.assets.map(a => ({ uri:a.uri!, type:(a.type?.startsWith('video') ? 'video' : 'image') as 'image'|'video', fileName:a.fileName, mimeType:a.type }))])
    })
  }
  const removeItem = (idx: number) => setMediaItems(mediaItems.filter((_, i) => i !== idx))
  return (
    <View style={s.card}>
      <View style={s.mediaActionRow}>
        {[
          { icon:'camera',   label:'TAKE PHOTO',  onPress:takePhoto       },
          { icon:'images',   label:'GALLERY',     onPress:pickFromGallery },
          { icon:'videocam', label:'VIDEO (60S)',  onPress:recordVideo     },
        ].map(btn => (
          <TouchableOpacity key={btn.label} style={s.mediaActionBtn} onPress={btn.onPress} activeOpacity={0.8}>
            <View style={s.mediaActionIcon}><Ionicons name={btn.icon} size={22} color="#F97316" /></View>
            <Text style={s.mediaActionLabel}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mediaItems.length > 0 && (
        <View style={s.previewGrid}>
          {mediaItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={s.previewThumb} onPress={() => setPreviewUri(item.uri)} activeOpacity={0.85}>
              <Image source={{ uri:item.uri }} style={s.previewThumbImg} resizeMode="cover" />
              {item.type === 'video' && <View style={s.videoBadge}><Ionicons name="play" size={10} color="#fff" /><Text style={s.videoBadgeText}>VID</Text></View>}
              <TouchableOpacity style={s.removeBtn} onPress={() => removeItem(idx)}><Ionicons name="close-circle" size={18} color="#EF4444" /></TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.addMoreThumb} onPress={pickFromGallery} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#F97316" /><Text style={s.addMoreText}>Add More</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.locationBox}>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
          <Text style={s.locationText}>GPS captured</Text>
          <View style={{ flex:1 }} />
          <Ionicons name="time-outline" size={13} color="#9CA3AF" />
          <Text style={s.locationText}>{new Date().toLocaleString()}</Text>
        </View>
      </View>
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={s.previewModal}>
          <TouchableOpacity style={s.previewModalClose} onPress={() => setPreviewUri(null)}><Ionicons name="close-circle" size={34} color="#fff" /></TouchableOpacity>
          {previewUri && <Image source={{ uri:previewUri }} style={s.previewModalImg} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  )
}

const SCORE_CONFIG = {
  'Strong Facilitation': { icon:'trophy-outline'       as const, iconBg:'#FFF7ED', iconColor:'#F97316', pillBg:'#FFF7ED', pillText:'#C2540A', titleColor:'#F97316' },
  'Developing':          { icon:'trending-up-outline'  as const, iconBg:'#FFFBEB', iconColor:'#B45309', pillBg:'#FFFBEB', pillText:'#92400E', titleColor:'#B45309' },
  'Needs Support':       { icon:'alert-circle-outline' as const, iconBg:'#FEF2F2', iconColor:'#DC2626', pillBg:'#FEF2F2', pillText:'#991B1B', titleColor:'#DC2626' },
}
function ScoreModal({ visible, onClose, totalScore, maxScore, questionSet }: {
  visible: boolean; onClose: () => void; totalScore: number; maxScore: number; questionSet: BackendQuestionSet | null
}) {
  if (!questionSet) return null
  const result = getScoreResult(totalScore, questionSet)
  const cfg    = SCORE_CONFIG[result.label as keyof typeof SCORE_CONFIG] ?? SCORE_CONFIG['Strong Facilitation']
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={s.modalOverlay} /></TouchableWithoutFeedback>
      <View style={s.modalCenterWrap} pointerEvents="box-none">
        <View style={s.modalCard}>
          <TouchableOpacity style={s.modalXBtn} onPress={onClose} hitSlop={{ top:12, bottom:12, left:12, right:12 }}><Ionicons name="close" size={18} color="#9CA3AF" /></TouchableOpacity>
          <View style={[s.modalIconCircle, { backgroundColor:cfg.iconBg }]}><Ionicons name={cfg.icon} size={34} color={cfg.iconColor} /></View>
          <Text style={s.modalEyebrow}>SCORE RESULT</Text>
          <Text style={[s.modalTitle, { color:cfg.titleColor }]}>{result.label}</Text>
          <View style={[s.modalPill, { backgroundColor:cfg.pillBg }]}>
            <Text style={[s.modalPillScore, { color:cfg.pillText }]}>{totalScore}</Text>
            <Text style={[s.modalPillSep,   { color:cfg.pillText }]}>/</Text>
            <Text style={[s.modalPillMax,   { color:cfg.pillText }]}>{maxScore}</Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// =============================================================================
//  MAIN SCREEN
// =============================================================================

export default function ClassObservation() {
  const navigation    = useNavigation()
  const route         = useRoute()
  const visitContext  = useVisit()
  const currentSchool = visitContext?.currentSchool

  const { purpose: routePurpose, visitId } =
    (route.params ?? {}) as { purpose?: string; visitId?: string | number }
  const purpose = (routePurpose || 'Class Observation') as PurposeType

  // ── School programs ───────────────────────────────────────────────────────
  const [programIdMap,    setProgramIdMap]    = useState<Record<string, string>>({})
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programsError,   setProgramsError]   = useState<string | null>(null)

  const loadSchoolPrograms = useCallback(async () => {
    if (!currentSchool?.id) { setProgramsError('No school selected'); setProgramsLoading(false); return }
    setProgramsLoading(true); setProgramsError(null)
    const res = await getSchoolPrograms(currentSchool.id)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const map: Record<string, string> = {}
      res.data.forEach((sp: SchoolProgram) => {
        const name = sp.program_name ?? sp.program?.name
        if (name && sp.program_id) map[name] = sp.program_id
      })
      setProgramIdMap(map)
    } else {
      setProgramsError(res.message || 'No programs found for this school')
    }
    setProgramsLoading(false)
  }, [currentSchool?.id])

  useEffect(() => { loadSchoolPrograms() }, [loadSchoolPrograms])

  const uuidFor               = (name: string): string | undefined => programIdMap[name]
  const availableProgramNames = Object.keys(programIdMap)
  const programNamesNoAACT    = availableProgramNames.filter(n => n !== 'AACT')

  // ── Save ──────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)

  // =========================================================================
  //  CLASS OBSERVATION — state
  // =========================================================================

  // Step 1: Program
  const [coProgram, setCoProgram] = useState('')
  useEffect(() => {
    if (availableProgramNames.length > 0 && !coProgram && purpose === 'Class Observation')
      setCoProgram(availableProgramNames[0])
  }, [availableProgramNames])

  // Step 2: Levels
  const [coLevels,        setCoLevels]        = useState<ApiLevel[]>([])
  const [coLevelsLoading, setCoLevelsLoading] = useState(false)
  const [coLevel,         setCoLevel]         = useState<ApiLevel | null>(null)

  // Step 3: Module (from coLevel.modules)
  const [coModule, setCoModule] = useState<ApiModule | null>(null)
  const coModuleOptions = coLevel?.modules ?? []

  // Step 4+5: Class + Section
  const [coAllSections,     setCoAllSections]     = useState<ApiSection[]>([])
  const [coSectionsLoading, setCoSectionsLoading] = useState(false)
  const [coSection,         setCoSection]         = useState<ApiSection | null>(null)

  // Class is locked — take the first class_name from the sections list (backend will return single value)
  const coLockedClassName: string      = coAllSections[0]?.class_name ?? ''
  const coSectionOptions:  ApiSection[] = coAllSections.filter(sec => sec.class_name === coLockedClassName)

  // Questions
  const [questionSet,      setQuestionSet]      = useState<BackendQuestionSet | null>(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError,   setQuestionsError]   = useState<string | null>(null)
  const [answers,    setAnswersMap]  = useState<Record<string, number>>({})
  const [subAnswers, setSubAnswers]  = useState<Record<string, boolean>>({})

  // Schedule
  const [scheduleStatus,   setScheduleStatus]   = useState<ScheduleStatus>('on_track')
  const [scheduleLoading,  setScheduleLoading]  = useState(false)
  const [showBehindFields, setShowBehindFields] = useState(false)
  const [delayChallengesSel,    setDelayChallengesSel]    = useState<string[]>([])
  const [delayChallengesOther,  setDelayChallengesOther]  = useState('')
  const [delayCatchupSel,       setDelayCatchupSel]       = useState<string[]>([])
  const [delayCatchupOther,     setDelayCatchupOther]     = useState('')
  const [delaySuggestionsSel,   setDelaySuggestionsSel]   = useState<string[]>([])
  const [delaySuggestionsOther, setDelaySuggestionsOther] = useState('')

  // Media + AACT
  const [mediaItems,     setMediaItems]     = useState<MediaItem[]>([])
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [mentorKw,       setMentorKw]       = useState<string[]>([])
  const [studentKw,      setStudentKw]      = useState<string[]>([])

  // =========================================================================
  //  ADOPTED CLASS — state
  // =========================================================================

  const [acModules,         setAcModules]         = useState<ApiModule[]>([])
  const [acModulesLoading,  setAcModulesLoading]  = useState(false)
  const [acModule,          setAcModule]          = useState<ApiModule | null>(null)
  const [acAllSections,     setAcAllSections]     = useState<ApiSection[]>([])
  const [acSectionsLoading, setAcSectionsLoading] = useState(false)
  const [acSection,         setAcSection]         = useState<ApiSection | null>(null)
  const [adoptMedia,        setAdoptMedia]        = useState<MediaItem[]>([])

  const acLockedClassName: string      = acAllSections[0]?.class_name ?? ''
  const acSectionOptions:  ApiSection[] = acAllSections.filter(sec => sec.class_name === acLockedClassName)

  // =========================================================================
  //  ENABLING SESSION — state
  // =========================================================================
  const [enabProgram,  setEnabProgram]  = useState('')
  const [enabTeachers, setEnabTeachers] = useState('')
  const [enabDuration, setEnabDuration] = useState('')
  const [enabRemarks,  setEnabRemarks]  = useState('')
  const [enabMedia,    setEnabMedia]    = useState<MediaItem[]>([])

  // =========================================================================
  //  NO CLASS OBSERVED — state
  // =========================================================================
  const [noClassReason,      setNoClassReason]      = useState('')
  const [noClassOtherReason, setNoClassOtherReason] = useState('')

  // =========================================================================
  //  IMPACT SURVEY — state
  // =========================================================================
  const [impactProgram, setImpactProgram] = useState('')

  // =========================================================================
  //  Data loading
  // =========================================================================

  // Load CO levels when program changes
  const loadCoLevels = useCallback(async (progName: string) => {
    const programUUID = uuidFor(progName)
    if (!programUUID) return
    setCoLevelsLoading(true)
    setCoLevels([]); setCoLevel(null); setCoModule(null)
    setCoSection(null)
    setAnswersMap({}); setSubAnswers({}); setQuestionSet(null)
    const res = await getProgramLevels(programUUID)
    if (res.success && res.data?.levels?.length) {
      const sorted: ApiLevel[] = [...res.data.levels].sort((a: ApiLevel, b: ApiLevel) => a.order_index - b.order_index)
      setCoLevels(sorted)
      setCoLevel(sorted[0])
    }
    setCoLevelsLoading(false)
  }, [programIdMap])

  // Load CO sections (adopted only) — once per school, shared for both CO and AC
  const loadSections = useCallback(async (
    setter: (v: ApiSection[]) => void,
    loadingSetter: (v: boolean) => void,
  ) => {
    if (!currentSchool?.id) return
    loadingSetter(true)
    const res = await getSchoolSections(currentSchool.id, { adopted: true })
    if (res.success && Array.isArray(res.data)) setter(res.data)
    loadingSetter(false)
  }, [currentSchool?.id])

  // Load questions + schedule when CO module changes
  const loadQuestionsAndSchedule = useCallback(async (progName: string, mod: ApiModule) => {
    const programUUID = uuidFor(progName)
    if (!programUUID) return
    // Questions
    setQuestionsLoading(true); setQuestionsError(null); setQuestionSet(null); setAnswersMap({}); setSubAnswers({})
    const qRes = await getQuestionSets(programUUID, mod.module_number)
    if (qRes.success && qRes.data) {
      const normalized: BackendQuestion[] = (qRes.data.questions ?? [])
        .map((q: any): BackendQuestion => {
          const options: BackendOption[] = [
            { score: 1, label: q.score_1_label ?? 'Score 1', is_na: false },
            { score: 2, label: q.score_2_label ?? 'Score 2', is_na: false },
            { score: 3, label: q.score_3_label ?? 'Score 3', is_na: false },
          ]
          if (q.is_na_allowed) options.push({ score: 0, label: 'NA', is_na: true })
          return { id: q.id, label: q.label ?? '', order_index: q.order_index ?? 0, is_na_allowed: q.is_na_allowed ?? false, options }
        })
        .sort((a: BackendQuestion, b: BackendQuestion) => a.order_index - b.order_index)
      setQuestionSet({ id: qRes.data.id, module_type: qRes.data.module_type ?? '', score_strong_min: qRes.data.score_strong_min ?? 0, score_developing_min: qRes.data.score_developing_min ?? 0, questions: normalized })
    } else {
      setQuestionsError(qRes.message || 'Failed to load questions')
    }
    setQuestionsLoading(false)
    // Schedule
    setScheduleLoading(true)
    const sRes = await getScheduleStatus(programUUID, mod.module_number)
    if (sRes.success && sRes.data) {
      setScheduleStatus(sRes.data.status as ScheduleStatus)
      setShowBehindFields(sRes.data.show_behind_fields ?? false)
      setDelayChallengesSel([]); setDelayCatchupSel([]); setDelaySuggestionsSel([])
    }
    setScheduleLoading(false)
  }, [programIdMap])

  // Load AC data — FCP modules (flatten all levels) + sections
  const loadAcData = useCallback(async () => {
    if (Object.keys(programIdMap).length === 0 || !currentSchool?.id) return
    const fcpUUID = uuidFor('FCP')
    if (!fcpUUID) return
    setAcModulesLoading(true)
    const lvlRes = await getProgramLevels(fcpUUID)
    if (lvlRes.success && lvlRes.data?.levels?.length) {
      const allMods: ApiModule[] = []
      lvlRes.data.levels.forEach((lv: ApiLevel) => allMods.push(...(lv.modules ?? [])))
      allMods.sort((a, b) => a.module_number - b.module_number)
      setAcModules(allMods)
      if (allMods.length > 0 && !acModule) setAcModule(allMods[0])
    }
    setAcModulesLoading(false)
    loadSections(setAcAllSections, setAcSectionsLoading)
  }, [programIdMap, currentSchool?.id])

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (purpose !== 'Class Observation' || !coProgram || Object.keys(programIdMap).length === 0) return
    loadCoLevels(coProgram)
    loadSections(setCoAllSections, setCoSectionsLoading)
  }, [coProgram, programIdMap, purpose])

  useEffect(() => {
    if (purpose !== 'Class Observation' || !coModule || !coProgram || coProgram === 'AACT') return
    loadQuestionsAndSchedule(coProgram, coModule)
  }, [coModule, coProgram, purpose])

  useEffect(() => {
    if (purpose !== 'Adopted Class' || Object.keys(programIdMap).length === 0) return
    loadAcData()
  }, [purpose, programIdMap])

  // Auto-select first section when sections load (class is locked, so sections are pre-filtered)
  useEffect(() => {
    const opts = coAllSections.filter(sec => sec.class_name === (coAllSections[0]?.class_name ?? ''))
    setCoSection(opts[0] ?? null)
  }, [coAllSections])

  useEffect(() => {
    const opts = acAllSections.filter(sec => sec.class_name === (acAllSections[0]?.class_name ?? ''))
    setAcSection(opts[0] ?? null)
  }, [acAllSections])

  // ── Derived ───────────────────────────────────────────────────────────────
  const questions     = questionSet?.questions ?? []
  const maxScore      = questions.length * 3
  const totalScore    = questions.reduce((sum, q) => {
    const idx = answers[q.id]; if (idx === undefined) return sum
    return sum + (q.options[idx]?.score ?? 0)
  }, 0)
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length
  const allQsAnswered = questions.length > 0 && answeredCount === questions.length

  function setAnswer(qId: string, optIdx: number) {
    setAnswersMap(prev => ({ ...prev, [qId]: optIdx }))
    setSubAnswers(prev => { const next = { ...prev }; Object.keys(next).forEach(k => { if (k.startsWith(`${qId}_`)) delete next[k] }); return next })
  }
  function setSubAnswer(key: string, val: boolean) { setSubAnswers(prev => ({ ...prev, [key]: val })) }
  function toggleKw(list: string[], setList: (v: string[]) => void, kw: string) { setList(list.includes(kw) ? list.filter(k => k !== kw) : [...list, kw]) }
  function toggleDelayOpt(list: string[], setList: (v: string[]) => void, opt: string) { setList(list.includes(opt) ? list.filter(x => x !== opt) : [...list, opt]) }

  // ── canSave ───────────────────────────────────────────────────────────────
  const delayOk = delayChallengesSel.length > 0 && delayCatchupSel.length > 0 && delaySuggestionsSel.length > 0

  const isCoValid =
    !!coProgram && !!coLevel && !!coModule && !!coSection &&
    !questionsLoading && !questionsError &&
    (coProgram === 'AACT' ? mentorKw.length > 0 && studentKw.length > 0 : allQsAnswered) &&
    (!showBehindFields || delayOk)

  const isAcValid = !!acModule && !!acSection && !acModulesLoading && !acSectionsLoading

  const canSave =
    programsLoading ? false :
    purpose === 'Class Observation' ? isCoValid :
    purpose === 'Adopted Class'     ? isAcValid :
    purpose === 'Enabling Session'  ? !!enabProgram && !!enabTeachers.trim() && !!enabDuration.trim() :
    purpose === 'No Class Observed' ? !!noClassReason && (noClassReason !== 'Other' || !!noClassOtherReason.trim()) :
    purpose === 'Impact Survey'     ? !!impactProgram : false

  // ── handleSave ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave || saving) return
    if (!visitId) { Alert.alert('Error', 'Visit ID missing. Please restart from check-in.'); return }
    setSaving(true)
    try {
      let res: any
      const buildField = (sel: string[], other: string) =>
        sel.includes('Any other') && other.trim()
          ? [...sel.filter(s => s !== 'Any other'), other.trim()].join('; ')
          : sel.join('; ')

      if (purpose === 'Class Observation') {
        const programUUID = uuidFor(coProgram)
        if (!programUUID || !coModule?.id || !coSection?.id) { Alert.alert('Error', 'Please complete all fields.'); setSaving(false); return }
        const mediaUrls = await uploadAllMedia(visitId, mediaItems, 'class_observation')
        const responses = questions
          .filter(q => answers[q.id] !== undefined)
          .map(q => { const opt = q.options[answers[q.id]]; return { question_id: q.id, score: opt?.score ?? 0, is_na: (opt as any)?.is_na ?? false } })
      const payload: any = {
          program_id:        programUUID,
          level_id:          coLevel?.id ?? null,
          module_id:         coModule.id,
          section:           coSection.section_name,
          facilitator_name:  coSection.teacher?.name ?? null,
          media_urls:        mediaUrls,
          responses,
        }
        if (showBehindFields) {
          payload.challenges   = buildField(delayChallengesSel,  delayChallengesOther)
          payload.catchup_plan = buildField(delayCatchupSel,     delayCatchupOther)
          payload.suggestions  = buildField(delaySuggestionsSel, delaySuggestionsOther)
        }
        console.log('[handleSave] createClassObservation:', JSON.stringify(payload, null, 2))
        res = await createClassObservation(visitId, payload)
      }

      else if (purpose === 'Adopted Class') {
        if (!acModule?.id || !acSection?.id) { Alert.alert('Error', 'Please complete all fields.'); setSaving(false); return }
        const payload = {
          module_id:        acModule.id,
          section:          acSection.section_name,
          facilitator_name: acSection.teacher?.name ?? null,
          media_urls:       mediaUrls,
        }
        console.log('[handleSave] createAdoptedClass:', JSON.stringify(payload, null, 2))
        res = await createAdoptedClass(visitId, payload)
      }

      else if (purpose === 'Enabling Session') {
        const programUUID = uuidFor(enabProgram)
        if (!programUUID) { Alert.alert('Error', 'Program not found for enabling session.'); setSaving(false); return }
        const mediaUrls = await uploadAllMedia(visitId, enabMedia, 'enabling_session')
        const payload = { program_id: programUUID, number_of_teachers: parseInt(enabTeachers), duration: parseInt(enabDuration), remarks: enabRemarks.trim(), media_urls: mediaUrls }
        console.log('[handleSave] createEnablingSession:', JSON.stringify(payload, null, 2))
        res = await createEnablingSession(visitId, payload)
      }

      else if (purpose === 'No Class Observed') {
        const reason = noClassReason === 'Other' ? noClassOtherReason.trim() : noClassReason
        console.log('[handleSave] createNoClassObserved reason:', reason)
        res = await createNoClassObserved(visitId, reason)
      }

      else if (purpose === 'Impact Survey') {
        const programUUID = uuidFor(impactProgram)
        if (!programUUID) { Alert.alert('Error', 'Program not found for impact survey.'); setSaving(false); return }
        const payload = { program_id: programUUID }
        console.log('[handleSave] createImpactSurvey:', JSON.stringify(payload, null, 2))
        res = await createImpactSurvey(visitId, payload)
      }

      console.log('[handleSave] response:', JSON.stringify(res, null, 2))
      if (!res?.success) { Alert.alert('Save Failed', res?.message || 'Something went wrong.'); return }
      navigation.navigate('ObservationSummary' as never, { purpose, visitId, savedData: res.data } as never)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading / error states ───────────────────────────────────────────────

  if (programsLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <AppHeader title="Loading..." />
        <View style={s.centerLoader}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={s.centerLoaderText}>Loading school programs...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (programsError) {
    return (
      <SafeAreaView style={s.safe}>
        <AppHeader title="Error" />
        <View style={s.centerLoader}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={[s.centerLoaderText, { color:'#DC2626', marginTop:12 }]}>{programsError}</Text>
          <TouchableOpacity style={s.retryFullBtn} onPress={loadSchoolPrograms}>
            <Text style={s.retryFullBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ─── Render sections ───────────────────────────────────────────────────────

  const purposeLabel: Record<PurposeType, string> = {
    'Class Observation':'Class Observation','Adopted Class':'Adopted Class',
    'Enabling Session':'Enabling Session','No Class Observed':'No Class Observed','Impact Survey':'Impact Survey',
  }

  // ── CLASS OBSERVATION ─────────────────────────────────────────────────────
  const renderClassObservation = () => (
    <>
      <Text style={s.sectionHeader}>CLASS DETAILS</Text>
      <View style={s.card}>

        {/* Program + Level */}
        <View style={s.doubleRow}>
          <View style={s.halfCol}>
            <RequiredLabel text="Program" />
            <Dropdown
              value={coProgram}
              options={availableProgramNames}
              onChange={v => {
                setCoProgram(v)
                setCoLevels([]); setCoLevel(null); setCoModule(null)
                setCoSection(null)
                setAnswersMap({}); setSubAnswers({}); setQuestionSet(null)
              }}
            />
          </View>
          <View style={s.halfCol}>
            <RequiredLabel text="Level (Year)" />
            <Dropdown
              loading={coLevelsLoading}
              value={coLevel?.name ?? ''}
              options={coLevels.map(l => l.name)}
              onChange={v => {
                const found = coLevels.find(l => l.name === v) ?? null
                setCoLevel(found); setCoModule(null)
                setAnswersMap({}); setSubAnswers({}); setQuestionSet(null)
              }}
              placeholder={coProgram ? (coLevels.length === 0 && !coLevelsLoading ? 'No levels found' : 'Select level') : 'Select program first'}
            />
          </View>
        </View>

  {/* Class + Section */}
        <View style={[s.doubleRow, { marginTop:12 }]}>
          <View style={s.halfCol}>
            <Text style={s.fieldLabel}>Class</Text>
            {coSectionsLoading
              ? <View style={[s.lockedField, { justifyContent:'center' }]}><ActivityIndicator size="small" color="#F97316" /></View>
              : <LockedField value={coLockedClassName || '—'} />
            }
          </View>
          <View style={s.halfCol}>
            <RequiredLabel text="Section" />
            <Dropdown
              value={coSection?.section_name ?? ''}
              options={coSectionOptions.map(sec => sec.section_name)}
              onChange={v => setCoSection(coSectionOptions.find(sec => sec.section_name === v) ?? null)}
              placeholder={coSectionOptions.length === 0 ? 'No sections available' : 'Select section'}
            />
          </View>
        </View>
         {/* Facilitator — auto-filled from section.teacher */}
        <View style={{ marginTop:12 }}>
          <RequiredLabel text="Assigned Facilitator" />
          <FacilitatorField section={coSection} />
        </View>

      
            
       {/* Module + Schedule badge */}
<View style={[s.doubleRow, { marginTop:12 }]}>
  <View style={s.halfCol}>
    <RequiredLabel text="Module" />
    <Dropdown
      value={coModule?.name ?? ''}
      options={coModuleOptions.map(m => m.name)}
      onChange={v => {
        const found = coModuleOptions.find(m => m.name === v) ?? null
        setCoModule(found)
        setAnswersMap({}); setSubAnswers({}); setQuestionSet(null)
      }}
      placeholder={coLevel ? (coModuleOptions.length === 0 ? 'No modules found' : 'Select module') : 'Select level first'}
    />
  </View>
 <View style={s.halfCol}>
    <Text style={s.fieldLabel}>Schedule</Text>
    {scheduleLoading
      ? <View style={[s.scheduleBadge, { backgroundColor:'#F3F4F6', borderColor:'#E5E7EB', justifyContent:'center' }]}><ActivityIndicator size="small" color="#F97316" /></View>
      : <View style={[s.scheduleBadge, { backgroundColor: coModule ? SCHEDULE_STYLE[scheduleStatus]?.bg : '#F3F4F6', borderColor: coModule ? SCHEDULE_STYLE[scheduleStatus]?.border : '#E5E7EB' }]}>
          <Ionicons name={coModule ? SCHEDULE_STYLE[scheduleStatus]?.icon : 'remove-circle-outline'} size={12} color={coModule ? SCHEDULE_STYLE[scheduleStatus]?.color : '#9CA3AF'} />
          <Text style={[s.scheduleBadgeText, { color: coModule ? SCHEDULE_STYLE[scheduleStatus]?.color : '#9CA3AF' }]}>{coModule ? SCHEDULE_STYLE[scheduleStatus]?.label : 'N/A'}</Text>
        </View>
    }
  </View>
</View>
       
      </View>

      {/* Observation Questions */}
      {coProgram !== 'AACT' && coModule && (
        <>
          <Text style={s.sectionHeader}>OBSERVATION QUESTIONS</Text>
          <View style={s.card}>
            {questionsLoading && (
              <View style={s.qLoadingRow}><ActivityIndicator size="small" color="#F97316" /><Text style={s.qLoadingText}>Loading questions...</Text></View>
            )}
            {!questionsLoading && questionsError && (
              <View style={s.qErrorRow}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={s.qErrorText}>{questionsError}</Text>
                <TouchableOpacity onPress={() => coModule && loadQuestionsAndSchedule(coProgram, coModule)} style={s.qRetryBtn}><Text style={s.qRetryText}>Retry</Text></TouchableOpacity>
              </View>
            )}
            {!questionsLoading && !questionsError && questions.length === 0 && (
              <Text style={s.qEmptyText}>No questions available for this module.</Text>
            )}
            {!questionsLoading && !questionsError && questions.map((q, idx) => (
              <RadioGroup key={q.id} num={idx + 1} question={q} answers={answers} setAnswer={setAnswer} subAnswers={subAnswers} setSubAnswer={setSubAnswer} />
            ))}
            {maxScore > 0 && !questionsLoading && (
              <View style={s.scoreBtnRow}>
                <View style={s.scoreProgressInfo}>
                  <Text style={s.scoreProgressText}>{answeredCount}/{questions.length} questions answered</Text>
                  <View style={s.scoreProgressTrack}>
                    <View style={[s.scoreProgressFill, { width:`${questions.length ? (answeredCount / questions.length) * 100 : 0}%` as any }]} />
                  </View>
                </View>
                <TouchableOpacity style={[s.scoreBtn, !allQsAnswered && s.scoreBtnDisabled]} onPress={() => allQsAnswered && setShowScoreModal(true)} activeOpacity={allQsAnswered ? 0.85 : 1} disabled={!allQsAnswered}>
                  <Ionicons name={allQsAnswered ? 'trophy-outline' : 'lock-closed-outline'} size={15} color={allQsAnswered ? '#fff' : '#9CA3AF'} />
                  <Text style={[s.scoreBtnText, !allQsAnswered && s.scoreBtnTextDisabled]}>{allQsAnswered ? 'View Score' : `${questions.length - answeredCount} remaining`}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {/* Delay Assessment */}
      {showBehindFields && (
        <>
          <Text style={[s.sectionHeader, { color:'#DC2626' }]}>DELAY ASSESSMENT</Text>
          <View style={s.card}>
            <DelayOptionField label="Challenges mentioned by facilitator" icon="chatbubble-ellipses-outline" options={DELAY_CHALLENGES_OPTIONS} selected={delayChallengesSel} onToggle={opt => toggleDelayOpt(delayChallengesSel, setDelayChallengesSel, opt)} otherText={delayChallengesOther} onOtherText={setDelayChallengesOther} />
            <DelayOptionField label="How does the teacher plan to catch up?" icon="calendar-outline" options={DELAY_CATCHUP_OPTIONS} selected={delayCatchupSel} onToggle={opt => toggleDelayOpt(delayCatchupSel, setDelayCatchupSel, opt)} otherText={delayCatchupOther} onOtherText={setDelayCatchupOther} />
            <DelayOptionField label="Suggestions given by RP to get back on track" icon="bulb-outline" options={DELAY_SUGGESTIONS_OPTIONS} selected={delaySuggestionsSel} onToggle={opt => toggleDelayOpt(delaySuggestionsSel, setDelaySuggestionsSel, opt)} otherText={delaySuggestionsOther} onOtherText={setDelaySuggestionsOther} />
          </View>
        </>
      )}

      {/* AACT Keywords */}
      {coProgram === 'AACT' && (
        <>
          <Text style={s.sectionHeader}>MENTOR FEEDBACK</Text>
          <View style={s.card}><View style={s.kwWrap}>{AACT_MENTOR_KW.map(kw => { const active = mentorKw.includes(kw); return (<TouchableOpacity key={kw} onPress={() => toggleKw(mentorKw, setMentorKw, kw)} style={[s.kwChip, active && s.kwChipActive]} activeOpacity={0.8}><Text style={[s.kwText, active && s.kwTextActive]}>{kw}</Text></TouchableOpacity>) })}</View></View>
          <Text style={s.sectionHeader}>STUDENT FEEDBACK</Text>
          <View style={s.card}><View style={s.kwWrap}>{AACT_STUDENT_KW.map(kw => { const active = studentKw.includes(kw); return (<TouchableOpacity key={kw} onPress={() => toggleKw(studentKw, setStudentKw, kw)} style={[s.kwChip, active && s.kwChipActive]} activeOpacity={0.8}><Text style={[s.kwText, active && s.kwTextActive]}>{kw}</Text></TouchableOpacity>) })}</View></View>
        </>
      )}

      {/* Media */}
      <View style={s.mediaHeaderRow}>
        <Text style={s.sectionHeader}>MEDIA EVIDENCE</Text>
        <View style={s.mandatoryBadge}><View style={s.mandatoryDot} /><Text style={s.mandatoryBadgeText}>MANDATORY VIDEO</Text></View>
      </View>
      <MediaSection mediaItems={mediaItems} setMediaItems={setMediaItems} />
      <ScoreModal visible={showScoreModal} onClose={() => setShowScoreModal(false)} totalScore={totalScore} maxScore={maxScore} questionSet={questionSet} />
    </>
  )

  // ── ADOPTED CLASS ─────────────────────────────────────────────────────────
  const renderAdoptedClass = () => (
    <>
      <Text style={s.sectionHeader}>ADOPTED CLASS DETAILS</Text>
      <View style={s.card}>

        {/* Program (locked FCP) + Module */}
        <View style={s.doubleRow}>
          <View style={s.halfCol}>
            <Text style={s.fieldLabel}>Program</Text>
            <LockedField value="FCP" />
          </View>
           <View style={s.halfCol}>
            <Text style={s.fieldLabel}>Section</Text>
            {acSectionsLoading
              ? <View style={[s.lockedField, { justifyContent:'center' }]}><ActivityIndicator size="small" color="#F97316" /></View>
              : <LockedField value={acSection?.section_name || '—'} />
            }
          </View>
        
        </View>

        {/* Class + Section */}
        <View style={[s.doubleRow, { marginTop:12 }]}>
          <View style={s.halfCol}>
            <Text style={s.fieldLabel}>Class</Text>
            {acSectionsLoading
              ? <View style={[s.lockedField, { justifyContent:'center' }]}><ActivityIndicator size="small" color="#F97316" /></View>
              : <LockedField value={acLockedClassName || '—'} />
            }
          </View>
          <View style={s.halfCol}>
            <RequiredLabel text="Module" />
            <Dropdown
              loading={acModulesLoading}
              value={acModule?.name ?? ''}
              options={acModules.map(m => m.name)}
              onChange={v => setAcModule(acModules.find(m => m.name === v) ?? null)}
              placeholder="Select module"
            />
          </View>
        </View>

        {/* Facilitator — auto-filled */}
        <View style={{ marginTop:12 }}>
          <Text style={s.fieldLabel}>Assigned Facilitator</Text>
          <FacilitatorField section={acSection} />
        </View>

        <View style={s.adoptedLockNotice}>
          <Ionicons name="information-circle-outline" size={14} color="#8B5CF6" />
          <Text style={s.adoptedLockNoticeText}>Program is fixed to FCP. Select the module, class and section for this adopted class.</Text>
        </View>
      </View>

      {/* Media */}
      <View style={s.mediaHeaderRow}>
        <Text style={s.sectionHeader}>MEDIA EVIDENCE</Text>
        <View style={[s.mandatoryBadge, { backgroundColor:'#F0FDF4' }]}><View style={[s.mandatoryDot, { backgroundColor:'#16A34A' }]} /><Text style={[s.mandatoryBadgeText, { color:'#16A34A' }]}>OPTIONAL</Text></View>
      </View>
      <MediaSection mediaItems={adoptMedia} setMediaItems={setAdoptMedia} optional />
    </>
  )

  // ── ENABLING SESSION ──────────────────────────────────────────────────────
  const renderEnablingSession = () => (
    <>
      <Text style={s.sectionHeader}>ENABLING SESSION DETAILS</Text>
      <View style={s.card}>
        <RequiredLabel text="Program" />
        <Dropdown value={enabProgram} options={availableProgramNames} onChange={setEnabProgram} placeholder="Select program" />
        <View style={[s.doubleRow, { marginTop:14 }]}>
          <View style={s.halfCol}><RequiredLabel text="Number of Teachers" /><TextInput value={enabTeachers} onChangeText={setEnabTeachers} placeholder="e.g. 12" placeholderTextColor="#9CA3AF" keyboardType="numeric" style={s.inputField} /></View>
          <View style={s.halfCol}><RequiredLabel text="Duration (mins)" /><TextInput value={enabDuration} onChangeText={setEnabDuration} placeholder="e.g. 60" placeholderTextColor="#9CA3AF" keyboardType="numeric" style={s.inputField} /></View>
        </View>
        <Text style={[s.fieldLabel, { marginTop:14 }]}>Remarks</Text>
        <TextInput value={enabRemarks} onChangeText={setEnabRemarks} placeholder="Session notes, key takeaways..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} style={s.textArea} />
      </View>
      <View style={s.mediaHeaderRow}>
        <Text style={s.sectionHeader}>MEDIA EVIDENCE</Text>
        <View style={[s.mandatoryBadge, { backgroundColor:'#F0FDF4' }]}><View style={[s.mandatoryDot, { backgroundColor:'#16A34A' }]} /><Text style={[s.mandatoryBadgeText, { color:'#16A34A' }]}>OPTIONAL</Text></View>
      </View>
      <MediaSection mediaItems={enabMedia} setMediaItems={setEnabMedia} optional />
    </>
  )

  // ── NO CLASS OBSERVED ─────────────────────────────────────────────────────
  const renderNoClassObserved = () => (
    <>
      <Text style={s.sectionHeader}>REASON FOR NO CLASS</Text>
      <View style={s.card}>
        <RequiredLabel text="Reason" />
        <Dropdown value={noClassReason} options={NO_CLASS_REASONS} onChange={setNoClassReason} placeholder="Select reason" />
        {noClassReason === 'Other' && (
          <View style={{ marginTop:12 }}>
            <Text style={s.fieldLabel}>Specify Reason</Text>
            <TextInput value={noClassOtherReason} onChangeText={setNoClassOtherReason} placeholder="Describe the reason..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} style={s.textArea} />
          </View>
        )}
      </View>
    </>
  )

  // ── IMPACT SURVEY ─────────────────────────────────────────────────────────
  const renderImpactSurvey = () => (
    <>
      <Text style={s.sectionHeader}>IMPACT SURVEY</Text>
      <View style={s.card}>
        <RequiredLabel text="Program" />
        <Dropdown value={impactProgram} options={programNamesNoAACT} onChange={setImpactProgram} placeholder="Select program" />
        {!impactProgram && <Text style={s.impactHint}>Select the program for which the impact survey is being conducted.</Text>}
      </View>
    </>
  )

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title={purposeLabel[purpose]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:100 }} keyboardShouldPersistTaps="handled">
        <StepBar current={3} />
        <SchoolBanner />
        {purpose === 'Class Observation' && renderClassObservation()}
        {purpose === 'Adopted Class'     && renderAdoptedClass()}
        {purpose === 'Enabling Session'  && renderEnablingSession()}
        {purpose === 'No Class Observed' && renderNoClassObserved()}
        {purpose === 'Impact Survey'     && renderImpactSurvey()}
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.saveBtn, (!canSave || saving) && s.saveBtnDisabled]} onPress={handleSave} activeOpacity={canSave ? 0.85 : 1} disabled={!canSave || saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
                {purpose === 'Class Observation' ? 'Save Observation' :
                 purpose === 'Adopted Class'     ? 'Save Adopted Class' :
                 purpose === 'Enabling Session'  ? 'Save Session'      :
                 purpose === 'No Class Observed' ? 'Save Record'       :
                 purpose === 'Impact Survey'     ? 'Save Survey'       : 'Save'}
              </Text>
              <Ionicons name={canSave ? 'checkmark-circle' : 'lock-closed'} size={18} color={canSave ? '#fff' : '#9CA3AF'} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#F3F4F6' },
  centerLoader: { flex:1, alignItems:'center', justifyContent:'center', padding:40 },
  centerLoaderText: { marginTop:12, fontSize:14, color:'#6B7280', textAlign:'center' },
  retryFullBtn: { marginTop:20, backgroundColor:'#F97316', paddingHorizontal:24, paddingVertical:12, borderRadius:12 },
  retryFullBtnText: { color:'#fff', fontWeight:'700', fontSize:14 },
  sectionHeader: { fontSize:11, fontWeight:'700', color:'#9CA3AF', letterSpacing:1, marginHorizontal:16, marginTop:16, marginBottom:8 },
  card: { backgroundColor:'#fff', marginHorizontal:16, borderRadius:14, padding:16, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4, shadowOffset:{width:0,height:1}, elevation:2, marginBottom:4 },
  reqLabelRow: { flexDirection:'row', alignItems:'center', marginBottom:5, gap:2 },
  reqStar: { color:'#EF4444', fontWeight:'700', fontSize:14 },
  fieldLabel: { fontSize:11, fontWeight:'600', color:'#9CA3AF', marginBottom:5 },
  lockedField: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#F5F3FF', borderWidth:1, borderColor:'#DDD6FE', borderRadius:10, paddingHorizontal:12, paddingVertical:11 },
  lockedFieldText: { fontSize:13, color:'#7C3AED', fontWeight:'600' },
  lockedBadge: { backgroundColor:'#EDE9FE', paddingHorizontal:7, paddingVertical:2, borderRadius:6 },
  lockedBadgeText: { fontSize:9, fontWeight:'700', color:'#7C3AED', letterSpacing:0.3 },
  adoptedLockNotice: { flexDirection:'row', alignItems:'center', gap:6, marginTop:14, backgroundColor:'#F5F3FF', borderRadius:8, padding:10 },
  adoptedLockNoticeText: { flex:1, fontSize:11, color:'#7C3AED', lineHeight:16 },
  doubleRow: { flexDirection:'row', gap:10 },
  halfCol: { flex:1 },
  dropdown: { backgroundColor:'#F9FAFB', borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:12, paddingVertical:11, flexDirection:'row', justifyContent:'space-between', alignItems:'center', minHeight:44 },
  dropdownText: { fontSize:13, color:'#111827', flex:1 },
  ddMenu: { position:'absolute', backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, maxHeight:280, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:10, shadowOffset:{width:0,height:4}, elevation:30, overflow:'hidden', zIndex:9999 },
  ddItem: { paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#F3F4F6', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  ddItemActive: { backgroundColor:'#FFF7ED' },
  ddItemText: { fontSize:13, color:'#374151' },
  ddItemTextActive: { color:'#F97316', fontWeight:'600' },
  moduleRow: { flexDirection:'row', alignItems:'center', gap:10 },
 scheduleBadge: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingHorizontal:12, paddingVertical:11, borderRadius:10, borderWidth:1, minHeight:44, marginTop:4 },
  scheduleBadgeText: { fontSize:10, fontWeight:'700', letterSpacing:0.3 },
  qLoadingRow: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:20, justifyContent:'center' },
  qLoadingText: { fontSize:13, color:'#6B7280' },
  qErrorRow: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#FEF2F2', borderRadius:10, padding:12, marginBottom:8 },
  qErrorText: { flex:1, fontSize:12, color:'#DC2626' },
  qRetryBtn: { backgroundColor:'#DC2626', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  qRetryText: { fontSize:11, fontWeight:'700', color:'#fff' },
  qEmptyText: { fontSize:13, color:'#9CA3AF', textAlign:'center', paddingVertical:20, fontStyle:'italic' },
  questionBlock: { marginBottom:16, paddingBottom:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6' },
  questionHeaderRow: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:10 },
  questionText: { flex:1, fontSize:13, color:'#1F2937', fontWeight:'500', lineHeight:19 },
  questionNum: { color:'#F97316', fontWeight:'700' },
  questionScoreBadge: { borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1.5, alignSelf:'flex-start', minWidth:50, alignItems:'center' },
  questionScoreBadgeAnswered: { backgroundColor:'#FFF7ED', borderColor:'#F97316' },
  questionScoreBadgeEmpty: { backgroundColor:'#F3F4F6', borderColor:'#E5E7EB' },
  questionScoreBadgeText: { fontSize:11, fontWeight:'700' },
  questionScoreBadgeTextAnswered: { color:'#F97316' },
  questionScoreBadgeTextEmpty: { color:'#9CA3AF' },
  optionsColumn: { gap:6 },
  optionCard: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:14, paddingVertical:13, backgroundColor:'#fff' },
  optionCardSelected: { borderColor:'#F97316', borderWidth:1.5, backgroundColor:'#FFF7ED' },
  optionCardRow: { flexDirection:'row', alignItems:'center', gap:10 },
  optionLabel: { flex:1, fontSize:13, color:'#374151', fontWeight:'500' },
  optionLabelSelected: { color:'#1F2937', fontWeight:'700' },
  optionScorePill: { borderWidth:1, borderRadius:20, paddingHorizontal:9, paddingVertical:3, minWidth:46, alignItems:'center' },
  optionScorePillText: { fontSize:11, fontWeight:'700' },
  radioOuter: { width:18, height:18, borderRadius:9, borderWidth:2, borderColor:'#D1D5DB', alignItems:'center', justifyContent:'center' },
  radioOuterSelected: { borderColor:'#F97316' },
  radioInner: { width:8, height:8, borderRadius:4, backgroundColor:'#F97316' },
  checkCircle: { width:22, height:22, borderRadius:11, backgroundColor:'#F97316', alignItems:'center', justifyContent:'center' },
  subPointsContainer: { gap:4, marginTop:4, paddingLeft:4 },
  subPointCard: { flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'#E5E7EB', borderRadius:8, paddingHorizontal:12, paddingVertical:10, backgroundColor:'#fff' },
  subPointCardChecked: { borderColor:'#FED7AA', backgroundColor:'#FFF7ED' },
  checkbox: { width:18, height:18, borderRadius:4, borderWidth:1.5, borderColor:'#D1D5DB', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  checkboxChecked: { backgroundColor:'#F97316', borderColor:'#F97316' },
  subPointText: { flex:1, fontSize:12, color:'#6B7280', lineHeight:17 },
  subPointTextChecked: { color:'#92400E', fontWeight:'500' },
  scoreBtnRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:'#F3F4F6', gap:12 },
  scoreProgressInfo: { flex:1 },
  scoreProgressText: { fontSize:11, color:'#9CA3AF', fontWeight:'600', marginBottom:5 },
  scoreProgressTrack: { height:4, borderRadius:2, backgroundColor:'#F3F4F6', overflow:'hidden' },
  scoreProgressFill: { height:'100%', borderRadius:2, backgroundColor:'#F97316' },
  scoreBtn: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#F97316', paddingHorizontal:16, paddingVertical:11, borderRadius:20, shadowColor:'#F97316', shadowOpacity:0.3, shadowRadius:8, shadowOffset:{width:0,height:3}, elevation:4 },
  scoreBtnDisabled: { backgroundColor:'#F3F4F6', shadowOpacity:0, elevation:0 },
  scoreBtnText: { color:'#fff', fontWeight:'700', fontSize:13 },
  scoreBtnTextDisabled: { color:'#9CA3AF' },
  delayFieldBlock: { marginBottom:18 },
  delayFieldHeader: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap' },
  delayFieldLabel: { flex:1, fontSize:12, fontWeight:'700', color:'#374151' },
  delayAnsweredBadge: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:'#F0FDF4', paddingHorizontal:7, paddingVertical:3, borderRadius:10 },
  delayAnsweredBadgeText: { fontSize:10, fontWeight:'700', color:'#16A34A' },
  delayRequiredBadge: { backgroundColor:'#FEF2F2', paddingHorizontal:7, paddingVertical:3, borderRadius:10 },
  delayRequiredBadgeText: { fontSize:10, fontWeight:'700', color:'#DC2626' },
  delayChipsWrap: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  delayChip: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:8, borderRadius:20, borderWidth:1.5, borderColor:'#E5E7EB', backgroundColor:'#FAFAFA' },
  delayChipActive: { borderColor:'#DC2626', backgroundColor:'#FEF2F2' },
  delayChipOtherActive: { borderColor:'#7C3AED', backgroundColor:'#FAF5FF' },
  delayChipText: { fontSize:12, color:'#6B7280' },
  delayChipTextActive: { color:'#DC2626', fontWeight:'600' },
  delayCheckbox: { width:16, height:16, borderRadius:4, borderWidth:1.5, borderColor:'#D1D5DB', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  delayCheckboxActive: { backgroundColor:'#DC2626', borderColor:'#DC2626' },
  delayCheckboxOther: { backgroundColor:'#7C3AED', borderColor:'#7C3AED' },
  kwWrap: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  kwChip: { paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#E5E7EB', backgroundColor:'#FAFAFA' },
  kwChipActive: { borderColor:'#F97316', backgroundColor:'#FFF7ED' },
  kwText: { fontSize:12, color:'#6B7280' },
  kwTextActive: { color:'#F97316', fontWeight:'600' },
  mediaHeaderRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginHorizontal:16, marginTop:16, marginBottom:8 },
  mandatoryBadge: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#FEF2F2', paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  mandatoryDot: { width:6, height:6, borderRadius:3, backgroundColor:'#DC2626' },
  mandatoryBadgeText: { fontSize:9, fontWeight:'700', color:'#DC2626', letterSpacing:0.3 },
  mediaActionRow: { flexDirection:'row', gap:10, marginBottom:12 },
  mediaActionBtn: { flex:1, alignItems:'center', paddingVertical:14, borderRadius:12, borderWidth:1.5, borderStyle:'dashed', borderColor:'#E5E7EB', backgroundColor:'#FAFAFA', gap:6 },
  mediaActionIcon: { width:42, height:42, borderRadius:12, backgroundColor:'#FFF7ED', alignItems:'center', justifyContent:'center' },
  mediaActionLabel: { fontSize:9, fontWeight:'700', color:'#9CA3AF', letterSpacing:0.4 },
  previewGrid: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 },
  previewThumb: { width:72, height:72, borderRadius:10, overflow:'hidden', position:'relative' },
  previewThumbImg: { width:'100%', height:'100%' },
  videoBadge: { position:'absolute', bottom:4, left:4, backgroundColor:'rgba(0,0,0,0.6)', borderRadius:4, flexDirection:'row', alignItems:'center', gap:2, paddingHorizontal:5, paddingVertical:2 },
  videoBadgeText: { color:'#fff', fontSize:8, fontWeight:'700' },
  removeBtn: { position:'absolute', top:2, right:2 },
  addMoreThumb: { width:72, height:72, borderRadius:10, borderWidth:1.5, borderStyle:'dashed', borderColor:'#F97316', backgroundColor:'#FFF7ED', alignItems:'center', justifyContent:'center', gap:2 },
  addMoreText: { fontSize:9, fontWeight:'700', color:'#F97316' },
  previewModal: { flex:1, backgroundColor:'rgba(0,0,0,0.95)', alignItems:'center', justifyContent:'center' },
  previewModalClose: { position:'absolute', top:50, right:20, zIndex:10 },
  previewModalImg: { width:'100%', height:'70%' },
  locationBox: { backgroundColor:'#F9FAFB', borderRadius:10, padding:12 },
  locationRow: { flexDirection:'row', alignItems:'center', gap:5 },
  locationText: { fontSize:11, color:'#9CA3AF' },
  textArea: { borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:10, fontSize:13, color:'#374151', minHeight:70, textAlignVertical:'top' },
  inputField: { backgroundColor:'#F9FAFB', borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:12, paddingVertical:11, fontSize:13, color:'#111827' },
  impactHint: { fontSize:11, color:'#9CA3AF', marginTop:7, fontStyle:'italic' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.45)' },
  modalCenterWrap: { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center' },
  modalCard: { backgroundColor:'#FFFFFF', borderRadius:20, paddingTop:40, paddingBottom:36, paddingHorizontal:36, width:280, alignItems:'center', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:24, shadowOffset:{width:0,height:8}, elevation:24 },
  modalXBtn: { position:'absolute', top:14, right:14, padding:4 },
  modalIconCircle: { width:72, height:72, borderRadius:36, alignItems:'center', justifyContent:'center', marginBottom:20 },
  modalEyebrow: { fontSize:10, fontWeight:'600', letterSpacing:1.2, color:'#9CA3AF', marginBottom:6, textTransform:'uppercase' },
  modalTitle: { fontSize:20, fontWeight:'700', marginBottom:20, textAlign:'center' },
  modalPill: { flexDirection:'row', alignItems:'baseline', gap:3, paddingVertical:10, paddingHorizontal:28, borderRadius:100 },
  modalPillScore: { fontSize:28, fontWeight:'700' },
  modalPillSep: { fontSize:16, opacity:0.45, fontWeight:'400' },
  modalPillMax: { fontSize:16, fontWeight:'500', opacity:0.7 },
  bottomBar: { flexDirection:'row', backgroundColor:'#fff', paddingHorizontal:16, paddingVertical:12, paddingBottom:28, borderTopWidth:1, borderTopColor:'#F3F4F6', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:-2}, elevation:10 },
  saveBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#F97316', borderRadius:12, paddingVertical:14, shadowColor:'#F97316', shadowOpacity:0.35, shadowRadius:8, shadowOffset:{width:0,height:4}, elevation:4 },
  saveBtnDisabled: { backgroundColor:'#E5E7EB', shadowOpacity:0, elevation:0 },
  saveBtnText: { color:'#fff', fontWeight:'700', fontSize:14 },
  saveBtnTextDisabled: { color:'#9CA3AF' },
})