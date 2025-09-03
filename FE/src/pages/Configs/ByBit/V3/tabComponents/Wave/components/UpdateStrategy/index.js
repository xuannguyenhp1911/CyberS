import { useForm } from "react-hook-form";
import { FormControl, FormLabel, InputAdornment, Switch, TextField } from "@mui/material";
import clsx from "clsx";
import styles from "../CreateStrategy/CreateStrategy.module.scss"
import { useDispatch } from "react-redux";
import { useRef } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { updateStrategiesByID } from "../../../../../../../../services/Configs/ByBIt/V3/waveService";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

function UpdateStrategy({
    onClose,
    treeNodeValue,
    symbolValue,
    handleUpdateDataAfterSuccess
}) {
    const formControlMinValue = .1

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const formDataChangeRef = useRef(false)

    const handleSubmitUpdate = async data => {
        let dataChange = false
        if (formDataChangeRef.current) {

            const { parentID, ...dataTreeNode } = treeNodeValue

            const newData = {
                ...dataTreeNode,
                ...data
            }

            try {
                const res = await updateStrategiesByID({
                    id: newData._id,
                    data: {
                        parentID,
                        newData,
                        symbol: symbolValue
                    }
                })
                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                if (status === 200) {
                    dataChange = true
                    handleUpdateDataAfterSuccess(newData)
                }

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Edit Error",
                }))
            }
        }
        closeDialog(dataChange)

    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
    }


    return (
        <DialogCustom
            dialogTitle="Update Strategy"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitUpdate)}
            maxWidth="sm"
        >

            <form className={styles.dialogForm} onChange={e => {
                formDataChangeRef.current = true
            }}>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Bot</FormLabel>
                    <TextField
                        variant="outlined"
                        value={treeNodeValue.botID?.botName}
                        size="small"
                        disabled
                    >
                    </TextField>
                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <TextField
                        variant="outlined"
                        value={symbolValue}
                        size="small"
                        disabled
                    >
                    </TextField>
                </FormControl>

                <div className={styles.formMainData}>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                label="Position"
                                variant="outlined"
                                value={treeNodeValue.PositionSide}
                                size="medium"
                                disabled
                            >
                            </TextField>
                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Amount"
                                variant="outlined"
                                defaultValue={treeNodeValue?.Amount || 100}
                                size="medium"
                                {...register("Amount", { required: true, min: formControlMinValue })}
                            />
                            {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.1.</p>}

                        </FormControl>

                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                label="Candle"
                                variant="outlined"
                                value={treeNodeValue.Candlestick}
                                size="medium"
                                disabled
                            >
                            </TextField>
                        </FormControl>

                        
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="TP"
                                variant="outlined"
                                defaultValue={treeNodeValue?.TakeProfit || 25}
                                size="medium"
                                {...register("TakeProfit", { required: true, min: formControlMinValue })}
                            />
                            {errors.TakeProfit?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.TakeProfit?.type === "min" && <p className="formControlErrorLabel">TP must bigger 0.1.</p>}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Re-TP"
                                variant="outlined"
                                defaultValue={treeNodeValue?.ReduceTakeProfit || 15}
                                size="medium"
                                {...register("ReduceTakeProfit", { required: true, min: formControlMinValue })}
                            />
                            {errors.ReduceTakeProfit?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.ReduceTakeProfit?.type === "min" && <p className="formControlErrorLabel">Bigger 0.1.</p>}

                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <FormLabel className={styles.label}>Active</FormLabel>
                            <Switch
                                defaultChecked
                                title="Active"
                                {...register("IsActive")}

                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                defaultChecked
                                title="Remember"
                                {...register("Remember")}

                            />
                        </FormControl>

                    </div>
                </div>


            </form>
        </DialogCustom>
    );
}

export default UpdateStrategy;