import { Button, TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useRef, useState } from 'react';
import DataGridCustom from '../../../../components/DataGridCustom';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../../store/slices/Toast';
import { formatNumberString } from '../../../../functions';
import { getAllCoin, syncCoin } from '../../../../services/Coins/ByBit/coinFuturesService';
import { LoadingButton } from '@mui/lab';

function CoinContent() {
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
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: 150,
        },
        {
            field: 'price24hPcnt',
            headerName: '24H (%)',
            minWidth: 160,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => {
                const value = params.value
                return <p style={{
                    color: value >= 0 ? "green" : "var(--redColor)"
                }}>{value.toFixed(2)}%</p>
            }
        },
        
        {
            field: 'volume24h',
            headerName: 'Vol24h',
            type: "number",
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: (params) => formatNumberString(params.value)
        },
        {
            field: 'lastPrice',
            headerName: 'Last Price',
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: 160,
        },
        {
            field: 'deliveryTime',
            headerName: 'Delist Time',
            flex: window.innerWidth <= 740 ? undefined : 1,
            minWidth: 160,
        },
    ]

    const [tableRows, setTableRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const tableRowsDefault = useRef([])

    const dispatch = useDispatch()

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllCoin()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    ...item,
                    price24hPcnt: item.price24hPcnt * 100,
                    id: item._id,
                    Coin: item.symbol.split("USDT")[0],
                    Symbol: item.symbol,
                    deliveryTime: item.deliveryTime ? new Date(item.deliveryTime).toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }) : "",
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
        const res = await syncCoin()
            const { status, message } = res.data

            if (status === 200) {
                handleGetSymbolList()
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
            <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center", marginBottom: "16px" }}>
                <TextField
                    placeholder='Coin Name...'
                    size='small'
                    className={styles.coinInput}
                    onChange={(e) => {
                        setTableRows(() => {
                            const key = e.target.value
                            if (key) {
                                const newList = tableRowsDefault.current.filter(item => item.Symbol.toUpperCase().includes(key.toUpperCase()?.trim()))
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

export default CoinContent;