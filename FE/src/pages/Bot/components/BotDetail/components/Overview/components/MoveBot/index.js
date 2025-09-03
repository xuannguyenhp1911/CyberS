import { FormControl, FormLabel, MenuItem, Select } from "@mui/material";
import styles from "./MoveBot.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

const botTypeList = [
    {
        name: "Forbid",
        value: "Forbid"
    },
    {
        name: "Frozen",
        value: "Frozen"
    }
]

function MoveBot({
    open,
    onClose
}, ref) {

    const dispatch = useDispatch()
    const {
        register,
        handleSubmit,
        reset,
    } = useForm();

    const handleSubmitMoveBot = data => {
        dispatch(addMessageToast(
            {
                status: 1,
                message: JSON.stringify(data)
            }
        ))
    }

    const closeDialog = () => {
        onClose()
        reset()
    }


    return (
        <DialogCustom
            open={open}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitMoveBot)}
            dialogTitle="Move Bot"
            submitBtnText="Move"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Move To</FormLabel>
                    <Select
                        defaultValue={botTypeList[0].value}
                        size="small"
                        {...register("botType", { required: true })}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(MoveBot);