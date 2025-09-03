import { TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { LoadingButton } from '@mui/lab';
import AddBreadcrumbs from '../../../../components/BreadcrumbsCutom';
import DataGridCustom from '../../../../components/DataGridCustom';
import { addMessageToast } from '../../../../store/slices/Toast';
import { getAllInstrumentsByBitV1, syncInstrumentsByBitV1 } from '../../../../services/Coins/ByBit/V1/coinService';
import { formatNumberString } from '../../../../functions';

function InstrumentsByBitV1() {
    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'Coin',
            headerName: 'Coin',
            minWidth: 120,
            flex: 1,
        },
        {
            field: 'market',
            headerName: 'Market',
            minWidth: 150,
            flex: 1,
            renderCell: (params) => {
                const TradeType = params.value
                return <p> {TradeType == "Margin" ? "🍁" : "🍀"} {TradeType}</p>
            }
        },
        {
            field: 'lastPrice',
            headerName: 'Last Price',
            minWidth: 160,
            flex: 1,
        },
        {
            field: 'price24hPcnt',
            headerName: '24H(%)',
            minWidth: 160,
            flex: 1,
            renderCell: (params) => {
                const value = +params.value
                return <p style={{
                    color: value >= 0 ? "green" : "var(--redColor)"
                }}>{value.toFixed(2)}%</p>
            }
        },
        {
            field: 'volume24h',
            headerName: 'Vol24h',
            minWidth: 150,
            flex: 1,
            renderCell: (params) => formatNumberString(params.value)
        },
        // {
        //     field: 'minOrderQty',
        //     headerName: 'minOrderQty',
        //     minWidth: 160,
        //     flex: 1,
        // },
        // {
        //     field: 'basePrecision',
        //     headerName: 'BasePrecision',
        //     minWidth: 160,
        //     flex: 1,
        // },
        // {
        //     field: 'tickSize',
        //     headerName: 'TickSize',
        //     minWidth: 160,
        //     flex: 1,
        // },

    ]

    const [tableRows, setTableRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const tableRowsDefault = useRef([])

    const dispatch = useDispatch()

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllInstrumentsByBitV1()
            const { data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    ...item,
                    id: item._id,
                    Coin: item.symbol.split("USDT")[0],
                }))
            tableRowsDefault.current = newSymbolList
            setTableRows(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }

    const handleSyncCoin = async () => {
        setLoading(true)
        try {
            const res = await syncInstrumentsByBitV1()
            const { status, message } = res.data

            if (status === 200) {
                await handleGetSymbolList()
            }
            dispatch(addMessageToast({
                status,
                message,
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
        setLoading(false)
    }


    useEffect(() => {
        handleGetSymbolList()
    }, []);
    return (
        <div className={styles.coinContent}>
            <AddBreadcrumbs list={["InstrumentsByBitV1"]} />
            <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center", marginBottom: "16px" }}>
                <TextField
                    placeholder='Coin Name...'
                    size='small'
                    className={styles.coinInput}
                    onChange={(e) => {
                        setTableRows(() => {
                            const key = e.target.value
                            if (key) {
                                const newList = tableRowsDefault.current.filter(item => item.symbol.toUpperCase().includes(key.toUpperCase()?.trim()))
                                return newList.length > 0 ? newList : []
                            }
                            return tableRowsDefault.current
                        })
                    }}
                />

                <LoadingButton
                    variant="contained"
                    size="small"
                    loading={loading}
                    onClick={handleSyncCoin}
                    sx={{
                        ".MuiLoadingButton-label": {

                            fontSize: "14px !important",
                        }
                    }}

                >
                    Sync
                </LoadingButton>
            </div>
            <DataGridCustom
                tableColumns={tableColumns}
                tableRows={tableRows}
                checkboxSelection={false}
            />
        </div>
    );
}

export default InstrumentsByBitV1;