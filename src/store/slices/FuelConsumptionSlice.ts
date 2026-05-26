// src/store/slices/fuelConsumptionSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api";
import { apiErrMessage } from "../utils/apiError";
import { logoutUser } from "./userSlice";

// ─── Типы данных ─────────────────────────────────────────────────────────
export interface FuelConsumptionCart {
    has_draft: boolean;
    modes_count: number;
    consumption_id?: number;
    incomplete_items_count?: number;
    status?: string;
}

export interface FuelConsumptionDetailPayload {
    consumption: SerializerFuelConsumptionJSON;
    entries: SerializerFuelModeEntryJSON[];
}

export interface SerializerFuelConsumptionJSON {
    consumption_id?: number;
    creator_login?: string;
    fuel_price?: number;
    status?: string;
    created_at?: string;
    completed_at?: string | null;
    moderator_login?: string | null;
    modes_count?: number;
    total_saved?: number;
    origin?: string;
    destination?: string;
}

export interface SerializerFuelModeEntryJSON {
    id?: number;
    mode_id?: number;
    mode_name?: string;
    route_distance?: number;
    fuel_saved?: number;
    image_key?: string;
    base_consumption?: number;
    economy_percent?: number;
    driving_type?: "city" | "highway" | "mixed";
}

export interface SerializerFuelConsumptionUpdateJSON {
    fuel_price?: number;
    origin?: string;
    destination?: string;
}

export interface SerializerFuelModeEntryUpdateJSON {
    route_distance?: number;
    fuel_saved?: number;
}

export interface SerializerFinishJSON {
    status: "completed" | "rejected";
}

// ─── Вспомогательные функции ───────────────────────────────────────────

// 🔹 Функция для создания дефолтных фильтров
export function defaultListFilters() {
    return { fromDate: "", toDate: "", status: "" };
}

// 🔹 Экспорт типа фильтров для использования в компонентах (нужно для 8-й лабы)
export type FuelConsumptionFilters = ReturnType<typeof defaultListFilters>;

const MOCK_STORAGE_KEY = "fuelConsumption_mock_state_v1";

function loadMockState() {
    try {
        const raw = localStorage.getItem(MOCK_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...buildInitialState(),
                mockCartState: parsed.mockCartState,
                mockApplications: parsed.mockApplications,
            };
        }
    } catch (e) {
        console.warn("Failed to load mock state from localStorage", e);
    }
    return buildInitialState();
}

function saveMockState(state: ReturnType<typeof buildInitialState>) {
    try {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
            mockCartState: state.mockCartState,
            mockApplications: state.mockApplications,
        }));
    } catch (e) {
        console.warn("Failed to save mock state to localStorage", e);
    }
}

function buildInitialState() {
    return {
        cart: null as FuelConsumptionCart | null,
        cartLoading: false,
        detail: null as FuelConsumptionDetailPayload | null,
        detailLoading: false,
        detailError: null as string | null,
        list: [] as SerializerFuelConsumptionJSON[],
        listLoading: false,
        listError: null as string | null,
        filters: defaultListFilters(),
        itemMutationLoading: {} as Record<string, boolean>,
        applicationMutationLoading: false,
        mockCartState: {
            consumption_id: 1,
            modes_count: 0,
            entries: [] as SerializerFuelModeEntryJSON[],
            fuel_price: 55.0,
            origin: "Москва",
            destination: "СПб",
            status: "черновик" as const,
            created_at: new Date().toISOString(),
        },
        mockApplications: [] as SerializerFuelConsumptionJSON[],
    };
}

function axiosStatus(e: unknown): number | undefined {
    if (e && typeof e === "object" && "response" in e) {
        const r = (e as { response?: { status?: number } }).response;
        return r?.status;
    }
    return undefined;
}

function calculateFuelSaved(baseConsumption: number, routeDistance: number): number {
    const economyCoefficient = 0.15;
    return parseFloat(((baseConsumption * routeDistance / 100) * economyCoefficient).toFixed(2));
}

function asDetail(data: unknown): FuelConsumptionDetailPayload | null {
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;

    if (o.consumption && Array.isArray(o.entries)) {
        return {
            consumption: o.consumption as SerializerFuelConsumptionJSON,
            entries: o.entries as SerializerFuelModeEntryJSON[],
        };
    }

    if (Array.isArray(o.entries)) {
        const { entries, ...consumptionData } = o;
        return {
            consumption: consumptionData as SerializerFuelConsumptionJSON,
            entries: entries as SerializerFuelModeEntryJSON[],
        };
    }

    if (o.consumption_id) {
        return {
            consumption: o as SerializerFuelConsumptionJSON,
            entries: [],
        };
    }

    return null;
}

