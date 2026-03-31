// services/school.ts
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
// 1. GET /rp/schools
// ────────────────────────────────────────────────
export const getAssignedSchools = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch assigned schools");
    return json;
  } catch (error: any) {
    console.error("getAssignedSchools error:", error);
    return { success: false, message: error.message || "Something went wrong", data: [] };
  }
};

// ────────────────────────────────────────────────
// 2. GET /rp/schools/:id
// ────────────────────────────────────────────────
export const getSchoolDetail = async (schoolId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch school details");
    return json;
  } catch (error: any) {
    console.error("getSchoolDetail error:", error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

// ────────────────────────────────────────────────
// 3. GET /rp/schools/:id/contacts
// ────────────────────────────────────────────────
export const getSchoolContacts = async (schoolId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/contacts`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch contacts");
    return json;
  } catch (error: any) {
    console.error("getSchoolContacts error:", error);
    return { success: false, message: error.message || "Failed to load contacts", data: null };
  }
};

// ────────────────────────────────────────────────
// 4. PUT /rp/schools/:id/contacts/:cid
// cid = "principal" OR SchoolProgram id (UUID)
// designation required for program contacts: "headmaster" | "coordinator"
// ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CONTACT — Principal OR Program Headmaster/Coordinator
// PUT /rp/schools/:schoolId/contacts/:cid
// cid = "principal" OR school_program.id (for headmaster/coordinator)
// ─────────────────────────────────────────────────────────────────────────────
export const updateContact = async (
  schoolId: string | number,
  contactId: string,                    // "principal" or programId (string/number)
  payload: {
    person_name?: string;
    designation?: "headmaster" | "coordinator";   // only needed for programs
    phone?: string;
    alt_phone?: string;
    email?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();

    const url = `${BASE_URL}/schools/${schoolId}/contacts/${contactId}`;

    console.log("📡 updateContact URL:", url);
    console.log("📦 Payload:", payload);
    console.log("🔑 contactId (cid):", contactId);

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("📥 Status:", response.status);
    console.log("📥 Raw Response:", responseText.substring(0, 400));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
    }

    const json = JSON.parse(responseText);
    console.log("✅ updateContact Success:", json);
    return json;
  } catch (error: any) {
    console.error("❌ updateContact error:", error);
    return {
      success: false,
      message: error.message || "Failed to update contact",
    };
  }
};

// ────────────────────────────────────────────────
// 5. GET /rp/schools/:id/sections
// Optional filters: class_name, adopted
// ────────────────────────────────────────────────
export const getSchoolSections = async (
  schoolId: string | number,
  filters: { class_name?: string; adopted?: boolean } = {}
) => {
  try {
    const params = new URLSearchParams();
    if (filters.class_name) params.append("class_name", filters.class_name);
    if (filters.adopted !== undefined) params.append("adopted", filters.adopted.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/sections${query}`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch sections");
    return json;
  } catch (error: any) {
    console.error("getSchoolSections error:", error);
    return { success: false, message: error.message || "Failed to load sections", data: [] };
  }
};

// ────────────────────────────────────────────────
// 6. POST /rp/schools/:id/sections
// Body: { level_id, class_name, section_name, teacher_id?, strength?, infra?, slot?, status? }
// ────────────────────────────────────────────────
export const createSchoolSection = async (
  schoolId: string | number,
  payload: {
    level_id: string | number;
    class_name: string;
    section_name: string;
    teacher_id?: string | number;
    strength?: number;
    infra?: string;
    slot?: string;
    status?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/sections`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to create section");
    return json;
  } catch (error: any) {
    console.error("createSchoolSection error:", error);
    return { success: false, message: error.message || "Failed to create section", data: null };
  }
};

// ────────────────────────────────────────────────
// 7. PATCH /rp/schools/:id/sections/:sectionId/assign-teacher
// Body: { teacher_id }
// ────────────────────────────────────────────────
export const assignTeacherToSection = async (
  schoolId: string | number,
  sectionId: string | number,
  payload: { teacher_id: string | number }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/sections/${sectionId}/assign-teacher`,
      { method: "PATCH", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to assign teacher");
    return json;
  } catch (error: any) {
    console.error("assignTeacherToSection error:", error);
    return { success: false, message: error.message || "Failed to assign teacher", data: null };
  }
};

// ────────────────────────────────────────────────
// 8. GET /rp/schools/:id/module-progress
// ────────────────────────────────────────────────
// services/school.ts  — updated getModuleProgress
export const getModuleProgress = async (
  schoolId: string | number,
  params?: { program_id?: string | number; level_id?: string | number }
) => {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.program_id) query.append('program_id', String(params.program_id));
    if (params?.level_id)   query.append('level_id',   String(params.level_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/module-progress${qs}`, { method: 'GET', headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || 'Failed to fetch module progress');
    return json;
  } catch (error: any) {
    console.error('getModuleProgress error:', error);
    return { success: false, message: error.message || 'Failed to load progress', data: null };
  }
};

// ────────────────────────────────────────────────
// 9. POST /rp/schools/:id/module-progress
// Body: { section_id, module_id }  ← module_id (UUID), NOT module_name
// ────────────────────────────────────────────────
export const recordModuleProgress = async (
  schoolId: string | number,
  payload: {
    section_id: string | number;
    module_id: string | number;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/module-progress`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to record progress");
    return json;
  } catch (error: any) {
    console.error("recordModuleProgress error:", error);
    return { success: false, message: error.message || "Failed to save progress", data: null };
  }
};

// ────────────────────────────────────────────────
// 10. GET /rp/schools/:id/programs
// Returns all active programs assigned to a school
// Response: [{ id, program_id, program_name, status, program: { id, name, type, duration_years } }]
// ────────────────────────────────────────────────
export const getSchoolPrograms = async (schoolId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/programs`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch programs");
    return json;
  } catch (error: any) {
    console.error("getSchoolPrograms error:", error);
    return { success: false, message: error.message || "Failed to load programs", data: [] };
  }
};

// ────────────────────────────────────────────────
// 11. GET /rp/programs/:programId/levels
// ────────────────────────────────────────────────
export const getProgramLevels = async (programId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/programs/${programId}/levels`, {
      method: "GET",
      headers,
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch levels");
    return json;
  } catch (error: any) {
    console.error("getProgramLevels error:", error);
    return { success: false, message: error.message || "Failed to load levels", data: null };
  }
};

// ────────────────────────────────────────────────
// 12. GET /rp/levels/:levelId/modules
// Returns a level with all its modules
// ────────────────────────────────────────────────
export const getLevelModules = async (levelId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/levels/${levelId}/modules`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch modules");
    return json;
  } catch (error: any) {
    console.error("getLevelModules error:", error);
    return { success: false, message: error.message || "Failed to load modules", data: null };
  }
};

// ────────────────────────────────────────────────
// 13. GET /rp/programs
// Returns all active programs (global list)
// ────────────────────────────────────────────────
export const getPrograms = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/programs`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch programs");
    return json;
  } catch (error: any) {
    console.error("getPrograms error:", error);
    return { success: false, message: error.message || "Failed to load programs", data: [] };
  }
};

// ────────────────────────────────────────────────
// 14. GET /rp/teachers/trained?school_id=&program_id=
// Returns all trained teachers for a school + program
// ────────────────────────────────────────────────
export const getTrainedTeachers = async (
  schoolId: string | number,
  programId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/teachers/trained?school_id=${schoolId}&program_id=${programId}`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch trained teachers");
    return json; // { success, total, data: Teacher[] }
  } catch (error: any) {
    console.error("getTrainedTeachers error:", error);
    return { success: false, message: error.message || "Failed to load teachers", data: [] };
  }
};

// ────────────────────────────────────────────────
// 15. PATCH /rp/schools/:id/programs/:programId
// Update program contacts + infrastructure_status
// ────────────────────────────────────────────────
export const updateSchoolProgram = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
  infrastructure_status?: string;
  headmaster_name?:        string;
  headmaster_email?:       string;
  headmaster_phone?:       string;
  headmaster_alt_phone?:   string;
  coordinator_name?:       string;
  coordinator_email?:      string;
  coordinator_phone?:      string;
  coordinator_alt_phone?:  string;
}
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}`,
      { method: "PATCH", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to update program");
    return json; // { success, data: schoolProgram }
  } catch (error: any) {
    console.error("updateSchoolProgram error:", error);
    return { success: false, message: error.message || "Update failed", data: null };
  }
};

// ────────────────────────────────────────────────
// 16. PATCH /rp/schools/:id/sections/:sectionId/status
// Updates section status — only allowed if school has FCP program assigned
// Body: { "status": "Adopted" | "Not Adopted" }
// ────────────────────────────────────────────────
export const updateSectionStatus = async (
  schoolId: string | number,
  sectionId: string | number,
  status: "Adopted" | "Not Adopted"
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/sections/${sectionId}/status`,
      { method: "PATCH", headers, body: JSON.stringify({ status }) }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to update section status");
    return json; // { success, message, data: { id, status } }
  } catch (error: any) {
    console.error("updateSectionStatus error:", error);
    return { success: false, message: error.message || "Failed to update status", data: null };
  }
};

// ────────────────────────────────────────────────
// 19. PUT /rp/schools/:id/sections/:sectionId
// Update all section fields
// Body: { level_id, class_name, section_name, teacher_id?, strength?, infra?, slot?, status? }
// ────────────────────────────────────────────────
export const updateSchoolSection = async (
  schoolId: string | number,
  sectionId: string | number,
  payload: {
    level_id?: string | number;
    class_name?: string;
    section_name?: string;
    teacher_id?: string | number;
    strength?: number;
    infra?: string;
    slot?: string;
    status?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/sections/${sectionId}`,
      { method: "PUT", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to update section");
    return json;
  } catch (error: any) {
    console.error("updateSchoolSection error:", error);
    return { success: false, message: error.message || "Failed to update section", data: null };
  }
};

// ────────────────────────────────────────────────
// 17. DELETE /rp/schools/:id/sections/:sectionId
// ────────────────────────────────────────────────
export const deleteSchoolSection = async (
  schoolId: string | number,
  sectionId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/sections/${sectionId}`,
      { method: "DELETE", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to delete section");
    return json;
  } catch (error: any) {
    console.error("deleteSchoolSection error:", error);
    return { success: false, message: error.message || "Failed to delete section", data: null };
  }
};

// ────────────────────────────────────────────────
// 18. GET /rp/dashboard/stats
// Returns: total_schools_assigned, visits_completed, visits_pending,
//          month_scheduled_visits, month
// ────────────────────────────────────────────────
export const getDashboardStats = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/dashboard/stats`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch dashboard stats");
    return json;
  } catch (error: any) {
    console.error("getDashboardStats error:", error);
    return {
      success: false,
      message: error.message || "Failed to load stats",
      data: null,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD THESE FUNCTIONS TO YOUR services/school.ts
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// 20. GET /rp/schools/:id/programs/:programId/coordinator
// Returns coordinator details for a specific program
// ────────────────────────────────────────────────
export const getProgramCoordinator = async (
  schoolId: string | number,
  programId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}/coordinator`,
      { method: "GET", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to fetch coordinator");
    return json; // { success, data: { id, program_name, coordinator_name, coordinator_email, coordinator_phone, coordinator_alt_phone } }
  } catch (error: any) {
    console.error("getProgramCoordinator error:", error);
    return { success: false, message: error.message || "Failed to load coordinator", data: null };
  }
};

// ────────────────────────────────────────────────
// 21. PATCH /rp/schools/:id/programs/:programId/coordinator
// Partial update of coordinator details
// Body: { coordinator_name?, coordinator_email?, coordinator_phone?, coordinator_alt_phone? }
// ────────────────────────────────────────────────
export const patchProgramCoordinator = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
    coordinator_name?: string;
    coordinator_email?: string;
    coordinator_phone?: string;
    coordinator_alt_phone?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}/coordinator`,
      { method: "PATCH", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update coordinator");
    return json;
  } catch (error: any) {
    console.error("patchProgramCoordinator error:", error);
    return { success: false, message: error.message || "Update failed", data: null };
  }
};

// ────────────────────────────────────────────────
// 22. PUT /rp/schools/:id/programs/:programId/coordinator
// Full replace of coordinator details (sets omitted fields to null)
// Body: { coordinator_name, coordinator_email, coordinator_phone, coordinator_alt_phone }
// ────────────────────────────────────────────────
export const putProgramCoordinator = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
    coordinator_name: string;
    coordinator_email: string;
    coordinator_phone: string;
    coordinator_alt_phone: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}/coordinator`,
      { method: "PUT", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to replace coordinator");
    return json;
  } catch (error: any) {
    console.error("putProgramCoordinator error:", error);
    return { success: false, message: error.message || "Update failed", data: null };
  }
};

// ────────────────────────────────────────────────
// 23. DELETE /rp/schools/:id/programs/:programId/coordinator
// Clears all coordinator fields (sets to null)
// ────────────────────────────────────────────────
export const deleteProgramCoordinator = async (
  schoolId: string | number,
  programId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}/coordinator`,
      { method: "DELETE", headers }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to remove coordinator");
    return json; // { success, message }
  } catch (error: any) {
    console.error("deleteProgramCoordinator error:", error);
    return { success: false, message: error.message || "Delete failed" };
  }
};

