import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { updateServer } from "../../../../services/serversService";

function EditServer({
    onClose,
    botTypeList,
    dataInput
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch();

    const handleSubmitAddBot = async formData => {

        try {
            const res = await updateServer({
                data: {
                    ...dataInput,
                    ...formData,
                    name: formData.name.trim(),
                    IP: formData.IP.trim(),
                },
                ServerID: dataInput._id
            })

            const { message, data: resData, status } = res.data

            if (status == 200) {
                closeDialog()
            }
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        }
        catch (err) {
            console.log(err);
            dispatch(addMessageToast({
                status: 500,
                message: "Update Server Error",
            }))
        }
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: true
        })
        reset()
    }

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Edit Server"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <Select
                        size="small"
                        value={dataInput.botType}
                        disabled
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
                        defaultValue={dataInput.name}
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
                        defaultValue={dataInput.IP}
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
                        size="small"
                        defaultValue={dataInput.limit}
                    />
                    {errors.limit?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(EditServer)