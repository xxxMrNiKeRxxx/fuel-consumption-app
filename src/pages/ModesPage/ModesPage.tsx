// src/pages/ModesPage/ModesPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, ProgressBar } from "react-bootstrap";
import Search from "../../components/InputField/InputField";
import CartRow from "../../components/CartRow/CartRow";
import ModeCard from "../../components/ModeCard/ModeCard";
import {
  DrivingModeClipDescription,
  fallbackImageUrl,
  listDrivingModes,
  objectUrlFromKey,
  type DrivingMode,
} from "../../modules/modeApi";
import { DrivingModeS_MOCK } from "../../modules/mock";
import { useModeImageSearch } from "../../hooks/useModeImageSearch";
import "./ModesPage.css";

// 🔹 Импортируем Redux хуки и экшены
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setServicesFilters } from "../../store/slices/modesSlice";

// ✅ Хелпер для резолва путей к изображениям
function resolveThumb(key: string): string {
  if (!key) return fallbackImageUrl();
  if (
      key.startsWith("http://") ||
      key.startsWith("https://") ||
      key.startsWith("/") ||
      key.startsWith("blob:")
  ) {
    return key;
  }
  return objectUrlFromKey(key);
}

// 🔹 Компонент карточки для результатов мультимодального поиска
interface ClipModeCardProps {
  mode: DrivingMode;
  similarity: number;
}