// ────────────────────────────────────────────────
// 24. POST /rp/schools/:id/programs
// Add a new program to a school (also used to add headmaster inline)
// Body: { program_id?, program_name, infrastructure_status?,
//         headmaster_name?, headmaster_email?, headmaster_phone?, headmaster_alt_phone?,
//         coordinator_name?, coordinator_email?, coordinator_phone?, coordinator_alt_phone? }
// ────────────────────────────────────────────────
export const addSchoolProgram = async (
  schoolId: string | number,
  payload: {
    program_id?: string | number;
    program_name: string;
    infrastructure_status?: string;
    headmaster_name?: string;
    headmaster_email?: string;
    headmaster_phone?: string;
    headmaster_alt_phone?: string;
    coordinator_name?: string;
    coordinator_email?: string;
    coordinator_phone?: string;
    coordinator_alt_phone?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/programs`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to add program");
    return json; // { success, message, data: schoolProgram }
  } catch (error: any) {
    console.error("addSchoolProgram error:", error);
    return { success: false, message: error.message || "Failed to add program", data: null };
  }
};

// ────────────────────────────────────────────────
// 25. PATCH /rp/schools/:id/programs/:programId/headmaster
// Update headmaster details only
// Body: { headmaster_name?, headmaster_email?, headmaster_phone?, headmaster_alt_phone? }
// ────────────────────────────────────────────────
export const patchProgramHeadmaster = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
    headmaster_name?: string;
    headmaster_email?: string;
    headmaster_phone?: string;
    headmaster_alt_phone?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/programs/${programId}/headmaster`,
      { method: "PATCH", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success)
      throw new Error(json.message || "Failed to update headmaster");
    return json;
  } catch (error: any) {
    console.error("patchProgramHeadmaster error:", error);
    return { success: false, message: error.message || "Update failed", data: null };
  }
};

