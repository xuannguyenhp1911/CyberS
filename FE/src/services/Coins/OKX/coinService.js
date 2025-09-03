import api from "../../../utils/api"

// GET

export const getAllInstrumentOKXV1 = async () => {
    return await api.get("/coinOKX/getAll")
}

// OTHER
export const syncInstrumentOKXV1 = async () => {
    return await api.get("/coinOKX/sync")
}
