import api from "../../../../utils/api"

export const getPriceLimitCurrent = async (symbol) => {
    return await api.post("/positionOKXV1/getPriceLimitCurrent", {symbol})
}

export const getAllPosition = async (botListID) => {
    return await api.post("/positionOKXV1/getAllPosition", { botListID })
}

export const getBalanceWalletOKXV1 = async (botListID) => {
    return await api.post("/positionOKXV1/getBalanceWallet", { botListID })
}
export const getPositionOKXV1 = async (botListID) => {
    return await api.post("/positionOKXV1/getPosition", { botListID })
}

export const closeMarket = async ({ positionData, Quantity }) => {
    return await api.post("/positionOKXV1/closeMarket", { positionData, Quantity })
}
export const closeCoin = async ({ positionData, Quantity }) => {
    return await api.post("/positionOKXV1/closeCoin", { positionData, Quantity })
}
export const closeLimit = async ({ positionData, Quantity, Price }) => {
    return await api.post("/positionOKXV1/closeLimit", { positionData, Quantity, Price })
}
export const closeAllPosition = async (botListID) => {
    return await api.post("/positionOKXV1/closeAllPosition", { botListID })
}

export const repayAll = async (botListID) => {
    return await api.post("/positionOKXV1/repayAll", { botListID })
}
