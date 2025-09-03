import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useState, memo, useEffect } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import styles from "./Bot.module.scss"
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
// import EditBotType from './components/EditBotType';
import AddBotType from './components/AddBotType';
import { deleteMultipleBotType, getAllBotType } from '../../services/botTypeService';


function BotType() {


    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        // {
        //     field: 'Action',
        //     headerName: 'Action',
        //     type: "actions",
        //     maxWidth: 120,
        //     minWidth: 100,
        //     renderCell: (params) => {
        //         const rowData = params.row; // Dữ liệu của hàng hiện tại
        //         const dataRowOther = {
        //             name: rowData['name'],
        //             note: rowData['note'],
        //             botTypeID: rowData.id,
        //         }
        //         return (
        //             <EditIcon
        //                 className={styles.icon}
        //                 onClick={e => {
        //                     e.stopPropagation()
        //                     setOpenEditBot({
        //                         dataChange: "",
        //                         isOpen: true,
        //                         dataInput: {
        //                             botTypeID: dataRowOther.botTypeID,
        //                             name: dataRowOther.name,
        //                             note: dataRowOther.note,
        //                         }
        //                     })
        //                 }}
        //             />
        //         )

        //     },

        // },
        {
            field: 'name',
            headerName: 'Name',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'note',
            headerName: 'Note',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
    ]

    const [groupList, setGroupList] = useState([]);
    const [openAddBot, setOpenAddBot] = useState({
        isOpen: false,
        dataChange: "",
    });
    const [openEditBot, setOpenEditBot] = useState({
        isOpen: false,
        dataInput: "",
        dataChange: "",
    });
    const [dataTableChange, setDataTableChange] = useState([]);
    const [openEditMultiple, setOpenEditMultiple] = useState(false);

    const dispatch = useDispatch()

    const handleGetAllGroup = async () => {
        try {
            const res = await getAllBotType()
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        id: item._id,
                    }
                ))
                setGroupList(newData)
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
                message: "Get All Group Error",
            }))
        }
    }

    const handleDeleteRowSelected = async () => {

        try {
            const res = await deleteMultipleBotType(dataTableChange)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            handleGetAllGroup()
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Group Error",
            }))
        }
        setOpenEditMultiple(false)
    }

    useEffect(() => {
        handleGetAllGroup()
    }, []);

    useEffect(() => {
        const newData = openAddBot.dataChange || openEditBot.dataChange
        newData && handleGetAllGroup()
    }, [openAddBot, openEditBot]);

    return (
        <div className={styles.bot}>
            <AddBreadcrumbs list={["BotTypes"]} />

            <div className={styles.botTableContainer}>
                <div className={styles.botTableContainerTitle}>
                    <b style={{ fontWeight: "bold" }}></b>
                    <div>
                        {dataTableChange.length > 0 && (
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
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setOpenAddBot(openAddBot => ({ ...openAddBot, isOpen: true }))
                            }}
                        >
                            Bot Type
                        </Button>
                    </div>
                </div>
                <div className={styles.botTableContainerData}>
                    <DataGridCustom
                        setDataTableChange={setDataTableChange}
                        tableRows={groupList}
                        tableColumns={tableColumns}
                    />
                </div>
            </div>


            {
                openEditMultiple && (
                    <DialogCustom
                        backdrop
                        open={openEditMultiple}
                        onClose={() => {
                            setOpenEditMultiple(false)
                        }}
                        onSubmit={handleDeleteRowSelected}
                        dialogTitle="The action requires confirmation"
                        submitBtnColor="error"
                        submitBtnText="Delete"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Do you want to delete {openEditMultiple} BotType?</p>
                    </DialogCustom >
                )
            }

            {
                openAddBot.isOpen && <AddBotType
                    onClose={(data) => {
                        setOpenAddBot(data)
                    }}
                />
            }
            {/* {
                openEditBot.isOpen && (
                    <EditBotType
                        onClose={(data) => {
                            setOpenEditBot(data)
                        }}
                        dataInput={openEditBot.dataInput}
                    />
                )
            } */}
        </div >

    );
}

export default memo(BotType);