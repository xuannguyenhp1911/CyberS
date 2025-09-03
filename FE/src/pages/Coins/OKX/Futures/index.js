import { TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { LoadingButton } from '@mui/lab';
import AddBreadcrumbs from '../../../../components/BreadcrumbsCutom';
import DataGridCustom from '../../../../components/DataGridCustom';
import { addMessageToast } from '../../../../store/slices/Toast';
import { getAllInstrumentOKXV1Futures, syncInstrumentOKXV1Futures } from '../../../../services/Coins/OKX/coinFuturesService';
import { formatNumberString } from '../../../../functions';

function InstrumentOKXV1Futures() {
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
            field: 'price24hPcnt',
            headerName: '24H(%)',
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
            flex: 1,
            renderCell: (params) => formatNumberString(params.value)
        },
        {
            field: 'lastPrice',
            headerName: 'Last Price',
            minWidth: 160,
            flex: 1,
        },
        // {
        //     field: 'minUSDT',
        //     headerName: 'Min ($)',
        //     flex: 1,
        //     renderCell: (params) => Math.abs(params.value).toFixed(2)
        // },
        // {
        //     field: 'minOrderQty',
        //     headerName: 'Min Qty',
        //     flex: 1,
        //     renderCell: (params) => formatNumberString(params.value)
        // },
        // {
        //     field: 'basePrecision',
        //     headerName: 'BasePrecision',
        //     flex: 1,
        // },
        // {
        //     field: 'ctVal',
        //     headerName: 'CtVal',
        //     flex: 1,
        // },
        // {
        //     field: 'lever',
        //     headerName: 'Lever',
        //     flex: 1,
        // },

    ]

    const [tableRows, setTableRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const tableRowsDefault = useRef([])

    const dispatch = useDispatch()

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllInstrumentOKXV1Futures()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    ...item,
                    id: item._id,
                    Coin: item.symbol.split("-USDT")[0],
                    minUSDT:item.minOrderQty * item.lastPrice
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
            const res = await syncInstrumentOKXV1Futures()
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

export default InstrumentOKXV1Futures;