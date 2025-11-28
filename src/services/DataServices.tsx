import axios from "axios";

const API_URL: string =
  import.meta.env.VITE_LOCAL_BACKEND_URL || "http://localhost:3000";
// console.log("api url", import.meta.env.VITE_LOCAL_BACKEND_URL);

const uploadImage = (data: any) => {
  return axios.post(`${API_URL}/api/upload/image`, data);
};

const getTrackingSettings = (companyId: string) => {
  return axios.get(`API_URL/api/trackings/${companyId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });
};

const DataService = { uploadImage, getTrackingSettings };

export default DataService;
