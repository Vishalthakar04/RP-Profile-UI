// VisitCheckin.tsx

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context";
import Geolocation from 'react-native-geolocation-service'
import { useNavigation } from '@react-navigation/native'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { WebView } from 'react-native-webview'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import StepBar from '../../../components/StepBar'
import { checkInVisit, getVisitHistory, saveGpsSnapshot } from '../../../services/visit'

import { discardVisit } from '../../../services/observation'

export default function VisitCheckin() {
  const navigation    = useNavigation()
  const visitContext  = useVisit()
  const currentSchool = visitContext?.currentSchool
  const { setVisitId, setLastScreen, lastScreen } = visitContext

  const [location,    setLocation]    = useState<{ latitude: number; longitude: number } | null>(null)
  const [accuracy,    setAccuracy]    = useState<number | null>(null)
  const [timestamp,   setTimestamp]   = useState('')
  const [gpsLoading,  setGpsLoading]  = useState(false)

  const [locationName,   setLocationName]   = useState<string | null>(null)
  const [geocodeLoading, setGeocodeLoading] = useState(false)

  const [checkInLoading,   setCheckInLoading]   = useState(false)
  const [discardLoading,   setDiscardLoading]   = useState(false)
  const [activeVisitCheck, setActiveVisitCheck] = useState(true)

  const [activeVisit, setActiveVisit] = useState<{
  id: string | number
  created_at?: string
  school_id?: string | number
  _resumeStatus?: 'ongoing' | 'incomplete'  // ← ADD THIS
} | null>(null)

  // ── DO NOT call setLastScreen here.
  //
  // VisitCheckin is the entry point of the visit flow. The `lastScreen` in
  // context already holds wherever the user stopped (visitForm, ClassObservation,
  // etc.). If we overwrite it with { name: 'VisitCheckin' } on mount, we lose
  // that saved position and "Start where you left" will always fall back to
  // step 2 instead of the real last step.
  //
  // Every screen AFTER step 1 should call setLastScreen on mount — not this one.

  // ── Android permission ───────────────────────────────────────────────────
  const requestAndroidPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title:          'Location Permission',
        message:        'Visit Check-in needs your GPS location.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    )
    return result === PermissionsAndroid.RESULTS.GRANTED
  }

  // ── Reverse geocode ──────────────────────────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocodeLoading(true)
    setLocationName(null)
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      const res  = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'FieldMonitoringApp/1.0' },
      })
      const data = await res.json()
      if (data?.address) {
        const a = data.address
        const line1 = a.amenity || a.building || a.road || a.neighbourhood || a.suburb || ''
        const line2 = [
          a.city || a.town || a.village || a.county || '',
          a.state || '',
        ].filter(Boolean).join(', ')
        setLocationName([line1, line2].filter(Boolean).join('\n') || data.display_name)
      }
    } catch {
      setLocationName(null)
    } finally {
      setGeocodeLoading(false)
    }
  }

  // ── Fetch GPS ────────────────────────────────────────────────────────────
  const getLocation = useCallback(async () => {
    setGpsLoading(true)
    setLocationName(null)
    const granted = await requestAndroidPermission()
    if (!granted) {
      Alert.alert('Permission Denied', 'Location permission is required to check in.')
      setGpsLoading(false)
      return
    }
    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy: acc } = pos.coords
        setLocation({ latitude, longitude })
        setAccuracy(acc ?? null)
        setTimestamp(new Date().toLocaleString())
        setGpsLoading(false)
        reverseGeocode(latitude, longitude)
      },
      () => {
        Alert.alert('GPS Error', 'Unable to fetch location. Tap Recalibrate to retry.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

const checkForActiveVisit = useCallback(async () => {
  if (!currentSchool?.id) { setActiveVisitCheck(false); return }
  setActiveVisitCheck(true)

  // Try 'ongoing' first, then 'incomplete'
  let foundVisit = null
  let foundStatus: 'ongoing' | 'incomplete' | null = null

  const ongoingRes = await getVisitHistory({ status: 'ongoing', school_id: currentSchool.id })
  if (ongoingRes.success && ongoingRes.data?.length > 0) {
    foundVisit = ongoingRes.data[0]
    foundStatus = 'ongoing'
  } else {
    const incompleteRes = await getVisitHistory({ status: 'incomplete', school_id: currentSchool.id })
    if (incompleteRes.success && incompleteRes.data?.length > 0) {
      foundVisit = incompleteRes.data[0]
      foundStatus = 'incomplete'
    }
  }

  if (foundVisit) {
    setActiveVisit({ ...foundVisit, _resumeStatus: foundStatus }) // store status for routing
    setVisitId(String(foundVisit.id))
  } else {
    setActiveVisit(null)
  }

  setActiveVisitCheck(false)
}, [currentSchool?.id])

  useEffect(() => {
    getLocation()
    checkForActiveVisit()
  }, [])

  // ── GPS Snapshot helpers (from Code 1) ───────────────────────────────────
  const getTimeSlot = (): '9am' | '11am' | '1pm' | '3pm' | '5pm' => {
    const hour = new Date().getHours()
    if (hour < 10) return '9am'
    if (hour < 12) return '11am'
    if (hour < 14) return '1pm'
    if (hour < 16) return '3pm'
    return '5pm'
  }

  /**
   * Saves a GPS snapshot for the given visitId.
   * Called right after a new check-in OR after the user resumes an existing visit.
   */
  const saveSnapshot = async (
    visitId: string | number,
    lat: number,
    lng: number,
    acc?: number,
  ) => {
    try {
      const slot = getTimeSlot()
      const res  = await saveGpsSnapshot(visitId, slot, lat, lng, acc ?? undefined)
      if (res.success) {
        console.log('✅ GPS Snapshot saved for slot:', slot)
      } else {
        console.warn('⚠️ GPS Snapshot not saved:', res.message)
      }
    } catch (e) {
      console.error('❌ Snapshot error', e)
    }
  }

  // ── Continue from last screen ────────────────────────────────────────────
  const handleContinue = async () => {
  if (!activeVisit?.id) return
  setVisitId(String(activeVisit.id))

  if (location) {
    await saveSnapshot(
      activeVisit.id,
      location.latitude,
      location.longitude,
      accuracy ?? undefined,
    )
  }

  // ── If status is 'incomplete' → always go straight to VisitChecklist ──
  if (activeVisit._resumeStatus === 'incomplete') {
    navigation.navigate('VisitChecklist' as never, { visitId: activeVisit.id } as never)
    return
  }

  // ── If status is 'ongoing' → resume last screen ──
  const hasResumable =
    lastScreen?.name &&
    lastScreen.name !== 'VisitCheckin' &&
    lastScreen.params?.visitId &&
    String(lastScreen.params.visitId) === String(activeVisit.id)

  if (hasResumable) {
    navigation.navigate(
      lastScreen!.name as never,
      (lastScreen!.params ?? {}) as never,
    )
  } else {
    navigation.navigate('visitForm' as never, { visitId: activeVisit.id } as never)
  }
}

  // ── Discard visit (calls DELETE /rp/visits/:id/discard) ─────────────────
  const handleDiscard = () => {
    if (!activeVisit?.id) return
    Alert.alert(
      'Discard Visit',
      'This will permanently delete the unfinished visit. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setDiscardLoading(true)
            const res = await discardVisit(activeVisit.id)
            setDiscardLoading(false)

            if (!res.success) {
              Alert.alert('Discard Failed', res.message || 'Could not discard the visit. Please try again.')
              return
            }

            // Reset state after successful discard
            setActiveVisit(null)
            setVisitId(null)
            setLastScreen(null)
          },
        },
      ],
    )
  }

  // ── Check In & Proceed (no active visit) ────────────────────────────────
  const handleCheckIn = async () => {
    if (!location)          { Alert.alert('No Location', 'GPS location is not available yet.'); return }
    if (!currentSchool?.id) { Alert.alert('No School',   'School information is missing.');     return }

    setTimestamp(new Date().toLocaleString())   // ← capture at button press, not GPS fetch

    setCheckInLoading(true)
    const res = await checkInVisit(currentSchool.id, location.latitude, location.longitude)
    setCheckInLoading(false)

    if (!res.success) { Alert.alert('Check-in Failed', res.message); return }

    const newVisitId = res.data?.id
    setVisitId(String(newVisitId))

    // ✅ Save snapshot immediately after successful check-in
    await saveSnapshot(
      newVisitId,
      location.latitude,
      location.longitude,
      accuracy ?? undefined,
    )

    navigation.navigate('visitForm' as never, { visitId: newVisitId } as never)
  }

  // ── Leaflet HTML ─────────────────────────────────────────────────────────
  const getLeafletHTML = (lat: number, lng: number) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>* { margin:0; padding:0; box-sizing:border-box; } html,body,#map { width:100%; height:100%; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          L.circleMarker([${lat},${lng}],{radius:10,color:'#F97316',fillColor:'#F97316',fillOpacity:0.9,weight:2}).addTo(map);
          L.circle([${lat},${lng}],{radius:50,color:'#F97316',fillColor:'#FFF7ED',fillOpacity:0.3,weight:1}).addTo(map);
        </script>
      </body>
    </html>
  `

  const isLoading = gpsLoading || checkInLoading || discardLoading

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Visit Check-in" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <StepBar current={1} />

        <View style={{ marginHorizontal: -20, marginBottom: 18, paddingHorizontal: 5 }}>
          <SchoolBanner />
        </View>

        {/* ── Map card ── */}
        <View style={s.mapCard}>
          {gpsLoading ? (
            <View style={s.mapPlaceholder}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={s.mapLoadingText}>Fetching GPS location...</Text>
            </View>
          ) : location ? (
            <WebView
              style={s.mapImage}
              source={{ html: getLeafletHTML(location.latitude, location.longitude) }}
              scrollEnabled={false}
              pointerEvents="none"
            />
          ) : (
            <View style={s.mapPlaceholder}>
              <Ionicons name="map-outline" size={40} color="#D1D5DB" />
              <Text style={s.mapLoadingText}>Waiting for GPS signal...</Text>
            </View>
          )}

          {location && (
            <View style={s.locationNameRow}>
              <Ionicons name="location" size={16} color="#F97316" style={{ marginTop: 1 }} />
              {geocodeLoading ? (
                <View style={s.locationNameLoading}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={s.locationNameLoadingText}>Identifying location...</Text>
                </View>
              ) : locationName ? (
                <Text style={s.locationNameText}>{locationName}</Text>
              ) : (
                <Text style={s.locationNameFallback}>Location name unavailable</Text>
              )}
            </View>
          )}

          <View style={s.coordinateRow}>
            <View style={s.coordBlock}>
              <Text style={s.coordTitle}>Coordinates</Text>
              <Text style={s.coordValue}>
                {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Fetching GPS...'}
              </Text>
            </View>
            <View style={s.coordDivider} />
            <View style={s.coordBlock}>
              <Text style={s.coordTitle}>Accuracy</Text>
              <Text style={s.accuracyValue}>{accuracy ? `± ${accuracy.toFixed(1)} m` : '--'}</Text>
            </View>
          </View>

          <View style={[s.gpsBanner, !location && s.gpsBannerPending]}>
            <Ionicons name={location ? 'checkmark-circle' : 'time-outline'} size={18} color="#fff" />
            <Text style={s.gpsText}>{location ? 'GPS LOCATION CAPTURED' : 'WAITING FOR GPS...'}</Text>
          </View>
        </View>

        {/* ── Timestamp card ── */}
        <View style={s.timeCard}>
          <View style={s.timeIconWrap}>
            <Ionicons name="time-outline" size={22} color="#F97316" />
          </View>
          <View>
            <Text style={s.timeTitle}>Check-in Timestamp</Text>
            <Text style={s.timeValue}>{timestamp || 'Fetching...'}</Text>
          </View>
        </View>

        {/* ── Body: loading / active visit / check-in ── */}
        {activeVisitCheck ? (
          <View style={s.activeVisitLoading}>
            <ActivityIndicator size="small" color="#F97316" />
            <Text style={s.activeVisitLoadingText}>Checking for active visits...</Text>
          </View>

        ) : activeVisit ? (
          <View style={s.activeVisitCard}>
            {/* Header row */}
            <View style={s.activeVisitHeader}>
              <View style={s.activeVisitIconWrap}>
                <Ionicons name="reload-circle" size={20} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activeVisitTitle}>Unfinished Visit Found</Text>
                <Text style={s.activeVisitSub}>
                  Visit #{activeVisit.id}
                  {activeVisit.created_at
                    ? `  ·  ${new Date(activeVisit.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}`
                    : ''}
                </Text>
              </View>
              {/* Status pill */}
              <View style={s.ongoingPill}>
                <View style={s.ongoingDot} />
                <Text style={s.ongoingPillText}>Ongoing</Text>
              </View>
            </View>

            <View style={s.activeVisitDivider} />

            <Text style={s.activeVisitHint}>
              Continue from where you left off, or permanently discard this visit to start fresh.
            </Text>

            {/* Action buttons */}
            <View style={s.activeVisitBtnRow}>
              <TouchableOpacity
                style={s.continueBtn}
                onPress={handleContinue}
                activeOpacity={0.85}
                disabled={discardLoading}
              >
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={s.continueBtnText}>Resume Visit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.discardBtn, discardLoading && s.discardBtnDisabled]}
                onPress={handleDiscard}
                disabled={discardLoading}
                activeOpacity={0.85}
              >
                {discardLoading ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={s.discardBtnText}>Discard</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Discard warning note */}
            <View style={s.discardWarning}>
              <Ionicons name="warning-outline" size={13} color="#B45309" />
              <Text style={s.discardWarningText}>Discarding is permanent and cannot be undone.</Text>
            </View>
          </View>

        ) : (
          <TouchableOpacity
            style={[s.proceedBtn, (!location || isLoading) && s.proceedBtnDisabled]}
            onPress={handleCheckIn}
            disabled={!location || isLoading}
            activeOpacity={0.85}
          >
            {checkInLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={s.proceedText}>Check In & Proceed</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Recalibrate ── */}
        <TouchableOpacity
          onPress={getLocation}
          style={s.recalBtn}
          activeOpacity={0.6}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <View style={s.recalInner}>
              <Ionicons name="refresh-outline" size={16} color="#6B7280" />
              <Text style={s.recalText}>Recalibrate GPS</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },

  // ── Map ──
  mapCard:        { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  mapImage:       { height: 200, width: '100%', backgroundColor: '#F3F4F6' },
  mapPlaceholder: { height: 200, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapLoadingText: { fontSize: 13, color: '#9CA3AF' },

  locationNameRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF7ED', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#FED7AA' },
  locationNameLoading:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationNameLoadingText: { fontSize: 12, color: '#F97316', fontStyle: 'italic' },
  locationNameText:        { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400E', lineHeight: 20 },
  locationNameFallback:    { flex: 1, fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },

  coordinateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  coordBlock:    { flex: 1 },
  coordDivider:  { width: 1, height: 36, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  coordTitle:    { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  coordValue:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  accuracyValue: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  gpsBanner:        { backgroundColor: '#22C55E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 8 },
  gpsBannerPending: { backgroundColor: '#9CA3AF' },
  gpsText:          { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // ── Timestamp ──
  timeCard:     { backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, gap: 14 },
  timeIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  timeTitle:    { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  timeValue:    { fontSize: 15, fontWeight: '700', color: '#111827' },

  // ── Active visit loading ──
  activeVisitLoading:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 12 },
  activeVisitLoadingText: { fontSize: 13, color: '#F97316' },

  // ── Active visit card ──
  activeVisitCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#FED7AA', elevation: 2, shadowColor: '#F97316', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  activeVisitHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  activeVisitIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  activeVisitTitle:    { fontSize: 14, fontWeight: '700', color: '#92400E' },
  activeVisitSub:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  activeVisitDivider:  { height: 1, backgroundColor: '#FEF3C7', marginBottom: 12 },
  activeVisitHint:     { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 14 },
  activeVisitBtnRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },

  // Ongoing pill
  ongoingPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#A7F3D0' },
  ongoingDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  ongoingPillText: { fontSize: 10, fontWeight: '700', color: '#065F46', letterSpacing: 0.3 },

  // Continue button
  continueBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, backgroundColor: '#F97316', elevation: 2, shadowColor: '#F97316', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  continueBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Discard button
  discardBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  discardBtnDisabled: { opacity: 0.5 },
  discardBtnText:     { fontSize: 13, fontWeight: '700', color: '#DC2626' },

  // Discard warning note
  discardWarning:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#FDE68A' },
  discardWarningText: { fontSize: 11, color: '#B45309', fontWeight: '500', flex: 1 },

  // ── Proceed button ──
  proceedBtn:         { backgroundColor: '#F97316', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12, elevation: 3, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  proceedBtnDisabled: { backgroundColor: '#FDBA74', elevation: 0, shadowOpacity: 0 },
  proceedText:        { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Recalibrate ──
  recalBtn:   { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  recalInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recalText:  { textAlign: 'center', color: '#6B7280', fontSize: 14, fontWeight: '500' },
})