import api from "../../../../utils/api"

// GET

export const getAllStrategiesSpot = async (botListInput) => {
    return await api.post("/spotByBit/getAllStrategiesSpot", { botListInput })
}
export const getAllSymbolSpot = async () => {
    return await api.get("/spotByBit/getAllSymbolSpot")
}

export const getFutureAvailableOKX = async (botData) => {
    return await api.post(`/spotByBit/getFutureAvailable`, { botData })
}
export const getSpotTotalOKX = async (botData) => {
    return await api.post(`/spotByBit/getSpotTotal`, { botData })
}

export const getTotalFutureByBot = async (userID) => {
    return await api.get(`/spotByBit/getTotalFutureByBot/${userID}`)
}

// CREATE
export const createStrategiesSpot = async (data) => {
    return await api.post("/spotByBit/createStrategiesSpot", data)
}

// UPDATE
export const updateStrategiesSpotByID = async ({ id, data }) => {
    return await api.put(`/spotByBit/updateStrategiesSpotByID/${id}`, data)
}
export const updateStrategiesMultipleSpot = async (data) => {
    return await api.post("/spotByBit/updateStrategiesMultipleSpot", data)
}
export const addToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/spotByBit/addToBookmarkSpot/${symbolID}`)
}
export const removeToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/spotByBit/removeToBookmarkSpot/${symbolID}`)
}

// DELETE
export const deleteStrategiesSpot = async (id) => {
    return await api.delete(`/spotByBit/deleteStrategiesSpot/${id}`)
}
export const deleteStrategiesItemSpot = async (data) => {
    return await api.post("/spotByBit/deleteStrategiesItemSpot", data)
}
export const deleteStrategiesMultipleSpot = async (data) => {
    return await api.post("/spotByBit/deleteStrategiesMultipleSpot", data)
}

// OTHER
export const syncSymbolSpot = async (listSymbolObject) => {
    return await api.post("/spotByBit/syncSymbolSpot", listSymbolObject)
}
export const copyMultipleStrategiesToSymbolSpot = async (newData) => {
    return await api.post(`/spotByBit/copyMultipleStrategiesToSymbolSpot`, newData)
}
export const copyMultipleStrategiesToBotSpot = async (newData) => {
    return await api.post(`/spotByBit/copyMultipleStrategiesToBotSpot`, newData)
}
export const balanceWalletOKX = async (botData) => {
    return await api.post("/spotByBit/balanceWallet", botData)
}

// Other V1
export const getSpotBorrowCheck = async ({ botListData, symbol }) => {
    return await api.post("/spotByBit/getSpotBorrowCheck", { botListData, symbol })
}