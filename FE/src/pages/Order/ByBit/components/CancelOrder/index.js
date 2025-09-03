import { useDispatch } from "react-redux";
import { useState } from "react";
import DialogCustom from "../../../../../components/DialogCustom";
import { cancelOrderByBit } from "../../../../../services/Orders/ByBit/orderService";
import { addMessageToast } from "../../../../../store/slices/Toast";

function CancelOrderOKXV1({
    onClose,
    positionData,
}) {


    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);


    const handleSubmitLimit = async () => {
        setLoading(true)
        try {
            const res = await cancelOrderByBit(positionData)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status,
                message,
            }))
            if (status === 200) {
                handleClose(true)
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Cancel Order Error",
            }))
        }
        setLoading(false)
    }

    const handleClose = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
    }
    return (
        <DialogCustom
            loading={loading}
            dialogTitle="Cancel Order"
            open={true}
            onClose={() => { handleClose(false) }}
            onSubmit={handleSubmitLimit}
            reserveBtn
            submitBtnColor="error"
            submitBtnText="Cancel"
        >
            <p style={{ textAlign: "center" }}>Do you want to cancel this order?</p>
        </DialogCustom>
    );
}

export default CancelOrderOKXV1;