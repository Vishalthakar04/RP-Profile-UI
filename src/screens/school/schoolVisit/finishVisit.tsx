// screens/visit/FinishVisit.tsx
import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Geolocation from 'react-native-geolocation-service'
import { useVisit } from '../../../context/VisitContext'
import Ionicons from 'react-native-vector-icons/Ionicons'
import SchoolBanner from '../../../components/SchoolBanner'
import AppHeader from '../../../components/AppHeader'
import StepBar from '../../../components/StepBar'
import { WebView } from 'react-native-webview'
import { checkOutVisit } from '../../../services/visit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '--:-- --'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function calcDuration(checkIn: Date | string | null | undefined, checkOut: Date): string {
  if (!checkIn) return '--'
  const start  = typeof checkIn === 'string' ? new Date(checkIn) : checkIn
  const diffMs = checkOut.getTime() - start.getTime()
  if (diffMs <= 0) return '--'
  const totalMins = Math.floor(diffMs / 60000)
  const hrs  = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs === 0) return `${mins}m`
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  )
  return result === PermissionsAndroid.RESULTS.GRANTED
}

const getLeafletHTML = (lat: number, lng: number) => `
  <!DOCTYPE html><html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}</style>
  </head>
  <body><div id="map"></div>
  <script>
    const map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.circleMarker([${lat},${lng}],{radius:10,color:'#F97316',fillColor:'#F97316',fillOpacity:0.9,weight:2}).addTo(map);
    L.circle([${lat},${lng}],{radius:50,color:'#F97316',fillColor:'#FFF7ED',fillOpacity:0.3,weight:1}).addTo(map);
  </script></body></html>
`

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FinishVisit() {
  const navigation   = useNavigation()
  const route        = useRoute()
  const { visitId: contextVisitId, clearVisit } = useVisit()

  // FIX: read from route params first, fall back to context
  // Both hold the same value — context is the safety net if params are missing
  const { visitId: routeVisitId } = (route.params ?? {}) as { visitId?: string | number }
  const visitId = routeVisitId ?? contextVisitId

  // ── GPS for checkout ──────────────────────────────────────────────────────
  const [checkoutLocation, setCheckoutLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading]             = useState(true)
  const [gpsError,   setGpsError]               = useState(false)

  // ── Checkout API state ────────────────────────────────────────────────────
  const [submitting,    setSubmitting]    = useState(false)
  const [modalVisible,  setModalVisible]  = useState(false)
  const [checkoutTime,  setCheckoutTime]  = useState<Date | null>(null)

  // ── Fetch GPS on mount ────────────────────────────────────────────────────
  const fetchGPS = useCallback(async () => {
    setGpsLoading(true)
    setGpsError(false)
    const granted = await requestLocationPermission()
    if (!granted) {
      Alert.alert('Permission Denied', 'Location permission is required to check out.')
      setGpsLoading(false)
      setGpsError(true)
      return
    }
    Geolocation.getCurrentPosition(
      pos => {
        setCheckoutLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        setGpsError(true)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => { fetchGPS() }, [fetchGPS])

  // ── Submit / Checkout ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!visitId) {
      Alert.alert('Error', 'Visit ID is missing. Please restart the visit.')
      return
    }
    if (!checkoutLocation) {
      Alert.alert('GPS Required', 'Please wait for GPS to be captured before checking out.')
      return
    }

    setSubmitting(true)
    const now = new Date()

    const res = await checkOutVisit(visitId, checkoutLocation.lat, checkoutLocation.lng)

    setSubmitting(false)

    if (!res.success) {
      // Already completed — treat as success, visit was already closed
      if (res.message?.toLowerCase().includes('already completed')) {
        clearVisit()   // wipe context so next check-in creates a fresh visit
        setCheckoutTime(now)
        setModalVisible(true)
        return
      }
      Alert.alert('Checkout Failed', res.message || 'Something went wrong. Please try again.')
      return
    }

    clearVisit()       // wipe visitId + currentSchool from context
    setCheckoutTime(now)
    setModalVisible(true)
  }

  // ── Navigate to dashboard after success ───────────────────────────────────
  const goDashboard = () => {
    setModalVisible(false)
    setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' as never }] })
    }, 200)
  }

  const now            = checkoutTime ?? new Date()
  const duration       = calcDuration(null, now)
  const checkOutLabel  = checkoutTime ? formatTime(checkoutTime) : formatTime(new Date())
  const checkInLabel   = '--:-- --'  // check_in_time not passed — shown after checkout API response
  const gpsReady       = !!checkoutLocation && !gpsLoading

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppHeader title="Finish Visit" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <StepBar current={6} />
        <SchoolBanner />

        {/* ── Map card ── */}
        <View style={s.mapCard}>
          <View style={s.mapHeader}>
            <Ionicons name="location" size={20} color="#F97316" />
            <Text style={s.mapTitle}>Checkout Location</Text>
            {gpsLoading && <ActivityIndicator size="small" color="#F97316" style={{ marginLeft: 8 }} />}
            {!gpsLoading && gpsReady && (
              <View style={s.gpsPill}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={s.gpsPillText}>GPS READY</Text>
              </View>
            )}
            {!gpsLoading && gpsError && (
              <TouchableOpacity style={s.retryGpsBtn} onPress={fetchGPS}>
                <Ionicons name="refresh-outline" size={13} color="#DC2626" />
                <Text style={s.retryGpsBtnText}>Retry GPS</Text>
              </TouchableOpacity>
            )}
          </View>

          {gpsLoading ? (
            <View style={s.mapPlaceholder}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={s.mapPlaceholderText}>Fetching GPS for checkout...</Text>
            </View>
          ) : checkoutLocation ? (
            <WebView
              style={s.mapImage}
              source={{ html: getLeafletHTML(checkoutLocation.lat, checkoutLocation.lng) }}
              scrollEnabled={false}
              pointerEvents="none"
            />
          ) : (
            <View style={s.mapPlaceholder}>
              <Ionicons name="map-outline" size={40} color="#D1D5DB" />
              <Text style={s.mapPlaceholderText}>GPS unavailable. Tap Retry GPS above.</Text>
            </View>
          )}
        </View>

        {/* ── Visit Summary ── */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Visit Summary</Text>

          <View style={s.summaryRow}>
            <View style={s.summaryLeft}>
              <View style={s.summaryIconBox}><Ionicons name="enter-outline" size={18} color="#F97316" /></View>
              <Text style={s.summaryLabel}>Check-in Time</Text>
            </View>
            <Text style={s.summaryValue}>{checkInLabel}</Text>
          </View>

          <View style={s.rowDivider} />

          <View style={s.summaryRow}>
            <View style={s.summaryLeft}>
              <View style={s.summaryIconBox}><Ionicons name="exit-outline" size={18} color="#F97316" /></View>
              <Text style={s.summaryLabel}>Check-out Time</Text>
            </View>
            <Text style={s.summaryValue}>{checkOutLabel}</Text>
          </View>

          <View style={s.rowDivider} />

          <View style={s.summaryRow}>
            <View style={s.summaryLeft}>
              <View style={s.summaryIconBox}><Ionicons name="time-outline" size={18} color="#F97316" /></View>
              <Text style={s.summaryLabel}>Total Duration</Text>
            </View>
            <Text style={s.summaryDuration}>{duration}</Text>
          </View>
        </View>

        {/* ── Status indicators ── */}
        <View style={[s.statusCard, gpsReady ? s.statusCardGreen : s.statusCardGray]}>
          <Ionicons name={gpsReady ? 'checkmark-circle' : 'time-outline'} size={20} color={gpsReady ? '#16A34A' : '#9CA3AF'} />
          <Text style={[s.statusText, { color: gpsReady ? '#16A34A' : '#9CA3AF' }]}>
            {gpsReady ? 'GPS Signal Captured' : 'Waiting for GPS...'}
          </Text>
        </View>

        <View style={[s.statusCard, s.statusCardGreen]}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text style={[s.statusText, { color: '#16A34A' }]}>Duration will be recorded on submit</Text>
        </View>

        {/* ── Submit button ── */}
        <TouchableOpacity
          style={[s.submitBtn, (!gpsReady || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!gpsReady || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Text style={[s.submitText, !gpsReady && { color: '#9CA3AF' }]}>
                  {gpsReady ? 'Confirm & Submit Visit' : 'Waiting for GPS...'}
                </Text>
                <Ionicons name="cloud-upload-outline" size={18} color={gpsReady ? '#fff' : '#9CA3AF'} style={{ marginLeft: 8 }} />
              </>
            )
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <Text style={s.cancelText}>Cancel and Review</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Success Modal ── */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => {}}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
            </View>
            <Text style={s.modalTitle}>Visit Submitted Successfully</Text>
            <Text style={s.modalSub}>
              Your visit has been recorded and submitted successfully.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={goDashboard} activeOpacity={0.85}>
              <Ionicons name="home-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.modalBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  mapCard: { backgroundColor: '#fff', margin: 16, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  mapHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  mapTitle: { fontWeight: '600', fontSize: 15, color: '#111827', flex: 1 },
  mapImage: { height: 180, width: '100%', backgroundColor: '#F3F4F6' },
  mapPlaceholder: { height: 180, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapPlaceholderText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },

  gpsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  gpsPillText: { fontSize: 9, fontWeight: '700', color: '#16A34A', letterSpacing: 0.3 },
  retryGpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  retryGpsBtnText: { fontSize: 11, fontWeight: '600', color: '#DC2626' },

  summaryCard: { backgroundColor: '#fff', marginHorizontal: 16, padding: 18, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  summaryTitle: { fontWeight: '800', fontSize: 18, color: '#111827', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { color: '#6B7280', fontSize: 14 },
  summaryValue: { fontWeight: '700', fontSize: 14, color: '#111827' },
  summaryDuration: { fontWeight: '800', fontSize: 16, color: '#F97316' },
  rowDivider: { height: 1, backgroundColor: '#F3F4F6' },

  statusCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 14, borderRadius: 12, marginTop: 8, gap: 10 },
  statusCardGreen: { backgroundColor: '#DCFCE7' },
  statusCardGray:  { backgroundColor: '#F3F4F6' },
  statusText: { fontWeight: '600', fontSize: 14 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', margin: 16, padding: 16, borderRadius: 14, elevation: 2, shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  submitBtnDisabled: { backgroundColor: '#E5E7EB', elevation: 0, shadowOpacity: 0 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center', width: '80%', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  modalIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginTop: 10, textAlign: 'center', color: '#111827' },
  modalSub: { color: '#6B7280', marginTop: 6, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', padding: 14, borderRadius: 12, marginTop: 20, width: '100%' },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})