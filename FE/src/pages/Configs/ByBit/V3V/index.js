import { Tabs, Tab, Button, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import DialogCustom from "../../../../components/DialogCustom";
import styles from "./V3V.module.scss"
import { createConfigByBitV3VIP, getAllConfigByBitV3VIP, clearVConfigByBitV3VIP } from "../../../../services/Configs/ByBIt/V3/configVIPService";
import { addMessageToast } from "../../../../store/slices/Toast";

function StrategiesV3TabVIP() {

    const [openDialog, setopenDialog] = useState(false);
    const [configData, setConfigData] = useState({
        botQty: 0,
        botPercent: 0,
        scanQty: 0,
        scanPercent: 0,
    });
    const location = useLocation()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const navigate = useNavigate()
    const dispatch = useDispatch()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }
    const userData = useSelector(state => state.userDataSlice.userData)

    const tabList = [
        {
            label: "Config",
            value: "Configs/ByBit/V3V/Config",
        },
        {
            label: "BigBabol",
            value: "Configs/ByBit/V3V/BigBabol",
        }
    ]

    const getConfig = async () => {
        try {
            const res = await getAllConfigByBitV3VIP()
            const { data: resData } = res.data
            resData && setConfigData(resData)
        } catch (error) {
        }
    }
    const handleSetVIP = async (data) => {
        try {
            const res = await createConfigByBitV3VIP(data)
            const { status, message, data: resData } = res.data
            setConfigData(resData)
            dispatch(addMessageToast({
                status,
                message
            }))
            if (status === 200) {
                setopenDialog(false)
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Error"
            }))
        }
    }

    const handleThongKeVip = async () => {
        try {
            const res = await clearVConfigByBitV3VIP()
            const { status, message, data: resData } = res.data
            dispatch(addMessageToast({
                status,
                message
            }))

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Error"
            }))
        }
    }

    useEffect(() => {
        getConfig()
    }, []);

    useEffect(() => {
                userData?.userName && userData?.userName != "SuperAdmin"  && navigate("/404")

    }, [userData]);

    return (
        <>
            <Tabs value={location.pathname?.replace("/", "")} onChange={handleChangeTab}>
                {
                    tabList.map(item => {
                        const value = item.value
                        console.log(userData.roleList.find(item=>value.includes(item)));
                        
                        return (
                             <Tab label={item.label} value={value} key={value}></Tab>
                        )
                    })
                }
                <Button
                    variant="outlined"
                    size="small"
                    style={{
                        marginLeft: "12px"
                    }}
                    onClick={() => { setopenDialog(true) }}
                >
                    Set
                </Button>
                <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    style={{
                        marginLeft: "12px"
                    }}
                    onClick={handleThongKeVip}
                >
                    TK
                </Button>
            </Tabs>
            {
                openDialog && (
                    <DialogCustom
                        open={true}
                        onClose={() => { setopenDialog(false) }}
                        onSubmit={handleSubmit(handleSetVIP)}
                        dialogTitle="SET"
                    >

                        <form className={styles.dialogForm}>
                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Bot Qty</FormLabel>
                                <TextField
                                    {...register("botQty", {
                                        required: true,
                                    })}
                                    size="small"
                                    type="number"
                                    defaultValue={configData?.botQty}
                                />
                                {errors.botQty?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                            </FormControl>
                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Bot %</FormLabel>
                                <TextField
                                    {...register("botPercent", {
                                        required: true,
                                    })}
                                    size="small"
                                    type="number"
                                    defaultValue={configData?.botPercent}
                                />
                                {errors.botPercent?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                            </FormControl>
                            <br></br>
                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Scan Qty</FormLabel>
                                <TextField
                                    {...register("scanQty", {
                                        required: true,
                                    })}
                                    size="small"
                                    type="number"
                                    defaultValue={configData?.scanQty}
                                />
                                {errors.scanQty?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                            </FormControl>
                            <FormControl className={styles.formControl}>
                                <FormLabel className={styles.label}>Scan %</FormLabel>
                                <TextField
                                    {...register("scanPercent", {
                                        required: true,
                                    })}
                                    size="small"
                                    type="number"
                                    defaultValue={configData?.scanPercent}
                                />
                                {errors.scanPercent?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                            </FormControl>
                        </form>
                    </DialogCustom >
                )
            }
        </>
    );
}

export default StrategiesV3TabVIP;