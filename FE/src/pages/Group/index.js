import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useState, memo, useEffect } from "react";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import DataGridCustom from "../../components/DataGridCustom";
import styles from "./Bot.module.scss"
import { useDispatch, useSelector } from 'react-redux';
import { addMessageToast } from '../../store/slices/Toast';
import DialogCustom from '../../components/DialogCustom';
import AddGroup from './components/AddGroup';
import { deleteMultipleGroup, getAllGroup, getAllGroupByUserID } from '../../services/groupService';
import MemberDetail from './components/MemberDetail';
import EditGroup from './components/EditGroup';


function Group() {

    const userData = useSelector(state => state.userDataSlice.userData)

    const [openMemberDetail, setOpenMemberDetail] = useState(false);

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 20,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'Action',
            headerName: 'Action',
            type: "actions",
            maxWidth: 120,
            minWidth: 100,
            renderCell: (params) => {
                const rowData = params.row; // Dữ liệu của hàng hiện tại
                const dataRowOther = {
                    name: rowData['name'],
                    member: rowData['member'],
                    note: rowData['note'],
                    groupID: rowData.id,
                }
                return (
                    <EditIcon
                        className={styles.icon}
                        onClick={e => {
                            e.stopPropagation()
                            setOpenEditBot({
                                dataChange: "",
                                isOpen: true,
                                dataInput: {
                                    groupID: dataRowOther.groupID,
                                    member: dataRowOther.member,
                                    name: dataRowOther.name,
                                    note: dataRowOther.note,
                                }
                            })
                        }}
                    />
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
            field: 'member',
            headerName: 'Member',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (e) => {
                return (
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <p style={{
                            marginRight: "12px"
                        }}>{e.value.length}</p>
                        {
                            e.value?.length > 0 && (
                                <RemoveRedEyeIcon
                                    className={styles.icon}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        setOpenMemberDetail(e.value);
                                    }}
                                />
                            )
                        }
                    </div>
                )
            },
        },
        {
            field: 'userCreated', headerName: 'User Created',
            minWidth: 250,
            flex: window.innerWidth <= 740 ? undefined : 1,

        },
        {
            field: 'note', headerName: 'Note',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
        },
    ]

    // const [statusChoose, setStatusChoose] = useState(statusList[0].value);
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
            const res = userData.roleName == "SuperAdmin" ? await getAllGroup() : await getAllGroupByUserID()
            const { status, message, data: resData } = res.data
            if (status === 200) {
                const newData = resData?.map(item => (
                    {
                        ...item,
                        id: item._id,
                        userCreated: `${item.userID?.userName} ( ${item.userID?.roleName} )`
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
            const res = await deleteMultipleGroup(dataTableChange)
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
            <AddBreadcrumbs list={["Groups"]} />

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
                            Group
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
                        <p style={{ textAlign: "center" }}>Do you want to delete {openEditMultiple} groups?</p>
                    </DialogCustom >
                )
            }
            {
                openMemberDetail && (
                    <MemberDetail
                        onClose={() => {
                            setOpenMemberDetail(false)
                        }}
                        userListSelected={openMemberDetail}
                    />
                )
            }
            {
                openAddBot.isOpen && <AddGroup
                    onClose={(data) => {
                        setOpenAddBot(data)
                    }}
                />
            }
            {
                openEditBot.isOpen && (
                    <EditGroup
                        onClose={(data) => {
                            setOpenEditBot(data)
                        }}
                        dataInput={openEditBot.dataInput}
                    />
                )
            }
        </div >

    );
}

export default memo(Group);