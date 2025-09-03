import WebhookIcon from '@mui/icons-material/Webhook';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import styles from "./TreeChild.module.scss"
import { useDispatch } from 'react-redux';
import { memo, useCallback, useEffect, useState } from 'react';
import { TableRow, TableCell, Switch, FormControlLabel, Checkbox, Button, FormControl, FormLabel, InputAdornment, TextField } from '@mui/material';
import UpdateStrategy from '../../UpdateStrategy';
import clsx from 'clsx';
import DialogCustom from '../../../../../../../../../components/DialogCustom';
import { handleCheckAllCheckBox, formatNumberString } from '../../../../../../../../../functions';
import { deleteStrategiesItem, updateStrategiesByID } from '../../../../../../../../../services/Configs/OKX/V3/configService';
import { addMessageToast } from '../../../../../../../../../store/slices/Toast';
import { useForm } from 'react-hook-form';
import { setLeverSymbolBotFutures } from '../../../../../../../../../services/botService';


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

    const handleSetLeverSymbolBot = async (leverDataNew) => {
        try {
            const botData = treeNode.botID
            const botID = botData._id
            const symbol = treeData.value
            const PositionSide = treeNode.PositionSide
            const leverID = `${botID}-${symbol}-${PositionSide}`
            const lever = leverDataNew.lever
            const tdMode = treeNode.Mode
            const res = await setLeverSymbolBotFutures({
                botID,
                symbol,
                lever,
                side: PositionSide == "Long" ? "Buy" : "Sell",
                tdMode,
                leverID,
                serverIP: botData.serverIP
            })
            const { status, message } = res.data

            if (status === 200) {
                
                const newLever = tdMode == "cross" ? {
                    cross: {
                        long: lever,
                        short: lever,
                    },
                    isolated: leverData.isolated
                } : {
                    cross: leverData.cross,
                    isolated: PositionSide == "Long" ? {
                        long: lever,
                        short: leverData.isolated.short,
                    } : {
                        long: leverData.isolated.long,
                        short: lever,
                    }
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
            const res = await deleteStrategiesItem({
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
            const res = await updateStrategiesByID({
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
                            }}
                            style={{
                                marginLeft: "3px"
                            }}
                        />
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
                            treeNode.Mode == "cross" ? (
                                <span className={styles.lever}>{leverData?.cross?.long}x</span>
                            ) : (
                                <span className={styles.lever}>{treeNode.PositionSide === "Long" ? leverData?.isolated?.long : leverData?.isolated?.short}x</span>
                            )
                        }
                    </Button>
                </TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.OrderChange}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Amount}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Candlestick}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.TakeProfit}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.ReduceTakeProfit}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.ExtendedOCPercent}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Ignore}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.EntryTrailing || 40}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.StopLose}</TableCell>
                <TableCell className={styles.tableBodyCell}>{formatNumberString(treeNode.volume24h)}</TableCell>
                <TableCell className={styles.tableBodyCell}>{treeNode.Mode}</TableCell>
                <TableCell
                    className={styles.tableBodyCell}
                    style={{
                        whiteSpace: "nowrap",
                    }}
                >
                    {treeNode?.scannerID?.Label}</TableCell>
                <TableCell className={styles.tableBodyCell}>
                    <Switch
                        size="small"
                        color='warning'
                        checked={treeNode.IsBeta}
                        onChange={(e) => {
                            handleActiveStrategy({
                                id: treeNode._id,
                                parentID: treeData._id,
                                symbol: treeData.value,
                                newData: { ...treeNode, IsBeta: e.target.checked }
                            })
                        }}
                    />
                </TableCell>
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
                            defaultValue={20}
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
        </>
    );
}

export default memo(TreeChild);