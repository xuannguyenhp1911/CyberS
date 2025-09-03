import api from "../../../utils/api"

export const getAllOrderOKXV1 = async (botListID) => {
    return await api.post("/ordersOKX/getAllOrder", { botListID })
}

export const cancelOrderOKXV1 = async (positionData) => {
    return await api.post("/ordersOKX/cancelOrder", { positionData })
}
export const cancelOrderAllOKXV1 = async (positionData) => {
    return await api.post("/ordersOKX/cancelOrderAll", { positionData })
}