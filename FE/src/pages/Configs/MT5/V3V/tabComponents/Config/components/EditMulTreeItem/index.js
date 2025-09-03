import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Button, Checkbox, FormControl, FormControlLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux';
import { verifyTokenVIP } from '../../../../../../../../services/authService';
import { getAllBotActive } from '../../../../../../../../services/botService';
import { copyMultipleStrategiesToSymbol, copyMultipleStrategiesToBot } from '../../../../../../../../services/Configs/ByBIt/V3/configService';
import { getUserByID } from '../../../../../../../../services/userService';
import { setStrategiesHistoryData } from '../../../../../../../../store/slices/StrategiesHistory';
import DialogCustom from '../../../../../../../../components/DialogCustom';
import { addMessageToast } from '../../../../../../../../store/slices/Toast';
import { getAllCoin } from '../../../../../../../../services/Coins/ByBit/coinFuturesService';

function EditMulTreeItem({
    onClose,
    botListInput,
    dataCheckTreeSelected,
    dataCheckTreeDefaultRef
}) {

    const userData = useSelector(state => state.userDataSlice.userData)

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
            name: "Amount",
            value: "Amount",
            compareFilterList: compareFilterListDefault,
        },
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
            name: "Extended",
            value: "ExtendedOCPercent",
            compareFilterList: compareFilterListDefault,

        },

        {
            data: {
                compare: "=",
                value: ""
            },
            name: "TP",
            value: "TakeProfit",
            compareFilterList: compareFilterListDefault,

        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Reduce",
            value: "ReduceTakeProfit",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Ignore",
            value: "Ignore",
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
            name: "EntryTrailing",
            value: "EntryTrailing",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Max OC (%)",
            value: "StopLose",
            compareFilterList: compareFilterListDefault,
        },
    ]

    const dispatch = useDispatch()



    const [copyType, setCopyType] = useState("Symbol");
    const [symbolListData, setSymbolListData] = useState([]);
    const [symbolListSelected, setSymbolListSelected] = useState([]);

    // const [botListData, setBotListData] = useState([]);
    const [botLisSelected, setBotLisSelected] = useState([]);
    const [botListInputVIP, setBotListInputVIP] = useState([]);

    const [filterDataRowList, setFilterDataRowList] = useState([fieldFilterList[1]]);
    const [radioValue, setRadioValue] = useState("Copy");
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [roleNameMainVIP, setRoleNameMainVIP] = useState("");

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
            setRoleNameMainVIP(resUserData.roleName === "SuperAdmin" || resUserData.roleName === "Admin")
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
            fieldFilterList[0]
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
                return <Checkbox
                    checked={item.data.value}
                    onChange={(e) => {
                        handleChangeValue(e.target.checked, indexRow)
                    }}
                />
            default:
                return <TextField
                    type='number'
                    value={item.data.value}
                    onChange={(e) => { handleChangeValue(e.target.value, indexRow) }}
                    size="small"
                    style={{
                        width: "100%"
                    }}
                >
                </TextField>
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





    const handleCopy = async () => {

        if (symbolListSelected.length > 0 || botLisSelected.length > 0) {
            let dataChange = false
            setLoadingSubmit(true)
            dataCheckTreeDefaultRef.current.length > 0 && dispatch(setStrategiesHistoryData(dataCheckTreeDefaultRef.current))

            try {
                let res
                if (copyType === "Symbol") {
                    res = await copyMultipleStrategiesToSymbol({
                        symbolListData: handleDataCheckTreeSelected,
                        symbolList: symbolListSelected.map(item => item.value)
                    })
                }
                else {
                    res = await copyMultipleStrategiesToBot({
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

    const handleEdit = () => {
        switch (radioValue) {
            case "Copy":
                handleCopy()
                break
        }
    }

    const handleChangeRatio = (e) => {
        setRadioValue(e.target.value)

    }


    const handleGetSymbolList = async () => {
        try {
            const res = await getAllCoin()
            const { status, message, data: symbolListDataRes } = res.data

            if (status === 200) {
                const newSymbolList = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))
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
            case "Copy":
                return (
                    <div>
                        <FormControl style={{ marginBottom: "6px" }} >
                            <RadioGroup
                                onChange={handleChangeRatioCopy}
                                style={{
                                    display: "flex",
                                    flexDirection: "row"
                                }}
                            >
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
            handleGetSymbolList()
            handleVerifyLogin()
            handleGetAllBot()
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
                        <FormControlLabel value="Copy" control={<Radio />} label="Copy To" />
                    </div>
                    <div >
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