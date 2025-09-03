import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { addBotToServer, getAllServerByBotType } from "../../../../services/serversService";

function AddServer({
    botData,
    onClose,
    setNewDateAfterSuccess
}) {

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const [serverIPList, setServerIPList] = useState([]);
    const dispatch = useDispatch();

    const newBotDataRef = useRef(false)

    const handleSubmitAddBot = async formData => {

        try {
            const botID = botData._id
            const res = await addBotToServer({
                botID: botID,
                serverID: formData.serverIP
            })

            const { message, data: resData, status } = res.data

            if (status === 200) {
                newBotDataRef.current = true
                setNewDateAfterSuccess({
                    botID, data: {
                        ...botData,
                        Status: "Stopped"
                    }
                })

            }
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

    const handleGetServerIPList = async () => {
        try {
            const res = await getAllServerByBotType(botData.botType)
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
            data: "",
            dataChange: newBotDataRef.current
        })
    }
    useEffect(() => {
        handleGetServerIPList()
    }, []);

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle={`Add Server - ${botData.botName}`}
        >
            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
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
                </FormControl>
            </form>
        </DialogCustom >
    );
}

export default memo(AddServer)