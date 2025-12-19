import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_URL =
  process.env.VITE_BACKEND_URL || "https://trackingtime-niy8.onrender.com";

const apiMain = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

let currentRefreshToken: string | null = null;

export const setAuthToken = (token: string) => {
  if (token) {
    apiMain.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiMain.defaults.headers.common["Authorization"];
  }
};

export const setRefreshToken = (token: string) => {
  console.log(
    `[Main API] Setting Refresh Token. Length: ${token ? token.length : 0}`
  );
  currentRefreshToken = token;
};

apiMain.interceptors.request.use((config) => {
  console.log(
    `[Main API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${
      config.url
    }`
  );
  return config;
});

apiMain.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Status 401 handling
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log(
        `[Main API] 401 Detected. Refresh Token Available? ${!!currentRefreshToken}`
      );

      if (currentRefreshToken) {
        console.log("[Main API] Attempting refresh...");
        originalRequest._retry = true;

        try {
          // Call refresh endpoint
          // We use axios.create() to avoid interceptors loop or use apiMain without interceptors?
          // Safer to use a clean axios post, but we need base URL.
          // Let's use clean axios.
          const refreshResponse = await axios.post(
            `${API_URL}/api/auth/refresh-token`,
            {
              refreshToken: currentRefreshToken,
            }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            refreshResponse.data?.data || refreshResponse.data;

          if (accessToken) {
            console.log("[Main API] Token refreshed successfully.");
            setAuthToken(accessToken);
            if (newRefreshToken) setRefreshToken(newRefreshToken);

            // Update header for original request
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
            return apiMain(originalRequest);
          }
        } catch (refreshErr: any) {
          console.error("[Main API] Refresh failed:", refreshErr.message);
          if (refreshErr.response) {
            console.error(
              "[Main API] Refresh Error Data:",
              JSON.stringify(refreshErr.response.data)
            );
          }
          // If refresh fails, we can't do much in Main process other than log out or stop tracking.
          // For now, allow the error to propagate.
        }
      } else {
        console.warn("[Main API] No refresh token available to handle 401.");
      }
    }

    console.error(
      `[Main API] Error: ${error.response?.status} ${error.config?.url} - ${error.message}`
    );
    const fullUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    console.error(`[Main API] Failed URL: ${fullUrl}`);

    if (error.response?.data) {
      console.error(
        "[Main API] Error Response Data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return Promise.reject(error);
  }
);

export default apiMain;
