import { TextField, FormLabel, FormControl, MenuItem } from "@mui/material";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useForm } from "react-hook-form";
import styles from "./ConfigLever.module.scss"
import { useEffect, useState } from "react";
import { getAllBotForCopyTrading, updateBotCopyTrading } from "../../../../../../../../services/botService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

function CopyTrading({
    botData,
    onClose,
    getBotData
}) {
   const botIDCopyOld =  botData?.botIDCopy?._id
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const [botList, setBotList] = useState([]);
    const dispatch = useDispatch()

    const handleCopyTrading = async (data) => {
        
        try {
            const res = await updateBotCopyTrading({
                id: botData?._id,
                botIDCopy:data.botIDCopy,
                botIDCopyOld

            })
         
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status == 200) {
                onClose()
                getBotData()
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Bot Error",
            }))
        }

    }


    useEffect(() => {
        (async () => {
            try {
                const res = await getAllBotForCopyTrading(botData?.botType)
                const { data } = res.data
                const newData = []
                data.forEach(item => {
                        newData.push({
                            name: item.botName,
                            value:item._id
                        })
                });
                setBotList([
                    {
                        name:"None",
                        value:"",
                    },
                    ...newData
                ])
            } catch (error) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Get All Bot Error",
                }))
            }
        })()
    }, []);
    return (

        <DialogCustom
            open={true}
            onClose={onClose}
            onSubmit={handleSubmit(handleCopyTrading)}
            dialogTitle="Copy Trading"
            submitBtnText="Copy"
        >
            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot</FormLabel>
                    <TextField
                        select
                        variant="outlined"
                        defaultValue={botIDCopyOld}
                        size="small"
                        {...register("botIDCopy", )}
                    >
                        {
                            botList.map(item => (
                                <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                            ))
                        }
                    </TextField>
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default CopyTrading;