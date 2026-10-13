import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice.js";
import coursesReducer from "../features/courses/coursesSlice.js";

export const store = configureStore({
  reducer: {
    courses: coursesReducer,
    auth: authReducer,
  },
});

export default store;