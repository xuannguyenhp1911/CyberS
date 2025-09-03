import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
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
import { getAllBotActiveByUserID } from '../../../../../../services/botService';
import { getTotalFutureByBot } from '../../../../../../services/Configs/ByBIt/V3/configService';
import { addMessageToast } from '../../../../../../store/slices/Toast';
import { setTotalFuture } from '../../../../../../store/slices/TotalFuture';
import { deleteStrategiesMultipleScanner, getAllConfigScanner, handleBookmarkScanner, updateConfigByID, updateStrategiesMultipleScanner } from '../../../../../../services/Configs/ByBIt/V1/scannerService';
import DataGridCustom from '../../../../../../components/DataGridCustom';
import DialogCustom from '../../../../../../components/DialogCustom';
import UpdateStrategy from './components/UpdateStrategy';


function ScannerV1ByBit() {

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
            field: 'stt',
            renderHeader: header => {
                return <Checkbox
                    checked={bookmarkCheckRef.current}
                    style={{
                        padding: " 0 ",
                    }}
                    sx={{
                        color: "#b5b5b5",
                        '&.Mui-checked': {
                            color: "var(--yellowColor)",
                        },
                    }}
                    icon={<StarBorderIcon />}
                    checkedIcon={<StarIcon />}
                    onClick={e => {
                        bookmarkCheckRef.current = e.target.checked
                        handleFilterAll()
                    }}
                />
            },
            type: "actions",
            maxWidth: 1,
            renderCell: (params) => {
                const data = params.row
                const IsBookmark = data['IsBookmark']
                const configID = data['_id']

                return <Checkbox
                    defaultChecked={IsBookmark}
                    style={{
                        padding: " 0 6px",
                    }}
                    sx={{
                        color: "#b5b5b5",
                        '&.Mui-checked': {
                            color: "var(--yellowColor)",
                        },
                    }}
                    icon={<StarBorderIcon />}
                    checkedIcon={<StarIcon />}
                    onClick={async e => {
                        try {
                            const newIsBookmark = e.target.checked
                            const res = await handleBookmarkScanner({
                                configID, IsBookmark: newIsBookmark
                            }
                            )
                            const { data: resData, status, message } = res.data

                            dispatch(addMessageToast({
                                status,
                                message,
                            }))
                            if (status === 200) {

                                dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(item => {

                                    if (item._id === configID) {
                                        return {
                                            ...data,
                                            IsBookmark: newIsBookmark
                                        }
                                    }
                                    return item
                                })
                            }
                        } catch (error) {
                            dispatch(addMessageToast({
                                status: 500,
                                message: error.message,
                            }))
                        }
                    }}
                />
            }
        },
        {
            field: 'IsActive',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 100 : 100,
            maxWidth: 100,
            headerName: 'Active',
            renderCell: params => {
                const data = params.row
                const configID = data['_id']
                const Market = data['Market']
                const PositionSide = data['PositionSide']
                // let color = "primary"
                // switch (PositionSide) {
                //     case "Long":
                //         color = "success"
                //         break;
                //     case "Short":
                //         color = "error"
                //         break;
                //     default:
                //         color = "primary"
                //         break;
                // }
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
                            onChange={async e => {
                                try {
                                    const newIsActive = e.target.checked
                                    const res = await updateStrategiesMultipleScanner([
                                        {
                                            id: configID,
                                            UpdatedFields: {
                                                ...data,
                                                IsActive: newIsActive
                                            }
                                        }
                                    ])
                                    const { data: resData, status, message } = res.data

                                    dispatch(addMessageToast({
                                        status,
                                        message,
                                    }))

                                    if (status === 200) {

                                        dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(item => {
                                            if (item._id === configID) {
                                                const newData = {
                                                    ...data,
                                                    IsActive: newIsActive
                                                }
                                                dataCheckTreeDefaultObject.current[configID] = newData
                                                return newData
                                            }
                                            return item
                                        })

                                        setDataCheckTree(dataCheckTree => dataCheckTree.map(item => {
                                            if (item._id === configID) {
                                                return {
                                                    ...data,
                                                    IsActive: newIsActive
                                                }
                                            }
                                            return item
                                        }))

                                    }
                                } catch (error) {
                                    dispatch(addMessageToast({
                                        status: 500,
                                        message: error.message,
                                    }))
                                }
                            }}

                        />
                        {/* <DeleteOutlineIcon
                            className={styles.icon}
                            style={{ margin: "0 4px", }}
                            onClick={async () => {
                                setOpenConfirmDeleteConfig({ configID, Market })
                            }}
                        /> */}
                        <EditIcon className={styles.icon}
                            onClick={() => {
                                setOpenUpdateStrategy({
                                    data,
                                    dataChange: false,
                                    isOpen: true,
                                })
                            }}
                        />
                    </div>
                )

            },

        },
        {
            field: 'Label',
            headerName: 'Label',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OrderChange',
            headerName: 'OC',
            minWidth: window.innerWidth <= 740 ? 100 : 110,
            maxWidth: 80,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Elastic',
            headerName: 'Elastic',
            minWidth: window.innerWidth <= 740 ? 120 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Amount',
            headerName: 'Amount',
            minWidth: window.innerWidth <= 740 ? 120 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Amount'])}</p>
            }
        },

        {
            field: 'AmountAutoPercent',
            headerName: 'Amount Auto',
            minWidth: window.innerWidth <= 740 ? 160 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'AmountExpire',
            headerName: 'Amount Exp',
            minWidth: window.innerWidth <= 740 ? 150 : 120,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        
        {
            field: 'Market',
            headerName: 'Market',
            minWidth: window.innerWidth <= 740 ? 110 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => {
                const TradeType = params.value
                let icon
                switch (TradeType) {
                    case "Margin": {
                        icon = "🍁"
                        break;
                    }
                    case "Spot": {
                        icon = "🍀"
                        break;
                    }
                    case "Futures": {
                        icon = "🌻"
                        break;
                    }
                }
                return <p> {TradeType} {icon}</p>
            }
        },
        {
            field: 'PositionSide',
            headerName: 'Pos',
            minWidth: window.innerWidth <= 740 ? 100 : 110,
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
            field: 'Limit',
            headerName: 'Limit',
            minWidth: window.innerWidth <= 740 ? 120 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Limit'])}</p>
            }
        },
        {
            field: 'Numbs',
            headerName: 'Numbs',
            minWidth: window.innerWidth <= 740 ? 120 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'Expire',
            headerName: 'Exp (m)',
            minWidth: window.innerWidth <= 740 ? 120 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },

        {
            field: 'Turnover',
            headerName: 'Turnover ($)',
            minWidth: window.innerWidth <= 740 ? 160 : 110,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return <p >{formatNumberString(params.row['Turnover'])}</p>
            }
        },
        {
            field: 'XOCPump',
            headerName: 'OC Pump',
            minWidth: window.innerWidth <= 740 ? 140 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return `${params.value}x`
            }
        },
        {
            field: 'Adaptive',
            headerName: 'Adaptive',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 140 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return params.value ? <CheckIcon /> : ""
            }
        },
        {
            field: 'Reverse',
            headerName: 'Reverse',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 140 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return params.value ? <CheckIcon /> : ""
            }
        },
        {
            field: 'BotName',
            headerName: 'Bot',
            minWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'OnlyPairs',
            headerName: 'OnlyPairs',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 130 : 110,
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
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 130 : 110,
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
        {
            field: 'IsBeta',
            headerName: 'Beta',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 100 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                // return params.value ? <CheckIcon style = {{color:"#E76C12"}} /> : ""
                return params.value && <Checkbox
                    checked={params.value}
                    color='warning'
                />
            }
        },
        {
            field: 'Raceme',
            headerName: 'Raceme',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 100 : 100,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                return params.value && <Checkbox
                    checked={params.value}
                    color='success'
                />
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
    const removeSymbolOnlyBlack = useRef({
        only: false,
        black: false
    })

    const dispatch = useDispatch()

    const handleGetAllBotByUserID = () => {

        getAllBotActiveByUserID(userData._id, "ByBit_V1")
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
            const res = await getTotalFutureByBot("ByBit_V1")
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
        removeSymbolOnlyBlack.current = {
            only: false,
            black: false
        }
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
            const checkSearch = searchDebounce === "" || item.Label.toUpperCase().includes(searchDebounce.toUpperCase().trim());
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

                removeSymbolOnlyBlack.current.only = true

                setShowOnlyPairsList({
                    ...showOnlyPairsList,
                    show: true,
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
                removeSymbolOnlyBlack.current.black = true

                setShowBlackList({
                    ...showBlackList,
                    show: true,
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
    const handleRemoveAllSymbolFromBlacklist = async () => {
        try {
            const newShowBlackList = []
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
                removeSymbolOnlyBlack.current.black = true

                setShowBlackList({
                    ...showBlackList,
                    show: true,
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
            // handleGetTotalFutureByBot()
        }

    }, [userData.userName]);


    useEffect(() => {
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange || showBlackList.dataChange || showOnlyPairsList.dataChange) {
            handleGetAllStrategies(undefined, true)
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange, showBlackList.dataChange, showOnlyPairsList.dataChange]);

    return (
        <div className={styles.strategies}>
            <AddBreadcrumbs list={["BigBabol"]} />

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap-reverse",
                    alignItems: "flex-start",
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
                            columnVisibilityModel={
                                {
                                    "AmountAutoPercent": false,
                                    "AmountExpire": false,
                                    "Limit": false,
                                    "Number": false,
                                    "XOCPump": false,
                                    "Adaptive": false,
                                    "Reverse": false,
                                    "IsBeta": false,
                                    "Raceme": false,
                                    "Numbs": false,
                                }
                            }
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
                <Tooltip title="Add" placement="left">

                    <div
                        className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            setOpenCreateStrategy(openCreateStrategy => ({
                                ...openCreateStrategy,
                                isOpen: true,

                            }))
                        }}
                    >
                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }}>
                            <AddIcon
                            />
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
                    market={marketSelectedRef.current}
                />

            }

            {showOnlyPairsList.show && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowOnlyPairsList({
                            configID: "",
                            dataChange: removeSymbolOnlyBlack.current.only,
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
                                dataChange: removeSymbolOnlyBlack.current.black,
                                show: false,
                                list: []
                            })
                        }}
                        dialogTitle='BlackList'
                        submitBtnColor='error'
                        submitBtnText='Remove All'
                        onSubmit={handleRemoveAllSymbolFromBlacklist}
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

export default ScannerV1ByBit;