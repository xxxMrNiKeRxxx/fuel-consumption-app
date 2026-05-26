// src/pages/FuelConsumptionsPage/FuelConsumptionsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Button, Form, Card, Row, Col, Badge } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchFuelConsumptionsList,
  finishFuelConsumptionApplication,
  setListFilters,
} from "../../store/slices/FuelConsumptionSlice";
import { ROUTES } from "../../Routes";
import "./FuelConsumptionsPage.css";

function statusLabel(s: string | undefined): string {
  const m: Record<string, string> = {
    "черновик": "Черновик",
    "сформирован": "Сформирована",
    "завершён": "Завершена",
    "отклонен": "Отклонена",
  };
  return s ? (m[s] ?? s) : "—";
}

function statusVariant(s: string | undefined): string {
  switch (s) {
    case "сформирован": return "warning";
    case "завершён": return "success";
    case "отклонен": return "danger";
    default: return "secondary";
  }
}

// 🔹 Форматирование дат в RU
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

export default function FuelConsumptionsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isModerator, login } = useAppSelector((s) => s.user);
  const { list, listLoading, listError, filters, itemMutationLoading } = useAppSelector(
      (s) => s.fuelConsumption,
  );

  // 🔹 Дефолт: СЕГОДНЯ
  const today = new Date().toISOString().split("T")[0];
  const [draftFrom, setDraftFrom] = useState(filters.fromDate || today);
  const [draftTo, setDraftTo] = useState(filters.toDate || today);
  const [draftStatus, setDraftStatus] = useState(filters.status || "");
  const [theme, setTheme] = useState("");

  useEffect(() => {
    setDraftFrom(filters.fromDate || today);
    setDraftTo(filters.toDate || today);
    setDraftStatus(filters.status || "");
  }, [filters.fromDate, filters.toDate, filters.status]);

  const load = useCallback(() => {
    void dispatch(fetchFuelConsumptionsList());
  }, [dispatch]);

  // 🔹 POLLING: обновление каждые 10 секунд
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.SIGN_IN, { replace: true });
      return;
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, navigate, load]);

  // 🔹 Слушаем ручное обновление
  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener("fuel-consumption-cart-updated", handleUpdate);
    return () => window.removeEventListener("fuel-consumption-cart-updated", handleUpdate);
  }, [load]);

  // 🔹 Фильтрация: скрыть черновики + фильтр по теме
  const visible = useMemo(() => {
    return list.filter((row: any) => {
      if (row.status === "черновик") return false; // ✅ ЧЕРНОВИКИ НЕ ПОКАЗЫВАТЬ
      if (theme.trim()) {
        const q = theme.toLowerCase();
        const matchesTheme =
            (row.origin ?? "").toLowerCase().includes(q) ||
            (row.destination ?? "").toLowerCase().includes(q) ||
            (row.creator_login ?? "").toLowerCase().includes(q);
        if (!matchesTheme) return false;
      }
      return true;
    });
  }, [list, theme]);

  const handleApplyFilters = () => {
    dispatch(
        setListFilters({
          fromDate: draftFrom,
          toDate: draftTo,
          status: draftStatus,
        }),
    );
    void dispatch(fetchFuelConsumptionsList());
  };

  const goToFuelConsumption = (id: number | undefined) => {
    if (id != null) navigate(`/fuel-consumption/${id}`);
  };

  const finishAction = (id: number, status: "завершён" | "отклонён") => {
    const key = `finish-${id}`;
    if (itemMutationLoading[key]) return;
    void dispatch(finishFuelConsumptionApplication({ consumptionId: id, status }));
  };

  if (!isAuthenticated) return null;

  return (
      <div className="fuel-consumptions-page">
        <div className="fuel-consumptions-page__inner">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0">
              {isModerator ? "🛡️ Заявки (модератор)" : "👤 Мои заявки"}
              {login && <span className="ms-2 text-muted">({login})</span>}
            </h2>
            <Badge bg="primary" className="fs-6">
              Найдено: {visible.length}
            </Badge>
          </div>

          {/* 🔹 Панель фильтров */}
          <Card className="mb-4">
            <Card.Body>
              <Row className="g-2 align-items-end">
                <Col xs={12} md={3}>
                  <Form.Label>Дата формирования (от)</Form.Label>
                  <Form.Control type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label>Дата формирования (до)</Form.Label>
                  <Form.Control type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
                </Col>
                <Col xs={12} md={2}>
                  <Form.Label>Статус</Form.Label>
                  <Form.Select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                    <option value="">Все</option>
                    <option value="сформирован">Сформирована</option>
                    <option value="завершён">Завершена</option>
                    <option value="отклонен">Отклонена</option>
                  </Form.Select>
                </Col>
                <Col xs={12} md={2}>
                  <Form.Label>Поиск (тема/город)</Form.Label>
                  <Form.Control placeholder="Москва, СПб..." value={theme} onChange={(e) => setTheme(e.target.value)} />
                </Col>
                <Col xs={12} md={2}>
                  <Button variant="primary" className="w-100" onClick={handleApplyFilters}>Применить</Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {listError && <div className="alert alert-danger">{listError}</div>}

          {listLoading && visible.length === 0 ? (
              <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : null}

          {/* 🔹 КАРТОЧКИ вместо таблицы */}
          <Row className="g-3">
            {visible.map((row: any) => {
              const id = row.consumption_id;
              return (
                  <Col key={id ?? Math.random()} xs={12} md={6} lg={4}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <h5 className="mb-0">Заявка #{id}</h5>
                          <Badge bg={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </div>
                        <p className="text-muted small mb-1">
                          📅 Создана: {formatDate(row.date_create || row.created_at)}<br/>
                          Режимов: <strong>{row.fuel_entries_count ?? row.modes_count ?? 0}</strong><br/>
                          💰 Экономия: <strong>{(row.total_saved ?? 0).toFixed(2)} ₽</strong><br/>
                          📍 {row.origin ?? "—"} → {row.destination ?? "—"}
                        </p>
                        <Button variant="outline-primary" size="sm" onClick={() => goToFuelConsumption(id)}>
                          Открыть
                        </Button>
                      </Card.Body>
                      {isModerator && row.status === "сформирован" && (
                          <Card.Footer className="bg-white d-flex gap-2">
                            <Button size="sm" variant="success" className="flex-grow-1" onClick={() => finishAction(id, "завершён")}>✅ Завершить</Button>
                            <Button size="sm" variant="danger" className="flex-grow-1" onClick={() => finishAction(id, "отклонён")}>❌ Отклонить</Button>
                          </Card.Footer>
                      )}
                    </Card>
                  </Col>
              );
            })}
          </Row>

          {!listLoading && visible.length === 0 && (
              <div className="text-center py-5 text-muted">Нет заявок по текущим условиям.</div>
          )}
        </div>
      </div>
  );
}