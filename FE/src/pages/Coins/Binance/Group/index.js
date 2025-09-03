import CheckIcon from '@mui/icons-material/Check';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';

import { Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGridCustom from '../../../../components/DataGridCustom';
import DialogCustom from '../../../../components/DialogCustom';
import styles from "./GroupCoin.module.scss"
import AddNew from './components/AddNew';
import { deleteGroupCoin, getAllGroupCoin } from '../../../../services/Coins/Binance/groupCoinV3Service';
import { addMessageToast } from '../../../../store/slices/Toast';
import { useDispatch } from 'react-redux';
import EditNew from './components/EditNew';
import AddAuto from './components/AddAuto';
import EditAuto from './components/EditAuto';


function GroupCoinBinance() {

    const [openConfirmDeleteConfig, setOpenConfirmDeleteConfig] = useState({
        forType: "",
        id: ""
    })
    const [showSymbolList, setShowSymbolList] = useState({
        title: "",
        list: []
    })
    const [loadingGetDataMain, setLoadingGetDataMain] = useState(true);
    const [groupCoinListData, setGroupCoinListData] = useState([]);
    const [openAddNew, setOpenAddNew] = useState({
        isOpen: false,
        dataChange: false
    });
    const [openEditNew, setOpenEditNew] = useState({
        isOpen: false,
        dataChange: false,
        dataInput: []
    });
    const [openAddAuto, setOpenAddAuto] = useState({
        isOpen: false,
        dataChange: false
    });


    const dispatch = useDispatch()

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'IsActive',
            type: "actions",
            minWidth: window.innerWidth <= 740 ? 150 : 130,
            headerName: 'Active',
            renderCell: params => {
                const data = params.row
                const id = data['_id']
                const forType = data['forType']
                return (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#1976d2",
                        marginLeft: "-10px "
                    }}>
                        <DeleteOutlineIcon
                            className={styles.icon}
                            style={{ margin: "0 4px", }}
                            onClick={async () => {
                                setOpenConfirmDeleteConfig({
                                    forType,
                                    id
                                })
                            }}
                        />
                        <EditIcon className={styles.icon}
                            onClick={() => {
                                setOpenEditNew({
                                    dataChange: false,
                                    isOpen: true,
                                    dataInput: data
                                })
                            }}
                        />
                    </div>
                )

            },
        },

        {
            field: 'name',
            headerName: 'Name',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'forType',
            headerName: 'For Type',
            minWidth: 150,
            maxWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
        {
            field: 'symbolList',
            headerName: 'Symbol',
            minWidth: window.innerWidth <= 740 ? 170 : 110,
            maxWidth: 130,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: params => {
                const list = params.row["symbolList"]
                const title = params.row["auto"] ? params.row["selectedMode"] : "List"
                return <div style={{ display: "flex", alignItems: "center", }}>
                    <p style={{
                        marginRight: "6px"
                    }}>{list.length}</p>

                    {list?.length > 0 && <RemoveRedEyeIcon
                        className={styles.icon}
                        style={{ verticalAlign: "middle" }}
                        onClick={() => {
                            setShowSymbolList({
                                title,
                                list
                            })
                        }}
                    />
                    }
                </div>
            }
        },
        {
            field: 'auto',
            headerName: 'Auto',
            flex: window.innerWidth <= 740 ? undefined : 1,
            type: "actions",
            minWidth: 130,
            maxWidth: 130,
            renderCell: (params) => (
                <>
                    {
                        params.value && (
                            <CheckIcon />
                        )
                    }
                </>
            )
        },
        {
            field: 'size',
            type: "actions",
            minWidth: 130,
            maxWidth: 130,
            headerName: 'Size',
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => params.value?.toString()
        },

    ]

    const handleGetAll = async () => {
        try {
            const res = await getAllGroupCoin()
            const { data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    ...item,
                    id: item._id
                }))
            setGroupCoinListData(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
        setLoadingGetDataMain(false)
    }

    useEffect(() => {
        handleGetAll()
    }, []);
    useEffect(() => {
        if (openAddAuto.dataChange || openAddNew.dataChange || openEditNew.dataChange) {
            handleGetAll()
        }
    }, [openAddAuto.dataChange, openAddNew.dataChange, openEditNew.dataChange]);

    return (
        <div className={styles.strategies}>

            <div style={{ textAlign: "right" }}>
                <Button
                    variant='contained'
                    color='inherit'
                    style={{
                        marginRight: "12px"
                    }}
                    size='small'
                    onClick={() => {
                        setOpenAddNew({
                            isOpen: true,
                            dataChange: false
                        })
                    }}
                >
                    + Manual
                </Button>
                <Button
                    size='small'
                    variant='contained'
                    onClick={() => {
                        setOpenAddAuto({
                            isOpen: true,
                            dataChange: false
                        })
                    }}
                >
                    + Auto
                </Button>
            </div>
            <div className={styles.strategiesData}>
                {
                    (!loadingGetDataMain)
                        ?
                        <DataGridCustom
                            tableRows={groupCoinListData}
                            tableColumns={tableColumns}
                            checkboxSelection={false}
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

            {openAddNew.isOpen &&
                <AddNew
                    onClose={(data) => {
                        setOpenAddNew(data)
                    }}
                />
            }

            {openEditNew.isOpen && (
                openEditNew.dataInput?.auto ?
                    <EditAuto
                        dataInput={openEditNew.dataInput}
                        onClose={(data) => {
                            setOpenEditNew(data)
                        }}
                    /> : <EditNew
                        dataInput={openEditNew.dataInput}
                        onClose={(data) => {
                            setOpenEditNew(data)
                        }}
                    />
            )

            }

            {openAddAuto.isOpen &&
                <AddAuto
                    onClose={(data) => {
                        setOpenAddAuto(data)
                    }}
                />
            }

            {showSymbolList.list?.length > 0 && (
                <DialogCustom
                    open={true}
                    onClose={() => {
                        setShowSymbolList({
                            title: "",
                            list: []
                        })
                    }}
                    dialogTitle={showSymbolList.title}
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
                                showSymbolList.list.map((data, index) => (
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
                openConfirmDeleteConfig.id && (
                    <DialogCustom
                        dialogTitle='The action requires confirmation'
                        reserveBtn
                        open={true}
                        onClose={() => {
                            setOpenConfirmDeleteConfig({ forType: "", id: "" })
                        }}
                        submitBtnText='Confirm'
                        position='center'
                        submitBtnColor='error'
                        backdrop
                        onSubmit={async () => {
                            const id = openConfirmDeleteConfig.id
                            try {
                                const res = await deleteGroupCoin({
                                    id,
                                    forType: openConfirmDeleteConfig.forType,
                                })
                                const { data: resData, status, message } = res.data

                                dispatch(addMessageToast({
                                    status,
                                    message,
                                }))

                                if (status === 200) {
                                    setGroupCoinListData(dataCheckTree => dataCheckTree.filter(item => item._id !== id))
                                    setOpenConfirmDeleteConfig({ forType: "", id: "" })
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

export default GroupCoinBinance;