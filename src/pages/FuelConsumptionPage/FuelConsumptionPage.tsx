// src/pages/FuelConsumptionPage/FuelConsumptionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Spinner, Alert } from "react-bootstrap";
import { fallbackImageUrl, resolveMediaUrl, type DrivingMode } from "../../modules/modeApi";
import { DrivingModeS_MOCK } from "../../modules/mock";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchFuelConsumptionDetail,
  updateFuelConsumptionParams,
  updateFuelModeEntryInApplication,
  removeFuelModeEntryFromApplication,
  formFuelConsumptionApplication,
  deleteFuelConsumptionApplication,
} from "../../store/slices/FuelConsumptionSlice";
import { ROUTES } from "../../Routes";
import "./FuelConsumptionPage.css";

export default function FuelConsumptionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { isAuthenticated } = useAppSelector((s) => s.user);
  const { detail, detailLoading, detailError, applicationMutationLoading, itemMutationLoading } = useAppSelector(
      (s) => s.fuelConsumption
  );

  const [modes] = useState<DrivingMode[]>(DrivingModeS_MOCK);
  const modeById = useMemo(() => {
    const m = new Map<number, DrivingMode>();
    modes.forEach((mode) => m.set(mode.mode_id, mode));
    return m;
  }, [modes]);

  const [fuelPriceDraft, setFuelPriceDraft] = useState<string>("");
  const [originDraft, setOriginDraft] = useState<string>("");
  const [destinationDraft, setDestinationDraft] = useState<string>("");
  const [distanceDrafts, setDistanceDrafts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    const appId = Number(id);
    if (Number.isNaN(appId)) return;
    void dispatch(fetchFuelConsumptionDetail(appId));
  }, [id, isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) navigate(ROUTES.SIGN_IN, { replace: true });
  }, [isAuthenticated, navigate]);

  const app = detail?.consumption;
  useEffect(() => {
    if (app) {
      setFuelPriceDraft(app.fuel_price?.toString() ?? "");
      setOriginDraft(app.origin ?? "");
      setDestinationDraft(app.destination ?? "");
      const initial: Record<number, number> = {};
      detail?.entries?.forEach((e) => {
        if (e.mode_id != null) initial[e.mode_id] = e.route_distance ?? 0;
      });
      setDistanceDrafts(initial);
    }
  }, [app?.consumption_id, app?.fuel_price, app?.origin, app?.destination, detail?.entries]);

  const sortedEntries = useMemo(() => {
    if (!detail?.entries) return [];
    return [...detail.entries].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }, [detail?.entries]);

  const isDraft = app?.status === "черновик";
  const consumptionId = app?.consumption_id ?? 1;

  const handleSaveAppParams = async () => {
    if (!consumptionId || !isDraft || !app) return;
    const fuelPrice = fuelPriceDraft.trim() === "" ? null : Number(fuelPriceDraft);
    if (fuelPrice && Number.isNaN(fuelPrice)) return;
    try {
      await dispatch(updateFuelConsumptionParams({ consumptionId, body: { fuel_price: fuelPrice ?? undefined, origin: originDraft || undefined, destination: destinationDraft || undefined } })).unwrap();
    } catch (err) {
      console.error("Ошибка сохранения параметров:", err);
    }
  };

  const handleSaveEntry = async (modeId: number, distance: number) => {
    if (!consumptionId || !isDraft) return;
    try {
      await dispatch(updateFuelModeEntryInApplication({ modeId, consumptionId, body: { route_distance: distance } })).unwrap();
      setDistanceDrafts(prev => ({ ...prev, [modeId]: distance }));
    } catch (err) { console.error(err); }
  };

  const handleRemoveEntry = async (modeId: number) => {
    if (!consumptionId || !isDraft || !window.confirm("Убрать этот режим?")) return;
    try { await dispatch(removeFuelModeEntryFromApplication({ modeId, consumptionId })).unwrap(); }
    catch (err) { console.error(err); }
  };

  const handleForm = async () => {
    if (!consumptionId || !isDraft) return;
    try { await dispatch(formFuelConsumptionApplication(consumptionId)).unwrap(); }
    catch (err) { console.error(err); }
  };

  const handleDeleteApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumptionId || !isDraft || !window.confirm("Удалить заявку?")) return;
    try {
      await dispatch(deleteFuelConsumptionApplication(consumptionId)).unwrap();
      navigate(ROUTES.MODES, { replace: true });
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated) return null;
  if (detailLoading && !detail) return <div className="p-5 text-center"><Spinner animation="border" /></div>;
  if (detailError && !detail) return <div className="p-5"><Alert variant="danger">{detailError}</Alert></div>;
  if (!detail || !app) return <div className="p-5"><Alert variant="warning">Заявка не найдена.</Alert></div>;

  const statusLabel = app.status === "черновик" ? "Черновик" : app.status === "сформирован" ? "Сформирована" : app.status === "завершён" ? "Завершена" : "Отклонена";

  return (
      <div className="fuel-consumption-page">
        <div className="fuel-consumption-detail">
          <div className="fuel-consumption-detail__header-card">
            <h1 className="fuel-consumption-detail__title">ЗАЯВКА #{consumptionId}</h1>
            <div className="fuel-consumption-detail__info">
              <div className="fuel-consumption-detail__info-item"><span className="field-label">ID:</span><span className="field-value">{consumptionId}</span></div>
              <div className="fuel-consumption-detail__info-item"><span className="field-label">Дата:</span><span className="field-value">{app.created_at ? new Date(app.created_at).toLocaleDateString("ru-RU") : "—"}</span></div>
              <div className="fuel-consumption-detail__info-item"><span className="field-label">Откуда:</span><span className="field-value">{app.origin || "—"}</span></div>
              <div className="fuel-consumption-detail__info-item"><span className="field-label">Куда:</span><span className="field-value">{app.destination || "—"}</span></div>
              <div className="fuel-consumption-detail__info-item result"><span className="field-label">📊 Экономия:</span><span className="field-value">{app.total_saved != null ? `${app.total_saved.toFixed(2)} ₽` : "—"}</span></div>
              <div className="fuel-consumption-detail__info-item"><span className="field-label">Статус:</span><span className="field-value status">{statusLabel}</span></div>
              {app.creator_login && <div className="fuel-consumption-detail__info-item"><span className="field-label">Автор:</span><span className="field-value">{app.creator_login}</span></div>}
            </div>
          </div>

          {isDraft && (
              <>
                <div className="calculation-params">
                  <h3>Параметры расчёта</h3>
                  <div className="params-row">
                    <div className="param-group"><label>Цена топлива (₽/л)</label><Form.Control type="number" step="0.1" value={fuelPriceDraft} onChange={(e) => setFuelPriceDraft(e.target.value)} disabled={applicationMutationLoading} /></div>
                    <div className="param-group"><label>Откуда</label><Form.Control type="text" value={originDraft} onChange={(e) => setOriginDraft(e.target.value)} disabled={applicationMutationLoading} /></div>
                    <div className="param-group"><label>Куда</label><Form.Control type="text" value={destinationDraft} onChange={(e) => setDestinationDraft(e.target.value)} disabled={applicationMutationLoading} /></div>
                  </div>
                  <div className="text-end mt-3">
                    <Button variant="primary" size="sm" onClick={handleSaveAppParams} disabled={applicationMutationLoading}>Сохранить параметры</Button>
                  </div>
                </div>
                <div className="fuel-consumption-page__actions fuel-consumption-page__actions--top">
                  <Button variant="success" className="me-2" onClick={handleForm} disabled={applicationMutationLoading || sortedEntries.length === 0}>Подтвердить заявку</Button>
                  <Button variant="danger" onClick={handleDeleteApplication} disabled={applicationMutationLoading}>🗑️ Удалить</Button>
                </div>
              </>
          )}

          <div className="fuel-consumption-table-wrapper">
            <table className="fuel-consumption-table">
              <thead>
              <tr>
                <th className="col-image">Фото</th>
                <th className="col-mode">Режим</th>
                <th className="col-type">Тип</th>
                <th className="col-consumption">Расход</th>
                <th className="col-distance">Длина (км)</th>
                <th className="col-fuel">Экономия</th>
                {isDraft && <th className="col-actions">Действия</th>}
              </tr>
              </thead>
              <tbody>
              {sortedEntries.map((entry) => {
                const mode = modeById.get(entry.mode_id);
                const rawImage = entry.image_key || mode?.image_key || "";
                const draftKey = entry.mode_id ?? 0;
                const modeId = entry.mode_id ?? 0;
                const isSaving = itemMutationLoading?.[`entry-${modeId}`];
                const isRemoving = itemMutationLoading?.[`rm-${modeId}`];
                const distanceValue = distanceDrafts[draftKey] ?? entry.route_distance ?? 0;
                const badgeClass = mode?.driving_type === "city" ? "mode-badge-small city" : mode?.driving_type === "highway" ? "mode-badge-small highway" : "mode-badge-small mixed";
                const badgeText = mode?.driving_type === "city" ? "ГОРОД" : mode?.driving_type === "highway" ? "ТРАССА" : "СМЕШАННЫЙ";

                return (
                    <tr key={entry.id ?? modeId}>
                      <td className="col-image"><img src={rawImage ? resolveMediaUrl(rawImage) : fallbackImageUrl()} alt="" className="service-thumb" /></td>
                      <td className="col-mode">{mode?.mode_name || `Режим #${modeId}`}</td>
                      <td className="col-type"><span className={badgeClass}>{badgeText}</span></td>
                      <td className="col-consumption">{mode?.base_consumption ?? "—"}</td>
                      <td className="col-distance">
                        <Form.Control type="number" step="0.1" min="0" value={distanceValue} onChange={(e) => setDistanceDrafts(prev => ({ ...prev, [draftKey]: e.target.value === "" ? 0 : Number(e.target.value) }))} disabled={!isDraft || applicationMutationLoading} />
                      </td>
                      <td className="col-fuel"><span className="fuel-value">{entry.fuel_saved != null && entry.fuel_saved > 0 ? `${entry.fuel_saved.toFixed(2)} л` : "—"}</span></td>
                      {isDraft && (
                          <td className="col-actions">
                            <div className="d-flex justify-content-center gap-1 flex-wrap">
                              <Button variant="outline-primary" size="sm" onClick={() => handleSaveEntry(modeId, distanceDrafts[draftKey] ?? distanceValue)} disabled={isSaving || applicationMutationLoading}>{isSaving ? <Spinner size="sm" /> : "Сохранить"}</Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleRemoveEntry(modeId)} disabled={isRemoving || applicationMutationLoading}>{isRemoving ? <Spinner size="sm" /> : "Убрать"}</Button>
                            </div>
                          </td>
                      )}
                    </tr>
                );
              })}
              {sortedEntries.length === 0 && <tr><td colSpan={isDraft ? 7 : 6} className="text-center py-4">Нет режимов</td></tr>}
              </tbody>
            </table>
          </div>
          {/* ✅ Кнопка "Назад" удалена по требованию */}
        </div>
      </div>
  );
}