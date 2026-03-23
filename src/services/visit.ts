import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

// ────────────────────────────────────────────────
// Helper: Get auth header with token from storage
// ────────────────────────────────────────────────
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("No access token found. Please login again.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// ────────────────────────────────────────────────
// Helper: Multipart header (for file uploads)
// ────────────────────────────────────────────────
const getMultipartAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("No access token found. Please login again.");
  return {
    Authorization: `Bearer ${token}`,
  };
};

// =============================================================================
//  1. POST /rp/visits
//  Check-In: create a new visit (status = ongoing)
//  Body: { school_id, check_in_lat, check_in_long }
//  Returns: { success, message, data: Visit }
//  ⚠️  409 if RP already has an ongoing visit → data.visit_id returned
// =============================================================================
export const checkInVisit = async (
  school_id: string | number,
  check_in_lat: number,
  check_in_long: number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits`, {
      method: "POST",
      headers,
      body: JSON.stringify({ school_id, check_in_lat, check_in_long }),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Check-in failed");
    return json; // { success, message, data: Visit }
  } catch (error: any) {
    console.error("checkInVisit error:", error);
    return {
      success: false,
      message: error.message || "Check-in failed",
      data: null,
    };
  }
};

// =============================================================================
//  2. GET /rp/visits/active
//  Returns current ongoing visit for this RP (or null if none)
//  Used on app launch / VisitCheckin to resume an in-progress visit
// =============================================================================
export const getActiveVisit = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits/active`, {
      method: "GET",
      headers,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch active visit");
    return json; // { success, message, data: Visit | null }
  } catch (error: any) {
    console.error("getActiveVisit error:", error);
    return {
      success: false,
      message: error.message || "Network error",
      data: null,
    };
  }
};

// =============================================================================
//  3. GET /rp/visits
//  Visit history for this RP
//  Query params (all optional): from, to, school_id, status
// =============================================================================
export const getVisitHistory = async (filters?: {
  from?: string;       // ISO date string e.g. "2024-01-01"
  to?: string;
  school_id?: string | number;
  status?: "ongoing" | "completed";
}) => {
  try {
    const headers = await getAuthHeaders();
    const params  = new URLSearchParams();
    if (filters?.from)      params.append("from",      filters.from);
    if (filters?.to)        params.append("to",        filters.to);
    if (filters?.school_id) params.append("school_id", String(filters.school_id));
    if (filters?.status)    params.append("status",    filters.status);

    const qs  = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${BASE_URL}/visits${qs}`, {
      method: "GET",
      headers,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch visit history");
    return json; // { success, message, data: Visit[] }
  } catch (error: any) {
    console.error("getVisitHistory error:", error);
    return {
      success: false,
      message: error.message || "Network error",
      data: [],
    };
  }
};

// =============================================================================
//  4. GET /rp/visits/:id
//  Full detail of a single visit (includes school info)
// =============================================================================
export const getVisitById = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits/${visitId}`, {
      method: "GET",
      headers,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch visit");
    return json; // { success, message, data: Visit }
  } catch (error: any) {
    console.error("getVisitById error:", error);
    return {
      success: false,
      message: error.message || "Network error",
      data: null,
    };
  }
};

// =============================================================================
//  5. PATCH /rp/visits/:id/gps-snapshot
//  Save a periodic GPS proof-of-presence snapshot
//  Body: { slot, lat, lng, accuracy }
//  slot must be one of: '9am' | '11am' | '1pm' | '3pm' | '5pm'
// =============================================================================
export const saveGpsSnapshot = async (
  visitId: string | number,
  slot: "9am" | "11am" | "1pm" | "3pm" | "5pm",
  lat: number,
  lng: number,
  accuracy?: number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits/${visitId}/gps-snapshot`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ slot, lat, lng, accuracy }),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to save GPS snapshot");
    return json; // { success, message, data: GpsSnapshot }
  } catch (error: any) {
    console.error("saveGpsSnapshot error:", error);
    return {
      success: false,
      message: error.message || "Failed to save GPS snapshot",
      data: null,
    };
  }
};

// =============================================================================
//  6. PATCH /rp/visits/:id/purpose
//  Update visit purpose (already in observation.ts — kept here for visit flow)
//  Body: { visit_purpose: string[] }
//  ⚠️  Only works while visit_status = 'ongoing'
// =============================================================================
export const updateVisitPurpose = async (
  visitId: string | number,
  visit_purpose: string[]
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits/${visitId}/purpose`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ visit_purpose }),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update visit purpose");
    return json; // { success, data: { id, purpose } }
  } catch (error: any) {
    console.error("updateVisitPurpose error:", error);
    return {
      success: false,
      message: error.message || "Failed to update purpose",
      data: null,
    };
  }
};

// =============================================================================
//  7. PATCH /rp/visits/:id/checkout
//  Check-Out: completes the visit
//  Body: { check_out_lat, check_out_long }
//  ⚠️  Returns 400 if visit already completed
// =============================================================================
export const checkOutVisit = async (
  visitId: string | number,
  check_out_lat: number,
  check_out_long: number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/visits/${visitId}/checkout`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ check_out_lat, check_out_long }),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Check-out failed");
    return json; // { success, message, data: Visit }
  } catch (error: any) {
    console.error("checkOutVisit error:", error);
    return {
      success: false,
      message: error.message || "Check-out failed",
      data: null,
    };
  }
};

// =============================================================================
//  8. POST /rp/visits/:id/media
//  Upload a photo/video/pdf (max 10 MB) for a visit
//  Multipart: file field + optional purpose string
// =============================================================================
export const uploadVisitMedia = async (
  visitId: string | number,
  fileUri: string,
  fileName: string,
  mimeType: string,
  purpose?: string
) => {
  try {
    const headers = await getMultipartAuthHeaders();

    const formData = new FormData();
    formData.append("file", {
      uri:  fileUri,
      name: fileName,
      type: mimeType,
    } as any);
    if (purpose) formData.append("purpose", purpose);

    const response = await fetch(`${BASE_URL}/visits/${visitId}/media`, {
      method: "POST",
      headers,
      body: formData,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Media upload failed");
    return json;
    // { success, message, data: { visit_id, purpose, filename, mimetype, size, url } }
  } catch (error: any) {
    console.error("uploadVisitMedia error:", error);
    return {
      success: false,
      message: error.message || "Media upload failed",
      data: null,
    };
  }
};