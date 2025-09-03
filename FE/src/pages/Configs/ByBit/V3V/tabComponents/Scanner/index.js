import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
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
import DataGridCustom from '../../../../../../components/DataGridCustom';
import DialogCustom from '../../../../../../components/DialogCustom';
import UpdateStrategy from './components/UpdateStrategy';
import { deleteStrategiesMultipleScannerV3, getAllConfigScannerV3, handleBookmarkScannerV3, updateStrategiesMultipleScannerV3 } from '../../../../../../services/Configs/ByBIt/V3/scannerService';
import { getTotalFutureByBot } from '../../../../../../services/Configs/ByBIt/V3/configService';
import { setTotalFuture } from '../../../../../../store/slices/TotalFuture';


function ScannerV3ThongKe() {

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
            name: "Long-Short",
            value: "Long-Short",
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

    const candlestickList = [
        {
            name: "All",
            value: "All",
        },
        {
            name: "1m",
            value: "1m",
        },
        {
            name: "3m",
            value: "3m",
        },
        {
            name: "5m",
            value: "5m",
        },
        {
            name: "15m",
            value: "15m",
        },
    ]

    const tableColumns = [
        
        {
            field: 'IsActive',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 150 : 130,
            headerName: 'Active',
            renderCell: params => {
                const data = params.row
                const configID = data['_id']
                const Market = data['Market']
                return (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#1976d2",
                        marginLeft: "-10px "
                    }}>
                        <Switch
                            size='small'
                            checked={params.row['IsActive']}
                          disabled

                        />
                      
                    </div>
                )

            },

        },

        {
            field: 'Label',
            headerName: 'Label',
            minWidth: 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'BotName',
            headerName: 'Bot',
            minWidth: 130,
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
                let color = "#0e6ec3"
                switch (PositionSide) {
                    case "Long":
                        color = "green";
                        break;
                    case "Short":
                        color = "var(--redColor)";
                        break;
                }
                return <p style={{ color }}>{PositionSide}</p>
            }
        },
        {
            field: 'FrameOCLength',
            headerName: 'Frame',
            minWidth: window.innerWidth <= 740 ? 130 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Candle',
            headerName: 'Candle',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OrderChangeAdjust',
            headerName: 'OC (%)',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'TP',
            headerName: 'TP (%)',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Range',
            headerName: 'Range',
            minWidth: window.innerWidth <= 740 ? 130 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{params.row['Range'] || "1D"}</p>
            }
        },
        {
            field: 'Condition',
            headerName: 'Condition (%)',
            minWidth: window.innerWidth <= 740 ? 200 : 160,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Turnover',
            headerName: 'Turnover 24h ($)',
            minWidth: window.innerWidth <= 740 ? 210 : 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Turnover'] || 0)}</p>
            }
        },
        {
            field: 'Amount',
            headerName: 'Amount (%)',
            minWidth: window.innerWidth <= 740 ? 180 : 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Amount'])}</p>
            }
        },
        {
            field: 'Expire',
            headerName: 'Expire (h)',
            minWidth: window.innerWidth <= 740 ? 160 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OnlyPairs',
            headerName: 'Only Pairs',
            minWidth: window.innerWidth <= 740 ? 170 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const groupCoinOnlyPairsID = params.row["groupCoinOnlyPairsID"]
                const list = !groupCoinOnlyPairsID ? params.row["OnlyPairs"] : groupCoinOnlyPairsID.symbolList
                
                return <div style={{ display: "flex", alignItems: "center", }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowOnlyPairsList({
                                title: groupCoinOnlyPairsID ? `Only Pairs - ${groupCoinOnlyPairsID.name}` : "Only Pairs",
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
                const groupCoinBlacklistID = params.row["groupCoinBlacklistID"]

                const list = !groupCoinBlacklistID ? params.row["Blacklist"] : (groupCoinBlacklistID?.symbolList || [])

                return <div style={{ display: "flex", alignItems: "center", }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowBlackList({
                                title: groupCoinBlacklistID ? `Blacklist - ${groupCoinBlacklistID.name}` : "Blacklist",
                                list
                            })
                        }}
                    />}
                </div>
            }
        },
        {
            field: 'Entry',
            headerName: 'Entry',
            minWidth: window.innerWidth <= 740 ? 100 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'BotName',
            headerName: 'Bot',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'IsBeta',
            type: "actions",
            minWidth: 100,
            maxWidth: 100,
            headerName: 'Beta',
            renderCell: params => {
                const data = params.row
                const configID = data['_id']
                return <Checkbox
                    checked={params.row['IsBeta']}
                    color='warning'
                />
            },
        },
        {
            field: 'IsOCWait',
            type: "actions",
            minWidth: 100,
            maxWidth: 100,
            headerName: 'Wait',
            renderCell: params => {
                const data = params.row
                return <Checkbox
                    checked={params.row['IsOCWait']}
                    color='success'
                />
            },
        },
        {
            field: 'IsDev',
            type: "actions",
            minWidth: 100,
            maxWidth: 100,
            headerName: 'Dev',
            renderCell: params => {
                const data = params.row
                return <Checkbox
                    checked={params.row['IsDev']}
                    color='error'
                />
            },
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
        title: "",
        list: []
    })
    const [showBlackList, setShowBlackList] = useState({
        title: "",
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
    const candleSelectedRef = useRef("All")
    const frameSelectedRef = useRef("All")
    const bookmarkCheckRef = useRef(false)

    const dispatch = useDispatch()

    const handleGetAllBotByUserID = () => {

        getAllBotOnlyApiKey("ByBit_V3")
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

    const handleGetTotalFutureByBot = async () => {

        try {
            const res = await getTotalFutureByBot("ByBit_V3")
            const { status, message, data: resData } = res.data

            dispatch(setTotalFuture({
                total: resData || 0
            }))

            // if (status !== 200) {
            //     dispatch(addMessageToast({
            //         status,
            //         message
            //     }))
            // }

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Total Future Error",
            }))
        }
    }

    const handleGetAllStrategies = async (botListInput = botList.slice(1), filterStatus = false) => {

        setLoadingDataCheckTree(true)
        filterQuantityRef.current = []
        !filterStatus && resetAfterSuccess()

        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false

        try {
            window.scrollTo(0, 0)

            const res = await getAllConfigScannerV3(botListInput?.map(item => item?.value))
            const { data: resData } = res.data

            const newData = resData.map(item => {
                const id = item?._id
                dataCheckTreeDefaultObject.current[id] = item
                return ({
                    id,
                    ...item,
                    Expire: item.Expire || 0,
                    Condition: `${item.Longest} - ${item.Elastic || 0} - ${item.Ratio}`,
                    FrameOCLength: `${item.Frame} - ${item.OCLength || 0}%`,
                    OrderChangeAdjust: `${item.OrderChange} x ${item.Adjust}`,
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
            const checkFrame = frameSelectedRef.current === "All" || frameSelectedRef.current === item.Frame;
            const checkCandle = candleSelectedRef.current === "All" || candleSelectedRef.current === item.Candle;
            const checkSearch = searchDebounce === "" || searchDebounce.includes(item._id);
            const checkBookmark = bookmarkCheckRef.current ? item.IsBookmark : true

            return checkBotType && checkBot && checkPosition && checkCandle && checkFrame && checkSearch && checkBookmark;
        });


        setDataCheckTree(listData)

    }


    const resetAfterSuccess = () => {
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        candleSelectedRef.current = "All"
        bookmarkCheckRef.current = false
        setSearchKey("")
    }

    const searchDebounce = useDebounce(searchKey, 200)

    const handleDataCheckTreeSelected = useMemo(() => {

        return dataCheckTreeSelected.map(id => {
            return JSON.stringify(dataCheckTreeDefaultObject.current[id])
        })
    }, [dataCheckTreeSelected, dataCheckTree, dataCheckTreeDefaultRef.current])

    useEffect(() => {
        handleFilterAll()
    }, [searchDebounce]);

    useEffect(() => {
        if (userData.userName) {
            // handleGetTotalFutureByBot()
            handleGetAllBotByUserID()
        }

    }, [userData.userName]);


    useEffect(() => {
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange || openUpdateStrategy.dataChange) {
            handleGetAllStrategies(undefined, true)
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange, openUpdateStrategy.dataChange]);

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["ScannerV3"]} />

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

                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Frame</FormLabel>
                        <Select
                            value={frameSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                frameSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                candlestickList.map(item => (
                                    <MenuItem value={item.value} key={item.value}>{item.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>
                    <FormControl className={styles.strategiesHeaderItem}>
                        <FormLabel className={styles.formLabel}>Candle</FormLabel>
                        <Select
                            value={candleSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                candleSelectedRef.current = value
                                handleFilterAll()
                            }}
                        >
                            {
                                candlestickList.map(item => (
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

            {showOnlyPairsList?.title && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowOnlyPairsList({
                            title: "",
                            list: []
                        })
                    }}
                    dialogTitle={showOnlyPairsList.title}
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
            {
                showBlackList.title && (
                    <DialogCustom
                        open={true}
                        onClose={() => {
                            setShowBlackList({
                                title: "",
                                list: []
                            })
                        }}
                        dialogTitle={showBlackList.title}
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
                                    showBlackList.list.map((data, index) => (
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
                                const res = await deleteStrategiesMultipleScannerV3([{ id: configID, Market: openConfirmDeleteConfig.Market }])
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

export default ScannerV3ThongKe;