// ─── Асинхронные операции (Thunks) ────────

export const fetchFuelConsumptionCart = createAsyncThunk(
    "fuelConsumption/fetchCart",
    async (_, { getState, rejectWithValue }) => {
        try {
            const response = await api.fuelConsumptions.fuelConsumptionCartList();
            const data = response.data;
            return {
                consumption_id: data.consumption_id ?? 0,
                modes_count: data.modes_count ?? 0,
                has_draft: data.consumption_id != null && data.consumption_id > 0,
                incomplete_items_count: 0,
                status: "черновик",
            } as FuelConsumptionCart;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            const state = getState() as { fuelConsumption: { mockCartState: any } };
            const mock = state.fuelConsumption.mockCartState;
            return {
                consumption_id: mock.consumption_id ?? 1,
                modes_count: mock.modes_count ?? 0,
                has_draft: mock.status === "черновик",
                incomplete_items_count: 0,
                status: mock.status,
            } as FuelConsumptionCart;
        }
    },
);

export const fetchFuelConsumptionDetail = createAsyncThunk(
    "fuelConsumption/fetchDetail",
    async (consumptionId: number, { getState, rejectWithValue }) => {
        try {
            const response = await api.fuelConsumptions.fuelConsumptionsDetail(consumptionId);
            const detail = asDetail(response.data);
            if (!detail) return rejectWithValue("Неверный формат ответа сервера");
            return detail;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            const state = getState() as { fuelConsumption: { mockCartState: any } };
            const mock = state.fuelConsumption.mockCartState;
            const dynamicEntries = mock.entries.map((entry: any) => {
                const baseConsumption = entry.base_consumption ?? 6.0;
                const routeDistance = entry.route_distance ?? 0;
                return {
                    ...entry,
                    fuel_saved: calculateFuelSaved(baseConsumption, routeDistance),
                };
            });
            const totalSaved = dynamicEntries.reduce((sum: number, e: any) => sum + (e.fuel_saved ?? 0), 0);
            const consumption: SerializerFuelConsumptionJSON = {
                consumption_id: consumptionId,
                creator_login: "user1",
                fuel_price: mock.fuel_price ?? 55.0,
                status: mock.status ?? "черновик",
                created_at: mock.created_at ?? new Date().toISOString(),
                completed_at: null,
                moderator_login: null,
                modes_count: mock.modes_count ?? 0,
                total_saved: parseFloat(totalSaved.toFixed(2)),
                origin: mock.origin ?? "Москва",
                destination: mock.destination ?? "СПб",
            };
            return { consumption, entries: dynamicEntries };
        }
    },
);

export const addModeToCart = createAsyncThunk(
    "fuelConsumption/addMode",
    async (modeId: number, { rejectWithValue }) => {
        try {
            await api.fuelModeEntries.add(modeId);
            return modeId;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            return modeId;
        }
    },
);

export const updateFuelConsumptionParams = createAsyncThunk(
    "fuelConsumption/updateParams",
    async ({ consumptionId, body }: { consumptionId: number; body: SerializerFuelConsumptionUpdateJSON }, { rejectWithValue }) => {
        try {
            await api.fuelConsumptions.fuelConsumptionsUpdate(consumptionId, body);
            return { consumptionId, ...body };
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            return { consumptionId, ...body };
        }
    },
);

export const updateFuelModeEntryInApplication = createAsyncThunk(
    "fuelConsumption/updateEntry",
    async ({ modeId, consumptionId, body }: { modeId: number; consumptionId: number; body: SerializerFuelModeEntryUpdateJSON }, { rejectWithValue }) => {
        try {
            await api.fuelModeEntries.update(modeId, consumptionId, body);
            return { modeId, consumptionId, ...body };
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            return { modeId, consumptionId, ...body };
        }
    },
);

export const removeFuelModeEntryFromApplication = createAsyncThunk(
    "fuelConsumption/removeEntry",
    async ({ modeId, consumptionId }: { modeId: number; consumptionId: number }, { rejectWithValue }) => {
        try {
            await api.fuelModeEntries.delete(modeId, consumptionId);
            return modeId;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            return modeId;
        }
    },
);

