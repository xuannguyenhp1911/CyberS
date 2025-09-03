import api from "../../../../utils/api"

export const getAllConfigOKXV1VIP = async () => {
    return await api.get("/scannerOKXV1V/getAll")
}

export const createConfigOKXV1VIP = async (data) => {
    return await api.post("/scannerOKXV1V/create", data)
}

export const clearVConfigOKXV1 = async () => {
    return await api.post("/scannerOKXV1V/clearV")
}

export const updateConfigOKXV1VIP = async ({ConfigOKXV1IDVIP,data}) => {
    return await api.put(`/scannerOKXV1V/update/${ConfigOKXV1IDVIP}`, data)
}
export const deleteMultipleConfigOKXV1VIP = async (ConfigOKXV1IDVIP) => {
    return await api.post(`/scannerOKXV1V/deleteMultiple`,ConfigOKXV1IDVIP)
}