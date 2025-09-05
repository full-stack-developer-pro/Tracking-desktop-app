import axios from "axios";

const API_URL: string =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
console.log(import.meta.env.VITE_BACKEND_URL);

const uploadImage = (image: any) => {
  return axios.post(API_URL + "api/upload/image", image);
};

const DataService = { uploadImage };

export default DataService;
