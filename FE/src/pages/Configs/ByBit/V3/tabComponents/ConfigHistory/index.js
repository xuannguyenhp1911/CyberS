import RestoreIcon from '@mui/icons-material/Restore';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import EditIcon from '@mui/icons-material/Edit';
import { MenuItem, Select, TextField, Avatar, FormLabel, FormControl, Tooltip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from "./Strategies.module.scss"
import { useSelector } from 'react-redux';
import EditMulTreeItem from './components/EditMulTreeItem';
import FilterDialog from './components/FilterDialog';
import TreeParent from './components/TreeView/TreeParent';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import DialogCustom from '../../../../../../components/DialogCustom';
import { handleCheckAllCheckBox } from '../../../../../../functions';
import useDebounce from '../../../../../../hooks/useDebounce';
import { getAllBotActiveByUserID } from '../../../../../../services/botService';

function StrategiesHistory() {

    const userData = useSelector(state => state.userDataSlice.userData)

    const StrategiesHistoryDataMain = useSelector(state => state.StrategiesHistorySlice.dataList)

    const [openListStrategiesHistory, setOpenListStrategiesHistory] = useState(false);

    const location = useLocation()


    const SCROLL_INDEX = 5
    const SCROLL_INDEX_FIRST = window.innerHeight / 30

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
        // {
        //     name: "30m",
        //     value: "30m",
        // },
        // {
        //     name: "60m",
        //     value: "60m",
        // },
    ]

    const navigate = useNavigate()

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

    const [botList, setBotList] = useState([{
        name: "All",
        value: "All"
    },]);
    const [loadingDataCheckTree, setLoadingDataCheckTree] = useState(false);

    const dataCheckTreeSelectedRef = useRef([])
    const dataCheckTreeSelectedSymbolRef = useRef({})
    const dataCheckTreeDefaultRef = useRef([])
    const [dataCheckTree, setDataCheckTree] = useState([]);
    const [dataTreeViewIndex, setDataTreeViewIndex] = useState(SCROLL_INDEX_FIRST);

    const [searchKey, setSearchKey] = useState("");
    // Filter

    const filterQuantityRef = useRef([])
    const botTypeSelectedRef = useRef("All")
    const botSelectedRef = useRef("All")
    const positionSideSelectedRef = useRef("All")
    const candlestickSelectedRef = useRef("All")
    const selectAllRef = useRef(false)
    const bookmarkCheckRef = useRef(false)


    const countTotalActive = useMemo(() => {
        let countActive = 0
        let totalItem = 0

        dataCheckTree.forEach(item => {
            countActive += item?.children?.filter(itemChild => itemChild.IsActive).length || 0
            totalItem += item?.children.length || 0
        })
        return {
            countActive,
            totalItem
        }
    }, [dataCheckTree])

    const handleGetAllBotByUserID = () => {

        getAllBotActiveByUserID(userData._id, "ByBit_V3")
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

            })
            .catch(error => {
            }
            )
    }


    const handleFilterAll = () => {
        filterQuantityRef.current = []
        const listData = dataCheckTreeDefaultRef.current.reduce((acc, data) => {

            const filteredChildren = data?.children?.filter(item => {
                const checkBotType = botTypeSelectedRef.current === "All" || botTypeSelectedRef.current === item.botID.botType;
                const checkBot = botSelectedRef.current === "All" || botSelectedRef.current === item.botID._id;
                const checkPosition = positionSideSelectedRef.current === "All" || positionSideSelectedRef.current === item.PositionSide;
                const checkCandle = candlestickSelectedRef.current === "All" || candlestickSelectedRef.current === item.Candlestick;
                const checkSearchKeyUppercase = searchDebounce == searchDebounce.toUpperCase()
                const searchKeyTrim = searchDebounce.toUpperCase().trim()
                const labelUpper = data.label.toUpperCase()
                const checkSearch = searchDebounce === "" || !checkSearchKeyUppercase ? labelUpper.includes(searchKeyTrim) : labelUpper.startsWith(searchKeyTrim)
                const checkBookmark = bookmarkCheckRef.current ? data.bookmarkList?.includes(userData._id) : true

                return checkBotType && checkBot && checkPosition && checkCandle && checkSearch && checkBookmark;
            });

            if (filteredChildren.length > 0) {
                acc.push({ ...data, children: filteredChildren });
            }

            return acc;
        }, []);


        setDataCheckTree(listData)
        handleCheckAllCheckBox(false)

    }


    const handleScrollData = () => {
        const dataTreeViewIndexTemp = dataTreeViewIndex + SCROLL_INDEX

        const scrollY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollPercentage = (scrollY / (scrollHeight - windowHeight)) * 100;

        if (dataTreeViewIndexTemp <= dataCheckTree.length) {
            const newIndex = dataTreeViewIndex + SCROLL_INDEX
            if (scrollPercentage >= 70) {
                setDataTreeViewIndex(newIndex)
            }

        }
        else {
            window.removeEventListener('scroll', handleScrollData)
            setDataTreeViewIndex(dataTreeViewIndex + SCROLL_INDEX)
        }

    }

    const resetAfterSuccess = () => {
        dataCheckTreeSelectedRef.current = []
        openCreateStrategy.dataChange = false
        openEditTreeItemMultipleDialog.dataChange = false
        setDataTreeViewIndex(SCROLL_INDEX_FIRST)
        handleCheckAllCheckBox(false)
        botTypeSelectedRef.current = "All"
        botSelectedRef.current = "All"
        positionSideSelectedRef.current = "All"
        candlestickSelectedRef.current = "All"
        bookmarkCheckRef.current = false
        setSearchKey("")
    }


    const searchDebounce = useDebounce(searchKey)

    useEffect(() => {
        handleFilterAll()
    }, [searchDebounce]);

    useEffect(() => {
        if (userData.userName) {
            handleGetAllBotByUserID()
        }

    }, [userData.userName]);

    useEffect(() => {

        if (location.state) {
            const { data: newData } = location.state;
            const newDataCheckTree = newData
            dataCheckTreeDefaultRef.current = newDataCheckTree
            setDataCheckTree(newDataCheckTree)
        }
    }, [location.state]);


    useEffect(() => {
        if (dataCheckTree.length > 0) {


            if (selectAllRef.current) {
                document.querySelectorAll(".nodeParentSelected")?.forEach((item, index) => {
                    if (dataTreeViewIndex - SCROLL_INDEX - 1 <= index && index < dataTreeViewIndex) {
                        item.checked = false
                        item.click()
                    }
                })
                // document.querySelectorAll(".nodeItemSelected")?.forEach((item, index) => {
                //     if (dataTreeViewIndex - SCROLL_INDEX <= index && index < dataTreeViewIndex) {
                //         // console.log('gasn child');
                //         item.checked = true
                //     }
                // })
            }
            if (dataTreeViewIndex < dataCheckTree.length) {

                document.addEventListener('scroll', handleScrollData);
            }
            return () => document.removeEventListener('scroll', handleScrollData);

        }
    }, [dataCheckTree, dataTreeViewIndex]);

    useEffect(() => {
        if (openCreateStrategy.dataChange || openEditTreeItemMultipleDialog.dataChange) {
            navigate("/Configs/ByBit/V3/Config")
        }
    }, [openCreateStrategy.dataChange, openEditTreeItemMultipleDialog.dataChange]);


    return (
        <div className={styles.strategies}>

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
                        placeholder="Search"
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
                        <FormLabel className={styles.formLabel}>Candle</FormLabel>
                        <Select
                            value={candlestickSelectedRef.current}
                            size="small"
                            onChange={e => {
                                const value = e.target.value;
                                candlestickSelectedRef.current = value
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

                {!loadingDataCheckTree && <p
                    style={{
                        display: "flex",
                        alignItems: "center",
                        lineHeight: "100%"
                    }}
                >
                    <input
                        className={clsx(styles.checkboxStyle, "treeNodeCheckAll")}
                        type="checkbox"
                        onClick={e => {
                            const check = e.target.checked

                            e.currentTarget.parentElement.parentElement.querySelectorAll(".nodeParentSelected")?.forEach(item => {
                                item.checked = check
                            })
                            e.currentTarget.parentElement.parentElement.querySelectorAll(".nodeItemSelected")?.forEach(child => {
                                child.checked = check
                            })

                            selectAllRef.current = check
                            if (check) {
                                dataCheckTree.forEach(data => {
                                    data.children?.forEach(child => {
                                        dataCheckTreeSelectedRef.current.push(JSON.stringify({
                                            ...child,
                                            parentID: data._id
                                        }))
                                    })
                                    dataCheckTreeSelectedSymbolRef.current[data.value] = {
                                        name: data.value,
                                        value: data.value
                                    }

                                })
                            }
                            else {
                                dataCheckTreeSelectedRef.current = []
                                dataCheckTreeSelectedSymbolRef.current = []
                            }
                        }}
                    />
                    <span style={{
                        fontWeight: "bold",
                         color:"var(--textColor)",
                        fontSize: "1.1rem"
                    }}>All</span> <span style={{
                        fontWeight: "600",
                        marginLeft: "6px"
                    }}>( {countTotalActive.countActive} / {countTotalActive.totalItem} )</span>

                    
                </p>}
                {
                    (dataCheckTree.length > 0 && !loadingDataCheckTree)
                        ?

                        dataCheckTree.slice(0, dataTreeViewIndex).map((treeData) => {
                            return (
                                <TreeParent
                                    dataCheckTreeSelectedSymbolRef={dataCheckTreeSelectedSymbolRef}
                                    dataCheckTreeSelectedRef={dataCheckTreeSelectedRef}
                                    treeData={treeData}
                                    setOpenCreateStrategy={setOpenCreateStrategy}
                                    setDataCheckTree={setDataCheckTree}
                                    dataCheckTreeDefaultRef={dataCheckTreeDefaultRef}
                                    key={treeData._id}
                                />
                            )
                        })

                        :
                        <p style={{
                            textAlign: "center",
                            margin: "16px 0 0",
                            fontWeight: 500,
                            opacity: ".6"
                        }}>{loadingDataCheckTree ? "Loading..." : "No data"}</p>
                }
            </div>

            <div className={styles.strategiesBtnAction}>
                {StrategiesHistoryDataMain?.length > 0 && <Tooltip title="Restore Config" placement="left">
                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            setOpenListStrategiesHistory(true)
                        }}
                    >

                        <Avatar variant='circular' sx={{ bgcolor: "#0a58ca" }} >
                            <RestoreIcon />
                        </Avatar>
                    </div>
                </Tooltip>}
                <Tooltip title="Edit" placement="left">

                    <div className={styles.strategiesBtnActionItem}
                        onClick={() => {
                            dataCheckTreeSelectedRef.current.length > 0 && setOpenEditTreeItemMultipleDialog({
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


                {dataTreeViewIndex <= dataCheckTree.length && <KeyboardDoubleArrowDownIcon className={styles.scrollDownIcon} />}
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



            {openEditTreeItemMultipleDialog.isOpen &&

                <EditMulTreeItem
                    // setDataCheckTree={setDataCheckTreeWithAll}
                    dataCheckTreeSelected={[...new Set(dataCheckTreeSelectedRef.current)]}
                    botListInput={botList.slice(1)}
                    onClose={(data) => {
                        setOpenEditTreeItemMultipleDialog(data)
                    }}
                />
            }

            {openListStrategiesHistory && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setOpenListStrategiesHistory(false)
                    }}
                    dialogTitle='History'
                    hideActionBtn
                    backdrop
                >

                    <Table className={styles.addMember}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ fontWeight: "bold" }}>STT </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Time Created </TableCell>
                                <TableCell style={{ fontWeight: "bold" }}>Preview </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                StrategiesHistoryDataMain.map((data, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            {data.timeCreated}
                                        </TableCell>
                                        <TableCell>
                                            <RemoveRedEyeIcon
                                                className={styles.icon}
                                                onClick={() => {
                                                    setOpenListStrategiesHistory(false)
                                                    navigate("/Configs/ByBit/V3/ConfigHistory", {
                                                        state: {
                                                            data: data.data,
                                                            timeCreated: data.timeCreated
                                                        }
                                                    })
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>

                </DialogCustom>
            )}

        </div >
    );
}

export default StrategiesHistory;