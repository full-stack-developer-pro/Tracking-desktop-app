import api from "../../electron/utils/axiosInstance";

const uploadImage = (data: any) => {
  return api.post("/upload/image", data, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...data.getHeaders?.(),
    },
  });
};

const getTrackingSettings = (companyId: string) => {
  return api.get(`/trackings/company/${companyId}`);
};

export { uploadImage, getTrackingSettings };
