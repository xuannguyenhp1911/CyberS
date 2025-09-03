import api from "../../../../utils/api"

// GET
export const getAllStrategiesSpot = async (botListInput) => {
    return await api.post("/marginByBit/getAllStrategiesSpot", { botListInput })
}
export const getAllSymbolSpot = async () => {
    return await api.get("/marginByBit/getAllSymbolSpot")
}

export const getFutureAvailable = async (botID) => {
    return await api.get(`/marginByBit/getFutureAvailable/${botID}`)
}

export const getTotalFutureByBot = async (userID) => {
    return await api.get(`/marginByBit/getTotalFutureByBot/${userID}`)
}

export const getSpotTotal = async (botID) => {
    return await api.get(`/marginByBit/getSpotTotal/${botID}`)
}

// CREATE
export const createStrategiesSpot = async (data) => {
    return await api.post("/marginByBit/createStrategiesSpot", data)
}

// UPDATE
export const updateStrategiesSpotByID = async ({ id, data }) => {
    return await api.put(`/marginByBit/updateStrategiesSpotByID/${id}`, data)
}
export const updateStrategiesMultipleSpot = async (data) => {
    return await api.post("/marginByBit/updateStrategiesMultipleSpot", data)
}
export const addToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/marginByBit/addToBookmarkSpot/${symbolID}`)
}
export const removeToBookmarkSpot = async ({ symbolID }) => {
    return await api.put(`/marginByBit/removeToBookmarkSpot/${symbolID}`)
}

// DELETE
export const deleteStrategiesSpot = async (id) => {
    return await api.delete(`/marginByBit/deleteStrategiesSpot/${id}`)
}
export const deleteStrategiesItemSpot = async (data) => {
    return await api.post("/marginByBit/deleteStrategiesItemSpot", data)
}
export const deleteStrategiesMultipleSpot = async (data) => {
    return await api.post("/marginByBit/deleteStrategiesMultipleSpot", data)
}

// OTHER
export const syncSymbolSpot = async (listSymbolObject) => {
    return await api.post("/marginByBit/syncSymbolSpot",listSymbolObject)
}
export const copyMultipleStrategiesToSymbolSpot = async (newData) => {
    return await api.post(`/marginByBit/copyMultipleStrategiesToSymbolSpot`, newData)
}
export const copyMultipleStrategiesToBotSpot = async (newData) => {
    return await api.post(`/marginByBit/copyMultipleStrategiesToBotSpot`, newData)
}
export const balanceWallet = async (data) => {
    return await api.post("/marginByBit/balanceWallet", data)
}

export const getMarginBorrowCheck = async ({ botListData,symbol,positionSide }) => {
    return await api.post("/marginByBit/getMarginBorrowCheck", { botListData,symbol,positionSide })
}
export const getLeverOKX = async (data) => {
    return await api.post("/marginByBit/getLever", data)
}