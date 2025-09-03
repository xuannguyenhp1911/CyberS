import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import { Button, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import styles from "./Overview.module.scss"
import { useParams } from 'react-router-dom';
import { getBotByID, updateBot } from '../../../../../../services/botService';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../../../../store/slices/Toast';
import { formatNumber } from '../../../../../../functions';
import { balanceWallet, getFutureAvailable, getSpotTotal } from '../../../../../../services/Configs/ByBIt/V3/configService';
import { balanceWalletOKX, getFutureAvailableOKX, getSpotTotalOKX } from '../../../../../../services/Configs/OKX/V1/spotService';
import ConfigBalance from './components/ConfigBalance';
import { LoadingButton } from '@mui/lab';
import { getFutureAvailableBinance, balanceWalletBinance } from '../../../../../../services/Configs/Binance/V3/configService';
import Transfer from './components/Transfer';

function Wallet() {
    const [openTransfer, setOpenTransfer] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [openConfigBalance, setOpenConfigBalance] = useState({
        isOpen: false,
        dataChange: false,
    });
    const [loadingAll, setLoadingAll] = useState(true);
    const [spotSaving, setSpotSaving] = useState(0);
    const [spotTotal, setSpotTotal] = useState(0);
    const [tradingAvailable, setTradingAvailable] = useState(0);
    const [futureAvailable, setFutureAvailable] = useState(0);
    const spotTotalBinance = useRef(0)

    const [botData, setBotData] = useState({});

    const { botID } = useParams()

    const dispatch = useDispatch()

    const handleGetFutureAvailable = async (botData = {}) => {
        let futureAvailable = 0
        try {
            const botType = botData?.botType
            switch (botType) {
                case "ByBit_V3":
                case "ByBit_V1": {
                    const res = await getFutureAvailable(botID)
                    const { status, data, message } = res.data

                    if (status === 200) {
                        const value = +data.result?.list?.[0]?.coin[0].walletBalance || 0
                        setFutureAvailable(value)
                        futureAvailable = value
                    }
                    else {
                        dispatch(addMessageToast({
                            status: status,
                            message: message,
                        }))
                    }
                    break
                }
                case "OKX_V1":
                case "OKX_V3":
                    {
                        const res = await getFutureAvailableOKX(botData)
                        const { data } = res.data
                        setFutureAvailable(data)
                        futureAvailable = data
                        break
                    }
                case "Binance_V3":
                case "Binance_V1": {
                    const res = await getFutureAvailableBinance(botID)
                    const { status, data, message } = res.data

                    if (status === 200) {
                        const value = data.future || 0
                        const spotValue = data.spot
                        setFutureAvailable(value)
                        setSpotTotal(spotValue)
                        spotTotalBinance.current = spotValue
                        futureAvailable = value
                    }
                    else {
                        dispatch(addMessageToast({
                            status: status,
                            message: message,
                        }))
                    }
                    break
                }
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: error.response?.data?.message,
            }))
        }
        return futureAvailable
    }

    const handleGetSpotTotal = async (botData = {}) => {

        let spotTotal = 0
        try {
            const botType = botData?.botType
            switch (botType) {
                case "ByBit_V3":
                case "ByBit_V1": {

                    const res = await getSpotTotal(botID)
                    const { status, data, message } = res.data

                    const newSpotTotal = +data.result?.balance?.[0]?.walletBalance || 0

                    spotTotal = newSpotTotal
                    if (status === 200) {
                        setSpotTotal(newSpotTotal)
                    }
                    else {
                        dispatch(addMessageToast({
                            status: status,
                            message: message,
                        }))
                    }
                    break
                }
                case "OKX_V1":
                case "OKX_V3":
                    {
                        const res = await getSpotTotalOKX(botData)
                        const { data } = res.data
                        setSpotTotal(data?.funding)
                        setTradingAvailable(data?.trading)
                        spotTotal = data?.fundingUSDT
                        break
                    }
                case "Binance_V3":
                case "Binance_V1": {
                    spotTotal = spotTotalBinance.current
                    break
                }
            }
        } catch (error) {

            dispatch(addMessageToast({
                status: 500,
                message: error.response?.data?.message,
            }))
        }
        return spotTotal
    }

    const handleGetBotSaving = async () => {
        let botData = {}
        await getBotByID(botID)
            .then(async res => {
                const data = res.data.data;
                if (data) {
                    const newSpotSavings = Math.abs(data?.spotSavings || 0)
                    setBotData(data)
                    setSpotSaving(newSpotSavings)
                    botData = data
                }
            }

            )
            .catch(error => {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Get Bot Detail Error",
                }))
            })
        return botData
    }

    const roundDown = (value) => {
        return Math.abs(Math.floor(value * 1000) / 1000);
    }
    // Cân ví
    const handleWalletBalance = async ({
        botDataInput = botData,
        balanceLog = true,
    }) => {
        setLoadingAll(true)
        const futureAvailable = await handleGetFutureAvailable(botDataInput)
        const spotTotal = await handleGetSpotTotal(botDataInput)

        const spotSavingCurrent = Math.abs(spotSaving || 0)

        const newSpotAvailable = spotTotal - spotSavingCurrent

        try {
            const totalBalance = newSpotAvailable + futureAvailable

            const targetFuture = totalBalance * ((botDataInput.futureBalancePercent || botDataInput.futureBalancePercent == 0) ? botDataInput.futureBalancePercent : 50) / 100;

            let amount = Math.abs(targetFuture - futureAvailable);
            let futureLarger = targetFuture < futureAvailable

            if (amount > 0.1) {
                switch (botDataInput.futureBalancePercent) {
                    case 100: {
                        futureLarger = false
                        amount = roundDown(newSpotAvailable)
                        break
                    }
                    case 0: {
                        futureLarger = true
                        amount = roundDown(futureAvailable)
                        break
                    }
                }

                const botType = botDataInput?.botType
                switch (botType) {
                    case "ByBit_V3":
                    case "ByBit_V1": {
                        const resData = await balanceWallet({
                            amount,
                            futureLarger,
                            botID
                        })

                        const { status, message } = resData.data

                        balanceLog && dispatch(addMessageToast({
                            status,
                            message
                        }))
                        break

                    }
                    case "OKX_V1":
                    case "OKX_V3":
                        {

                            const resData = await balanceWalletOKX({
                                amount,
                                futureLarger,
                                botData
                            })

                            const { status, message } = resData.data

                            balanceLog && dispatch(addMessageToast({
                                status,
                                message
                            }))
                            break
                        }
                    case "Binance_V3":
                    case "Binance_V1": {
                        const resData = await balanceWalletBinance({
                            amount,
                            futureLarger,
                            botID
                        })

                        const { status, message } = resData.data

                        balanceLog && dispatch(addMessageToast({
                            status,
                            message
                        }))
                        break

                }
            }

            setTimeout(() => {
                getAll()
            }, 1000)
        }
            else {
        dispatch(addMessageToast({
            status: 200,
            message: "Saving Successful"
        }))
    }

} catch (error) {
    balanceLog && dispatch(addMessageToast({
        status: 500,
        message: "Balance Wallet Error",
    }))
}

await updateBot({
    id: botID,
    data: {
        spotSavings: spotSaving
    }
})
setLoadingAll(false)

    }

