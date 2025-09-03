import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { FormControl, FormLabel, Autocomplete, TextField, Button, Checkbox, MenuItem, Switch, InputAdornment, CircularProgress } from "@mui/material"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import DialogCustom from "../../../../../../../../components/DialogCustom"
import { addMessageToast } from "../../../../../../../../store/slices/Toast"
import styles from "./CreateStrategy.module.scss"
import { getAllCoin, syncCoin } from "../../../../../../../../services/Coins/ByBit/coinFuturesService"
import { createConfigScanner } from '../../../../../../../../services/Configs/ByBIt/V1/scannerService';
import { getAllSymbolSpot, syncSymbolSpot } from '../../../../../../../../services/Configs/ByBIt/V1/spotService';
import { getAllSymbolSpot as getAllSymbolMargin, syncSymbolSpot as syncSymbolMargin } from '../../../../../../../../services/Configs/ByBIt/V1/marginService';

function CreateStrategy({
    botListInput,
    onClose,
}) {

    const formControlMinValue = 0.01
    const marketList = [
        {
            name: "Margin",
            value: "Margin",
        },
        {
            name: "Spot",
            value: "Spot",
        },
    ]
    const positionSideListDefault = [
        {
            name: "Both",
            value: "Both",
        },
        {
            name: "Long",
            value: "Long",
        },
        {
            name: "Short",
            value: "Short",
        },
    ]



    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitted },
        setValue
    } = useForm();

    const [onlyPairsSelected, setOnlyPairsSelected] = useState([])
    const [blackListSelected, setBlackListSelected] = useState([])
    const [botList, setBotList] = useState([])
    const [loadingSyncCoin, setLoadingSyncCoin] = useState(false);
    const [PositionSideSelected, setPositionSideSelected] = useState("");

    const dataChangeRef = useRef(false)
    const spotDataListRef = useRef([])
    const marginDataListRef = useRef([])
    const positionSideListRef = useRef(positionSideListDefault)

    const [symbolGroupDataList, setSymbolGroupDataList] = useState({
        label: "Margin",
        list: []
    });

    const dispatch = useDispatch()

    const handleGetSpotDataList = async (syncNew = true) => {
        try {
            let newData = spotDataListRef.current
            if (syncNew) {
                const res = await getAllSymbolSpot()
                const { data: symbolListDataRes } = res.data
                newData = symbolListDataRes.map(item => ({ name: item, value: item }))
            }

            setBlackListSelected([])
            setOnlyPairsSelected([])
            setSymbolGroupDataList(
                {
                    label: "Spot",
                    list: newData
                }
            )
            spotDataListRef.current = newData

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleGetMarginDataList = async (syncNew = true) => {
        try {

            let newData = marginDataListRef.current
            if (syncNew) {
                const res = await getAllSymbolMargin()
                const { data: symbolListDataRes } = res.data
                newData = symbolListDataRes.map(item => ({ name: item, value: item }))
            }

            setBlackListSelected([])
            setOnlyPairsSelected([])
            setSymbolGroupDataList(
                {
                    label: "Margin",
                    list: newData
                }
            )
            marginDataListRef.current = newData
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSyncSymbol = async () => {
        if (!loadingSyncCoin) {
            try {
                setLoadingSyncCoin(true)
                let res
                if (symbolGroupDataList.label === "Spot") {
                    res = await syncSymbolSpot()
                    handleGetSpotDataList()
                }
                else {
                    res = await syncSymbolMargin()
                    handleGetMarginDataList()
                }
                const { status, message, data: resData } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))

                setLoadingSyncCoin(false)
            }
            catch (err) {
                setLoadingSyncCoin(false)
                dispatch(addMessageToast({
                    status: 500,
                    message: "Sync Error",
                }))
            }
        }
    }

    const handleSubmitCreate = async data => {

        if (onlyPairsSelected.length > 0 && botList.length > 0) {

            try {
                const res = await createConfigScanner({
                    data: {
                        ...data,
                        PositionSide: PositionSideSelected
                    },
                    botListId: botList.map(item => item.value),
                    Blacklist: blackListSelected.map(item => item.value),
                    OnlyPairs: onlyPairsSelected.map(item => item.value)
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    reset()
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
            closeDialog()
        }
    }

    const handleSubmitCreateWithAddMore = async data => {

        if (onlyPairsSelected.length > 0 && botList.length > 0) {

            try {
                const res = await createConfigScanner({
                    data: {
                        ...data,
                        PositionSide: PositionSideSelected
                    },
                    botListId: botList.map(item => item.value),
                    Blacklist: blackListSelected.map(item => item.value),
                    OnlyPairs: onlyPairsSelected.map(item => item.value)
                })
                const { status, message, data: symbolListDataRes } = res.data

                dispatch(addMessageToast({
                    status: status,
                    message: message
                }))

                if (status === 200) {
                    dataChangeRef.current = true
                }
            }
            catch (err) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Add New Error",
                }))
            }
        }
    }

    const closeDialog = () => {
        onClose({
            isOpen: false,
            dataChange: dataChangeRef.current
        })
        reset()
    }

    useEffect(() => {
        // handleGetSpotDataList()
        handleGetMarginDataList()
    }, []);


    return (
        <DialogCustom
            dialogTitle="Create Config"
            open={true}
            onClose={() => { closeDialog() }}
            onSubmit={handleSubmit(handleSubmitCreate)}
            maxWidth="sm"
            addMore
            addMoreFuntion={handleSubmit(handleSubmitCreateWithAddMore)}
        >

            <form className={styles.dialogForm}>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Bots</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={1}
                        value={botList}
                        disableCloseOnSelect
                        options={botListInput}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBotList(value)
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
                                                setBotList(botListInput)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBotList([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || botList.findIndex(item => item.value === option.value) > -1}
                                    />
                                    {option.name}
                                </li>
                            </>
                        )}
                        renderTags={(value) => {
                            return <p style={{ marginLeft: "6px" }}>{value.length} items selected</p>
                        }}
                    >


                    </Autocomplete>
                    {errors.botID?.type === 'required' && <p className="formControlErrorLabel">The Bot Required.</p>}
                    {isSubmitted && !botList.length && <p className="formControlErrorLabel">The Bot Required.</p>}

                </FormControl>

                <FormControl
                    className={clsx(styles.formControl, styles.formMainDataItem)}
                >
                    <FormLabel className={styles.label}>Label</FormLabel>
                    <TextField
                        variant="outlined"
                        size="small"
                        {...register("Label", { required: true, })}
                    >
                    </TextField>
                    {errors.Label?.type === 'required' && <p className="formControlErrorLabel">The Label Required.</p>}
                </FormControl>

                <div className={styles.formMainData}>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            select
                            label="Market"
                            variant="outlined"
                            defaultValue={marketList[0].value}
                            size="medium"
                            {...register("Market", { required: true, })}
                            onChange={e => {
                                if (e.target.value === "Spot") {
                                    handleGetSpotDataList(!spotDataListRef.current.length)
                                    positionSideListRef.current = [
                                        {
                                            name: "Long",
                                            value: "Long",
                                        }
                                    ]
                                    setPositionSideSelected("Long")
                                }
                                else {
                                    handleGetMarginDataList(!marginDataListRef.current.length)
                                    setPositionSideSelected("")
                                    positionSideListRef.current = positionSideListDefault
                                }
                            }}
                        >
                            {

                                marketList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            select
                            label="Position side"
                            variant="outlined"
                            size="medium"
                            value={PositionSideSelected}
                            onChange={e => {
                                console.log("value", e.target.value);

                                setPositionSideSelected(e.target.value)
                            }}
                        >
                            {
                                positionSideListRef.current.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                        {isSubmitted && !PositionSideSelected && <p className="formControlErrorLabel">The Position Required.</p>}
                    </FormControl>
                </div>
                <FormControl className={styles.formControl}>
                    <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
                        <FormLabel className={styles.label}>Only pairs</FormLabel>
                        <span style={{ marginRight: "6px" }}>
                            {
                                !loadingSyncCoin ?
                                    <CloudSyncIcon
                                        style={{
                                            cursor: "pointer",
                                            color: "#959595"
                                        }}
                                        onClick={handleSyncSymbol} />
                                    :
                                    <CircularProgress style={{ width: "16px", height: "16px" }} />
                            }
                        </span>
                    </div>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={onlyPairsSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setOnlyPairsSelected(value)
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
                                                setOnlyPairsSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setOnlyPairsSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || onlyPairsSelected.findIndex(item => item === option.value) > -1}
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
                    {isSubmitted && !onlyPairsSelected.length && <p className="formControlErrorLabel">The Only pairs Required.</p>}

                </FormControl>

                <FormControl className={styles.formControl}>
                    <FormLabel className={styles.label}>Blacklist</FormLabel>
                    <Autocomplete
                        multiple
                        limitTags={2}
                        value={blackListSelected}
                        disableCloseOnSelect
                        options={symbolGroupDataList.list}
                        size="small"
                        getOptionLabel={(option) => option.name}
                        onChange={(e, value) => {
                            setBlackListSelected(value)
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
                                                setBlackListSelected(symbolGroupDataList.list)
                                            }}
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            color="inherit"
                                            style={{ width: '50%' }}
                                            onClick={() => {
                                                setBlackListSelected([])
                                            }}
                                        >
                                            Deselect All
                                        </Button>
                                    </>
                                )}
                                <li {...props}>
                                    <Checkbox
                                        checked={selected || blackListSelected.findIndex(item => item === option.value) > -1}
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
                    {/* {isSubmitted && !blackListSelected.length && <p className="formControlErrorLabel">The Blacklist Required.</p>} */}

                </FormControl>

                <div className={styles.formMainData}>
                    {/* <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            select
                            label="Market"
                            variant="outlined"
                            defaultValue={marketList[0].value}
                            size="medium"
                            {...register("Market", { required: true, })}
                        >
                            {

                                marketList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl>
                    <FormControl
                        className={clsx(styles.formControl, styles.formMainDataItem)}
                    >
                        <TextField
                            select
                            label="Position side"
                            variant="outlined"
                            defaultValue={positionSideList[0].value}
                            size="medium"
                            {...register("PositionSide", { required: true, })}
                        >
                            {

                                positionSideList.map(item => (
                                    <MenuItem value={item?.value} key={item?.value}>{item?.name}</MenuItem>
                                ))
                            }
                        </TextField>
                    </FormControl> */}


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="OC"
                            variant="outlined"
                            defaultValue={1}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>,
                            }}
                            {...register("OrderChange", { required: true, min: formControlMinValue })}
                        />
                        {errors.OrderChange?.type === 'required' && <p className="formControlErrorLabel">The OC Required.</p>}
                        {errors.OrderChange?.type === "min" && <p className="formControlErrorLabel">The OC must bigger 0.01.</p>}
                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Elastic"
                            variant="outlined"
                            defaultValue={80}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    %
                                </InputAdornment>
                            }}
                            {...register("Elastic")}
                        />

                    </FormControl>


                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Amount"
                            variant="outlined"
                            defaultValue={100}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Amount", { required: true, min: formControlMinValue })}
                        />
                        {errors.Amount?.type === 'required' && <p className="formControlErrorLabel">The Amount Required.</p>}
                        {errors.Amount?.type === "min" && <p className="formControlErrorLabel">The Amount must bigger 0.01.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Numbs"
                            variant="outlined"
                            defaultValue={5}
                            size="medium"
                            // InputProps={{
                            //     endAdornment: <InputAdornment position="end">
                            //         %
                            //     </InputAdornment>
                            // }}
                            {...register("Numbs", { required: true, min: 1 })}
                        />
                        {errors.Numbs?.type === 'required' && <p className="formControlErrorLabel">The Numbs Required.</p>}
                        {errors.Numbs?.type === "min" && <p className="formControlErrorLabel">The Numbs must bigger 1.</p>}

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Expire"
                            variant="outlined"
                            defaultValue={20}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    min
                                </InputAdornment>
                            }}
                            {...register("Expire")}
                        />

                    </FormControl>

                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Limit"
                            variant="outlined"
                            defaultValue={200}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Limit", { required: true, min: formControlMinValue })}
                        />
                        {errors.Limit?.type === 'required' && <p className="formControlErrorLabel">The Limit Required.</p>}
                        {errors.Limit?.type === "min" && <p className="formControlErrorLabel">The Limit must bigger 0.01.</p>}

                    </FormControl>



                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>
                        <TextField
                            type='number'
                            label="Turnover"
                            variant="outlined"
                            defaultValue={4000}
                            size="medium"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    USDT
                                </InputAdornment>
                            }}
                            {...register("Turnover",)}
                        />

                    </FormControl>
                    <FormControl className={clsx(styles.formControl, styles.formMainDataItem)}>

                        <FormLabel className={styles.label}>IsActive</FormLabel>
                        <Switch
                            defaultChecked
                            title="IsActive"
                            {...register("IsActive")}
                        />
                    </FormControl>
                </div>


            </form>
        </DialogCustom>
    );
}

export default CreateStrategy;