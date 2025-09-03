import AddIcon from '@mui/icons-material/Add';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, MenuItem, Switch, InputAdornment, CircularProgress, Tooltip } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { createConfigScannerV3 } from '../../../../../../../../services/Configs/OKX/V3/scannerService';
import { useNavigate } from 'react-router-dom';
import { getAllInstrumentOKXV1Futures, syncInstrumentOKXV1Futures } from '../../../../../../../../services/Coins/OKX/coinFuturesService';
import { getAllGroupCoin } from '../../../../../../../../services/Coins/OKX/groupCoinService';

function CreateStrategy({
    botListInput,
    onClose,
}) {


    const DEFAULT_REMEMBER_VALUE = JSON.parse(localStorage.getItem("OKX_V3_Scan"))

    const navigate = useNavigate()

    const formControlMinValue = 0.01

    const positionSideListDefault = [
        {
            name: "Long-Short",
            value: "Long-Short",
        },
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

    const ModeList = [
        {
            name: "isolated",
            value: "isolated",
        },
        {
            name: "cross",
            value: "cross",
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
    ]

    const timeList = [
        {
            name: "h",
            value: "h",
        },
        {
            name: "D",
            value: "D",
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
    const [allGroupCoinData, setAllGroupCoinData] = useState({
        OnlyPairs: [],
        Blacklist: [],
    })
    const [botList, setBotList] = useState([])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);

    const [onlyPairsView, setOnlyPairsView] = useState("Default");
    const [blacklistView, setBlacklistView] = useState("Default");

    const dataChangeRef = useRef(false)


    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        list: []
    });

    const dispatch = useDispatch()

    const handleGetStrategyDataList = async (syncNew = true) => {
        try {
            const res = await getAllInstrumentOKXV1Futures()
            const { data: symbolListDataRes } = res.data
            const newData = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))

            setBlackListSelected([])
            setOnlyPairsSelected([])
            setSymbolGroupDataList(
                {
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
                const res = await syncInstrumentOKXV1Futures()
                handleGetStrategyDataList()
                const { status, message, data: resData } = res.data

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

    const handleSubmitCreate = async (data, addMore = false) => {

        let Blacklist = blackListSelected.map(item => item.value)
        let OnlyPairs = onlyPairsSelected.map(item => item.value)
        let groupCoinOnlyPairsID = data.groupCoinOnlyPairsID
        let groupCoinBlacklistID = data.groupCoinBlacklistID || null

        if (onlyPairsView === "Default") {
            groupCoinOnlyPairsID = null
        }
        else {
            OnlyPairs = []
        }
        if (blacklistView === "Default") {
            groupCoinBlacklistID = null
        }
        else {
            Blacklist = []
        }

        if ((onlyPairsSelected.length > 0 || groupCoinOnlyPairsID) && botList.length > 0) {

            try {
                const res = await createConfigScannerV3({
                    data: {
                        ...data,
                        groupCoinOnlyPairsID,
                        groupCoinBlacklistID,
                    },
                    botListId: botList.map(item => item.value),
                    Blacklist,
                    OnlyPairs,
                })
                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    !addMore && reset()
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
            !addMore && closeDialog()

            if (data.Remember) {
                localStorage.setItem("OKX_V3_Scan", JSON.stringify(data))
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

    const handleGetAllMyGroupCoin = async () => {
        try {
            const res = await getAllGroupCoin()
            const { data: allGroupCoin } = res.data
            const OnlyPairsNew = []
            const BlacklistNew = []
            allGroupCoin.forEach(item => {
                const data = { name: item.name, value: item._id }
                if (item.forType == "OnlyPairs") {
                    OnlyPairsNew.push(data)
                }
                else {
                    BlacklistNew.push(data)
                }
            })
            BlacklistNew.unshift({
                name: "None",
                value: null
            })
            setAllGroupCoinData({
                OnlyPairs: OnlyPairsNew,
                Blacklist: BlacklistNew,
            })
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    useEffect(() => {
        handleGetStrategyDataList()
    }, []);


    return (
        <DialogCustom
            dialogTitle="Create Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(data => handleSubmitCreate(data, false))}
            maxWidth="sm"
            addMore
            addMoreFuntion={handleSubmit(data => handleSubmitCreate(data, true))}
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
                <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                    <FormControl className={clsx(styles.formMainDataSmallItem)}>

                        <FormLabel className={styles.label}>Label</FormLabel>
                        <TextField
                            variant="outlined"
                            size="small"
                            {...register("Label", { required: true, })}
                        >
                        </TextField>
                        {errors.Label?.type === 'required' && <p className="formControlErrorLabel">The Label Required.</p>}
                    </FormControl>


                    <FormControl className={clsx(styles.formMainDataSmallItem)}>
                        <FormLabel className={styles.label}>Mode</FormLabel>
                        <TextField
                            select
                            variant="outlined"
                            defaultValue={DEFAULT_REMEMBER_VALUE?.Mode || ModeList[0].value}
                            size="small"
                            {...register("Mode", { required: true, })}
                        >
                            {
                                ModeList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>
                </div>

                <FormControl className={styles.formControl}>

                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex" }}>
                            <FormLabel className={styles.label}>Only pairs</FormLabel>
                            {
                                onlyPairsView == "Default" && (
                                    <span style={{ marginLeft: "6px" }}>
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
                                )
                            }
                        </div>
                        <div>

                            <AddIcon style={{
                                verticalAlign: "middle",
                                backgroundColor: "#428dd5",
                                color: "white",
                                padding: "3px",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                marginRight: "6px"
                            }}
                                onClick={() => {
                                    navigate("/Coins/OKX/Group")
                                }} />
                            <Switch
                                onChange={(e) => {
                                    const check = e.target.checked
                                    setOnlyPairsView(check ? "Group" : "Default")
                                    check && !allGroupCoinData.OnlyPairs.length && handleGetAllMyGroupCoin()
                                }}
                            />
                            <span style={{ opacity: ".6" }}>Group</span>
                        </div>
                    </div>
                    {
                        onlyPairsView == "Default" ? (
                            <>

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
                                                    checked={selected || onlyPairsSelected.findIndex(item => item === option.value) > -1}
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
                                {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">The Only pairs Required.</p>}</>
                        ) : (
                            <>
                                <TextField
                                    select
                                    variant="outlined"
                                    size="small"
                                    {...register("groupCoinOnlyPairsID", { required: true, })}
                                >
                                    {
                                        allGroupCoinData.OnlyPairs.map(item => (
                                            <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                        ))
                                    }
                                </TextField>
                                {errors.groupCoinOnlyPairsID?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            </>
                        )
                    }

                </FormControl>

                <FormControl className={styles.formControl}>
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <FormLabel className={styles.label}>Blacklist</FormLabel>
                        <div>
                            <Switch
                                onChange={(e) => {
                                    const check = e.target.checked
                                    setBlacklistView(check ? "Group" : "Default")
                                    check && !allGroupCoinData.OnlyPairs.length && handleGetAllMyGroupCoin()
                                }}
                            />
                            <span style={{ opacity: ".6" }}>Group</span>
                        </div>
                    </div>
                    {
                        blacklistView == "Default" ? (
                            <>
                                <Autocomplete
                                    multiple
                                    limitTags={2}
                                    value={blackListSelected}
                                    disableCloseOnSelect
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
                                                    checked={selected || blackListSelected.findIndex(item => item === option.value) > -1}
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
                            </>
                        ) : (

                            <TextField
                                select
                                variant="outlined"
                                size="small"
                                {...register("groupCoinBlacklistID")}
                            >
                                {
                                    allGroupCoinData.Blacklist.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                        )
                    }
                </FormControl>

                <div className={styles.formMainData} style={{ marginTop: "10px" }}>


                    {/* <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <div className={clsx(styles.formMainDataItem, styles.formMainDataSmall)} style={{ flexBasis: "60%", marginRight: "16px" }} >

                            <FormControl className={clsx(styles.formMainDataSmallItem)}>
                                <TextField
                                    type='number'
                                    label="Frame"
                                    variant="outlined"
                                    size="medium"
                                    defaultValue={1}
                                    {...register("Frame", { required: true, max: maxFrame, min: 0.25 })}
                                >
                                </TextField>
                                {errors.Frame?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                                {errors.Frame?.type === "min" && <p className="formControlErrorLabel">Min: 0.25</p>}
                                {errors.Frame?.type === "max" && <p className="formControlErrorLabel">Max: {maxFrame}</p>}

                            </FormControl>

                            <FormControl className={clsx(styles.formMainDataSmallItem)}>
                                <TextField
                                    select
                                    label="Time"
                                    variant="outlined"
                                    size="medium"
                                    defaultValue={timeList[0].value}
                                    {...register("Time", { required: true, })}
                                    onChange={e => {
                                        setMaxFrame(e.target.value == "h" ? undefined : 9)
                                    }}
                                >
                                    {
                                        timeList.map(item => (
                                            <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                        ))
                                    }
                                </TextField>
                                {errors.Time?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            </FormControl>

                        </div>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                label="Pre-OC"
                                type='number'
                                variant="outlined"
                                defaultValue={15}
                                size="medium"
                                {...register("OCLength")}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>,
                                }}
                            >


                            </TextField>
                        </FormControl>

                    </div> */}
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                select
                                label="Candle"
                                variant="outlined"
                                size="medium"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Candle}
                                {...register("Candle", { required: true, })}
                            >
                                {
                                    candlestickList.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                            {errors.Candle?.type === 'required' && <p className="formControlErrorLabel">The Candle Required.</p>}
                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                select
                                label="Position"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.PositionSide}
                                {...register("PositionSide", { required: true })}
                            >
                                {
                                    positionSideListDefault.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                            {errors.PositionSide?.type === 'required' && <p className="formControlErrorLabel">The Position Required.</p>}
                        </FormControl>

                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC Min"
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
                            {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC Required.</p>}
                            {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.01.</p>}
                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Adjust"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Adjust || 1}
                                size="medium"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">
                                        x
                                    </InputAdornment>,
                                }}
                                {...register("Adjust", { required: true, min: formControlMinValue })}
                            />
                            {errors.Adjust?.type === 'required' && <p className="formControlErrorLabel">The Adjust Required.</p>}
                            {errors.Adjust?.type === "min" && <p className="formControlErrorLabel">The Adjust must bigger 0.01.</p>}
                        </FormControl>
                    </div>

                </div>

                <div className={styles.formMainData} style={{ marginTop: "6px" }}>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Range"
                                variant="outlined"
                                size="medium"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Range || 100}
                                {...register("Range", { required: true })}
                            >
                            </TextField>
                            {errors.Range?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}

                        </FormControl>

                        {/* <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                select
                                label="Time"
                                variant="outlined"
                                size="medium"
                                defaultValue={timeList[0].value}
                                {...register("RangeTime", { required: true, })}
                                onChange={e => {
                                    setMaxRangeFrame(e.target.value == "h" ? undefined : 9)
                                }}
                            >
                                {
                                    timeList.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                            {errors.RangeTime?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                        </FormControl> */}

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Tree"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Longest || 20}
                                size="medium"
                                sx={{
                                    '&.Mui-focused': {
                                        borderColor: 'red',
                                    },
                                }}
                                // InputProps={{
                                //     endAdornment: <InputAdornment position="end">
                                //         %
                                //     </InputAdornment>
                                // }}
                                {...register("Longest", {
                                    required: true,
                                    min: formControlMinValue
                                    // pattern: {
                                    //     value: /^\d+-\d+-\d+$/,
                                    //     message: 'Input must match the pattern a-b-c where a, b, and c are numbers',
                                    // }
                                })}
                            />
                            {errors.Longest?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Longest?.type === "min" && <p className="formControlErrorLabel">{">=  0.01"}</p>}

                        </FormControl>

                    </div>

                    {/* <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                       
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Elastic"
                                variant="outlined"
                                defaultValue={"40"}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("Elastic", {
                                })}
                            />

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Ratio"
                                variant="outlined"
                                defaultValue={"30"}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("Ratio", {
                                    required: true,
                                    min: formControlMinValue
                                })}
                            />
                            {errors.Ratio?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Ratio?.type === "min" && <p className="formControlErrorLabel">{">=  0.01"}</p>}

                        </FormControl>

                    </div> */}

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
                                        %
                                    </InputAdornment>
                                }}
                                {...register("Amount", { required: true, min: formControlMinValue })}
                            />
                            {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Amount?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="TP"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.TP || 40}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("TP", { required: true, min: formControlMinValue })}
                            />
                            {errors.TP?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.TP?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Reduce"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.ReTP || 45}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("ReTP", { required: true, min: formControlMinValue })}
                            />
                            {errors.ReTP?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.ReTP?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}

                        </FormControl>
                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        {/* <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Entry"
                                variant="outlined"
                                defaultValue={40}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                                {...register("Entry")}
                            />
                        </FormControl> */}
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Expire"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Expire : 1}
                                size="medium"
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        h
                                    </InputAdornment>
                                }}
                                {...register("Expire")}
                            />

                        </FormControl>
                    </div>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Vol24h"
                            variant="outlined"
                            defaultValue={DEFAULT_REMEMBER_VALUE ? DEFAULT_REMEMBER_VALUE?.Turnover : 5}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    MUSDT
                                </InputAdornment>
                            }}
                            {...register("Turnover")}
                        />

                    </FormControl>

                </div>

                <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)}>

                    <FormControl >
                        <FormLabel className={styles.label}>Active</FormLabel>
                        <Switch
                            defaultChecked
                            {...register("IsActive")}
                        />
                    </FormControl>
                    <FormControl >
                        <FormLabel className={styles.label}>Remember</FormLabel>
                        <Switch
                            defaultChecked
                            {...register("Remember")}
                        />
                    </FormControl>

                    <FormControl >
                        <FormLabel className={styles.label}>Beta</FormLabel>
                        <Switch
                            defaultChecked={DEFAULT_REMEMBER_VALUE?.IsBeta}
                            color="warning"
                            {...register("IsBeta")}
                        />
                    </FormControl>
                </div>


            </form>
        </DialogCustom>
    );
}

export default CreateStrategy;