import api from "../utils/api"


export const getCoinsBlock = async (data) => {
    return await api.get("/coinsBlock/getAll", data)
}
export const createCoinsBlock = async (data) => {
    return await api.post("/coinsBlock/create", data)
}
export const getAllByMarket = async (data) => {
    return await api.post("/coinsBlock/getAllByMarket", data)
}
export const getAllIDScannerForBlack = async (data) => {
    return await api.post("/coinsBlock/getAllIDScannerForBlack", data)
}

export const updateCoinsBlock = async ({ id, data }) => {
    return await api.put(`/coinsBlock/update/${id}`, data)
}
