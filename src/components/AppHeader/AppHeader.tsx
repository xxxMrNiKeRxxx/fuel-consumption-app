// src/components/AppHeader/AppHeader.tsx
import { type MouseEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logoutUser } from "../../store/slices/userSlice";
import { ROUTES } from "../../Routes.ts";
import logo from "../../assets/logo.jpg";
import "./AppHeader.css";

export default function AppHeader() {
    const { isAuthenticated, login } = useAppSelector((s) => s.user);
    const dispatch = useAppDispatch();

    // 🔹 Переключение мобильного меню
    const handleBurgerClick = (event: MouseEvent<HTMLDivElement>) => {
        event.currentTarget.classList.toggle("active");
    };

    // 🔹 Закрытие меню при клике на ссылку (мобильные)
    const handleMenuLinkClick = () => {
        const burger = document.querySelector(".app-header__mobile-wrapper");
        burger?.classList.remove("active");
    };

    // 🔹 Выход из системы
    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        void dispatch(logoutUser());
        handleMenuLinkClick(); // Закрыть мобильное меню после выхода
    };

    return (
        <header className="app-header">
            <div className="app-header__wrapper">

                {/* === Логотип === */}
                <div className="app-header__logo">
                    <NavLink to={ROUTES.MODES} className="app-header__logo-link" onClick={handleMenuLinkClick}>
                        <img src={logo} alt="Логотип" className="app-header__logo-img" />
                    </NavLink>
                </div>

                {/* === Десктопное меню === */}
                <nav className="app-header__nav" aria-label="Основная навигация">
                    <NavLink
                        to={ROUTES.MODES}
                        className="app-header__link"
                        end
                        onClick={handleMenuLinkClick}
                    >
                        Режимы
                    </NavLink>

                    {isAuthenticated ? (
                        <>
                            <NavLink
                                to={ROUTES.FUEL_CONSUMPTIONS}
                                className="app-header__link"
                                onClick={handleMenuLinkClick}
                            >
                                Заявки
                            </NavLink>

                            <span className="app-header__username" title={login}>
                {login?.slice(0, 16)}{login && login.length > 16 ? "…" : ""}
              </span>

                            <Link
                                to={ROUTES.MODES}
                                className="app-header__link app-header__link--logout"
                                onClick={handleLogout}
                            >
                                Выход
                            </Link>
                        </>
                    ) : (
                        <>
                            <NavLink
                                to={ROUTES.SIGN_IN}
                                className="app-header__link"
                                onClick={handleMenuLinkClick}
                            >
                                Вход
                            </NavLink>
                            <NavLink
                                to={ROUTES.SIGN_UP}
                                className="app-header__link"
                                onClick={handleMenuLinkClick}
                            >
                                Регистрация
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* === Мобильный бургер + выпадающее меню === */}
                <div
                    className="app-header__mobile-wrapper"
                    onClick={handleBurgerClick}
                    aria-label="Меню"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleBurgerClick(e as unknown as MouseEvent<HTMLDivElement>); }}
                >
                    <div className="app-header__burger">
                        <span className="app-header__burger-line" />
                        <span className="app-header__burger-line" />
                        <span className="app-header__burger-line" />
                    </div>

                    <div className="app-header__mobile-menu" onClick={(e) => e.stopPropagation()}>
                        <NavLink
                            to={ROUTES.MODES}
                            className="app-header__link"
                            end
                            onClick={handleMenuLinkClick}
                        >
                            Режимы
                        </NavLink>

                        {isAuthenticated ? (
                            <>
                                <NavLink
                                    to={ROUTES.FUEL_CONSUMPTIONS}
                                    className="app-header__link"
                                    onClick={handleMenuLinkClick}
                                >
                                    Заявки
                                </NavLink>

                                <span className="app-header__username app-header__username--mobile">
                  {login}
                </span>

                                <Link
                                    to={ROUTES.MODES}
                                    className="app-header__link app-header__link--logout"
                                    onClick={handleLogout}
                                >
                                    Выход
                                </Link>
                            </>
                        ) : (
                            <>
                                <NavLink
                                    to={ROUTES.SIGN_IN}
                                    className="app-header__link"
                                    onClick={handleMenuLinkClick}
                                >
                                    Вход
                                </NavLink>
                                <NavLink
                                    to={ROUTES.SIGN_UP}
                                    className="app-header__link"
                                    onClick={handleMenuLinkClick}
                                >
                                    Регистрация
                                </NavLink>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </header>
    );
}