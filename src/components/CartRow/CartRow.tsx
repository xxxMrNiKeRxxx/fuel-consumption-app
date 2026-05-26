// src/components/CartRow/CartRow.tsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchFuelConsumptionCart } from "../../store/slices/FuelConsumptionSlice";
import cartIcon from "../../assets/logo.png";
import "./CartRow.css";

export default function ApplicationRow() {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector((s) => s.user);
    const { cart, cartLoading } = useAppSelector((s) => s.fuelConsumption);

    useEffect(() => {
        if (isAuthenticated) void dispatch(fetchFuelConsumptionCart());
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        const handleUpdate = () => void dispatch(fetchFuelConsumptionCart());
        window.addEventListener("fuel-consumption-cart-updated", handleUpdate);
        return () => window.removeEventListener("fuel-consumption-cart-updated", handleUpdate);
    }, [dispatch]);

    const count = isAuthenticated ? (cart?.modes_count ?? 0) : 0;
    const validId = cart?.consumption_id && cart.consumption_id > 0 ? cart.consumption_id : undefined;

    // ✅ Активна только если есть черновик
    const isDraft = cart?.status === "черновик" || (cart?.status === undefined && count > 0);
    const isActive = isAuthenticated && validId != null && count > 0 && isDraft;

    return (
        <div className={`cart-badge ${isActive ? "" : "cart-inactive"}`}>
            {isActive ? (
                <Link to={`/fuel-consumption/${validId}`} className="cart-link">
                    <img src={cartIcon} alt="Заявка" className="cart-icon" />
                    {count > 0 && <span className="cart-count">{count}</span>}
                </Link>
            ) : (
                <span className="cart-link" style={{ cursor: "default" }}>
          <img src={cartIcon} alt="Заявка" className="cart-icon" style={{ opacity: 0.5 }} />
                    {count > 0 && <span className="cart-count" style={{ background: "#6c757d" }}>{count}</span>}
        </span>
            )}
        </div>
    );
}