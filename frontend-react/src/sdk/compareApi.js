// frontend-react/src/api/compareApi.js
// Utilise TON apiClient existant (headers, X-API-Key, baseURL, etc.)
import { api } from "./apiClient";

export async function fetchCompareOptions() {
  const res = await api("api/compare/options");
  return res.data; // { items: [...] }
}

export async function fetchCompareData(payload) {
  // payload: { analysis_ids: [...], metric: "session" | ... , normalize: false }
  const res = await api("api/compare/data", { method: "POST", body: payload });
  return res.data; // { metric, value_type, precision, buckets, series }
}
