import api from "../../../utils/api"

// GET

export const getAllCoin = async () => {
    return await api.get("/coinBinanceFutures/getAllCoin")
}
export const getAllCoinDelist = async () => {
    return await api.get("/coinBinanceFutures/getAllCoinDelist")
}
// OTHER
export const syncCoin = async () => {
    return await api.get("/coinBinanceFutures/syncCoin")
}
