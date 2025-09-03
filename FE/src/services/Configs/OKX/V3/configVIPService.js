import api from "../../../../utils/api"

export const getAllConfigByBitV3VIP = async () => {
    return await api.get("/configOKXV3V/getAll")
}

export const createConfigByBitV3VIP = async (data) => {
    return await api.post("/configOKXV3V/create", data)
}

export const clearVConfigByBitV3VIP = async () => {
    return await api.post("/configOKXV3V/clearV")
}

export const updateConfigByBitV3VIP = async ({ConfigByBitV3IDVIP,data}) => {
    return await api.put(`/configOKXV3V/update/${ConfigByBitV3IDVIP}`, data)
}
export const deleteMultipleConfigByBitV3VIP = async (ConfigByBitV3IDVIP) => {
    return await api.post(`/configOKXV3V/deleteMultiple`,ConfigByBitV3IDVIP)
}