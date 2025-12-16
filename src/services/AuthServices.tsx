import api from "../../electron/utils/axiosInstance";

type LoginData = {
  email: string;
  password: string;
};

const login = (data: LoginData) => {
  return api.post("/auth/sign-in", data);
};

const logout = () => {
  return api.get("/auth/sign-out");
};

const verifyToken = () => {
  return api.get("/auth/verify");
};

const refreshAccessToken = (refreshToken: string) => {
  return api.post("/auth/refresh-token", { refreshToken });
};

export { login, logout, verifyToken, refreshAccessToken };
