// storage.js
// Handles reading/writing visitors to localStorage

export const STORAGE_KEY = "uil_hr_visitors_v1";

export function loadVisitors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading visitors:", e);
    return [];
  }
}

export function saveVisitors(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

