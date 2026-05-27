// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";

export default defineConfig(({ mode }) => {
  // 🔹 Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), "");

  // 🔹 Настройки для GitHub Pages: замените на имя вашего репозитория!
  const repoName = "fuel-consumption-app"; // ← ВАШ РЕПОЗИТОРИЙ
  const appBase = mode === "production" ? `/${repoName}/` : "/";

  // 🔹 Прокси для API (бэкенд на 8080 порту)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  // 🔹 Проверка наличия сертификатов для HTTPS (опционально)
  const certPath = path.resolve(__dirname, "cert.crt");
  const keyPath = path.resolve(__dirname, "cert.key");
  const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

  return {
    // 🔹 Базовый путь для деплоя на GitHub Pages
    base: appBase,

    plugins: [
      react(),
      // 🔹 PWA плагин для Fuel Consumption App
      // vite.config.ts
      // vite.config.ts
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Расчёт экономии топлива - Круиз-контроль",
          short_name: "CruiseControl",
          description: "Приложение для расчёта экономии топлива",
          theme_color: "#DB2B36",
          background_color: "#ffffff",
          start_url: "/fuel-consumption-app/",  // ← С слэшем в начале и конце!
          scope: "/fuel-consumption-app/",
          display: "standalone",
          orientation: "portrait-primary",
          // 🔹 Пути БЕЗ начального слэша!
          icons: [
            {
              src: "pwa-192x192.png",  // ← Без слэша!
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "pwa-512x512.png",  // ← Без слэша!
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },


        // 🔹 Workbox для кэширования
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 1 день
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],

    server: {
      // 🔹 Прокси для API запросов
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },

      // 🔹 Настройки для Docker/WSL
      watch: {
        usePolling: true,
      },
      host: "0.0.0.0",      // слушаем все интерфейсы
      strictPort: true,     // ошибка, если порт занят
      port: 3000,           // порт фронтенда

      // 🔹 Опционально: HTTPS для локальной разработки
      ...(useHttps && {
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
      }),

      // 🔹 HMR настройки
      hmr: {
        protocol: "ws",
        host: "localhost",
        clientPort: 3000,
      },
    },

    // 🔹 Настройки для превью сборки
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
  };
});