import { createSlice } from '@reduxjs/toolkit'

const loadingSlice = createSlice({
    name: 'toast',
    initialState: {
        loadingMain: true,
    },
    reducers: {

        setLoadingMain: (state, action) => {
            state.loadingMain = action.payload
        },

    }
})

export const { setLoadingMain } = loadingSlice.actions
export default loadingSlice.reducer