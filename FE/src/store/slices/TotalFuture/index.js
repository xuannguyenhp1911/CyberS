import { createSlice } from '@reduxjs/toolkit'

const totalFutureSlice = createSlice({
    name: 'totalFuture',
    initialState: {
        total: 0,
        avai: 0,
        botType:""
    },
    reducers: {

        setTotalFuture: (state, action) => {
            const { total,avai,botType } = action.payload
            state.total = total
            state.avai = avai || 0
            state.botType = botType
        },

    }
})

export const { setTotalFuture } = totalFutureSlice.actions
export default totalFutureSlice.reducer