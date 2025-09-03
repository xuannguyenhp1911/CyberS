import api from "../../../../utils/api"

// GET
export const offAllByBitV3 = async () => {
    return await api.get("/configMT5V4/closeAllBotForUpCode")
}
export const getAllStrategies = async (botListInput) => {
    return await api.post("/configMT5V4/getAllStrategies", { botListInput })
}
export const getAllSymbol = async () => {
    return await api.get("/configMT5V4/getAllSymbol")
}

export const getFutureAvailable = async (botID) => {
    return await api.get(`/configMT5V4/getFutureAvailable/${botID}`)
}

export const testMT5 = async (botType) => {
    return await api.post(`/configMT5V4/testMT5`,{botType})
}
export const getTotalFutureByBot = async (botType) => {
    return await api.post(`/configMT5V4/getTotalFutureByBot`,{botType})
}


export const getSpotTotal = async (botID) => {
    return await api.get(`/configMT5V4/getSpotTotal/${botID}`)
}

// CREATE
export const createStrategies = async (data) => {
    return await api.post("/configMT5V4/createStrategies", data)
}
export const getTotalFutureSpot = async (userID) => {
    return await api.get(`/configMT5V4/getTotalFutureSpot/${userID}`)
}
export const getTotalFutureSpotByBot = async (botListId) => {
    return await api.post("/configMT5V4/getTotalFutureSpotByBot", {botListId})
}

// UPDATE
export const updateStrategiesByID = async ({ id, data }) => {
    return await api.put(`/configMT5V4/updateStrategies/${id}`, data)
}
export const updateStrategiesMultiple = async (data) => {
    return await api.post("/configMT5V4/updateStrategiesMultiple", data)
}
export const addToBookmark = async ({ symbolID }) => {
    return await api.put(`/configMT5V4/addToBookmark/${symbolID}`)
}
export const removeToBookmark = async ({ symbolID }) => {
    return await api.put(`/configMT5V4/removeToBookmark/${symbolID}`)
}

// DELETE
export const deleteStrategies = async (id,data) => {
    return await api.post(`/configMT5V4/deleteStrategies/${id}`,data)
}
export const deleteStrategiesItem = async (data) => {
    return await api.post("/configMT5V4/deleteStrategiesItem", data)
}
export const deleteStrategiesMultiple = async (data) => {
    return await api.post("/configMT5V4/deleteStrategiesMultiple", data)
}

// OTHER
export const syncSymbol = async () => {
    return await api.get("/configMT5V4/syncSymbol")
}
export const copyMultipleStrategiesToSymbol = async (newData) => {
    return await api.post(`/configMT5V4/copyMultipleStrategiesToSymbol`, newData)
}
export const copyMultipleStrategiesToBot = async (newData) => {
    return await api.post(`/configMT5V4/copyMultipleStrategiesToBot`, newData)
}
export const balanceWallet = async (data) => {
    return await api.post("/configMT5V4/balanceWallet", data)
}
