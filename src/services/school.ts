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
export const updateContact = async (
  schoolId: string | number,
  contactId: string,
  payload: {
    person_name?: string;
    designation?: "headmaster" | "coordinator";
    phone?: string;
    email?: string;
  }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/schools/${schoolId}/contacts/principal`, // ← dynamic, NOT hardcoded
      { method: "PUT", headers, body: JSON.stringify(payload) }
    );
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to update contact");
    return json;
  } catch (error: any) {
    console.error("updateContact error:", error);
    return { success: false, message: error.message || "Update failed", data: null };
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
export const getModuleProgress = async (schoolId: string | number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/schools/${schoolId}/module-progress`, { method: "GET", headers });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Failed to fetch module progress");
    return json;
  } catch (error: any) {
    console.error("getModuleProgress error:", error);
    return { success: false, message: error.message || "Failed to load progress", data: null };
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
    coordinator_name?:       string;
    coordinator_email?:      string;
    coordinator_phone?:      string;
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