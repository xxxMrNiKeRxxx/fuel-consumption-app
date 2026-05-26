import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    HeadersDefaults,
    ResponseType,
} from "axios";
import axios from "axios";

// ─── Типы ──────────────────────────────────────────────────────────────
export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
    extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
    secure?: boolean;
    path: string;
    type?: ContentType;
    query?: QueryParamsType;
    format?: ResponseType;
    body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown>
    extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
    securityWorker?: (
        securityData: SecurityDataType | null
    ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
    secure?: boolean;
    format?: ResponseType;
}

export const ContentType = {
    Json: "application/json",
    JsonApi: "application/vnd.api+json",
    FormData: "multipart/form-data",
    UrlEncoded: "application/x-www-form-urlencoded",
    Text: "text/plain",
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

// ─── Типы данных ─────────────────────────────────────────────────────────
export interface SerializerUserJSON {
    login: string;
    password: string;
    is_moderator?: boolean;
}

export interface SerializerModeJSON {
    mode_id?: number;
    mode_name?: string;
    description?: string;
    image_key?: string;
    video_key?: string;
    base_consumption?: number;
    economy_percent?: number;
    driving_type?: "city" | "highway" | "mixed";
    price?: number;
    short_description_en?: string;
    is_active?: boolean;
}

export interface SerializerFuelConsumptionJSON {
    consumption_id?: number;
    creator_login?: string;
    fuel_price?: number;
    status?: string;
    created_at?: string;
    completed_at?: string;
    moderator_login?: string;
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

export interface SerializerCartJSON {
    consumption_id?: number;
    modes_count?: number;
}

export interface SerializerFinishJSON {
    status: "completed" | "rejected";
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

// ─── HttpClient ───────────────────────────────────────────────────────
export class HttpClient<SecurityDataType = unknown> {
    public instance: AxiosInstance;
    private securityData: SecurityDataType | null = null;
    private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
    private secure?: boolean;
    private format?: ResponseType;

    constructor({
                    securityWorker,
                    secure,
                    format,
                    ...axiosConfig
                }: ApiConfig<SecurityDataType> = {}) {
        this.instance = axios.create({
            ...axiosConfig,
            baseURL: axiosConfig.baseURL || "/api",
        });
        this.secure = secure;
        this.format = format;
        this.securityWorker = securityWorker;
    }

    public setSecurityData = (data: SecurityDataType | null) => {
        this.securityData = data;
    };

    protected mergeRequestParams(
        params1: AxiosRequestConfig,
        params2?: AxiosRequestConfig
    ): AxiosRequestConfig {
        const method = params1.method || (params2 && params2.method);
        return {
            ...this.instance.defaults,
            ...params1,
            ...(params2 || {}),
            headers: {
                ...((method &&
                        this.instance.defaults.headers[
                            method.toLowerCase() as keyof HeadersDefaults
                            ]) ||
                    {}),
                ...(params1.headers || {}),
                ...((params2 && params2.headers) || {}),
            },
        };
    }

    protected stringifyFormItem(formItem: unknown) {
        if (typeof formItem === "object" && formItem !== null) {
            return JSON.stringify(formItem);
        }
        return `${formItem}`;
    }

    protected createFormData(input: Record<string, unknown>): FormData {
        if (input instanceof FormData) return input;
        return Object.keys(input || {}).reduce((formData, key) => {
            const property = input[key];
            const propertyContent: any[] = property instanceof Array ? property : [property];
            for (const formItem of propertyContent) {
                const isFileType = formItem instanceof Blob || formItem instanceof File;
                formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
            }
            return formData;
        }, new FormData());
    }

    public request = async <T = any, _E = any>({
                                                   secure,
                                                   path,
                                                   type,
                                                   query,
                                                   format,
                                                   body,
                                                   ...params
                                               }: FullRequestParams): Promise<AxiosResponse<T>> => {
        const secureParams =
            ((typeof secure === "boolean" ? secure : this.secure) &&
                this.securityWorker &&
                (await this.securityWorker(this.securityData))) ||
            {};
        const requestParams = this.mergeRequestParams(params, secureParams);
        const responseFormat = format || this.format || undefined;

        if (type === ContentType.FormData && body && typeof body === "object") {
            body = this.createFormData(body as Record<string, unknown>);
        }
        if (type === ContentType.Text && body && typeof body !== "string") {
            body = JSON.stringify(body);
        }

        return this.instance.request({
            ...requestParams,
            headers: {
                ...(requestParams.headers || {}),
                ...(type ? { "Content-Type": type } : {}),
            },
            params: query,
            responseType: responseFormat,
            data: body,
            url: path,
        });
    };
}

// ─── Api ─────────────────────────────────────────────────────────────
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
    // 👤 Auth
    users = {
        signinCreate: (credentials: SerializerUserJSON, params: RequestParams = {}) =>
            this.request<Record<string, any>, Record<string, string>>({
                path: `/users/signin`,
                method: "POST",
                body: credentials,
                type: ContentType.Json,
                format: "json",
                ...params,
            }),

        signoutCreate: (params: RequestParams = {}) =>
            this.request<void, Record<string, string>>({
                path: `/users/signout`,
                method: "POST",
                secure: true,
                ...params,
            }),

        signupCreate: (user: SerializerUserJSON, params: RequestParams = {}) =>
            this.request<SerializerUserJSON, Record<string, string>>({
                path: `/users/signup`,
                method: "POST",
                body: user,
                type: ContentType.Json,
                format: "json",
                ...params,
            }),
    };

    // 🚗 Modes
    modes = {
        modesList: (query?: { Name?: string }, params: RequestParams = {}) =>
            this.request<SerializerModeJSON[], Record<string, string>>({
                path: `/modes`,
                method: "GET",
                query: query,
                format: "json",
                ...params,
            }),

        modesDetail: (id: number, params: RequestParams = {}) =>
            this.request<SerializerModeJSON, Record<string, string>>({
                path: `/modes/${id}`,
                method: "GET",
                format: "json",
                ...params,
            }),

        modesCreate: (
            data: Partial<SerializerModeJSON> & { image_key?: File; video_key?: File },
            params: RequestParams = {}
        ) =>
            this.request<SerializerModeJSON, Record<string, string>>({
                path: `/modes`,
                method: "POST",
                body: data,
                secure: true,
                type: ContentType.FormData,
                format: "json",
                ...params,
            }),
    };

    // 📋 Fuel Consumptions
    fuelConsumptions = {
        fuelConsumptionCartList: (params: RequestParams = {}) =>
            this.request<SerializerCartJSON, any>({
                path: `/fuel-consumptions/cart`,
                method: "GET",
                secure: true,           // ✅ теперь эндпоинт защищён
                format: "json",
                ...params,
            }),

        fuelConsumptionsList: (
            query?: { from_date?: string; to_date?: string; status?: string },
            params: RequestParams = {}
        ) =>
            this.request<SerializerFuelConsumptionJSON[], Record<string, string>>({
                path: `/fuel-consumptions`,
                method: "GET",
                query: query,
                secure: true,
                format: "json",
                ...params,
            }),

        fuelConsumptionsDetail: (id: number, params: RequestParams = {}) =>
            this.request<
                { consumption: SerializerFuelConsumptionJSON; entries: SerializerFuelModeEntryJSON[] },
                Record<string, string>
            >({
                path: `/fuel-consumptions/${id}`,
                method: "GET",
                secure: true,
                format: "json",
                ...params,
            }),

        fuelConsumptionsUpdate: (
            id: number,
            body: SerializerFuelConsumptionUpdateJSON,
            params: RequestParams = {}
        ) =>
            this.request<SerializerFuelConsumptionJSON, Record<string, string>>({
                path: `/fuel-consumptions/${id}`,
                method: "PUT",
                body: body,
                secure: true,
                type: ContentType.Json,
                format: "json",
                ...params,
            }),

        fuelConsumptionsDelete: (id: number, params: RequestParams = {}) =>
            this.request<Record<string, string>, Record<string, string>>({
                path: `/fuel-consumptions/${id}`,
                method: "DELETE",
                secure: true,
                format: "json",
                ...params,
            }),

        fuelConsumptionsFormUpdate: (id: number, params: RequestParams = {}) =>
            this.request<SerializerFuelConsumptionJSON, Record<string, string>>({
                path: `/fuel-consumptions/${id}/form`,
                method: "PUT",
                secure: true,
                format: "json",
                ...params,
            }),

        fuelConsumptionsFinishUpdate: (
            id: number,
            body: SerializerFinishJSON,
            params: RequestParams = {}
        ) =>
            this.request<SerializerFuelConsumptionJSON, Record<string, string>>({
                path: `/fuel-consumptions/${id}/finish`,
                method: "PUT",
                body: body,
                secure: true,
                type: ContentType.Json,
                format: "json",
                ...params,
            }),
    };

    // 🔗 Fuel Mode Entries
    fuelModeEntries = {
        add: (modeId: number, params: RequestParams = {}) =>
            this.request<Record<string, any>, Record<string, string>>({
                path: `/fuel-consumption-modes/add/${modeId}`,
                method: "POST",
                secure: true,
                format: "json",
                ...params,
            }),

        update: (
            modeId: number,
            consumptionId: number,
            body: SerializerFuelModeEntryUpdateJSON,
            params: RequestParams = {}
        ) =>
            this.request<SerializerFuelModeEntryJSON, Record<string, string>>({
                path: `/fuel-consumption-modes/${modeId}/${consumptionId}`,
                method: "PUT",
                body: body,
                secure: true,
                type: ContentType.Json,
                format: "json",
                ...params,
            }),

        delete: (modeId: number, consumptionId: number, params: RequestParams = {}) =>
            this.request<Record<string, string>, Record<string, string>>({
                path: `/fuel-consumption-modes/${modeId}/${consumptionId}`,
                method: "DELETE",
                secure: true,
                format: "json",
                ...params,
            }),
    };
}

// ─── Экспорт и интерцепторы ─────────────────────────────────────────

// 🔹 Умное определение baseURL
const getBaseURL = () => {
    // 1. Явно заданная переменная (приоритет)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // 2. Продакшен (GitHub Pages) -> локальный бэкенд
    if (import.meta.env.PROD) {
        return "http://localhost:8080";
    }
    // 3. Разработка -> прокси Vite
    return "/api";
};

const baseURL = getBaseURL();

// 🔹 Отладочный лог (удалите после проверки!)
console.log("🚀 API BaseURL:", baseURL, "| PROD:", import.meta.env.PROD);

export const api = new Api({ baseURL });

// 🔒 Добавление токена
api.instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 🔓 Сохранение токена при логине
api.instance.interceptors.response.use(
    (response) => {
        const data = response.data;
        const token = data?.access_token ?? data?.token;
        if (token) {
            localStorage.setItem("token", String(token));
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
        }
        return Promise.reject(error);
    }
);