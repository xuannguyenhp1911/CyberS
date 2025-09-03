import CycloneIcon from '@mui/icons-material/Cyclone';
import SyncIcon from '@mui/icons-material/Sync';
import { LoadingButton } from "@mui/lab"
import styles from "./Setting.module.scss"
import { useState } from "react";
import { setMargin, setLeverByBit, setLever, setLeverBinance } from "../../../../../../services/botService";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import ConfigLever from "./components/ConfigLever";
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@mui/material';
import CopyTrading from './components/CopyTrading';
function Setting({
    botData,
    getBotData
}) {
    const userData = useSelector(state => state.userDataSlice.userData)
    const [openConfigLever, setOpenConfigLever] = useState("");
    const [loadingSetMargin, setLoadingSetMargin] = useState("");
    const dispatch = useDispatch();
    const [openCopyTrading, setOpenCopyTrading] = useState("");

    const handleSetAuto = ({
        rowData,
        botType
    }) => {
        let text = ""
        let func
        let btnColor
        switch (botType) {
            case "ByBit_V1": {
                text = "Set Margin"
                func = () => { handleSetMargin(rowData) }
                break
            }
            case "OKX_V1":
                {
                    text = "Set Lever"
                    func = () => { setOpenConfigLever("Both") }
                    btnColor = "success"
                    break
                }
            case "ByBit_V3":
            case "OKX_V3":
            case "Binance_V3":
                {
                    text = "Set Lever"
                    func = () => { setOpenConfigLever("Futures") }
                    btnColor = "success"
                    break
                }
        }
        return {
            text,
            func,
            btnColor
        }
    }

    const getSetAuto = () => {
        if (botData) {
            const listAuto = [
                "ByBit_V1",
                "ByBit_V3",
                "OKX_V1",
                "OKX_V3",
                "Binance_V3",
            ]
            const botType = botData?.botType
            if (listAuto.includes(botType)) {
                const data = handleSetAuto({
                    rowData: botData,
                    botType
                })

                return (
                    <LoadingButton
                        startIcon={<SyncIcon />}
                        variant="contained"
                        size="small"
                        loading={loadingSetMargin}
                        color={data.btnColor}
                        sx={{
                            ".MuiLoadingButton-label": {

                                fontSize: "13px !important",
                            }
                        }}
                        onClick={data.func}
                    >
                        {data.text}
                    </LoadingButton >
                )
            }
        }
    }
    const handleSetMargin = async (botData) => {
        setLoadingSetMargin(botData._id)
        try {
            const res = await setMargin(botData)
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Set Margin Error",
            }))
        }
        setLoadingSetMargin("")
    }

    const handleSetLever = async ({ lever, market }) => {
        setOpenConfigLever("")
        dispatch(addMessageToast({
            status: 200,
            message: "Setting Lever",
        }))
        if (botData) {
            setLoadingSetMargin(botData._id)


            try {
                let res
                switch (botData?.botType) {

                    case "ByBit_V3":
                        {
                            res = await setLeverByBit({
                                botData,
                                lever,
                                market
                            })
                            break
                        }
                    case "OKX_V3":
                        {
                            res = await setLever({
                                botData,
                                lever,
                                market
                            })
                            break
                        }
                    case "Binance_V3":
                        {
                            res = await setLeverBinance({
                                botData,
                                lever,
                                market
                            })
                            break
                        }

                }
                const { status, message } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))

            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Set Lever Error",
                }))
            }
        }
        setLoadingSetMargin("")
    }

    return (
        <div>
            {getSetAuto()}
            {
                openConfigLever && <ConfigLever
                    handleSetLever={handleSetLever}
                    onClose={() => { setOpenConfigLever("") }}
                    openConfigLever={openConfigLever}
                />
            }
{/* 
            {
                userData?.roleName == "SuperAdmin" && userData._id == botData?.userID?._id && botData?.ApiKey && (
                    <Button
                        variant='contained'
                        startIcon={<CycloneIcon />}
                        size='small'
                        style={{ marginLeft: "12px" }}
                        onClick={() => setOpenCopyTrading(true)}
                    >
                        Copy Trading
                    </Button>
                )
            } */}

            {
                openCopyTrading && (
                    <CopyTrading
                        onClose={() => { setOpenCopyTrading("") }}
                        botData={botData}
                        getBotData={getBotData}
                    />
                )
            }
        </div>
    );
}

export default Setting;