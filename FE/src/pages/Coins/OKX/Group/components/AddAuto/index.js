import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { getAllCoin } from "../../../../../../services/Coins/ByBit/coinFuturesService";
import { createGroupCoin } from "../../../../../../services/Coins/OKX/groupCoinService";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllInstrumentOKXV1Futures } from "../../../../../../services/Coins/OKX/coinFuturesService";
import clsx from "clsx";

function AddAuto({
    onClose,
}, ref) {

    const forTypeList = ["OnlyPairs", "Blacklist"]
    const selectModeList = ["Auto", "Auto-Up", "Auto-Down"]
    const marketList = ["V3"]
    const [SymbolList, setSymbolList] = useState([])
    const [sizeAuto, setSizeAuto] = useState(10);
    const [selectedMode, setSelectedMode] = useState(selectModeList[0]);

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
            const res = await getAllInstrumentOKXV1Futures()
            const { data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    name: item.symbol,
                    value: item.symbol,
                }))
            symbolListDefault.current = newSymbolList
            setSymbolList([
                ...symbolListDefault.current.slice(0, sizeAuto),
                ...symbolListDefault.current.slice(sizeAuto * -1),
            ])

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSubmitAddBot = async formData => {

        if (SymbolList.length > 0 && sizeAuto > 0) {

            try {
                const res = await createGroupCoin({
                    ...formData,
                    selectedMode,
                    size: sizeAuto,
                    auto: true,
                    name: formData.name.trim(),
                    symbolList: SymbolList.map(item => item.value),
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
                    message: "Add Error",
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
            dialogTitle="Add Auto"
        >

            <form className={styles.dialogForm}>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Name</FormLabel>
                    <TextField
                        {...register("name", {
                            required: true,
                        })}
                        size="small"
                    />
                    {errors.name?.type === "required" && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>

                <div className={styles.formMainData}>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>For Type</FormLabel>
                        <Select
                            size="small"
                            {...register("forType", {
                                required: true,
                            })}
                            defaultValue={forTypeList[0]}
                        >
                            {
                                forTypeList.map(item => (
                                    <MenuItem value={item} key={item}>{item}</MenuItem>
                                ))
                            }
                        </Select>
                        {errors.forType?.type === "required" && <p className="formControlErrorLabel">Required.</p>}
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>

                        <FormLabel className={styles.label}>Market</FormLabel>
                        <Select
                            size="small"
                            defaultValue={marketList[0]}
                            {...register("market", {
                                required: true,
                            })}
                        >
                            {
                                marketList.map(item => (
                                    <MenuItem value={item} key={item}>{item}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>
                </div>
                <div className={styles.formMainData}>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <FormLabel className={styles.label}>Mode</FormLabel>
                        <Select
                            size="small"
                            defaultValue={selectModeList[0]}
                            onChange={e => { setSelectedMode(e.target.value) }}
                        >
                            {
                                selectModeList.map(item => (
                                    <MenuItem value={item} key={item}>{item}</MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>

                        <FormLabel className={styles.label}>Quantity</FormLabel>
                        <TextField
                            size="small"
                            type="number"
                            defaultValue={sizeAuto}
                            onChange={e => { setSizeAuto(e.target.value) }}
                        />
                        {isSubmitted && sizeAuto < 1 && <p className="formControlErrorLabel">Required.</p>}

                    </FormControl>
                </div>

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
                                {option.name.split("-USDT")[0]}
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

export default memo(AddAuto)