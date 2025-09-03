import { FormControl, FormLabel, Select, MenuItem, Button } from "@mui/material";
import styles from './Position.module.scss'
import { useEffect, useRef, useState } from "react";
import { getAllBotOnlyApiKey, getAllBotOnlyApiKeyByUserID } from "../../../../services/botService";
import DataGridCustom from "../../../../components/DataGridCustom";
import CheckIcon from '@mui/icons-material/Check';
import { closeAllPosition } from "../../../../services/Positions/ByBIt/V3/positionService";
import { addMessageToast } from "../../../../store/slices/Toast";
import { useDispatch, useSelector } from "react-redux";

import DialogCustom from "../../../../components/DialogCustom";
import AddLimit from "./components/AddLimit";
import AddMarket from "./components/AddMarket";
import { LoadingButton } from "@mui/lab";
import { getBalanceWalletOKXV1, getPositionOKXV1 } from "../../../../services/Positions/OKX/V1/positionService";
import { formatNumberString } from "../../../../functions";

function PositionOKXV1() {

    const [loading, setLoading] = useState(false);
    const userData = useSelector(state => state.userDataSlice.userData)
    const [confirmCloseAllPosition, setConfirmCloseAllPosition] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [loadingRefresh, setLoadingRefresh] = useState(true);


    const positionTypeList = [
        {
            name: "Position",
            value: "Position"
        },
        {
            name: "Balance",
            value: "Balance"
        },
    ]

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'Symbol',
            headerName: 'Symbol',
            minWidth: 150,
            // flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => {
                let instTypeIcon 
                
                switch (params.row["instType"]) {
                    case "MARGIN": {
                        instTypeIcon = "🍁"
                        break
                    }
                    case "SPOT": {
                        instTypeIcon = "🍀"
                        break
                    }
                    case "SWAP": {
                        instTypeIcon = "🌻"
                        break
                    }
                    default:{
                        instTypeIcon = "🍁"
                        break
                    }
                }
                return <p>{params.value.split("-")[0]} {instTypeIcon}</p>
            }
        },
        {
            field: 'botName',
            headerName: 'Bot',
            minWidth: 150,
            // flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'Side',
            headerName: 'Side',
            minWidth: 100,
            maxWidth: 100,
            // flex: window.innerWidth <= 740 ? undefined : 1,
            type: "actions",
            renderCell: (params) => {
                return <p style={{
                    color: params.value === "Buy" ? "green" : "var(--redColor)"
                }}>{params.value}</p>
            }

        },
        // {
        //     field: 'instType',
        //     headerName: 'Type',
        //     minWidth: 130,
        //     maxWidth: 130,
        // flex: window.innerWidth <= 740 ? undefined : 1,
        //     renderCell: (params) => {
        //         const instType = params.value;
        //         return <p> {instType == "Spot" ? "🍀" : "🍁"} {instType}</p>
        //     }
        // },
        // {
        //     field: 'Quantity',
        //     headerName: 'Quantity',
        //     minWidth: 150,
        // flex: window.innerWidth <= 740 ? undefined : 1,
        //     renderCell: (params) => {
        //         return <p style={{
        //             color: params.value >= 0 ? "green" : "var(--redColor)"
        //         }}>{formatNumberString(params.value,10)}</p>
        //     }
        // },
        {
            field: 'usdValue',
            headerName: 'USDT',
            minWidth: window.innerWidth <= 740 ? 110 : 110,
            renderCell: (params) => {
                return <p style={{
                    // color: params.value >= 0 ? "green" : "var(--redColor)"
                }}>{formatNumberString(params.value, 2)}</p>
            }
        },
        {
            field: 'Pnl',
            headerName: 'Pnl ($)',
            minWidth: window.innerWidth <= 740 ? 130 : 110,
            renderCell: (params) => {
                const value = +params.value
                return <p style={{
                    color: value >= 0 ? "green" : "var(--redColor)"
                }}>{value.toFixed(3)}</p>
            }
        },
        {
            field: 'Actions',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 130 : 160,
            headerName: 'Active',
            renderCell: params => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                return (
                    <div >
                        {/* {
                            positionType == "Position" && <Button
                                variant="contained"
                                size="small"
                                color="inherit"
                                style={{
                                    margin: "0 6px"
                                }}
                                onClick={() => {
                                    setOpenAddLimit({
                                        isOpen: true,
                                        dataChange: "",
                                        data: rowData
                                    })
                                }}
                            >
                                Limit
                            </Button>
                        } */}
                        {rowData["Symbol"] != "USDT" && <Button
                            variant="contained"
                            size="small"
                            style={{
                                margin: "0 6px"
                            }}
                            onClick={() => {
                                setOpenAddMarket({
                                    isOpen: true,
                                    dataChange: "",
                                    data: rowData
                                })
                            }}
                        >
                            {positionType == "Position" ? "Close" : "Clear"}
                        </Button>}
                    </div>
                )

            },

        },

    ]

    const [botSelected, setBotSelected] = useState("All");
    const [positionType, setPositionType] = useState(positionTypeList[0].value);
    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);
    const [dataTableChange, setDataTableChange] = useState([]);
    const [positionData, setPositionData] = useState([]);
    const [openAddLimit, setOpenAddLimit] = useState({
        isOpen: false,
        dataChange: "",
        data: ""
    });
    const [openAddMarket, setOpenAddMarket] = useState({
        isOpen: false,
        dataChange: "",
        data: ""
    });

    const positionDataDefault = useRef([])
    const botListObject = useRef({})

    const dispatch = useDispatch()

    const handleGetAllBotByUserID = () => {

        getAllBotOnlyApiKeyByUserID(userData._id, "OKX_V1")
            .then(res => {
                const data = res.data.data;
                const newData = data?.map(item => {
                    const botID = item?._id
                    const newData = {
                        name: item?.botName,
                        value: botID,
                        ApiKey: item?.ApiKey,
                        SecretKey: item?.SecretKey,
                        Password: item?.Password,
                    }
                    botListObject.current[botID] = newData
                    return newData
                })
                const newMain = [
                    {
                        name: "All",
                        value: "All"
                    },
                    ...newData
                ]
                userData.roleName == "SuperAdmin" && newMain.unshift({
                    name: "All-VIP",
                    value: "All-VIP"
                },)
                setBotList(newMain)
                handleGetPositionOKXV1(newMain)
            })
    }

    const handleGetAllBotAndPosition = async () => {

        const res = await getAllBotOnlyApiKey("OKX_V1")

        const data = res.data.data;
        const newData = data?.map(item => {
            const botID = item?._id
            const newData = {
                name: item?.botName,
                value: botID,
                ApiKey: item?.ApiKey,
                SecretKey: item?.SecretKey,
                Password: item?.Password,
            }
            botListObject.current[botID] = newData
            return newData
        })
        const newMain = [
            {
                name: "All",
                value: "All"
            },
            ...newData
        ]

        userData.roleName == "SuperAdmin" && newMain.unshift({
            name: "All-VIP",
            value: "All-VIP"
        },)
        setBotList(newMain)
        positionType == "Position" ? handleGetPositionOKXV1(newMain) : handleGetBalanceWallet(newMain)
    }
    const handleFilterAll = ({ name, value }) => {

        const filterListDefault = [
            // {
            //     name: "botType",
            //     value: botTypeSelected
            // },
            {
                name: "botID",
                value: botSelected
            },

        ]
        const filterList = filterListDefault.map(filterItem => {
            if (filterItem.name === name) {
                return { name, value }
            }
            return filterItem
        }).filter(item => item.value !== "All")

        const listData = filterList.length > 0 ? positionDataDefault.current.filter(position => {
            return filterList.every(filterItem => position[filterItem.name] === filterItem.value)
        }) : positionDataDefault.current

        setPositionData(listData)
    }

    const handleGetPositionOKXV1 = async (botListInput = botList, alert = true) => {
        setLoadingRefresh(true)
        try {
            const res = await getPositionOKXV1(botListInput.slice(1))
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const data = resData.length > 0 ? resData?.map(item => (
                    {
                        ...item,
                        id: item._id,
                        usdValue: (+item.usdValue)
                    }
                )) : [];
                setPositionData(data)
                setBotSelected("All")
                positionDataDefault.current = data
            }

            alert && dispatch(addMessageToast({
                status,
                message,
            }))

        }
        catch (err) {

            dispatch(addMessageToast({
                status: 500,
                message: "Refresh Position Error",
            }))
        }
        setLoadingRefresh(false)
    }

    const handleGetBalanceWallet = async (botListInput = botList, alert = true) => {
        setLoadingRefresh(true)
        try {
            const res = await getBalanceWalletOKXV1(botListInput.slice(1))
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const data = resData.length > 0 ? resData?.map(item => (
                    {
                        ...item,
                        id: item._id,
                        Time: new Date(item.Time).toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }),
                        TimeUpdated: new Date(item.TimeUpdated).toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }),
                        usdValue: (+item.usdValue)
                    }
                )) : [];
                setPositionData(data)
                setBotSelected("All")
                positionDataDefault.current = data
            }

            alert && dispatch(addMessageToast({
                status,
                message,
            }))

        }
        catch (err) {

            dispatch(addMessageToast({
                status: 500,
                message: "Refresh Position Error",
            }))
        }
        setLoadingRefresh(false)
    }

    useEffect(() => {

        userData.userName && handleGetAllBotByUserID()

    }, [userData.userName]);

    useEffect(() => {
        if (openAddLimit.dataChange || openAddMarket.dataChange || confirmCloseAllPosition.dataChange) {
            positionType == "Position" ? handleGetPositionOKXV1(undefined, false) : handleGetBalanceWallet(undefined, false)
        }
    }, [openAddLimit, openAddMarket, confirmCloseAllPosition]);

    return (
        <div>

            <div className={styles.position}>

                <div className={styles.positionHeader}>

                    <div className={styles.positionHeaderFilter}>
                        <FormControl className={styles.positionHeaderFilterItem}>
                            <FormLabel className={styles.formLabel}>Bot</FormLabel>
                            <Select
                                value={botSelected}
                                size="small"
                                onChange={e => {
                                    const value = e.target.value;
                                    if (value !== "All-VIP") {
                                        setBotSelected(value);
                                        handleFilterAll({
                                            name: "botID",
                                            value
                                        })
                                    }
                                    else {
                                        handleGetAllBotAndPosition()
                                    }
                                }}
                            >
                                {
                                    botList.map(item => (
                                        <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                        <FormControl className={styles.positionHeaderFilterItem}>
                            <FormLabel className={styles.formLabel}>Type</FormLabel>
                            <Select
                                value={positionType}
                                size="small"
                                onChange={e => {
                                    const value = e.target.value;
                                    setPositionType(value);
                                    value == "Position" ? handleGetPositionOKXV1(undefined) : handleGetBalanceWallet(undefined)
                                }}
                            >
                                {
                                    positionTypeList.map(item => (
                                        <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                    </div>

                    <div className={styles.refreshBtn}>
                        {botList.length > 0 &&
                            <>
                                <LoadingButton
                                    variant="contained"
                                    size="small"
                                    loading={loadingRefresh}
                                    color="info"
                                    onClick={() => {
                                        positionType == "Position" ? handleGetPositionOKXV1() : handleGetBalanceWallet()
                                    }}
                                    sx={{
                                        ".MuiLoadingButton-label": {

                                            fontSize: "14px !important",
                                        }
                                    }}

                                >
                                    Refresh
                                </LoadingButton>
                                {/* <LoadingButton
                                    variant="contained"
                                    size="small"
                                    loading={loadingRepay}
                                    color="success"
                                    style={{ marginLeft: "12px" }}
                                    onClick={() => {
                                        handleRepayAll()
                                    }}
                                    sx={{
                                        ".MuiLoadingButton-label": {

                                            fontSize: "14px !important",
                                        }
                                    }}

                                >
                                    Repay All
                                </LoadingButton> */}
                            </>
                        }
                        {/* {positionType == "Position" && positionData.length > 0 &&
                            <Button
                                variant="contained"
                                size="small"
                                color="error"
                                style={{ marginLeft: "12px" }}
                                onClick={() => {
                                    setConfirmCloseAllPosition({
                                        isOpen: true,
                                        dataChange: false
                                    })
                                }}
                            >
                                Close All
                            </Button>} */}
                    </div>
                </div>

                <div className={styles.positionTable}>

                    <DataGridCustom
                        setDataTableChange={setDataTableChange}
                        tableRows={positionData}
                        tableColumns={tableColumns}
                        checkboxSelection={false}
                        columnVisibilityModel={
                            {
                                "Time": false,
                                "TimeUpdated": false,
                            }
                        }
                    />
                </div>
            </div>

            {
                openAddLimit.isOpen && positionData.find(item => item.id == openAddLimit.data?.id) && (
                    <AddLimit
                        onClose={(data) => {
                            setOpenAddLimit({
                                ...openAddLimit,
                                ...data
                            })
                        }}
                        positionData={openAddLimit.data}
                    />
                )
            }

            {
                openAddMarket.isOpen && positionData.find(item => item.id == openAddMarket.data?.id) && (
                    <AddMarket
                        onClose={(data) => {
                            setOpenAddMarket({
                                ...openAddMarket,
                                ...data
                            })
                        }}
                        positionData={openAddMarket.data}
                        positionType={positionType}
                    />
                )
            }

            {
                confirmCloseAllPosition.isOpen && (
                    <DialogCustom
                        loading={loading}
                        backdrop
                        open={true}
                        onClose={() => {
                            setConfirmCloseAllPosition({
                                dataChange: false,
                                isOpen: false
                            })
                        }}
                        onSubmit={async () => {
                            setLoading(true)
                            const botListID = botSelected == "All" ? botList.slice(1) : [botListObject.current[botSelected]]

                            const res = await closeAllPosition(botListID)
                            const { message } = res.data

                            dispatch(addMessageToast({
                                status: 200,
                                message,
                            }))
                            setConfirmCloseAllPosition({
                                dataChange: true,
                                isOpen: false
                            })
                            setLoading(false)
                        }}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Close All"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to close all position of bots?</p>
                    </DialogCustom >
                )
            }
        </div >


    );
}

export default PositionOKXV1;