// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Использует localStorage браузера
import { combineReducers } from "redux";

import userReducer from "./slices/userSlice";
import fuelConsumptionReducer from "./slices/FuelConsumptionSlice";
import servicesReducer from "./slices/modesSlice";

// 🔹 Конфигурация персиста (сохранения)
const persistConfig = {
  key: "root", // Ключ в localStorage
  storage,     // Где хранить (localStorage)
  whitelist: ["services"], // 🔹 Сохраняем ТОЛЬКО срез services (там лежат фильтры поиска)
};

// Объединяем редьюсеры
const rootReducer = combineReducers({
  user: userReducer,
  fuelConsumption: fuelConsumptionReducer,
  services: servicesReducer,
});

// Оборачиваем общий редьюсер
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  // Отключаем проверку сериализуемости, так как redux-persist может хранить специфичные данные
  middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
});

// Экспортируем persistor для использования в main.tsx
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;