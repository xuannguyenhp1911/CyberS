import { createSlice } from '@reduxjs/toolkit'

const breadcrumbsSlice = createSlice({
    name: 'breadcrumbs',
    initialState: {
        listBreadcrumbs: [],
    },
    reducers: {
        addListBreadcrumbs: (state, action) => {
            state.listBreadcrumbs = action.payload
        },
    }
})

export const { addListBreadcrumbs } = breadcrumbsSlice.actions
export default breadcrumbsSlice.reducer