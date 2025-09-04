import axios from "axios";

const API_URL: string = "http://localhost:3000";

type Data = {
  email: string;
  password: string;
};

const login = (data: Data) => {
  return axios.post(API_URL + "/api/user/login", data, {
    withCredentials: true,
  });
};

const AuthService = { login };

export default AuthService;
