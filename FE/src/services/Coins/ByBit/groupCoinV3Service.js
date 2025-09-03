import api from "../../../utils/api"

export const getAllGroupCoin = async () => {
    return await api.get("/groupCoinByBitV3/getAll")
}

export const createGroupCoin = async (data) => {
    return await api.post("/groupCoinByBitV3/create", data)
}

export const updateGroupCoin = async ({ groupCoinID, data }) => {
    return await api.put(`/groupCoinByBitV3/update/${groupCoinID}`, data)
}
export const deleteGroupCoin = async ({ id, forType }) => {
    return await api.post(`/groupCoinByBitV3/delete`, { id, forType })
}