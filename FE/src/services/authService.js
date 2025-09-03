import { removeLocalStorage } from "../functions"
import api from "../utils/api"

export const verifyLogin = async () => {
  return await api.get("/auth")
}
export const signUp = async (data) => {
  return await api.post("/auth/signup", data)
}
export const login = async (data) => {
  return await api.post("/auth/login", data)
}
export const loginSwitch = async (data) => {
  return await api.post("/auth/loginSwitch", data)
}
export const verifyTokenVIP = async (data) => {
  return await api.post("/auth/verifyTokenVIP", data)
}


api.interceptors.response.use(
  (response) => {
    const { status } = response.data
    if (status === 401 || status === 403) {
      removeLocalStorage()
      window.location.href = "/login"
    }
    return response
  },
  (error) => {
    console.log("error interceptors",error);
    return Promise.reject(error);
  }
);
