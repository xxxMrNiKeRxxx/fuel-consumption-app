// src/store/utils/apiError.ts
import axios from "axios";

export function apiErrMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    // 🔥 Логируем ВСЮ информацию об ошибке в консоль
    console.error("🔍 Axios error FULL details:", {
      message: e.message,
      code: e.code,
      status: e.response?.status,
      statusText: e.response?.statusText,
      data: e.response?.data,
      config: {
        url: e.config?.url,
        method: e.config?.method,
        baseURL: e.config?.baseURL,
        headers: e.config?.headers,
      },
    });
    
    const d = e.response?.data;
    
    // Пробуем разные возможные поля ошибки
    if (d && typeof d === "object") {
      if ("description" in d && d.description) return String(d.description);
      if ("message" in d && d.message) return String(d.message);
      if ("error" in d && d.error) return String(d.error);
      if ("detail" in d && d.detail) return String(d.detail);
      // Если объект, но без известных полей — сериализуем
      return JSON.stringify(d);
    }
    
    // Если нет response (сеть упала)
    if (!e.response) {
      return `Сеть: ${e.message || "Нет соединения с сервером"}`;
    }
  }
  
  // Для не-Axios ошибок
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  
  return "Ошибка запроса";
}