const getAll = async (balance = false) => {
    setLoadingAll(true)
    const botData = await handleGetBotSaving()
    if (balance) {
        await handleWalletBalance({
            botDataInput: botData,
            balanceLog: false
        })
    }
    else {

        const futureAvailable = handleGetFutureAvailable(botData)
        const spotTotal = handleGetSpotTotal(botData)
        await Promise.all([futureAvailable, spotTotal])

        setOpenConfigBalance({
            dataChange: false,
            isOpen: false
        })
        setOpenTransfer({
            dataChange: false,
            isOpen: false
        })
    }
    setLoadingAll(false)
}

const handleBalance = () => {
    switch (botData?.botType) {
        case "ByBit_V3":
        case "ByBit_V1":
        case "Binance_V3":
        case "Binance_V1": {
            return formatNumber(futureAvailable + spotTotal)
        }
        case "OKX_V1":
        case "OKX_V3":
            {
                return formatNumber(spotTotal + tradingAvailable)
            }
    }

}


useEffect(() => {
    getAll()
}, []);

useEffect(() => {
    (openTransfer.dataChange || openConfigBalance.dataChange) && getAll(openConfigBalance.dataChange)
}, [openTransfer, openConfigBalance]);

return (
    <div className={styles.overview}>
        <div className={styles.overviewHeader}>
            <p className={styles.text}>Balance : {handleBalance()} $</p>
        </div>

        <div className={styles.overviewInfo}>
            <div className={styles.overviewInfoList}>


                <div className={styles.overviewInfoListItem}>
                    <p className={styles.label}>Funding Available</p>
                    <p>{formatNumber(spotTotal - spotSaving)} $</p>
                </div>

                <div className={styles.overviewInfoListItem}>
                    <p className={styles.label}>Funding Savings</p>

                    {/* <CurrencyFormat
                            value={spotSaving}
                            thousandSeparator={true}
                            isAllowed={({ floatValue }) => {
                                if (floatValue) {

                                    return formatNumber(floatValue) <= formatNumber(spotTotal) && floatValue > 0
                                }
                                return true
                            }}
                            prefix={'$'}
                            style={{
                                padding: "6px",
                                borderRadius: "6px",
                                outline: "none",
                                border: "1px solid #cbcbcb",
                                overflow: "hidden"
                            }}
                            onValueChange={values => {
                                const { value } = values;
                                +value <= spotTotal ? setSpotSaving(+value) : setSpotSaving(spotTotal)
                            }}
                        /> */}
                    <TextField
                        size="small"
                        value={spotSaving}
                        type='number'
                        onChange={e => {
                            const value = e.target.value;
                            value <= spotTotal ? setSpotSaving(value) : setSpotSaving(spotTotal)
                        }}
                    />
                </div>

                <div className={styles.overviewInfoListItem}>
                    <p className={styles.label}>Funding Total</p>
                    <p>{formatNumber(spotTotal)} $</p>
                </div>
            </div>
            <div className={styles.overviewInfoList}>


                <div className={styles.overviewInfoListItem}>
                    <p className={styles.label}>Unified Available</p>
                    <p>{formatNumber(futureAvailable)} $</p>
                </div>

                {
                    (
                        botData?.botType == "OKX_V1" ||
                        botData?.botType == "OKX_V3"

                    ) &&
                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Trading Available</p>
                        <p>{formatNumber(tradingAvailable)} $</p>
                    </div>}

            </div>
        </div>

        <div className={styles.overviewBtnAction}>
            <LoadingButton
                className={styles.btn}
                size="small"
                variant="contained"
                startIcon={<AccountBalanceWalletIcon />}
                onClick={() => {
                    setOpenTransfer({
                        isOpen: true,
                        dataChange: false,
                    })
                }}
                loading={loadingAll}
                sx={{
                    ".MuiLoadingButton-label": {
                        fontSize: "13px !important",
                    }
                }}
            >
                Transfer
            </LoadingButton>
            <LoadingButton
                className={styles.btn}
                color='info'
                size="small"
                variant="contained"
                startIcon={<SavingsIcon />}
                onClick={handleWalletBalance}
                loading={loadingAll}
                sx={{
                    ".MuiLoadingButton-label": {
                        fontSize: "13px !important",
                    }
                }}
            >
                Savings
            </LoadingButton>
            <LoadingButton
                className={styles.btn}
                color='inherit'
                size="small"
                variant="contained"
                startIcon={<ToggleOnIcon />}
                onClick={() => {
                    setOpenConfigBalance({
                        dataChange: false,
                        isOpen: true,
                    })
                }}
                loading={loadingAll}
                sx={{
                    ".MuiLoadingButton-label": {
                        fontSize: "13px !important",
                    }
                }}
            >
                Config
            </LoadingButton>
        </div>


        {openTransfer.isOpen && <Transfer
            open={openTransfer}
            botID={botID}
            onClose={(data) => {
                setOpenTransfer(data)
            }}
            spotAvailableMax={spotTotal - spotSaving}
            futureAvailableMax={futureAvailable}
            botData={botData}
        />}
        {openConfigBalance.isOpen && (
            <ConfigBalance
                botID={botID}
                onClose={(data) => {
                    setOpenConfigBalance(data)
                }}
                botData={botData}
            />
        )}
        {/* 
            {openSavings && <Savings
                open={openSavings}
                onClose={() => {
                    setOpenSavings(false)
                }}
            />} */}

        {/* {openEditSpotSavings &&
                <DialogCustom
                    open={true}
                    onClose={closeDialogSotSaving}
                    dialogTitle='Change Spot Saving'
                    onSubmit={handleSubmit(handleChangeSpotSaving)}
                >
                    <form className={styles.dialogForm}>
                        <FormControl style={{
                            width: "100%"
                        }}>
                            <FormLabel style={{
                                marginBottom: "6px"
                            }}>
                                Spot Savings
                            </FormLabel>
                            <TextField
                                {
                                ...register(
                                    "spotSavings",
                                    {
                                        validate: value => value <= spotTotal || "The value cannot be greater than Spot Total"
                                    })
                                }
                                type="number"
                                size="small"
                            />
                            {errors.spotSavings?.type === 'validate' && <p className="formControlErrorLabel">{errors.spotSavings.message}</p>}
                        </FormControl>
                    </form>
                </DialogCustom>
            } */}
    </div>
);
}

export default Wallet;