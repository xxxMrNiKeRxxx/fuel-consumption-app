// src/pages/ModeDetailPage/ModeDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveMediaUrl, type DrivingMode, getDrivingMode } from "../../modules/modeApi";
import { getMockMode, DrivingModeS_MOCK } from "../../modules/mock";
import defaultImage from "../../assets/default_image.png";
import "./ModeDetailPage.css";

export default function ModeDetailPage() {
  const { id } = useParams();

  const [mode, setMode] = useState<DrivingMode | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setMode(null);
      setLoading(false);
      return;
    }

    setMediaError(false);
    setLoading(true);
    const modeId = Number(id);

    // ✅ Try backend first, fallback to mock
    getDrivingMode(modeId)
        .then(data => {
          if (data) {
            setMode(data);
          } else {
            // Fallback to mock if backend returns null
            const resolved = getMockMode(modeId) ?? DrivingModeS_MOCK.find((m) => m.mode_id === modeId) ?? null;
            setMode(resolved);
          }
        })
        .catch(() => {
          // Fallback to mock on network error
          const resolved = getMockMode(modeId) ?? DrivingModeS_MOCK.find((m) => m.mode_id === modeId) ?? null;
          setMode(resolved);
        })
        .finally(() => {
          setLoading(false);
        });

  }, [id]);

  const videoUrl = mode?.video_key ? resolveMediaUrl(mode.video_key) : "";
  const fallbackUrl = mode?.image_key ? resolveMediaUrl(mode.image_key) : defaultImage;
  const showVideo = Boolean(videoUrl) && !mediaError;

  // Бейдж типа режима
  const badgeClass =
      mode?.driving_type === "city"
          ? "mode-badge mode-badge--city"
          : mode?.driving_type === "highway"
              ? "mode-badge mode-badge--highway"
              : "mode-badge mode-badge--mixed";

  const badgeText =
      mode?.driving_type === "city" ? "ГОРОД"
          : mode?.driving_type === "highway" ? "ТРАССА"
              : "СМЕШАННЫЙ";

  if (loading) {
    return (
        <div className="vibes-page vibes-page--scroll">
          <div className="mode-not-found">
            <h1>Загрузка...</h1>
          </div>
        </div>
    );
  }

  if (!id || !mode) {
    return (
        <div className="vibes-page vibes-page--scroll">
          <div className="mode-not-found">
            <h1>Режим не найден</h1>
          </div>
        </div>
    );
  }

  return (
      <div className="vibes-page vibes-page--scroll">
        <div className="vibes-viewport">
          <div className="vibes-media">
            {showVideo ? (
                <video
                    className="vibes-video"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={fallbackUrl}
                    onError={() => setMediaError(true)}
                >
                  <source src={videoUrl} type="video/mp4" />
                  <img src={fallbackUrl} alt={mode.mode_name} />
                </video>
            ) : (
                <div
                    className="vibes-fallback"
                    style={{ backgroundImage: `url(${fallbackUrl})` }}
                    aria-label={mode.mode_name}
                />
            )}
            <div className="vibes-overlay" aria-hidden />

            {/* Бейдж типа режима */}
            <span className={badgeClass}>{badgeText}</span>
          </div>

          <div className="vibes-content">
            <h1 className="vibes-title">{mode.mode_name}</h1>

            {/* Описание */}
            <p className="vibes-description">
              {mode.description ?? ''}
            </p>

            {/* Параметры режима */}
            <div className="vibes-manager">
              <span className="vibes-manager__label">Расход</span>
              <span className="vibes-manager__name">{mode.base_consumption} л/100км</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
              <span className="vibes-manager__label">Экономия</span>
              <span className="vibes-manager__name">{mode.economy_percent}%</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
              <span className="vibes-manager__label">Цена</span>
              <span className="vibes-manager__name">{mode.price} ₽</span>
            </div>
          </div>
        </div>
      </div>
  );
}