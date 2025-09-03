import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useEffect, useMemo, useState } from "react";
import { Checkbox, TextField, Autocomplete, Button, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, RadioGroup, FormControlLabel, Radio, FormLabel, Switch } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import DialogCustom from '../../../../../../../../components/DialogCustom';
import { verifyTokenVIP } from '../../../../../../../../services/authService';
import { getAllBotActive } from '../../../../../../../../services/botService';
import { getUserByID } from '../../../../../../../../services/userService';
import { addMessageToast } from '../../../../../../../../store/slices/Toast';
import { getAllSymbolSpot, copyMultipleStrategiesToSymbolSpot, copyMultipleStrategiesToBotSpot } from '../../../../../../../../services/Configs/OKX/V1/spotService';
import { copyMultipleStrategiesToBotScanner, deleteStrategiesMultipleScanner, updateStrategiesMultipleScanner } from '../../../../../../../../services/Configs/OKX/V1/scannerService';
import { NumericFormat } from 'react-number-format';
import { getAllInstrumentOKXV1 } from '../../../../../../../../services/Coins/OKX/coinService';
import { getAllInstrumentOKXV1Futures } from '../../../../../../../../services/Coins/OKX/coinFuturesService';
import styles from "../CreateStrategy/CreateStrategy.module.scss"

