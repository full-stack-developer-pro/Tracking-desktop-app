import axios from "axios";

const API_URL: string =
  import.meta.env.VITE_LOCAL_BACKEND_URL || "http://localhost:3000";
console.log("api url", import.meta.env.VITE_LOCAL_BACKEND_URL);

const uploadImage = (data: any) => {
  return axios.post(API_URL + "/api/upload/image", data);
};

const DataService = { uploadImage };

export default DataService;