export const formFuelConsumptionApplication = createAsyncThunk(
    "fuelConsumption/form",
    async (consumptionId: number, { rejectWithValue, dispatch }) => {
        try {
            await api.fuelConsumptions.fuelConsumptionsFormUpdate(consumptionId);
            await dispatch(fetchFuelConsumptionDetail(consumptionId));
            await dispatch(fetchFuelConsumptionCart());
            await dispatch(fetchFuelConsumptionsList());
            return consumptionId;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            await dispatch(fetchFuelConsumptionDetail(consumptionId));
            await dispatch(fetchFuelConsumptionCart());
            await dispatch(fetchFuelConsumptionsList());
            return consumptionId;
        }
    },
);

export const finishFuelConsumptionApplication = createAsyncThunk(
    "fuelConsumption/finish",
    async ({ consumptionId, status }: { consumptionId: number; status: "completed" | "rejected" }, { rejectWithValue, dispatch }) => {
        try {
            await api.fuelConsumptions.fuelConsumptionsFinishUpdate(consumptionId, { status });
            await dispatch(fetchFuelConsumptionsList());
            return { consumptionId, status };
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            await dispatch(fetchFuelConsumptionsList());
            return { consumptionId, status };
        }
    },
);

export const deleteFuelConsumptionApplication = createAsyncThunk(
    "fuelConsumption/deleteApplication",
    async (consumptionId: number, { rejectWithValue, dispatch }) => {
        try {
            await api.fuelConsumptions.fuelConsumptionsDelete(consumptionId);
            await dispatch(fetchFuelConsumptionsList());
            return consumptionId;
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));
            await dispatch(fetchFuelConsumptionsList());
            return consumptionId;
        }
    },
);

