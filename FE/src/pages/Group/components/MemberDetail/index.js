import CheckIcon from '@mui/icons-material/Check';
import { useEffect, useMemo, useState } from "react";
import { getAllUserByUserIDList } from "../../../../services/userService";
import DialogCustom from "../../../../components/DialogCustom";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import styles from "./MemberDetail.module.scss"

function MemberDetail({
    onClose,
    userListSelected
}) {


    const tableColumns = [

        { field: 'stt', headerName: 'STT' },
        { field: 'userName', headerName: 'Name' },
        { field: 'role', headerName: 'Role' },
    ]

    const [userList, setUserList] = useState([]);


    const handleGetAllUser = async () => {
        try {
            const res = await getAllUserByUserIDList(userListSelected.map(item => item.userID))
            const { status, message, data: resData } = res.data
            status === 200 && setUserList(resData)
        } catch (error) {

        }
    }

    const userListSelectedToObject = useMemo(() => {

        const object = {};

        for (const item of userListSelected) {
            console.log(item);
            
            object[item.userID] = item.isAdmin;
        }

        return object

    }, [userListSelected])

    useEffect(() => {
        handleGetAllUser()
    }, []);

    return (
        <DialogCustom
            dialogTitle="Member Detail"
            open={true}
            onClose={onClose}
            hideActionBtn
            backdrop
            maxWidth="sm"
        >
            <Table className={styles.addMember}>
                <TableHead>
                    <TableRow>

                        {tableColumns.map((column) => (
                            <TableCell key={column.field} style={{ fontWeight: "bold" }}>
                                {column.headerName}
                            </TableCell>
                        ))}
                        <TableCell
                            style={{ fontWeight: "bold" }}>
                            <p>Admin</p>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {userList.map((user, index) => (
                        <TableRow key={user.id}>

                            <TableCell>
                                {index + 1}
                            </TableCell>
                            <TableCell>
                                {user.userName}
                            </TableCell>
                            <TableCell>
                                {user.roleName}
                            </TableCell>
                            <TableCell>
                                {
                                    userListSelectedToObject[user._id] && <CheckIcon />
                                }
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </DialogCustom>
    );
}

export default MemberDetail;