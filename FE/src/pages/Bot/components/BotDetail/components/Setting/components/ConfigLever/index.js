import { TextField, InputAdornment, FormLabel, FormControl, MenuItem } from "@mui/material";
import DialogCustom from "../../../../../../../../components/DialogCustom";
import { useForm } from "react-hook-form";
import styles from "./ConfigLever.module.scss"
import { useMemo } from "react";

function ConfigLever({
    handleSetLever,
    openConfigLever,
    onClose
}) {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const marketList = useMemo(() => {
        switch (openConfigLever) {
            case "Futures": {
                return [
                    {
                        name: "Futures",
                        value: "Futures"
                    }
                ]
            }
            default: {
                return [
                    {
                        name: "Margin",
                        value: "Spot"
                    }, {
                        name: "Futures",
                        value: "Futures"
                    }
                ]
            }
        }
    }, [openConfigLever])

    
    return (

        <DialogCustom
            open={true}
            onClose={onClose}
            onSubmit={handleSubmit(handleSetLever)}
            dialogTitle="Set Lever"
        >
            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Market</FormLabel>
                    <TextField
                        select
                        variant="outlined"
                        defaultValue={marketList[0].value}
                        size="small"
                        {...register("market", { required: true })}
                    >
                        {
                            marketList.map(item => (
                                <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                            ))
                        }
                    </TextField>
                </FormControl>
                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Lever</FormLabel>
                    <TextField
                        type='number'
                        size='small'
                        InputProps={{
                            endAdornment: <InputAdornment position="end">
                                x
                            </InputAdornment>,
                        }}
                        defaultValue={openConfigLever == "Futures" ? 20 : 10}
                        {...register("lever", { required: true, min: 1 })}
                    />
                    {errors.lever?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                    {errors.lever?.type === "min" && <p className="formControlErrorLabel">Min: 1</p>}
                </FormControl>
            </form>
        </DialogCustom >
    );
}

export default ConfigLever;