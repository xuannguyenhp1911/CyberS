import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, CircularProgress, MenuItem, Select, Switch } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import { useState, memo, useEffect, useRef } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import AddBot from "./components/AddBot";
import { deleteBot, getAllBot, getAllBotByGroupCreatedByUserID, getAllBotBySameGroup, getAllBotByUserID, getTotalFutureSpot, getTotalFutureSpotByBot, setLever, setMargin, updateBot } from "../../services/botService";
import styles from "./Bot.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
import { formatNumber } from '../../functions';
import { getAllBotType } from '../../services/botTypeService';
import { LoadingButton } from '@mui/lab';
import AddServer from './components/AddServer';
import EditServer from './components/EditServer';
import { getAllGroup } from '../../services/groupService';

function Bot() {


    // const statusList = [
    //     {
    //         name: "All",
    //         value: "All"
    //     },
    //     {
    //         name: "Pending",
    //         value: "Pending"
    //     },
    //     {
    //         name: "PendingApproval",
    //         value: "PendingApproval"
    //     },
    //     {
    //         name: "Installing",
    //         value: "Installing"
    //     },
    //     {
    //         name: "Stopped",
    //         value: "Stopped"
    //     },
    //     {
    //         name: "Running",
    //         value: "Running"
    //     }
    // ]

    const userData = useSelector(state => state.userDataSlice.userData)

    const roleName = userData?.roleName

    const tableColumns = [
        // {
        //     field: 'stt',
        //     headerName: '#',
        //     maxWidth: 30,
        //     type: "actions",
        //     renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        // },
        {
            field: 'activeBot',
            type: "actions",
            maxWidth: 120,
            headerName: 'Active',
            renderCell: params => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                const botStatus = rowData['Status']
                const botApiKey = rowData['ApiKey']
                const botSecretKey = rowData['SecretKey']
                const botType = rowData['botType']
                const serverIP = rowData["serverIP"]
                return (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginLeft: "-10px "
                    }}>
                        <Switch
                            size='small'
                            disabled={!(botStatus === "Running" || botStatus === "Stopped")}
                            checked={botStatus === "Running"}
                            onClick={(e) => {
                                const check = e.target.checked
                                if (check) {
                                    handleUpdateBot({
                                        botID: rowData.id,
                                        data: {
                                            ...rowData,
                                            ApiKey: botApiKey,
                                            SecretKey: botSecretKey,
                                            serverIP,
                                            Status: "Running",
                                            type: "Active",
                                            checkBot: botApiKey,
                                            botType
                                        }
                                    })
                                }
                                else {
                                    if (botApiKey) {
                                        e.preventDefault()
                                        setConfirmActiveBot({
                                            serverIP,
                                            id: rowData.id,
                                            botType,
                                            rowData: rowData
                                        })
                                    }
                                    else {
                                        handleUpdateBot({
                                            botID: rowData.id,
                                            data: {
                                                ...rowData,
                                                ApiKey: botApiKey,
                                                SecretKey: botSecretKey,
                                                serverIP,
                                                Status: "Stopped",
                                                botType
                                            }
                                        })
                                    }
                                }
                            }}
                        />
                        <DeleteOutlineIcon
                            className={styles.icon}
                            style={{ marginLeft: "3px" }}
                            onClick={async () => {
                                setOpenDeleteBot(rowData)
                            }}
                        />
                    </div>
                )

            },

        },

        {
            field: 'botName',
            headerName: 'Name',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: e => {
                return (
                    <Link to={`${e.id}`} style={{
                        color: "var(--blueLightColor)",
                        textDecoration: "none"
                    }
                    } > {e.value}
                    </Link >
                )

            },

        },
        // {
        //     field: 'Balance',
        //     headerName: 'Balance',
        //     minWidth: 150,
        //     flex: window.innerWidth <= 740 ? undefined : 1,

        // },
        {
            field: 'botType',
            headerName: 'Type',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'userName',
            headerName: 'User Created',
            minWidth: 250,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Created',
            headerName: 'Created',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Status',
            headerName: 'Status',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        // {
        //     field: 'Server',
        //     headerName: 'Server IP',
        //     minWidth: 150,
        //     flex: window.innerWidth <= 740 ? undefined : 1,
        // },
        {
            field: 'serverName',
            headerName: 'ServerIP',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const rowData = params.row;
                const serverName = rowData["serverIP"]?.name
                return <p>{serverName}</p>
            },
        }

    ];

    roleName !== "Trader" && tableColumns.push({
        field: 'Approval',
        headerName: 'Approval',
        type: "actions",
        minWidth: 150,
        flex: window.innerWidth <= 740 ? undefined : 1,
        renderCell: params => {
            const rowData = params.row;
            const botStatus = rowData['Status']
            return (
                <>
                    {
                        botStatus !== "Pending" && (botStatus === "PendingApproval" || botStatus === "NotServer") && <Button
                            size='small'
                            color='warning'
                            variant='contained'
                            onClick={() => {
                                setOpenAddServer({
                                    data: rowData,
                                    dataChange: false
                                })
                            }}
                        >
                            Approval
                        </Button >
                    }
                    {
                        roleName == "SuperAdmin" && (
                            <Button
                                size='small'
                                color='info'
                                variant='contained'
                                onClick={() => {
                                    setOpenEditServer(rowData)
                                }}
                            >
                                + Server
                            </Button >
                        )
                    }
                </>
            )
        }

    });



    // const [statusChoose, setStatusChoose] = useState(statusList[0].value);
    const [botList, setBotList] = useState([]);
    const [groupList, setGroupList] = useState({});
    const [botTypeList, setBotTypeList] = useState([]);
    const [openAddBot, setOpenAddBot] = useState({
        isOpen: false,
        dataChange: "",
    });
    const [openDeleteBot, setOpenDeleteBot] = useState("");
    const [loadingGetMoney, setLoadingGetMoney] = useState(true);
    const [confirmActiveBot, setConfirmActiveBot] = useState(false);
    const [loadingSetMargin, setLoadingSetMargin] = useState("");
    const [totalFutureSpot, setTotalFutureSpot] = useState(0);
    const [openAddServer, setOpenAddServer] = useState({
        data: "",
        dataChange: false
    });
    const [openEditServer, setOpenEditServer] = useState("");

    const totalFutureSpotOfMeDefault = useRef(0)
    const checkMyBotRef = useRef(true)
    const checkBotTypeRef = useRef("All")
    const checkBotStatusRef = useRef("All")
    const groupChooseRef = useRef("All")
    const botListDefaultRef = useRef([])

    const dispatch = useDispatch()

    const handleFilterAll = () => {
        // checkMyBotRef.current = false
        const newBotList = botListDefaultRef.current.filter(item => {
            const checkBotType = checkBotTypeRef.current !== "All" ? checkBotTypeRef.current === item.botType : true
            const checkMyBot = checkMyBotRef.current ? item.userID?._id == userData._id : true
            const checkGroup = groupChooseRef.current !== "All" ? groupList[groupChooseRef.current]?.memberID?.includes(item?.userID?._id) : true
            return checkBotType && checkGroup && checkMyBot
        })
        setBotList(newBotList)
    }



    const setNewDateAfterSuccess = ({ data, botID }) => {

        setBotList(botList.map(bot => {
            if (botID === bot._id) {
                return {
                    ...bot,
                    ...data,
                }
            }
            return bot
        }))
        botListDefaultRef.current = botListDefaultRef.current.map(bot => {
            if (botID === bot._id) {
                return {
                    ...bot,
                    ...data,

                }
            }
            return bot
        })
    }
    const handleUpdateBot = async ({ botID, data }) => {
        try {
            const res = await updateBot({
                id: botID,
                data: {
                    ...data,
                    serverIP: data.serverIP._id
                }
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                setNewDateAfterSuccess({ data, botID })
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Bot Error",
            }))
        }
    }

    const handleGetAllBot = async () => {
        try {
            let res
            if (roleName === "SuperAdmin") {
                res = await getAllBot()
            }
            else if (roleName === "Admin") {
                res = await getAllBotByGroupCreatedByUserID()
            }
            else if (roleName === "ManagerTrader" && userData.groupID) {
                res = await getAllBotBySameGroup(userData.groupID)
            }
            else {
                res = await getAllBotByUserID(userData._id)
            }
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        id: item?._id,
                        Created: item?.Created && new Date(item?.Created).toLocaleDateString(),
                        userName: `${item.userID?.userName} ( ${item.userID?.roleName} )`,
                        OwnBot: item.userID?._id === userData._id
                    }
                ))
                botListDefaultRef.current = newData
                setBotList(newData.filter(bot => bot.userID?._id == userData?._id))
            }
            else {
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
        } catch (error) {

            dispatch(addMessageToast({
                status: 500,
                message: "Get All Bot Error",
            }))
        }
    }

    const handleDeleteBot = async () => {

        try {
            const botID = openDeleteBot._id
            const res = await deleteBot({
                botID,
                botType: openDeleteBot.botType,
                serverIP: openDeleteBot.serverIP?._id
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            if (status === 200) {
                setBotList(botList.filter(bot => botID !== bot._id))
                botListDefaultRef.current = botListDefaultRef.current.filter(bot => botID !== bot._id)
                setOpenDeleteBot("")
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Bot Error",
            }))
        }
    }

    const handleGetTotalFutureSpot = async () => {

        setLoadingGetMoney(true)
        try {
            const res = await getTotalFutureSpot(userData._id)
            const { data: resData } = res.data

            setTotalFutureSpot(resData || 0)
            totalFutureSpotOfMeDefault.current = resData || 0


        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Total Money Error",
            }))
        }
        setLoadingGetMoney(false)
    }

    const handleGetTotalFutureSpotByBot = async (botListID) => {
        setLoadingGetMoney(true)

        if (botListID.length > 0) {

            try {
                const res = await getTotalFutureSpotByBot(botListID)
                const { data: resData, status, message } = res.data

                setTotalFutureSpot(resData || 0)

                dispatch(addMessageToast({
                    status,
                    message
                }))
            }

            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Get Total Money Error",
                }))
            }
        }
        else {
            setTotalFutureSpot(totalFutureSpotOfMeDefault.current)
        }
        setLoadingGetMoney(false)
    }


    const handleGetAllBotType = async () => {
        try {
            const res = await getAllBotType()
            const { data } = res.data

            const newData = []
            data.forEach(item => {
                const type = item.name
                const newType = type.replace("_", "/")
                if (userData.roleName != "SuperAdmin") {
                    if (userData.roleList.find(item=>item.includes(newType))) {
                        newData.push(type)
                    }
                }
                else {
                    newData.push(type)
                }
            })


            setBotTypeList(["All", ...newData])
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get BotType Error",
            }))
        }
    }

    const getGroupList = async () => {
        try {
            const res = await getAllGroup()
            const { data } = res.data
            const newData = data.reduce((pre, item) => {
                const id = item._id
                pre[id] = {
                    id,
                    name: item.name,
                    memberID: item.member.map(memberItem => memberItem?.userID?._id)
                }
                return pre
            }, {})
            const newDataWithAll = {
                "All": {
                    id: "All",
                    name: "All",
                    memberID: []
                },
                ...newData
            }
            setGroupList(newDataWithAll)
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Group Error",
            }))
        }
    }

    useEffect(() => {
        if (userData.userName) {

            handleGetAllBot()
            handleGetAllBotType()
            handleGetTotalFutureSpot()
        }
    }, [userData.userName]);

    useEffect(() => {
        const newData = openAddBot.dataChange
        if (newData) {
            handleGetAllBot()
            groupChooseRef.current = "All"
            checkBotTypeRef.current = "All"
            checkMyBotRef.current = true
            setOpenAddBot({
                dataChange: "",
                isOpen: false
            })
        }
    }, [openAddBot.dataChange]);

    useEffect(() => {
        roleName == 'SuperAdmin' && getGroupList()
    }, [roleName]);


    return (
        <div className={styles.bot}>
            <AddBreadcrumbs list={["Bots"]} />
            <div className={styles.botFilterList}>
                <div className={styles.botFilterListItem}>
                    <p className={styles.label}>BotType</p>
                    <Select
                        size="small"
                        className={styles.select}
                        value={checkBotTypeRef.current}
                        onChange={e => {
                            checkBotTypeRef.current = e.target.value
                            handleFilterAll()
                        }}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                </div>
                {
                    Object.values(groupList)?.length > 0 && (
                        <div className={styles.botFilterListItem}>
                            <p className={styles.label}>Group</p>
                            <Select
                                size="small"
                                className={styles.select}
                                value={groupChooseRef.current}
                                onChange={e => {
                                    groupChooseRef.current = e.target.value
                                    handleFilterAll()
                                }}
                            >
                                {
                                    Object.values(groupList).map(item => (
                                        <MenuItem value={item.id} key={item.id}>{item.name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </div>
                    )
                }
                <div className={styles.botFilterListItem}>

                    <p className={styles.label}>My Bot</p>
                    <Switch
                        checked={checkMyBotRef.current}
                        title="My Bot"
                        onChange={e => {
                            const check = e.target.checked
                            checkMyBotRef.current = check
                            // groupChooseRef.current = "All"
                            // checkBotTypeRef.current = "All"
                            handleFilterAll()
                            // if (check) {
                            //     setBotList(botListDefaultRef.current.filter(bot => bot.userID._id == userData._id))
                            // }
                            // else {
                            //     setBotList(botListDefaultRef.current)
                            // }
                        }}
                    />
                </div>
            </div>
            <div className={styles.botTableContainer}>
                <div className={styles.botTableContainerTitle}>
                    <b style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Total: {!loadingGetMoney ? `${formatNumber(totalFutureSpot)} $` : <CircularProgress style={{
                        width: "16px",
                        height: "16px",
                        color: "#2e75db",
                        marginLeft: "6px"
                    }} color='inherit' />} </b>
                    <div>
                        {/* {dataTableChange.length > 0 && (
                            <Button
                                size="small"
                                variant="contained"
                                color="error"
                                startIcon={<DeleteOutlineIcon />}
                                style={{ marginRight: "12px" }}
                                onClick={() => {
                                    setOpenEditMultiple(dataTableChange.length)
                                }}
                            >
                                Delete
                            </Button>
                        )} */}
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setOpenAddBot(openAddBot => ({ ...openAddBot, isOpen: true }))
                            }}
                        >
                            Bot
                        </Button>
                    </div>
                </div>
                <div className={styles.botTableContainerData}>
                    <DataGridCustom
                        setDataTableChange={handleGetTotalFutureSpotByBot}
                        tableRows={botList}
                        tableColumns={tableColumns}
                    // checkboxSelection={false}
                    />
                </div>
            </div>

            {openAddBot.isOpen && <AddBot
                open={true}
                onClose={(data) => {
                    setOpenAddBot(data)
                }}
                roleName={roleName}
                botTypeList={botTypeList.slice(1)}
            />}
            {openAddServer.data && <AddServer
                onClose={(data) => {
                    setOpenAddServer(data)
                }}
                botData={openAddServer.data}
                setNewDateAfterSuccess={setNewDateAfterSuccess}
            />}
            {openEditServer && <EditServer
                onClose={() => {
                    setOpenEditServer("")
                }}
                botData={openEditServer}

            />}

            {
                openDeleteBot && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenDeleteBot("")
                        }}
                        onSubmit={handleDeleteBot}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to delete this bot?</p>
                    </DialogCustom >
                )
            }

            {
                confirmActiveBot?.id && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setConfirmActiveBot(false)
                        }}
                        onSubmit={() => {
                            handleUpdateBot({
                                botID: confirmActiveBot.id,
                                data: {
                                    ...confirmActiveBot.rowData,
                                    serverIP: confirmActiveBot.serverIP,
                                    botType: confirmActiveBot.botType,
                                    Status: "Stopped",
                                    type: "Active",
                                    checkBot: true
                                }
                            })
                            setConfirmActiveBot(false)
                        }}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="warning"
                        submitBtnText="DeActive"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Bot have api - Do you want to deactive?</p>
                    </DialogCustom >
                )
            }

        </div >

    );
}

export default memo(Bot);