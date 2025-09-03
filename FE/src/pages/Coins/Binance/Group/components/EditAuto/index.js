import { syncCoin as syncCoinBinance } from "../../../../../../services/Coins/Binance/coinFuturesService";
import { Autocomplete, Button, Checkbox, FormControl, FormLabel, ListItemText, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllCoin } from "../../../../../../services/Coins/Binance/coinFuturesService";
import { updateGroupCoin } from "../../../../../../services/Coins/Binance/groupCoinV3Service";
import useDebounce from "../../../../../../hooks/useDebounce";
import { syncInstrumentOKXV1Futures } from "../../../../../../services/Coins/OKX/coinFuturesService";
import { syncCoin } from "../../../../../../services/Coins/ByBit/coinFuturesService";

function EditAuto({
    onClose,
    dataInput
}, ref) {
    
    const selectModeList = ["Auto", "Auto-Up", "Auto-Down", "Auto-Platform"]
    const [SymbolList, setSymbolList] = useState(dataInput?.symbolList || [])
    const [selectedMode, setSelectedMode] = useState(dataInput.selectedMode);
    const [sizeAuto, setSizeAuto] = useState(dataInput.size);
    const platformList = ["ByBit", "OKX"]
    const [platformValue, setPlatformValue] = useState(dataInput.Platform);
    const [gettingCoin, setgettingCoin] = useState(false);

    const symbolListDefault = useRef([])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted }
    } = useForm();

    const dispatch = useDispatch();


    const handleGetSymbolList = async () => {
        try {
            const res = await getAllCoin()
            const { data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    name: item.symbol,
                    value: item.symbol,
                }))
            symbolListDefault.current = newSymbolList

            if (sizeAuto) {

                switch (selectedMode) {
                    case "Auto":
                        setSymbolList([
                            ...symbolListDefault.current.slice(0, sizeAuto),
                            ...symbolListDefault.current.slice(sizeAuto * -1),
                        ])
                        break
                    case "Auto-Up":
                        setSymbolList(symbolListDefault.current.slice(0, sizeAuto))
                        break
                    case "Auto-Down":
                        setSymbolList(symbolListDefault.current.slice(sizeAuto * -1))
                        break
                }
            } else {
                setSymbolList([])
            }
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSubmitAddBot = async formData => {
        if (selectedMode == "Auto-Platform" && platformValue.length < 0) {
            return
        }
        if (SymbolList.length > 0 && sizeAuto > 0) {

            try {

                const res = await updateGroupCoin({
                    data: {
                        ...dataInput,
                        ...formData,
                        selectedMode,
                        size:sizeAuto,
                        name: formData.name.trim(),
                        symbolList: SymbolList.map(item => item.value),
                    Platform: platformValue
                    },
                    groupCoinID: dataInput._id
                })
                const { message, data: resData, status } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Update Error",
                }))
            }
            closeDialog(true)
        }
    }

    const closeDialog = (dataChange = false) => {
        onClose({
            isOpen: false,
            dataChange
        })
        reset()
    }

    const handleChangePlatform = (event) => {
        const {
            target: { value },
        } = event;
        setPlatformValue(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };
    
    const platformListDebounce = useDebounce(platformValue, 500)

    const handleGetPlatformCoinList = async (list = []) => {
        setgettingCoin(true)

        let listCoinBinance = []
        const res = await syncCoinBinance()
        const { status, data } = res.data
        if (status == 200) {
            listCoinBinance = data.list.map(item => item.symbol?.split("USDT")[0])
        }

        try {
            for (const platform of list) {
                switch (platform) {
                    case "ByBit": {
                        const res = await syncCoin()
                        const { status, data } = res.data
                        if (status == 200) {
                            const list = data.list.map(item => item.symbol?.split("USDT")[0])
                            listCoinBinance = listCoinBinance.filter(item => list.includes(item))
                        }
                        break
                    }
                    case "OKX": {
                        const res = await syncInstrumentOKXV1Futures()
                        const { status, data } = res.data

                        if (status == 200) {
                            const list = data.list.map(item => item.symbol?.split("-USDT")[0])
                            listCoinBinance = listCoinBinance.filter(item => list.includes(item))
                        }
                        break
                    }

                }
            }
        } catch (error) {

        }
        setgettingCoin(false)

        setSymbolList(listCoinBinance.map(item => ({
            name: `${item}USDT`,
            value: `${item}USDT`
        })))

    }
    useEffect(() => {
        // handle get list coin platform
        if (platformListDebounce?.length > 0) {
            handleGetPlatformCoinList(platformListDebounce)
        }
    }, [platformListDebounce]);
    
    useEffect(() => {
        handleGetSymbolList()
    }, []);

    useEffect(() => {

        if (sizeAuto) {

            switch (selectedMode) {
                case "Auto":
                    setSymbolList([
                        ...symbolListDefault.current.slice(0, sizeAuto),
                        ...symbolListDefault.current.slice(sizeAuto * -1),
                    ])
                    break
                case "Auto-Up":
                    setSymbolList(symbolListDefault.current.slice(0, sizeAuto))
                    break
                case "Auto-Down":
                    setSymbolList(symbolListDefault.current.slice(sizeAuto * -1))
                    break
            }
        } else {
            setSymbolList([])
        }
    }, [sizeAuto, selectedMode]);

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            loading={gettingCoin}
            dialogTitle="Edit Auto"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("name", {
                            required: true,
                        })}
                        defaultValue={dataInput.name}
                        size="small"
                    />
                    {errors.name?.type === "required" && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>For Type</FormLabel>
                    <TextField
                        size="small"
                        value = "OnlyPairs"
                        disabled
                    >
                    </TextField>
                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Mode</FormLabel>
                    <Select
                        size="small"
                        defaultValue={selectedMode}
                        onChange={e => { setSelectedMode(e.target.value) }}
                    >
                        {
                            selectModeList.map(item => (
                                <MenuItem value={item} key={item}>{item}</MenuItem>
                            ))
                        }
                    </Select>
                    {!selectedMode && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

                {
                    selectedMode == "Auto-Platform" ? (
                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Platform</FormLabel>
                            <Select
                                size="small"
                                multiple
                                value={platformValue}
                                onChange={handleChangePlatform}
                                renderValue={(selected) => selected.join(', ')}
                            // onChange={e => { setSelectedMode(e.target.value) }}
                            >
                                {platformList.map((name) => (
                                    <MenuItem key={name} value={name}>
                                        <Checkbox checked={platformValue.includes(name)} />
                                        <ListItemText primary={name} />
                                    </MenuItem>
                                ))}

                            </Select>
                            {isSubmitted && !platformValue.length && <p className="formControlErrorLabel">Required.</p>}
                        </FormControl>
                    ) : (
                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Quantity</FormLabel>
                            <TextField
                                size="small"
                                type="number"
                                defaultValue={sizeAuto}
                                onChange={e => { setSizeAuto(e.target.value) }}
                            />
                            {isSubmitted && sizeAuto < 1 && <p className="formControlErrorLabel">Required.</p>}

                        </FormControl>
                    )
                }


                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        disableCloseOnSelect
                        value={SymbolList}
                        options={SymbolList}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Select..." />
                        )}
                        renderOption={(props, option, { selected, index }) => (
                            <li {...props}>
                                <Checkbox
                                    checked={true}
                                    disabled
                                />
                                {option.name.split("USDT")[0]}
                            </li>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >
                    </Autocomplete>
                    {isSubmitted && !SymbolList.length && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(EditAuto)