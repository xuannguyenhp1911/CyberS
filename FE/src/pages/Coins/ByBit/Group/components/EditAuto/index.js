import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllCoin } from "../../../../../../services/Coins/ByBit/coinFuturesService";
import { updateGroupCoin } from "../../../../../../services/Coins/ByBit/groupCoinV3Service";

function EditAuto({
    onClose,
    dataInput
}, ref) {
    
    const selectModeList = ["Auto", "Auto-Up", "Auto-Down"]
    const [SymbolList, setSymbolList] = useState(dataInput?.symbolList || [])
    const [selectedMode, setSelectedMode] = useState(dataInput.selectedMode);
    const [sizeAuto, setSizeAuto] = useState(dataInput.size);


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

        if (SymbolList.length > 0 && sizeAuto > 0) {

            try {

                const res = await updateGroupCoin({
                    data: {
                        ...dataInput,
                        ...formData,
                        selectedMode,
                        size:sizeAuto,
                        name: formData.name.trim(),
                        symbolList: SymbolList.map(item => item.value)
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
                        value={dataInput.forType}
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

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Quantity</FormLabel>
                    <TextField
                        size="small"
                        defaultValue={sizeAuto}
                        onChange={e => { setSizeAuto(e.target.value) }}
                    />
                    {isSubmitted && sizeAuto < 1 && <p className="formControlErrorLabel">Required.</p>}

                </FormControl>

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