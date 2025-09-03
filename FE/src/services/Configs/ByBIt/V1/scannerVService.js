import api from "../../../../utils/api"

export const getAllConfigOKXV1VIP = async () => {
    return await api.get("/scannerByBitV1V/getAll")
}

export const createConfigOKXV1VIP = async (data) => {
    return await api.post("/scannerByBitV1V/create", data)
}

export const clearVConfigOKXV1 = async () => {
    return await api.post("/scannerByBitV1V/clearV")
}

export const updateConfigOKXV1VIP = async ({ConfigOKXV1IDVIP,data}) => {
    return await api.put(`/scannerByBitV1V/update/${ConfigOKXV1IDVIP}`, data)
}
export const deleteMultipleConfigOKXV1VIP = async (ConfigOKXV1IDVIP) => {
    return await api.post(`/scannerByBitV1V/deleteMultiple`,ConfigOKXV1IDVIP)
}