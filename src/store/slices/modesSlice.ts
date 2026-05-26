// src/store/slices/servicesSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ServicesFilters {
    search: string;
    drivingType: "city" | "highway" | "mixed" | "";
    minConsumption: number;
    maxConsumption: number;
}

interface ServicesState {
    filters: ServicesFilters;
    // ... другие поля, если нужны
}

const initialState: ServicesState = {
    filters: {
        search: "",
        drivingType: "",
        minConsumption: 0,
        maxConsumption: 100,
    },
};

export const servicesSlice = createSlice({
    name: "services",
    initialState,
    reducers: {
        setServicesFilters: (state, action: PayloadAction<Partial<ServicesFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetServicesFilters: (state) => {
            state.filters = initialState.filters;
        },
    },
});

export const { setServicesFilters, resetServicesFilters } = servicesSlice.actions;
export default servicesSlice.reducer;