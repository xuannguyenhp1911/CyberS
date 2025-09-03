import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import styles from "./TreeChild.module.scss"
import { TableRow, TableCell, Switch, Button, FormControl, FormLabel, InputAdornment, TextField, Checkbox } from '@mui/material';
import clsx from 'clsx';
import { useState, useCallback, memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import DialogCustom from '../../../../../../../../../components/DialogCustom';
import { handleCheckAllCheckBox, formatNumberString } from '../../../../../../../../../functions';
import { addMessageToast } from '../../../../../../../../../store/slices/Toast';
import UpdateStrategy from '../../UpdateStrategy';
import { updateStrategiesSpotByID, deleteStrategiesItemSpot } from '../../../../../../../../../services/Configs/OKX/V1/marginService';
import { useForm } from 'react-hook-form';
import { setLeverSymbolBot } from '../../../../../../../../../services/botService';


function TreeChild({
    treeData,
    treeNode,
    dataCheckTreeSelectedRef,
    setDataCheckTree,
    dataCheckTreeDefaultRef,
    leverByBotAndSymbol
}) {

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();


    const leverID = `${treeNode?.botID?._id}-${treeData.value}`

    const [leverData, setLeverData] = useState(leverByBotAndSymbol[leverID]);

    const [openDeleteTreeItem, setOpenDeleteTreeItem] = useState({
        isOpen: false,
        data: {
            id: "",
            parentID: "",
        }
    });
    const [openUpdateStrategy, setOpenUpdateStrategy] = useState(
        {
            isOpen: false,
            dataChange: false,
            data: ""
        }
    );

    const [openSetLever, setOpenSetLever] = useState(false);

    const dispatch = useDispatch();

    const closeDeleteDialog = () => {
        setOpenDeleteTreeItem({
            isOpen: false,
            data: {
                id: "",
                parentID: "",
            }
        })
    }


    const handleUpdateDataAfterSuccess = useCallback((newData) => {

        handleCheckAllCheckBox(false)

        setDataCheckTree(dataCheckTree => dataCheckTree.map(data => {
            if (data._id === treeData._id) {
                return {
                    ...treeData,
                    children: treeData.children.map(treeItem => {
                        if (treeItem.value === treeNode.value) {
                            return newData
                        }
                        return treeItem
                    })
                }
            }
            return data
        }))
        dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(data => {
            if (data._id === treeData._id) {
                return {
                    ...treeData,
                    children: treeData.children.map(treeItem => {
                        if (treeItem.value === treeNode.value) {
                            return newData
                        }
                        return treeItem
                    })
                }
            }
            return data
        })

    }, [treeData, treeNode, dataCheckTreeSelectedRef])

    const handleDeleteStrategiesItem = async ({ id, parentID }) => {
        try {
            const res = await deleteStrategiesItemSpot({
                id: id,
                parentID,
            })
            const { status, message } = res.data

            if (status === 200) {
                setDataCheckTree(dataCheckTree => dataCheckTree.map(data => {
                    if (data._id === treeData._id) {
                        return {
                            ...treeData,
                            children: treeData.children.filter(treeItem => treeItem.value !== treeNode.value)
                        }
                    }
                    return data
                }))

                dataCheckTreeDefaultRef.current = dataCheckTreeDefaultRef.current.map(data => {
                    if (data._id === treeData._id) {
                        return {
                            ...treeData,
                            children: treeData.children.filter(treeItem => treeItem.value !== treeNode.value)
                        }
                    }
                    return data
                })
            }

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Delete Error",
            }))
        }
        closeDeleteDialog()
    }

    const handleActiveStrategy = async ({
        id,
        parentID,
        newData,
        symbol
    }) => {
        try {
            const res = await updateStrategiesSpotByID({
                id: id,
                data: {
                    parentID,
                    newData,
                    symbol,
                }
            })
            const { status, message } = res.data

            if (status === 200) {
                handleUpdateDataAfterSuccess(newData)
            }

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Active Error",
            }))
        }
    }

    const handleSetLeverSymbolBot = async (leverData) => {
        try {
            const botData = treeNode.botID
            const botID = botData._id
            const symbol = treeData.value
            const PositionSide = treeNode.PositionSide
            const leverID = `${botID}-${symbol}-${PositionSide}`
            const lever  = leverData.lever
            
            const res = await setLeverSymbolBot({
                botID,
                symbol,
                lever,
                side: PositionSide == "Long" ? "Buy" : "Sell",
                leverID,
                serverIP: botData.serverIP
            })
            const { status, message } = res.data

            if (status === 200) {
                const newLever = PositionSide == "Long" ? {
                    cross: lever,
                    isolated: leverData.isolated
                } : {
                    cross: leverData.cross,
                    isolated: lever
                }
                setLeverData(newLever)
            }

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))


        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Set Lever Error",
            }))
        }
        setOpenSetLever(false)
    }

    useEffect(() => {
        setLeverData(leverByBotAndSymbol[leverID])
    }, [leverByBotAndSymbol]);
    
    return (
        <>
            <TableRow className={styles.treeChild} key={treeNode.value} style={{
                backgroundColor: treeNode.scannerID ? "#b3ccfb3b" : undefined
            }} >
                <TableCell
                    style={{
                        lineHeight: "100%"
                    }}
                >
                    <input
                        type='checkbox'
                        className={clsx("nodeItemSelected", `nodeItemSelected-${treeData._id}`, styles.checkboxStyle)}
                        onClick={(e) => {
                            const check = e.target.checked;
                            if (check) {
                                dataCheckTreeSelectedRef.current.push(JSON.stringify({
                                    ...treeNode,
                                    parentID: treeData._id
                                }))
                            }
                            else {
                                const newDataCheckTreeSelected = [];
                                const targetString = JSON.stringify({ ...treeNode, parentID: treeData._id });

                                // for (let i = 0; i < dataCheckTreeSelectedRef.current.length; i++) {
                                //     const currentItem = dataCheckTreeSelectedRef.current[i];
                                //     if (currentItem !== targetString) {
                                //         newDataCheckTreeSelected.push(currentItem);
                                //     }
                                // }

                                // dataCheckTreeSelectedRef.current = newDataCheckTreeSelected;
                                dataCheckTreeSelectedRef.current = dataCheckTreeSelectedRef.current.filter(currentItem => currentItem !== targetString);

                            }
                        }}
                    />
                </TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                >
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        color: "#3277d5",
                        marginLeft: "-10px "
                    }}>
                        <Switch
                            size='small'
                            checked={treeNode.IsActive}
                            onChange={(e) => {
                                handleActiveStrategy({
                                    id: treeNode._id,
                                    parentID: treeData._id,
                                    symbol: treeData.value,
                                    newData: { ...treeNode, IsActive: e.target.checked }
                                })
                            }}
                        />
                        {
                            !treeNode.IsActive && (
                                <DeleteOutlineIcon
                                    className={styles.icon}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setOpenDeleteTreeItem({
                                            isOpen: true,
                                            data: {
                                                id: treeNode._id,
                                                parentID: treeData._id
                                            }
                                        })
                                    }}
                                    style={{
                                        marginRight: "6px"
                                    }}
                                />
                            )
                        }
                        <EditIcon
                            className={styles.icon}
                            onClick={e => {
                                e.preventDefault()
                                setOpenUpdateStrategy({
                                    ...openUpdateStrategy,
                                    isOpen: true,
                                    data: {
                                        treeNode: {
                                            ...treeNode,
                                            parentID: treeData._id,
                                        },
                                        symbolValue: treeData.value
                                    }
                                })
                            }} />
                    </div>
                </TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                    style={{
                        whiteSpace: "nowrap",
                    }}>
                    {treeNode?.botID?.botName}
                </TableCell> 
                <TableCell className={styles.tableBodyCell} style={{ minWidth: "100px" }}>
                    <Button
                        color={treeNode.PositionSide === "Long" ? "success" : "error"}
                        variant='contained'
                        size='small'
                        onClick={() => {
                            setOpenSetLever(true)
                        }}
                    >
                        {treeNode.PositionSide}
                        {
                            leverData?.cross > 0 && treeNode.PositionSide === "Long" &&
                            <span className={styles.lever}>{leverData?.cross}x</span>
                        }
                        {
                            leverData?.isolated > 0 && treeNode.PositionSide === "Short" &&
                            <span className={styles.lever}>{leverData?.isolated}x</span>

                        }
                    </Button>
                </TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.OrderChange}</TableCell>
                <TableCell className={styles.tableBodyCell}>{formatNumberString(treeNode.Amount)}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.AmountAutoPercent}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.AmountExpire}</TableCell>
                <TableCell className={styles.tableBodyCell}>{formatNumberString(treeNode.Limit)}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Expire}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.AmountIncreaseOC}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Adaptive && <CheckIcon />}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Reverse && <CheckIcon />}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.XOCPump}x</TableCell>
                <TableCell className={styles.tableBodyCell}>{formatNumberString(treeNode.volume24h)}</TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                    style={{
                        whiteSpace: "nowrap",
                    }}
                >{treeNode?.scannerID?.Label}</TableCell>
                 <TableCell className={styles.tableBodyCell}>{treeNode.IsBeta && <Checkbox
                    checked={true}
                    color='warning'
                />}</TableCell>
            </TableRow >
            {
                openDeleteTreeItem.isOpen &&
                <DialogCustom
                    dialogTitle='The action requires confirmation'
                    reserveBtn
                    open={openDeleteTreeItem.isOpen}
                    onClose={closeDeleteDialog}
                    submitBtnText='Confirm'
                    position='center'
                    submitBtnColor='error'
                    backdrop
                    onSubmit={() => {
                        handleDeleteStrategiesItem({
                            id: openDeleteTreeItem.data.id,
                            parentID: openDeleteTreeItem.data.parentID
                        })
                    }}
                >
                    <p>Are you remove this item?</p>
                </DialogCustom>
            }
            {
                openSetLever &&
                <DialogCustom
                    dialogTitle='Set Lever'
                    open={true}
                    onClose={() => { setOpenSetLever(false) }}
                    backdrop
                    onSubmit={handleSubmit(handleSetLeverSymbolBot)}
                >
                    <FormControl className={styles.formControl} style={{ marginBottom: "6px" }}>
                        <FormLabel className={styles.label} style={{ marginBottom: "6px" }}>Lever</FormLabel>
                        <TextField
                            type='number'
                            size='small'
                            defaultValue={10}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">
                                    x
                                </InputAdornment>,
                            }}
                            {...register("lever", { required: true, min: 1 })}
                        />
                        {errors.lever?.type === 'required' && <p className="formControlErrorLabel">Required.</p>}
                        {errors.lever?.type === "min" && <p className="formControlErrorLabel">Min: 1</p>}
                    </FormControl>
                </DialogCustom>
            }

            {
                openUpdateStrategy.isOpen &&

                <UpdateStrategy
                    onClose={(data) => {
                        setOpenUpdateStrategy(data)
                    }}
                    treeNodeValue={openUpdateStrategy.data.treeNode}
                    symbolValue={openUpdateStrategy.data.symbolValue}
                    handleUpdateDataAfterSuccess={handleUpdateDataAfterSuccess}
                />

            }
        </>
    );
}

export default memo(TreeChild);