export const fetchFuelConsumptionsList = createAsyncThunk(
    "fuelConsumption/fetchList",
    async (_, { getState, rejectWithValue }) => {
        try {
            // 🔹 Пытаемся получить реальные данные от бэкенда
            const state = getState() as {
                user: { login: string; isModerator: boolean };
                fuelConsumption: { filters: ReturnType<typeof defaultListFilters> };
            };
            const { fromDate, toDate, status } = state.fuelConsumption.filters;

            const query: { from_date?: string; to_date?: string; status?: string } = {};
            if (fromDate) query.from_date = fromDate;
            if (toDate) query.to_date = toDate;
            if (status) query.status = status;

            const response = await api.fuelConsumptions.fuelConsumptionsList(query);

            // 🔹 Возвращаем ТОЛЬКО реальные данные от бэкенда
            return response.data as SerializerFuelConsumptionJSON[];
        } catch (e) {
            if (axiosStatus(e) === 401) return rejectWithValue(apiErrMessage(e));

            // 🔹 Только если бэкенд недоступен — используем мок
            const state = getState() as {
                user: { login: string; isModerator: boolean };
                fuelConsumption: { filters: ReturnType<typeof defaultListFilters>; mockCartState: any; mockApplications: any[] };
            };
            const { login, isModerator } = state.user;
            const { fromDate, toDate, status } = state.fuelConsumption.filters;
            const { mockCartState, mockApplications } = state.fuelConsumption;

            const currentDraft: SerializerFuelConsumptionJSON = {
                consumption_id: mockCartState.consumption_id,
                creator_login: "user1",
                fuel_price: mockCartState.fuel_price,
                status: mockCartState.status,
                created_at: mockCartState.created_at,
                completed_at: null,
                moderator_login: null,
                modes_count: mockCartState.modes_count,
                total_saved: parseFloat((mockCartState.modes_count * 60.5).toFixed(2)),
                origin: mockCartState.origin,
                destination: mockCartState.destination,
            };

            const baseApplications: SerializerFuelConsumptionJSON[] = [
                ...mockApplications.filter((app: any) => app.consumption_id !== 1),
                { consumption_id: 2, creator_login: "user1", status: "завершён", created_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date().toISOString(), moderator_login: "admin", fuel_price: 55.0, total_saved: 350.0, origin: "Н.Новгород", destination: "Москва", modes_count: 3 },
                { consumption_id: 3, creator_login: "user2", status: "сформирован", created_at: new Date(Date.now() - 172800000).toISOString(), completed_at: null, moderator_login: null, fuel_price: 55.0, total_saved: 0, origin: "Казань", destination: "Екатеринбург", modes_count: 1 },
            ];

            const allApplications = mockCartState.modes_count > 0 || mockCartState.status !== "черновик"
                ? [currentDraft, ...baseApplications]
                : baseApplications;

            let filtered = allApplications.filter((app) => {
                if (status && app.status !== status) return false;
                if (fromDate && app.created_at && app.created_at.split('T')[0] < fromDate) return false;
                if (toDate && app.created_at && app.created_at.split('T')[0] > toDate) return false;
                return true;
            });

            if (!isModerator && login) {
                filtered = filtered.filter((app) => app.creator_login === login);
            }

            return filtered;
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────
const fuelConsumptionSlice = createSlice({
    name: "fuelConsumption",
    initialState: loadMockState(),
    reducers: {
        clearFuelConsumptionDetailError: (state) => { state.detailError = null; },

        // 🔹 Установка всех фильтров сразу
        setListFilters: (state, action: PayloadAction<Partial<ReturnType<typeof defaultListFilters>>>) => {
            state.filters = { ...state.filters, ...action.payload };
            saveMockState(state);
        },

        // 🔹 Установка одного поля фильтра (удобно для отдельных инпутов)
        setFilterField: (state, action: PayloadAction<{ field: keyof FuelConsumptionFilters; value: string }>) => {
            state.filters[action.payload.field] = action.payload.value;
            saveMockState(state);
        },

        // 🔹 Сброс фильтров
        resetListFiltersToToday: (state) => { state.filters = defaultListFilters(); saveMockState(state); },
    },
    extraReducers: (builder) => {
        builder
            .addCase(logoutUser.fulfilled, () => {
                localStorage.removeItem(MOCK_STORAGE_KEY);
                return buildInitialState();
            })
            .addCase(logoutUser.rejected, () => buildInitialState())

            .addCase(fetchFuelConsumptionCart.pending, (state) => { state.cartLoading = true; })
            .addCase(fetchFuelConsumptionCart.fulfilled, (state, action) => {
                state.cartLoading = false;
                state.cart = action.payload;
                // 🔹 Синхронизируем mockCartState с реальными данными
                if (action.payload.consumption_id) {
                    state.mockCartState.consumption_id = action.payload.consumption_id;
                    state.mockCartState.modes_count = action.payload.modes_count;
                    state.mockCartState.status = action.payload.status ?? "черновик";
                }
                saveMockState(state);
            })
            .addCase(fetchFuelConsumptionCart.rejected, (state) => {
                state.cartLoading = false;
                state.cart = { consumption_id: 0, modes_count: 0, has_draft: false, incomplete_items_count: undefined, status: undefined };
            })

            .addCase(fetchFuelConsumptionDetail.pending, (state) => { state.detailLoading = true; state.detailError = null; state.detail = null; })
            .addCase(fetchFuelConsumptionDetail.fulfilled, (state, action) => {
                state.detailLoading = false;
                state.detail = action.payload;
                // 🔹 Синхронизируем mockCartState с реальными данными
                if (action.payload?.consumption?.consumption_id) {
                    state.mockCartState.consumption_id = action.payload.consumption.consumption_id;
                    state.mockCartState.modes_count = action.payload.consumption.modes_count ?? 0;
                    state.mockCartState.status = action.payload.consumption.status ?? "черновик";
                    state.mockCartState.entries = action.payload.entries || [];
                    state.mockCartState.fuel_price = action.payload.consumption.fuel_price ?? 55.0;
                    state.mockCartState.origin = action.payload.consumption.origin ?? "Москва";
                    state.mockCartState.destination = action.payload.consumption.destination ?? "СПб";
                }
            })
            .addCase(fetchFuelConsumptionDetail.rejected, (state, action) => { state.detailLoading = false; state.detailError = action.payload as string; })

            .addCase(fetchFuelConsumptionsList.pending, (state) => { state.listLoading = true; state.listError = null; })
            .addCase(fetchFuelConsumptionsList.fulfilled, (state, action) => {
                state.listLoading = false;
                state.list = action.payload;
                saveMockState(state);
            })
            .addCase(fetchFuelConsumptionsList.rejected, (state, action) => { state.listLoading = false; state.listError = action.payload as string; })

            // addModeToCart — оптимистичное обновление + синхронизация
            .addCase(addModeToCart.pending, (state) => { state.applicationMutationLoading = true; })
            .addCase(addModeToCart.fulfilled, (state, action) => {
                state.applicationMutationLoading = false;

                // 🔹 Оптимистичное обновление для мгновенного UI
                if (state.detail?.consumption) {
                    state.detail.consumption.modes_count = (state.detail.consumption.modes_count ?? 0) + 1;

                    const newEntry: SerializerFuelModeEntryJSON = {
                        id: Date.now(),
                        mode_id: action.payload,
                        mode_name: `Режим #${action.payload}`,
                        route_distance: 300,
                        fuel_saved: calculateFuelSaved(6.0, 300),
                        image_key: "default.jpg",
                        base_consumption: 6.0,
                        economy_percent: 15.0,
                        driving_type: "city",
                    };
                    state.detail.entries = [...state.detail.entries, newEntry];

                    state.detail.consumption.total_saved = parseFloat(
                        state.detail.entries.reduce((sum, e) => sum + (e.fuel_saved ?? 0), 0).toFixed(2)
                    );
                }

                // 🔹 Обновляем cart
                if (state.cart && state.cart.consumption_id) {
                    state.cart.modes_count = (state.cart.modes_count ?? 0) + 1;
                }

                // 🔹 Обновляем mockCartState для localStorage
                if (state.mockCartState.consumption_id) {
                    state.mockCartState.modes_count = (state.mockCartState.modes_count ?? 0) + 1;
                    state.mockCartState.entries.push({
                        id: Date.now(),
                        mode_id: action.payload,
                        mode_name: `Режим #${action.payload}`,
                        route_distance: 300,
                        fuel_saved: calculateFuelSaved(6.0, 300),
                        image_key: "default.jpg",
                        base_consumption: 6.0,
                        economy_percent: 15.0,
                        driving_type: "city",
                    });
                }

                saveMockState(state);
            })
            .addCase(addModeToCart.rejected, (state) => { state.applicationMutationLoading = false; })

            // updateFuelConsumptionParams
            .addCase(updateFuelConsumptionParams.pending, (state) => { state.applicationMutationLoading = true; })
            .addCase(updateFuelConsumptionParams.fulfilled, (state, action) => {
                state.applicationMutationLoading = false;
                if (state.detail?.consumption && state.detail.consumption.consumption_id === action.payload.consumptionId) {
                    if (action.payload.fuel_price !== undefined) {
                        state.detail.consumption.fuel_price = action.payload.fuel_price;
                        state.mockCartState.fuel_price = action.payload.fuel_price;
                    }
                    if (action.payload.origin !== undefined) {
                        state.detail.consumption.origin = action.payload.origin;
                        state.mockCartState.origin = action.payload.origin;
                    }
                    if (action.payload.destination !== undefined) {
                        state.detail.consumption.destination = action.payload.destination;
                        state.mockCartState.destination = action.payload.destination;
                    }
                }
                saveMockState(state);
            })
            .addCase(updateFuelConsumptionParams.rejected, (state) => { state.applicationMutationLoading = false; })

            // updateFuelModeEntryInApplication
            .addCase(updateFuelModeEntryInApplication.pending, (state, action) => { state.itemMutationLoading[`entry-${action.meta.arg.modeId}`] = true; })
            .addCase(updateFuelModeEntryInApplication.fulfilled, (state, action) => {
                delete state.itemMutationLoading[`entry-${action.payload.modeId}`];
                if (state.detail?.entries && state.detail.consumption?.consumption_id === action.payload.consumptionId) {
                    const entry = state.detail.entries.find(e => e.mode_id === action.payload.modeId);
                    if (entry) {
                        if (action.payload.route_distance !== undefined) {
                            entry.route_distance = action.payload.route_distance;
                            const baseConsumption = entry.base_consumption ?? 6.0;
                            entry.fuel_saved = calculateFuelSaved(baseConsumption, entry.route_distance);
                        }
                        if (action.payload.fuel_saved !== undefined) {
                            entry.fuel_saved = action.payload.fuel_saved;
                        }
                    }
                    if (state.detail?.consumption) {
                        state.detail.consumption.total_saved = parseFloat(
                            state.detail.entries.reduce((sum, e) => sum + (e.fuel_saved ?? 0), 0).toFixed(2)
                        );
                    }
                }
                saveMockState(state);
            })
            .addCase(updateFuelModeEntryInApplication.rejected, (state, action) => { delete state.itemMutationLoading[`entry-${action.meta.arg.modeId}`]; })

            // removeFuelModeEntryFromApplication
            .addCase(removeFuelModeEntryFromApplication.pending, (state, action) => { state.itemMutationLoading[`rm-${action.meta.arg.modeId}`] = true; })
            .addCase(removeFuelModeEntryFromApplication.fulfilled, (state, action) => {
                delete state.itemMutationLoading[`rm-${action.payload}`];
                if (state.detail && state.detail.consumption?.consumption_id) {
                    state.detail.entries = state.detail.entries.filter(e => e.mode_id !== action.payload);
                    if (state.detail.consumption) {
                        state.detail.consumption.modes_count = Math.max(0, (state.detail.consumption.modes_count ?? 0) - 1);
                        state.detail.consumption.total_saved = parseFloat(
                            state.detail.entries.reduce((sum, e) => sum + (e.fuel_saved ?? 0), 0).toFixed(2)
                        );
                    }
                    if (state.cart) {
                        state.cart.modes_count = state.detail.consumption.modes_count;
                    }
                    state.mockCartState.entries = state.mockCartState.entries.filter(e => e.mode_id !== action.payload);
                    state.mockCartState.modes_count = Math.max(0, state.mockCartState.modes_count - 1);
                }
                saveMockState(state);
            })
            .addCase(removeFuelModeEntryFromApplication.rejected, (state, action) => { delete state.itemMutationLoading[`rm-${action.meta.arg.modeId}`]; })

            // formFuelConsumptionApplication
            .addCase(formFuelConsumptionApplication.pending, (state) => { state.applicationMutationLoading = true; })
            .addCase(formFuelConsumptionApplication.fulfilled, (state, action) => {
                state.applicationMutationLoading = false;
                if (state.detail?.consumption && state.detail.consumption.consumption_id === action.payload) {
                    state.detail.consumption.status = "сформирован";
                }
                if (state.cart && state.cart.consumption_id === action.payload) {
                    state.cart.has_draft = false;
                    state.cart.status = "сформирован";
                }
                const app = state.list.find(a => a.consumption_id === action.payload);
                if (app) {
                    app.status = "сформирован";
                }
                state.mockCartState.status = "сформирован";
                saveMockState(state);
            })
            .addCase(formFuelConsumptionApplication.rejected, (state) => { state.applicationMutationLoading = false; })

            // finishFuelConsumptionApplication
            .addCase(finishFuelConsumptionApplication.pending, (state, action) => { state.itemMutationLoading[`finish-${action.meta.arg.consumptionId}`] = true; })
            .addCase(finishFuelConsumptionApplication.fulfilled, (state, action) => {
                delete state.itemMutationLoading[`finish-${action.payload.consumptionId}`];
                const app = state.list.find(a => a.consumption_id === action.payload.consumptionId);
                if (app) {
                    app.status = action.payload.status;
                }
                saveMockState(state);
            })
            .addCase(finishFuelConsumptionApplication.rejected, (state, action) => { delete state.itemMutationLoading[`finish-${action.meta.arg.consumptionId}`]; })

            // deleteFuelConsumptionApplication
            .addCase(deleteFuelConsumptionApplication.pending, (state) => { state.applicationMutationLoading = true; })
            .addCase(deleteFuelConsumptionApplication.fulfilled, (state, action) => {
                state.applicationMutationLoading = false;
                state.detail = null;
                state.list = state.list.filter(a => a.consumption_id !== action.payload);
                if (state.cart?.consumption_id === action.payload) {
                    state.cart = { consumption_id: 0, modes_count: 0, has_draft: false, incomplete_items_count: undefined, status: undefined };
                    state.mockCartState = {
                        consumption_id: 1,
                        modes_count: 0,
                        entries: [],
                        fuel_price: 55.0,
                        origin: "Москва",
                        destination: "СПб",
                        status: "черновик",
                        created_at: new Date().toISOString(),
                    };
                }
                saveMockState(state);
            })
            .addCase(deleteFuelConsumptionApplication.rejected, (state) => { state.applicationMutationLoading = false; });
    },
});

// 🔹 Экспортируем все экшены, включая новый setFilterField
export const { clearFuelConsumptionDetailError, setListFilters, setFilterField, resetListFiltersToToday } = fuelConsumptionSlice.actions;
export default fuelConsumptionSlice.reducer;