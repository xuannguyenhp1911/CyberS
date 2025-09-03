import { FormControl, FormLabel, Select, MenuItem, Button } from "@mui/material";
import styles from './Position.module.scss'
import { useEffect, useRef, useState } from "react";
import { getAllBotOnlyApiKey, getAllBotOnlyApiKeyByUserID } from "../../../services/botService";
import DataGridCustom from "../../../components/DataGridCustom";
import { addMessageToast } from "../../../store/slices/Toast";
import { useDispatch, useSelector } from "react-redux";

import DialogCustom from "../../../components/DialogCustom";
import CancelOrderOKXV1 from "./components/CancelOrder";
import { LoadingButton } from "@mui/lab";
import { getAllOrderBinance, cancelOrderAllBinance } from "../../../services/Orders/Binance/orderService";

function OrdersBinance() {

    const [loading, setLoading] = useState(false);
    const userData = useSelector(state => state.userDataSlice.userData)
    const [confirmCloseAllPosition, setConfirmCloseAllPosition] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [loadingRefresh, setLoadingRefresh] = useState(true);

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'symbol',
            headerName: 'Symbol',
            minWidth: 150,
            // flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => {
                let instTypeIcon

                switch (params.row["market"]) {
                    case "1": {
                        instTypeIcon = "🍁"
                        break
                    }
                    case "0": {
                        instTypeIcon = "🍀"
                        break
                    }
                    default: {
                        instTypeIcon = "🌻"
                        break
                    }
                }
                return <p>{params.value.split("USDT")[0]}</p>
            }
        },
        {
            field: 'botName',
            headerName: 'Bot',
            minWidth: 150,
            // flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'side',
            headerName: 'Side',
            minWidth: 100,
            maxWidth: 100,
            // flex: window.innerWidth <= 740 ? undefined : 1,
            type: "actions",
            renderCell: (params) => {
                const value = params.value
                return <p style={{
                    color: value === "Buy" ? "green" : "var(--redColor)"
                }}>{value}</p>
            }
        },
        {
            field: 'priceOrder',
            headerName: 'Price',
            minWidth: 150,
        },
        {
            field: 'state',
            headerName: 'Status',
            minWidth: window.innerWidth <= 740 ? 120 : 120,
            renderCell: (params) => {
                let color = "#008ef6"
                let value = "Open"
                if (params.row["reduceOnly"]) {
                    color = "#FF8B00"
                    value = "Close"
                }
                switch (params.value) {
                    case "PARTIALLY_FILLED": {
                        color = "#6018ad"
                        value = "Part_Filled"
                        break
                    }
                }
                return <p style={{
                    color
                }}>{value}</p>
            }
        },
        {
            field: 'Time',
            headerName: 'Time',
            minWidth: 200,
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
                        {rowData["Symbol"] != "USDT" && <Button
                            variant="contained"
                            size="small"
                            color="error"
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
                            Cancel
                        </Button>}
                    </div>
                )

            },

        },

    ]

    const [botSelected, setBotSelected] = useState("All");
    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);
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

    const handleGetAllBotByUserID = async () => {
        try {
            const res = await getAllBotOnlyApiKeyByUserID(userData._id, "Binance_V3")

        const dataAll = res.data.data;

        const newData = dataAll?.map(item => {
            const botID = item?._id
            const newData = {
                name: item?.botName,
                value: botID,
                ApiKey: item?.ApiKey,
                SecretKey: item?.SecretKey,
                Demo: item?.Demo,
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
        handleGetAllOrder(newMain)
        } catch (error) {
            
        }
    }

    const handleGetAllBotAndPosition = async () => {

        const res = await getAllBotOnlyApiKey("Binance_V3")
        const dataAll = res.data.data
        
        const newData = dataAll?.map(item => {
            const botID = item?._id
            const newData = {
                name: item?.botName,
                value: botID,
                ApiKey: item?.ApiKey,
                SecretKey: item?.SecretKey,
                Demo: item?.Demo,
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
        handleGetAllOrder(newMain)
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

    const handleGetAllOrder = async (botListInput = botList, alert = true) => {
        setLoadingRefresh(true)
        try {
            const res = await getAllOrderBinance(botListInput.slice(1))
            const { status, message, data: resData } = res.data
            
            if (status === 200) {
                const data = resData.length > 0 ? resData?.map(item => (
                    {
                        ...item,
                        botID: item.botData.value,
                        botName: item.botData?.name,
                        Time: new Date(+item.cTime).toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }),
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
            handleGetAllOrder(undefined, false)
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

                    </div>

                    <div className={styles.refreshBtn}>
                        {botList.length > 0 &&
                            <LoadingButton
                                variant="contained"
                                size="small"
                                loading={loadingRefresh}
                                color="info"
                                onClick={() => {
                                    handleGetAllOrder()
                                }}
                                sx={{
                                    ".MuiLoadingButton-label": {

                                        fontSize: "14px !important",
                                    }
                                }}

                            >
                                Refresh
                            </LoadingButton>
                        }
                        {positionData.length > 0 &&
                            // {true &&
                            <LoadingButton
                                loading={loadingRefresh}
                                variant="contained"
                                size="small"
                                color="error"
                                style={{ marginLeft: "12px" }}
                                sx={{
                                    ".MuiLoadingButton-label": {
                                        fontSize: "14px !important",
                                    }
                                }}
                                onClick={() => {
                                    setConfirmCloseAllPosition({
                                        isOpen: true,
                                        dataChange: false
                                    })
                                }}
                            >
                                Cancel All
                            </LoadingButton>}

                    </div>

                </div>

                <div className={styles.positionTable}>

                    <DataGridCustom
                        tableRows={positionData}
                        tableColumns={tableColumns}
                        checkboxSelection={false}
                    />
                </div>
            </div>

            {
                openAddMarket.isOpen && positionData.find(item => item.id == openAddMarket.data?.id) && (
                    <CancelOrderOKXV1
                        onClose={(data) => {
                            setOpenAddMarket({
                                ...openAddMarket,
                                ...data
                            })
                        }}
                        positionData={openAddMarket.data}
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

                            try {
                                const res = await cancelOrderAllBinance(positionData)
                                const { message,status } = res.data

                                dispatch(addMessageToast({
                                    status,
                                    message,
                                }))
                            } catch (error) {
                                dispatch(addMessageToast({
                                    status: 500,
                                    message: "Cancel All Error",
                                }))
                            }
                            setConfirmCloseAllPosition({
                                dataChange: true,
                                isOpen: false
                            })
                            setLoading(false)
                        }}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Cancel"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to cancel all orders of bots?</p>
                    </DialogCustom >
                )
            }
        </div >


    );
}

export default OrdersBinance;