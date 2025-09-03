import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import EditIcon from '@mui/icons-material/Edit';
import { Button, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useState, memo, useEffect, useRef } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import AddBot from "./components/AddBot";
import styles from "./Bot.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
import { getAllBotType } from '../../services/botTypeService';
import EditServer from './components/EditServer';
import { getAllIDScannerForBlack, getCoinsBlock } from '../../services/coinsBlockService';
import { updateStrategiesMultipleScanner } from '../../services/Configs/OKX/V1/scannerService';
import { updateStrategiesMultipleScannerV3 as updateStrategiesMultipleScannerV3ByBit } from '../../services/Configs/ByBIt/V3/scannerService';
import { updateStrategiesMultipleScannerV3 } from '../../services/Configs/OKX/V3/scannerService';

function CoinsBlock() {


    const tableColumns = [

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

                    </div>
                )

            },
        },

        {
            field: 'botType',
            headerName: 'Type',
            minWidth: 120,
        },
        {
            field: 'Market',
            headerName: 'Market',
            minWidth: 120,
            renderCell: params => {
                const value = params.value
                let icon 
                    switch (value) {
                        case "Margin": {
                            icon = "🍁"
                            break
                        }
                        case "Spot": {
                            icon = "🍀"
                            break
                        }
                        case "Futures": {
                            icon = "🌻"
                            break
                        }
                    }
                    return <p>{icon} {value}</p>
            }
        },
        {
            field: 'SymbolList',
            headerName: 'Symbol',
            type: "actions",
            minWidth: 110 ,
            renderCell: params => {
                const list = params.row["SymbolList"]
                return <div style={{ display: "flex", alignItems: "center", }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>
                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowOnlyPairsList({
                                show: true,
                                list
                            })
                        }}
                    />
                    }
                </div>
            }
        },
        {
            field: 'ApplyAll',
            type: "actions",
            minWidth: 130,
            headerName: 'Action',
            renderCell: params => {
                const rowData = params.row;
                return (
                    <Button
                        variant='contained'
                        size='small'
                        color='success'
                        onClick={() => {
                            setOpenOffAll(rowData)
                        }}
                    >
                        Apply All
                    </Button>
                )

            },
        },
    ]

    const [showOnlyPairsList, setShowOnlyPairsList] = useState({
        show: false,
        dataChange: false,
        configID: "",
        list: []
    })

    const [openViewBotList, setOpenViewBotList] = useState({
        open: false,
        data: {},
        dataChange: false
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
    const dataCheckExitsObject = useRef({})

    const checkMyBotRef = useRef(true)
    const checkBotTypeRef = useRef("All")
    const botListDefaultRef = useRef([])

    const dispatch = useDispatch()

    const applyAllCoinsBlacklist = async (data) => {
        try {
            const res = await getAllIDScannerForBlack(data)
            const { data: listIDData } = res?.data
            const newData = listIDData.map(item => {
                item.Blacklist = [...new Set(item.Blacklist.concat(data.SymbolList))]
                return {
                    id: item._id,
                    UpdatedFields: item
                }
            })
            let result
            switch (data.botType) {
                case "ByBit_V3": {
                    result = await updateStrategiesMultipleScannerV3ByBit(newData)
                    break
                }
                case "OKX_V1": {
                    result = await updateStrategiesMultipleScanner(newData)
                    break
                }
                case "OKX_V3": {
                    result = await updateStrategiesMultipleScannerV3(newData)
                    break
                }
            }
            if (result?.data) {
                const { message, status } = result?.data
                dispatch(addMessageToast({
                    status,
                    message
                }))
            }
            else {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Apply All Error",
                }))
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Apply All Error",
            }))
        }
        setOpenOffAll("")
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
            const res = await getCoinsBlock()
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newDataObject = {}
                const newData = resData?.map(item => {
                    const botType = item.botType
                    const Market = item.Market
                    newDataObject[botType] = newDataObject[botType] || {}
                    newDataObject[botType][Market] = newDataObject[botType][Market] || true
                    return {
                        ...item,
                        id: item?._id,
                    }
                })
                dataCheckExitsObject.current = newDataObject

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
    const userData = useSelector(state => state.userDataSlice.userData)

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
    }, [openAddBot, openEditBot, openDeleteBot, openViewBotList.dataChange]);

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
                dataCheckExitsObject={dataCheckExitsObject.current}
                applyAllCoinsBlacklist = {applyAllCoinsBlacklist}
            />}

            {openEditBot.isOpen && <EditServer
                onClose={(data) => {
                    setOpenEditBot(data)
                }}
                botTypeList={botTypeList.slice(1)}
                dataInput={openEditBot.data}
                applyAllCoinsBlacklist = {applyAllCoinsBlacklist}
            />}

            {
                openOffAll && (
                    <DialogCustom
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenOffAll("")
                        }}
                        onSubmit={() => applyAllCoinsBlacklist(openOffAll)}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="success"
                        submitBtnText="Apply"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to apply all now?</p>
                    </DialogCustom >
                )
            }
            {showOnlyPairsList.show && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowOnlyPairsList({
                            show: false,
                            list: []
                        })
                    }}
                    dialogTitle='List'
                    hideActionBtn
                    backdrop
                >
                    <Table className={styles.addMember}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Symbol </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                showOnlyPairsList.list.map((data, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            {data}
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </DialogCustom>
            )
            }


        </div >


    );
}

export default memo(CoinsBlock);