import api from "../../../../utils/api"

// GET

export const getAllConfigScannerV3 = async (botListInput) => {
    return await api.post("/scannerBinanceV3/getAllConfigScannerV3", { botListInput })
}


// CREATE
export const createConfigScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/createConfigScannerV3", data)
}
export const updateStrategiesMultipleScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/updateStrategiesMultipleScannerV3", data)
}

export const deleteStrategiesMultipleScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/deleteStrategiesMultipleScannerV3", data)
}
export const deleteStrategiesByIDScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/deleteStrategiesByIDScannerV3", data)
}
export const copyMultipleStrategiesToBotScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/copyMultipleStrategiesToBotScannerV3", data)
}
export const handleBookmarkScannerV3 = async (data) => {
    return await api.post("/scannerBinanceV3/handleBookmarkScannerV3", data)
}
export const updateConfigByIDV3 = async (data) => {
    return await api.post("/scannerBinanceV3/updateConfigByIDV3", data)
}


// OTHER
export const syncSymbolScannerV3 = async () => {
    return await api.get("/scannerBinanceV3/syncSymbolScannerV3")
}
