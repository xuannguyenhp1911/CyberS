import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, MenuItem, Switch, InputAdornment, CircularProgress, Chip, Tooltip } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { createConfigScanner } from '../../../../../../../../services/Configs/OKX/V1/scannerService';
import { getAllInstrumentOKXV1, syncInstrumentOKXV1 } from '../../../../../../../../services/Coins/OKX/coinService';
import { getAllInstrumentOKXV1Futures, syncInstrumentOKXV1Futures } from '../../../../../../../../services/Coins/OKX/coinFuturesService';
import { getAllByMarket } from '../../../../../../../../services/coinsBlockService';

function CreateStrategy({
    botListInput,
    onClose,
}) {
    const DEFAULT_REMEMBER_VALUE = JSON.parse(localStorage.getItem("OKX_V1_Scan"))

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
        {
            name: "Futures",
            value: "Futures",
        },
    ]
    const positionSideListDefault = [
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
        formState: { errors, isSubmitted },
        setValue
    } = useForm();

    const [onlyPairsSelected, setOnlyPairsSelected] = useState([])
    const [blackListSelected, setBlackListSelected] = useState([])
    const [botList, setBotList] = useState([botListInput[0]])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);
    const [PositionSideSelected, setPositionSideSelected] = useState(DEFAULT_REMEMBER_VALUE?.PositionSide || positionSideListDefault[0].value);


    const dataChangeRef = useRef(false)
    const futuresDataListRef = useRef([])
    const spotMarginDataListRef = useRef([])
    const spotMarginDataListObjectRef = useRef({})
    const spotDataListRef = useRef([])
    const marginDataListRef = useRef([])
    const positionSideListRef = useRef(positionSideListDefault)

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: "Margin",
        list: []
    });

    const dispatch = useDispatch()

    const handleGetSpotDataList = async (hasMargin = false) => {
        try {

            const newData = spotMarginDataListRef.current.filter(item => item.market == "Spot" && (hasMargin ? true : spotMarginDataListObjectRef.current[item.name] == 1))

            setBlackListSelected([])
            setOnlyPairsSelected([])
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

    const handleGetMarginDataList = async () => {
        try {

            const newData = spotMarginDataListRef.current.filter(item => item.market == "Margin")

            setBlackListSelected([])
            setOnlyPairsSelected([])
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

            setBlackListSelected([])
            setOnlyPairsSelected([])
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

        if (onlyPairsSelected.length > 0 && botList.length > 0 && PositionSideSelected) {

            try {
                const newData = {
                    ...data,
                    PositionSide: PositionSideSelected
                }
                const res = await createConfigScanner({
                    data: newData,
                    botListId: botList.map(item => item.value),
                    Blacklist: blackListSelected.map(item => item.value),
                    OnlyPairs: onlyPairsSelected.map(item => item.value)
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
                    localStorage.setItem("OKX_V1_Scan", JSON.stringify(newData))
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
        if (onlyPairsSelected.length > 0 && botList.length > 0 && PositionSideSelected) {

            try {
                const newData = {
                    ...data,
                    PositionSide: PositionSideSelected
                }
                const res = await createConfigScanner({
                    data: newData,
                    botListId: botList.map(item => item.value),
                    Blacklist: blackListSelected.map(item => item.value),
                    OnlyPairs: onlyPairsSelected.map(item => item.value)
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
                    localStorage.setItem("OKX_V1_Scan", JSON.stringify(newData))
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

    const getAllCoinBlock = async (Market) => {
        try {
            const res = await getAllByMarket({
                Market,
                botType: "OKX_V1"
            })
            const { data: coinBlockListRes } = res.data
            const blacklist = coinBlockListRes?.[0]?.SymbolList || []
            setBlackListSelected(blacklist.map(item => ({ name: item, value: item })))

        }
        catch (err) {

        }
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

        const Market = symbolGroupDataList.label
        switch (Market) {
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
        getAllCoinBlock(Market)
    }
    useEffect(() => {
        hanleGetAllInit()
    }, []);


    return (
        <DialogCustom
            dialogTitle="Create Config"
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
                                        checked={selected}
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
                    {errors.botID?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                    {isSubmitted && !botList.length && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Label</FormLabel>
                    <TextField
                        variant="outlined"
                        size="small"
                        {...register("Label", { required: true, })}
                    >
                    </TextField>
                    {errors.Label?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

                <div className={clsx(styles.formMainData, styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                    <FormControl className={clsx(styles.formMainDataSmallItem)}>
                        <TextField
                            select
                            label="Market"
                            variant="outlined"
                            defaultValue={marketList[0].value}
                            size="medium"
                            {...register("Market", { required: true, })}
                            onChange={e => {
                                const market = e.target.value;
                                if (market === "Spot") {
                                    handleGetSpotDataList()
                                    positionSideListRef.current = [
                                        {
                                            name: "Long",
                                            value: "Long",
                                        }
                                    ]
                                    setPositionSideSelected("Long")
                                }
                                else {
                                    if (market == "Margin") {
                                        handleGetMarginDataList()
                                    }
                                    else {
                                        handleGetFuturesDataList()
                                    }
                                    setPositionSideSelected("")
                                    positionSideListRef.current = positionSideListDefault
                                }
                                getAllCoinBlock(market)
                            }}
                        >
                            {

                                marketList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>
                    <FormControl className={clsx(styles.formMainDataSmallItem)}>

                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-around",
                            height: "100%",
                            marginBottom: "10px"
                        }}>
                            {
                                positionSideListRef.current.map(side => {
                                    const value = side.value
                                    let color = "primary"
                                    switch (value) {
                                        case "Long": {
                                            color = "success"
                                            break
                                        }
                                        case "Short": {
                                            color = "error"
                                            break
                                        }
                                    }
                                    return (
                                        <Chip
                                            variant={PositionSideSelected == value ? "filled" : "outlined"}
                                            label={side.name}
                                            color={color}
                                            onClick={() => {
                                                setPositionSideSelected(value)
                                            }}
                                        />
                                    )
                                })
                            }
                        </div>
                        {!PositionSideSelected && <p className="formControlErrorLabel" style={{ textAlign: "center" }}>Required</p>}
                    </FormControl>
                </div>
                <FormControl className={styles.formControl}>
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", }}>
                            <FormLabel className={styles.label}>Only pairs</FormLabel>
                            {
                                positionSideListRef.current.length == 1 && (
                                    <div style={{ marginLeft: "6px" }}>
                                        <FormLabel
                                            style={{ marginRight: "6px" }}
                                        >| Margin</FormLabel>
                                        <Switch
                                            size='small'
                                            onChange={(e) => {
                                                handleGetSpotDataList(e.target.checked)
                                            }}
                                        />
                                    </div>
                                )
                            }
                        </div>
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
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setOnlyPairsSelected(value)
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
                    {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Blacklist</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={blackListSelected}
                        disableCloseOnSelect
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        options={symbolGroupDataList.list}
                        size="small"
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.OrderChange || 1}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>,
                                }}
                                {...register("OrderChange", { required: true, min: formControlMinValue })}
                            />
                            {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.01.</p>}
                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC Pump"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.XOCPump || 3}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Elastic : 80}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Amount || 100}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.AmountAutoPercent || 5}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.AmountExpire : 10}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Numbs || 1}
                                size="medium"
                                // InputProps={{
                                //     endAdornment: <InputAdornment position="end">
                                //         %
                                //     </InputAdornment>
                                // }}
                                {...register("Numbs", { required: true, min: 1 })}
                            />
                            {errors.Numbs?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Numbs?.type === "min" && <p className="formControlErrorLabel">The Numbs must bigger 1.</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                type='number'
                                label="Expire"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Expire : 20}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Limit || 200}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        $
                                    </InputAdornment>
                                }}
                                {...register("Limit", { required: true, min: formControlMinValue })}
                            />
                            {errors.Limit?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Limit?.type === "min" && <p className="formControlErrorLabel">The Limit must bigger 0.01.</p>}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                type='number'
                                label="Alpha"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Alpha : 5}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Turnover : 4000}
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
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.MaxTurnover : ""}
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
                                defaultChecked
                                title="IsActive"
                                {...register("IsActive")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Adaptive</FormLabel>
                            <Switch
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.Adaptive}
                                title="Adaptive"
                                {...register("Adaptive")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Reverse</FormLabel>
                            <Switch
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.Reverse}
                                title="Reverse"
                                {...register("Reverse")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>

                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                defaultChecked
                                title="Remember"
                                {...register("Remember")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>Beta</FormLabel>
                            <Tooltip
                                title={"OC >= MAX của 30 cây gần nhất không phân biệt side"}
                                placement='top'
                                leaveDelay={2000}
                            >

                                <Switch
                                    defaultChecked={DEFAULT_REMEMBER_VALUE?.IsBeta}
                                    title="IsBeta"
                                    color='warning'
                                    {...register("IsBeta")}
                                />
                            </Tooltip>
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>Raceme</FormLabel>
                            <Tooltip
                                title={"Trong 10s scan được 2 lần đúng"}
                                placement='top'
                                leaveDelay={2000}
                            >
                                <Switch
                                    defaultChecked={DEFAULT_REMEMBER_VALUE?.Raceme}
                                    title="Raceme"
                                    color='success'
                                    {...register("Raceme")}
                                />
                            </Tooltip>
                        </FormControl>
                        <FormControl className={clsx(styles.formControl, styles.switchControl)}>
                            <FormLabel className={styles.label}>4B</FormLabel>
                            <Tooltip
                                title={"Auto update OC nếu đúng và Delete nếu sai trong lần scan tiếp"}
                                placement='top'
                                leaveDelay={2000}
                            >
                            <Switch
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.FourB}
                                title="4B"
                                color='error'
                                {...register("FourB")}
                            />
                        </Tooltip>
                    </FormControl>

                </div>
            </div>


        </form>
        </DialogCustom >
    );
}

export default CreateStrategy;