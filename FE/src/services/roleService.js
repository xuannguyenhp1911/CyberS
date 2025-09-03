import api from "../utils/api"

export const getByRoleName = async (roleName) => {
  return await api.get(`/role/${roleName}`)
}