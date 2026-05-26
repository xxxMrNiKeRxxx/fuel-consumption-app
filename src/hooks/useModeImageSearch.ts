// src/hooks/useModeImageSearch.ts

import { useState, useRef, useEffect, useMemo } from "react";
import { cosineSimilarity } from "../modules/math"; // убедитесь, что функция доступна

// Заменяем TireSearchItem на ModeSearchItem
export type ModeSearchItem = {
  id: number;
  description: string;
};

// Заменяем IProcessedTireItem на IProcessedModeItem
export interface IProcessedModeItem extends ModeSearchItem {
  score: number;
  isVisible: boolean;
  embedding?: number[];
}

// Вспомогательная функция для нормализации прогресса (остаётся без изменений)
function normalizeProgress(raw: unknown): number | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as { status?: string; progress?: number };
  if (typeof o.progress !== "number") return null;
  const p = o.progress;
  if (p <= 1 && p >= 0) return Math.round(p * 100);
  return Math.min(100, Math.round(p));
}

// Заменяем useTireImageSearch на useModeImageSearch
export const useModeImageSearch = (
    initialItems: ModeSearchItem[], // изменён тип
    enabled: boolean,
) => {
  // Заменяем состояние items с Tire на Mode
  const [items, setItems] = useState<IProcessedModeItem[]>([]); // изменён тип
  const [imageEmbedding, setImageEmbedding] = useState<number[] | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [workerError, setWorkerError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const embeddingsReadyRef = useRef(false);
  const pendingFileRef = useRef<File | null>(null);
  // Заменяем ref с Tire на Mode
  const itemsRef = useRef(initialItems);
  itemsRef.current = initialItems;

  // useMemo также обновлён под Mode
  const itemsKey = useMemo(
      () => initialItems.map((item) => `${item.id}:${item.description}`).join("|"),
      [initialItems],
  );

  useEffect(() => {
    setWorkerError(null);
    embeddingsReadyRef.current = false;
    pendingFileRef.current = null;

    if (!enabled) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setItems([]);
      setReady(false);
      setProgress(0);
      setImageEmbedding(null);
      return;
    }

    const snapshot = itemsRef.current;

    if (snapshot.length === 0) {
      setItems([]);
      setReady(true);
      setProgress(100);
      setImageEmbedding(null);
      return;
    }

    // Обновляем начальное состояние items
    setItems(snapshot.map((item) => ({ ...item, score: 0, isVisible: true })));
    setReady(false);
    setProgress(0);
    setImageEmbedding(null);

    // Убедитесь, что путь к worker правильный
    workerRef.current = new Worker(new URL("../workers/search.worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, data } = e.data as { type: string; data: unknown };

      switch (type) {
        case "progress": {
          const msg = data as { status?: string; progress?: number };
          if (msg?.status === "progress") {
            const p = normalizeProgress(data);
            if (p !== null) setProgress(p);
          } else if (msg?.status === "ready") {
            setReady(true);
          } else {
            const p = normalizeProgress(data);
            if (p !== null) setProgress(p);
          }
          break;
        }
        case "text_embeddings_ready":
          embeddingsReadyRef.current = true;
          // Обновляем embedding для Mode
          setItems((prev) =>
              prev.map((item) => ({
                ...item,
                embedding: (data as Record<number, number[] | undefined>)[item.id], // предполагается, что id соответствует ключу
              })),
          );
          setReady(true);
          setProgress(100);
        {
          const pending = pendingFileRef.current;
          if (pending && workerRef.current) {
            pendingFileRef.current = null;
            workerRef.current.postMessage({ type: "image", data: pending });
          }
        }
          break;
        case "image_embedding_ready":
          setImageEmbedding(data as number[]);
          break;
        case "error":
          setWorkerError(typeof data === "string" ? data : "Worker error");
          setReady(true);
          pendingFileRef.current = null;
          break;
        default:
          break;
      }
    };

    // Отправляем инициализационные данные (ModeSearchItem[])
    workerRef.current.postMessage({ type: "init", data: snapshot });

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [itemsKey, enabled]);

  // Логика схожести (cosineSimilarity) остаётся той же, но обновлена под Mode
  useEffect(() => {
    if (!imageEmbedding) return;

    setItems((prevItems) => {
      if (!prevItems[0]?.embedding) return prevItems;

      // Порог и TopK остаются (можно изменить под вашу логику)
      const threshold = 0.07;
      const topK = 3;

      const processed = prevItems.map((item) => {
        if (!item.embedding) return item;

        const similarity = cosineSimilarity(imageEmbedding, item.embedding);

        // Лог для отладки (по желанию)
        // console.log(`[CLIP] Mode ${item.id} "${item.description.substring(0, 30)}..." → similarity: ${similarity.toFixed(4)}`);

        return {
          ...item,
          score: similarity,
          isVisible: similarity > threshold,
        };
      });

      // Сортируем по убыванию сходства
      processed.sort((a, b) => b.score - a.score);

      // Оставляем только topK видимых результатов
      let visibleCount = 0;
      return processed.map((item) => {
        if (item.isVisible && visibleCount < topK) {
          visibleCount++;
          return item;
        }
        return { ...item, isVisible: false };
      });
    });
  }, [imageEmbedding]);

  // Функция поиска по изображению (остаётся той же)
  const searchByImage = (file: File) => {
    if (!workerRef.current || !embeddingsReadyRef.current) {
      pendingFileRef.current = file;
      return;
    }
    workerRef.current.postMessage({ type: "image", data: file });
  };

  // Функция сброса поиска (обновлена под Mode)
  const resetSearch = () => {
    setImageEmbedding(null);
    setWorkerError(null);
    pendingFileRef.current = null;
    setItems((prev) => {
      const sortedById = [...prev].sort((a, b) => a.id - b.id);
      return sortedById.map((item) => ({
        ...item,
        score: 0,
        isVisible: true,
      }));
    });
  };

  return {
    items, // IProcessedModeItem[]
    ready,
    progress,
    imageEmbedding,
    workerError,
    searchByImage,
    resetSearch,
  };
};