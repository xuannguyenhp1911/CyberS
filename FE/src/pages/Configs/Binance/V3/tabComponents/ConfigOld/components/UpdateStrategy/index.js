import { useForm } from "react-hook-form";
import { FormControl, FormLabel, Switch, TextField } from "@mui/material";
import clsx from "clsx";
import styles from "../CreateStrategy/CreateStrategy.module.scss"
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { updateStrategiesByID } from "../../../../../../../../services/Configs/Binance/V3/configOldService";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

function UpdateStrategy({
    onClose,
    treeNodeValue,
    symbolValue,
    handleUpdateDataAfterSuccess
}) {
    const userData = useSelector(state => state.userDataSlice.userData)

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
                                label="Candle"
                                variant="outlined"
                                value={treeNodeValue.Candlestick}
                                size="medium"
                                disabled
                            >
                            </TextField>
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC"
                                variant="outlined"
                                defaultValue={treeNodeValue?.OrderChange}
                                size="medium"
                                {...register("OrderChange", { required: true, min: formControlMinValue })}
                            />
                            {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC Required.</p>}
                            {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.1.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Amount"
                                variant="outlined"
                                defaultValue={treeNodeValue?.Amount}
                                size="medium"
                                {...register("Amount", { required: true, min: formControlMinValue })}
                            />
                            {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">The Amount Required.</p>}
                            {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.1.</p>}

                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="TP"
                                variant="outlined"
                                defaultValue={treeNodeValue?.TakeProfit}
                                size="medium"
                                {...register("TakeProfit", { required: true, min: formControlMinValue })}
                            />
                            {errors.TakeProfit?.type === 'required' && <p className="formControlErrorLabel">The TP Required.</p>}
                            {errors.TakeProfit?.type === "min" && <p className="formControlErrorLabel">The TP must bigger 0.1.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Re-TP"
                                variant="outlined"
                                defaultValue={treeNodeValue?.ReduceTakeProfit}
                                size="medium"
                                {...register("ReduceTakeProfit", { required: true, min: formControlMinValue })}
                            />
                            {errors.ReduceTakeProfit?.type === 'required' && <p className="formControlErrorLabel">The Reduce TP Required.</p>}
                            {errors.ReduceTakeProfit?.type === "min" && <p className="formControlErrorLabel">The Reduce TP must bigger 0.1.</p>}
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Extend OC"
                                variant="outlined"
                                defaultValue={treeNodeValue?.ExtendedOCPercent}
                                size="medium"
                                {...register("ExtendedOCPercent", { required: true, min: formControlMinValue })}
                            />
                            {errors.ExtendedOCPercent?.type === 'required' && <p className="formControlErrorLabel">The Extended Required.</p>}
                            {errors.ExtendedOCPercent?.type === "min" && <p className="formControlErrorLabel">The Extended must bigger 0.1.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Ignore"
                                variant="outlined"
                                defaultValue={treeNodeValue?.Ignore}
                                size="medium"
                                {...register("Ignore", { required: true, min: formControlMinValue })}
                            />
                            {errors.Ignore?.type === 'required' && <p className="formControlErrorLabel">The Ignore Required.</p>}
                            {errors.Ignore?.type === "min" && <p className="formControlErrorLabel">The Ignore must bigger 0.1.</p>}
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Entry"
                                variant="outlined"
                                defaultValue={treeNodeValue?.EntryTrailing}
                                size="medium"
                                {...register("EntryTrailing", { min: formControlMinValue })}
                            />
                            {/* {errors.EntryTrailing?.type === 'required' && <p className="formControlErrorLabel">The Entry Trailing Required.</p>} */}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Max OC (%)"
                                variant="outlined"
                                defaultValue={treeNodeValue?.StopLose}
                                size="medium"
                                {...register("StopLose", )}
                            />
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl >

                            <FormLabel className={styles.label}>Active</FormLabel>
                            <Switch
                                defaultChecked={treeNodeValue.IsActive}
                                title="Active"
                                {...register("IsActive")}

                            />
                        </FormControl>
                        <FormControl >

                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                defaultChecked
                                title="Remember"
                                {...register("Remember")}

                            />
                        </FormControl>

                        <FormControl >
                            <FormLabel className={styles.label}>Beta</FormLabel>
                            <Switch
                                defaultChecked={treeNodeValue?.IsBeta}
                                title="Beta"
                                color="warning"
                                {...register("IsBeta")}

                            />
                        </FormControl>
                        <FormControl >
                            <FormLabel className={styles.label}>Wait</FormLabel>
                            <Switch
                                defaultChecked={treeNodeValue?.IsOCWait}
                                title="Wait"
                                color="success"
                                {...register("IsOCWait")}

                            />
                        </FormControl>
                    </div>
                    {userData?.userName == "SuperAdmin" && (
                        <FormControl >
                            <FormLabel className={styles.label}>Dev</FormLabel>
                            <Switch
                                defaultChecked={treeNodeValue?.IsDev}
                                title="Dev"
                                color="error"
                                {...register("IsDev")}

                            />
                        </FormControl>
                    )}
                </div>


            </form>
        </DialogCustom>
    );
}

export default UpdateStrategy;