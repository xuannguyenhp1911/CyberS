import api from "../../../../utils/api"

export const getAllConfigByBitV3VIP = async () => {
    return await api.get("/configBinanceV3VIP/getAll")
}

export const createConfigByBitV3VIP = async (data) => {
    return await api.post("/configBinanceV3VIP/create", data)
}

export const clearVConfigByBitV3VIP = async () => {
    return await api.post("/configBinanceV3VIP/clearV")
}

export const updateConfigByBitV3VIP = async ({ConfigByBitV3IDVIP,data}) => {
    return await api.put(`/configBinanceV3VIP/update/${ConfigByBitV3IDVIP}`, data)
}
export const deleteMultipleConfigByBitV3VIP = async (ConfigByBitV3IDVIP) => {
    return await api.post(`/configBinanceV3VIP/deleteMultiple`,ConfigByBitV3IDVIP)
}