export const createProgramCoordinatorNew = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
    name: string;
    email?: string;
    phone?: string;
    alt_phone?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();

    // ✅ Correct URL - BASE_URL already includes /api/rp
    const url = `${BASE_URL}/schools/${schoolId}/programs/${programId}/coordinators`;

    console.log("══════════════════════════════════════════════");
    console.log("📡 CREATE COORDINATOR REQUEST");
    console.log("🔗 URL:", url);
    console.log("📦 Payload being sent:", JSON.stringify(payload, null, 2));
    console.log("📋 Headers:", headers);
    console.log("══════════════════════════════════════════════");

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // Get raw text first (this catches HTML errors)
    const responseText = await response.text();

    console.log("══════════════════════════════════════════════");
    console.log("📥 RESPONSE RECEIVED");
    console.log("Status Code:", response.status, response.statusText);
    console.log("Content-Type:", response.headers.get("content-type"));
    console.log("Raw Response Body (first 500 chars):");
    console.log(responseText.substring(0, 500));
    console.log("══════════════════════════════════════════════");

    // If not OK, show more info
    if (!response.ok) {
      console.error("❌ Request failed with status:", response.status);
      throw new Error(`HTTP Error ${response.status}: ${responseText.substring(0, 200)}`);
    }

    // Safely parse JSON
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      throw new Error("Server returned invalid JSON. Check backend logs.");
    }

    console.log("✅ Parsed JSON Response:", JSON.stringify(json, null, 2));

    return json;
  } catch (error: any) {
    console.error("❌ createProgramCoordinatorNew FAILED:", error);
    console.error("Error Stack:", error.stack);
    
    return {
      success: false,
      message: error.message || "Failed to add coordinator. Check console logs.",
    };
  }
};

