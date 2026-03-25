// src/services/visitSchedule.ts

import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://rk-mission-be-2.onrender.com/api/rp'

// -------------------- HEADERS --------------------
const getHeaders = async (): Promise<Record<string, string>> => {
  const token = await AsyncStorage.getItem('access_token')


  if (!token) {
    throw new Error('No token found. Please login again.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// -------------------- REQUEST --------------------
const request = async (method: string, path: string, body?: any) => {
  try {
    const headers = await getHeaders()

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.message || `Request failed with status ${response.status}`
      )
    }

    return data
  } catch (error: any) {
    console.error(`❌ API Error [${method} ${path}]`, error.message)
    throw error
  }
}

// -------------------- APIs --------------------
export const getAssignedSchools = () =>
  request('GET', '/visit/schools')

export const createVisitSchedule = (payload: any) =>
  request('POST', '/visit/schedule', payload)

export const getVisitSchedules = (page = 1, limit = 4) =>
  request('GET', `/visit/schedules?page=${page}&limit=${limit}`)

export const updateVisitSchedule = (id: string, payload: any) =>
  request('PUT', `/visit/schedule/${id}`, payload)

export const deleteVisitSchedule = (id: string) =>
  request('DELETE', `/visit/schedule/${id}`)

export const getUpcomingVisits = () =>
  request('GET', '/visit/upcoming')