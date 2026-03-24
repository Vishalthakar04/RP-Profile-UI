import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../../components/AppHeader';

import {
  getAssignedSchools,
  createVisitSchedule,
} from '../../../services/schedulevisit';

const AddVisit = ({ navigation, route }: any) => {

  const editData = route?.params?.editData;

  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  const [date, setDate] = useState('');
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(30);
  const [period, setPeriod] = useState('AM');

  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ SET TODAY DATE
  useEffect(() => {
    const today = new Date();
    const formatted =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    setDate(formatted);
  }, []);

  // ✅ LOAD SCHOOLS
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await getAssignedSchools();
        setSchools(res?.data || []);
      } catch (e) {
        Alert.alert("Error", "Failed to load schools");
      }
    };
    loadSchools();
  }, []);

  // ✅ EDIT MODE
  useEffect(() => {
    if (editData && schools.length > 0) {

      const school = schools.find(
        (s) => s._id === editData.schoolId || s._id === editData.school?._id
      );

      if (school) setSelectedSchool(school);

      setDate(editData.date || '');

      if (editData.time) {
        const [time, p] = editData.time.split(' ');
        const [h, m] = time.split(':');

        setHour(Number(h));
        setMinute(Number(m));
        setPeriod(p || 'AM');
      }

      setRemarks(editData.remarks || '');
    }
  }, [editData, schools]);

  // ✅ SAVE
  const handleSave = async () => {
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select school');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        schoolId: selectedSchool._id,
        date,
        time: `${hour}:${minute < 10 ? '0' + minute : minute} ${period}`,
        remarks,
      };

      const res = await createVisitSchedule(payload);

      if (res?.success) {
        Alert.alert('Success', 'Visit Scheduled Successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed');
      }

    } catch (error) {
      Alert.alert('Error', 'API failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <AppHeader title={editData ? "Edit Visit" : "Add New Visit"} showBack />

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* SCHOOL */}
        <Text style={styles.label}>School Name</Text>

        <View style={styles.inputBox}>
          <Ionicons name="search-outline" size={18} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {schools.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[
                  styles.schoolItem,
                  selectedSchool?._id === item._id && styles.selectedSchool,
                ]}
                onPress={() => setSelectedSchool(item)}
              >
                <Text
                  style={
                    selectedSchool?._id === item._id
                      ? styles.selectedText
                      : styles.schoolText
                  }
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* DATE */}
        <Text style={styles.label}>Visit Date</Text>
        <View style={styles.dateBox}>
          <Text style={{ fontWeight: '700' }}>{date}</Text>
        </View>

        {/* TIME */}
        <Text style={styles.label}>Visit Time</Text>

        <View style={styles.timeBox}>

          {/* HOUR */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>HOUR</Text>

            <TouchableOpacity onPress={() => setHour(h => Math.min(h + 1, 12))}>
              <Ionicons name="chevron-up" size={20} />
            </TouchableOpacity>

            <Text style={styles.timeValue}>{hour}</Text>

            <TouchableOpacity onPress={() => setHour(h => Math.max(h - 1, 1))}>
              <Ionicons name="chevron-down" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.timeColon}>:</Text>

          {/* MIN */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>MIN</Text>

            <TouchableOpacity onPress={() => setMinute(m => Math.min(m + 1, 59))}>
              <Ionicons name="chevron-up" size={20} />
            </TouchableOpacity>

            <Text style={styles.timeValue}>
              {minute < 10 ? `0${minute}` : minute}
            </Text>

            <TouchableOpacity onPress={() => setMinute(m => Math.max(m - 1, 0))}>
              <Ionicons name="chevron-down" size={20} />
            </TouchableOpacity>
          </View>

          {/* AM PM */}
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={period === 'AM' ? styles.activeBtn : styles.inactiveBtn}
              onPress={() => setPeriod('AM')}
            >
              <Text>AM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={period === 'PM' ? styles.activeBtn : styles.inactiveBtn}
              onPress={() => setPeriod('PM')}
            >
              <Text>PM</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* REMARKS */}
        <Text style={styles.label}>Remarks</Text>

        <TextInput
          style={styles.textArea}
          placeholder="Add notes..."
          multiline
          value={remarks}
          onChangeText={setRemarks}
        />

        {/* BUTTONS */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {editData ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default AddVisit;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scrollContainer: { padding: 15 },

  label: { fontWeight: '600', marginTop: 15 },

  inputBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },

  schoolItem: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginRight: 8,
  },

  selectedSchool: { backgroundColor: '#FF7A00' },
  schoolText: { fontSize: 12 },
  selectedText: { color: '#fff' },

  dateBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
  },

  timeBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  timeColumn: { alignItems: 'center' },

  // ✅ FIXED (THIS WAS MISSING)
  timeLabel: {
    fontSize: 10,
    color: '#777',
  },

  timeValue: {
    fontSize: 22,
    fontWeight: '700',
  },

  // ✅ FIXED
  timeColon: {
    fontSize: 20,
    marginHorizontal: 10,
  },

  periodContainer: { marginLeft: 20 },

  activeBtn: {
    backgroundColor: '#FF7A00',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },

  inactiveBtn: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },

  textArea: {
    backgroundColor: '#fff',
    height: 100,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },

  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },

  saveBtn: {
    flex: 2,
    backgroundColor: '#FF7A00',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
});