import api from "../../../utils/api"

export const getAllGroupCoin = async () => {
    return await api.get("/groupCoinBinance/getAll")
}

export const createGroupCoin = async (data) => {
    return await api.post("/groupCoinBinance/create", data)
}

export const updateGroupCoin = async ({ groupCoinID, data }) => {
    return await api.put(`/groupCoinBinance/update/${groupCoinID}`, data)
}
export const deleteGroupCoin = async ({ id, forType }) => {
    return await api.post(`/groupCoinBinance/delete`, { id, forType })
}