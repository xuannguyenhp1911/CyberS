import BookmarkIcon from '@mui/icons-material/Bookmark';
import HistoryIcon from '@mui/icons-material/History';
import { NumericFormat } from 'react-number-format';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useEffect, useState } from "react";
import { Select, MenuItem, Checkbox, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import DialogCustom from '../../../../../../../../components/DialogCustom';
import { handleCheckAllCheckBox } from '../../../../../../../../functions';
import { addMessageToast } from '../../../../../../../../store/slices/Toast';
import { useDispatch } from 'react-redux';

function FilterDialog({
    onClose,
    filterQuantityRef,
    dataCheckTreeDefaultRef,
    setDataCheckTree,
    resetAfterSuccess,
    botListInput
}) {
    const dispatch = useDispatch()

    const compareFilterListDefault = [
        "=",
        ">",
        "<",
        ">=",
        "<=",
    ]

    const candlestickValueList = [
        {
            name: "1m",
            value: "1m"
        },
        {
            name: "3m",
            value: "3m"
        },
        {
            name: "5m",
            value: "5m"
        },
        {
            name: "15m",
            value: "15m"
        },

    ]

    const positionValueList = [
        {
            name: "Long",
            value: "Long"
        },
        {
            name: "Short",
            value: "Short"
        }
    ]
    const fieldFilterList = [
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Vol24h",
            value: "volume24h",
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
            name: "Amount",
            value: "Amount",
            compareFilterList: compareFilterListDefault,
        },
        
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Extend",
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
                value: "Long"
            },
            name: "Position",
            value: "PositionSide",
            compareFilterList: ["="],
        },
        {
            data: {
                compare: "=",
                value: "1m"
            },
            name: "Candle",
            value: "Candlestick",
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
                value: ""
            },
            name: "Entry",
            value: "EntryTrailing",
            compareFilterList: compareFilterListDefault,
        },
        {
            data: {
                compare: "=",
                value: ""
            },
            name: "Max OC",
            value: "StopLose",
            compareFilterList: compareFilterListDefault,
        },
   
        {
            data: {
                compare: "=",
                value: botListInput[0]?.name
            },
            name: "Bot",
            value: "Bot",
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
            name: "Scan",
            value: "scannerID",
            compareFilterList: ["="],
        },
    ]

    const [filterDataRowList, setFilterDataRowList] = useState([]);

    const addFilterRow = () => {
        setFilterDataRowList(filterRowList => [
            ...filterRowList,
            fieldFilterList[1]
        ])
    }

    const deleteFilterRow = (indexRow) => {
        setFilterDataRowList(filterRowList => filterRowList.filter((value, index) => index !== indexRow))
    }

    const checkFloatString = value => {
        return !isNaN(parseFloat(value)) && isFinite(value);
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

    const handleCompare = (value1, compareValue, value2, filterValue) => {

        if (filterValue !== "PositionSide" &&
            filterValue !== "Candlestick" &&
            filterValue !== "IsActive" &&
            filterValue !== "IsBeta" &&
            filterValue !== "scannerID" &&
            filterValue !== "Bot"
        ) {
            value1 = +value1
            value2 = +value2
        }

        if (filterValue == "volume24h") {
            value2 = value2 * 10 ** 6
        }
        
        // if (checkFloatString(value1)) {
        //     value1 = +value1
        // }
        // if (checkFloatString(value2)) {
        //     value2 = +value2
        // }

        switch (compareValue) {
            case "=":
                return value1 == value2

            case ">":
                return value1 > value2

            case "<":
                return value1 < value2

            case ">=":
                return value1 >= value2

            case "<=":
                return value1 <= value2
            default:
                return false

        }
    }

    const handleFiledValueElement = (item, indexRow) => {
        switch (item.value) {
            case "PositionSide":
                return <Select

                    value={item.data.value}
                    defaultValue=""
                    size="small"
                    style={{
                        width: "100%"
                    }}
                >
                    {
                        positionValueList.map(item => (
                            <MenuItem value={item.value} key={item.value}
                                onClick={() => { handleChangeValue(item.value, indexRow) }}
                            >{item.name}</MenuItem>
                        ))
                    }
                </Select>
            case "Candlestick":
                return <Select
                    value={item.data.value}
                    defaultValue=""
                    size="small"
                    style={{
                        width: "100%"
                    }}
                >
                    {
                        candlestickValueList.map(item => (
                            <MenuItem value={item.value} key={item.value}
                                onClick={() => { handleChangeValue(item.value, indexRow) }}

                            >{item.name}</MenuItem>
                        ))
                    }
                </Select>
            case "IsActive":
            case "IsBeta":
            case "scannerID":
                return <Checkbox
                    checked={item.data.value}
                    onChange={(e) => { handleChangeValue(e.target.checked, indexRow) }}
                />
            case "Bot":
                return <Select
                    value={item.data.value}
                    size="small"
                    style={{
                        width: "100%"
                    }}
                    onChange={(e) => { handleChangeValue(e.target.value, indexRow) }}
                >
                    {
                        botListInput.map(item => (
                            <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                        ))
                    }
                </Select>
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

    const handleFilterExpression = (compareItem) => {
        return {
            ...compareItem,
            children: compareItem.children.filter((item, index) => {
                // if (index !== 0) {
                //     return filterDataRowList.every(filterRow => handleCompare(item[filterRow.value], filterRow.data.compare, filterRow.data.value))
                // }
                // return true
                return filterDataRowList.every(filterRow => {
                    const filterRowValue = filterRow.value

                    if (filterRowValue == "Bot") {
                        return handleCompare(item.botID._id, filterRow.data.compare, filterRow.data.value, filterRowValue)
                    }
                    else if (filterRowValue == "scannerID") {
                        return handleCompare(item.scannerID?._id ? true : false, filterRow.data.compare, filterRow.data.value, filterRowValue)
                    }
                    return handleCompare(item[filterRowValue], filterRow.data.compare, filterRow.data.value, filterRowValue)
                })
            }
            )
        }
    }


    const handleFilter = () => {
        resetAfterSuccess()
        
        handleCheckAllCheckBox(false)
        onClose()
        setTimeout(() => {
            filterQuantityRef.current = filterDataRowList
            setDataCheckTree(filterDataRowList.length > 0
                ? dataCheckTreeDefaultRef.current.map(dataItem => handleFilterExpression(dataItem)).filter(dataItem => dataItem.children.length > 0)
                : dataCheckTreeDefaultRef.current)
        }, 600)
    }

    useEffect(() => {
        const filterLength = filterQuantityRef.current.length
        if (filterLength > 0) {
            setFilterDataRowList(filterQuantityRef.current)
        } else {
            setFilterDataRowList([fieldFilterList[0]])
        }
    }, [filterQuantityRef]);


    return (
        <DialogCustom
            open={true}
            onClose={onClose}
            dialogTitle='Filter'
            submitBtnText='Apply'
            maxWidth='sm'
            onSubmit={handleFilter}
            hideCloseBtn
            contentTitleMore={
                <div style={{
                    verticalAlign: 'middle',
                }}>
                    {localStorage.getItem("OKX_V3_Config_Filter") && <Button
                        color='warning'
                        variant='contained'
                        size='small'
                        onClick={() => {
                            const ByBit_V3_Config_Filter_Data = localStorage.getItem("OKX_V3_Config_Filter")
                             setFilterDataRowList(JSON.parse(ByBit_V3_Config_Filter_Data) || [])
                        }}
                    >
                        <HistoryIcon />
                    </Button>}
                    <Button
                        color='info'
                        variant='contained'
                        size='small'
                        style={{
                            marginLeft: "6px"
                        }}
                        onClick={() => {
                            localStorage.setItem("OKX_V3_Config_Filter", JSON.stringify(filterDataRowList))
                            dispatch(addMessageToast({
                                status: 200,
                                message: "Save Successfully"
                            }))
                        }}
                    >
                        <BookmarkIcon />
                    </Button>
                </div>
            }
        >
            <Table

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
                                        maxWidth: "130px",
                                        width: "130px"
                                    }}
                                >
                                    <Select
                                        value={filterRow.value}
                                        size="small"
                                        style={{
                                            width: "100%"
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
                                            value={filterRow.data.compare}
                                            style={{
                                                width: "100%"
                                            }}
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

        </DialogCustom >);
}

export default FilterDialog;