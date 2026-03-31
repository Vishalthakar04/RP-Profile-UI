// screens/visit/ObservationSummary.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StatusBar
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
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
  deleteClassObservation,
  deleteAdoptedClass,
  deleteEnablingSession,
  deleteNoClassObserved,
  deleteImpactSurvey,
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
  facilitator: { id: string; name: string; phone: string } | null
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
  teacher: { id: string; name: string; phone: string } | null
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
  id:        string
  visit_id:  string
  reason:    string
  createdAt: string
}

interface ImpactSurveyRecord {
  id:         string
  visit_id:   string
  program_id: string
  responses:  Record<string, any>
  createdAt:  string
  program: { id: string; name: string } | null
}

// ─── Modal State Types ────────────────────────────────────────────────────────

type ModalAction = 'delete' | 'edit' | null

interface ModalState {
  visible:     boolean
  action:      ModalAction
  title:       string
  subtitle:    string
  confirmText: string
  confirmColor:string
  iconName:    string
  iconColor:   string
  iconBg:      string
  onConfirm:   () => void
}

const MODAL_DEFAULTS: ModalState = {
  visible:      false,
  action:       null,
  title:        '',
  subtitle:     '',
  confirmText:  '',
  confirmColor: '#EF4444',
  iconName:     'trash-outline',
  iconColor:    '#EF4444',
  iconBg:       '#FEF2F2',
  onConfirm:    () => {},
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SCORE_BAND_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  strong:        { label: 'Strong Facilitation', color: '#16A34A', bg: '#F0FDF4', icon: 'trophy-outline'       },
  developing:    { label: 'Developing',           color: '#CA8A04', bg: '#FEFCE8', icon: 'trending-up-outline'  },
  needs_support: { label: 'Needs Support',        color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle-outline' },
}

const SCHEDULE_CFG: Record<string, { label: string; color: string; bg: string }> = {
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

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({
  state,
  onClose,
  loading,
}: {
  state:   ModalState
  onClose: () => void
  loading: boolean
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const opacAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (state.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start()
    } else {
      scaleAnim.setValue(0.85)
      opacAnim.setValue(0)
    }
  }, [state.visible])

  if (!state.visible) return null

  return (
    <Modal visible={state.visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={!loading ? onClose : undefined}>
        <Animated.View style={[s.modalOverlay, { opacity: opacAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[s.modalCard, { transform: [{ scale: scaleAnim }] }]}>
              {/* Icon */}
              <View style={[s.modalIconCircle, { backgroundColor: state.iconBg }]}>
                <Ionicons name={state.iconName as any} size={28} color={state.iconColor} />
              </View>

              {/* Text */}
              <Text style={s.modalTitle}>{state.title}</Text>
              <Text style={s.modalSubtitle}>{state.subtitle}</Text>

              {/* Buttons */}
              <View style={s.modalBtnRow}>
                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.modalConfirmBtn, { backgroundColor: state.confirmColor }, loading && s.modalBtnLoading]}
                  onPress={state.onConfirm}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name={state.iconName as any} size={15} color="#fff" />
                      <Text style={s.modalConfirmText}>{state.confirmText}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
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
  obs, onDelete, onEdit, deleting,
}: {
  obs:      ObservationResponse
  onDelete: () => void
  onEdit:   () => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const band     = SCORE_BAND_CONFIG[obs.score_band] ?? SCORE_BAND_CONFIG.developing
  const schedule = SCHEDULE_CFG[obs.schedule_status] ?? SCHEDULE_CFG.on_track

  const maxScore    = obs.responses.filter(r => !r.is_na).length * 3
  const earnedScore = obs.responses.reduce((sum, r) => sum + (r.is_na ? 0 : (r.score ?? 0)), 0)

  return (
    <View style={[s.card, deleting && s.cardDeleting]}>
      {deleting && (
        <View style={s.cardDeletingOverlay}>
          <ActivityIndicator size="small" color="#EF4444" />
          <Text style={s.cardDeletingText}>Deleting...</Text>
        </View>
      )}

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
        {obs.facilitator ? (
          <View style={s.teacherBadge}>
            <Ionicons name="person-circle-outline" size={13} color="#7C3AED" />
            <Text style={s.teacherBadgeText} numberOfLines={1}>{obs.facilitator.name}</Text>
          </View>
        ) : (
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
            <Text style={s.completedText}>SAVED</Text>
          </View>
        )}
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

      {/* Score row */}
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
              {obs.challenges  && <View style={s.delayRow}><Text style={s.delayKey}>Challenges</Text><Text style={s.delayVal}>{obs.challenges}</Text></View>}
              {obs.catchup_plan && <View style={s.delayRow}><Text style={s.delayKey}>Catch-up Plan</Text><Text style={s.delayVal}>{obs.catchup_plan}</Text></View>}
              {obs.suggestions  && <View style={[s.delayRow, { borderBottomWidth: 0 }]}><Text style={s.delayKey}>Suggestions</Text><Text style={s.delayVal}>{obs.suggestions}</Text></View>}
            </View>
          )}
        </View>
      )}

      <View style={s.divider} />
      <View style={s.rowBetween}>
        <Text style={s.createdAt}>
          {new Date(obs.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={deleting} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onDelete} disabled={deleting} activeOpacity={0.75}>
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
  record, onDelete, onEdit, deleting,
}: {
  record:   AdoptedClassRecord
  onDelete: () => void
  onEdit:   () => void
  deleting: boolean
}) {
  return (
    <View style={[s.card, deleting && s.cardDeleting]}>
      {deleting && (
        <View style={s.cardDeletingOverlay}>
          <ActivityIndicator size="small" color="#EF4444" />
          <Text style={s.cardDeletingText}>Deleting...</Text>
        </View>
      )}
      <View style={s.rowBetween}>
        <View style={s.programBadgeRow}>
          <Text style={s.cardProgram}>{record.program?.name ?? 'FCP'}</Text>
          <View style={[s.purposeTypeBadge, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="school-outline" size={10} color="#2563EB" />
            <Text style={[s.purposeTypeBadgeText, { color: '#2563EB' }]}>ADOPTED CLASS</Text>
          </View>
        </View>
        {record.teacher ? (
          <View style={s.teacherBadge}>
            <Ionicons name="person-circle-outline" size={13} color="#7C3AED" />
            <Text style={s.teacherBadgeText} numberOfLines={1}>{record.teacher.name}</Text>
          </View>
        ) : (
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
            <Text style={s.completedText}>SAVED</Text>
          </View>
        )}
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
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={deleting} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onDelete} disabled={deleting} activeOpacity={0.75}>
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
  record, onDelete, onEdit, deleting,
}: {
  record:   EnablingSessionRecord
  onDelete: () => void
  onEdit:   () => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={[s.card, deleting && s.cardDeleting]}>
      {deleting && (
        <View style={s.cardDeletingOverlay}>
          <ActivityIndicator size="small" color="#EF4444" />
          <Text style={s.cardDeletingText}>Deleting...</Text>
        </View>
      )}
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
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={deleting} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onDelete} disabled={deleting} activeOpacity={0.75}>
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
  record, onDelete, onEdit, deleting,
}: {
  record:   NoClassRecord
  onDelete: () => void
  onEdit:   () => void
  deleting: boolean
}) {
  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#EF4444' }, deleting && s.cardDeleting]}>
      {deleting && (
        <View style={s.cardDeletingOverlay}>
          <ActivityIndicator size="small" color="#EF4444" />
          <Text style={s.cardDeletingText}>Deleting...</Text>
        </View>
      )}
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
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={deleting} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onDelete} disabled={deleting} activeOpacity={0.75}>
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
  record, onDelete, onEdit, deleting,
}: {
  record:   ImpactSurveyRecord
  onDelete: () => void
  onEdit:   () => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const responseKeys = Object.keys(record.responses ?? {})

  return (
    <View style={[s.card, deleting && s.cardDeleting]}>
      {deleting && (
        <View style={s.cardDeletingOverlay}>
          <ActivityIndicator size="small" color="#EF4444" />
          <Text style={s.cardDeletingText}>Deleting...</Text>
        </View>
      )}
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
          {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={onEdit} disabled={deleting} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={16} color="#F97316" />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={onDelete} disabled={deleting} activeOpacity={0.75}>
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
    { key: 'observations', label: 'Obs',      color: '#F97316', icon: 'eye-outline'         },
    { key: 'adopted',      label: 'Adopted',  color: '#2563EB', icon: 'school-outline'       },
    { key: 'enabling',     label: 'Sessions', color: '#7C3AED', icon: 'people-outline'       },
    { key: 'noClass',      label: 'No Class', color: '#DC2626', icon: 'close-circle-outline' },
    { key: 'impact',       label: 'Surveys',  color: '#16A34A', icon: 'bar-chart-outline'    },
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

  const { visitId: contextVisitId } = visitContext
  const visitId = routeVisitId ?? contextVisitId

  // ── Data state ────────────────────────────────────────────────────────────
  const [observations,     setObservations]     = useState<ObservationResponse[]>([])
  const [adoptedClasses,   setAdoptedClasses]   = useState<AdoptedClassRecord[]>([])
  const [enablingSessions, setEnablingSessions] = useState<EnablingSessionRecord[]>([])
  const [noClassRecord,    setNoClassRecord]    = useState<NoClassRecord | null>(null)
  const [impactSurveys,    setImpactSurveys]    = useState<ImpactSurveyRecord[]>([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal,         setModal]         = useState<ModalState>(MODAL_DEFAULTS)
  const [modalLoading,  setModalLoading]  = useState(false)

  // ── Per-card deleting state (shows inline spinner on the card) ────────────
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const closeModal = () => {
    if (modalLoading) return
    setModal(MODAL_DEFAULTS)
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!visitId) { setError('Visit ID missing'); setLoading(false); return }
    setLoading(true); setError(null)

    const [obsRes, adoptedRes, enabRes, noClassRes, impactRes] = await Promise.allSettled([
      getClassObservations(visitId),
      getAdoptedClass(visitId),
      getEnablingSessions(visitId),
      getNoClassObserved(visitId).catch(() => ({ success: false, data: null })),
      getImpactSurveys(visitId),
    ])

    if (obsRes.status === 'fulfilled' && obsRes.value.success && Array.isArray(obsRes.value.data))
      setObservations(obsRes.value.data)

    if (adoptedRes.status === 'fulfilled' && adoptedRes.value.success && Array.isArray(adoptedRes.value.data))
      setAdoptedClasses(adoptedRes.value.data)

    if (enabRes.status === 'fulfilled' && enabRes.value.success && Array.isArray(enabRes.value.data))
      setEnablingSessions(enabRes.value.data)

    if (noClassRes.status === 'fulfilled' && noClassRes.value.success && noClassRes.value.data)
      setNoClassRecord(noClassRes.value.data)
    else
      setNoClassRecord(null)

    if (impactRes.status === 'fulfilled' && impactRes.value.success && Array.isArray(impactRes.value.data))
      setImpactSurveys(impactRes.value.data)

    setLoading(false)
  }, [visitId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Generic modal opener helpers ──────────────────────────────────────────

  const openDeleteModal = (config: {
    title:    string
    subtitle: string
    onConfirm:() => Promise<void>
  }) => {
    setModal({
      visible:      true,
      action:       'delete',
      title:        config.title,
      subtitle:     config.subtitle,
      confirmText:  'Delete',
      confirmColor: '#EF4444',
      iconName:     'trash-outline',
      iconColor:    '#EF4444',
      iconBg:       '#FEF2F2',
      onConfirm:    async () => {
        setModalLoading(true)
        await config.onConfirm()
        setModalLoading(false)
        setModal(MODAL_DEFAULTS)
      },
    })
  }

  const openEditModal = (config: {
    title:    string
    subtitle: string
    onConfirm:() => void
  }) => {
    setModal({
      visible:      true,
      action:       'edit',
      title:        config.title,
      subtitle:     config.subtitle,
      confirmText:  'Edit Record',
      confirmColor: '#F97316',
      iconName:     'create-outline',
      iconColor:    '#F97316',
      iconBg:       '#FFF7ED',
      onConfirm:    () => {
        setModal(MODAL_DEFAULTS)
        config.onConfirm()
      },
    })
  }

  // ── Delete handlers ───────────────────────────────────────────────────────

  const handleDeleteObservation = (obs: ObservationResponse) => {
    openDeleteModal({
      title:    'Delete Observation',
      subtitle: `Delete the ${obs.program?.name ?? ''} observation for Section ${obs.section ?? '—'}? This cannot be undone.`,
      onConfirm: async () => {
        setDeletingId(obs.id)
        const res = await deleteClassObservation(obs.id)
        setDeletingId(null)
        if (res.success) {
          setObservations(prev => prev.filter(o => o.id !== obs.id))
        } else {
          Alert.alert('Delete Failed', res.message || 'Could not delete observation.')
        }
      },
    })
  }

  const handleDeleteAdopted = (rec: AdoptedClassRecord) => {
    openDeleteModal({
      title:    'Delete Adopted Class',
      subtitle: `Remove the FCP adopted class record for Class ${rec.class_name}${rec.section ? ` Section ${rec.section}` : ''}?`,
      onConfirm: async () => {
        setDeletingId(rec.id)
        const res = await deleteAdoptedClass(visitId!, rec.id)
        setDeletingId(null)
        if (res.success) {
          setAdoptedClasses(prev => prev.filter(o => o.id !== rec.id))
        } else {
          Alert.alert('Delete Failed', res.message || 'Could not delete adopted class.')
        }
      },
    })
  }

  const handleDeleteEnabling = (rec: EnablingSessionRecord) => {
    openDeleteModal({
      title:    'Delete Enabling Session',
      subtitle: `Remove the ${rec.program?.name ?? ''} enabling session with ${rec.number_of_teachers} teacher(s)?`,
      onConfirm: async () => {
        setDeletingId(rec.id)
        const res = await deleteEnablingSession(visitId!, rec.id)
        setDeletingId(null)
        if (res.success) {
          setEnablingSessions(prev => prev.filter(o => o.id !== rec.id))
        } else {
          Alert.alert('Delete Failed', res.message || 'Could not delete enabling session.')
        }
      },
    })
  }

  const handleDeleteNoClass = (rec: NoClassRecord) => {
    openDeleteModal({
      title:    'Delete No-Class Record',
      subtitle: `Remove the no-class-observed record ("${rec.reason}")?`,
      onConfirm: async () => {
        setDeletingId(rec.id)
        const res = await deleteNoClassObserved(visitId!)
        setDeletingId(null)
        if (res.success) {
          setNoClassRecord(null)
        } else {
          Alert.alert('Delete Failed', res.message || 'Could not delete record.')
        }
      },
    })
  }

  const handleDeleteImpact = (rec: ImpactSurveyRecord) => {
    openDeleteModal({
      title:    'Delete Impact Survey',
      subtitle: `Remove the ${rec.program?.name ?? ''} impact survey?`,
      onConfirm: async () => {
        setDeletingId(rec.id)
        const res = await deleteImpactSurvey(visitId!, rec.id)
        setDeletingId(null)
        if (res.success) {
          setImpactSurveys(prev => prev.filter(o => o.id !== rec.id))
        } else {
          Alert.alert('Delete Failed', res.message || 'Could not delete survey.')
        }
      },
    })
  }

  // ── Edit handlers (with confirmation modal) ───────────────────────────────

  const handleEditObservation = (obs: ObservationResponse) => {
    openEditModal({
      title:    'Edit Observation',
      subtitle: `Edit the ${obs.program?.name ?? ''} observation for Section ${obs.section ?? '—'}? Your current answers will be pre-filled.`,
      onConfirm: () => navigation.navigate('ClassObservation' as never, {
        purpose: 'Class Observation', visitId, editId: obs.id,
      } as never),
    })
  }

  const handleEditAdopted = (rec: AdoptedClassRecord) => {
    openEditModal({
      title:    'Edit Adopted Class',
      subtitle: `Edit the FCP adopted class for Class ${rec.class_name}${rec.section ? ` Section ${rec.section}` : ''}?`,
      onConfirm: () => navigation.navigate('ClassObservation' as never, {
        purpose: 'Adopted Class', visitId, editId: rec.id,
      } as never),
    })
  }

  const handleEditEnabling = (rec: EnablingSessionRecord) => {
    openEditModal({
      title:    'Edit Enabling Session',
      subtitle: `Edit the ${rec.program?.name ?? ''} enabling session?`,
      onConfirm: () => navigation.navigate('ClassObservation' as never, {
        purpose: 'Enabling Session', visitId, editId: rec.id,
      } as never),
    })
  }

  const handleEditNoClass = (rec: NoClassRecord) => {
    openEditModal({
      title:    'Edit No-Class Record',
      subtitle: `Update the reason for no class observed ("${rec.reason}")?`,
      onConfirm: () => navigation.navigate('ClassObservation' as never, {
        purpose: 'No Class Observed', visitId, editId: rec.id,
      } as never),
    })
  }

  const handleEditImpact = (rec: ImpactSurveyRecord) => {
    openEditModal({
      title:    'Edit Impact Survey',
      subtitle: `Edit the ${rec.program?.name ?? ''} impact survey?`,
      onConfirm: () => navigation.navigate('ClassObservation' as never, {
        purpose: 'Impact Survey', visitId, editId: rec.id,
      } as never),
    })
  }

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    observations: observations.length,
    adopted:      adoptedClasses.length,
    enabling:     enablingSessions.length,
    noClass:      noClassRecord ? 1 : 0,
    impact:       impactSurveys.length,
  }
  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  // ── Navigation ────────────────────────────────────────────────────────────
 const goToChecklist = observations.length > 0 || noClassRecord !== null

  const handleProceed = () => {
    if (goToChecklist) {
      navigation.navigate('VisitChecklist' as never, { visitId } as never)
    } else {
      navigation.navigate('FinishVisit' as never, { visitId } as never)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Summary" />

      {/* Confirmation Modal (shared for all delete + edit actions) */}
      <ConfirmModal
        state={modal}
        onClose={closeModal}
        loading={modalLoading}
      />

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
            {totalRecords > 0 && <VisitSummaryBar counts={counts} />}

            {/* ── 1. Class Observations ── */}
            {observations.length > 0 && (
              <>
                <SectionHeader label="CLASS OBSERVATIONS" count={observations.length} />
                {observations.map(obs => (
                  <ObservationCard
                    key={obs.id}
                    obs={obs}
                    deleting={deletingId === obs.id}
                    onDelete={() => handleDeleteObservation(obs)}
                    onEdit={()   => handleEditObservation(obs)}
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
                    deleting={deletingId === rec.id}
                    onDelete={() => handleDeleteAdopted(rec)}
                    onEdit={()   => handleEditAdopted(rec)}
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
                    deleting={deletingId === rec.id}
                    onDelete={() => handleDeleteEnabling(rec)}
                    onEdit={()   => handleEditEnabling(rec)}
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
                  deleting={deletingId === noClassRecord.id}
                  onDelete={() => handleDeleteNoClass(noClassRecord)}
                  onEdit={()   => handleEditNoClass(noClassRecord)}
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
                    deleting={deletingId === rec.id}
                    onDelete={() => handleDeleteImpact(rec)}
                    onEdit={()   => handleEditImpact(rec)}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {totalRecords === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyStateText}>No records saved yet</Text>
                <Text style={s.emptyStateSubText}>Add a visit purpose below</Text>
              </View>
            )}
          </>
        )}

        {/* Add buttons */}
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

  // ── Confirmation Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalBtnLoading: {
    opacity: 0.75,
  },

  // ── Card deleting overlay ──
  cardDeleting: {
    opacity: 0.55,
  },
  cardDeletingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  cardDeletingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Summary bar
  summaryBar:           { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  summaryBarTitle:      { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  summaryBarRow:        { flexDirection: 'row', gap: 4 },
  summaryBarItem:       { flex: 1, alignItems: 'center', gap: 4 },
  summaryBarIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryBarCount:      { fontSize: 16, fontWeight: '800' },
  summaryBarLabel:      { fontSize: 9, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },

  // Section headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, marginTop: 16 },
  sectionLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  countBadge:       { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:   { fontSize: 11, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, padding: 16,
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  rowBetween:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  programBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardProgram:     { color: '#F97316', fontWeight: '700', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  moduleBadge:     { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  moduleBadgeText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  completedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  completedText:   { color: '#16A34A', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  cardTitle:       { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 6, marginBottom: 8 },

  purposeTypeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  purposeTypeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  detailGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  detailChipText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  metaRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:         { color: '#6B7280', fontSize: 12 },
  schedulePill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
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

  noClassReasonBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
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

  teacherBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  teacherBadgeText: { color: '#7C3AED', fontSize: 11, fontWeight: '700', letterSpacing: 0.2, maxWidth: 110 },
})