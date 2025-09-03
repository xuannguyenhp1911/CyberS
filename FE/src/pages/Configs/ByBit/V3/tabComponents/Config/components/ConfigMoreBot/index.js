import { useForm } from "react-hook-form";
import styles from "./CreateStrategy.module.scss"
import { Autocomplete, Button, Checkbox, FormControl, FormControlLabel, FormLabel, InputAdornment, Radio, RadioGroup, TextField } from "@mui/material";
import { memo, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { setAutoOffVol, setMaxSymbol } from "../../../../../../../../services/Configs/ByBIt/V3/configService";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";

function ConfigMoreBot({
    botListInput,
    onClose,
    handleGetAllBotByUserID
}) {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();
    const dispatch = useDispatch()

    const [botList, setBotList] = useState([botListInput[0]])

    const [radioValue, setRadioValue] = useState("Off Vol");

    const handleSubmitAutoOffVol = async data => {

        if (botList.length > 0) {

            try {

                const res = await setAutoOffVol({
                    ...data,
                    botListID: botList.map(item => item.value)
                })
                const { status, message } = res.data
                if (status === 200) {
                    handleGetAllBotByUserID()
                }
                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Error",
                }))
            }
            onClose()
        }
    }
    const handleSubmitMaxSymbol = async data => {

        if (botList.length > 0) {

            try {

                const res = await setMaxSymbol({
                    ...data,
                    botListData: botList
                })
                const { status, message } = res.data
                if (status === 200) {
                    handleGetAllBotByUserID()
                }
                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Error",
                }))
            }
            onClose()
        }
    }

    const handleSubmitCreate = (data) => {
        switch (radioValue) {
            case "Off Vol":
                handleSubmitAutoOffVol(data)
                break
                case "Max Symbol":
                    handleSubmitMaxSymbol(data)
                break
        }
    }

    const handleElementWhenChangeRatio = () => {
        
        switch (radioValue) {
            case "Off Vol":
                {
                    return (
                        <form className={styles.dialogForm}>
                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Bots</FormLabel>
                                <Autocomplete
                                    multiple
                                    limitTags={1}
                                    value={botList}
                                    disableCloseOnSelect
                                    options={botListInput}
                                    size="small"
                                    onChange={(e, value) => {
                                        setBotList(value)
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} placeholder="Select..." />
                                    )}
                                    renderOption={(props, option, { selected, index }) => (
                                        <>
                                            {index === 0 && (
                                                <>
                                                    <Button
                                                        color="inherit"
                                                        style={{ width: '50%' }}
                                                        onClick={() => {
                                                            setBotList(botListInput)
                                                        }}
                                                    >
                                                        Select All
                                                    </Button>
                                                    <Button
                                                        color="inherit"
                                                        style={{ width: '50%' }}
                                                        onClick={() => {
                                                            setBotList([])
                                                        }}
                                                    >
                                                        Deselect All
                                                    </Button>
                                                </>
                                            )}
                                            <li {...props}>
                                                <Checkbox
                                                    checked={selected || botList.findIndex(item => item.value === option.value) > -1}
                                                />
                                                {`${option.name} ( < ${option.volAutoOff || 0} )`}
                                            </li>
                                        </>
                                    )}
                                    renderTags={(value) => {
                                        return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                                    }}
                                >


                                </Autocomplete>
                                {errors.botID?.type === 'required' && <p className="formControlErrorLabel">The Bot Required.</p>}
                                {isSubmitted && !botList.length && <p className="formControlErrorLabel">The Bot Required.</p>}

                            </FormControl>


                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Vol</FormLabel>
                                <TextField
                                    type='number'
                                    variant="outlined"
                                    size="small"
                                {...register("volAutoOff", { required: true, min: 0 })}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                {"<"}
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="start">
                                                M-USDT
                                            </InputAdornment>
                                        )

                                    }}
                                >
                                </TextField>
                                {errors.volAutoOff?.type === 'required' && <p className="formControlErrorLabel">Required</p>}
                            </FormControl>

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        defaultChecked={true}
                                        {...register("checkOnRemain")}
                                    />

                                }
                                label="Active the remaining configs"
                            />

                        </form>
                    )
                }

            case "Max Symbol": {
                return (
                    <form className={styles.dialogForm}>
                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Bots</FormLabel>
                            <Autocomplete
                                multiple
                                limitTags={1}
                                value={botList}
                                disableCloseOnSelect
                                options={botListInput}
                                size="small"
                                onChange={(e, value) => {
                                    setBotList(value)
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} placeholder="Select..." />
                                )}
                                renderOption={(props, option, { selected, index }) => (
                                    <>
                                        {index === 0 && (
                                            <>
                                                <Button
                                                    color="inherit"
                                                    style={{ width: '50%' }}
                                                    onClick={() => {
                                                        setBotList(botListInput)
                                                    }}
                                                >
                                                    Select All
                                                </Button>
                                                <Button
                                                    color="inherit"
                                                    style={{ width: '50%' }}
                                                    onClick={() => {
                                                        setBotList([])
                                                    }}
                                                >
                                                    Deselect All
                                                </Button>
                                            </>
                                        )}
                                        <li {...props}>
                                            <Checkbox
                                                checked={selected || botList.findIndex(item => item.value === option.value) > -1}
                                            />
                                            {`${option.name} ( <= ${option.maxSymbol || 0} )`}
                                        </li>
                                    </>
                                )}
                                renderTags={(value) => {
                                    return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                                }}
                            >


                            </Autocomplete>
                            {errors.botID?.type === 'required' && <p className="formControlErrorLabel">The Bot Required.</p>}
                            {isSubmitted && !botList.length && <p className="formControlErrorLabel">The Bot Required.</p>}

                        </FormControl>


                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Max</FormLabel>
                            <TextField
                                type='number'
                                variant="outlined"
                                size="small"
                                {...register("maxSymbol", { required: true, min: 0 })}
                            >
                            </TextField>
                            {errors.maxSymbol?.type === 'required' && <p className="formControlErrorLabel">Required</p>}

                        </FormControl>

                    </form>
                )
            }
            default:
                {
                    return <></>
                }


        }
    }
    return (
        <DialogCustom
            dialogTitle="Config More"
            open={true}
            onClose={onClose}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            submitBtnText='Apply'
        >

            <RadioGroup
                defaultValue={radioValue}
                onChange={(e) => {
                    setRadioValue(e.target.value)
                }}
                className={styles.radioGroupAction}
            >
                <div className={styles.radioGroupActionItem}>
                    <FormControlLabel className={styles.radioItem} value="Off Vol" control={<Radio />} label="Off Vol" />
                    <FormControlLabel className={styles.radioItem} value="Max Symbol" control={<Radio />} label="Max Symbol" />
                </div>

            </RadioGroup>
            <div style={{ marginTop: "12px" }}>
                {handleElementWhenChangeRatio()}
            </div>
        </DialogCustom >
    );
}

export default memo(ConfigMoreBot);