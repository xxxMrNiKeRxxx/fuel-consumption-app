// src/modules/mock.ts

import {
  type DrivingMode, // замените на ваш тип для режима
  type FuelConsumptionCart,
  type FuelConsumptionDetailResponse,
} from "./modeApi"; // замените на ваш путь к API

// Импорты изображений (замените на ваши)
import firstPhoto from "../assets/default_image.png";
import firstVideo from "../assets/default_video.mp4";


// Моковый список режимов
export const DrivingModeS_MOCK: DrivingMode[] = [
  {
    mode_id: 1,
    mode_name: "Городской режим - Компактный",
    description: "Расчет экономии топлива для городского режима движения.",
    short_description_en: "Compact car in city traffic, low-speed urban driving",
    image_key: firstPhoto, // используем imageKey из Mode
    video_key: firstVideo, // если ваш тип Mode поддерживает videoKey
    base_consumption: 8.0,
    economy_percent: 5.0,
    driving_type: "city",
    price: 55.0, // добавлено для согласования с Mode

  },
  {
    mode_id: 2,
    mode_name: "Городской режим - Седан",
    description: "Расчет экономии топлива для городского режима на седанах.",
    short_description_en: "Sedan driving in city, stop-and-go traffic conditions",
    image_key: firstPhoto,
    video_key: firstVideo,
    base_consumption: 10.0,
    economy_percent: 5.0,
    driving_type: "city",
    price: 55.0,

  },
  {
    mode_id: 3,
    mode_name: "Трасса - Компактный",
    description: "Расчет экономии топлива для трассы на компактных автомобилях.",
    short_description_en: "Compact car on highway, steady speed, open road",
    image_key: firstPhoto,
    video_key: firstVideo,
    base_consumption: 6.0,
    economy_percent: 15.0,
    driving_type: "highway",
    price: 62.5,
  },
  {
    mode_id: 4,
    mode_name: "Трасса - Внедорожник",
    description: "Расчет экономии топлива для трассы на внедорожниках.",
    short_description_en: "SUV on highway, high-speed cruising, clear weather",
    image_key: firstPhoto,
    video_key: firstVideo,
    base_consumption: 12.0,
    economy_percent: 15.0,
    driving_type: "highway",
    price: 62.5,
  },
  {
    mode_id: 5,
    mode_name: "Смешанный режим - Седан",
    description: "Расчет экономии топлива для смешанного режима движения.",
    short_description_en: "Sedan in mixed urban/rural route, variable speed",
    image_key: firstPhoto,
    video_key: firstVideo,
    base_consumption: 9.0,
    economy_percent: 10.0,
    driving_type: "mixed",
    price: 58.0,
  },
  {
    mode_id: 6,
    mode_name: "Смешанный режим - Грузовой",
    description: "Расчет экономии топлива для смешанного режима на грузовых автомобилях.",
    short_description_en: "Cargo truck on mixed road: city + highway segments",
    image_key: firstPhoto,
    video_key: firstVideo,
    base_consumption: 15.0,
    economy_percent: 10.0,
    driving_type: "mixed",
    price: 58.0,
  },
];

// Моковая корзина/черновик заявки
export const MOCK_CART: FuelConsumptionCart = {
  consumption_id: 1, // заменено с tire_pressure_id
  modes_count: 0, // заменено с tires_count
  // при необходимости можно добавить другие поля
};

// Моковая детализация заявки
export const MOCK_FUEL_CONSUMPTION_DETAIL: FuelConsumptionDetailResponse = {
  consumption: {
    consumption_id: 1,
    status: "черновик",
    created_at: "2026-04-01T10:00:00Z",
    completed_at: null,
    creator_login: "demo_user",
    moderator_login: null,
    fuel_price: 55.0,
    total_saved: 0, // например, рассчитывается бэкендом
    origin: "Москва",
    destination: "СПб",
  },
  modes: [], // будет заполнено при добавлении режимов
};

// Функция получения режима по ID
export function getMockMode(id: number): DrivingMode | undefined {
  return DrivingModeS_MOCK.find((mode) => mode.mode_id === id);
}

// Функция фильтрации режимов по названию
export function filterMockModesByName(name: string): DrivingMode[] { // изменено с filterMockTiresByTitle
  const n = name.trim().toLowerCase();
  if (!n) return [...DrivingModeS_MOCK];
  return DrivingModeS_MOCK.filter((mode) => // изменено с tire
      mode.mode_name.toLowerCase().includes(n) // изменено с tire_title
  );
}

// Функция добавления режима в черновик (заглушка)
export async function addModeToMockCart(modeId: number): Promise<{ ok: true } | { ok: false; message?: string }> {
  // В реальном проекте это будет вызов API
  console.log(`Добавление режима ${modeId} в черновик`);
  return { ok: true };
}