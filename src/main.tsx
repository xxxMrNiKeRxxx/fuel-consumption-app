// src/main.tsx (или index.tsx)
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux"; // ✅ Импорт Provider из react-redux
import { store } from "./store";        // ✅ Путь к вашему store (проверьте точное имя экспорта)
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider store={store}> {/* ✅ Оборачиваем всё приложение */}
            <App />
        </Provider>
    </React.StrictMode>,
);