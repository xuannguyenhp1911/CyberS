import CancelIcon from '@mui/icons-material/Cancel';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, FormLabel, FormControl, Tooltip, Switch, Checkbox, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import CreateStrategy from './components/CreateStrategy';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import AddBreadcrumbs from '../../../../../../components/BreadcrumbsCutom';
import { formatNumberString } from '../../../../../../functions';
import useDebounce from '../../../../../../hooks/useDebounce';
import { getAllBotOnlyApiKey } from '../../../../../../services/botService';
import { addMessageToast } from '../../../../../../store/slices/Toast';
import { deleteStrategiesMultipleScanner, getAllConfigScanner, handleBookmarkScanner, updateConfigByID, updateStrategiesMultipleScanner } from '../../../../../../services/Configs/OKX/V1/scannerService';
import DataGridCustom from '../../../../../../components/DataGridCustom';
import DialogCustom from '../../../../../../components/DialogCustom';
import UpdateStrategy from './components/UpdateStrategy';


function ScannerV1VOKX() {

    const userData = useSelector(state => state.userDataSlice.userData)


    // const botTypeList = [
    //     {
    //         name: "All",
    //         value: "All"
    //     },
    //     {
    //         name: "ByBit_V3",
    //         value: "ByBit_V3"
    //     }
    // ]

    const positionSideList = [
        {
            name: "All",
            value: "All",
        },
        {
            name: "Long",
            value: "Long",
        },
        {
            name: "Short",
            value: "Short",
        },
    ]

    const marketList = [
        {
            name: "All",
            value: "All"
        },
        {
            name: "Margin",
            value: "Margin",
        },
        {
            name: "Spot",
            value: "Spot",
        },
        {
            name: "Futures",
            value: "Futures",
        },
    ]

    const tableColumns = [
       
        {
            field: 'Label',
            headerName: 'Label',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'BotName',
            headerName: 'Bot',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Market',
            headerName: 'Market',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'PositionSide',
            headerName: 'Position',
            minWidth: window.innerWidth <= 740 ? 140 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const rowData = params.row
                const PositionSide = rowData['PositionSide']
                return <p style={{
                    color: PositionSide === "Long" ? "green" : "var(--redColor)"
                }}>{PositionSide}</p>
            }
        },
        {
            field: 'OrderChange',
            headerName: 'OC',
            minWidth: window.innerWidth <= 740 ? 120 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Elastic',
            headerName: 'Elastic',
            minWidth: window.innerWidth <= 740 ? 150 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Amount',
            headerName: 'Amount',
            minWidth: window.innerWidth <= 740 ? 160 : 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Amount'])}</p>
            }
        },
        {
            field: 'AmountAutoPercent',
            headerName: 'Amount Auto',
            minWidth: window.innerWidth <= 740 ? 180 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'AmountExpire',
            headerName: 'Amount Exp',
            minWidth: window.innerWidth <= 740 ? 180 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Numbs',
            headerName: 'Numbs',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Expire',
            headerName: 'Expire (m)',
            minWidth: window.innerWidth <= 740 ? 160 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Limit',
            headerName: 'Limit',
            minWidth: window.innerWidth <= 740 ? 150 : 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Limit'])}</p>
            }
        },
        {
            field: 'Turnover',
            headerName: 'Turnover ($)',
            minWidth: window.innerWidth <= 740 ? 170 : 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Turnover'])}</p>
            }
        },
        {
            field: 'OnlyPairs',
            headerName: 'OnlyPairs',
            minWidth: window.innerWidth <= 740 ? 180 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const list = params.row["OnlyPairs"]
                const configID = params.row["_id"]
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
                                dataChange: false,
                                configID,
                                list
                            })
                        }}
                    />
                    }
                </div>
            }
        },
        {
            field: 'Blacklist',
            headerName: 'Blacklist',
            minWidth: window.innerWidth <= 740 ? 150 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const list = params.row["Blacklist"]
                const configID = params.row["_id"]
                return <div style={{ display: "flex", alignItems: "center", }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowBlackList({
                                show: true,
                                dataChange: false,
                                configID,
                                list
                            })
                        }}
                    />}
                </div>
            }
        },
    ]



    const [openFilterDialog, setOpenFilterDialog] = useState(false);
    const [openEditTreeItemMultipleDialog, setOpenEditTreeItemMultipleDialog] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [openCreateStrategy, setOpenCreateStrategy] = useState({
        isOpen: false,
        dataChange: false,
        symbolValueInput: ""
    });
    const [showOnlyPairsList, setShowOnlyPairsList] = useState({
        show: false,
        dataChange: false,
        configID: "",
        list: []
    })
    const [showBlackList, setShowBlackList] = useState({
        show: false,
        dataChange: false,
        configID: "",
        list: []
    })

    const [openConfirmDeleteConfig, setOpenConfirmDeleteConfig] = useState(false)
    const [openUpdateStrategy, setOpenUpdateStrategy] = useState(
        {
            isOpen: false,
            dataChange: false,
            data: ""
        }
    );
    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);
    const [loadingDataCheckTree, setLoadingDataCheckTree] = useState(true);
    const [dataCheckTreeSelected, setDataCheckTreeSelected] = useState([]);

    const dataCheckTreeDefaultObject = useRef({})
    const dataCheckTreeDefaultRef = useRef([])
    const [dataCheckTree, setDataCheckTree] = useState([]);

    const [searchKey, setSearchKey] = useState("");
    // Filter

    const filterQuantityRef = useRef([])
    const botTypeSelectedRef = useRef("All")
    const botSelectedRef = useRef("All")
    const positionSideSelectedRef = useRef("All")
    const marketSelectedRef = useRef("All")
    const bookmarkCheckRef = useRef(false)

    const dispatch = useDispatch()

    const handleGetAllBotByUserID = () => {

        getAllBotOnlyApiKey("ByBit_V1")
            .then(res => {
                const data = res.data.data;
                const newData = data?.map(item => (
                    {
                        name: item?.botName,
                        value: item?._id,
                    }
                ))
                const newMain = [
                    {
                        name: "All",
                        value: "All"
                    },
                    ...newData
                ]
                setBotList(newMain)
                handleGetAllStrategies(newData)

            })
            .catch(error => {
            }
            )
    }

    const handleGetAllStrategies = async (botListInput = botList.slice(1), filterStatus = false) => {

        setLoadingDataCheckTree(true)
        filterQuantityRef.current = []
        !filterStatus && resetAfterSuccess()

        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        showBlackList.dataChange = false
        showOnlyPairsList.dataChange = false

        try {
            window.scrollTo(0, 0)

            const res = await getAllConfigScanner(botListInput?.map(item => item?.value))
            const { data: resData } = res.data

            const newData = resData.map(item => {
                const id = item?._id
                dataCheckTreeDefaultObject.current[id] = item
                return ({
                    id,
                    ...item,
                    Expire: item.Expire || 0,
                    Turnover: item.Turnover || 0,
                    Elastic: item.Elastic || 0,
                    AmountExpire: (item.AmountExpire || item.AmountExpire == 0) ? item.AmountExpire : 10,
                    AmountAutoPercent: item.AmountAutoPercent || 8,
                    BotName: item.botID.botName
                })
            })

            dataCheckTreeDefaultRef.current = newData
            !filterStatus ? setDataCheckTree(newData) : handleFilterAll()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
        setLoadingDataCheckTree(false)
    }


    // const handleSyncSymbol = async () => {
    //     if (!loadingUploadSymbol) {
    //         try {
    //             setLoadingUploadSymbol(true)
    //             const res = await syncSymbolScanner()
    //             const { status, message, data: resData } = res.data

    //             dispatch(addMessageToast({
    //                 status: status,
    //                 message: message,
    //             }))

    //             handleGetAllStrategies()
    //             setLoadingUploadSymbol(false)
    //         }
    //         catch (err) {
    //             setLoadingUploadSymbol(false)
    //             dispatch(addMessageToast({
    //                 status: 500,
    //                 message: "Sync Error",
    //             }))
    //         }
    //     }
    // }

    const handleFilterAll = () => {
        filterQuantityRef.current = []

        const listData = dataCheckTreeDefaultRef.current.filter(item => {
            const checkBotType = botTypeSelectedRef.current === "All" || botTypeSelectedRef.current === item.botID.botType;
            const checkBot = botSelectedRef.current === "All" || botSelectedRef.current === item.botID._id;
            const checkPosition = positionSideSelectedRef.current === "All" || positionSideSelectedRef.current === item.PositionSide;
            const checkMarket = marketSelectedRef.current === "All" || marketSelectedRef.current === item.Market;
            const checkSearch = searchDebounce === "" || searchDebounce.includes(item._id);
            const checkBookmark = bookmarkCheckRef.current ? item.IsBookmark : true

            return checkBotType && checkBot && checkPosition && checkMarket && checkSearch && checkBookmark;
        });


        setDataCheckTree(listData)

    }


    const resetAfterSuccess = () => {
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        showBlackList.dataChange = false
        showOnlyPairsList.dataChange = false
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        marketSelectedRef.current = "All"
        bookmarkCheckRef.current = false
        setSearchKey("")
    }

    const searchDebounce = useDebounce(searchKey, 200)

    const handleDataCheckTreeSelected = useMemo(() => {
        return dataCheckTreeSelected.map(id => {
            return JSON.stringify(dataCheckTreeDefaultObject.current[id])
        })
    }, [dataCheckTreeSelected, dataCheckTree, dataCheckTreeDefaultRef.current])

    const handleRemoveSymbolFromOnlypairs = async (index) => {
        try {
            const newShowBlackList = [...showOnlyPairsList.list]
            newShowBlackList?.splice(index, 1)
            const res = await updateConfigByID({
                newData: {
                    OnlyPairs: newShowBlackList
                },
                configID: showOnlyPairsList.configID
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message
            }))

            if (status === 200) {

                setShowOnlyPairsList({
                    ...showOnlyPairsList,
                    show: true,
                    dataChange: true,
                    list: newShowBlackList
                })
            }
        }
        catch (err) {
            console.log(err);

            dispatch(addMessageToast({
                status: 500,
                message: "Update Error",
            }))
        }

    }

    const handleRemoveSymbolFromBlacklist = async (index) => {
        try {
            const newShowBlackList = [...showBlackList.list]
            newShowBlackList?.splice(index, 1)
            const res = await updateConfigByID({
                newData: {
                    Blacklist: newShowBlackList
                },
                configID: showBlackList.configID
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message
            }))

            if (status === 200) {

                setShowBlackList({
                    ...showBlackList,
                    show: true,
                    dataChange: true,
                    list: newShowBlackList
                })
            }
        }
        catch (err) {
            console.log(err);

            dispatch(addMessageToast({
                status: 500,
                message: "Update Error",
            }))
        }

    }
    useEffect(() => {
        handleFilterAll()
    }, [searchDebounce]);

    useEffect(() => {
        if (userData.userName) {
            handleGetAllBotByUserID()
        }

    }, [userData.userName]);


    useEffect(() => {
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange || showBlackList.dataChange || showOnlyPairsList.dataChange ) {
            handleGetAllStrategies(undefined, true)
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange,showBlackList.dataChange,showOnlyPairsList.dataChange]);

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["BigBabol"]} />

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap-reverse",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--borderColor)",
                    paddingBottom: "24px",
                }}>

                <div className={styles.strategiesFilter}>
                    <TextField
                        value={searchKey}
                        size="small"
                        placeholder="Label"
                        onChange={(e) => {
                            setSearchKey(e.target.value)
                        }}
                        className={styles.strategiesFilterInput}
                    />
                    <FilterListIcon
                        style={{
                            fontSize: "2rem",
                            margin: "0 12px",
                            cursor: "pointer"
                        }}
                        onClick={() => {
                            setOpenFilterDialog(true)
                        }}
                    />
                    {filterQuantityRef.current.length ? <p>{filterQuantityRef.current.length} filters</p> : ""}
                </div>

                <div className={styles.strategiesHeader}>
                    {/* <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Bot Type</FormLabel>
                        <Select
                            value={botTypeSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                botTypeSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                botTypeList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl> */}

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Bot</FormLabel>
                        <Select
                            value={botSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                botSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                botList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Market</FormLabel>
                        <Select
                            value={marketSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                marketSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                marketList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Position</FormLabel>
                        <Select
                            value={positionSideSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                positionSideSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                positionSideList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                </div>


            </div>
            <div className={styles.strategiesData}>
                {
                    (!loadingDataCheckTree)
                        ?
                        <DataGridCustom
                            setDataTableChange={setDataCheckTreeSelected}
                            tableRows={dataCheckTree}
                            tableColumns={tableColumns}
                            hideFooter
                        // centerCell = {window.innerWidth > 740}
                        />
                        :
                        <p style={{
                            textAlign: "center",
                            margin: "16px 0 0",
                            fontWeight: 500,
                            opacity: ".6"
                        }}>Loading...</p>
                }
            </div>

            <div className={styles.strategiesBtnAction}>
                {/* <Tooltip title="Sync Symbol" placement="left">
                    <div className={styles.strategiesBtnActionItem}
                        onClick={handleSyncSymbol}
                    >

                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }} >

                            {
                                !loadingUploadSymbol ? <CloudSyncIcon /> : <CircularProgress style={{ width: "50%", height: "50%" }} color='inherit' />
                            }

                        </Avatar>
                    </div>
                </Tooltip> */}
                <Tooltip title="Edit" placement="left">

                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            dataCheckTreeSelected.length > 0 && setOpenEditTreeItemMultipleDialog({
                                dataChange: false,
                                isOpen: true
                            })
                        }}
                    >
                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }}>
                            <EditIcon />
                        </Avatar>
                    </div>
                </Tooltip>
                

            </div>


            {openFilterDialog &&

                <FilterDialog
                    filterQuantityRef={filterQuantityRef}
                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                    setDataCheckTree={setDataCheckTree}
                    resetAfterSuccess={resetAfterSuccess}
                    onClose={() => {
                        setOpenFilterDialog(false)
                    }}
                    botListInput={botList.slice(1)}
                />

            }

            {openCreateStrategy.isOpen &&

                <CreateStrategy
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenCreateStrategy(data)
                    }}
                />

            }
            {openUpdateStrategy.isOpen &&

                <UpdateStrategy
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenUpdateStrategy(data)
                    }}
                    dataInput={openUpdateStrategy.data}
                    setDataCheckTree={setDataCheckTree}
                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                    dataCheckTreeDefaultObject={dataCheckTreeDefaultObject}
                />

            }


            {openEditTreeItemMultipleDialog.isOpen &&

                <EditMulTreeItem
                    dataCheckTreeSelected={handleDataCheckTreeSelected}
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenEditTreeItemMultipleDialog(data)
                    }}
                />

            }

            {showOnlyPairsList.show && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowOnlyPairsList({
                            configID: "",
                            dataChange: false,
                            show: false,
                            list: []
                        })
                    }}
                    dialogTitle='Only Pairs'
                    hideActionBtn
                    backdrop
                >
                    <Table className={styles.addMember}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Symbol </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Remove </TableCell>
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
                                        <TableCell
                                            style={{
                                                cursor: "pointer",
                                                color: "#e33838"
                                            }}
                                            onClick={() => {
                                                handleRemoveSymbolFromOnlypairs(index)
                                            }}
                                        >
                                            <CancelIcon />
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </DialogCustom>
            )
            }
            {
                showBlackList.show && (
                    <DialogCustom
                        open={true}
                        onClose={() => {
                            setShowBlackList({
                                configID: "",
                                dataChange: false,
                                show: false,
                                list: []
                            })
                        }}
                        dialogTitle='BlackList'
                        hideActionBtn
                        backdrop
                    >

                        <Table className={styles.addMember}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                    <TableCell style={{ fontWeight: "bold" }}>Symbol </TableCell>
                                    <TableCell style={{ fontWeight: "bold" }}>Remove </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {
                                    showBlackList.list.map((data, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                {data}
                                            </TableCell>
                                            <TableCell
                                                style={{
                                                    cursor: "pointer",
                                                    color: "#e33838"
                                                }}
                                                onClick={() => {
                                                    handleRemoveSymbolFromBlacklist(index)
                                                }}
                                            >
                                                <CancelIcon />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>

                    </DialogCustom>
                )
            }

            {
                openConfirmDeleteConfig && (
                    <DialogCustom
                        dialogTitle='The action requires confirmation'
                        reserveBtn
                        open={true}
                        onClose={() => {
                            setOpenConfirmDeleteConfig(false)
                        }}
                        submitBtnText='Confirm'
                        position='center'
                        submitBtnColor='error'
                        backdrop
                        onSubmit={async () => {
                            const configID = openConfirmDeleteConfig.configID
                            try {
                                const res = await deleteStrategiesMultipleScanner([{ id: configID, Market: openConfirmDeleteConfig.Market }])
                                const { data: resData, status, message } = res.data

                                dispatch(addMessageToast({
                                    status,
                                    message,
                                }))

                                if (status === 200) {
                                    setDataCheckTree(dataCheckTree => dataCheckTree.filter(item => item._id !== configID))
                                    dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.filter(item => item._id !== configID)
                                    delete dataCheckTreeDefaultObject.current[configID]
                                    setOpenConfirmDeleteConfig(false)
                                }
                            } catch (error) {
                                dispatch(addMessageToast({
                                    status: 500,
                                    message: error.message,
                                }))
                            }
                        }}
                    >
                        <p>Are you remove this config?</p>
                    </DialogCustom>
                )
            }

        </div >
    );
}

export default ScannerV1VOKX;