import api from "../utils/api"

export const getAllServer = async () => {
    return await api.get("/servers/getAll")
}

export const createServer = async (data) => {
    return await api.post("/servers/create", data)
}
export const addBotToServer = async ({ botID, serverID }) => {
    return await api.post("/servers/addBotToServer", { botID, serverID })
}
export const editServerBot = async ({ botID, serverID, serverIDOld }) => {
    return await api.post("/servers/editServerBot", { botID, serverID, serverIDOld })
}
export const getAllServerByBotType = async (botType) => {
    return await api.post("/servers/getAllServerByBotType", { botType })
}

export const updateServer = async ({ ServerID, data }) => {
    return await api.put(`/servers/update/${ServerID}`, data)
}
export const deleteServer = async (ServerID) => {
    return await api.delete(`/servers/delete/${ServerID}`)
}
export const closeAllBotForUpCodeByServerIP = async (ServerIP) => {
    return await api.get(`/servers/closeAllBotForUpCodeByServerIP/${ServerIP}`)
}
export const restartByServerIP = async (ServerIP) => {
    return await api.get(`/servers/restartByServerIP/${ServerIP}`)
}
