// screens/visit/VisitChecklist.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import StepBar from '../../../components/StepBar'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChecklistItemType = {
  icon: string
  title: string
  subError: string | null
  verified: boolean
}

// ─── Initial checklist data ───────────────────────────────────────────────────

const INITIAL_ITEMS: ChecklistItemType[] = [
  { icon: 'shield-checkmark', title: 'Principal Details Verified',   subError: null,                    verified: true  },
  { icon: 'person',           title: 'Headmaster Details Verified',  subError: null,                    verified: true  },
  { icon: 'people',           title: 'Coordinator Details Verified', subError: null,                    verified: true  },
  { icon: 'list',             title: 'Sections & Strength Verified', subError: null,                    verified: true  },
  { icon: 'card',             title: 'Teacher Assignment Verified',  subError: '2 assignments pending', verified: false },
  { icon: 'eye',              title: 'Observation Completed',        subError: null,                    verified: true  },
  { icon: 'images',           title: 'Media Uploaded',               subError: null,                    verified: true  },
]

// ─── Checklist Item ───────────────────────────────────────────────────────────

function ChecklistItem({
  icon, title, subError, verified, onPress,
}: ChecklistItemType & { onPress: () => void }) {
  return (
    <View style={[s.cardWrapper, !verified && s.cardWrapperError]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.card}>
        <View style={s.cardRow}>
          <View style={[s.iconBox, !verified && s.iconBoxError]}>
            <Ionicons name={icon as any} size={20} color="#fff" />
          </View>
          <View style={s.cardTextWrap}>
            <Text style={[s.cardTitle, !verified && s.cardTitleError]}>{title}</Text>
            {!verified && subError ? (
              <Text style={s.subErrorText}>{subError}</Text>
            ) : null}
          </View>
          <Ionicons
            name={verified ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={verified ? '#22C55E' : '#EF4444'}
          />
        </View>
      </TouchableOpacity>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VisitChecklist() {
  const navigation = useNavigation()

  // FIX: destructure visitId from context — this was set in VisitCheckin
  // when the visit was created / resumed. It flows through the whole visit.
  const { currentSchool, visitId } = useVisit()

  const [items, setItems] = useState<ChecklistItemType[]>(INITIAL_ITEMS)

  const toggleStatus = (index: number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], verified: !updated[index].verified }
    setItems(updated)
  }

  const allVerified    = items.every(item => item.verified)
  const verifiedCount  = items.filter(i => i.verified).length

  const finishVisit = () => {
    if (!allVerified) {
      Alert.alert('Incomplete Checklist', 'Please verify all checklist items before proceeding.')
      return
    }
    // FIX: pass visitId so FinishVisit can call the checkout API
    navigation.navigate('FinishVisit' as never, { visitId } as never)
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Checklist" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <StepBar current={5} />
        <SchoolBanner />

        <Text style={s.title}>Final School Checklist</Text>
        <Text style={s.subtitle}>
          Please ensure all tasks are completed before finishing the visit.
        </Text>

        {/* Progress card */}
        <View style={s.progressCard}>
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>Checklist Progress</Text>
            <Text style={s.progressCount}>
              <Text style={{ color: '#F97316', fontWeight: '800' }}>{verifiedCount}</Text>
              /{items.length} verified
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(verifiedCount / items.length) * 100}%` as any }]} />
          </View>
        </View>

        {items.map((item, index) => (
          <ChecklistItem
            key={index}
            {...item}
            onPress={() => toggleStatus(index)}
          />
        ))}
      </ScrollView>

      {/* Bottom area */}
      <View style={s.bottomArea}>
        <TouchableOpacity
          style={[s.finishBtn, !allVerified && s.finishDisabled]}
          onPress={finishVisit}
          activeOpacity={allVerified ? 0.85 : 1}
        >
          <Text style={[s.finishText, !allVerified && s.finishTextDisabled]}>
            Finish Visit
          </Text>
          <Ionicons
            name={allVerified ? 'checkmark-circle' : 'lock-closed'}
            size={18}
            color={allVerified ? '#fff' : '#94A3B8'}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
        <Text style={s.bottomNote}>
          Complete all red items to finish your visit report.
        </Text>
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  title:    { fontSize: 26, fontWeight: '800', color: '#111827', marginHorizontal: 20, marginTop: 12, marginBottom: 6, textAlign: 'center' },
  subtitle: { color: '#6B7280', fontSize: 13.5, marginHorizontal: 30, marginBottom: 16, textAlign: 'center', lineHeight: 20 },

  progressCard:  { marginHorizontal: 16, marginBottom: 18, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  progressInfo:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  progressCount: { fontSize: 13, color: '#374151' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#F97316', borderRadius: 3 },

  cardWrapper:      { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardWrapperError: { backgroundColor: '#FFF1F2', elevation: 0, shadowOpacity: 0 },
  card:             { padding: 14 },
  cardRow:          { flexDirection: 'row', alignItems: 'center' },
  iconBox:          { width: 42, height: 42, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconBoxError:     { backgroundColor: '#EF4444' },
  cardTextWrap:     { flex: 1 },
  cardTitle:        { fontWeight: '600', fontSize: 15, color: '#111827' },
  cardTitleError:   { fontWeight: '700', color: '#111827' },
  subErrorText:     { color: '#EF4444', fontSize: 12, marginTop: 2 },

  bottomArea:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  finishBtn:           { backgroundColor: '#F97316', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  finishDisabled:      { backgroundColor: '#E2E8F0', elevation: 0, shadowOpacity: 0 },
  finishText:          { fontWeight: '800', color: '#fff', fontSize: 16 },
  finishTextDisabled:  { color: '#94A3B8' },
  bottomNote:          { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 10 },
})