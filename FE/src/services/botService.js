import api from "../utils/api"

export const getAllBot = async () => {
    return await api.get("/bot/getAllBot")
}
export const getAllBotActive = async (botType) => {
    return await api.get(`/bot/getAllBotActive?botType=${botType}`)
}
export const getAllBotByUserID = async (userID) => {
    return await api.get(`/bot/getAllBotByUserID/${userID}`)
}
export const getAllBotActiveByUserID = async (userID, botType) => {
    return await api.get(`/bot/getAllBotActiveByUserID/${userID}?botType=${botType}`)
}

export const getAllBotOnlyApiKey = async ( botType) => {
    return await api.get(`/bot/getAllBotOnlyApiKey/${botType}`)
}
export const getAllBotOnlyApiKeyByUserID = async (userID, botType) => {
    return await api.get(`/bot/getAllBotOnlyApiKeyByUserID/${userID}?botType=${botType}`)
}
export const getAllBotByGroupCreatedByUserID = async () => {

    return await api.post(`/bot/getAllBotByGroupCreatedByUserID`)
}
export const getAllBotBySameGroup = async (groupID) => {
    return await api.get(`/bot/getAllBotBySameGroup/${groupID}`)
}
export const getAllBotByListID = async (listID) => {
    return await api.post(`/bot/getAllBotByListID`, { listID })
}
export const getBotByID = async (botID) => {
    return await api.get(`/bot/${botID}`)
}
export const createBot = async (data) => {
    return await api.post("/bot", data)
}
export const updateBot = async ({ id, data }) => {
    return await api.put(`/bot/${id}`, data)
}
export const updateFutureBalancePercent = async (data) => {
    return await api.post(`/bot/updateFutureBalancePercent`, data)
}
export const deleteBot = async (data) => {
    return await api.post(`/bot/deleteBot`, data)
}

export const deleteMultipleBot = async (botIDList, botType) => {
    return await api.post(`/bot/deleteMultipleBot?botType=${botType}`, botIDList)
}

export const setMargin = async (botData) => {
    return await api.post(`/bot/setMargin`, botData)
}
export const setLever = async (data) => {
    return await api.post(`/bot/setLever`, data)
}
export const setLeverByBit = async (data) => {
    return await api.post(`/bot/setLeverByBit`, data)
}
export const setLeverBinance = async (data) => {
    return await api.post(`/bot/setLeverBinance`, data)
}
export const setLeverSymbolBot = async (data) => {
    return await api.post(`/bot/setLeverSymbolBot`, data)
}
export const setLeverSymbolBotFutures = async (data) => {
    return await api.post(`/bot/setLeverSymbolBotFutures`, data)
}
export const getApiInfo = async (data) => {
    return await api.post(`/bot/getApiInfo`, data)
}


export const getTotalFutureSpot = async (userID) => {
    return await api.get(`/bot/getTotalFutureSpot/${userID}`)
}
export const getTotalFutureSpotByBot = async (botListID) => {
    return await api.post("/bot/getTotalFutureSpotByBot", {botListID})
}
export const getTotalFutureBotByBotType = async (botType) => {
    return await api.post("/bot/getTotalFutureBotByBotType", {botType})
}

export const updateBotCopyTrading = async (data) => {
    return await api.post(`/bot/updateBotCopyTrading`, data)
}


export const getAllBotForCopyTrading = async ( botType = "") => {
    return await api.get(`/bot/getAllBotForCopyTrading?botType=${botType}`)
}