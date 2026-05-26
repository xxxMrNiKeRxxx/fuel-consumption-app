// src/layouts/MainLayout.tsx

import { Outlet, useLocation, matchPath } from "react-router-dom";
import AppHeader from "../components/AppHeader/AppHeader";
import { Breadcrumbs, type ICrumb } from "../components/BreadCrumbs/BreadCrumbs";
import { ROUTES } from "../Routes.ts";
import { getMockMode } from "../modules/mock";

// ✅ Выносим вычисление крошек в чистую функцию (тестируемо и чисто)
function computeCrumbs(pathname: string): ICrumb[] {
  // Главная / Список режимов
  if (pathname === ROUTES.MODES || pathname === "/") {
    return [{ label: "Режимы", to: ROUTES.MODES }];
  }

  // Детальная страница режима
  const modeMatch = matchPath(ROUTES.MODE_DETAIL, pathname);
  if (modeMatch?.params.id) {
    const mode = getMockMode(Number(modeMatch.params.id));
    const title = mode?.mode_name ?? `Режим #${modeMatch.params.id}`;
    return [
      { label: "Режимы", to: ROUTES.MODES },
      { label: title },
    ];
  }

  // Страница заявки (детали)
  const applicationMatch = matchPath(ROUTES.FUEL_CONSUMPTION_DETAIL, pathname);
  if (applicationMatch?.params.id) {
    const appId = applicationMatch.params.id;
    const appTitle = appId ? `Заявка №${appId}` : "Заявка";
    return [
      { label: "Режимы", to: ROUTES.MODES },
      { label: appTitle },
    ];
  }

  // Страница списка заявок пользователя
  if (pathname === ROUTES.FUEL_CONSUMPTIONS) {
    return [
      { label: "Режимы", to: ROUTES.MODES },
      { label: "Мои заявки" },
    ];
  }

  // Страницы авторизации
  if (pathname === ROUTES.SIGN_IN || pathname === ROUTES.SIGN_UP) {
    return [
      { label: "Режимы", to: ROUTES.MODES },
      { label: pathname === ROUTES.SIGN_IN ? "Вход" : "Регистрация" },
    ];
  }

  // Fallback для неизвестных маршрутов
  return [{ label: "Режимы", to: ROUTES.MODES }, { label: "Страница" }];
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const crumbs = computeCrumbs(pathname); // ✅ Чисто, тестируемо, без побочных эффектов

  return (
      <div className="main-layout">
        <AppHeader />
        <Breadcrumbs crumbs={crumbs} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
  );
}