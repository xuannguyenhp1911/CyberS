import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, Switch, InputAdornment, CircularProgress } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { updateConfigByID } from '../../../../../../../../services/Configs/OKX/V1/scannerService';
import { getAllInstrumentOKXV1, syncInstrumentOKXV1 } from '../../../../../../../../services/Coins/OKX/coinService';
import { getAllInstrumentOKXV1Futures, syncInstrumentOKXV1Futures } from '../../../../../../../../services/Coins/OKX/coinFuturesService';

function UpdateStrategy({
    onClose,
    dataInput,
    setDataCheckTree,
    dataCheckTreeDefaultRef,
    dataCheckTreeDefaultObject
}) {

    const formControlMinValue = 0.01


    const marketList = [
        {
            name: "Margin",
            value: "Margin",
        },
        {
            name: "Spot",
            value: "Spot",
        },
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



    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();

    const onlyPairsSelectedInput = dataInput.OnlyPairs.map(item => ({ name: item, value: item }))
    const blackListSelectedInput = dataInput.Blacklist.map(item => ({ name: item, value: item }))
    const [onlyPairsSelected, setOnlyPairsSelected] = useState(onlyPairsSelectedInput || [])
    const [blackListSelected, setBlackListSelected] = useState(blackListSelectedInput || [])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);

    const dataChangeRef = useRef(false)
    const futuresDataListRef = useRef([])
    const spotMarginDataListRef = useRef([])
    const spotMarginDataListObjectRef = useRef({})
    const spotDataListRef = useRef([])
    const marginDataListRef = useRef([])

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: dataInput.Market,
        list: []
    });

    const symbolListRef = useRef()

    const dispatch = useDispatch()

    const handleGetSpotDataList = async (hasMargin = true) => {
        try {
            const newData = spotMarginDataListRef.current.filter(item => item.market == "Spot" && (hasMargin ? true : spotMarginDataListObjectRef.current[item.name] == 1))

            setSymbolGroupDataList(
                {
                    label: "Spot",
                    list: newData
                }
            )
            spotDataListRef.current = newData

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleGetMarginDataList = async (syncNew = true) => {
        try {

            const newData = spotMarginDataListRef.current.filter(item => item.market == "Margin")

            setSymbolGroupDataList(
                {
                    label: "Margin",
                    list: newData
                }
            )
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleGetFuturesDataList = async () => {
        try {

            const newData = futuresDataListRef.current

            setSymbolGroupDataList(
                {
                    label: "Futures",
                    list: newData
                }
            )
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSyncSymbol = async () => {
        if (!loadingSyncCoin) {
            try {
                setLoadingSyncCoin(true)
                let res
                const Market = symbolGroupDataList.label
                switch (Market) {
                    case "Spot":
                    case "Margin":
                        {
                            res = await syncInstrumentOKXV1()
                            break
                        }

                    case "Futures":
                        {
                            res = await syncInstrumentOKXV1Futures()
                            break
                        }
                }
                hanleGetAllInit()

                const { status, message } = res.data

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

    const handleSubmitCreate = async data => {

        const configID = dataInput._id
        const newData = {
            ...dataInput,
            ...data,
            Blacklist: [... new Set(blackListSelected.map(item => item.value))],
            OnlyPairs: [... new Set(onlyPairsSelected.map(item => item.value))]
        }
        try {
            const res = await updateConfigByID({
                newData,
                configID
            })
            const { status, message, data: symbolListDataRes } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message
            }))

            if (status === 200) {
                reset()
                dataChangeRef.current = true

                setDataCheckTree(dataCheckTree => dataCheckTree.map(item => {
                    if (item._id === configID) {
                        return newData
                    }
                    return item
                }))
                dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(item => {
                    if (item._id === configID) {
                        dataCheckTreeDefaultObject.current[configID] = newData
                        return newData
                    }
                    return item
                })
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Error",
            }))
        }
        closeDialog()
    }


    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: dataChangeRef.current
        })
        reset()
    }
    const hanleGetAllInit = async () => {
        spotMarginDataListObjectRef.current = {}
        const resSpot = getAllInstrumentOKXV1()
        const resFutures = getAllInstrumentOKXV1Futures()
        const resAll = await Promise.allSettled([resSpot, resFutures])

        const { data: symbolListDataRes } = resAll[0].value?.data
        const { data: symbolListDataFuturesRes } = resAll[1].value?.data

        futuresDataListRef.current = symbolListDataFuturesRes.reduce((pre, cur) => {
            const symbol = cur.symbol
            pre.push({ name: symbol, value: symbol, market: cur.market })
            return pre
        }, [])

        spotMarginDataListRef.current = symbolListDataRes.reduce((pre, cur) => {
            const symbol = cur.symbol
            pre.push({ name: symbol, value: symbol, market: cur.market })
            spotMarginDataListObjectRef.current[symbol] = spotMarginDataListObjectRef.current[symbol] ? 2 : 1
            return pre
        }, [])
        switch (symbolGroupDataList.label) {
            case "Spot":
                {
                    handleGetSpotDataList()
                    break
                }
            case "Margin":
                {
                    handleGetMarginDataList()
                    break
                }

            case "Futures":
                {
                    handleGetFuturesDataList()
                    break
                }
        }
    }
    useEffect(() => {
        hanleGetAllInit()
    }, []);

    return (
        <DialogCustom
            dialogTitle="Update Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            submitBtnText='Update'
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>

                    <FormLabel className={styles.label}>Bot</FormLabel>
                    <TextField
                        variant="outlined"
                        value={dataInput.botID?.botName}
                        size="small"
                        disabled
                    >
                    </TextField>

                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Label</FormLabel>
                    <TextField
                        defaultValue={dataInput.Label}
                        variant="outlined"
                        size="small"
                        {...register("Label",)}
                    >
                    </TextField>
                    {errors.Label?.type === 'required' && <p className="formControlErrorLabel">The Label Required.</p>}
                </FormControl>

                <div className={clsx(styles.formMainData, styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                    <FormControl className={clsx(styles.formMainDataSmallItem)}>

                        <TextField
                            label="Market"
                            variant="outlined"
                            value={dataInput.Market}
                            size="medium"
                            disabled
                        >

                        </TextField>
                    </FormControl>
                    <FormControl className={clsx(styles.formMainDataSmallItem)}>

                        <TextField
                            label="Position"
                            variant="outlined"
                            value={dataInput.PositionSide}
                            size="medium"
                            disabled
                        >

                        </TextField>
                    </FormControl>
                </div>

                <FormControl className={styles.formControl}>
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        {
                            dataInput.Market == "Spot" ? <div style={{ display: "flex", }}>
                                <FormLabel className={styles.label}>Only pairs</FormLabel>
                                <div style={{ marginLeft: "6px" }}>
                                    <FormLabel
                                        style={{ marginRight: "6px" }}
                                    >| Margin</FormLabel>
                                    <Switch
                                        size='small'
                                        defaultChecked={true}
                                        onChange={(e) => {
                                            handleGetSpotDataList(e.target.checked)
                                        }}
                                    />
                                </div>
                            </div> : <FormLabel className={styles.label}>Only pairs</FormLabel>
                        }
                        <span style={{ marginRight: "6px" }}>
                            {
                                !loadingSyncCoin ?
                                    <CloudSyncIcon
                                        style={{
                                            cursor: "pointer",
                                            color: "#959595"
                                        }}
                                        onClick={handleSyncSymbol} />
                                    :
                                    <CircularProgress style={{ width: "16px", height: "16px" }} />
                            }
                        </span>
                    </div>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={onlyPairsSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setOnlyPairsSelected(value)
                        }}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
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
                                                setOnlyPairsSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setOnlyPairsSelected([])
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
                                    {option.name.split("-USDT")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">The Only pairs Required.</p>}

                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Blacklist</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={blackListSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBlackListSelected(value)
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
                                                setBlackListSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBlackListSelected([])
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
                                    {option.name.split("-USDT")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {/* {isSubmitted && !blackListSelected.length && <p className="formControlErrorLabel">The Blacklist Required.</p>} */}

                </FormControl>


                <div className={styles.formMainData}>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC"
                                variant="outlined"
                                defaultValue={dataInput.OrderChange}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>,
                                }}
                                {...register("OrderChange", { required: true, min: formControlMinValue })}
                            />
                            {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC Required.</p>}
                            {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.01.</p>}
                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC Pump"
                                variant="outlined"
                                defaultValue={dataInput.XOCPump}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        x
                                    </InputAdornment>,
                                }}
                                {...register("XOCPump", { required: true, min: formControlMinValue })}
                            />
                            {errors.XOCPump?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.XOCPump?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}
                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                type='number'
                                label="Elastic"
                                variant="outlined"
                                defaultValue={dataInput.Elastic}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("Elastic")}
                            />

                        </FormControl>
                    </div>


                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Amount"
                                variant="outlined"
                                defaultValue={dataInput.Amount}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        $
                                    </InputAdornment>
                                }}
                                {...register("Amount", { required: true, min: formControlMinValue })}
                            />
                            {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.01.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Auto"
                                variant="outlined"
                                defaultValue={dataInput.AmountAutoPercent}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("AmountAutoPercent", { required: true, min: formControlMinValue })}
                            />
                            {errors.AmountAutoPercent?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.AmountAutoPercent?.type === "min" && <p className="formControlErrorLabel">The AutoPercent must bigger 0.01.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                type='number'
                                label="Exp"
                                variant="outlined"
                                defaultValue={dataInput.AmountExpire}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        m
                                    </InputAdornment>
                                }}
                                {...register("AmountExpire")}
                            />
                        </FormControl>
                    </div>
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Numbs"
                                variant="outlined"
                                defaultValue={dataInput.Numbs}
                                size="medium"
                                // InputProps={{
                                //     endAdornment: <InputAdornment position="end">
                                //         %
                                //     </InputAdornment>
                                // }}
                                {...register("Numbs", { required: true, min: formControlMinValue })}
                            />
                            {errors.Numbs?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Numbs?.type === "min" && <p className="formControlErrorLabel">The Numbs must bigger 0.01.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Expire"
                                variant="outlined"
                                defaultValue={dataInput.Expire}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        m
                                    </InputAdornment>
                                }}
                                {...register("Expire")}
                            />

                        </FormControl>
                    </div>
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Limit"
                                variant="outlined"
                                defaultValue={dataInput.Limit}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        $
                                    </InputAdornment>
                                }}
                                {...register("Limit", { required: true, min: formControlMinValue })}
                            />
                            {errors.Limit?.type === 'required' && <p className="formControlErrorLabel">The Limit Required.</p>}
                            {errors.Limit?.type === "min" && <p className="formControlErrorLabel">The Limit must bigger 0.01.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Alpha"
                                variant="outlined"
                                defaultValue={dataInput.Alpha}
                                size="medium"
                                {...register("Alpha", { max: 10 })}
                            />
                            {errors.Alpha?.type === "max" && <p className="formControlErrorLabel">Max: 10</p>}
                        </FormControl>
                    </div>
                    
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Turnover"
                                variant="outlined"
                                defaultValue={dataInput.Turnover}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        $
                                    </InputAdornment>
                                }}
                                {...register("Turnover",)}
                            />

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Max Turnover"
                                variant="outlined"
                                defaultValue={dataInput.MaxTurnover}
                                size="medium"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">
                                        x
                                    </InputAdornment>
                                }}
                                {...register("MaxTurnover",)}
                            />

                        </FormControl>

                    </div>
                    <div style={{
                        width: "100%",
                        display: "flex",
                        flexWrap: 'wrap',
                    }}>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>IsActive</FormLabel>
                            <Switch
                                defaultChecked={dataInput.IsActive}
                                title="IsActive"
                                {...register("IsActive")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Adaptive</FormLabel>
                            <Switch
                                defaultChecked={dataInput.Adaptive}
                                title="Adaptive"
                                {...register("Adaptive")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Reverse</FormLabel>
                            <Switch
                                defaultChecked={dataInput.Reverse}
                                title="Reverse"
                                {...register("Reverse")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                defaultChecked={dataInput.Remember}
                                title="Remember"
                                {...register("Remember")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>Beta</FormLabel>
                            <Switch
                                defaultChecked={dataInput.IsBeta}
                                color='warning'
                                title="IsBeta"
                                {...register("IsBeta")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>Raceme</FormLabel>
                            <Switch
                                defaultChecked={dataInput.Raceme}
                                color='success'
                                title="Raceme"
                                {...register("Raceme")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>4B</FormLabel>
                            <Switch
                                defaultChecked={dataInput?.FourB}
                                title="4B"
                                color='error'
                                {...register("FourB")}
                            />
                        </FormControl>
                    </div>
                </div>

            </form>
        </DialogCustom>
    );
}

export default UpdateStrategy;