import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useForm } from "react-hook-form";
import styles from "./CreateStrategy.module.scss"
import { Autocomplete, Button, Checkbox, CircularProgress, FormControl, FormLabel, MenuItem, Switch, TextField, Tooltip } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useDispatch, useSelector } from "react-redux";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { createStrategies } from "../../../../../../../../services/Configs/Binance/V3/configOldService";
import { setStrategiesHistoryData } from "../../../../../../../../store/slices/StrategiesHistory";
import { addMessageToast } from "../../../../../../../../store/slices/Toast";
import { getAllCoin, syncCoin } from "../../../../../../../../services/Coins/Binance/coinFuturesService";

function CreateStrategy({
    botListInput,
    onClose,
    symbolValueInput,
    dataCheckTreeDefaultRef
}) {
    const userData = useSelector(state => state.userDataSlice.userData)


    const DEFAULT_REMEMBER_VALUE = JSON.parse(localStorage.getItem("Binance_V3_Config"))

    const formControlMinValue = .1
    const groupList = [
        {
            name: "Group 1",
            value: "Group 1",
        }
    ]

    const positionSideList = [
        {
            name: "Both",
            value: "Both",
        },
        {
            name: "Long",
            value: "Long",
        },
        {
            name: "Short",
            value: "Short",
        },
    ]

    const candlestickList = [
        {
            name: "1m",
            value: "1m",
        },
        {
            name: "3m",
            value: "3m",
        },
        {
            name: "5m",
            value: "5m",
        },
        {
            name: "15m",
            value: "15m",
        },
        // {
        //     name: "30m",
        //     value: "30m",
        // },
        // {
        //     name: "60m",
        //     value: "60m",
        // },
    ]

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();

    const [symbolGroupData, setSymbolGroupData] = useState(symbolValueInput || [])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);
    const [botList, setBotList] = useState([botListInput[0]])

    const dataChangeRef = useRef(false)

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: "Symbol",
        list: []
    });

    const symbolListRef = useRef()

    const dispatch = useDispatch()

    const handleSyncSymbol = async () => {
        if (!loadingSyncCoin) {
            try {
                setLoadingSyncCoin(true)
                const res = await syncCoin()
                const { status, message, data: resData } = res.data
                handleGetSymbolList()
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))

                setLoadingSyncCoin(false)
            }
            catch (err) {
                setLoadingSyncCoin(false)
                dispatch(addMessageToast({
                    status: 500,
                    message: "Sync Error",
                }))
            }
        }
    }

    const handleChangeRatio = (e) => {
        setSymbolGroupData([])
        const value = e.target.value
        setSymbolGroupDataList({
            label: value,
            list: value === "Group" ? groupList : symbolListRef.current
        })
    }

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllCoin()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))

            symbolListRef.current = newSymbolList

            setSymbolGroupDataList({
                label: "Symbol",
                list: newSymbolList
            })
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Symbol Error",
            }))
        }
    }

    const handleSubmitCreate = async data => {

        if (symbolGroupData.length > 0 && botList.length > 0) {
            try {

                dataCheckTreeDefaultRef.current.length > 0 && dispatch(setStrategiesHistoryData(dataCheckTreeDefaultRef.current))
                const res = await createStrategies({
                    data: data,
                    botListId: botList.map(item => item.value),
                    [symbolGroupDataList.label]: symbolGroupData.map(item => item.value)
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    reset()
                    dataChangeRef.current = true
                }
                if (data.Remember) {
                    localStorage.setItem("Binance_V3_Config", JSON.stringify(data))
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
            closeDialog()
        }
    }

    const handleSubmitCreateWithAddMore = async data => {

        if (symbolGroupData.length > 0 && botList.length > 0) {
            try {
                const res = await createStrategies({
                    data: data,
                    botListId: botList.map(item => item.value),
                    [symbolGroupDataList.label]: symbolGroupData.map(item => item.value)
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    dataChangeRef.current = true
                }

                if (data.Remember) {
                    localStorage.setItem("Binance_V3_Config", JSON.stringify(data))
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
        }
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: dataChangeRef.current
        })
        reset()
    }

    useEffect(() => {
        handleGetSymbolList()
    }, []);


    return (
        <DialogCustom
            dialogTitle="Create Strategy"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            addMore
            addMoreFuntion={handleSubmit(handleSubmitCreateWithAddMore)}
        >

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
                        getOptionLabel={(option) => option.name}
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
                                    {option.name}
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
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <FormLabel className={styles.label}>{symbolGroupDataList.label === "Group" ? "Group" : "Symbol"}</FormLabel>
                        <span style={{ marginRight: "6px" }}>
                            {
                                !loadingSyncCoin ?
                                    <Tooltip title="Sync" placement="top">
                                        <CloudSyncIcon
                                            style={{
                                                cursor: "pointer",
                                                color: "#959595"
                                            }}
                                            onClick={handleSyncSymbol} />
                                    </Tooltip>
                                    :
                                    <CircularProgress style={{ width: "16px", height: "16px" }} />
                            }
                        </span>
                    </div>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={symbolGroupData}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setSymbolGroupData(value)
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
                                                setSymbolGroupData(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolGroupData([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected}
                                    />
                                    {option.name.split("USDT")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {isSubmitted && !symbolGroupData.length && <p className="formControlErrorLabel">The {symbolGroupDataList.label} Required.</p>}

                </FormControl>
                <div className={styles.formMainData}>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                select
                                label="Position"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.PositionSide || positionSideList[0].value}
                                size="medium"
                                {...register("PositionSide", { required: true, })}
                            >
                                {

                                    positionSideList.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                select
                                label="Candle"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Candlestick || candlestickList[0].value}
                                size="medium"
                                {...register("Candlestick", { required: true, })}
                            >
                                {
                                    candlestickList.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.OrderChange || 4}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Amount || 100}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.TakeProfit || 50}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.ReduceTakeProfit || 45}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.ExtendedOCPercent || 80}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Ignore || 85}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.EntryTrailing || 40}
                                size="medium"
                                {...register("EntryTrailing", { required: true, min: formControlMinValue })}
                            />
                            {errors.EntryTrailing?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.EntryTrailing?.type === "min" && <p className="formControlErrorLabel">Bigger 0.1.</p>}
                            {/* {errors.EntryTrailing?.type === 'required' && <p className="formControlErrorLabel">The Entry Trailing Required.</p>} */}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Max OC (%)"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.StopLose}
                                size="medium"
                                {...register("StopLose",)}
                            />
                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl >

                            <FormLabel className={styles.label}>Active</FormLabel>
                            <Switch
                                defaultChecked
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
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.IsBeta}
                                title="Beta"
                                color="warning"
                                {...register("IsBeta")}

                            />
                        </FormControl>

                        <FormControl >
                            <FormLabel className={styles.label}>Wait</FormLabel>
                            <Switch
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.IsOCWait}
                                title="Wait"
                                color="success"
                                {...register("IsOCWait")}

                            />
                        </FormControl>
                    </div>
                    {userData?.userName == "SuperAdmin" && (
                        <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                            <FormControl >
                                <FormLabel className={styles.label}>Dev</FormLabel>
                                <Switch
                                    defaultChecked={DEFAULT_REMEMBER_VALUE?.IsDev}
                                    title="Dev"
                                    color="error"
                                    {...register("IsDev")}

                                />
                            </FormControl>
                        </div>
                    )}
                </div>

            </form>
        </DialogCustom >
    );
}

export default CreateStrategy;