import { createSlice } from '@reduxjs/toolkit'

const toastSlice = createSlice({
    name: 'toast',
    initialState: {
        isOpen: false,
        status: 1,
        message: ""
    },
    reducers: {

        addMessageToast: (state, action) => {
            state.isOpen = true
            const { status, message } = action.payload
            state.status = status
            state.message = message
        },
        closeToast: state => {
            // Redux Toolkit allows us to write "mutating" logic in reducers. It
            // doesn't actually mutate the state because it uses the Immer library,
            // which detects changes to a "draft state" and produces a brand new
            // immutable state based off those changes
            state.isOpen = false
        },
    }
})

export const { addMessageToast, closeToast } = toastSlice.actions
export default toastSlice.reducer