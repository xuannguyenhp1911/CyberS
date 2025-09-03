import { FormLabel, Slider, TextField } from "@mui/material";
import { memo, useRef, useState } from "react";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { updateFutureBalancePercent } from "../../../../../../../../services/botService";

import styles from "./Transfer.module.scss"
import { useForm } from "react-hook-form";

function ConfigBalance({
    botID,
    onClose,
    botData,
}, ref) {

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const MIN_TIME = 0
    const MAX_TIME = 23
    const STEP_DEFAULT = 5
    const VALUE_DEFAULT = (botData.futureBalancePercent || botData.futureBalancePercent == 0) ? botData.futureBalancePercent : 50

    const [futureBalancePercent, setFutureBalancePercent] = useState(VALUE_DEFAULT);

    const dispatch = useDispatch()

    const getMarks = (step) => {
        const marks = [];
        for (let i = 0; i <= 100; i += step) {
            marks.push({ value: i });
        }
        return marks;
    }

    const dataChangeRef = useRef(false)
    const handleSubmitTransfer = async (data) => {
        try {

            const res = await updateFutureBalancePercent({
                futureBalancePercent,
                timeBalanceLoop: data.timeBalanceLoop,
                botData
            })
            const { status, message } = res.data

            dataChangeRef.current = status == 200
            dispatch(addMessageToast({
                status,
                message
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
        closeDialog()
    }
    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: dataChangeRef.current,
        })
    }

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitTransfer)}
            dialogTitle="Config"
        >
            <div className={styles.container}>
                <FormLabel>Unified ( {futureBalancePercent}% )</FormLabel>
                <Slider
                    defaultValue={VALUE_DEFAULT}
                    step={STEP_DEFAULT}
                    marks={getMarks(STEP_DEFAULT)}
                    min={0}
                    max={100}
                    onChange={e => {
                        setFutureBalancePercent(e.target.value)
                    }}
                    style={{
                        margin: '3px 0',
                    }}
                />
            </div>
            <div className={styles.container} style={{ marginTop: "12px" }}>
                <FormLabel>Time Balance (h) </FormLabel>
                <TextField
                    type="number"
                    defaultValue={(botData.timeBalanceLoop || botData.timeBalanceLoop == 0) ? botData.timeBalanceLoop : 3}
                    size="small"
                    style={{ marginTop: '10px' }}
                    {...register("timeBalanceLoop", {
                        required: true,
                        min: MIN_TIME,
                        max: MAX_TIME,
                        pattern: /^[0-9]\d*$/
                    })}
                />
                {errors.timeBalanceLoop?.type === "min" && <p className="formControlErrorLabel">Min {MIN_TIME}</p>}
                {errors.timeBalanceLoop?.type === "max" && <p className="formControlErrorLabel">Max {MAX_TIME}</p>}
                {errors.timeBalanceLoop?.type === "pattern" && <p className="formControlErrorLabel">Required Number</p>}

            </div>
        </DialogCustom >
    );
}

export default memo(ConfigBalance);