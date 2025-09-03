import api from "../../../../utils/api"

export const getPriceLimitCurrent = async (symbol) => {
    return await api.post("/positionOKXV3/getPriceLimitCurrent", {symbol})
}

export const getAllPosition = async (botListID) => {
    return await api.post("/positionOKXV3/getAllPosition", { botListID })
}

export const getBalanceWalletOKXV1 = async (botListID) => {
    return await api.post("/positionOKXV3/getBalanceWallet", { botListID })
}
export const getPositionOKXV1 = async (botListID) => {
    return await api.post("/positionOKXV3/getPosition", { botListID })
}

export const closeMarket = async ({ positionData, Quantity }) => {
    return await api.post("/positionOKXV3/closeMarket", { positionData, Quantity })
}
export const closeCoin = async ({ positionData, Quantity }) => {
    return await api.post("/positionOKXV3/closeCoin", { positionData, Quantity })
}
export const closeLimit = async ({ positionData, Quantity, Price }) => {
    return await api.post("/positionOKXV3/closeLimit", { positionData, Quantity, Price })
}
export const closeAllPosition = async (botListID) => {
    return await api.post("/positionOKXV3/closeAllPosition", { botListID })
}

export const repayAll = async (botListID) => {
    return await api.post("/positionOKXV3/repayAll", { botListID })
}
