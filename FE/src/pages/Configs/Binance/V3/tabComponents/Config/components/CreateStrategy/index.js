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
import { createConfigScannerV3 } from '../../../../../../../../services/Configs/Binance/V3/configService';
import { getAllCoin, syncCoin } from '../../../../../../../../services/Coins/Binance/coinFuturesService';
import { getAllGroupCoin } from '../../../../../../../../services/Coins/Binance/groupCoinV3Service';
import { Link, useNavigate } from 'react-router-dom';

function CreateStrategy({
    botListInput,
    onClose,
}) {

    const DEFAULT_REMEMBER_VALUE = JSON.parse(localStorage.getItem("Binance_V3_Config"))

    const navigate = useNavigate()

    const formControlMinValue = 0.01

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

    const [maxFrame, setMaxFrame] = useState(undefined);
    const [maxRangeFrame, setMaxRangeFrame] = useState(undefined);
    const [onlyPairsSelected, setOnlyPairsSelected] = useState([])
    const [blackListSelected, setBlackListSelected] = useState([])
    const [allGroupCoinData, setAllGroupCoinData] = useState({
        OnlyPairs: [],
        Blacklist: [],
    })
    const [botList, setBotList] = useState([botListInput[0]])
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
            const res = await getAllCoin()
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
                const res = await syncCoin()
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
                        Frame: `${data.Frame}${data.Time}`,
                        Range: `${data.Range}${data.RangeTime}`,
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
            !addMore && closeDialog()
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
                    {errors.Label?.type === 'required' && <p className="formControlErrorLabel">The Label Required.</p>}
                </FormControl>



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
                                    navigate("/Coins/Binance/Group")
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
                                                {option.name.split("USDT")[0]}
                                            </li>
                                        </>
                                    )}
                                    renderTags={(value) => {
                                        return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                                    }}
                                >
                                </Autocomplete>
                                {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">Required.</p>}</>
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
                                                {option.name.split("USDT")[0]}
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

                <div className={styles.formMainData} style={{ marginTop: "12px" }}>


                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>

                            <TextField
                                select
                                label="Position"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.PositionSide || positionSideListDefault[0].value}
                                variant="outlined"
                                size="medium"
                                {...register("PositionSide", { required: true })}
                            >
                                {
                                    positionSideListDefault.map(item => (
                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                    ))
                                }
                            </TextField>
                            {errors.PositionSide?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                        </FormControl>

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
                            {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}
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
                                label="Numbs"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.Numbs || 3}
                                size="medium"
                                {...register("Numbs",)}
                            />
                            {errors.Numbs?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Numbs?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}
                        </FormControl>

                    </div>
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="TP"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.TP || 25}
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

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC +"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.OCBonus || 2.5}
                                size="medium"
                                {...register("OCBonus",)}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
                            />
                            {errors.OCBonus?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.OCBonus?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}
                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Expire"
                                variant="outlined"
                                defaultValue={DEFAULT_REMEMBER_VALUE?.TimeOCBonusExpire || 5}
                                size="medium"
                                {...register("TimeOCBonusExpire",)}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        s
                                    </InputAdornment>
                                }}
                            />
                            {errors.TimeOCBonusExpire?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.TimeOCBonusExpire?.type === "min" && <p className="formControlErrorLabel">Bigger 0.01.</p>}
                        </FormControl>

                    </div>
                </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Active</FormLabel>
                            <Switch
                                defaultChecked
                                {...register("IsActive")}
                            />
                        </FormControl>
                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Remember</FormLabel>
                            <Switch
                                defaultChecked
                                {...register("Remember")}
                            />
                        </FormControl>

                        <FormControl className={clsx(styles.formControl)}>
                            <FormLabel className={styles.label}>Beta</FormLabel>
                            <Switch
                                defaultChecked={DEFAULT_REMEMBER_VALUE?.IsBeta}
                                color="warning"

                                {...register("IsBeta")}
                            />
                        </FormControl>
                    </div>

            </form>
        </DialogCustom >
    );
}

export default CreateStrategy;