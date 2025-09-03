import api from "../../../utils/api"

// GET

export const getAllInstrumentOKXV1Futures = async () => {
    return await api.get("/coinOKXFutures/getAll")
}

// OTHER
export const syncInstrumentOKXV1Futures = async () => {
    return await api.get("/coinOKXFutures/sync")
}
