import api from "../utils/api"

export const getAllBotType = async () => {
    return await api.get("/botType/getAll")
}

export const createBotType = async (data) => {
    return await api.post("/botType/create", data)
}

export const updateBotType = async ({botTypeID,data}) => {
    return await api.put(`/botType/update/${botTypeID}`, data)
}
export const deleteMultipleBotType = async (botTypeID) => {
    return await api.post(`/botType/deleteMultiple`,botTypeID)
}