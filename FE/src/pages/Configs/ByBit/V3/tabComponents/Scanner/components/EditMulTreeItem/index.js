import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, TextField, Autocomplete, Button, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, RadioGroup, FormControlLabel, Radio, CircularProgress, FormLabel, Switch } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import DialogCustom from '../../../../../../../../components/DialogCustom';
import { verifyTokenVIP } from '../../../../../../../../services/authService';
import { getAllBotActive } from '../../../../../../../../services/botService';
import { getUserByID } from '../../../../../../../../services/userService';
import { addMessageToast } from '../../../../../../../../store/slices/Toast';
import { copyMultipleStrategiesToBotScannerV3, deleteStrategiesMultipleScannerV3, updateStrategiesMultipleScannerV3 } from '../../../../../../../../services/Configs/ByBIt/V3/scannerService';
import { NumericFormat } from 'react-number-format';
import { useForm } from 'react-hook-form';
import { getAllCoin } from '../../../../../../../../services/Coins/ByBit/coinFuturesService';
import { getAllGroupCoin } from '../../../../../../../../services/Coins/ByBit/groupCoinV3Service';
import styles from "../CreateStrategy/CreateStrategy.module.scss"
import stylesRadio from "./EditMulTreeItem.module.scss"

function EditMulTreeItem({
    onClose,
    botListInput,
    dataCheckTreeSelected,
}) {

    const userData = useSelector(state => state.userDataSlice.userData)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted },
        setValue
    } = useForm();

    const [maxFrame, setMaxFrame] = useState(undefined);
    const [maxRangeFrame, setMaxRangeFrame] = useState(undefined);

    const compareFilterListDefault = [
        "=",
        "+",
        "-",
        "=%",
        "+%",
        "-%",
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

    const fieldFilterList = [
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "OC",
            value: "OrderChange",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Adjust",
            value: "Adjust",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "MaxOC",
            value: "MaxOC",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Vol24h",
            value: "Turnover",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Amount",
            value: "Amount",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "TP",
            value: "TP",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Reduce",
            value: "ReTP",
            compareFilterList: compareFilterListDefault,
        },

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Entry",
            value: "Entry",
            compareFilterList: compareFilterListDefault,
        },

      
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Pre-OC",
            value: "OCLength",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Frame",
            value: "Frame",
            compareFilterList: ["="],
        },

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Range",
            value: "Range",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Longest",
            value: "Longest",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Elastic",
            value: "Elastic",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Ratio",
            value: "Ratio",
            compareFilterList: compareFilterListDefault,
        },

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Expire",
            value: "Expire",
            compareFilterList: compareFilterListDefault,

        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Active",
            value: "IsActive",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Label",
            value: "Label",
            compareFilterList: ["="],
        },
         {
            data: {
                compare: "=",
                value: false
            },
            name: "Dev",
            value: "IsDev",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Wait",
            value: "IsOCWait",
            compareFilterList: ["="],
        },
      
         {
            data: {
                compare: "=",
                value: false
            },
            name: "Beta",
            value: "IsBeta",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "OnlyPairs",
            value: "OnlyPairs",
            compareFilterList: ["=", "+"],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Blacklist",
            value: "Blacklist",
            compareFilterList: ["=", "+"],
        },
    ]

    const dispatch = useDispatch()

    const [copyType, setCopyType] = useState("Bot");
    const [symbolListData, setSymbolListData] = useState([]);
    const [symbolListSelected, setSymbolListSelected] = useState([]);
    const [groupCoinOnlyPairsID, setGroupCoinOnlyPairsID] = useState("");
    const [groupCoinBlacklistID, setGroupCoinBlacklistID] = useState("");
    const [allGroupCoinData, setAllGroupCoinData] = useState({
        OnlyPairs: [],
        Blacklist: [],
    })

    // const [botListData, setBotListData] = useState([]);
    const [botLisSelected, setBotLisSelected] = useState([]);
    const [botListInputVIP, setBotListInputVIP] = useState([]);

    const [filterDataRowList, setFilterDataRowList] = useState([fieldFilterList[0]]);
    const [radioValue, setRadioValue] = useState("Update");
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [roleNameMainVIP, setRoleNameMainVIP] = useState(false);
    const [onlyPairsSelected, setOnlyPairsSelected] = useState([])
    const [blackListSelected, setBlackListSelected] = useState([])
    const [dialogOnlyPairs, setDialogOnlyPairs] = useState(false);
    const [dialogBlacklist, setDialogBlacklist] = useState(false);
    const [dialogFrame, setDialogFrame] = useState(false);
    const [dialogRange, setDialogRange] = useState(false);

    const [onlyPairsView, setOnlyPairsView] = useState("Default");
    const [blacklistView, setBlacklistView] = useState("Default");

    const [allSymbolList, setAllSymbolList] = useState([])

    const newFrameDataRef = useRef({
        Frame: 1,
        Time: 'h'
    })
    const newRangeDataRef = useRef({
        Frame: 1,
        Time: 'h'
    })
    const handleDataCheckTreeSelected = useMemo(() => {
        return dataCheckTreeSelected.map(item => JSON.parse(item))
    }, [dataCheckTreeSelected])

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

    const handleVerifyLogin = async () => {
        try {
            const res = await verifyTokenVIP({
                token: localStorage.getItem("tk_crypto")
            })
            const userData = res.data.data

            const resUser = await getUserByID(userData._id)
            const { data: resUserData } = resUser.data
            if (resUserData.roleName === "SuperAdmin" || resUserData.roleName === "Admin") {
                handleGetAllBot()
                setRoleNameMainVIP(true)
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Role User Main Error",
            }))
        }
    }
    const handleGetAllBot = async () => {
        try {
            const res = await getAllBotActive("ByBit_V3")
            const { data: resUserData } = res.data
            setBotListInputVIP(resUserData.map(item => ({
                name: item.botName,
                value: item._id
            })))

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Role User Main Error",
            }))
        }
    }



    const addFilterRow = () => {
        setFilterDataRowList(filterRowList => [
            ...filterRowList,
            fieldFilterList[1]
        ])
    }

    const handleChangeRatioCopy = (e) => {
        const value = e.target.value
        setCopyType(value)
    }

    const deleteFilterRow = (indexRow) => {
        setFilterDataRowList(filterRowList => filterRowList.filter((value, index) => index !== indexRow))
    }

    const handleChangeValue = (value, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return {
                    ...item,
                    data: {
                        ...item.data,
                        value: value
                    }
                }
            }
            return item
        }))
    }

    const handleGetAlLSymbol = async () => {
        if (!allSymbolList.length) {
            const res = await getAllCoin()
            const { data: symbolListDataRes } = res.data
            const newData = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))
            setAllSymbolList(newData)
        }
    }
    const handleFiledValueElement = (item, indexRow) => {
        switch (item.value) {
            case "IsActive":
            case "IsBeta":
            case "IsOCWait":
            case "IsDev":
                return <Checkbox
                    checked={item.data.value}
                    onChange={(e) => {
                        handleChangeValue(e.target.checked, indexRow)
                    }}
                />
            case "Label":
                return <TextField
                    value={item.data.value}
                    onChange={(e) => { handleChangeValue(e.target.value, indexRow) }}
                    size="small"
                    style={{
                        width: "100%"
                    }}
                >
                </TextField>
            case "Frame":
                const FrameData = newFrameDataRef.current
                return (
                    <>
                        <TextField
                            size="small"
                            value={`${FrameData.Frame}${FrameData.Time}`}
                            onClick={() => {
                                setDialogFrame(true)
                            }}
                        >
                        </TextField>
                        <DialogCustom
                            open={dialogFrame}
                            onClose={() => { setDialogFrame(false) }}
                            dialogTitle='Set Frame'
                            submitBtnText='Apply'
                            maxWidth='sm'
                            onSubmit={handleSubmit(data => {
                                newFrameDataRef.current = {
                                    Frame: data.Frame,
                                    Time: data.Time
                                }
                                setDialogFrame(false)
                            })}
                        // loading={loadingSubmit}
                        >
                            <div style={{ display: 'flex', marginTop: "12px" }}>

                                <FormControl style={{ flex: 1, margin: "0 6px" }}>
                                    <TextField
                                        type='number'
                                        label="Frame"
                                        variant="outlined"
                                        size="medium"
                                        defaultValue={FrameData.Frame}
                                        {...register("Frame", { required: true, max: maxFrame, min: 0.25 })}
                                    >
                                    </TextField>
                                    {errors.Frame?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                                    {errors.Frame?.type === "min" && <p className="formControlErrorLabel">Min: 0.25</p>}
                                    {errors.Frame?.type === "max" && <p className="formControlErrorLabel">Max: {maxFrame}</p>}

                                </FormControl>

                                <FormControl style={{ flex: 1, margin: "0 6px" }}>
                                    <TextField
                                        select
                                        label="Time"
                                        variant="outlined"
                                        size="medium"
                                        defaultValue={FrameData.Time}
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
                        </DialogCustom>
                    </>
                )
            case "Range":
                const RangeData = newRangeDataRef.current

                return (
                    <>
                        <TextField
                            size="small"
                            value={`${RangeData.Frame}${RangeData.Time}`}
                            onClick={() => {
                                setDialogRange(true)
                            }}
                        >
                        </TextField>
                        <DialogCustom
                            open={dialogRange}
                            onClose={() => { setDialogRange(false) }}
                            dialogTitle='Set Range'
                            submitBtnText='Apply'
                            maxWidth='sm'
                            onSubmit={handleSubmit(data => {
                                console.log(data);

                                newRangeDataRef.current = {
                                    Frame: data.Range,
                                    Time: data.RangeTime
                                }
                                setDialogRange(false)
                            })}
                        // loading={loadingSubmit}
                        >
                            <div style={{ display: 'flex', marginTop: "12px" }}>

                                <FormControl style={{ flex: 1, margin: "0 6px" }}>
                                    <TextField
                                        type='number'
                                        label="Range"
                                        variant="outlined"
                                        size="medium"
                                        defaultValue={RangeData.Frame}
                                        {...register("Range", { required: true, max: maxRangeFrame, min: 0.25 })}
                                    >
                                    </TextField>
                                    {errors.Range?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                                    {errors.Range?.type === "min" && <p className="formControlErrorLabel">Min: 0.25</p>}
                                    {errors.Range?.type === "max" && <p className="formControlErrorLabel">Max: {maxRangeFrame}</p>}

                                </FormControl>

                                <FormControl style={{ flex: 1, margin: "0 6px" }}>
                                    <TextField
                                        select
                                        label="Time"
                                        variant="outlined"
                                        size="medium"
                                        defaultValue={RangeData.Time}
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
                        </DialogCustom>
                    </>
                )
            case "OnlyPairs":

                return (
                    <>
                        <Button
                            size="small"
                            variant='contained'
                            color='inherit'
                            onClick={() => {
                                setDialogOnlyPairs(true)
                                handleGetAlLSymbol()
                                setOnlyPairsView("Default")
                                // setOnlyPairsSelected([])
                                setGroupCoinOnlyPairsID("")
                            }}
                        >
                            {onlyPairsSelected.length ? onlyPairsSelected.length : "0"}
                        </Button>
                        <DialogCustom
                            open={dialogOnlyPairs}
                            onClose={() => {
                                setDialogOnlyPairs(false)

                            }}
                            dialogTitle='Set Only Pairs'
                            submitBtnText='Apply'
                            maxWidth='xs'
                            onSubmit={() => {
                                (groupCoinOnlyPairsID || onlyPairsSelected.length) && setDialogOnlyPairs(false)
                            }}
                            hideCloseBtn
                        >
                            <FormControl className={styles.formControl}>

                                <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                                    <FormLabel className={styles.label}>Only pairs</FormLabel>
                                    <div>
                                        <Switch
                                            onChange={(e) => {
                                                setOnlyPairsView("Default")
                                                setOnlyPairsSelected([])
                                                setGroupCoinOnlyPairsID("")

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
                                        <Autocomplete
                                            multiple
                                            limitTags={2}
                                            value={onlyPairsSelected}
                                            disableCloseOnSelect
                                            isOptionEqualToValue={(option, value) => option.value === value.value}
                                            options={allSymbolList}
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
                                                                    setOnlyPairsSelected(allSymbolList)
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
                                    ) : (
                                        <>
                                            <TextField
                                                select
                                                variant="outlined"
                                                size="small"
                                                onChange={e => {
                                                    setGroupCoinOnlyPairsID(e.target.value)
                                                }}
                                            >
                                                {
                                                    allGroupCoinData.OnlyPairs.map(item => (
                                                        <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                                    ))
                                                }
                                            </TextField>
                                        </>
                                    )
                                }
                                {!(groupCoinOnlyPairsID || onlyPairsSelected.length > 0) && <p className="formControlErrorLabel">Required.</p>}

                            </FormControl>
                        </DialogCustom >
                    </>
                )
            case "Blacklist":
                return (
                    <>
                        <Button
                            size="small"
                            variant='contained'
                            color='inherit'
                            onClick={() => {
                                setDialogBlacklist(true)
                                handleGetAlLSymbol()
                                setBlacklistView("Default")
                                setGroupCoinBlacklistID("")
                            }}
                        >
                            {blackListSelected.length ? blackListSelected.length : "0"}
                        </Button>
                        <DialogCustom
                            open={dialogBlacklist}
                            onClose={() => {
                                setDialogBlacklist(false)
                            }}
                            dialogTitle='Set Blacklist'
                            submitBtnText='Apply'
                            maxWidth='xs'
                            onSubmit={() => { setDialogBlacklist(false) }}
                            hideCloseBtn
                        >
                            <FormControl className={styles.formControl}>
                                <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                                    <FormLabel className={styles.label}>Blacklist</FormLabel>
                                    <div>
                                        <Switch
                                            onChange={(e) => {
                                                setBlacklistView("Default")
                                                setBlackListSelected([])
                                                setGroupCoinBlacklistID("")
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
                                                isOptionEqualToValue={(option, value) => option.value === value.value}
                                                disableCloseOnSelect
                                                options={allSymbolList}
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
                                                                        setBlackListSelected(allSymbolList)
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
                                            onChange={e => {
                                                setGroupCoinBlacklistID(e.target.value)
                                            }}
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
                        </DialogCustom>
                    </>
                )
            default:
                // return <TextField
                //     type='number'
                //     value={item.data.value}
                //     onChange={(e) => { handleChangeValue(e.target.value, indexRow) }}
                //     size="small"
                //     style={{
                //         width: "100%"
                //     }}
                // >
                // </TextField>
                return <NumericFormat
                    thousandSeparator
                    value={item.data.value}
                    type='text'
                    onChange={(e) => {
                        const value = Number.parseFloat(e.target.value.replace(/,/g, ''))
                        handleChangeValue(value, indexRow)
                    }}
                    style={{
                        width: "100%",
                        height: "40px",
                        outline: "none",
                        border: "1px solid #c4c4c4",
                        padding: "0 12px",
                        borderRadius: "6px"
                    }}
                >
                </NumericFormat>
        }
    }

    const handleChangeField = (itemInput, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return itemInput
            }
            return item
        }))
    }

    const handleChangeCompare = (compareValue, indexInput) => {

        setFilterDataRowList(filterDataRowList => filterDataRowList.map((item, index) => {
            if (index === indexInput) {
                return {
                    ...item,
                    data: {
                        ...item.data,
                        compare: compareValue
                    }
                }
            }
            return item
        }))
    }

    const handleCompare = (valueDefault, compareValue, valueChange) => {
        if (typeof (valueChange) === "string") {
            valueChange = +valueChange
        }
        if (typeof (valueDefault) === "string") {
            valueDefault = +valueDefault
        }
        switch (compareValue) {
            case "=":
                return valueChange

            case "+":
                return valueDefault + valueChange

            case "-":
                return valueDefault - valueChange

            case "=%":
                return valueDefault * valueChange / 100

            case "+%":
                return valueDefault * (100 + valueChange) / 100
            case "-%":
                return valueDefault * (100 - valueChange) / 100

            default:
                return false

        }
    }

    const handleUpdate = async () => {

        let checkValueMin = true

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => (
                {
                    id: dataCheckTreeItem._id,
                    UpdatedFields: filterDataRowList.map(filterRow => {
                        const filedValue = filterRow.value
                        let valueHandle = filedValue != "Label" ? handleCompare(dataCheckTreeItem[filedValue], filterRow.data.compare, filterRow.data.value) : filterRow.data.value
                        if (typeof (valueHandle) === "number" && !["Expire", "Turnover", "OCLength", "Elastic", "Frame", "Range", "Blacklist", "OnlyPairs"].includes(filedValue)) {
                            valueHandle = parseFloat(valueHandle.toFixed(4))
                            if (valueHandle < 0.01) {
                                checkValueMin = false
                            }
                        }
                        if (filedValue == 'Frame') {
                            const FrameData = newFrameDataRef.current
                            return {
                                Frame: `${FrameData.Frame}${FrameData.Time}`
                            }

                        }
                        else if (filedValue == 'Range') {
                            const FrameData = newRangeDataRef.current
                            return {
                                Range: `${FrameData.Frame}${FrameData.Time}`
                            }
                        }
                        else if (filedValue === "OnlyPairs") {
                            let OnlyPairs = []
                            const newData = onlyPairsSelected.map(item => item.value)
                            switch (filterRow.data.compare) {
                                case "=": {
                                    OnlyPairs = newData
                                    break;
                                }
                                case "+": {
                                    OnlyPairs = [...new Set(dataCheckTreeItem.OnlyPairs.concat(newData))]
                                }
                            }

                            let groupCoinOnlyPairsIDTemp = groupCoinOnlyPairsID

                            if (groupCoinOnlyPairsIDTemp) {
                                OnlyPairs = []
                            }
                            else {
                                groupCoinOnlyPairsIDTemp = null
                            }

                            return {
                                OnlyPairs,
                                groupCoinOnlyPairsID: groupCoinOnlyPairsIDTemp
                            }
                        }
                        else if (filedValue === "Blacklist") {

                            let Blacklist = []
                            const newData = blackListSelected.map(item => item.value)
                            switch (filterRow.data.compare) {
                                case "=": {
                                    Blacklist = newData
                                    break;
                                }
                                case "+": {
                                    Blacklist = [...new Set(dataCheckTreeItem.Blacklist.concat(newData))]
                                }
                            }
                            let groupCoinBlacklistIDTemp = groupCoinBlacklistID

                            if (groupCoinBlacklistIDTemp) {
                                Blacklist = []
                            }
                            else {
                                groupCoinBlacklistIDTemp = null
                            }

                            return {
                                Blacklist,
                                groupCoinBlacklistID: groupCoinBlacklistIDTemp
                            }
                        }
                        else {
                            return {
                                [filedValue]: valueHandle
                            }
                        }
                    }).reduce((accumulator, currentObject) => {
                        const { parentID, ...oldData } = dataCheckTreeItem
                        return { ...oldData, ...accumulator, ...currentObject };
                    }, {})

                }
            ))

            if (checkValueMin) {
                setLoadingSubmit(true)

                const res = await updateStrategiesMultipleScannerV3(newData)

                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                if (status === 200) {
                    closeDialog(true)

                }
            }
            else {
                dispatch(addMessageToast({
                    status: 400,
                    message: "All Field Value >= 0.01",
                }))
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update All Error",
            }))

        }
        setLoadingSubmit(false)
    }


    const handleDelete = async () => {

        setLoadingSubmit(true)

        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => ({
                id: dataCheckTreeItem._id,
                Market: dataCheckTreeItem.Market
            }))

            const res = await deleteStrategiesMultipleScannerV3(newData)

            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            dataChange = true

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete All Error",
            }))
        }
        closeDialog(dataChange)
    }

    const handleExport = () => {
        dispatch(addMessageToast({
            status: 1,
            message: "Export"
        }))
    }

    const handleCopy = async () => {

        if (symbolListSelected.length > 0 || botLisSelected.length > 0) {
            let dataChange = false
            setLoadingSubmit(true)
            try {
                const res = await copyMultipleStrategiesToBotScannerV3({
                    symbolListData: handleDataCheckTreeSelected,
                    symbolList: botLisSelected.map(item => item.value)
                })
                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))
                if (status === 200) {
                    dataChange = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Copy Strategies Error",
                }))
                setLoadingSubmit(false)
            }
            closeDialog(dataChange)
        }
    }

    const handleALL = async (data) => {
        setLoadingSubmit(true)
        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => (
                {
                    id: dataCheckTreeItem._id,
                    parentID: dataCheckTreeItem.parentID,
                    UpdatedFields: {
                        ...dataCheckTreeItem,
                        ...data
                    }

                }
            ))

            const res = await updateStrategiesMultipleScannerV3(newData)

            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            dataChange = true

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update All Error",
            }))
        }
        closeDialog(dataChange)
    }

    const handleOffALL = async () => {
        setLoadingSubmit(true)
        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => (
                {
                    id: dataCheckTreeItem._id,
                    parentID: dataCheckTreeItem.parentID,
                    UpdatedFields: {
                        ...dataCheckTreeItem,
                        IsActive: false
                    }

                }
            ))

            const res = await updateStrategiesMultipleScannerV3(newData)

            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                dataChange = true
            }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update All Error",
            }))
        }
        closeDialog(dataChange)
    }

    const handleEdit = () => {
        switch (radioValue) {
            case "Update":
                handleUpdate()
                break
            case "Delete":
                handleDelete()
                break
            case "Export":
                handleExport()
                break
            case "Copy":
                handleCopy()
                break
            case "ON":
                handleALL({ IsActive: true })
                break
            case "OFF":
                handleALL({ IsActive: false })
                break
            case "Beta":
                handleALL({ IsBeta: true })
                break

        }
    }

    const handleChangeRatio = (e) => {
        setRadioValue(e.target.value)

    }


    const handleRenderContentRadio = () => {
        switch (copyType) {
            case "Symbol":
                return <div>
                    <Autocomplete
                        multiple
                        limitTags={1}
                        value={symbolListSelected}
                        disableCloseOnSelect
                        options={symbolListData}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setSymbolListSelected(value)
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
                                                setSymbolListSelected(symbolListData)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolListSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || symbolListSelected.findIndex(item => item.value === option.value) > -1}
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
                    {!symbolListSelected.length && <p className="formControlErrorLabel">The {copyType} field is required.</p>}
                </div>
            case "Bot":
                return <div>
                    <Autocomplete
                        multiple
                        limitTags={1}
                        value={botLisSelected}
                        disableCloseOnSelect
                        options={botListInput}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBotLisSelected(value)
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
                                                setBotLisSelected(botListInput)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBotLisSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || botLisSelected.findIndex(item => item.value === option.value) > -1}
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
                    {!botLisSelected.length && <p className="formControlErrorLabel">The {copyType} field is required.</p>}
                </div>
            case "BotVip":
                return roleNameMainVIP && <div>
                    <Autocomplete
                        multiple
                        limitTags={1}
                        value={botLisSelected}
                        disableCloseOnSelect
                        options={botListInputVIP}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBotLisSelected(value)
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
                                                setBotLisSelected(botListInputVIP)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBotLisSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || botLisSelected.findIndex(item => item.value === option.value) > -1}
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
                    {!botLisSelected.length && <p className="formControlErrorLabel">The {copyType} field is required.</p>}
                </div>
        }
    }
    const handleElementWhenChangeRatio = () => {
        switch (radioValue) {
            case "Update":
                return <Table

                    sx={{
                        ".MuiTableCell-root": {
                            border: "none",
                            padding: "6px",
                            fontSize: '1.2rem'
                        },
                    }}>
                    <TableHead >
                        <TableRow>
                            <TableCell style={{ width: "16px" }}>
                                <AddCircleOutlineIcon
                                    style={{
                                        cursor: "pointer",
                                        verticalAlign: "bottom"
                                    }}
                                    onClick={addFilterRow}
                                />
                            </TableCell>
                            <TableCell>Field</TableCell>
                            <TableCell>Com</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>

                    </TableHead>

                    <TableBody>
                        {
                            filterDataRowList.map((filterRow, indexRow) => (
                                <TableRow
                                    key={`${filterRow.value}-${indexRow}`}
                                >
                                    <TableCell
                                    >
                                        <DeleteOutlineIcon
                                            style={{
                                                cursor: "pointer",
                                                verticalAlign: "bottom"
                                            }}
                                            onClick={() => { deleteFilterRow(indexRow) }}
                                        />
                                    </TableCell>
                                    <TableCell
                                        style={{
                                            maxWidth: "150px",
                                            width: "150px"
                                        }}
                                    >
                                        <Select
                                            value={filterRow.value}
                                            size="small"
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            {
                                                fieldFilterList.map((item) => (
                                                    <MenuItem
                                                        value={item.value}
                                                        key={item.value}
                                                        onClick={() => { handleChangeField(item, indexRow) }}
                                                    >{item.name}</MenuItem>
                                                ))
                                            }
                                        </Select>
                                    </TableCell>
                                    <TableCell
                                        style={{
                                            maxWidth: "80px",
                                            width: "80px"
                                        }}
                                    >
                                        {
                                            <Select
                                                size="small"
                                                style={{
                                                    width: "100%"
                                                }}
                                                value={filterRow.data.compare}
                                            >
                                                {
                                                    filterRow.compareFilterList.map(item => (
                                                        <MenuItem
                                                            value={item}
                                                            key={item}
                                                            onClick={() => { handleChangeCompare(item, indexRow) }}

                                                        >{item}</MenuItem>
                                                    ))
                                                }
                                            </Select>
                                        }
                                    </TableCell>
                                    <TableCell >
                                        {
                                            handleFiledValueElement(filterRow, indexRow)
                                        }
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            case "Delete":
                return <></>
            case "Export":
                return <></>
            case "Copy":
                return (
                    <div>
                        <FormControl style={{ marginBottom: "6px" }} >
                            <RadioGroup
                                defaultValue="Bot"
                                onChange={handleChangeRatioCopy}
                                style={{
                                    display: "flex",
                                    flexDirection: "row"
                                }}
                            >
                                {/* <FormControlLabel value="Symbol" control={<Radio />} label="Symbol" /> */}
                                <FormControlLabel value="Bot" control={<Radio />} label="Bot" />
                                {roleNameMainVIP && <FormControlLabel value="BotVip" control={<Radio />} label="Bot VIP" style={{ color: "var(--blueLightColor)" }} />}
                            </RadioGroup>
                        </FormControl>
                        {handleRenderContentRadio()}
                    </div>
                )
            default:
                return <></>

        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        setLoadingSubmit(false)
    }

    useEffect(() => {
        if (radioValue === "Copy") {
            // handleGetSymbolList()
            handleVerifyLogin()
        }
        // handleGetAllBot()
    }, [radioValue]);

    return (
        <DialogCustom
            open={true}
            onClose={() => { closeDialog(false) }}
            dialogTitle='Bulk'
            submitBtnText='Apply'
            maxWidth='sm'
            onSubmit={handleEdit}
            loading={loadingSubmit}
            hideCloseBtn
        >
            <p style={{
                fontWeight: "600",
                marginBottom: "6px",
                fontSize: "1.1rem",
            }}>{dataCheckTreeSelected.length} items selected</p>
            <div style={{
                padding: "6px 12px",
                margin: "12px 0",
                border: "1px solid var(--borderColor)"
            }}>
                <RadioGroup
                    defaultValue={radioValue}
                    onChange={handleChangeRatio}
                    className={stylesRadio.radioGroupAction}
                >
                    <div className={stylesRadio.radioGroupActionItem}>
                        <FormControlLabel className={stylesRadio.radioItem} value="Update" control={<Radio />} label="Update" />
                        <FormControlLabel className={stylesRadio.radioItem} value="Delete" control={<Radio />} label="Delete" />
                        <FormControlLabel className={stylesRadio.radioItem} value="Copy" control={<Radio />} label="Copy To" />
                    </div>
                    <div className={stylesRadio.radioGroupActionItem}>
                        <FormControlLabel className={stylesRadio.radioItem} value="ON" control={<Radio />} label="ON" />
                        <FormControlLabel className={stylesRadio.radioItem} value="OFF" control={<Radio />} label="OFF" />
                        <FormControlLabel className={stylesRadio.radioItem} value="Beta" control={<Radio />} label="Beta" />
                    </div>
                </RadioGroup>
            </div>

            {
                handleElementWhenChangeRatio()
            }

        </DialogCustom>);
}

export default EditMulTreeItem;