function EditMulTreeItem({
    onClose,
    botListInput,
    dataCheckTreeSelected,
    market
}) {

    const userData = useSelector(state => state.userDataSlice.userData)
    const [listSymbolMarket, setlistSymbolMarket] = useState([]);

    const compareFilterListDefault = [
        "=",
        "+",
        "-",
        "=%",
        "+%",
        "-%",
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
            name: "Elastic",
            value: "Elastic",
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
            name: "Amount Auto",
            value: "AmountAutoPercent",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Amount Exp",
            value: "AmountExpire",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Limit",
            value: "Limit",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Numbs",
            value: "Numbs",
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
                value: ""
            },
            name: "Turnover",
            value: "Turnover",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Max Turnover",
            value: "MaxTurnover",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "xOC Pump",
            value: "XOCPump",
            compareFilterList: ["="],
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
                value: false
            },
            name: "Adaptive",
            value: "Adaptive",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Reverse",
            value: "Reverse",
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
            name: "Beta",
            value: "IsBeta",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Alpha",
            value: "Alpha",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "4B",
            value: "FourB",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: false
            },
            name: "Raceme",
            value: "Raceme",
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

    // const [botListData, setBotListData] = useState([]);
    const [botLisSelected, setBotLisSelected] = useState([]);
    const [botListInputVIP, setBotListInputVIP] = useState([]);

    const [filterDataRowList, setFilterDataRowList] = useState([fieldFilterList[0]]);
    const [radioValue, setRadioValue] = useState("Update");
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [roleNameMainVIP, setRoleNameMainVIP] = useState("");
    const [onlyPairsSelected, setOnlyPairsSelected] = useState([])
    const [blackListSelected, setBlackListSelected] = useState([])
    const [dialogOnlyPairs, setDialogOnlyPairs] = useState(false);
    const [dialogBlacklist, setDialogBlacklist] = useState(false);

    const handleDataCheckTreeSelected = useMemo(() => {
        return dataCheckTreeSelected.map(item => JSON.parse(item))
    }, [dataCheckTreeSelected])

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
            const res = await getAllBotActive("OKX_V1")
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

    const handleFiledValueElement = (item, indexRow) => {
        switch (item.name) {
            case "Active":
            case "Adaptive":
            case "Reverse":
            case "Beta":
            case "4B":
            case "Raceme":
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
            case "OnlyPairs":

                return (
                    <>
                        <Button
                            size="small"
                            variant='contained'
                            color='inherit'
                            onClick={() => {
                                setDialogOnlyPairs(true)
                                handleGetListSymbolMarket()
                                // setOnlyPairsSelected([])
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
                                onlyPairsSelected.length && setDialogOnlyPairs(false)
                            }}
                            hideCloseBtn
                        >
                            <FormControl className={styles.formControl}>

                                <FormLabel className={styles.label}>Only pairs</FormLabel>
                                {
                                    <Autocomplete
                                        multiple
                                        limitTags={2}
                                        value={onlyPairsSelected}
                                        disableCloseOnSelect
                                        options={listSymbolMarket}
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
                                                                setOnlyPairsSelected(listSymbolMarket)
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
                                                    {option.name.split("-")[0]}
                                                </li>
                                            </>
                                        )}
                                        renderTags={(value) => {
                                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                                        }}
                                    >
                                    </Autocomplete>
                                }
                                {onlyPairsSelected.length == 0 && <p className="formControlErrorLabel">Required.</p>}

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
                                handleGetListSymbolMarket()
                                // setBlackListSelected([])
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
                            onSubmit={() => {
                                blackListSelected.length && setDialogBlacklist(false)
                            }}
                            hideCloseBtn
                        >
                            <FormControl className={styles.formControl}>

                                <FormLabel className={styles.label}>Blacklist</FormLabel>
                                {
                                    <Autocomplete
                                        multiple
                                        limitTags={2}
                                        value={blackListSelected}
                                        isOptionEqualToValue={(option, value) => option.value === value.value}
                                        disableCloseOnSelect
                                        options={listSymbolMarket}
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
                                                                setBlackListSelected(listSymbolMarket)
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
                                                    {option.name.split("-")[0]}
                                                </li>
                                            </>
                                        )}
                                        renderTags={(value) => {
                                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                                        }}
                                    >
                                    </Autocomplete>
                                }
                                {blackListSelected.length == 0 && <p className="formControlErrorLabel">Required.</p>}

                            </FormControl>
                        </DialogCustom >
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
                        if (typeof (valueHandle) === "number" && !["Expire", "Turnover","MaxTurnover", "Alpha","Elastic","AmountExpire", "Blacklist", "OnlyPairs"].includes(filedValue)) {
                            valueHandle = parseFloat(valueHandle.toFixed(4))
                            if (valueHandle < 0.01) {
                                checkValueMin = false
                            }
                        }
                        else if (filedValue === "OnlyPairs") {
                            let newOnlyPairs = []
                            const newData = onlyPairsSelected.map(item => item.value)
                            switch (filterRow.data.compare) {
                                case "=": {
                                    newOnlyPairs = newData
                                    break;
                                }
                                case "+": {
                                    newOnlyPairs = [...new Set(dataCheckTreeItem.OnlyPairs.concat(newData))]
                                }
                            }
                            return {
                                OnlyPairs: newOnlyPairs,
                            }
                        }
                        else if (filedValue === "Blacklist") {
                            let newOnlyPairs = []
                            const newData = blackListSelected.map(item => item.value)
                            switch (filterRow.data.compare) {
                                case "=": {
                                    newOnlyPairs = newData
                                    break;
                                }
                                case "+": {
                                    newOnlyPairs = [...new Set(dataCheckTreeItem.Blacklist.concat(newData))]
                                }
                            }
                            return {
                                Blacklist: newOnlyPairs,
                            }
                        }
                        return {
                            [filedValue]: valueHandle
                        }
                    }).reduce((accumulator, currentObject) => {
                        const { parentID, ...oldData } = dataCheckTreeItem
                        return { ...oldData, ...accumulator, ...currentObject };
                    }, {})

                }
            ))

            if (checkValueMin) {
                setLoadingSubmit(true)

                const res = await updateStrategiesMultipleScanner(newData)

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
    }

    const handleDelete = async () => {

        setLoadingSubmit(true)

        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => ({
                id: dataCheckTreeItem._id,
                Market: dataCheckTreeItem.Market
            }))

            const res = await deleteStrategiesMultipleScanner(newData)

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
                let res
                if (copyType === "Symbol") {
                    res = await copyMultipleStrategiesToSymbolSpot({
                        symbolListData: handleDataCheckTreeSelected,
                        symbolList: symbolListSelected.map(item => item.value)
                    })
                }
                else {
                    res = await copyMultipleStrategiesToBotScanner({
                        symbolListData: handleDataCheckTreeSelected,
                        symbolList: botLisSelected.map(item => item.value)
                    })
                }
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

    const handleOnALL = async () => {
        setLoadingSubmit(true)
        let dataChange = false

        try {
            const newData = handleDataCheckTreeSelected.map((dataCheckTreeItem) => (
                {
                    id: dataCheckTreeItem._id,
                    parentID: dataCheckTreeItem.parentID,
                    UpdatedFields: {
                        ...dataCheckTreeItem,
                        IsActive: true
                    }

                }
            ))

            const res = await updateStrategiesMultipleScanner(newData)

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

            const res = await updateStrategiesMultipleScanner(newData)

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
                handleOnALL()
                break
            case "OFF":
                handleOffALL()
                break

        }
    }

    const handleChangeRatio = (e) => {
        setRadioValue(e.target.value)

    }


    const handleGetSymbolList = async () => {
        try {
            const res = await getAllSymbolSpot()
            const { status, message, data: symbolListDataRes } = res.data

            if (status === 200) {
                const newSymbolList = symbolListDataRes.map(item => ({ name: item, value: item }))
                // const newSymbolList = symbolListDataRes.map(item => ({ name: item.split("-")[0], value: item }))

                setSymbolListData(newSymbolList)
            }
            else {
                dispatch(addMessageToast({
                    status,
                    message
                }))
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Symbol Error",
            }))
        }
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
                                    {option.name.split("-")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >
                    </Autocomplete>
                    {!symbolListSelected.length && <p className="formControlErrorLabel">The {copyType} Required.</p>}
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
                    {!botLisSelected.length && <p className="formControlErrorLabel">The {copyType} Required.</p>}
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
                    {!botLisSelected.length && <p className="formControlErrorLabel">The {copyType} Required.</p>}
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

    const handleGetListSymbolMarket = async () => {

        switch (market) {
            case "Spot": {
                const response = await getAllInstrumentOKXV1()
                const { data: res } = response.data
                setlistSymbolMarket(res.filter(item => item.market == "Spot").map(item => ({ name: item.symbol, value: item.symbol })))
                break
            }
            case "Margin": {
                const response = await getAllInstrumentOKXV1()
                const { data: res } = response.data
                setlistSymbolMarket(res.filter(item => item.market == "Margin").map(item => ({ name: item.symbol, value: item.symbol })))
                break
            }
            case "Futures": {
                const response = await getAllInstrumentOKXV1Futures()
                const { data: res } = response.data
                setlistSymbolMarket(res.map(item => ({ name: item.symbol, value: item.symbol })))
                break
            }
        }
    }

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
                border: "1px solid #d5d5d5"
            }}>
                <RadioGroup
                    defaultValue={radioValue}
                    onChange={handleChangeRatio}
                    style={{
                        display: "flex",
                        flexWrap: "nowrap",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        margin: "0 -6px"
                    }}
                >
                    <div  >
                        <FormControlLabel value="Update" control={<Radio />} label="Update" />
                        <FormControlLabel value="Delete" control={<Radio />} label="Delete" />
                        <FormControlLabel value="Copy" control={<Radio />} label="Copy To" />
                    </div>
                    <div >
                        <FormControlLabel value="ON" control={<Radio />} label="ON" />
                        <FormControlLabel value="OFF" control={<Radio />} label="OFF" />
                    </div>
                    {/* <FormControlLabel value="Export" control={<Radio />} label="Export" /> */}
                </RadioGroup>
            </div>

            {
                handleElementWhenChangeRatio()
            }

        </DialogCustom>);
}

export default EditMulTreeItem;