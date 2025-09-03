import api from "../../../utils/api"

export const getAllOrderByBit = async (botListID) => {
    return await api.post("/ordersByBit/getAllOrder", { botListID })
}

export const cancelOrderByBit = async (positionData) => {
    return await api.post("/ordersByBit/cancelOrder", { positionData })
}
export const cancelOrderAllByBit = async (positionData) => {
    return await api.post("/ordersByBit/cancelOrderAll", { positionData })
}