import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { Button, MenuItem, Select } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useState, memo, useEffect, useRef } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import AddBot from "./components/AddBot";
import styles from "./Bot.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
import { offAllByBitV3 } from '../../services/Configs/ByBIt/V3/configService';
import { getAllBotType } from '../../services/botTypeService';
import { closeAllBotForUpCodeByServerIP, deleteServer, getAllServer, restartByServerIP } from '../../services/serversService';
import EditServer from './components/EditServer';
import BotListDetail from './components/MemberDetail';

function Servers() {


    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 30,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'Action',
            type: "actions",
            maxWidth: 120,
            headerName: 'Action',
            renderCell: params => {
                const rowData = params.row;
                return (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginLeft: "-10px "
                    }}>
                        <EditIcon
                            className={styles.icon}
                            style={{ marginLeft: "3px" }}
                            onClick={async () => {
                                setOpenEditBot({
                                    dataChange: "",
                                    isOpen: true,
                                    data: rowData
                                })
                            }}
                        />

                        <DeleteOutlineIcon
                            className={styles.icon}
                            style={{ marginLeft: "3px" }}
                            onClick={async () => {
                                setOpenDeleteBot({
                                    id: rowData["_id"],
                                    dataChange: ""
                                })
                            }}
                        />
                    </div>
                )

            },
        },

        {
            field: 'botType',
            headerName: 'Type',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'name',
            headerName: 'Name',
            minWidth: 250,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'IP',
            headerName: 'IP',
            minWidth: 180,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'botList',
            headerName: 'List',
            minWidth: 130,
            maxWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (e) => {
                const botList = e.value
                return (
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <p style={{
                            marginRight: "12px"
                        }}>{botList?.length}</p>
                        {
                            botList?.length > 0 && (
                                <RemoveRedEyeIcon
                                    className={styles.icon}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        setOpenViewBotList({
                                            ...openViewBotList,
                                            data:e.row,
                                            open:true
                                        });
                                    }}
                                />
                            )
                        }
                    </div>
                )
            },
        },
        {
            field: 'limit',
            headerName: 'Limit',
            minWidth: 130,
            maxWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OFF',
            headerName: 'Off',
            type: "actions",
            minWidth: 130,
            maxWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const rowData = params.row;
                const serverIP = rowData["IP"]
                return (
                    <Button
                        size='small'
                        color='error'
                        variant='contained'
                        onClick={() => {
                            setOpenOffAll(serverIP)
                        }}
                    >
                        Off
                    </Button >
                )

            }
        },
        {
            field: 'Restart',
            headerName: 'Restart',
            type: "actions",
            minWidth: 130,
            maxWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const rowData = params.row;
                const serverIP = rowData["IP"]
                return (
                    <Button
                        size='small'
                        color='success'
                        variant='contained'
                        onClick={() => {
                            setOpenRestartAll(serverIP)
                        }}
                    >
                        Restart
                    </Button >
                )

            }
        }
    ]



    const [openViewBotList, setOpenViewBotList] = useState({
        open: false,
        data: {},
        dataChange:false
    });
    const [botList, setBotList] = useState([]);
    const [botTypeList, setBotTypeList] = useState([]);
    const [openAddBot, setOpenAddBot] = useState({
        isOpen: false,
        dataChange: "",
    });
    const [openDeleteBot, setOpenDeleteBot] = useState({
        id: "",
        dataChange: ""
    });
    const [openEditBot, setOpenEditBot] = useState({
        isOpen: false,
        dataChange: "",
        data: ""
    });
    const [openOffAll, setOpenOffAll] = useState("");
    const [openRestartAll, setOpenRestartAll] = useState("");
    const [openRestartAllByBotType, setOpenRestartAllByBotType] = useState("");
    const [openOffAllByBotType, setOpenOffAllByBotType] = useState("");

    const checkMyBotRef = useRef(true)
    const checkBotTypeRef = useRef("All")
    const botListDefaultRef = useRef([])

    const dispatch = useDispatch()

    const handleCloseOffAll = async (serverIP) => {

        const res = await closeAllBotForUpCodeByServerIP(serverIP)
        const { message } = res?.data

        dispatch(addMessageToast({
            status: 200,
            message,
        }))
        setOpenOffAll("")
        setOpenOffAllByBotType("")
    }
    const handleRestartAll = async (serverIP) => {

        const res = await restartByServerIP(serverIP)
        const { message } = res?.data

        dispatch(addMessageToast({
            status: 200,
            message,
        }))
        setOpenRestartAll("")
        setOpenRestartAllByBotType("")
    }

    const handleFilterAll = () => {
        checkMyBotRef.current = false
        const newBotList = botListDefaultRef.current.filter(item => {
            const checkBotType = checkBotTypeRef.current !== "All" ? checkBotTypeRef.current === item.botType : true
            return checkBotType
        })
        setBotList(newBotList)
    }



    const handleGetAllBot = async () => {
        try {
            const res = await getAllServer()
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        id: item?._id,
                    }
                ))
                botListDefaultRef.current = newData
                setBotList(newData)
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
                message: "Get All Server Error",
            }))
        }
    }

    const handleDeleteServer = async () => {
        try {
            const res = await deleteServer(openDeleteBot.id)
            const { status, message, data: resData } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            setOpenDeleteBot({
                id: "",
                dataChange: status == 200 ? true : ""
            })
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Server Error",
            }))
        }

    }

    const handleGetAllBotType = async () => {
        try {
            const res = await getAllBotType()
            const { data } = res.data

            setBotTypeList(["All", ...data.map(item => item.name)])
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Bot Error",
            }))
        }
    }

    useEffect(() => {
        handleGetAllBot()
        handleGetAllBotType()
    }, []);

    useEffect(() => {

        const newData = openAddBot.dataChange || openEditBot.dataChange || openDeleteBot.dataChange || openViewBotList.dataChange
        if (newData) {
            handleGetAllBot()
            setOpenAddBot({
                dataChange: "",
                isOpen: false
            })
            setOpenEditBot({
                dataChange: "",
                isOpen: false
            })
            setOpenDeleteBot({
                id: "",
                dataChange: ""
            })
            setOpenViewBotList({
                open: false,
                data: {},
                dataChange: false
            })
            checkBotTypeRef.current = "All"

        }
    }, [openAddBot, openEditBot, openDeleteBot,openViewBotList.dataChange]);

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
                <div>
                    {
                        checkBotTypeRef.current != "All" && <Button
                            size="small"
                            variant="contained"
                            color='error'
                            onClick={() => {
                                setOpenOffAllByBotType(checkBotTypeRef.current)
                            }}
                            style={{ marginRight: "12px" }}
                        >
                            Off-All
                        </Button>
                    }
                    {
                        checkBotTypeRef.current != "All" && <Button
                            size="small"
                            variant="contained"
                            color='success'
                            onClick={() => {
                                setOpenRestartAllByBotType(checkBotTypeRef.current)
                            }}
                            style={{ marginRight: "12px" }}
                        >
                            Re-All
                        </Button>
                    }
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                            setOpenAddBot(openAddBot => ({ ...openAddBot, isOpen: true }))
                        }}
                    >
                        <AddIcon />
                    </Button>
                </div>
            </div>
            <div className={styles.botTableContainer}>

                <div className={styles.botTableContainerData}>
                    <DataGridCustom
                        tableRows={botList}
                        tableColumns={tableColumns}
                        checkboxSelection={false}
                    />
                </div>
            </div>

            {openAddBot.isOpen && <AddBot
                onClose={(data) => {
                    setOpenAddBot(data)
                }}
                botTypeList={botTypeList.slice(1)}
            />}
            {openEditBot.isOpen && <EditServer
                onClose={(data) => {
                    setOpenEditBot(data)
                }}
                botTypeList={botTypeList.slice(1)}
                dataInput={openEditBot.data}
            />}

            {
                openDeleteBot.id && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenDeleteBot({
                                id: "",
                                dataChange: ""
                            })
                        }}
                        onSubmit={handleDeleteServer}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to delete?</p>
                    </DialogCustom >
                )
            }
            

            {
                openOffAll && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenOffAll("")
                        }}
                        onSubmit={() => handleCloseOffAll(openOffAll)}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Off"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to off serverIP {openOffAll}?</p>
                    </DialogCustom >
                )
            }
            {
                openRestartAll && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenRestartAll("")
                        }}
                        onSubmit={() => handleRestartAll(openRestartAll)}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="success"
                        submitBtnText="Restart"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to restart serverIP {openRestartAll}?</p>
                    </DialogCustom >
                )
            }
            {
                openOffAllByBotType && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenOffAllByBotType("")
                        }}
                        onSubmit={() => handleCloseOffAll(openOffAllByBotType)}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Off"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to off serverIP {openRestartAllByBotType}?</p>
                    </DialogCustom >
                )
            }
            {
                openRestartAllByBotType && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenRestartAllByBotType("")
                        }}
                        onSubmit={() => handleRestartAll(openRestartAllByBotType)}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="success"
                        submitBtnText="Restart"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to restart serverIP {openRestartAllByBotType}?</p>
                    </DialogCustom >
                )
            }

            {
                openViewBotList.open && (
                    <BotListDetail
                        onClose={(data) => {
                            setOpenViewBotList(data)
                        }}
                        userListSelected={openViewBotList.data}
                    />
                )
            }
        </div >


    );
}

export default memo(Servers);