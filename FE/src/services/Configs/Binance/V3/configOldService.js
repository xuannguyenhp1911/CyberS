import api from "../../../../utils/api"

// GET
export const offAllByBitV3 = async () => {
    return await api.get("/configBinanceOldV3/closeAllBotForUpCode")
}
export const getAllStrategies = async (botListInput) => {
    return await api.post("/configBinanceOldV3/getAllStrategies", { botListInput })
}
export const getAllSymbol = async () => {
    return await api.get("/configBinanceOldV3/getAllSymbol")
}

export const getFutureAvailable = async (botID) => {
    return await api.get(`/configBinanceOldV3/getFutureAvailable/${botID}`)
}

export const getTotalFutureByBot = async (botType) => {
    return await api.post(`/configBinanceOldV3/getTotalFutureByBot`,{botType})
}


export const getSpotTotal = async (botID) => {
    return await api.get(`/configBinanceOldV3/getSpotTotal/${botID}`)
}

// CREATE
export const createStrategies = async (data) => {
    return await api.post("/configBinanceOldV3/createStrategies", data)
}
export const getTotalFutureSpot = async (userID) => {
    return await api.get(`/configBinanceOldV3/getTotalFutureSpot/${userID}`)
}
export const getTotalFutureSpotByBot = async (botListId) => {
    return await api.post("/configBinanceOldV3/getTotalFutureSpotByBot", {botListId})
}

// UPDATE
export const updateStrategiesByID = async ({ id, data }) => {
    return await api.put(`/configBinanceOldV3/updateStrategies/${id}`, data)
}
export const updateStrategiesMultiple = async (data) => {
    return await api.post("/configBinanceOldV3/updateStrategiesMultiple", data)
}
export const addToBookmark = async ({ symbolID }) => {
    return await api.put(`/configBinanceOldV3/addToBookmark/${symbolID}`)
}
export const removeToBookmark = async ({ symbolID }) => {
    return await api.put(`/configBinanceOldV3/removeToBookmark/${symbolID}`)
}

// DELETE
export const deleteStrategies = async (id,data) => {
    return await api.post(`/configBinanceOldV3/deleteStrategies/${id}`,data)
}
export const deleteStrategiesItem = async (data) => {
    return await api.post("/configBinanceOldV3/deleteStrategiesItem", data)
}
export const deleteStrategiesMultiple = async (data) => {
    return await api.post("/configBinanceOldV3/deleteStrategiesMultiple", data)
}

// OTHER
export const syncSymbol = async () => {
    return await api.get("/configBinanceOldV3/syncSymbol")
}
export const copyMultipleStrategiesToSymbol = async (newData) => {
    return await api.post(`/configBinanceOldV3/copyMultipleStrategiesToSymbol`, newData)
}
export const copyMultipleStrategiesToBot = async (newData) => {
    return await api.post(`/configBinanceOldV3/copyMultipleStrategiesToBot`, newData)
}
export const balanceWallet = async (data) => {
    return await api.post("/configBinanceOldV3/balanceWallet", data)
}
export const setAutoOffVol = async (data) => {
    return await api.post("/configBinanceOldV3/setAutoOffVol", data)
}
export const setMaxSymbol = async (data) => {
    return await api.post("/configBinanceOldV3/setMaxSymbol", data)
}