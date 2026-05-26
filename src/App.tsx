// src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ModesPage from "./pages/ModesPage/ModesPage";
import ModeDetailPage from "./pages/ModeDetailPage/ModeDetailPage";
import SignInPage from "./pages/SignInPage/SignInPage";
import SignUpPage from "./pages/SignUpPage/SignUpPage"; // ✅ Исправлен регистр: SignUpPage
import FuelConsumptionPage from "./pages/FuelConsumptionPage/FuelConsumptionPage";
import FuelConsumptionsPage from "./pages/FuelConsumptionsPage/FuelConsumptionsPage";
import { ROUTES } from "./Routes.ts";
import MainLayout from "./layouts/MainLayout";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index_style.css";
import "./theme-1c.css";
import "./index.css";

function App() {
    console.log("🔍 ROUTES.SIGN_IN =", ROUTES.SIGN_IN); // Должно быть: "/sign-in"
    console.log("🔍 ROUTES.SIGN_UP =", ROUTES.SIGN_UP); // Должно быть: "/sign-up"\

    const basename = import.meta.env.BASE_URL;


    return (
        <BrowserRouter basename={basename}>
        <Routes>

                {/* === Страницы БЕЗ общего лейаута (авторизация) === */}
                <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
                <Route path={ROUTES.SIGN_UP} element={<SignUpPage />} />

                {/* === Страницы ВНУТРИ общего лейаута (MainLayout) === */}
                <Route element={<MainLayout />}>

                    {/* Публичные страницы */}
                    <Route path={ROUTES.MODES} element={<ModesPage />} />
                    <Route path={ROUTES.MODE_DETAIL} element={<ModeDetailPage />} />

                    {/* Страницы заявок (защита внутри компонентов) */}
                    <Route path={ROUTES.FUEL_CONSUMPTIONS} element={<FuelConsumptionsPage />} />
                    <Route path={ROUTES.FUEL_CONSUMPTION_DETAIL} element={<FuelConsumptionPage />} />

                </Route>

                {/* === Редиректы === */}
                <Route path="/modes" element={<Navigate to={ROUTES.MODES} replace />} />
                <Route index element={<Navigate to={ROUTES.MODES} replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;