function ClipModeCard({ mode, similarity }: ClipModeCardProps) {
  const thumb = resolveThumb(mode.image_key || "");

  const badgeClass =
      mode.driving_type === "city"
          ? "mode-badge city"
          : mode.driving_type === "highway"
              ? "mode-badge highway"
              : "mode-badge mixed";

  const badgeText =
      mode.driving_type === "city"
          ? "ГОРОД"
          : mode.driving_type === "highway"
              ? "ТРАССА"
              : "СМЕШАННЫЙ";

  return (
      <div className="mode-card">
        <div className="mode-card__image-wrapper">
          <Link to={`/mode/${mode.mode_id}`} className="mode-card__link">
            <img
                src={thumb}
                alt={mode.mode_name || "Режим"}
                className="mode-card__image"
            />
            <span className={badgeClass}>{badgeText}</span>
          </Link>
        </div>

        <div className="mode-card__content">
          <h3 className="mode-card__title">
            <Link to={`/mode/${mode.mode_id}`} className="mode-card__link">
              {mode.mode_name || `Режим #${mode.mode_id}`}
            </Link>
          </h3>

          <div className="mode-card__specs">
            <div className="spec-item">
              <span className="spec-icon">⛽</span>
              <span className="spec-value">{mode.base_consumption} л/100км</span>
            </div>
            <div className="spec-item">
              <span className="spec-icon"></span>
              <span className="spec-value">Экономия: {mode.economy_percent}%</span>
            </div>
          </div>

          {mode.description && (
              <p className="mode-card__description">{mode.description}</p>
          )}

          <div className="mode-card__similarity">
            <span className="similarity-label">Сходство:</span>
            <span className="similarity-value">{(similarity * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
  );
}

export default function ModesPage() {
  const dispatch = useAppDispatch();

  // 🔹 Читаем поиск ПРЯМО из Redux (Single Source of Truth)
  // PersistGate гарантирует, что здесь уже будет восстановленное значение
  const searchName = useAppSelector((state) => state.services.filters.search);

  // === Состояния данных ===
  const [clipSourceModes, setClipSourceModes] = useState<DrivingMode[]>([]);
  const [displayModes, setDisplayModes] = useState<DrivingMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(false);

  // === Состояния мультимодального поиска ===
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [clipSessionActive, setClipSessionActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔹 Обработчик изменения поиска: просто обновляет Redux
  const handleSearchNameChange = (value: string) => {
    dispatch(setServicesFilters({ search: value }));
  };

  // === Загрузка данных (учитывает сохранённый фильтр!) ===
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        // 🔹 Если в Redux есть сохранённый запрос — грузим отфильтрованный список сразу
        const data = searchName
            ? await listDrivingModes({ name: searchName })
            : await listDrivingModes();

        if (cancelled) return;

        if (data.length > 0) {
          setClipSourceModes(data);
          setDisplayModes(data);
          setUseMock(false);
        } else {
          setClipSourceModes(DrivingModeS_MOCK);
          setDisplayModes(DrivingModeS_MOCK);
          setUseMock(true);
        }
      } catch {
        if (cancelled) return;
        setClipSourceModes(DrivingModeS_MOCK);
        setDisplayModes(DrivingModeS_MOCK);
        setUseMock(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []); // Пустой массив: запускается 1 раз при монтировании (после гидратации Redux)

  // === Подготовка данных для мультимодального поиска ===
  const clipItems = useMemo(
      () =>
          clipSourceModes.map((mode) => ({
            id: mode.mode_id,
            description: DrivingModeClipDescription(mode),
          })),
      [clipSourceModes]
  );

  // === Подключение хука мультимодального поиска ===
  const {
    items: clipProcessed,
    ready: clipReady,
    progress: clipProgress,
    imageEmbedding,
    workerError,
    searchByImage,
    resetSearch,
  } = useModeImageSearch(clipItems, clipSessionActive);

  // === Мапа для быстрого доступа к полной сущности режима по id ===
  const modeById = useMemo(() => {
    const m = new Map<number, DrivingMode>();
    clipSourceModes.forEach((mode) => m.set(mode.mode_id, mode));
    return m;
  }, [clipSourceModes]);

  // === Обработчик текстового поиска (по кнопке "Найти") ===
  const handleSearch = async () => {
    console.log("🔍 [handleSearch] Ищу:", searchName);
    setLoading(true);
    try {
      const filtered = await listDrivingModes({ name: searchName });
      console.log("✅ [handleSearch] Найдено:", filtered.length, "режимов");

      if (filtered.length > 0) {
        setClipSourceModes(filtered);
        setDisplayModes(filtered);
        setUseMock(false);
      } else {
        setClipSourceModes([]);
        setDisplayModes([]);
      }
    } catch (error) {
      console.error("❌ [handleSearch] Ошибка:", error);
      const filteredMock = DrivingModeS_MOCK.filter((mode) =>
          mode.mode_name?.toLowerCase().includes(searchName.toLowerCase())
      );
      setClipSourceModes(filteredMock);
      setDisplayModes(filteredMock);
      setUseMock(true);
    } finally {
      setLoading(false);
    }
  };

  // === Обработчики загрузки изображения ===
  const handleUploadButtonClick = () => {
    if (!clipSessionActive) setClipSessionActive(true);
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (selectedImage?.startsWith("blob:")) URL.revokeObjectURL(selectedImage);
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      searchByImage(file);
    }
  };

  const handleClearImage = () => {
    if (selectedImage?.startsWith("blob:")) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    resetSearch();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // === Флаги для UI ===
  const imageSearchActive = Boolean(imageEmbedding);
  const showClipProgress =
      clipSessionActive && clipItems.length > 0 && !clipReady && !workerError;
  const uploadLabel =
      clipSessionActive && !clipReady ? "Загрузка нейросети…" : "Загрузить фото";
  const isUploadDisabled =
      clipItems.length === 0 || (clipSessionActive && !clipReady);
  const canResetImage = Boolean(selectedImage);

  // === Результаты поиска по изображению ===
  const foundModesWithSimilarity = useMemo(() => {
    if (!imageSearchActive) return [];
    return clipProcessed
        .filter((item) => item.isVisible)
        .map((item) => ({
          mode: modeById.get(item.id),
          similarity: item.score,
        }))
        .filter(
            (item): item is { mode: DrivingMode; similarity: number } =>
                item.mode != null
        );
  }, [clipProcessed, imageSearchActive, modeById]);

  return (
      <div className="modes-page">
        <div className="toolbar">
          <div className="container">
            <Search
                query={searchName}
                onQueryChange={handleSearchNameChange}
                onSearch={handleSearch}
            />
            <CartRow />
          </div>
        </div>

        <div className="space">
          <main className="catalog-main">
            <section className="clip-card" aria-labelledby="clip-search-title">
              <h2 id="clip-search-title" className="clip-card__title">
                Поиск режима по изображению
              </h2>

              {workerError ? (
                  <Alert variant="warning" className="clip-card__alert">
                    Не удалось загрузить модель или обработать запрос: {workerError}
                  </Alert>
              ) : null}

              {clipItems.length === 0 ? (
                  <p className="clip-card__empty">Загрузите каталог режимов…</p>
              ) : (
                  <div className="clip-card__content">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="clip-card__file-input"
                        onChange={handleImageUpload}
                    />

                    <div className="clip-card__preview">
                      {selectedImage ? (
                          <img
                              src={selectedImage}
                              alt=""
                              className="clip-card__preview-img"
                          />
                      ) : (
                          <div className="clip-card__placeholder">Нет фото</div>
                      )}
                    </div>

                    <div className="clip-card__actions">
                      <Button
                          className="clip-card__btn-upload"
                          variant="warning"
                          onClick={handleUploadButtonClick}
                          disabled={isUploadDisabled}
                      >
                        {uploadLabel}
                      </Button>

                      <Button
                          className="clip-card__btn-clear"
                          variant="outline-danger"
                          onClick={handleClearImage}
                          disabled={!canResetImage}
                      >
                        Сбросить
                      </Button>

                      {showClipProgress && (
                          <div className="clip-card__progress-wrapper">
                            <ProgressBar
                                className="clip-card__progress"
                                now={clipProgress}
                                label={`${Math.round(clipProgress)}%`}
                                animated
                            />
                          </div>
                      )}
                    </div>
                  </div>
              )}
            </section>

            <div className="catalog-header">
              <h2 className="catalog-title">КАТАЛОГ РЕЖИМОВ ДВИЖЕНИЯ</h2>
            </div>

            {loading ? (
                <div className="loading">Загрузка...</div>
            ) : imageSearchActive ? (
                <div className="modes-grid">
                  {foundModesWithSimilarity.length > 0 ? (
                      foundModesWithSimilarity.map(({ mode, similarity }) => (
                          <ClipModeCard
                              key={mode.mode_id}
                              mode={mode}
                              similarity={similarity}
                          />
                      ))
                  ) : (
                      <div className="modes-page__empty">
                        Нет режимов выше порога сходства. Попробуйте другое изображение.
                      </div>
                  )}
                </div>
            ) : (
                <div className="modes-grid">
                  {displayModes.length > 0 ? (
                      displayModes.map((mode) => (
                          <ModeCard key={mode.mode_id} mode={mode} />
                      ))
                  ) : (
                      <div className="modes-page__empty">
                        {searchName
                            ? `По запросу «${searchName}» ничего не найдено`
                            : "Режимы не найдены"}
                      </div>
                  )}
                </div>
            )}
          </main>
        </div>
      </div>
  );
}