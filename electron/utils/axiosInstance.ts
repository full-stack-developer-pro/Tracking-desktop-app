import axios from "axios";

const API_URL: string = `${
  import.meta.env.VITE_BACKEND_URL ||
  "https://darkturquoise-goat-278295.hostingersite.com/"
}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `API Request: ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          console.log("Attempting to refresh access token...");

          const { data } = await axios.post(
            `${API_URL}/auth/refresh-token`,
            { refreshToken },
            { withCredentials: true }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            data?.data || data;

          localStorage.setItem("token", accessToken);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          if (window.electronAPI?.updateToken) {
            window.electronAPI.updateToken(accessToken);
          }

          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        localStorage.clear();
        window.dispatchEvent(new Event("auth:logout"));
      }
    }

    console.error("API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default api;
