
import api from "../../../../utils/api"

export const getAllStrategiesSpot = async (botListInput) => {
    return await api.post("/configByBitV1Futures/getAllStrategiesSpot", { botListInput })
}
export const getAllSymbolSpot = async () => {
    return await api.get("/configByBitV1Futures/getAllSymbolSpot")
}

export const getFutureAvailableOKX = async (botData) => {
    return await api.post(`/configByBitV1Futures/getFutureAvailable`, { botData })
}
export const getSpotTotalOKX = async (botData) => {
    return await api.post(`/configByBitV1Futures/getSpotTotal`, { botData })
}

export const getTotalFutureByBot = async (userID) => {
    return await api.get(`/configByBitV1Futures/getTotalFutureByBot/${userID}`)
}

// CREATE
export const createStrategiesSpot = async (data) => {
    return await api.post("/configByBitV1Futures/createStrategiesSpot", data)
}

// UPDATE
export const updateStrategiesSpotByID = async ({ id, data }) => {
    return await api.put(`/configByBitV1Futures/updateStrategiesSpotByID/${id}`, data)
}
export const updateStrategiesMultipleSpot = async (data) => {
    return await api.post("/configByBitV1Futures/updateStrategiesMultipleSpot", data)
}
export const addToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/configByBitV1Futures/addToBookmarkSpot/${symbolID}`)
}
export const removeToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/configByBitV1Futures/removeToBookmarkSpot/${symbolID}`)
}

// DELETE
export const deleteStrategiesSpot = async (id) => {
    return await api.delete(`/configByBitV1Futures/deleteStrategiesSpot/${id}`)
}
export const deleteStrategiesItemSpot = async (data) => {
    return await api.post("/configByBitV1Futures/deleteStrategiesItemSpot", data)
}
export const deleteStrategiesMultipleSpot = async (data) => {
    return await api.post("/configByBitV1Futures/deleteStrategiesMultipleSpot", data)
}

// OTHER
export const syncSymbolSpot = async (listSymbolObject) => {
    return await api.post("/configByBitV1Futures/syncSymbolSpot", listSymbolObject)
}
export const copyMultipleStrategiesToSymbolSpot = async (newData) => {
    return await api.post(`/configByBitV1Futures/copyMultipleStrategiesToSymbolSpot`, newData)
}
export const copyMultipleStrategiesToBotSpot = async (newData) => {
    return await api.post(`/configByBitV1Futures/copyMultipleStrategiesToBotSpot`, newData)
}
export const balanceWalletOKX = async (botData) => {
    return await api.post("/configByBitV1Futures/balanceWallet", botData)
}

// Other V1
export const getSpotBorrowCheck = async ({ botListData, symbol }) => {
    return await api.post("/configByBitV1Futures/getSpotBorrowCheck", { botListData, symbol })
}
export const getLeverOKXFutures = async (data) => {
    return await api.post("/configByBitV1Futures/getLever", data)
}