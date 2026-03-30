import { API_URL } from "../config";

const API = `${API_URL}/api/curriculum`;

function adminHeaders() {
  const user = JSON.parse(localStorage.getItem("academiaUser") || "{}");
  return {
    "Content-Type": "application/json",
    "X-Admin-Email": user.email || "",
  };
}

async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: adminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Erreur serveur");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── School levels ───────────────────────────────────────────────────────────

export const createSchoolLevel = (data) => request("POST", "/school-levels", data);
export const updateSchoolLevel = (id, data) => request("PUT", `/school-levels/${id}`, data);
export const deleteSchoolLevel = (id) => request("DELETE", `/school-levels/${id}`);

// ── Specialties ─────────────────────────────────────────────────────────────

export const createSpecialty = (data) => request("POST", "/specialties", data);
export const updateSpecialty = (id, data) => request("PUT", `/specialties/${id}`, data);
export const deleteSpecialty = (id) => request("DELETE", `/specialties/${id}`);

// ── Subjects ────────────────────────────────────────────────────────────────

export const createSubject = (data) => request("POST", "/subjects", data);
export const updateSubject = (id, data) => request("PUT", `/subjects/${id}`, data);
export const deleteSubject = (id) => request("DELETE", `/subjects/${id}`);
export const reorderSubjects = (items) => request("PUT", "/subjects/reorder", { items });

// ── Chapters ────────────────────────────────────────────────────────────────

export const createChapter = (data) => request("POST", "/chapters", data);
export const updateChapter = (id, data) => request("PUT", `/chapters/${id}`, data);
export const deleteChapter = (id) => request("DELETE", `/chapters/${id}`);
export const reorderChapters = (items) => request("PUT", "/chapters/reorder", { items });

// ── Full tree ───────────────────────────────────────────────────────────────

export const fetchTree = () => fetch(`${API}`).then((r) => r.json());