export const createProgramHeadmasterNew = async (
  schoolId: string | number,
  programId: string | number,
  payload: {
    name: string;
    email?: string;
    phone?: string;
    alt_phone?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const url = `${BASE_URL}/schools/${schoolId}/programs/${programId}/headmasters`;

    console.log("📡 [Headmaster] POST URL:", url);
    console.log("📦 [Headmaster] Payload:", payload);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("📥 [Headmaster] Status:", response.status);
    console.log("📥 [Headmaster] Raw Response:", responseText.substring(0, 400));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
    }

    const json = JSON.parse(responseText);
    console.log("✅ [Headmaster] Success Response:", json);
    return json;
  } catch (error: any) {
    console.error("❌ createProgramHeadmasterNew error:", error);
    return {
      success: false,
      message: error.message || "Failed to add headmaster",
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Get ALL Coordinators across all assigned schools
// GET /rp/coordinators
// ─────────────────────────────────────────────────────────────────────────────
export const getAllCoordinators = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/coordinators`, {
      method: "GET",
      headers,
    });

    const responseText = await response.text();
    console.log("📥 [getAllCoordinators] Status:", response.status);
    console.log("📥 [getAllCoordinators] Raw Response:", responseText.substring(0, 300));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = JSON.parse(responseText);
    return json;
  } catch (error: any) {
    console.error("❌ getAllCoordinators error:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch coordinators",
      data: [],
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Get ALL Headmasters across all assigned schools
// GET /rp/headmasters
// ─────────────────────────────────────────────────────────────────────────────
export const getAllHeadmasters = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/headmasters`, {
      method: "GET",
      headers,
    });

    const responseText = await response.text();
    console.log("📥 [getAllHeadmasters] Status:", response.status);
    console.log("📥 [getAllHeadmasters] Raw Response:", responseText.substring(0, 300));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = JSON.parse(responseText);
    return json;
  } catch (error: any) {
    console.error("❌ getAllHeadmasters error:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch headmasters",
      data: [],
    };
  }
};