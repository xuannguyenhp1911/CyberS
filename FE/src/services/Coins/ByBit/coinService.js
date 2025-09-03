import api from "../../../utils/api"

// GET

export const getAllCoinSpotByBit = async () => {
    return await api.get("/coinByBit/getAll")
}

// OTHER
export const syncAllCoinSpotByBit = async () => {
    return await api.get("/coinByBit/sync")
}
