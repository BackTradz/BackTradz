// src/sdk/backtestXlsxApi.js
import { api } from "./apiClient"; // déjà centralisé (X-API-Key, base URL, etc.) :contentReference[oaicite:1]{index=1}

export const xlsxMeta = (folder) =>
  api(`/api/user/backtests/xlsx/meta?folder=${encodeURIComponent(folder)}`);

export const xlsxSheet = ({ folder, sheet, offset = 0, limit = 500, use_header = 1 }) =>
  api(`/api/user/backtests/xlsx/sheet?folder=${encodeURIComponent(folder)}&sheet=${encodeURIComponent(sheet)}&offset=${offset}&limit=${limit}&use_header=${use_header}`);

export const xlsxAggregates = ({ folder, sheet = "Trades", dt_col = "Datetime", r_col = "R", group = "overall" }) =>
  api(`/api/user/backtests/xlsx/aggregates?folder=${encodeURIComponent(folder)}&sheet=${encodeURIComponent(sheet)}&dt_col=${encodeURIComponent(dt_col)}&r_col=${encodeURIComponent(r_col)}&group=${group}`);
