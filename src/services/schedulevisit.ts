// services/schedulevisit.ts

import axios from 'axios'

const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

// Optional: create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// ─────────────────────────────────────────────
// ✅ 1. Get All Assigned Schools
// GET /schools
// ─────────────────────────────────────────────
export const getAssignedSchools = async () => {
  try {
    const res = await api.get('/schools')
    return res.data
  } catch (error: any) {
    console.error('Error fetching schools:', error?.response?.data || error.message)
    throw error
  }
}

// ─────────────────────────────────────────────
// ✅ 2. Create Visit Schedule
// POST /visit/schedule
// ─────────────────────────────────────────────
export const createVisitSchedule = async (payload: any) => {
  try {
    const res = await api.post('/visit/schedule', payload)
    return res.data
  } catch (error: any) {
    console.error('Error creating schedule:', error?.response?.data || error.message)
    throw error
  }
}

// ─────────────────────────────────────────────
// ✅ 3. Get Visit Schedules (Pagination)
// GET /visit/schedules?page=1&limit=4
// ─────────────────────────────────────────────
export const getVisitSchedules = async (page = 1, limit = 4) => {
  try {
    const res = await api.get(`/visit/schedules?page=${page}&limit=${limit}`)
    return res.data
  } catch (error: any) {
    console.error('Error fetching schedules:', error?.response?.data || error.message)
    throw error
  }
}

// ─────────────────────────────────────────────
// ✅ 4. Update Visit Schedule
// PUT /visit/schedule/:id
// ─────────────────────────────────────────────
export const updateVisitSchedule = async (id: string, payload: any) => {
  try {
    const res = await api.put(`/visit/schedule/${id}`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error updating schedule:', error?.response?.data || error.message)
    throw error
  }
}

// ─────────────────────────────────────────────
// ✅ 5. Delete Visit Schedule
// DELETE /visit/schedule/:id
// ─────────────────────────────────────────────
export const deleteVisitSchedule = async (id: string) => {
  try {
    const res = await api.delete(`/visit/schedule/${id}`)
    return res.data
  } catch (error: any) {
    console.error('Error deleting schedule:', error?.response?.data || error.message)
    throw error
  }
}

// ─────────────────────────────────────────────
// ✅ 6. Get Upcoming Visits
// GET /visit/upcoming
// ─────────────────────────────────────────────
export const getUpcomingVisits = async () => {
  try {
    const res = await api.get('/visit/upcoming')
    return res.data
  } catch (error: any) {
    console.error('Error fetching upcoming visits:', error?.response?.data || error.message)
    throw error
  }
}