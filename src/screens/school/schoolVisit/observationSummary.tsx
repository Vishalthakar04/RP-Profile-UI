// screens/visit/ObservationSummary.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import StepBar from '../../../components/StepBar'

import {
  getClassObservations,
  getAdoptedClass,
  getEnablingSessions,
  getNoClassObserved,
  getImpactSurveys,
} from '../../../services/observation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ObservationResponse {
  id:              string
  visit_id:        string
  program_id:      string
  module_id:       string
  question_set_id: string
  section:         string | null
  schedule_status: string
  total_score:     number
  score_band:      string
  challenges:      string | null
  catchup_plan:    string | null
  suggestions:     string | null
  media_urls:      string[]
  createdAt:       string
  program: { id: string; name: string } | null
  level:   { id: string; name: string } | null
  module:  { id: string; name: string; module_number: number } | null
  responses: {
    id:          string
    question_id: string
    score:       number | null
    is_na:       boolean
    question: {
      id:            string
      label:         string
      score_1_label: string
      score_2_label: string
      score_3_label: string
      is_na_allowed: boolean
      order_index:   number
    }
  }[]
}

interface AdoptedClassRecord {
  id:         string
  visit_id:   string
  program_id: string
  class_name: string
  section:    string | null
  module_id:  string | null
  media_urls: string[]
  createdAt:  string
  program: { id: string; name: string } | null
  module:  { id: string; name: string; module_number: number } | null
}

interface EnablingSessionRecord {
  id:                 string
  visit_id:           string
  program_id:         string
  number_of_teachers: number
  duration:           number
  remarks:            string
  media_urls:         string[]
  createdAt:          string
  program: { id: string; name: string } | null
}

interface NoClassRecord {
  id:       string
  visit_id: string
  reason:   string
  createdAt:string
}

interface ImpactSurveyRecord {
  id:         string
  visit_id:   string
  program_id: string
  responses:  Record<string, any>
  createdAt:  string
  program: { id: string; name: string } | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SCORE_BAND_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  strong:        { label: 'Strong Facilitation', color: '#16A34A', bg: '#F0FDF4', icon: 'trophy-outline'       },
  developing:    { label: 'Developing',           color: '#CA8A04', bg: '#FEFCE8', icon: 'trending-up-outline'  },
  needs_support: { label: 'Needs Support',        color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle-outline' },
}

const SCHEDULE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  behind_schedule: { label: 'Behind Schedule', color: '#DC2626', bg: '#FEF2F2' },
  on_track:        { label: 'On Track',         color: '#16A34A', bg: '#F0FDF4' },
  ahead:           { label: 'Ahead',            color: '#2563EB', bg: '#EFF6FF' },
}

