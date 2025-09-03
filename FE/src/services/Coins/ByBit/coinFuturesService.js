import api from "../../../utils/api"

// GET

export const getAllCoin = async () => {
    return await api.get("/coinByBitFutures/getAllCoin")
}
export const getAllCoinDelist = async () => {
    return await api.get("/coinByBitFutures/getAllCoinDelist")
}

// OTHER
export const syncCoin = async () => {
    return await api.get("/coinByBitFutures/syncCoin")
}
