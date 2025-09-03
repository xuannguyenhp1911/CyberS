import { memo } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useNavigate, useParams } from "react-router-dom";
import { deleteBot } from "../../../../../../../../services/botService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

function DeleteBot({
    open,
    onClose,
    botType
}, ref) {

    const { botID } = useParams()

    const dispatch = useDispatch();

    const navigate = useNavigate()


    const handleSubmitDeleteBot = async () => {
        try {
            const res = await deleteBot(botID,botType)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            status === 200 && navigate(-1)
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Bot Error",
            }))
        }
        onClose()
    }

    return (
        <DialogCustom
            backdrop
            open={open}
            onClose={onClose}
            onSubmit={handleSubmitDeleteBot}
            dialogTitle="The action requires confirmation"
            submitBtnColor="error"
            submitBtnText="Delete"
            reserveBtn
            position="center"
        >
            <p style={{ textAlign: "center" }}>Do you want to delete this bot?</p>
        </DialogCustom >
    );
}

export default memo(DeleteBot);