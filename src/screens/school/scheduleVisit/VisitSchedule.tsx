import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// ✅ AXIOS API FILE (IMPORTANT)
import {
  getVisitSchedules,
  getUpcomingVisits,
  deleteVisitSchedule,
} from '../../../services/schedulevisit';

const VisitSchedule = () => {

  const navigation = useNavigation<any>();

  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 🔥 LOAD DATA
  const loadData = async () => {
    try {
      setLoading(true);

      const upcomingRes = await getUpcomingVisits();
      const scheduleRes = await getVisitSchedules(page, 4);

      setUpcoming(upcomingRes?.data || []);
      setAllVisits(scheduleRes?.data || []);

    } catch (error: any) {
      console.log('API Error:', error?.response || error);

      if (error?.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again");
        navigation.navigate('Login');
      } else {
        Alert.alert("Error", "Failed to load visit data");
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  // 🔥 DELETE FUNCTION
  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete",
      "Are you sure you want to delete this visit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteVisitSchedule(id);

              if (res?.success) {
                loadData();
              } else {
                Alert.alert("Error", res?.message || "Delete failed");
              }

            } catch (error) {
              Alert.alert("Error", "Delete API failed");
            }
          },
        },
      ]
    );
  };

  // 🔥 CARD UI
  const renderCard = (item: any) => (
    <View
      key={item._id}
      style={[
        styles.card,
        { borderLeftColor: item.status === 'Today' ? 'green' : '#3A57E8' },
      ]}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.id}>ID: {item.visitId || item.id || "-"}</Text>
        <Text style={item.status === 'Today' ? styles.today : styles.upcoming}>
          {item.status || 'Upcoming'}
        </Text>
      </View>

      <Text style={styles.school}>{item.schoolName || "N/A"}</Text>

      <Text style={styles.info}>
        📅 {item.date || "-"} • {item.time || "-"}
      </Text>

      <Text style={styles.info}>
        📍 {item.location || "-"}
      </Text>

      <TouchableOpacity style={styles.btn}>
        <Text style={{ fontWeight: '600' }}>View Details →</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={22} color="#FF7A00" />
          <Text style={styles.headerTitle}>Visit Schedule</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddVisit')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addText}> Add Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* LOADING */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >

          {/* FILTER */}
          <View style={styles.filterContainer}>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>Date Range</Text>
              <Ionicons name="chevron-down" size={14} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>School</Text>
              <Ionicons name="chevron-down" size={14} />
            </TouchableOpacity>
          </View>

          {/* UPCOMING */}
          <Text style={styles.section}>
            Upcoming Visits <Text style={styles.sub}>(Next 30 Days)</Text>
          </Text>

          {upcoming.length === 0 ? (
            <Text style={styles.empty}>No Upcoming Visits</Text>
          ) : (
            upcoming.map(renderCard)
          )}

          {/* TABLE */}
          <Text style={styles.section}>All Scheduled Visits</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.th}>DATE</Text>
              <Text style={styles.th}>SCHOOL</Text>
              <Text style={styles.th}>ACTIONS</Text>
            </View>

            {allVisits.length === 0 ? (
              <Text style={styles.empty}>No Visits Found</Text>
            ) : (
              allVisits.map((item: any) => (
                <View key={item._id} style={styles.tr}>

                  <Text style={styles.td}>{item.date || "-"}</Text>

                  <Text style={styles.td}>{item.schoolName || "-"}</Text>

                  <View style={styles.actionContainer}>

                    {/* EDIT */}
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() =>
                        navigation.navigate('AddVisit', { editData: item })
                      }
                    >
                      <Ionicons name="create-outline" size={16} color="#fff" />
                    </TouchableOpacity>

                    {/* DELETE */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item._id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                    </TouchableOpacity>

                  </View>

                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}

      {/* NAVBAR */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={22} color="#888" />
          <Text style={styles.navText}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Ionicons name="calendar" size={22} color="#FF7A00" />
          <Text style={styles.navTextActive}>VISITS</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Schools')}>
          <Ionicons name="school-outline" size={22} color="#888" />
          <Text style={styles.navText}>SCHOOLS</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={22} color="#888" />
          <Text style={styles.navText}>PROFILE</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

export default VisitSchedule;

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 10,
    zIndex: 1000,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },

  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF7A00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },

  addText: { color: '#fff', fontWeight: '600' },

  filterContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 15,
    marginTop: 15,
  },

  filterPill: {
    flexDirection: 'row',
    backgroundColor: '#FFE8D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },

  filterPillText: {
    color: '#FF7A00',
    fontWeight: '600',
    marginRight: 5,
  },

  section: {
    marginHorizontal: 15,
    fontWeight: '700',
    marginVertical: 10,
  },

  sub: { color: '#777', fontSize: 12 },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  id: { color: '#FF7A00', fontSize: 12 },

  today: { color: 'green' },

  upcoming: { color: '#3A57E8' },

  school: { fontWeight: '700', marginVertical: 5 },

  info: { fontSize: 12, color: '#666' },

  btn: {
    marginTop: 10,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  table: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 10,
  },

  th: { flex: 1, fontSize: 12, fontWeight: '700' },

  tr: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },

  td: { flex: 1, fontSize: 12 },

  actionContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },

  editBtn: {
    backgroundColor: '#3A57E8',
    padding: 6,
    borderRadius: 6,
  },

  deleteBtn: {
    backgroundColor: 'red',
    padding: 6,
    borderRadius: 6,
  },

  empty: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },

  navbar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  navText: { fontSize: 10, color: '#888' },

  navTextActive: { fontSize: 10, color: '#FF7A00' },
});