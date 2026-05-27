// src/modules/modeApi.ts
import { api } from "../api";

const MINIO_PUBLIC_BASE =
    (import.meta.env.VITE_MINIO_PUBLIC_BASE?.replace(/\/$/, "") as string | undefined) ??
    "http://localhost:9000/services";

// Статусы для заявки на расчёт
export type FuelConsumptionStatus = 'черновик' | 'удалён' | 'сформирован' | 'завершён' | 'отклонён';

// Интерфейс для режима движения
export interface DrivingMode {
  mode_id?: number;
  mode_name?: string;
  name?: string;
  modeName?: string;
  mode_title?: string;
  description?: string;
  image_key?: string;
  video_key?: string;
  base_consumption?: number;
  consumption?: number;
  baseConsumption?: number;
  economy_percent?: number;
  economy?: number;
  savings_percent?: number;
  economyPercent?: number;
  price?: number;
  cost?: number;
  savings?: number;
  price_rub?: number;
  driving_type?: 'city' | 'highway' | 'mixed';
  short_description_en?: string;
  is_active?: boolean;
}

// Функция для CLIP
export function DrivingModeClipDescription(s: DrivingMode): string {
  const en = s.short_description_en?.trim();
  if (en) return en;
  return "Fuel consumption mode.";
}

// Интерфейс для заявки на расчёт топлива
export interface FuelConsumption {
  consumption_id: number;
  status: FuelConsumptionStatus;
  created_at: string;
  completed_at?: string | null;
  creator_login: string;
  moderator_login?: string | null;
  fuel_price: number;
  total_saved?: number;
  origin: string;
  destination: string;
}

// Интерфейс для записи в заявке
export interface FuelConsumptionMode {
  id: number;
  consumption_id: number;
  mode_id: number;
  route_distance: number;
  fuel_saved: number;
}

// Интерфейс для корзины/черновика заявки
export interface FuelConsumptionCart {
  consumption_id?: number;
  modes_count: number;
}

// Интерфейс для деталей заявки
export interface FuelConsumptionDetailResponse {
  consumption: FuelConsumption;
  modes: FuelConsumptionMode[];
}

// Функции для работы с URL
export function objectUrlFromKey(key: string): string {
  if (!key) return "";
  return `${MINIO_PUBLIC_BASE}/${key.replace(/^\//, "")}`;
}

export function fallbackImageUrl(): string {
  return (
      "data:image/svg+xml," +
      encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect width="100%" height="100%" fill="#e8e8ec"/></svg>',
      )
  );
}

export function resolveMediaUrl(key: string): string {
  if (!key) return fallbackImageUrl();
  if (
      key.startsWith("http://") ||
      key.startsWith("https://") ||
      key.startsWith("/") ||
      key.startsWith("blob:") ||
      key.startsWith("data:")
  ) {
    return key;
  }
  return objectUrlFromKey(key);
}

// 🔹 API-функции (исправлены: используют api клиент вместо fetch)

// ✅ Уже было правильно:
export async function listDrivingModes(params?: { name?: string }): Promise<DrivingMode[]> {
  try {
    // 🔹 Преобразуем name (маленькая) → Name (заглавная) для бэкенда
    const query = params?.name ? { Name: params.name } : undefined;

    console.log("🔍 [listDrivingModes] Отправляю query:", query); // ← Лог для отладки

    const response = await api.modes.modesList(query);
    return response.data;
  } catch {
    return [];
  }
}

// 🔹 Исправлено: getFuelConsumptionCart
export async function getFuelConsumptionCart(): Promise<FuelConsumptionCart> {
  try {
    const response = await api.fuelConsumptions.fuelConsumptionCartList();
    return response.data;
  } catch {
    return { consumption_id: undefined, modes_count: 0 };
  }
}

// 🔹 Исправлено: getFuelConsumption
export async function getFuelConsumption(
    id: number,
): Promise<FuelConsumptionDetailResponse | null> {
  try {
    const response = await api.fuelConsumptions.fuelConsumptionsDetail(id);
    return response.data;
  } catch {
    return null;
  }
}

// 🔹 Исправлено: getDrivingMode
export async function getDrivingMode(id: number): Promise<DrivingMode | null> {
  try {
    const response = await api.modes.modesDetail(id);
    return response.data;
  } catch {
    return null;
  }
}

// 🔹 Исправлено: addModeToApplication
export async function addModeToApplication(
    modeId: number,
): Promise<{ ok: true } | { ok: false; status: number; message?: string }> {
  try {
    await api.fuelModeEntries.add(modeId);
    return { ok: true };
  } catch (error: any) {
    const status = error?.response?.status || 0;
    const message = error?.response?.data?.error || error?.message || "Не удалось выполнить запрос";

    if (status === 401) {
      return { ok: false, status: 401, message: "Войдите в систему, чтобы добавить режим в заявку." };
    }
    return { ok: false, status, message: message || `HTTP ${status}` };
  }
}