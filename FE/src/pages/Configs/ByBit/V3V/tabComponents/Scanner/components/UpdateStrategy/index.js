import AddIcon from '@mui/icons-material/Add';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, Switch, InputAdornment, CircularProgress, MenuItem, FormControlLabel, Radio, RadioGroup } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { updateConfigByIDV3 } from '../../../../../../../../services/Configs/ByBIt/V3/scannerService';
import { getAllCoin, syncCoin } from '../../../../../../../../services/Coins/ByBit/coinFuturesService';
import { getAllGroupCoin } from '../../../../../../../../services/Coins/ByBit/groupCoinV3Service';
import { useNavigate } from 'react-router-dom';

function UpdateStrategy({
    onClose,
    dataInput,
    setDataCheckTree,
    dataCheckTreeDefaultRef,
    dataCheckTreeDefaultObject
}) {


    const navigate = useNavigate()

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

    const formControlMinValue = 0.01

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted
        },
    } = useForm();

    const onlyPairsSelectedInput = dataInput.OnlyPairs.map(item => ({ name: item, value: item }))
    const blackListSelectedInput = dataInput.Blacklist.map(item => ({ name: item, value: item }))
    const [onlyPairsSelected, setOnlyPairsSelected] = useState(onlyPairsSelectedInput || [])
    const [blackListSelected, setBlackListSelected] = useState(blackListSelectedInput || [])
    const [allGroupCoinData, setAllGroupCoinData] = useState({
        OnlyPairs: [],
        Blacklist: [],
    })

    const [onlyPairsView, setOnlyPairsView] = useState(dataInput?.groupCoinOnlyPairsID ? "Group" : "Default");
    const [blacklistView, setBlacklistView] = useState(dataInput?.groupCoinBlacklistID ? "Group" : "Default");

    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);
    const [maxFrame, setMaxFrame] = useState(undefined);
    const [maxRangeFrame, setMaxRangeFrame] = useState(undefined);

    const dataChangeRef = useRef(false)
    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: dataInput.Market,
        list: []
    });

    const dispatch = useDispatch()

    const handleSplitTimeFrame = (data) => {

        const checkHourFrameTime = data.includes("h")

        const Time = checkHourFrameTime ? "h" : "D"

        const FrameSplit = data.split(Time)

        const Frame = FrameSplit[0]

        return {
            Frame,
            Time
        }
    }

    const FrameDataInput = handleSplitTimeFrame(dataInput.Frame || "1D")
    const RangeDataInput = handleSplitTimeFrame(dataInput.Range || "1D")

    const handleGetStrategyDataList = async (syncNew = true) => {
        try {
            const res = await getAllCoin()
            const { data: symbolListDataRes } = res.data
            const newData = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))

            setBlackListSelected(blackListSelectedInput)
            setOnlyPairsSelected(onlyPairsSelectedInput)
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

    const handleSubmitCreate = async data => {


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

        if (onlyPairsSelected.length > 0 || groupCoinOnlyPairsID) {
            const configID = dataInput._id

            const newData = {
                ...dataInput,
                ...data,
                // groupCoinID:groupCoinID || "",
                Frame: `${data.Frame}${data.Time}`,
                Range: `${data.Range}${data.RangeTime}`,
                Blacklist,
                OnlyPairs,
                groupCoinOnlyPairsID,
                groupCoinBlacklistID,
            }
            try {
                const res = await updateConfigByIDV3({
                    newData,
                    configID
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update New Error",
                }))
            }
            closeDialog()
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

    useEffect(() => {
        !allGroupCoinData.OnlyPairs.length && handleGetAllMyGroupCoin()
    }, [dataInput?.groupCoinOnlyPairsID, dataInput?.groupCoinBlacklistID]);

    useEffect(() => {
        if (FrameDataInput?.Time == "D") {
            setMaxFrame(9)
        }
    }, []);

    useEffect(() => {
        if (RangeDataInput?.Time == "D") {
            setMaxRangeFrame(9)
        }
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
                        size="medium"
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

                <FormControl className={styles.formControl}>

                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex" }}>
                            <FormLabel className={styles.label}>Only pairs</FormLabel>
                            {
                                onlyPairsView == "Default" && (
                                    <span style={{ marginLeft: "6px" }}>
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
                                    navigate("/Coins/ByBit/Group")
                                }} />
                            <Switch
                                defaultChecked={onlyPairsView == "Group"}
                                onChange={(e) => {
                                    const check = e.target.checked
                                    setOnlyPairsView(check ? "Group" : "Default")
                                    check && handleGetAllMyGroupCoin()
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
                                {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">The Only pairs Required.</p>}</>
                        ) : (
                            <>
                                <TextField
                                    select
                                    variant="outlined"
                                    size="small"
                                    defaultValue={dataInput.groupCoinOnlyPairsID?._id}
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
                                defaultChecked={blacklistView == "Group"}
                                onChange={(e) => {
                                    const check = e.target.checked
                                    setBlacklistView(check ? "Group" : "Default")
                                    check && handleGetAllMyGroupCoin()
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
                                defaultValue={dataInput.groupCoinBlacklistID?._id}
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

                <div className={styles.formMainData}>
                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <div className={clsx(styles.formMainDataItem, styles.formMainDataSmall)} style={{ flexBasis: "60%", marginRight: "16px" }} >

                            <FormControl className={clsx(styles.formMainDataSmallItem)}>
                                <TextField
                                    type='number'
                                    label="Frame"
                                    variant="outlined"
                                    size="medium"
                                    defaultValue={FrameDataInput.Frame}
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
                                    defaultValue={FrameDataInput.Time}
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
                                defaultValue={dataInput.OCLength}
                                size="medium"
                                {...register("OCLength",)}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>,
                                }}
                            >


                            </TextField>
                        </FormControl>

                    </div>

                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            label="Candle"
                            variant="outlined"
                            size="medium"
                            value={dataInput.Candle}
                            disabled
                        >
                        </TextField>
                    </FormControl>

                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            label="Position side"
                            variant="outlined"
                            value={dataInput.PositionSide}
                            size="medium"
                            disabled
                        >

                        </TextField>
                    </FormControl>


                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="OC Min"
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
                                label="Adjust"
                                variant="outlined"
                                defaultValue={dataInput.Adjust}
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

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Range"
                                variant="outlined"
                                size="medium"
                                defaultValue={RangeDataInput.Frame}
                                {...register("Range", { required: true, max: maxRangeFrame, min: 0.25 })}
                            >
                            </TextField>
                            {errors.Range?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                            {errors.Range?.type === "min" && <p className="formControlErrorLabel">Min: 0.25</p>}
                            {errors.Range?.type === "max" && <p className="formControlErrorLabel">Max: {maxRangeFrame}</p>}

                        </FormControl>

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                select
                                label="Time"
                                variant="outlined"
                                size="medium"
                                defaultValue={RangeDataInput.Time}
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
                        </FormControl>

                    </div>

                    <div className={clsx(styles.formControl, styles.formMainDataItem, styles.formMainDataSmall)} >

                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Longest"
                                variant="outlined"
                                defaultValue={dataInput.Longest}
                                size="medium"
                                sx={{
                                    '&.Mui-focused': {
                                        borderColor: 'red',
                                    },
                                }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">
                                        %
                                    </InputAdornment>
                                }}
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

                            {/* {errors.Elastic?.type === 'pattern' && <p className="formControlErrorLabel">The Elastic pattern num-num-num.</p>} */}

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
                                {...register("Elastic", {
                                })}
                            />

                        </FormControl>
                        <FormControl className={clsx(styles.formMainDataSmallItem)}>
                            <TextField
                                type='number'
                                label="Ratio"
                                variant="outlined"
                                defaultValue={dataInput.Ratio}
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
                                defaultValue={dataInput.TP}
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
                    </div>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Expire"
                            variant="outlined"
                            defaultValue={dataInput.Expire || 0}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    h
                                </InputAdornment>
                            }}
                            {...register("Expire")}
                        />

                    </FormControl>


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Turnover 24h"
                            variant="outlined"
                            defaultValue={dataInput.Turnover || 0}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Turnover",)}
                        />

                    </FormControl>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>

                        <FormLabel className={styles.label}>IsActive</FormLabel>
                        <Switch
                            defaultChecked={dataInput.IsActive}
                            {...register("IsActive")}
                        />
                    </FormControl>
                </div>


            </form>
        </DialogCustom>
    );
}

export default UpdateStrategy;