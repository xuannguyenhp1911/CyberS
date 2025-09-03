import { useEffect } from "react";
import { useDispatch } from "react-redux"
import { addListBreadcrumbs } from "../../store/slices/breadcrumbs";

function AddBreadcrumbs({
    list
},ref) {

    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(addListBreadcrumbs([""].concat(list)))
    }, []);

    return (
        <></>
    );
}

export default AddBreadcrumbs;