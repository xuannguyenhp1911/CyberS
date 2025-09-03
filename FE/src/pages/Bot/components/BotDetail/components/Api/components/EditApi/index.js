import { Button, FormControl, FormLabel, Switch, TextField } from "@mui/material";
import styles from "./EditApi.module.scss"
import { useForm } from "react-hook-form";
import { memo } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { updateBot } from "../../../../../../../../services/botService";

function EditApi({
    open,
    botData,
    onClose,
    botType,
    checkBot
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const handleSubmitEditApi = async data => {

        if (!checkBot) {
            try {
                data = {
                    ...data,
                    ApiKey: data.ApiKey?.trim(),
                    SecretKey: data.SecretKey?.trim()
                }
                const res = await updateBot(
                    {
                        id: botData._id,
                        data: {
                            ...data,
                            type: "Api",
                            checkBot,
                            botType
                        }
                    }
                )

                const { message, status } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                status === 200 && closeDialog(true)

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Api Error",
                }))
            }
        }
        else {
            try {

                const res = await updateBot(
                    {
                        id: botData._id,
                        data: {
                            ...botData,
                            Status: "Stopped",
                            type: "Active",
                            checkBot: true,
                            botType
                        }
                    }
                )

                const { message, status } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                status === 200 && closeDialog(true)

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Bot Error",
                }))
            }
        }
    }


    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            confirm: false,
            dataChange
        })
        reset()
    }


    return (
        <DialogCustom
            open={open}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitEditApi)}
            dialogTitle="Update Api"
            submitBtnText={checkBot ? "Deactive" : "Update"}
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>ApiKey</FormLabel>
                    <TextField
                        defaultValue={botData.ApiKey}
                        disabled={checkBot}
                        {...register("ApiKey", { required: !checkBot && true })}
                        size="small"
                    />
                    {errors.ApiKey?.type === 'required' && <p className="formControlErrorLabel">The ApiKey Required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>SecretKey</FormLabel>
                    <TextField
                        defaultValue={botData.SecretKey}
                        disabled={checkBot}
                        {...register("SecretKey", { required: !checkBot && true })}
                        size="small"
                    />
                    {errors.SecretKey?.type === 'required' && <p className="formControlErrorLabel">The SecretKey Required.</p>}

                </FormControl>


                {botType?.includes("OKX") && <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Password</FormLabel>
                    <TextField
                        defaultValue={botData.Password}
                        disabled={checkBot}
                        {...register("Password", { required: !checkBot && true })}
                        size="small"
                    />
                    {errors.Password?.type === 'required' && <p className="formControlErrorLabel">The Password Required.</p>}

                </FormControl>}

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Demo</FormLabel>
                    <Switch
                        disabled={checkBot}
                        title="Demo"
                        color="warning"
                        defaultChecked={botData.Demo}
                        {...register("Demo")}

                    />
                </FormControl>

            </form>
            <div>
                {checkBot && <p className={styles.botRunning}>Bot is running - You must deactive the bot first?</p>}
            </div>
        </DialogCustom >
    );
}

export default memo(EditApi);