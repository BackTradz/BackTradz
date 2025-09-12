// src/sdk/publicXlsxApi.js
export async function xlsxMeta(folder) {
  const r = await fetch(`/api/public/xlsx/meta?folder=${encodeURIComponent(folder)}`);
  if (!r.ok) throw new Error(`meta ${r.status}`);
  return r.json(); // { sheets: [...] }
}

export async function xlsxSheet(folder, sheet) {
  const params = new URLSearchParams({ folder, sheet });
  const r = await fetch(`/api/public/xlsx/sheet?${params}`);
  if (!r.ok) throw new Error(`sheet ${r.status}`);
  return r.json(); // { headers: [...], rows: [...] }
}
