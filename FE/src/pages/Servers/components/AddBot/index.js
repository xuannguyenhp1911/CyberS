import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useRef } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { createServer } from "../../../../services/serversService";

function AddBot({
    onClose,
    botTypeList
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch();

    const newBotDataRef = useRef()

    const handleSubmitAddBot = async formData => {

        try {
            const res = await createServer({
                ...formData,
                name: formData.name.trim(),
                IP: formData.IP.trim(),
                botList:[]
            })

            const { message, data: resData, status } = res.data

            resData && (newBotDataRef.current = resData)
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        }
        catch (err) {
            console.log(err);

            dispatch(addMessageToast({
                status: 500,
                message: "Add Server Error",
            }))
        }
        closeDialog()
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: newBotDataRef.current
        })
        reset()
    }

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Add Server"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <Select
                        size="small"
                        {...register("botType", { required: true })}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                    {errors.botType && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("name", {
                            required: true,
                        })}
                        size="small"
                    />
                    {errors.name?.type === "required" && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>IP</FormLabel>
                    <TextField
                        {...register("IP", {
                            required: true,
                        })}
                        size="small"
                    />
                    {errors.IP?.type === "required" && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Limit</FormLabel>
                    <TextField
                        type="number"
                        {...register("limit", {
                            required: true,
                        })}
                        defaultValue={10}
                        size="small"
                    />
                    {errors.limit?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(AddBot)