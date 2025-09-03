import { FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./Transfer.module.scss"
import { useForm } from "react-hook-form";
import { memo, useState } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { balanceWallet } from "../../../../../../../../services/Configs/ByBIt/V3/configService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { formatNumber } from "../../../../../../../../functions";
import { balanceWalletOKX } from "../../../../../../../../services/Configs/OKX/V1/spotService";
import { balanceWalletBinance } from "../../../../../../../../services/Configs/Binance/V3/configService";

const botTypeList = [
    {
        name: "Funding -> Unified",
        value: false
    },
    {
        name: "Unified -> Funding",
        value: true
    }
]

function Transfer({
    open,
    botID,
    onClose,
    spotAvailableMax,
    futureAvailableMax,
    botData
}, ref) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()
    const [limitMaxSpotAvailable, setLimitMaxSpotAvailable] = useState(spotAvailableMax);

    const handleSubmitTransfer = async data => {
        try {
            const botType = botData?.botType || "ByBit"

            const amount = +data.TransferAmount
            const futureLarger = data.TransferFrom === true ? true : false

            switch (botType) {
                case "ByBit_V3":
                case "ByBit_V1": {
                    const res = await balanceWallet({
                        amount,
                        futureLarger,
                        botID
                    })
                    const { status, message, data: resData } = res.data

                    if (status === 200) {
                        dispatch(addMessageToast({
                            status: 200,
                            message: "Transfer Successful",
                        }))
                        status === 200 && closeDialog(true)
                    }

                    else {
                        dispatch(addMessageToast({
                            status: 500,
                            message: "Transfer Error",
                        }))
                    }
                    break
                }
                case "OKX_V1":
                case "OKX_V3":
                    {
                        const res = await balanceWalletOKX({
                            amount,
                            futureLarger,
                            botData
                        })
                        const { status } = res.data

                        if (status === 200) {
                            dispatch(addMessageToast({
                                status: 200,
                                message: "Transfer Successful",
                            }))
                            status === 200 && closeDialog(true)
                        }

                        else {
                            dispatch(addMessageToast({
                                status: 500,
                                message: "Transfer Error",
                            }))
                        }
                        break
                    }
                case "Binance_V3":
                case "Binance_V1":
                    {
                        const res = await balanceWalletBinance({
                            amount,
                            futureLarger,
                            botID
                        })
                        const { status, message, data: resData } = res.data

                        if (status === 200) {
                            dispatch(addMessageToast({
                                status: 200,
                                message: "Transfer Successful",
                            }))
                            status === 200 && closeDialog(true)
                        }

                        else {
                            dispatch(addMessageToast({
                                status: 500,
                                message: "Transfer Error",
                            }))
                        }
                        break
                    }

            }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Transfer Error",
            }))
        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        reset()
    }

    return (
        <DialogCustom
            open={open}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitTransfer)}
            dialogTitle="Transfer"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>TransferFrom</FormLabel>
                    <Select
                        defaultValue={botTypeList[0].value}
                        size="small"
                        {...register("TransferFrom", { required: true })}
                        onChange={e => {
                            e.target.value ? setLimitMaxSpotAvailable(futureAvailableMax) : setLimitMaxSpotAvailable(spotAvailableMax)
                        }}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>TransferAmount</FormLabel>
                    <TextField
                        {...register("TransferAmount", { required: true, max: limitMaxSpotAvailable })}
                        type="number"
                        size="small"
                    />
                    {errors.TransferAmount?.type === 'required' && <p className="formControlErrorLabel">The TransferAmount Required.</p>}
                    {errors.TransferAmount?.type === 'max' && <p className="formControlErrorLabel">The TransferAmount field is not bigger {formatNumber(limitMaxSpotAvailable)}.</p>}

                </FormControl>


            </form>
        </DialogCustom >
    );
}

export default memo(Transfer);