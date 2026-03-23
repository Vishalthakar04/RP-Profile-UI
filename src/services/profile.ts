// services/profile.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

const getAuthHeaders = async (contentType = "application/json") => {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("No access token found. Please login again.");
  return {
    "Content-Type": contentType,
    Authorization: `Bearer ${token}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /rp/profile
// Fetch current user's profile (name, email, phone, rp_code, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const fetchProfile = async () => {
  try {
    const headers  = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/profile`, { method: "GET", headers });
    const json     = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch profile");
    return json;
  } catch (error: any) {
    console.error("fetchProfile error:", error);
    return { success: false, message: error.message || "Could not load profile", data: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PUT /rp/profile/fcm-token
// Update device FCM token for push notifications
// ─────────────────────────────────────────────────────────────────────────────
export const updateFcmToken = async (fcmToken: string) => {
  if (!fcmToken?.trim())
    return { success: false, message: "FCM token cannot be empty" };
  try {
    const headers  = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/profile/fcm-token`, {
      method: "PUT", headers,
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update FCM token");
    return json;
  } catch (error: any) {
    console.error("updateFcmToken error:", error);
    return { success: false, message: error.message || "Failed to save push token" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /rp/users
// Fetch all RPs — used in VisitForm "Additional Resource Person" dropdown.
// Returns: { success, total, data: RPUser[] }
// Each RPUser: { id, first_name, last_name, email_address, phone_number,
//               rp_code, rp_type, joining_date, zone, status }
// ─────────────────────────────────────────────────────────────────────────────
export const fetchAllRPs = async () => {
  try {
    const headers  = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/users`, { method: "GET", headers });
    const json     = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch resource persons");
    return json; // { success, total, data: RPUser[] }
  } catch (error: any) {
    console.error("fetchAllRPs error:", error);
    return { success: false, message: error.message || "Could not load resource persons", data: [] };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Combined helper — refresh FCM token + fetch latest profile
// ─────────────────────────────────────────────────────────────────────────────
export const refreshSessionAndFcm = async (newFcmToken?: string) => {
  try {
    if (newFcmToken) {
      const fcmRes = await updateFcmToken(newFcmToken);
      if (!fcmRes.success) console.warn("FCM update failed:", fcmRes.message);
    }
    return await fetchProfile();
  } catch (err) {
    console.error("refreshSessionAndFcm failed:", err);
    return { success: false, message: "Session refresh failed" };
  }
};