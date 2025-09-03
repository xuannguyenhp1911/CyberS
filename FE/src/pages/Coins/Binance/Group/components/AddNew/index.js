import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllCoin } from "../../../../../../services/Coins/Binance/coinFuturesService";
import { createGroupCoin } from "../../../../../../services/Coins/Binance/groupCoinV3Service";

function AddNew({
    onClose,
}, ref) {


    const forTypeList = ["OnlyPairs", "Blacklist"]
    const [SymbolList, setSymbolList] = useState([])
    const [SymbolListSelected, setSymbolListSelected] = useState([])


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
            setSymbolList(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSubmitAddBot = async formData => {

        if (SymbolListSelected.length > 0) {

            try {
                const res = await createGroupCoin({
                    ...formData,
                    name: formData.name.trim(),
                    auto: false,
                    symbolList: SymbolListSelected.map(item => item.value)
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
    const handleSubmitAddBotMore = async formData => {

        if (SymbolListSelected.length > 0) {

            try {
                const res = await createGroupCoin({
                    ...formData,
                    name: formData.name.trim(),
                    auto: false,
                    symbolList: SymbolListSelected.map(item => item.value)
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

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Add Manual"
            addMore
            addMoreFuntion={handleSubmit(handleSubmitAddBotMore)}
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

                <FormControl className={styles.formControl}>
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

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={SymbolListSelected}
                        disableCloseOnSelect
                        options={SymbolList}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setSymbolListSelected(value)
                        }}
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
                                                setSymbolListSelected(SymbolList)
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
                                    {option.name.split("USDT")[0]}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {isSubmitted && !SymbolListSelected.length && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(AddNew)