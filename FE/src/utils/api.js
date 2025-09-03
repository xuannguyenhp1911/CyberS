import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BASE_URL}`,
});


api.interceptors.request.use(
  (config) => {
    try {

      const token = localStorage.getItem("tk_crypto_temp") || localStorage.getItem("tk_crypto")

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    catch (e) {

    }
    return config;

  },
  (error) => {
    return Promise.reject(error);
  }
);


export default api;
