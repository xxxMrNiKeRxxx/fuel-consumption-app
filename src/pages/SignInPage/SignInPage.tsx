// src/pages/SignInPage/SignInPage.tsx (DEBUG-версия)
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loginUser } from "../../store/slices/userSlice";
import { ROUTES } from "../../Routes.ts";
import "./SignInPage.css";

export default function SignInPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.user);
  const [form, setForm] = useState({ login: "", password: "" });

  // 🔹 Лог редиректа
  useEffect(() => {
    console.log("🔍 [SignInPage] isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      console.log("🔄 [SignInPage] Редирект на", ROUTES.MODES);
      navigate(ROUTES.MODES, { replace: true }); // ✅ Заменено с ROUTES.TIRES
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔹 [handleSubmit] Кнопка нажата");
    console.log("🔹 [handleSubmit] Form data:", form);

    // Проверка 1: не пустые ли поля
    if (!form.login || !form.password) {
      console.log("🚫 [handleSubmit] Блокировка: пустые поля");
      return;
    }
    console.log("✅ [handleSubmit] Валидация пройдена");

    // Проверка 2: не заблокирована ли кнопка (на всякий случай)
    if (loading) {
      console.log("🚫 [handleSubmit] Блокировка: loading === true");
      return;
    }

    try {
      console.log("📤 [handleSubmit] Вызываю dispatch(loginUser)...");
      const result = await dispatch(loginUser(form)).unwrap();
      console.log("✅ [handleSubmit] Успех! Результат:", result);
      navigate(ROUTES.MODES, { replace: true }); // ✅ Заменено с ROUTES.TIRES
    } catch (err) {
      console.log("❌ [handleSubmit] Ошибка в catch:", err);
    }
  };

  // 🔹 Лог рендера
  console.log("🎨 [SignInPage] Render, loading:", loading, "error:", error);

  return (
      <div className="auth-page">
        <div className="auth-page__panel">
          <h1 className="auth-page__title">Вход в систему</h1>

          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-page__form">
            <label className="auth-page__label" htmlFor="signin-login">Логин</label>
            <input
                id="signin-login"
                className="auth-page__input"
                type="text"
                value={form.login}
                onChange={(e) => {
                  console.log("✏️ [Input] Login changed:", e.target.value);
                  setForm({ ...form, login: e.target.value });
                }}
                required
                disabled={loading}
                autoComplete="username"
            />

            <label className="auth-page__label" htmlFor="signin-password">Пароль</label>
            <input
                id="signin-password"
                className="auth-page__input"
                type="password"
                value={form.password}
                onChange={(e) => {
                  console.log("✏️ [Input] Password changed:", e.target.value);
                  setForm({ ...form, password: e.target.value });
                }}
                required
                disabled={loading}
                autoComplete="current-password"
            />

            <button
                type="submit"
                className="auth-page__submit"
                disabled={loading}
                onClick={() => console.log("🖱️ [Button] Click event fired")}
            >
              {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="auth-page__spinner" /> Вход…
                  </>
              ) : (
                  "Войти"
              )}
            </button>
          </form>

          <p className="auth-page__footer">
            Нет аккаунта? <Link to={ROUTES.SIGN_UP}>Регистрация</Link>
          </p>
        </div>
      </div>
  );
}