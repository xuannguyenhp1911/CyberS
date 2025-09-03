import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { memo, useRef, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { getAllCoin } from "../../../../services/Coins/ByBit/coinFuturesService";
import { getAllInstrumentOKXV1 } from "../../../../services/Coins/OKX/coinService";
import { getAllInstrumentOKXV1Futures } from "../../../../services/Coins/OKX/coinFuturesService";
import { createCoinsBlock } from "../../../../services/coinsBlockService";

function AddBot({
    onClose,
    botTypeList,
    dataCheckExitsObject,
    applyAllCoinsBlacklist
}, ref) {

    const [botTypeSelected, setBotTypeSelected] = useState("");
    const [marketByBotTypeSelected, setMarketByBotTypeSelected] = useState("");
    const [marketByBotType, setMarketByBotType] = useState([]);
    const [symbolList, setSymbolList] = useState([]);
    const [symbolListSelected, setSymbolListSelected] = useState([]);
    const dispatch = useDispatch();

    const newBotDataRef = useRef()

    const handleGetVersionByBotType = async (botType) => {
        try {
            switch (botType) {
                case "ByBit_V3": {
                    setMarketByBotType(["Futures"])
                    break;
                }
                case "OKX_V1": {
                    setMarketByBotType(["Spot", "Margin", "Futures"])
                    break;
                }
                case "OKX_V3": {
                    setMarketByBotType(["Futures"])
                    break;
                }
            }
        } catch (error) {

        }
    }

    const handleGetSymbolList = async (market) => {

        if (!dataCheckExitsObject?.[botTypeSelected]?.[market]) {
            try {
                switch (botTypeSelected) {
                    case "ByBit_V3": {
                        try {
                            const res = await getAllCoin()
                            const { data: symbolListDataRes } = res.data
                            const newSymbolList = symbolListDataRes.map(item => ({ name: item.symbol, value: item.symbol }))
                            setSymbolList(newSymbolList)
                        }
                        catch (err) {
                            dispatch(addMessageToast({
                                status: 500,
                                message: "Get All Symbol Error",
                            }))
                        }
                        break
                    }
                    case "OKX_V1": {
                        switch (market) {
                            case "Spot": {
                                try {
                                    const res = await getAllInstrumentOKXV1()
                                    const { data: symbolListDataRes } = res.data

                                    const newSymbolList = symbolListDataRes.reduce((pre, cur) => {
                                        const symbol = cur.symbol
                                        if (cur.market == "Spot") {
                                            pre.push({ name: symbol, value: symbol })
                                        }
                                        return pre
                                    }, [])
                                    setSymbolList(newSymbolList)
                                }
                                catch (err) {
                                    dispatch(addMessageToast({
                                        status: 500,
                                        message: "Get All Symbol Error",
                                    }))
                                }
                                break
                            }
                            case "Margin": {
                                try {
                                    const res = await getAllInstrumentOKXV1()
                                    const { data: symbolListDataRes } = res.data

                                    const newSymbolList = symbolListDataRes.reduce((pre, cur) => {
                                        const symbol = cur.symbol
                                        if (cur.market == "Margin") {
                                            pre.push({ name: symbol, value: symbol })
                                        }
                                        return pre
                                    }, [])
                                    setSymbolList(newSymbolList)
                                }
                                catch (err) {
                                    dispatch(addMessageToast({
                                        status: 500,
                                        message: "Get All Symbol Error",
                                    }))
                                }
                                break
                            }
                            case "Futures": {
                                try {
                                    const res = await getAllInstrumentOKXV1Futures()
                                    const { data: symbolListDataRes } = res.data
                                    const newSymbolList = symbolListDataRes.reduce((pre, cur) => {
                                        const symbol = cur.symbol
                                        pre.push({ name: symbol, value: symbol })
                                        return pre
                                    }, [])
                                    setSymbolList(newSymbolList)
                                }
                                catch (err) {
                                    dispatch(addMessageToast({
                                        status: 500,
                                        message: "Get All Symbol Error",
                                    }))
                                }
                                break
                            }
                        }
                        break
                    }
                    case "OKX_V3": {
                        try {
                            const res = await getAllInstrumentOKXV1Futures()
                            const { data: symbolListDataRes } = res.data
                            const newSymbolList = symbolListDataRes.reduce((pre, cur) => {
                                const symbol = cur.symbol
                                pre.push({ name: symbol, value: symbol })
                                return pre
                            }, [])
                            setSymbolList(newSymbolList)
                        }
                        catch (err) {
                            dispatch(addMessageToast({
                                status: 500,
                                message: "Get All Symbol Error",
                            }))
                        }
                        break
                    }
                }
            } catch (error) {

            }
        }
        else {
            dispatch(addMessageToast({
                status: 400,
                message: "Coin Block Exist",
            }))
        }
    }
    const handleSubmitAddBot = async formData => {
        if (symbolListSelected.length > 0) {
            try {
                const res = await createCoinsBlock({
                    botType: botTypeSelected,
                    Market: marketByBotTypeSelected,
                    SymbolList: symbolListSelected.map(item => item.value)
                })

                const { message, data: resData, status } = res.data

                resData && (newBotDataRef.current = resData)
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
            catch (err) {
                console.log(err);

                dispatch(addMessageToast({
                    status: 500,
                    message: "Add Coins Error",
                }))
            }
            closeDialog()
        }

    }
    const handleSubmitAddBotMore = async formData => {
        if (symbolListSelected.length > 0) {
            try {
                const newSymbolList = symbolListSelected.map(item => item.value)
                const dataInput = {
                    botType: botTypeSelected,
                    Market: marketByBotTypeSelected,
                }
                const res = await createCoinsBlock({
                    ...dataInput,
                    SymbolList: newSymbolList
                })

                const { message, data: resData, status } = res.data

                resData && (newBotDataRef.current = resData)
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
                applyAllCoinsBlacklist({
                    ...dataInput,
                    SymbolList: newSymbolList
                })
            }
            catch (err) {
                console.log(err);

                dispatch(addMessageToast({
                    status: 500,
                    message: "Add Coins Error",
                }))
            }
            closeDialog()
        }

    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: newBotDataRef.current
        })
    }

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmitAddBot}
            dialogTitle="Add"
            submitBtnText="Add"
            addMore
            addMoreText="Apply All"
            addMoreFuntion={handleSubmitAddBotMore}
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <Select
                        size="small"
                        value={botTypeSelected}
                        onChange={(e) => {
                            const botType = e.target.value
                            handleGetVersionByBotType(botType)
                            setBotTypeSelected(botType)
                            setMarketByBotTypeSelected("")
                            setSymbolListSelected([])
                            setSymbolList([])
                        }}
                    >
                        {
                            botTypeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Market</FormLabel>
                    <Select
                        size="small"
                        value={marketByBotTypeSelected}
                        onChange={(e) => {
                            const market = e.target.value
                            setMarketByBotTypeSelected(market)
                            handleGetSymbolList(market)
                            setSymbolListSelected([])
                            setSymbolList([])
                        }}
                    >
                        {
                            marketByBotType.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                    {!marketByBotTypeSelected && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={symbolListSelected}
                        onChange={(e, value) => {
                            setSymbolListSelected(value)
                        }}
                        disableCloseOnSelect
                        options={symbolList}
                        size="small"
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        getOptionLabel={(option) => option.name}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Select..." />
                        )}
                        renderOption={(props, option, { selected, index }) => (
                            <>
                                {index === 0 && (
                                    <>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolListSelected(symbolList)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setSymbolListSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected}
                                    />
                                    {option.name.split("-")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >
                    </Autocomplete>
                    {!symbolListSelected.length && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>
            </form>
        </DialogCustom >
    );
}

export default memo(AddBot)