import { useEffect, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { FormControl, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import styles from "./MemberDetail.module.scss"
import { getAllBotByListID } from '../../../../services/botService';
import DataGridCustom from "../../../../components/DataGridCustom";
import { editServerBot, getAllServerByBotType } from "../../../../services/serversService";
import { addMessageToast } from "../../../../store/slices/Toast";
import { useDispatch } from "react-redux";

function BotListDetail({
    onClose,
    userListSelected
}) {

    const tableColumns = [
        {
            field: 'botName',
            headerName: 'Name',
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: window.innerWidth <= 740 ? 110 : 110,
        },
        {
            field: 'userName',
            headerName: 'Created',
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: window.innerWidth <= 740 ? 120 : 110,
        },
        {
            field: 'Status',
            headerName: 'Status',
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: window.innerWidth <= 740 ? 110 : 110,
        },


    ]

    const [userList, setUserList] = useState([]);
    const [serverList, setServerList] = useState([]);
    const [userListSelectedChange, setUserListSelectedChange] = useState([]);
    const [serverSelecetedForChange, setserverSelecetedForChange] = useState("");

    const dispatch = useDispatch()

    const handleGetAllUser = async () => {
        try {
            const res = await getAllServerByBotType(userListSelected.botType)
            const { status, data: resData } = res.data
            setServerList(resData)
        } catch (error) {

        }
    }

    const handleGetAllServerByBotType = async () => {
        try {
            const res = await getAllBotByListID(userListSelected.botList)
            const { status, data: resData } = res.data
            status === 200 && setUserList(resData.map(item => ({
                ...item,
                id: item._id,
                userName: item.userID?.userName,
                Created: new Date(item?.Created).toLocaleDateString()
            })))
        } catch (error) {

        }
    }

    const handleChangeMultipleBotToServer = async () => {
        if (userListSelectedChange.length > 0 && serverSelecetedForChange) {
            try {
                const res = await editServerBot({
                    botID: userListSelectedChange,
                    serverID: serverSelecetedForChange,
                    serverIDOld: userListSelected.id,
                })

                const { message, status } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                if (status === 200) {
                    onClose({
                        dataChange:true,
                        open:false
                    })
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add Bot Error",
                }))
            }
        }
        else {
            dispatch(addMessageToast({
                status: 400,
                message: "Choose Server And Bot",
            }))
        }
    }

   
    useEffect(() => {
        handleGetAllUser()
        handleGetAllServerByBotType()
    }, []);


    return (
        <DialogCustom
            dialogTitle={`Member | ${userListSelected.botType}`}
            open={true}
            onClose={()=>{
                onClose({
                    dataChange: false,
                    open: false
                })
            }}
            backdrop
            maxWidth="sm"
            onSubmit={handleChangeMultipleBotToServer}
            submitBtnText="Change"
        >
            <FormControl>
                <TextField
                    select
                    label="Server"
                    variant="outlined"
                    size="small"
                    value={serverSelecetedForChange}
                    style={{
                        margin: "6px 0 20px",
                        width: "fit-content",
                        minWidth: "50%"
                    }}
                    onChange={e => { setserverSelecetedForChange(e.target.value) }}
                >
                    {
                        serverList.map(item => (
                            <MenuItem value={item?._id} key={item?._id}>{item?.name}</MenuItem>
                        ))
                    }

                </TextField>
            </FormControl>
            <DataGridCustom
                setDataTableChange={setUserListSelectedChange}
                tableRows={userList}
                tableColumns={tableColumns}
            />
        </DialogCustom>
    );
}

export default BotListDetail;