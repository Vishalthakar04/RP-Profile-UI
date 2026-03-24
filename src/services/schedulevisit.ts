import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// 🔥 ADD INTERCEPTOR
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ APIs

export const getAssignedSchools = async () => {
  const res = await api.get('/schools');
  return res.data;
};

export const createVisitSchedule = async (payload: any) => {
  const res = await api.post('/visit/schedule', payload);
  return res.data;
};

export const getVisitSchedules = async (page = 1, limit = 4) => {
  const res = await api.get(`/visit/schedules?page=${page}&limit=${limit}`);
  return res.data;
};

export const deleteVisitSchedule = async (id: string) => {
  const res = await api.delete(`/visit/schedule/${id}`);
  return res.data;
};

export const getUpcomingVisits = async () => {
  const res = await api.get('/visit/upcoming');
  return res.data;
};