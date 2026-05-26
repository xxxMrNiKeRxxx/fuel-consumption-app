// src/components/ModeCard/ModeCard.tsx
import { Link } from "react-router-dom";
import { useEffect, useState, type MouseEvent } from "react";
import type { DrivingMode } from "../../modules/modeApi";
import { resolveMediaUrl, fallbackImageUrl } from "../../modules/modeApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addModeToCart } from "../../store/slices/FuelConsumptionSlice";
import "./ModeCard.css";

interface ModeCardProps {
    mode: DrivingMode;
}

const CART_UPDATED = "fuel-consumption-cart-updated";

export default function ModeCard({ mode }: ModeCardProps) {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((s) => s.user);
    const applicationMutationLoading = useAppSelector((s) => s.fuelConsumption.applicationMutationLoading);

    const [imageError, setImageError] = useState(false);
    const [imageUrl, setImageUrl] = useState(resolveMediaUrl(mode.image_key || ""));
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        setImageError(false);
        setImageUrl(resolveMediaUrl(mode.image_key || ""));
    }, [mode.image_key]);

    const handleImageError = () => setImageError(true);

    const handleAdd = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) return;

        setAdding(true);
        try {
            await dispatch(addModeToCart(mode.mode_id!)).unwrap();
            window.dispatchEvent(new Event(CART_UPDATED));
        } catch {
            void 0;
        } finally {
            setAdding(false);
        }
    };

    const busy = adding || applicationMutationLoading;
    const displayUrl = imageError ? fallbackImageUrl() : imageUrl;

    // 🔹 Универсальные геттеры для полей (поддерживают разные названия от бэкенда)
    const getModeName = () => mode.mode_name || mode.name || (mode as any).modeName || mode.mode_title || `Режим #${mode.mode_id}`;
    const getPrice = () => mode.price ?? (mode as any).cost ?? (mode as any).savings ?? (mode as any).price_rub ?? 0;
    const getBaseConsumption = () => mode.base_consumption ?? (mode as any).consumption ?? (mode as any).baseConsumption ?? 0;
    const getEconomyPercent = () => mode.economy_percent ?? (mode as any).economy ?? (mode as any).savings_percent ?? (mode as any).economyPercent ?? 0;

    const badgeClass = mode.driving_type === "city" ? "mode-badge mode-badge--city" : mode.driving_type === "highway" ? "mode-badge mode-badge--highway" : "mode-badge mode-badge--mixed";
    const badgeText = mode.driving_type === "city" ? "ГОРОД" : mode.driving_type === "highway" ? "ТРАССА" : "СМЕШАННЫЙ";

    return (
        <div className="mode-card">
            <div className="mode-card__image-wrapper">
                <Link to={`/mode/${mode.mode_id}`} className="mode-card__link">
                    <img src={displayUrl} alt={getModeName()} className="mode-card__image" onError={handleImageError} />
                    <span className={badgeClass}>{badgeText}</span>
                </Link>
            </div>

            <div className="mode-card__content">
                <h3 className="mode-card__title">
                    <Link to={`/mode/${mode.mode_id}`} className="mode-card__link">{getModeName()}</Link>
                </h3>

                <div className="mode-card__specs">
                    <div className="spec-item">
                        <span className="spec-icon">⛽</span>
                        <span className="spec-value">{getBaseConsumption()} л/100км</span>
                    </div>
                    <div className="spec-item">
                        <span className="spec-icon">💰</span>
                        <span className="spec-value">Экономия: {getEconomyPercent()}%</span>
                    </div>
                    <div className="spec-item">
                        <span className="spec-icon">₽</span>
                        <span className="spec-value">{getPrice()} ₽</span>
                    </div>
                </div>

                {mode.description && <p className="mode-card__description">{mode.description}</p>}

                <button type="button" className="mode-card__btn" onClick={handleAdd} disabled={!isAuthenticated || busy} title={!isAuthenticated ? "Войдите, чтобы добавить в заявку" : ""}>
                    {busy ? "Добавление…" : isAuthenticated ? "Добавить в заявку" : "Войдите в аккаунт для расчета"}
                </button>
            </div>
        </div>
    );
}