import api from "../../../utils/api"

export const getPriceLimitCurrent = async (symbol) => {
    return await api.post("/positionBinance/getPriceLimitCurrent", {symbol})
}

export const getAllPosition = async (botListID) => {
    return await api.post("/positionBinance/getAllPosition", { botListID })
}

export const updatePL = async (botListID) => {
    return await api.post("/positionBinance/updatePL", { botListID })
}

export const closeMarket = async ({ positionData, Quantity }) => {
    return await api.post("/positionBinance/closeMarket", { positionData, Quantity })
}
export const closeLimit = async ({ positionData, Quantity, Price }) => {
    return await api.post("/positionBinance/closeLimit", { positionData, Quantity, Price })
}
export const closeAllPosition = async (botListID,positionData) => {
    return await api.post("/positionBinance/closeAllPosition", { botListID,positionData })
}

