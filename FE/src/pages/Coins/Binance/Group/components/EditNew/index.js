import { Autocomplete, Button, Checkbox, FormControl, FormLabel, MenuItem, Select, TextField } from "@mui/material";
import styles from "./AddBot.module.scss"
import { useForm } from "react-hook-form";
import { memo, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import DialogCustom from "../../../../../../components/DialogCustom";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { getAllCoin } from "../../../../../../services/Coins/Binance/coinFuturesService";
import { updateGroupCoin } from "../../../../../../services/Coins/Binance/groupCoinV3Service";

function EditNew({
    onClose,
    dataInput = []
}, ref) {

    const [showSymbolList, setShowSymbolList] = useState([])
    const [showSymbolListSelected, setShowSymbolListSelected] = useState((dataInput?.symbolList.map(item => ({ name: item, value: item })) || []))


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
            setShowSymbolList(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSubmitAddBot = async formData => {

        if (showSymbolListSelected.length > 0) {

            try {
                const res = await updateGroupCoin({
                    data: {
                        ...dataInput,
                        ...formData,
                        name: formData.name.trim(),
                        symbolList: showSymbolListSelected.map(item => item.value)
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

    return (
        <DialogCustom
            open={true}
            onClose={closeDialog}
            onSubmit={handleSubmit(handleSubmitAddBot)}
            dialogTitle="Edit Manual"
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
                    <FormLabel className={styles.label}>Symbol</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={showSymbolListSelected}
                        disableCloseOnSelect
                        options={showSymbolList}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setShowSymbolListSelected(value)
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
                                                setShowSymbolListSelected(showSymbolList)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setShowSymbolListSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox

                                        checked={selected || showSymbolListSelected.findIndex(item => item.value === option.value) > -1}
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
                    {isSubmitted && !showSymbolListSelected.length && <p className="formControlErrorLabel">Required.</p>}
                </FormControl>

            </form>
        </DialogCustom >
    );
}

export default memo(EditNew)