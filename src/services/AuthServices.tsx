import axios from "axios";

const API_URL: string =
  import.meta.env.VITE_LOCAL_BACKEND_URL || "http://localhost:3000";
// console.log("api url", import.meta.env.VITE_LOCAL_BACKEND_URL);

type Data = {
  email: string;
  password: string;
};

const login = (data: Data) => {
  return axios.post(API_URL + "/api/auth/sign-in", data, {
    withCredentials: true,
  });
};

const logout = () => {
  return axios.get(API_URL + "/api/user/logout", {
    withCredentials: true,
  });
};

const AuthService = { login, logout };

export default AuthService;
