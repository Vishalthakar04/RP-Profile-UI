import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("No access token found. Please login again.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const getMultipartAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("access_token");
  if (!token) throw new Error("No access token found. Please login again.");
  return { Authorization: `Bearer ${token}` };
};

// =============================================================================
//  VISIT PURPOSE
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
    return json;
  } catch (error: any) {
    console.error("updateVisitPurpose error:", error);
    return { success: false, message: error.message || "Failed to update purpose", data: null };
  }
};

// =============================================================================
//  VISIT MEDIA
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
    formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
    if (purpose) formData.append("purpose", purpose);
    const response = await fetch(`${BASE_URL}/visits/${visitId}/media`, {
      method: "POST",
      headers,
      body: formData,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to upload media");
    return json;
  } catch (error: any) {
    console.error("uploadVisitMedia error:", error);
    return { success: false, message: error.message || "Failed to upload media", data: null };
  }
};

// =============================================================================
//  PURPOSE 1 — CLASS OBSERVATION
// =============================================================================

export const getScheduleStatus = async (
  programId: string | number,
  moduleNumber: number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/programs/${programId}/schedule-status?moduleNumber=${moduleNumber}`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch schedule status");
    return json;
  } catch (error: any) {
    console.error("getScheduleStatus error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

export const getQuestionSets = async (
  programId: string | number,
  moduleNumber: number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/programs/${programId}/question-sets?moduleNumber=${moduleNumber}`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch question sets");
    return json;
  } catch (error: any) {
    console.error("getQuestionSets error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

export const getProgramAssignment = async (
  programId: string | number,
  schoolId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/programs/${programId}/assignment?schoolId=${schoolId}`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch program assignment");
    return json;
  } catch (error: any) {
    console.error("getProgramAssignment error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

export const createClassObservation = async (
  visitId: string | number,
  payload: {
    program_id: string | number;
    level_id?: string | number;
    module_id?: string;
    section?: string;
    facilitator_id?: string | number;
    challenges?: string;
    catchup_plan?: string;
    suggestions?: string;
    media_urls?: string[];
    responses?: { question_id: string | number; score: number; is_na?: boolean }[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/class-observations`,
      { method: "POST", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to create class observation");
    return json;
  } catch (error: any) {
    console.error("createClassObservation error:", error);
    return { success: false, message: error.message || "Failed to create class observation", data: null };
  }
};

export const getClassObservations = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/class-observations`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch class observations");
    return json;
  } catch (error: any) {
    console.error("getClassObservations error:", error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const getClassObservationById = async (id: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/class-observations/${id}`, {
      method: "GET",
      headers,
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch class observation");
    return json;
  } catch (error: any) {
    console.error("getClassObservationById error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

export const updateClassObservation = async (
  id: string | number,
  payload: {
    module_id?: string | number;
    section?: string;
    facilitator_id?: string | number;
    challenges?: string;
    catchup_plan?: string;
    suggestions?: string;
    media_urls?: string[];
    responses?: { question_id: string | number; score: number; is_na?: boolean }[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/class-observations/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update class observation");
    return json;
  } catch (error: any) {
    console.error("updateClassObservation error:", error);
    return { success: false, message: error.message || "Failed to update class observation", data: null };
  }
};

// =============================================================================
//  PURPOSE 2 — ADOPTED CLASS
// =============================================================================

export const createAdoptedClass = async (
  visitId: string | number,
  payload: {
    section?: string;
    module_id?: string | number;
    media_urls?: string[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/adopted-class`,
      { method: "POST", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to create adopted class");
    return json;
  } catch (error: any) {
    console.error("createAdoptedClass error:", error);
    return { success: false, message: error.message || "Failed to create adopted class", data: null };
  }
};

export const getAdoptedClass = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/adopted-class`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch adopted class");
    return json;
  } catch (error: any) {
    console.error("getAdoptedClass error:", error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const updateAdoptedClass = async (
  visitId: string | number,
  id: string | number,
  payload: {
    section?: string;
    module_id?: string | number;
    media_urls?: string[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/adopted-class/${id}`,
      { method: "PUT", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update adopted class");
    return json;
  } catch (error: any) {
    console.error("updateAdoptedClass error:", error);
    return { success: false, message: error.message || "Failed to update adopted class", data: null };
  }
};

// =============================================================================
//  PURPOSE 3 — ENABLING SESSION
// =============================================================================

export const createEnablingSession = async (
  visitId: string | number,
  payload: {
    program_id: string | number;
    number_of_teachers: number;
    duration: number;
    remarks: string;
    media_urls?: string[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/enabling-sessions`,
      { method: "POST", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to create enabling session");
    return json;
  } catch (error: any) {
    console.error("createEnablingSession error:", error);
    return { success: false, message: error.message || "Failed to create enabling session", data: null };
  }
};

export const getEnablingSessions = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/enabling-sessions`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch enabling sessions");
    return json;
  } catch (error: any) {
    console.error("getEnablingSessions error:", error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const updateEnablingSession = async (
  visitId: string | number,
  id: string | number,
  payload: {
    number_of_teachers?: number;
    duration?: number;
    remarks?: string;
    media_urls?: string[];
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/enabling-sessions/${id}`,
      { method: "PUT", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update enabling session");
    return json;
  } catch (error: any) {
    console.error("updateEnablingSession error:", error);
    return { success: false, message: error.message || "Failed to update enabling session", data: null };
  }
};

// =============================================================================
//  PURPOSE 4 — NO CLASS OBSERVED
//  ⚡ Auto-upsert: POST first → if 409 "already exists" → auto PUT
// =============================================================================

export const createNoClassObserved = async (
  visitId: string | number,
  reason: string
) => {
  try {
    const headers = await getAuthHeaders();

    // Step 1: Try POST
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/no-class-observed`,
      { method: "POST", headers, body: JSON.stringify({ reason }) }
    );
    const json = await response.json();

    // Step 2: 409 means record exists → switch to PUT automatically
    if (response.status === 409 || json.message?.includes("already exists")) {
      console.log("createNoClassObserved: record exists → switching to PUT");
      const putRes = await fetch(
        `${BASE_URL}/visits/${visitId}/no-class-observed`,
        { method: "PUT", headers, body: JSON.stringify({ reason }) }
      );
      const putJson = await putRes.json();
      if (!putRes.ok || !putJson.success)
        throw new Error(putJson.message || "Failed to update no-class record");
      return putJson;
    }

    // Step 3: Any other error
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to create no-class record");

    return json;
  } catch (error: any) {
    console.error("createNoClassObserved error:", error);
    return { success: false, message: error.message || "Failed to create no-class record", data: null };
  }
};

export const getNoClassObserved = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/no-class-observed`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch no-class record");
    return json;
  } catch (error: any) {
    console.error("getNoClassObserved error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

export const updateNoClassObserved = async (
  visitId: string | number,
  reason: string
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/no-class-observed`,
      { method: "PUT", headers, body: JSON.stringify({ reason }) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update no-class record");
    return json;
  } catch (error: any) {
    console.error("updateNoClassObserved error:", error);
    return { success: false, message: error.message || "Failed to update no-class record", data: null };
  }
};

// =============================================================================
//  PURPOSE 5 — IMPACT SURVEY
// =============================================================================

export const createImpactSurvey = async (
  visitId: string | number,
  payload: {
    program_id: string | number;
    responses?: Record<string, any>;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/impact-surveys`,
      { method: "POST", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to create impact survey");
    return json;
  } catch (error: any) {
    console.error("createImpactSurvey error:", error);
    return { success: false, message: error.message || "Failed to create impact survey", data: null };
  }
};

export const getImpactSurveys = async (visitId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/impact-surveys`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch impact surveys");
    return json;
  } catch (error: any) {
    console.error("getImpactSurveys error:", error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const updateImpactSurvey = async (
  visitId: string | number,
  id: string | number,
  responses: Record<string, any>
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/visits/${visitId}/impact-surveys/${id}`,
      { method: "PUT", headers, body: JSON.stringify({ responses }) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update impact survey");
    return json;
  } catch (error: any) {
    console.error("updateImpactSurvey error:", error);
    return { success: false, message: error.message || "Failed to update impact survey", data: null };
  }
};