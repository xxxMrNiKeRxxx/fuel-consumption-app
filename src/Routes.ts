// src/Routes.tsx

export const ROUTES = {
  MODES: "/modes",                              // Главная — каталог режимов
  MODE_DETAIL: "/mode/:id",                // Детали режима
  FUEL_CONSUMPTION_DETAIL: "/fuel-consumption/:id",  // Детали заявки
  SIGN_IN: "/sign-in",                     // Авторизация
  SIGN_UP: "/sign-up",                     // Регистрация
  FUEL_CONSUMPTIONS: "/fuel-consumptions", // Список заявок пользователя
} as const;

export type RouteKeyType = keyof typeof ROUTES;

export const ROUTE_LABELS: { [key in RouteKeyType]: string } = {
  MODES: "Каталог режимов",
  MODE_DETAIL: "Режим",
  FUEL_CONSUMPTION_DETAIL: "Заявка на расчёт",
  SIGN_IN: "Вход",
  SIGN_UP: "Регистрация",
  FUEL_CONSUMPTIONS: "Мои заявки",
};