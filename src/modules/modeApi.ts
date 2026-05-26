// src/modules/modeApi.ts

const MINIO_PUBLIC_BASE =
    (import.meta.env.VITE_MINIO_PUBLIC_BASE?.replace(/\/$/, "") as string | undefined) ??
    "http://localhost:9000/services";  // заменён bucket

// Статусы для заявки на расчёт
export type FuelConsumptionStatus = 'черновик' | 'удалён' | 'сформирован' | 'завершён' | 'отклонён';

// Интерфейс для режима движения
// src/modules/modeApi.ts
export interface DrivingMode {
  mode_id?: number;

  // ✅ Поддержка разных вариантов названия
  mode_name?: string;
  name?: string;              // альтернатива
  modeName?: string;          // camelCase
  mode_title?: string;        // snake_case с underscore

  description?: string;
  image_key?: string;
  video_key?: string;

  // ✅ Расход топлива
  base_consumption?: number;
  consumption?: number;       // альтернатива
  baseConsumption?: number;   // camelCase

  // ✅ Процент экономии
  economy_percent?: number;
  economy?: number;           // альтернатива
  savings_percent?: number;
  economyPercent?: number;    // camelCase

  // ✅ Цена/экономия в рублях
  price?: number;
  cost?: number;              // альтернатива
  savings?: number;
  price_rub?: number;

  driving_type?: 'city' | 'highway' | 'mixed';
  short_description_en?: string;
  is_active?: boolean;
}

// ✅ Функция для CLIP (остаётся, но с новым названием)
export function DrivingModeClipDescription(s: DrivingMode): string {
  const en = s.short_description_en?.trim();
  if (en) return en;
  return "Fuel consumption mode.";
}

// Интерфейс для заявки на расчёт топлива
export interface FuelConsumption { // заменено с TirePressure
  consumption_id: number; // заменено с tire_pressure_id
  status: FuelConsumptionStatus;
  created_at: string; // заменено с date_create
  completed_at?: string | null; // заменено с date_completed
  creator_login: string; // заменено с creator_id
  moderator_login?: string | null; // заменено с moderator_id
  fuel_price: number; // цена топлива
  total_saved?: number; // общая экономия
  origin: string; // начальный пункт
  destination: string; // конечный пункт
}

// Интерфейс для записи в заявке (режим + маршрут)
export interface FuelConsumptionMode { // заменено с TirePressureEntry
  id: number;
  consumption_id: number; // заменено с tire_pressure_id
  mode_id: number; // заменено с tire_id
  route_distance: number; // расстояние маршрута
  fuel_saved: number; // экономия топлива
}

// Интерфейс для корзины/черновика заявки
export interface FuelConsumptionCart { // заменено с TirePressureCart
  consumption_id?: number; // заменено с tire_pressure_id
  modes_count: number; // заменено с tires_count
  // можно добавить другие поля по необходимости
}

// Интерфейс для деталей заявки
export interface FuelConsumptionDetailResponse { // заменено с TirePressureDetailResponse
  consumption: FuelConsumption;
  modes: FuelConsumptionMode[]; // заменено с entries
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

// ✅ API-функции (заменены на работу с FuelConsumption и DrivingMode)
export async function getFuelConsumptionCart(): Promise<FuelConsumptionCart> {
  try {
    const res = await fetch("/api/fuel_consumption/cart", { // изменён URL
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { consumption_id: undefined, modes_count: 0 };
  }
}

export async function getFuelConsumption(
    id: number,
): Promise<FuelConsumptionDetailResponse | null> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`/api/fuel_consumption/${id}`, { headers }); // изменён URL
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function listDrivingModes(params?: { name?: string }): Promise<DrivingMode[]> { // изменено на listDrivingModes
  try {
    let path = "/api/modes"; // изменён URL
    if (params?.name) {
      const q = new URLSearchParams();
      q.append("Name", params.name); // изменён параметр поиска
      path += `?${q.toString()}`;
    }
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return [];
  }
}

export async function getDrivingMode(id: number): Promise<DrivingMode | null> { // изменено на getDrivingMode
  try {
    const res = await fetch(`/api/modes/${id}`, { // изменён URL
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

// Функция для добавления режима в заявку
export async function addModeToApplication(
    modeId: number, // изменено с tireId
): Promise<{ ok: true } | { ok: false; status: number; message?: string }> {
  const token = localStorage.getItem("token");
  if (!token) {
    return { ok: false, status: 401, message: "Войдите в систему, чтобы добавить режим в заявку." };
  }
  try {
    const res = await fetch(`/api/fuel_consumption_mode/add/${modeId}`, { // изменён URL
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok || res.status === 201) return { ok: true };
    let message: string | undefined;
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      message = j.error ?? j.message;
    } catch {
      message = await res.text();
    }
    return { ok: false, status: res.status, message: message || `HTTP ${res.status}` };
  } catch {
    return { ok: false, status: 0, message: "Не удалось выполнить запрос." };
  }
}