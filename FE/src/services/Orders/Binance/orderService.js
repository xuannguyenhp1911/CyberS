import api from "../../../utils/api"

export const getAllOrderBinance = async (botListID) => {
    return await api.post("/ordersBinance/getAllOrder", { botListID })
}

export const cancelOrderBinance = async (positionData) => {
    return await api.post("/ordersBinance/cancelOrder", { positionData })
}
export const cancelOrderAllBinance = async (positionData) => {
    return await api.post("/ordersBinance/cancelOrderAll", { positionData })
}