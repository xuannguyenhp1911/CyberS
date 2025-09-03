import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { createBot } from "../../../../services/botService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { getAllServerByBotType } from "../../../../services/serversService";

function AddBot({
    open,
    onClose,
    roleName,
    botTypeList
}, ref) {


    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const [serverIPList, setServerIPList] = useState([]);
    const [botType, setBotType] = useState("");
    const dispatch = useDispatch();

    const newBotDataRef = useRef()

    const handleSubmitAddBot = async formData => {

        if (botType) {
            try {
                const res = await createBot({
                    ...formData,
                    botType,
                    botName: formData.botName.trim(),
                    Status:roleName !== "Trader" ? "Stopped" : "Pending"
                })

                const { message, data: resData, status } = res.data

                resData && (newBotDataRef.current = resData)
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add Bot Error",
                }))
            }
            closeDialog()
        }
    }

    const handleGetServerIPList = async (botType) => {
        try {
            const res = await getAllServerByBotType(botType)
            const { message, data: resData, status } = res.data
            if (status === 200) {
                setServerIPList(resData)
            }
            else {
                setServerIPList([])
            }
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: error.message,
            }))
        }
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: newBotDataRef.current
        })
        reset()
    }

    useEffect(() => {
        roleName !== "Trader" && botType && handleGetServerIPList(botType)
    }, [botType]);

    return (
        <DialogCustom
            open={open}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Add Bot"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("botName", {
                            required: true,
                            // pattern: /^[a-zA-Z0-9\s]*$/ // Chỉ cho phép chữ cái, số và khoảng trắng
                        })}
                        size="small"
                    />
                    {errors.botName?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                    {errors.botName?.type === "pattern" && <p className="formControlErrorLabel">Error</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <Select
                        size="small"
                        onChange={e => { setBotType(e.target.value) }}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                    {!botType && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>
                {roleName !== "Trader" && <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Server</FormLabel>
                    <Select
                        size="small"
                        {...register("serverIP", { required: true })}
                    >
                        {
                            serverIPList.map(item => (
                                <MenuItem value={item._id} key={item._id}>
                                    <b style={{ marginRight: "8px" }}>{item.name}</b> ( {item.botList?.length || 0} / {item.limit} )
                                </MenuItem>
                            ))
                        }
                    </Select>
                    {errors.serverIP && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>}
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Note</FormLabel>
                    <TextField
                        placeholder="Note"
                        multiline
                        rows={3}
                        {...register("note")}
                        size="small"
                    />
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(AddBot)