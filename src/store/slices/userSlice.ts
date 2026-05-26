// src/store/slices/userSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api";
import { apiErrMessage } from "../utils/apiError";

export interface UserState {
    login: string;
    isAuthenticated: boolean;
    isModerator: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: UserState = {
    login: localStorage.getItem("user_login") || "",
    isAuthenticated: !!localStorage.getItem("token"),
    isModerator: localStorage.getItem("user_is_moderator") === "true",
    loading: false,
    error: null,
};

// 🔹 LOGIN
export const loginUser = createAsyncThunk(
    "user/login",
    async (credentials: { login: string; password: string }, { rejectWithValue }) => {
        try {
            const r = await api.users.signinCreate(credentials);
            const token = r.data?.access_token ?? r.data?.token;
            if (token) {
                localStorage.setItem("token", String(token));
                localStorage.setItem("user_login", credentials.login);
                localStorage.setItem("user_is_moderator", String(r.data?.is_moderator ?? false));
            }
            return {
                login: credentials.login,
                isModerator: r.data?.is_moderator ?? false,
            };
        } catch (e) {
            return rejectWithValue(apiErrMessage(e));
        }
    }
);

// 🔹 REGISTER
export const registerUser = createAsyncThunk(
    "user/register",
    async (userData: { login: string; password: string; is_moderator?: boolean }, { rejectWithValue }) => {
        try {
            await api.users.signupCreate({
                login: userData.login,
                password: userData.password,
                is_moderator: userData.is_moderator ?? false,
            });
            const r = await api.users.signinCreate({ login: userData.login, password: userData.password });
            const token = r.data?.access_token ?? r.data?.token;
            if (token) {
                localStorage.setItem("token", String(token));
                localStorage.setItem("user_login", userData.login);
                localStorage.setItem("user_is_moderator", String(r.data?.is_moderator ?? false));
            }
            return { login: userData.login, isModerator: r.data?.is_moderator ?? false };
        } catch (e) {
            return rejectWithValue(apiErrMessage(e));
        }
    }
);

// 🔹 LOGOUT
export const logoutUser = createAsyncThunk("user/logout", async (_, { rejectWithValue }) => {
    try {
        await api.users.signoutCreate();
    } catch (e) {
        // Игнорируем ошибку, если сессия уже истекла
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user_login");
    localStorage.removeItem("user_is_moderator");
    return true;
});

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        clearUserError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.login = action.payload.login;
                state.isModerator = action.payload.isModerator;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.login = action.payload.login;
                state.isModerator = action.payload.isModerator;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(logoutUser.fulfilled, () => initialState);
    },
});

export const { clearUserError } = userSlice.actions;
export default userSlice.reducer;