function getScoreLabel(r: {
  score: number | null; is_na: boolean
  question: { score_1_label: string; score_2_label: string; score_3_label: string }
}): string {
  if (r.is_na)       return 'N/A'
  if (r.score === 1) return r.question.score_1_label
  if (r.score === 2) return r.question.score_2_label
  if (r.score === 3) return r.question.score_3_label
  return '—'
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, color = '#9CA3AF', countColor = '#F97316', countBg = '#FFF7ED' }: {
  label: string; count?: number; color?: string; countColor?: string; countBg?: string
}) {
  return (
    <View style={s.sectionHeaderRow}>
      <Text style={[s.sectionLabel, { color }]}>{label}</Text>
      {count !== undefined && (
        <View style={[s.countBadge, { backgroundColor: countBg }]}>
          <Text style={[s.countBadgeText, { color: countColor }]}>{count}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Class Observation Card ───────────────────────────────────────────────────

function ObservationCard({
  obs, onDelete, navigation, visitId,
}: {
  obs: ObservationResponse; onDelete: () => void; navigation: any; visitId: string | number
}) {
  const [expanded, setExpanded] = useState(false)
  const band     = SCORE_BAND_CONFIG[obs.score_band] ?? SCORE_BAND_CONFIG.developing
  const schedule = SCHEDULE_CONFIG[obs.schedule_status] ?? SCHEDULE_CONFIG.on_track

  const maxScore    = obs.responses.filter(r => !r.is_na).length * 3
  const earnedScore = obs.responses.reduce((sum, r) => sum + (r.is_na ? 0 : (r.score ?? 0)), 0)

  const confirmDelete = () => {
    Alert.alert('Delete Observation', 'Are you sure you want to delete this observation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={s.card}>
      {/* Top row */}
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <Text style={s.cardProgram}>{obs.program?.name ?? '—'}</Text>
          {obs.module && (
            <View style={s.moduleBadge}>
              <Text style={s.moduleBadgeText}>{obs.module.name}</Text>
            </View>
          )}
        </View>
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
          <Text style={s.completedText}>SAVED</Text>
        </View>
      </View>

      <Text style={s.cardTitle}>
        Section {obs.section ?? '—'}{obs.level ? `  ·  ${obs.level.name}` : ''}
      </Text>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Ionicons name="layers-outline" size={14} color="#9CA3AF" />
          <Text style={s.metaText}>{obs.module?.name ?? 'Module —'}</Text>
        </View>
        <View style={[s.schedulePill, { backgroundColor: schedule.bg }]}>
          <Text style={[s.schedulePillText, { color: schedule.color }]}>{schedule.label}</Text>
        </View>
      </View>

      {/* Score row — tap to expand */}
      <TouchableOpacity style={s.scoreSummaryRow} onPress={() => setExpanded(!expanded)} activeOpacity={0.75}>
        <View style={s.scoreSummaryLeft}>
          <Ionicons name={band.icon as any} size={14} color={band.color} />
          <Text style={[s.scoreSummaryLabel, { color: band.color }]}>{band.label}</Text>
          <View style={[s.scorePill, { borderColor: band.color }]}>
            <Text style={[s.scorePillText, { color: band.color }]}>{earnedScore}/{maxScore}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Expanded breakdown */}
      {expanded && (
        <View style={s.expandedBox}>
          <Text style={s.expandedTitle}>QUESTION BREAKDOWN</Text>
          {obs.responses
            .slice()
            .sort((a, b) => a.question.order_index - b.question.order_index)
            .map((r, idx) => (
              <View key={r.id} style={[s.qRow, idx === obs.responses.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.qLabel}>{r.question.label}</Text>
                  <Text style={s.qAnswer}>{getScoreLabel(r)}</Text>
                </View>
                <View style={[s.qScoreBadge, {
                  backgroundColor: r.is_na ? '#F3F4F6' : r.score === 3 ? '#F0FDF4' : r.score === 2 ? '#FEFCE8' : '#FEF2F2',
                }]}>
                  <Text style={[s.qScoreText, {
                    color: r.is_na ? '#9CA3AF' : r.score === 3 ? '#16A34A' : r.score === 2 ? '#CA8A04' : '#DC2626',
                  }]}>
                    {r.is_na ? 'N/A' : `${r.score}/3`}
                  </Text>
                </View>
              </View>
            ))}

          {obs.schedule_status === 'behind_schedule' && (obs.challenges || obs.catchup_plan || obs.suggestions) && (
            <View style={s.delayBox}>
              {obs.challenges && (
                <View style={s.delayRow}>
                  <Text style={s.delayKey}>Challenges</Text>
                  <Text style={s.delayVal}>{obs.challenges}</Text>
                </View>
              )}
              {obs.catchup_plan && (
                <View style={s.delayRow}>
                  <Text style={s.delayKey}>Catch-up Plan</Text>
                  <Text style={s.delayVal}>{obs.catchup_plan}</Text>
                </View>
              )}
              {obs.suggestions && (
                <View style={[s.delayRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.delayKey}>Suggestions</Text>
                  <Text style={s.delayVal}>{obs.suggestions}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(obs.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigation.navigate('ClassObservation', { purpose: 'Class Observation', visitId })}
          >
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Adopted Class Card ───────────────────────────────────────────────────────

function AdoptedClassCard({
  record, onDelete, navigation, visitId,
}: {
  record: AdoptedClassRecord; onDelete: () => void; navigation: any; visitId: string | number
}) {
  const confirmDelete = () => {
    Alert.alert('Delete Adopted Class', 'Remove this adopted class record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <Text style={s.cardProgram}>{record.program?.name ?? 'FCP'}</Text>
          <View style={[s.purposeTypeBadge, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="school-outline" size={10} color="#2563EB" />
            <Text style={[s.purposeTypeBadgeText, { color: '#2563EB' }]}>ADOPTED CLASS</Text>
          </View>
        </View>
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
          <Text style={s.completedText}>SAVED</Text>
        </View>
      </View>

      <Text style={s.cardTitle}>Class {record.class_name}{record.section ? ` — Section ${record.section}` : ''}</Text>

      <View style={s.detailGrid}>
        {record.module && (
          <View style={s.detailChip}>
            <Ionicons name="layers-outline" size={12} color="#6B7280" />
            <Text style={s.detailChipText}>{record.module.name}</Text>
          </View>
        )}
        {record.media_urls?.length > 0 && (
          <View style={s.detailChip}>
            <Ionicons name="images-outline" size={12} color="#6B7280" />
            <Text style={s.detailChipText}>{record.media_urls.length} media file{record.media_urls.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigation.navigate('ClassObservation', { purpose: 'Adopted Class', visitId })}
          >
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Enabling Session Card ────────────────────────────────────────────────────

function EnablingSessionCard({
  record, onDelete, navigation, visitId,
}: {
  record: EnablingSessionRecord; onDelete: () => void; navigation: any; visitId: string | number
}) {
  const [expanded, setExpanded] = useState(false)

  const confirmDelete = () => {
    Alert.alert('Delete Enabling Session', 'Remove this enabling session record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <Text style={s.cardProgram}>{record.program?.name ?? '—'}</Text>
          <View style={[s.purposeTypeBadge, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="people-outline" size={10} color="#F97316" />
            <Text style={[s.purposeTypeBadgeText, { color: '#F97316' }]}>ENABLING SESSION</Text>
          </View>
        </View>
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
          <Text style={s.completedText}>SAVED</Text>
        </View>
      </View>

      <Text style={s.cardTitle}>{record.number_of_teachers} Teacher{record.number_of_teachers !== 1 ? 's' : ''} · {record.duration} mins</Text>

      <View style={s.detailGrid}>
        <View style={s.detailChip}>
          <Ionicons name="people-outline" size={12} color="#6B7280" />
          <Text style={s.detailChipText}>{record.number_of_teachers} teachers</Text>
        </View>
        <View style={s.detailChip}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={s.detailChipText}>{record.duration} minutes</Text>
        </View>
        {record.media_urls?.length > 0 && (
          <View style={s.detailChip}>
            <Ionicons name="images-outline" size={12} color="#6B7280" />
            <Text style={s.detailChipText}>{record.media_urls.length} media</Text>
          </View>
        )}
      </View>

      {record.remarks ? (
        <TouchableOpacity style={s.remarkRow} onPress={() => setExpanded(!expanded)} activeOpacity={0.75}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#6B7280" />
          <Text style={s.remarkPreview} numberOfLines={expanded ? undefined : 1}>{record.remarks}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigation.navigate('ClassObservation', { purpose: 'Enabling Session', visitId })}
          >
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── No Class Card ────────────────────────────────────────────────────────────

function NoClassCard({
  record, onDelete, navigation, visitId,
}: {
  record: NoClassRecord; onDelete: () => void; navigation: any; visitId: string | number
}) {
  const confirmDelete = () => {
    Alert.alert('Delete Record', 'Remove this no-class-observed record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#EF4444' }]}>
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <View style={[s.purposeTypeBadge, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle-outline" size={10} color="#DC2626" />
            <Text style={[s.purposeTypeBadgeText, { color: '#DC2626' }]}>NO CLASS OBSERVED</Text>
          </View>
        </View>
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
          <Text style={s.completedText}>SAVED</Text>
        </View>
      </View>

      <View style={s.noClassReasonBox}>
        <Ionicons name="information-circle-outline" size={15} color="#DC2626" />
        <Text style={s.noClassReasonText}>{record.reason}</Text>
      </View>

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigation.navigate('ClassObservation', { purpose: 'No Class Observed', visitId })}
          >
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Impact Survey Card ───────────────────────────────────────────────────────

function ImpactSurveyCard({
  record, onDelete, navigation, visitId,
}: {
  record: ImpactSurveyRecord; onDelete: () => void; navigation: any; visitId: string | number
}) {
  const [expanded, setExpanded] = useState(false)
  const responseKeys = Object.keys(record.responses ?? {})

  const confirmDelete = () => {
    Alert.alert('Delete Survey', 'Remove this impact survey record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <Text style={s.cardProgram}>{record.program?.name ?? '—'}</Text>
          <View style={[s.purposeTypeBadge, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="bar-chart-outline" size={10} color="#16A34A" />
            <Text style={[s.purposeTypeBadgeText, { color: '#16A34A' }]}>IMPACT SURVEY</Text>
          </View>
        </View>
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
          <Text style={s.completedText}>SAVED</Text>
        </View>
      </View>

      <Text style={s.cardTitle}>Impact Survey — {record.program?.name ?? '—'}</Text>

      {responseKeys.length > 0 && (
        <TouchableOpacity style={s.scoreSummaryRow} onPress={() => setExpanded(!expanded)} activeOpacity={0.75}>
          <View style={s.scoreSummaryLeft}>
            <Ionicons name="bar-chart-outline" size={14} color="#16A34A" />
            <Text style={[s.scoreSummaryLabel, { color: '#16A34A' }]}>{responseKeys.length} response{responseKeys.length !== 1 ? 's' : ''} recorded</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {expanded && responseKeys.length > 0 && (
        <View style={s.expandedBox}>
          <Text style={s.expandedTitle}>SURVEY RESPONSES</Text>
          {responseKeys.map((key, idx) => (
            <View key={key} style={[s.qRow, idx === responseKeys.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.qLabel}>{key}</Text>
                <Text style={s.qAnswer}>{String(record.responses[key])}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigation.navigate('ClassObservation', { purpose: 'Impact Survey', visitId })}
          >
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Visit Summary Stats ──────────────────────────────────────────────────────

function VisitSummaryBar({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const items = [
    { key: 'observations',    label: 'Obs',      color: '#F97316', icon: 'eye-outline'           },
    { key: 'adopted',         label: 'Adopted',  color: '#2563EB', icon: 'school-outline'         },
    { key: 'enabling',        label: 'Sessions', color: '#7C3AED', icon: 'people-outline'         },
    { key: 'noClass',         label: 'No Class', color: '#DC2626', icon: 'close-circle-outline'   },
    { key: 'impact',          label: 'Surveys',  color: '#16A34A', icon: 'bar-chart-outline'      },
  ].filter(item => (counts[item.key] ?? 0) > 0)

  return (
    <View style={s.summaryBar}>
      <Text style={s.summaryBarTitle}>VISIT SUMMARY</Text>
      <View style={s.summaryBarRow}>
        {items.map(item => (
          <View key={item.key} style={s.summaryBarItem}>
            <View style={[s.summaryBarIconCircle, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon as any} size={14} color={item.color} />
            </View>
            <Text style={[s.summaryBarCount, { color: item.color }]}>{counts[item.key]}</Text>
            <Text style={s.summaryBarLabel}>{item.label}</Text>
          </View>
        ))}
        <View style={[s.summaryBarItem, { borderLeftWidth: 1, borderLeftColor: '#E5E7EB', paddingLeft: 14 }]}>
          <View style={[s.summaryBarIconCircle, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="checkmark-done-outline" size={14} color="#374151" />
          </View>
          <Text style={[s.summaryBarCount, { color: '#374151' }]}>{total}</Text>
          <Text style={s.summaryBarLabel}>Total</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ObservationSummary() {
  const navigation   = useNavigation()
  const route        = useRoute()
  const visitContext = useVisit()

  const { purpose: rawPurpose, visitId: routeVisitId } =
    (route.params ?? {}) as { purpose?: string | string[]; visitId?: string | number }
  const purpose = Array.isArray(rawPurpose) ? rawPurpose[0] : rawPurpose

  // FIX: prefer route param, fall back to context — both hold the same value
  const { visitId: contextVisitId } = visitContext
  const visitId = routeVisitId ?? contextVisitId

  // ── State ─────────────────────────────────────────────────────────────────
  const [observations,    setObservations]    = useState<ObservationResponse[]>([])
  const [adoptedClasses,  setAdoptedClasses]  = useState<AdoptedClassRecord[]>([])
  const [enablingSessions,setEnablingSessions]= useState<EnablingSessionRecord[]>([])
  const [noClassRecord,   setNoClassRecord]   = useState<NoClassRecord | null>(null)
  const [impactSurveys,   setImpactSurveys]   = useState<ImpactSurveyRecord[]>([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)

  // ── Load all visit data in parallel ───────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!visitId) { setError('Visit ID missing'); setLoading(false); return }

    setLoading(true)
    setError(null)

    // Fire all 5 requests in parallel for speed
    const [obsRes, adoptedRes, enabRes, noClassRes, impactRes] = await Promise.allSettled([
      getClassObservations(visitId),
      getAdoptedClass(visitId),
      getEnablingSessions(visitId),
      getNoClassObserved(visitId),
      getImpactSurveys(visitId),
    ])

    // Class Observations
    if (obsRes.status === 'fulfilled' && obsRes.value.success && Array.isArray(obsRes.value.data)) {
      setObservations(obsRes.value.data)
    } else if (obsRes.status === 'fulfilled' && !obsRes.value.success) {
      console.warn('[ObservationSummary] class observations:', obsRes.value.message)
    }

    // Adopted Classes
    if (adoptedRes.status === 'fulfilled' && adoptedRes.value.success && Array.isArray(adoptedRes.value.data)) {
      setAdoptedClasses(adoptedRes.value.data)
    }

    // Enabling Sessions
    if (enabRes.status === 'fulfilled' && enabRes.value.success && Array.isArray(enabRes.value.data)) {
      setEnablingSessions(enabRes.value.data)
    }

    // No Class Observed (single record or 404)
    if (noClassRes.status === 'fulfilled' && noClassRes.value.success && noClassRes.value.data) {
      setNoClassRecord(noClassRes.value.data)
    } else {
      setNoClassRecord(null) // 404 is fine — just means no record
    }

    // Impact Surveys
    if (impactRes.status === 'fulfilled' && impactRes.value.success && Array.isArray(impactRes.value.data)) {
      setImpactSurveys(impactRes.value.data)
    }

    setLoading(false)
  }, [visitId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Delete handlers (local state — add DELETE API call when endpoint exists) ──
  const deleteObservation   = (id: string) => setObservations(prev => prev.filter(o => o.id !== id))
  const deleteAdopted       = (id: string) => setAdoptedClasses(prev => prev.filter(o => o.id !== id))
  const deleteEnabling      = (id: string) => setEnablingSessions(prev => prev.filter(o => o.id !== id))
  const deleteNoClass       = ()           => setNoClassRecord(null)
  const deleteImpactSurvey  = (id: string) => setImpactSurveys(prev => prev.filter(o => o.id !== id))

  // ── Total count ───────────────────────────────────────────────────────────
  const counts = {
    observations: observations.length,
    adopted:      adoptedClasses.length,
    enabling:     enablingSessions.length,
    noClass:      noClassRecord ? 1 : 0,
    impact:       impactSurveys.length,
  }
  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToChecklist = purpose === 'Class Observation' || purpose === 'No Class Observed'
  const handleProceed = () => {
    if (goToChecklist) {
      // Class Observation / No Class Observed → checklist first, then FinishVisit
      navigation.navigate('VisitChecklist' as never, { visitId } as never)
    } else {
      // All other purposes → go directly to FinishVisit
      navigation.navigate('FinishVisit' as never, { visitId } as never)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Summary" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <StepBar current={4} />
        <SchoolBanner />

        {/* Loading */}
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={s.centerText}>Loading visit records...</Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={[s.centerText, { color: '#DC2626', marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadAll}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Summary stats bar */}
            {totalRecords > 0 && <VisitSummaryBar counts={counts} />}

            {/* ── 1. Class Observations ── */}
            {observations.length > 0 && (
              <>
                <SectionHeader label="CLASS OBSERVATIONS" count={observations.length} />
                {observations.map(obs => (
                  <ObservationCard
                    key={obs.id}
                    obs={obs}
                    navigation={navigation}
                    visitId={visitId!}
                    onDelete={() => deleteObservation(obs.id)}
                  />
                ))}
              </>
            )}

            {/* ── 2. Adopted Classes ── */}
            {adoptedClasses.length > 0 && (
              <>
                <SectionHeader label="ADOPTED CLASS" count={adoptedClasses.length} countColor="#2563EB" countBg="#EFF6FF" />
                {adoptedClasses.map(rec => (
                  <AdoptedClassCard
                    key={rec.id}
                    record={rec}
                    navigation={navigation}
                    visitId={visitId!}
                    onDelete={() => deleteAdopted(rec.id)}
                  />
                ))}
              </>
            )}

            {/* ── 3. Enabling Sessions ── */}
            {enablingSessions.length > 0 && (
              <>
                <SectionHeader label="ENABLING SESSIONS" count={enablingSessions.length} countColor="#7C3AED" countBg="#F5F3FF" />
                {enablingSessions.map(rec => (
                  <EnablingSessionCard
                    key={rec.id}
                    record={rec}
                    navigation={navigation}
                    visitId={visitId!}
                    onDelete={() => deleteEnabling(rec.id)}
                  />
                ))}
              </>
            )}

            {/* ── 4. No Class Observed ── */}
            {noClassRecord && (
              <>
                <SectionHeader label="NO CLASS OBSERVED" color="#DC2626" countColor="#DC2626" countBg="#FEF2F2" />
                <NoClassCard
                  record={noClassRecord}
                  navigation={navigation}
                  visitId={visitId!}
                  onDelete={deleteNoClass}
                />
              </>
            )}

            {/* ── 5. Impact Surveys ── */}
            {impactSurveys.length > 0 && (
              <>
                <SectionHeader label="IMPACT SURVEYS" count={impactSurveys.length} countColor="#16A34A" countBg="#F0FDF4" />
                {impactSurveys.map(rec => (
                  <ImpactSurveyCard
                    key={rec.id}
                    record={rec}
                    navigation={navigation}
                    visitId={visitId!}
                    onDelete={() => deleteImpactSurvey(rec.id)}
                  />
                ))}
              </>
            )}

            {/* ── Empty state (all sections empty) ── */}
            {totalRecords === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyStateText}>No records saved yet</Text>
                <Text style={s.emptyStateSubText}>Add a visit purpose below</Text>
              </View>
            )}
          </>
        )}

        {/* ── Add buttons ── */}
        <TouchableOpacity
          style={s.addWrapper}
          onPress={() => navigation.navigate('ClassObservation' as never, { purpose: 'Class Observation', visitId } as never)}
          activeOpacity={0.8}
        >
          <View style={s.addCircle}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
          <Text style={s.addBtnText}>Add Another Class Observation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.addWrapper, { borderColor: '#6B7280' }]}
          onPress={() => navigation.navigate('visitForm' as never, { visitId } as never)}
          activeOpacity={0.8}
        >
          <View style={[s.addCircle, { backgroundColor: '#6B7280' }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
          <Text style={[s.addBtnText, { color: '#6B7280' }]}>Add Another Purpose</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomArea}>
        <TouchableOpacity style={s.proceedBtn} onPress={handleProceed} activeOpacity={0.85}>
          <Text style={s.proceedText}>
            {goToChecklist ? 'Proceed to Checklist' : 'Proceed to Finish Visit'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <Text style={s.footer}>NGO FIELD MONITORING TOOL V4.2</Text>
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  centerText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Summary bar
  summaryBar:          { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  summaryBarTitle:     { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  summaryBarRow:       { flexDirection: 'row', gap: 4 },
  summaryBarItem:      { flex: 1, alignItems: 'center', gap: 4 },
  summaryBarIconCircle:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryBarCount:     { fontSize: 16, fontWeight: '800' },
  summaryBarLabel:     { fontSize: 9, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },

  // Section headers
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, marginTop: 16 },
  sectionLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  countBadge:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:     { fontSize: 11, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, padding: 16,
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  rowBetween:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  programBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardProgram:   { color: '#F97316', fontWeight: '700', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  moduleBadge:   { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  moduleBadgeText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  completedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  completedText: { color: '#16A34A', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  cardTitle:     { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 6, marginBottom: 8 },

  purposeTypeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  purposeTypeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  detailGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  detailChipText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  metaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:       { color: '#6B7280', fontSize: 12 },
  schedulePill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  schedulePillText: { fontSize: 10, fontWeight: '700' },

  scoreSummaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  scoreSummaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreSummaryLabel: { fontSize: 12, fontWeight: '700' },
  scorePill:         { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  scorePillText:     { fontSize: 11, fontWeight: '700' },

  expandedBox:   { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 10 },
  expandedTitle: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8 },
  qRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
  qLabel:        { fontSize: 12, color: '#374151', fontWeight: '500', marginBottom: 2 },
  qAnswer:       { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  qScoreBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 38, alignItems: 'center' },
  qScoreText:    { fontSize: 11, fontWeight: '700' },

  remarkRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
  remarkPreview: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },

  noClassReasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  noClassReasonText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },

  delayBox: { marginTop: 10, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 },
  delayRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  delayKey: { fontSize: 10, fontWeight: '700', color: '#DC2626', letterSpacing: 0.5, marginBottom: 2 },
  delayVal: { fontSize: 12, color: '#374151', lineHeight: 17 },

  divider:    { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  createdAt:  { color: '#9CA3AF', fontSize: 12 },
  actionRow:  { flexDirection: 'row', gap: 14 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText:   { color: '#F97316', fontWeight: '600', fontSize: 13 },
  deleteText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },

  addWrapper:  { marginHorizontal: 16, marginTop: 4, marginBottom: 12, borderWidth: 2, borderColor: '#F97316', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 10 },
  addCircle:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  addBtnText:  { color: '#F97316', fontWeight: '700', fontSize: 15 },

  emptyState:        { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyStateText:    { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  emptyStateSubText: { fontSize: 13, color: '#9CA3AF' },

  bottomArea:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  proceedBtn:  { backgroundColor: '#F97316', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  proceedText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  footer:      { textAlign: 'center', marginTop: 10, color: '#9CA3AF', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
})