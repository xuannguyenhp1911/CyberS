import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import DialogCustom from "../../../../components/DialogCustom";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../store/slices/Toast";
import { updateServer } from "../../../../services/serversService";
import { updateCoinsBlock } from "../../../../services/coinsBlockService";
import { getAllCoin } from "../../../../services/Coins/ByBit/coinFuturesService";
import { getAllInstrumentOKXV1Futures } from "../../../../services/Coins/OKX/coinFuturesService";
import { getAllInstrumentOKXV1 } from "../../../../services/Coins/OKX/coinService";

function EditServer({
    onClose,
    botTypeList,
    dataInput,
    applyAllCoinsBlacklist
}, ref) {


    const [symbolList, setSymbolList] = useState([]);
    const [symbolListSelected, setSymbolListSelected] = useState(dataInput.SymbolList.map(item => ({ name: item, value: item })));
    const dispatch = useDispatch();

    const newBotDataRef = useRef()


    const handleGetSymbolList = async (market) => {

        try {
            switch (dataInput.botType) {
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
                    switch (dataInput.Market) {
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
    const handleSubmitAddBot = async () => {
        if (symbolListSelected.length > 0) {
            try {
                const res = await updateCoinsBlock({
                    id: dataInput.id,
                    data: {
                        SymbolList: symbolListSelected.map(item => item.value)
                    }
                })

                const { message, status } = res.data

                status == 200 && (newBotDataRef.current = true)
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
            catch (err) {
                console.log(err);

                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Coins Error",
                }))
            }
            closeDialog()
        }

    }
    const handleSubmitAddBotMore = async () => {
        if (symbolListSelected.length > 0) {
            try {
                const newSymbolList = symbolListSelected.map(item => item.value)
                const res = await updateCoinsBlock({
                    id: dataInput.id,
                    data: {
                        SymbolList: newSymbolList
                    }
                })

                const { message, status } = res.data

                status == 200 && (newBotDataRef.current = true)
                
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
                    message: "Update Coins Error",
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

    useEffect(() => {
        handleGetSymbolList()
    }, []);

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmitAddBot}
            dialogTitle="Update"
            addMore
            addMoreFuntion={handleSubmitAddBotMore}
            addMoreText="Apply All"
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bot Type</FormLabel>
                    <TextField
                        size="small"
                        value={dataInput.botType}
                        disabled
                    >

                    </TextField>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Market</FormLabel>
                    <TextField
                        size="small"
                        value={dataInput.Market}
                        disabled
                    >
                    </TextField>
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

export default memo(EditServer)