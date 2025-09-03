const Big = require('big.js');
const crypto = require('crypto');

const uuidv4 = () => crypto.randomBytes(16).toString('hex');

const { exec } = require('child_process');
require('dotenv').config({
    path: "../../../.env"
});
const SERVER_IP = process.env.SERVER_IP

const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');
const CoinFutureModel = require('../../../models/Coins/OKX/coinFutures.model')

const {
    getAllStrategiesActive,
    getFutureBE,
    createStrategiesMultipleStrategyBE,
    updateStrategiesMultipleStrategyBE,
    deleteAllScannerBE,
    deleteAllForUPcode,
    deleteConfigBE
} = require('../../../controllers/Configs/OKX/V3/config');


const { getAllStrategiesActiveScannerV3BE } = require('../../../controllers/Configs/OKX/V3/scanner');
const { syncCoinBE, getAllCoinFuturesBE, syncVol24hBE } = require('../../../controllers/Coins/OKX/coinFutures');
const { getAllBotIDByServerIP } = require('../../../controllers/servers');
const { getClearVDataBE } = require('../../../controllers/Configs/OKX/V3/configVIP');
const { setLeverSymbolBotFuturesBE } = require('../../../controllers/bot');

const { RestClient, WebsocketClient } = require('okx-api');

const wsSymbol = new WebsocketClient({
    market: "business",
});
const wsSymbolDay = new WebsocketClient({
    market: "business",
});

const clientPublic = new RestClient();

const LIST_ORDER = [
    {
        "channel": "orders",
        "instType": "SWAP",
    },

    {
        "channel": "positions",
        "instType": "SWAP",
    },

]
const MAX_ORDER_LIMIT = 20
const LIMIT_GET_HISTORY_ONE = 300

// ----------------------------------------------------------------------------------
var leverByBotSymbolSide = {}
var pnlByBotAndSymbol = {}
var timeoutRestartServer = false
var messageTeleByBot = {}
var thongKeWinLoseByBot = {}
var clearVWinLose = {}
var minOCCandleSymbolBot = {}
var allbotOfServer = []
var priceMinMaxKhoangGiaCandleSymbol = {}
var allScannerDataObject = {}
let missTPDataBySymbol = {}

var blockContinueOrderOCByStrategiesID = {}
var listKline = []
var listKlineDay = []
var allSymbol = {}
var updatingAllMain = false
var connectKlineError = false
var connectByBotError = {}

// ------- BTC ------------

var nangOCValue = 0
var checkOrderOCAll = true

var haOCFunc = ""

// -------  ------------

var allStrategiesByCandleAndSymbol = {}
var listPricePreOne = {}
var trichMauOCListObject = {}
var trichMauTPListObject = {}


var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
var maxSubmitOrderOCData = {}
var botApiList = {}
var digitAllCoinObject = {}
var botAmountListObject = {}
var botListTelegram = {}

// -------  ------------

var listOCByCandleBot = {}
var listConfigIDByScanner = {}
var clearVData = {
    scanQty: 0,
    scanPercent: 0,
    botQty: 0,
    botPercent: 0
}

// ----------------------------------------------------------------------------------
const clearCheckMiss = (botSymbolMissID) => {
    clearTimeout(missTPDataBySymbol?.[botSymbolMissID]?.timeOutFunc)
    clearTimeout(missTPDataBySymbol?.[botSymbolMissID]?.timeOutFuncCloseMiss)
}


const formatNumberString = numberInput => {
    const number = Math.abs(numberInput)
    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(2) + 'B';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(2) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(2) + 'K';
    } else {
        return number.toFixed(2);
    }
}
const toFixedSmall = (value, tickSize) => {
    const precision = Math.max(0, -Math.floor(Math.log10(tickSize))); // Xác định số chữ số thập phân
    return new Big(value).toFixed(precision); // Giữ nguyên số 0 quan trọng
};
const roundPrice = (
    {
        price,
        symbol
    }
) => {
    const tickSize = digitAllCoinObject[symbol].priceScale
    let newPrice = new Big(price);
    if (tickSize && price) {
        const tickSizeFix = new Big(+tickSize)
        newPrice = newPrice.div(tickSizeFix).round(0, Big.roundDown).times(tickSizeFix);
    }
    return toFixedSmall(newPrice, tickSize)
}

const roundQty = ({ price, symbol }) => {
    const data = digitAllCoinObject[symbol]

    let newPrice = new Big(price);
    if (newPrice && data) {
        const tickSize = new Big(data.basePrecision);
        newPrice = newPrice.div(tickSize).round(0, Big.roundDown).times(tickSize);
        if (data?.ctVal) {
            const ctVal = new Big(data?.ctVal);
            newPrice = newPrice.div(ctVal);
        }
    }

    return toFixedSmall(newPrice, data.basePrecision);
};

const getWebsocketClientConfig = ({
    apiKey,
    apiPass,
    apiSecret
}) => {
    return new WebsocketClient({
        market: "prod",
        accounts: [{
            apiKey,
            apiPass,
            apiSecret
        }]
    })
}

const getRestClientV5Config = ({
    apiKey,
    apiSecret,
    apiPass,
}) => {
    return new RestClient({
        apiKey,
        apiSecret,
        apiPass,
    })
}

const handleRestartServer = async () => {
    console.log(`[...] Restarting Code`);

    updatingAllMain = true

    const cancelOC = cancelAllListOrderOC(listOCByCandleBot)
    const deleteAll = deleteAllForUPcode()

    await Promise.allSettled([cancelOC, deleteAll])

    console.log("[V] PM2 Reset All Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 restart ${fileName}`)
}

const handleSetLeverForBotAndSymbolFutures = async ({
    botID,
    symbol,
    lever,
    side,
    leverID,
    tdMode
}) => {

    const botData = botApiList[botID]

    leverByBotSymbolSide[leverID] = leverByBotSymbolSide[leverID] || {
        lever: 11,
        running: true
    }

    leverByBotSymbolSide[leverID].running = true

    // Cancel all config by symbol 
    const listObject = listOCByCandleBot?.[botID]?.listOC

    listObject && Object.values(listObject)?.length > 0 && await Promise.allSettled(Object.values(listObject).map(async strategyData => {
        const strategyID = strategyData?.strategyID
        const symbolOC = strategyData?.symbol
        const sideOC = strategyData?.side

        if (symbolOC == symbol) {
            await handleCancelOrderOC({
                ...strategyData,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
                qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
            })
        }
    }))

    // Hạ Lever
    const maxLever = digitAllCoinObject[symbol].lever
    await setLeverSymbolBotFuturesBE({
        botData,
        instId: symbol,
        lever: lever < maxLever ? lever : maxLever,
        mgnMode: tdMode,
        side
    })
    leverByBotSymbolSide[leverID].running = false

}

const handleClearV = async (fromSocket = false) => {

    let filteredThongKe = Object.entries(clearVWinLose)
        .filter(([, value]) => {
            let total = value.Win + value.Lose;
            let winPercentage = total > 0 ? (value.Win / total) * 100 : 0;
            let check = false
            if (value.scannerID) {
                check = winPercentage >= clearVData.scanPercent && value.Win >= clearVData.scanQty
            }
            else {
                check = winPercentage >= clearVData.botPercent && value.Win >= clearVData.botQty
            }
            return check && (value.WinMoney - value.LoseMoney > 0)
        })
        .map(([key, value]) => {
            const WinQty = value.Win
            const LoseQty = value.Lose
            const totalWinLose = WinQty + LoseQty;

            const winPercentage = totalWinLose > 0 ? ((WinQty / totalWinLose) * 100).toFixed(1) : 0;
            const winPercentageText = `🏆 WIN: ${winPercentage}% (${WinQty}/${LoseQty})`

            const WinMoney = Math.abs((+value.WinMoney).toFixed(1))
            const LoseMoney = Math.abs((+value.LoseMoney).toFixed(1))
            const HieuWinLose = WinMoney - LoseMoney
            const textCheckWL = HieuWinLose > 0 ? `✅ W: ${HieuWinLose.toFixed(1)}` : `❌ L: -${HieuWinLose.toFixed(1)}`
            const WinLoseText = `🔼 W: ${WinMoney} \n🔽 L: -${LoseMoney} \n${textCheckWL}`
            return [
                key,
                {
                    ...value,
                    winPercentageText,
                    WinLoseText,
                    HieuWinLose
                }
            ];
        })
        .sort(([, valueA], [, valueB]) => {
            return valueB.HieuWinLose - valueA.HieuWinLose;
        })
        .slice(0, 10);


    let resultStringSendTele = ""
    if (filteredThongKe?.length > 0) {
        resultStringSendTele = filteredThongKe
            .map(([, value]) => {
                const scannerID = value.scannerID;
                let text = `<b>${value.winPercentageText}</b> \n${value.WinLoseText} ${value.text}`
                if (scannerID) {
                    text += ` \n<code>ID: ${scannerID}</code>`
                }
                // Thêm thông tin Win / Lose vào chuỗi kết quả
                return text
            })
            .join("\n\n");
    }
    else {
        if (fromSocket) {
            resultStringSendTele = `😐 Not Found Data From Server  ${SERVER_IP}`
        }
    }

    resultStringSendTele && await sendMessageWithRetryWait({
        messageText: resultStringSendTele,
        telegramID: process.env.CLEARV_OKX_FUTURES_TELE_ID,
        telegramToken: process.env.CLEARV_BOT_TOKEN,
    });
    !fromSocket && (clearVWinLose = {});
};

// ----------------------------------------------------------------------------------

const handleCancelOrderOCPartFill = async ({
    strategyID,
    strategy,
    symbol,
    side,
    botData,
    OrderChange,
    orderId,
    handleOrderTP
}) => {

    const botName = botData.botName
    const botID = botData.id

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });;

    let textTele = ""

    const scannerLabel = strategy?.scannerID?.Label
    const scannerText = scannerLabel ? `<code>•S: ${scannerLabel} 🌀</code> ` : ""
    const symbolSplit = symbol.split("-")[0]

    await client
        .cancelOrder({
            instId: symbol,
            ordId: orderId || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
        })
        .then((res) => {
            const response = res[0]
            if (response.sCode == 0) {
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${scannerText}• B: ${botName} <i>-> Success</i>`
                console.log(textTele);
            }
            else {
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${scannerText}• B: ${botName} \n<code>🟡 Failed: ${response.sMsg}</code>`
                console.log(textTele)
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error.msg
            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${scannerText}• B: ${botName} \n<code>🔴 Error: ${errorText}</code>`
            console.log(textTele)

        });

    handleOrderTP()

}
const cancelAllListOrderOC = async (listOCByCandleBotInput) => {

    const allData = ["1m", "3m", "5m", "15m"].reduce((pre, candleItem) => {
        const arr = Object.values(listOCByCandleBotInput[candleItem] || {})

        if (arr.length > 0) {

            arr.forEach(item => {

                if (Object.values(item.listOC || {}).length > 0) {

                    pre[item.ApiKey] = {
                        listOC: {
                            ...(pre[item.ApiKey]?.listOC || {}),
                            ...item.listOC
                        },
                        ApiKey: item.ApiKey,
                        SecretKey: item.SecretKey,
                    }
                }
            })

        }
        return pre
    }, {});

    await handleCancelAllOrderOC(Object.values(allData || {}))

}

const syncDigit = async () => {// proScale
    const resultGetAll = await clientPublic.getInstruments({ instType: "SWAP" })

    resultGetAll.forEach((e) => {
        if (e.settleCcy == "USDT") {
            const symbol = e.instId
            const min = e.ctVal * e.lotSz
            digitAllCoinObject[symbol] = {
                symbol,
                priceScale: +e.tickSz,
                basePrecision: min,
                ctVal: e.ctVal,
                minOrderQty: min,
                lever: +e.lever
            }

        }
    })
}


const handleSubmitOrder = async ({
    strategy,
    strategyID,
    symbol,
    qty,
    side,
    price,
    candle,
    ApiKey,
    SecretKey,
    botName,
    botID,
    coinOpen,
    botData
}) => {

    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

    maxSubmitOrderOCData[botID] = maxSubmitOrderOCData[botID] || {
        totalOC: 0,
        logError: false,
        timeout: "",
    }

    !listOCByCandleBot[candle] && (listOCByCandleBot[candle] = {});
    !listOCByCandleBot[candle][botID] && (listOCByCandleBot[candle][botID] = {
        listOC: {},
        ApiKey,
        SecretKey,
    });

    const orderLinkId = uuidv4()

    if (true) {

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = true

        maxSubmitOrderOCData[botID].totalOC += 1

        const OrderChangeOld = strategy.OrderChangeOld
        const PositionSide = strategy.PositionSide
        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            coinOpen,
            OrderChangeFilled: OrderChangeOld,
            OC: true
        }

        listOCByCandleBot[candle][botID].listOC[strategyID] = {
            strategyID,
            candle,
            symbol,
            side,
            botName,
            botID,
            orderLinkId,
            scannerID: strategy.scannerID
        }

        const client = getRestClientV5Config({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });
        const newOC = Math.abs((price - coinOpen)) / coinOpen * 100

        const tdMode = strategy.Mode
        await client
            .submitOrder({
                instId: symbol,
                side: side?.toLowerCase(),
                posSide: side == "Buy" ? "long" : "short",
                ordType: "limit",
                sz: qty,
                px: price,
                clOrdId: orderLinkId,
                tdMode,
                ccy: "USDT",
            })
            .then((res) => {
                const response = res[0]

                if (response.sCode == 0) {

                    const newOrderID = response.ordId
                    const newOrderLinkID = response.clOrdId

                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen = coinOpen
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrder = +price;


                    const text = `\n[V] + OC ${tdMode} ( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) successful: ${price} - ${qty}`
                    console.log(text)
                    console.log(changeColorConsole.greenBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ): ${newOrderLinkID}`));


                    // minOCCandleSymbolBot[candle] = minOCCandleSymbolBot[candle] || {}
                    // minOCCandleSymbolBot[candle][symbol] = minOCCandleSymbolBot[candle][symbol] || {}
                    // minOCCandleSymbolBot[candle][symbol][PositionSide] = minOCCandleSymbolBot[candle][symbol][PositionSide] || {}
                    // minOCCandleSymbolBot[candle][symbol][PositionSide][botID] = true
                    // sendMessageWithRetryWait({
                    //     messageText: text,
                    //     telegramID,
                    //     telegramToken
                    // })

                }
                else {
                    console.log(changeColorConsole.yellowBright(`\n[!] + OC ${tdMode} ( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) failed: ${price} - ${qty} | ${response.sMsg}`))
                    delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                    delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                }
            })
            .catch((error) => {
                const errorText = error.data?.[0]?.sMsg || error.msg
                console.log(`\n[!] + OC ${tdMode} ( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) error: ${price} - ${qty} | ${errorText} `)
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
            });



    }
    // maxSubmitOrderOCData[botID].timeout && clearTimeout(maxSubmitOrderOCData[botID].timeout);
    //     maxSubmitOrderOCData[botID].timeout = setTimeout(() => {
    //         maxSubmitOrderOCData[botID].logError = false
    //         maxSubmitOrderOCData[botID].totalOC = 0
    //     }, 1000)
    //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
    // else {
    //     if (!maxSubmitOrderOCData[botID]?.logError) {
    //         console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
    //         maxSubmitOrderOCData[botID].logError = true
    //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
    //     }
    // };
    // if (allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]) {
    //     allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = strategy.OrderChangeOld || strategy.OrderChange
    // }

}

const handleCloseMarketMiss = async ({
    symbol,
    botData,
    tdMode,
    posSide,
}) => {

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });

    const botName = botData.botName
    const symbolSplit = symbol.split("-")[0]
    const sideFilled = posSide == "long" ? 'Buy' : 'Sell'

    const sideViThe = sideFilled == "Buy" ? 'Sell' : 'Buy'
    const pnlByBotAndSymbolID = `${botData.id}-${symbol}-${sideViThe}`

    client
        .closePositions({
            ccy: "USDT",
            mgnMode: tdMode,
            instId: symbol,
            autoCxl: true,
            posSide
        })
        .then((res) => {

            const response = res[0]
            if (response) {
                const pnlData = pnlByBotAndSymbol[pnlByBotAndSymbolID]

                const pnlWinLose = +pnlData?.pnl
                const lastPx = roundPrice({
                    price: +pnlData?.avgPx,
                    symbol
                })
                const qty = (+pnlData?.accFillSz).toFixed(3)
                const winLoseString = pnlWinLose != 0 ? pnlWinLose.toFixed(3) : 0
                const pnlWinLoseText = pnlWinLose > 0 ? `✅ WIN: ${winLoseString}$` : `❌ LOSE: ${winLoseString}$`

                const textTele = `🍄 Clear Position <b>${symbolSplit}</b> ${sideFilled} \n${pnlWinLoseText} • P: ${lastPx} • Q: ${qty} • Bot: ${botName}`
                console.log(changeColorConsole.greenBright(textTele));
                closeSuccess = true
            }
            else {
                console.log(changeColorConsole.yellowBright(`🍄 Clear Position <b>${symbolSplit}</b> ${sideFilled} | Bot: ${botName} \n<code>🟡 Failed: ${response.msg}</code>`));
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error.msg

            console.log(`🍄 Clear Position <b>${symbolSplit}</b> ${sideFilled} | Bot: ${botName} \n<code>🔴 Error: ${errorText}</code>`)
        });
}

const handleSubmitOrderTP = async ({
    strategy,
    OrderChangeFilled,
    strategyID,
    symbol,
    side,
    qty,
    price,
    candle = "",
    botData,
    missState = false,
    botName,
    botID,
    tdMode,
    botSymbolMissID
}) => {

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const orderLinkId = uuidv4()

    if (!missState) {
        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            OrderChangeFilled,
            TP: true
        }
    }
    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });

    await client
        .submitOrder({
            instId: symbol,
            side: side?.toLowerCase(),
            ordType: "limit",
            sz: qty,
            px: price,
            clOrdId: orderLinkId,
            tdMode,
            ccy: "USDT",
            reduceOnly: true,
            posSide: side == "Buy" ? "short" : "long"
        })
        .then((res) => {
            const response = res[0]

            if (response.sCode == 0) {

                const newOrderID = response.ordId
                const newOrderLinkID = response.clOrdId

                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderLinkId = newOrderLinkID

                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty) * digitAllCoinObject[symbol]?.ctVal,
                    priceOrderTP: price
                }

                missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                    orderID: newOrderID,
                    strategyID
                })

                console.log(`[V] + TP ${tdMode} ${missState ? "( MISS )" : ''} ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:  ${price} - ${qty}`)
                console.log(changeColorConsole.greenBright(`[_TP orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ): ${newOrderLinkID}`));

                clearCheckMiss(botSymbolMissID)

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] + TP ${tdMode} ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) failed: ${price} - ${qty} | ${response.sMsg}`))
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]

            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error.msg
            console.log(`[!] + TP ${tdMode} ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) error: ${price} - ${qty} | ${errorText}`)
            delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
            console.log(error);

        });
}

const moveOrderTP = async ({
    symbol,
    price,
    orderId,
    candle,
    side,
    botData,
    botName
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });

    await client
        .amendOrder({
            instId: symbol,
            newPx: toFixedSmall(price, digitAllCoinObject[symbol]?.priceScale),
            ordId: orderId
        })
        .then((res) => {
            const response = res[0]

            if (response.sCode == 0) {
                console.log(`[->] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful: ${price}`)
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response?.sMsg))
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error.msg

            console.log(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error: ${errorText}`)
        });

}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
    coinOpen,
    candle = "",
    side,
    botData,
    botName,
    botID
}) => {

    const sideText = side === "Buy" ? "Sell" : "buy"
    const symbol = strategy.symbol

    if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID) {

        const TPOld = allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.price

        const ReduceTakeProfit = strategy.ReduceTakeProfit
        let TPNew
        if (strategy.PositionSide === "Long") {
            TPNew = TPOld - Math.abs(TPOld - coinOpen) * (ReduceTakeProfit / 100)
        }
        else {
            TPNew = TPOld + Math.abs(TPOld - coinOpen) * (ReduceTakeProfit / 100)
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            symbol,
            price: roundPrice({
                price: TPNew,
                symbol
            }),
            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID,
            candle,
            side: sideText,
            botData,
            botName,
            botID
        }
        await moveOrderTP(dataInput)

    }
}
const handleCancelOrderOC = async ({
    symbol,
    botData,
    orderLinkId,
}) => {
    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });

    return await client
        .cancelOrder({
            instId: symbol,
            clOrdId: orderLinkId
        })
}

const handleCancelAllOrderOC = async (items = []) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);

                const newList = list.reduce((pre, cur) => {

                    const botIDTemp = cur.botID
                    const strategyIDTemp = cur.strategyID
                    const candleTemp = cur.candle

                    if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                        !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC
                    ) {
                        pre.push(cur)
                    }
                    else {
                        console.log(`[V] x OC ( ${cur.botName} - ${cur.side} - ${cur.symbol} - ${candleTemp} ) has been filled `);
                    }
                    return pre
                }, [])


                await Promise.allSettled(newList.map(async item => {

                    const strategyID = item.strategyID
                    const botID = item.botID
                    const symbol = item.symbol
                    const side = item.side
                    const candle = item.candle
                    const candleTempSplit = candle.split("m")[0]
                    const botData = botApiList[botID]
                    handleCancelOrderOC({
                        symbol,
                        botData,
                        orderLinkId: item.orderLinkId,
                    })
                        .then((res) => {
                            const response = res[0]
                            if (response.sCode == 0) {
                                console.log(`[V] x OC ( ${botData.botName} - ${side} - ${symbol} - ${candle} ) successful `);
                                cancelAll({
                                    botID,
                                    strategyID,
                                })
                                delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                                if (allStrategiesByCandleAndSymbol[symbol]?.[candleTempSplit]?.[strategyID]?.IsDeleted) {
                                    {
                                        delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                        delete allStrategiesByCandleAndSymbol[symbol]?.[candleTempSplit]?.[strategyID]
                                    }
                                }
                            }
                            else {
                                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${botData.botName} - ${side} -  ${symbol} - ${candle} ) failed `, response.sMsg));
                            }
                        })
                }))

            }

        }))
        console.log("[V] Cancel All OC Successful");
    }
}
const handleCancelAllOrderOCWithAutoCancelAll = async (items = []) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                const newList = list.reduce((pre, cur) => {

                    const botIDTemp = cur.botID
                    const strategyIDTemp = cur.strategyID
                    const candleTemp = cur.candle

                    if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                        !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC
                    ) {
                        pre.push(cur)
                    }
                    else {
                        console.log(`[V] x OC ( ${cur.botName} - ${cur.side} - ${cur.symbol} - ${candleTemp} ) has been filled `);
                        cancelAll({
                            botID: botIDTemp,
                            strategyID: strategyIDTemp,
                        })
                        delete listOCByCandleBot[candleTemp]?.[botIDTemp]?.listOC?.[strategyIDTemp]
                    }

                    return pre
                }, [])

                await Promise.allSettled(newList.map(async item => {
                    const strategyID = item.strategyID
                    const botID = item.botID
                    const symbol = item.symbol
                    const side = item.side
                    const candle = item.candle
                    const botData = botApiList[botID]
                    handleCancelOrderOC({
                        botData,
                        orderLinkId: item.orderLinkId,
                        symbol
                    })
                        .then((res) => {
                            const response = res[0]
                            if (response.sCode == 0) {
                                console.log(`[V] x OC ( ${botData.botName} - ${side} - ${symbol} - ${candle} ) successful `);
                            }
                            else {
                                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${botData.botName} - ${side} -  ${symbol} - ${candle} ) failed `, response.sMsg));
                            }
                            cancelAll({
                                botID,
                                strategyID,
                            })
                            delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                        })
                }))

            }
        }))
        console.log("[V] Cancel All OC Successful");
    }
}

const handleCancelOrderTP = async ({
    strategyID,
    symbol,
    side,
    candle = "",
    orderId,
    gongLai = false,
    botName,
    botID
}) => {

    const botSymbolMissID = `${botID}-${symbol}-${side}`

    const botData = botApiList[botID]
    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });

    orderId && await client
        .cancelOrder({
            instId: symbol,
            ordId: orderId
        })
        .then((res) => {
            const response = res[0]
            if (response.sCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful `);

                if (gongLai && !missTPDataBySymbol[botSymbolMissID]?.gongLai) {
                    missTPDataBySymbol[botSymbolMissID].gongLai = true
                    clearCheckMiss(botSymbolMissID)

                }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response?.sMsg))
            }

        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
        });

}

async function handleCancelAllOrderTP({
    items,
    batchSize = 10
}) {
    if (items.length > 0) {
        console.log(`[...] Canceling TP`);

        let index = 0;
        while (index < items.length) {
            const batch = items.slice(index, index + batchSize);
            await Promise.allSettled(batch.map(item => handleCancelOrderTP({
                strategyID: item.strategyID,
                symbol: item.symbol,
                candle: item.candle,
                side: item.side,
                ApiKey: item.ApiKey,
                SecretKey: item.SecretKey,
                botName: item.botName,
                botID: item.botID,
                orderId: item.orderId,
                gongLai: item.gongLai,
            })));
            await delay(1200)
            index += batchSize;

        }
    }
}

const resetMissData = (botSymbolMissID) => {
    missTPDataBySymbol[botSymbolMissID] = {
        size: 0,
        side: "",
        Candlestick: "",
        timeOutFunc: "",
        sizeTotal: 0,
        orderIDToDB: "",
        orderID: "",
        gongLai: false,
        orderIDOfListTP: [],
        priceOrderTP: 0,
        prePrice: 0,
        ApiKey: "",
        SecretKey: "",
        botName: "",
        botID: "",
    }
}

const cancelAll = (
    {
        strategyID,
        botID
    }
) => {
    if (botID && strategyID && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC) {

        const data = allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]

        allStrategiesByBotIDAndOrderID[botID] = allStrategiesByBotIDAndOrderID[botID] || {};
        allStrategiesByBotIDAndStrategiesID[botID] = allStrategiesByBotIDAndStrategiesID[botID] || {};

        allStrategiesByBotIDAndStrategiesID[botID][strategyID] = {
            "OC": {
                orderID: "",
                orderLinkId: "",
                orderFilled: false,
                openTrade: "",
                dataSend: {},
                priceOrder: 0,
                orderFilledButMiss: false,
                moveAfterCompare: false,
                newOC: 0,
                coinOpen: 0,
                ordering: false
            },
            "TP": {
                orderID: "",
                orderLinkId: "",
                orderFilled: false,
                price: 0,
                qty: 0,
                side: "",
                priceCompare: 0,
                minMaxTempPrice: 0,
                coinClose: 0,
                moveAfterCompare: false,
                moveSuccess: false,
                orderFilledButMiss: false,
            },
        }

        if (data) {
            const OCOrderID = data?.OC?.orderLinkId
            const TPOrderID = data?.TP?.orderLinkId
            OCOrderID && delete allStrategiesByBotIDAndOrderID?.[botID]?.[OCOrderID];
            TPOrderID && delete allStrategiesByBotIDAndOrderID?.[botID]?.[TPOrderID];
        }
    }

}

const sendMessageWithRetryWait = async ({
    messageText,
    retries = 2,
    telegramID,
    telegramToken,
}) => {

    let BOT_TOKEN_RUN_TRADE = botListTelegram[telegramToken]

    try {
        if (!BOT_TOKEN_RUN_TRADE) {
            const newBotInit = new TelegramBot(telegramToken, {
                polling: false,
                request: {
                    agentOptions: {
                        family: 4
                    }
                }
            })
            BOT_TOKEN_RUN_TRADE = newBotInit
            botListTelegram[telegramToken] = newBotInit

            // BOT_TOKEN_RUN_TRADE.launch();
        }

        if (messageText) {

            clearTimeout(messageTeleByBot[telegramID]?.timeOut)

            messageTeleByBot[telegramID] = messageTeleByBot[telegramID] || {
                timeOut: "",
                text: [],
                running: false
            }

            if (messageTeleByBot[telegramID].running) {
                messageTeleByBot[telegramID].text = []
                messageTeleByBot[telegramID].running = false
                messageTeleByBot[telegramID].queue = true
            }

            messageTeleByBot[telegramID].text.push(messageText)

            const messageTextListArray = messageTeleByBot[telegramID].text

            messageTeleByBot[telegramID].timeOut = setTimeout(async () => {
                try {

                    let index = 0;
                    const batchSize = 10

                    messageTeleByBot[telegramID].running = true
                    messageTeleByBot[telegramID].queue = false


                    while (index < messageTextListArray.length) {
                        const batch = messageTextListArray.slice(index, index + batchSize);

                        const messageTextList = batch.join("\n\n")

                        for (let i = 0; i < retries; i++) {
                            try {
                                if (messageTextList) {
                                    // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                                    await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageTextList, {
                                        parse_mode: "HTML"
                                    });
                                    console.log('[->] Message sent to telegram successfully');
                                    break;
                                }
                            } catch (error) {
                                if (error.code === 429) {
                                    const retryAfter = error.parameters?.retry_after;
                                    console.log(changeColorConsole.yellowBright(`[!] Rate limited. Retrying after ${retryAfter} seconds...`));
                                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                                } else {
                                    throw new Error(error);
                                }
                            }
                        }

                        index += batchSize;
                        if (index < messageTextListArray.length) {
                            await delay(3000)
                        }
                    }

                    if (!messageTeleByBot[telegramID].queue) {
                        messageTeleByBot[telegramID].text = []
                        messageTeleByBot[telegramID].running = false
                    }
                } catch (error) {
                    console.log('[!] Error out setTimeout send telegram:', error);
                }
            }, 3000)
        }
    } catch (error) {
        console.log("[!] Bot Telegram Error", error)
    }
};
// 


const getMoneyFuture = async (botApiListInput) => {

    const list = Object.values(botApiListInput)
    if (list.length > 0) {
        const resultGetFuture = await Promise.allSettled(list.map(async botData => botData.IsActive && getFutureBE(botData)))

        if (resultGetFuture.length > 0) {
            resultGetFuture.forEach(({ value: data }) => {
                const botData = data?.botData
                const botID = botData?.id
                if (botID) {
                    const money = +data?.totalWalletBalance
                    botAmountListObject[botID] = money || 0;
                    if (!money) {
                        const errorMessage = data?.errorMessage ? data?.errorMessage : "Money=0"
                        const textError = `[!] Get money failed bot ( ${botData?.botName || botID} ): ${errorMessage}`
                        console.log(changeColorConsole.redBright(textError));
                        // sendMessageWithRetryWait({
                        //     messageText: textError,
                        //     telegramID: botData.telegramID,
                        //     telegramToken: botData.telegramToken
                        // })
                    }
                    // else {
                    //     console.log(changeColorConsole.greenBright("[V] Get money success for bot: " + botApiList[botID]?.botName || botID));
                    // }
                }
            })
        }
    }
}

const sendAllBotTelegram = async (text) => {

    await Promise.allSettled(Object.values(botApiList).map(botApiData => {
        const telegramID = botApiData.telegramID
        const telegramToken = botApiData.telegramToken
        return sendMessageWithRetryWait({
            messageText: text,
            telegramID,
            telegramToken
        })
    }))
}



const handleSocketBotApiList = async (botApiListInput = {}, showLog = true) => {

    try {
        const objectToArray = Object.values(botApiListInput);
        const objectToArrayLength = objectToArray.length;

        if (showLog) {
            console.log(changeColorConsole.greenBright("[New-Bot-API] Length:", objectToArrayLength));
        }

        if (objectToArrayLength > 0) {

            await getMoneyFuture(botApiListInput)

            await Promise.allSettled(objectToArray.map(botApiData => {

                const botID = botApiData.id
                const botName = botApiList[botID]?.botName

                const wsOrder = getWebsocketClientConfig({
                    apiKey: botApiData.ApiKey,
                    apiPass: botApiData.Password,
                    apiSecret: botApiData.SecretKey
                });

                botApiList[botID].wsOrder = wsOrder

                try {
                    wsOrder.subscribe(LIST_ORDER)

                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    wsOrder.on('update', async (dataCoin) => {

                        const botData = botApiList[botID]
                        const ApiKey = botData?.ApiKey
                        const SecretKey = botData?.SecretKey
                        const IsActive = botData?.IsActive
                        const botName = botData?.botName

                        const telegramID = botData?.telegramID
                        const telegramToken = botData?.telegramToken

                        const topicMain = dataCoin.arg.channel
                        const dataMainAll = dataCoin.data

                        ApiKey && SecretKey && await Promise.allSettled(dataMainAll.map(async dataMain => {

                            const symbol = dataMain.instId
                            const symbolSplit = symbol.split("-")[0]
                            if (topicMain === "orders") {

                                const orderID = dataMain.clOrdId
                                const orderStatus = dataMain.state
                                const dataMainSide = dataMain.side == "buy" ? "Buy" : "Sell"
                                const ordType = dataMain.ordType
                                const fillSzPart = +dataMain.fillSz
                                const ordId = dataMain.ordId

                                const tdMode = dataMain.tdMode
                                const priceFilled = Math.abs(dataMain.avgPx || dataMain.fillPx)
                                const qtyFilled = Math.abs(dataMain.accFillSz) * digitAllCoinObject[symbol]?.ctVal

                                const sideFilled = dataMain.side == "buy" ? "Buy" : "Sell"
                                const pnlByBotAndSymbolID = `${botID}-${symbol}-${sideFilled}`
                                pnlByBotAndSymbol[pnlByBotAndSymbolID] = dataMain

                                if (IsActive) {

                                    try {
                                        if (orderStatus === "filled") {
                                            console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMainSide} - ${symbol} ): ${orderID} | ${qtyFilled}`));

                                            if (!orderID) {

                                                setTimeout(() => {
                                                    ["1m", "3m", "5m", "15m"].forEach(candle => {
                                                        const listObject = listOCByCandleBot?.[candle]?.[botID]?.listOC
                                                        listObject && Object.values(listObject).map(strategyData => {
                                                            const strategyID = strategyData?.strategyID
                                                            const symbolItem = strategyData?.symbol
                                                            const strategyDataSide = strategyData?.side
                                                            const sideConfig = strategyDataSide == "Buy" ? "Sell" : "Buy"

                                                            if (symbol == symbolItem && sideConfig == dataMainSide && allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderIDConfirm) {
                                                                {
                                                                    const botSymbolMissID = `${botID}-${symbol}-${strategyDataSide}`

                                                                    console.log(`[V] RESET-Filled | ${symbol.split("-")[0]} - ${strategyDataSide} - ${strategyData?.candle} - Bot: ${strategyData?.botName}`);
                                                                    cancelAll({ botID, strategyID })
                                                                    delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[candle.split("m")[0]]?.[strategyID]?.IsDeleted) {
                                                                        delete allStrategiesByCandleAndSymbol[symbol]?.[candle.split("m")[0]]?.[strategyID]
                                                                        delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                                    }
                                                                    clearCheckMiss(botSymbolMissID)
                                                                    resetMissData(botSymbolMissID)
                                                                }
                                                            }
                                                        })
                                                    });
                                                }, 2000)

                                            }
                                        }

                                        const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                        const strategy = strategyData?.strategy
                                        const OCTrue = strategyData?.OC
                                        const TPTrue = strategyData?.TP

                                        if (strategy) {

                                            const strategyID = strategy.value
                                            const OrderChangeFilled = Math.abs((+strategyData?.OrderChangeFilled || 0).toFixed(3))
                                            const Candlestick = strategy.Candlestick
                                            const CandlestickSplit = Candlestick.split("m")[0]
                                            const PositionSide = strategy.PositionSide
                                            const Amount = strategy.Amount
                                            const TakeProfit = strategy.TakeProfit
                                            const priceOldOrder = (botAmountListObject[botID] * Amount / 100).toFixed(2)
                                            const OrderChange = strategy.OrderChange

                                            // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen || strategy.coinOpen

                                            const scannerIDData = strategy?.scannerID
                                            const scannerID = scannerIDData?._id || "Manual"
                                            const scannerLabel = scannerIDData?.Label
                                            const scannerText = scannerIDData ? `\n<code>Label: ${scannerLabel} 🌀</code>` : ""


                                            if (orderStatus === "filled" || orderStatus === "partially_filled") {

                                                if (OCTrue) {
                                                    const botSymbolMissID = `${botID}-${symbol}-${PositionSide == "Long" ? "Buy" : "Sell"}`
                                                    clearCheckMiss(botSymbolMissID)

                                                    let timeOut = 3000
                                                    const openTrade = priceFilled;  //Gia khop lenh
                                                    const coinOpenOC = strategyData.coinOpen
                                                    const newOC = (Math.abs((openTrade - coinOpenOC)) / coinOpenOC * 100).toFixed(2)

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true


                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                                    const qty = qtyFilled

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC = newOC

                                                    // Create TP

                                                    let TPNew = 0

                                                    const EntryTrailing = strategy.EntryTrailing || 40

                                                    if (PositionSide === "Long") {
                                                        TPNew = openTrade + Math.abs((openTrade - coinOpenOC)) * (TakeProfit / 100)
                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade + Math.abs((openTrade - coinOpenOC)) * (EntryTrailing / 100)
                                                    }
                                                    else {
                                                        TPNew = openTrade - Math.abs((openTrade - coinOpenOC)) * (TakeProfit / 100)
                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade - Math.abs((openTrade - coinOpenOC)) * (EntryTrailing / 100)
                                                    }
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side = PositionSide === "Long" ? "Sell" : "Buy"

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew


                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.qty = qty

                                                    const dataInput = {
                                                        strategy,
                                                        OrderChangeFilled,
                                                        strategyID,
                                                        symbol,
                                                        qty: qty,
                                                        price: roundPrice({
                                                            price: TPNew,
                                                            symbol
                                                        }),
                                                        side: PositionSide === "Long" ? "Sell" : "Buy",
                                                        candle: Candlestick,
                                                        ApiKey,
                                                        SecretKey,
                                                        botName,
                                                        botID,
                                                        botData,
                                                        tdMode,
                                                        botSymbolMissID
                                                    }

                                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                                    if (orderStatus === "filled") {
                                                        timeOut = 0
                                                        clearTimeout(allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc)
                                                        allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""


                                                        const teleText = `<b>${symbolSplit}</b> | Open ${PositionSide} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                                        console.log(`\n\n[V] Filled OC: \n${teleText}\n`)
                                                        handleSubmitOrderTP(dataInput)

                                                        sendMessageWithRetryWait({
                                                            messageText: teleText,
                                                            telegramID,
                                                            telegramToken,
                                                        })
                                                    }
                                                    else {
                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOC = true
                                                        let qtyPartFilledOC = fillSzPart
                                                        qtyPartFilledOC = fillSzPart * digitAllCoinObject[symbol]?.basePrecision
                                                        allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled = (allStrategiesByBotIDAndOrderID[botID][orderID]?.totalQtyPartFilled || 0) + qtyPartFilledOC
                                                        console.log(changeColorConsole.blueBright(`[V] PartiallyFilled OC ( ${botName} - ${dataMainSide} - ${symbol} - ${strategy.Candlestick} ): ${orderID} - ${fillSzPart}`));
                                                        if (!allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc) {
                                                            allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = setTimeout(async () => {
                                                                const totalQtyPartFilledOC = allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled
                                                                // const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Part_Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChange}% • P: ${openTrade} • Q: ${qtyFilledAndFee.toFixed(2)} • A: ${AmountFilled}`
                                                                const teleText = `<b>${symbolSplit}</b> | Part_Open ${PositionSide} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                                                console.log(`\n\n[V] Part_Filled OC: \n${teleText}\nQty: ${totalQtyPartFilledOC}`)

                                                                console.log(changeColorConsole.cyanBright(`[V] Close OC Filled ( ${OrderChange}% ) ( ${botName} - ${sideFilled} - ${symbolSplit} ) After ${timeOut}`));
                                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true

                                                                dataInput.qty = totalQtyPartFilledOC

                                                                allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""

                                                                handleCancelOrderOCPartFill({
                                                                    strategyID,
                                                                    strategy,
                                                                    symbol,
                                                                    side: PositionSide === "Long" ? "Buy" : "Sell",
                                                                    botData,
                                                                    OrderChange,
                                                                    orderId: ordId,
                                                                    // qty: qtyFilledAndFee,
                                                                    handleOrderTP: () => {
                                                                        handleSubmitOrderTP(dataInput)
                                                                    }
                                                                })

                                                                sendMessageWithRetryWait({
                                                                    messageText: teleText,
                                                                    telegramID,
                                                                    telegramToken,
                                                                })
                                                            }, timeOut)
                                                        }
                                                    }
                                                }
                                                // Khớp TP
                                                else if (TPTrue) {
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOC = false

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilled = true

                                                    const side = PositionSide === "Long" ? "Buy" : "Sell"
                                                    const botSymbolMissID = `${botID}-${symbol}-${side}`

                                                    clearCheckMiss(botSymbolMissID)

                                                    const closePrice = priceFilled;

                                                    const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC.openTrade

                                                    const qty = qtyFilled;

                                                    const newOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC

                                                    let priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;
                                                    const priceWinPercent = Math.abs(priceWin / priceOldOrder * 100).toFixed(2) || 0;

                                                    let textWinLose = ""
                                                    let textWinLoseShort = ""

                                                    const thongKeID = `${botID}-${scannerID}`

                                                    thongKeWinLoseByBot[thongKeID] = thongKeWinLoseByBot[thongKeID] || { Win: 0, Lose: 0 }
                                                    clearVWinLose[thongKeID] = clearVWinLose[thongKeID] || { Win: 0, Lose: 0, WinMoney: 0, LoseMoney: 0 }
                                                    clearVWinLose[thongKeID].scannerID = scannerID !== "Manual" ? scannerID : ""

                                                    if (PositionSide == "Short") {
                                                        priceWin = priceWin * -1
                                                    }

                                                    const priceWinABS = Math.abs(priceWin)
                                                    const PositionSideUpper = PositionSide?.toUpperCase()

                                                    if (priceWin > 0) {
                                                        textWinLose = `\n[WIN - ${PositionSideUpper}]: ${priceWin} | ${priceWinPercent}%\n`

                                                        textWinLoseShort = "✅"
                                                        console.log(changeColorConsole.greenBright(textWinLose));
                                                        thongKeWinLoseByBot[thongKeID].Win++
                                                        clearVWinLose[thongKeID].Win++
                                                        clearVWinLose[thongKeID].WinMoney += priceWinABS
                                                    }
                                                    else {
                                                        textWinLose = `\n[LOSE - ${PositionSideUpper}]: ${priceWin} | ${priceWinPercent}%\n`
                                                        textWinLoseShort = "❌"
                                                        console.log(changeColorConsole.magentaBright(textWinLose));
                                                        allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].blockContinue = true
                                                        thongKeWinLoseByBot[thongKeID].Lose++
                                                        clearVWinLose[thongKeID].Lose++
                                                        clearVWinLose[thongKeID].LoseMoney += priceWinABS

                                                    }
                                                    const openTradeTPFilled = roundPrice({
                                                        price: closePrice,
                                                        symbol
                                                    })
                                                    const textThongKeWinLose = `<i>${thongKeWinLoseByBot[thongKeID].Win} Win - ${thongKeWinLoseByBot[thongKeID].Lose} Lose</i>`

                                                    const teleText = `<b>${textWinLoseShort} ${symbolSplit}</b> | Close ${PositionSide} \n${textThongKeWinLose} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder} \n${textWinLose}`

                                                    console.log(`[V] Filled TP: \n${teleText}`)

                                                    cancelAll({ strategyID, botID })

                                                    delete listOCByCandleBot?.[Candlestick]?.[botID]?.listOC?.[strategyID]

                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]?.IsDeleted) {
                                                        delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                        delete allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]
                                                    }
                                                    // delete minOCCandleSymbolBot[Candlestick]?.[symbol]?.[PositionSide]?.[botID]

                                                    delete allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]?.viTheDepXauLog
                                                    delete allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]?.duDoanViTheDepXauLog

                                                    clearVWinLose[thongKeID].text = `${scannerText} \nBot: ${botName}`

                                                    sendMessageWithRetryWait({
                                                        messageText: teleText,
                                                        telegramID,
                                                        telegramToken,
                                                    })

                                                    // allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChangeOld || allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChange
                                                    missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                                    // Fill toàn bộ
                                                    if (missTPDataBySymbol?.[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol?.[botSymbolMissID]?.size == 0) {
                                                        console.log(`\n[_FULL Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${Candlestick} )\n`);


                                                        console.log(`[...] Reset All ( ${botName} - ${side} - ${symbol} - ${Candlestick} )`);

                                                        resetMissData(botSymbolMissID)

                                                    }
                                                    else {
                                                        console.log(`\n[_Part Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${Candlestick} )\n`);
                                                    }
                                                }

                                            }

                                            else if (orderStatus === "canceled") {
                                                // console.log("[X] Cancelled");
                                                // Khớp TP
                                                if (TPTrue) {
                                                    const botSymbolMissID = `${botID}-${symbol}-${PositionSide == "Long" ? "Buy" : "Sell"}`

                                                    console.log(`[-] Cancelled TP ( ${botName} - ${PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${Candlestick} ) - Chốt lời `);

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP = {}
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
                                                    blockContinueOrderOCByStrategiesID[CandlestickSplit][symbol][botID] = true

                                                    // maxSubmitOrderOCData[botID][symbol].totalOC -= 1

                                                    // const qty = +dataMain.qty;
                                                    // missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)


                                                }
                                                else if (OCTrue) {
                                                    // maxSubmitOrderOCData[botID][symbol].totalOC -= 1

                                                    console.log(`[-] Cancelled OC ( ${botName} - ${PositionSide === "Long" ? "Buy" : "Sell"} - ${symbol} - ${Candlestick}) `);
                                                    delete listOCByCandleBot[Candlestick]?.[botID]?.listOC?.[strategyID]
                                                    if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC) {
                                                        cancelAll({ botID, strategyID })
                                                    }
                                                }

                                            }
                                        }
                                        // User cancel vị thế ( Limit )
                                        if (!orderID && (orderStatus === "live" || orderStatus === "filled") && ordType !== "market") {

                                            console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Limit) - ( ${symbol} )`)

                                            const botSymbolMissID = `${botID}-${symbol}-${dataMainSide == "Buy" ? "Sell" : "Buy"}`

                                            clearCheckMiss(botSymbolMissID)

                                            // const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP

                                            // listMiss?.length > 0 && await handleCancelAllOrderTP({
                                            //     items: listMiss.map((orderIdTPData) => ({
                                            //         ApiKey,
                                            //         SecretKey,
                                            //         strategyID: orderIdTPData?.strategyID,
                                            //         symbol,
                                            //         side: dataMain.side,
                                            //         orderId: orderIdTPData?.orderID,
                                            //         botID,
                                            //         botName
                                            //     }))
                                            // })

                                            !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                            // missTPDataBySymbol[botSymbolMissID].orderIDOfListTP = []

                                            // missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                                            //     orderID: dataMain.orderId,
                                            // })

                                            const newSize = Math.abs(qtyFilled)

                                            missTPDataBySymbol[botSymbolMissID].size = newSize

                                            missTPDataBySymbol[botSymbolMissID].gongLai = false

                                        }
                                        // User cancel vị thế ( Market )
                                        if (ordType === "market") {
                                            console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} )`);

                                            [1, 3, 5, 15].forEach(candle => {
                                                console.log(changeColorConsole.magentaBright(`[V] BLOCK Continue Order OC | ${symbol.split("-")[0]} - ${candle} - Bot: ${botName}`));
                                                const listOCByBot = listOCByCandleBot?.[`${candle}m`]?.[botID]
                                                listOCByBot && handleCancelAllOrderOCWithAutoCancelAll([listOCByBot])
                                                blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
                                            });
                                            const botSymbolMissID = `${botID}-${symbol}-${dataMainSide == "Buy" ? "Sell" : "Buy"}`

                                            clearCheckMiss(botSymbolMissID)
                                            resetMissData(botSymbolMissID)
                                        }
                                    } catch (error) {
                                        console.log(`[!] Handle Error Filled Order: ${error.message}`);
                                    }
                                }
                            }

                            else if (topicMain === "positions") {
                                if (IsActive) {

                                    const mgnMode = dataMain.mgnMode
                                    const posSide = dataMain.posSide
                                    const side = posSide == "short" ? "Sell" : "Buy"
                                    const size = Math.abs(dataMain.pos) * digitAllCoinObject[symbol]?.ctVal
                                    const botSymbolMissID = `${botID}-${symbol}-${side}`

                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                    missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                    if (size > 0) {

                                        if (size != missTPDataBySymbol[botSymbolMissID].sizeTotal) {
                                            clearCheckMiss(botSymbolMissID)
                                            console.log("symbol", size, symbol, digitAllCoinObject[symbol]);

                                            if (size > 0 && size < Math.abs(digitAllCoinObject[symbol]?.minOrderQty) * 2) {
                                                console.log(changeColorConsole.magentaBright(`[...] Close Dư ViThe ( ${botName} - ${symbolSplit} - ${side} ) | Size: ${size} `));
                                                handleCloseMarketMiss({
                                                    botData,
                                                    posSide,
                                                    symbol,
                                                    tdMode: mgnMode,
                                                });
                                            }

                                        }
                                        if (!missTPDataBySymbol[botSymbolMissID]?.timeOutFunc) {
                                            missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                                                const unrealisedPnl = dataMain.pnl

                                                missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                                if (!missTPDataBySymbol[botSymbolMissID]?.gongLai) {

                                                    const sizeOfMiss = +missTPDataBySymbol[botSymbolMissID].size
                                                    if (sizeOfMiss >= 0 && size > sizeOfMiss && size - sizeOfMiss >= 1) {

                                                        const missSize = size - sizeOfMiss

                                                        const teleText = `⚠️ MISS | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                                                        console.log(changeColorConsole.redBright(`${teleText}\nMissSize: ${size} | ${sizeOfMiss}`));

                                                        sendMessageWithRetryWait({
                                                            messageText: teleText,
                                                            telegramID,
                                                            telegramToken
                                                        })

                                                        // handle close vithe miss
                                                        missTPDataBySymbol[botSymbolMissID].timeOutFuncCloseMiss = setTimeout(() => {
                                                            handleCloseMarketMiss({
                                                                botData,
                                                                posSide,
                                                                symbol,
                                                                tdMode: mgnMode,
                                                            });
                                                            [1, 3, 5, 15].forEach(candle => {
                                                                blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
                                                            })
                                                        }, 1 * 60 * 1000)

                                                    }
                                                    else {

                                                        console.log(`[ NOT-MISS ] | ${symbolSplit} - ${side} - Bot: ${botName}`);

                                                        clearCheckMiss(botSymbolMissID)

                                                    }
                                                }
                                                else {
                                                    const teleText = `⚠️ Gong-Lai | ${unrealisedPnl}$ \n<b>${symbolSplit}</b> | ${side} \nBot: ${botName}`
                                                    console.log(changeColorConsole.redBright(teleText));
                                                    // console.log("[...] Đang lọc OC MISS\n");

                                                    sendMessageWithRetryWait({
                                                        messageText: teleText,
                                                        telegramID,
                                                        telegramToken
                                                    })

                                                }

                                            }, 10 * 1000)
                                        }
                                    }
                                    else {
                                        clearCheckMiss(botSymbolMissID)

                                    }
                                }
                            }

                        }))

                    })

                    wsOrder.on('close', () => {
                        console.log('[V] Connection order closed');
                        wsOrder?.unsubscribe(LIST_ORDER)
                    });

                    wsOrder.on('reconnected', () => {
                        if (connectByBotError[botID]?.error) {
                            const botDataMain = botApiList[botID]

                            const telegramID = botDataMain?.telegramID
                            const telegramToken = botDataMain?.telegramToken
                            const text = `🔰 ${botName} khôi phục kết nối thành công`
                            console.log(text);
                            console.log(`[V] Reconnected Bot ( ${botName} ) successful`)
                            connectByBotError[botID].error = false
                            sendMessageWithRetryWait({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })

                            // ["1m", "3m", "5m", "15m"].forEach(candle => {
                            //     const listOCByBot = listOCByCandleBot?.[candle]?.[botID]
                            //     const listObject = listOCByBot?.listOC
                            //     listOCByBot && handleCancelAllOrderOC([listOCByBot])

                            //     listObject && Object.values(listObject).map(strategyData => {
                            //         const strategyID = strategyData.strategyID
                            //         cancelAll({ botID, strategyID })
                            //         delete listOCByCandleBot[candle][botID].listOC[strategyID]
                            //         console.log(`[V] RESET-Reconnected | ${strategyData.symbol.split("-")[0]} - ${strategyData.side} - ${strategyData.candle} - Bot: ${strategyData.botName}`);
                            //     })
                            // });
                        }
                    });

                    wsOrder.on('error', (err) => {

                        const botDataMain = botApiList[botID]
                        const codeError = err.code
                        if (codeError != connectByBotError[botID]?.code) {

                            const telegramID = botDataMain?.telegramID
                            const telegramToken = botDataMain?.telegramToken

                            const text = `🚫 [ Cảnh báo ] ${botName} đang bị gián đoạn kết nối`

                            console.log(text);
                            console.log(`[!] Connection bot ( ${botName} ) error`);
                            console.log(err);
                            connectByBotError[botID] = {
                                code: codeError,
                                error: true
                            }
                            wsOrder.connectAll()

                            sendMessageWithRetryWait({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })
                        }
        console.log("BOT ERR:",err);

                    });





                } catch (error) {
                    console.log(`[V] Subscribe order ( ${botName} ) error:`, error)
                }
            }))
        }
    } catch (error) {
        console.log("[!] Error BotApi Socket:", error)
    }
}

const handleSocketListKline = async (listKlineInput = []) => {

    const length = listKlineInput.length
    try {
        wsSymbol.subscribe(listKlineInput)
        console.log(`[V] Subscribe ${length} kline success\n`);
    } catch (err) {
        console.log(`[!] Subscribe ${length} kline error: ${err}`,)
    }

}

const handleSocketListKlineDay = async (listKlineInput) => {

    const length = listKlineInput.length
    try {
        wsSymbolDay.subscribe(listKlineInput)
        console.log(`[V] Subscribe ${length} kline2 success\n`);
    } catch (err) {
        console.log(`[!] Subscribe ${length} kline2 error: ${err}`,)
    }

}


// ----------------------------------------------------------------------------------
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const checkConditionBot = (botData) => {
    return botData.botID?.Status === "Running" && botData.botID?.ApiKey && botData.botID?.SecretKey && botData.botID?.serverIP
}

const handleSocketAddNew = async (newData = []) => {
    console.log("[...] Add New Config From Realtime", newData.length);
    const newBotApiList = {}

    await Promise.allSettled(newData.map(async newStrategiesData => {

        if (checkConditionBot(newStrategiesData)) {

            delete newStrategiesData.TimeTemp

            const symbol = newStrategiesData.symbol

            const strategyID = newStrategiesData.value

            const Candlestick = newStrategiesData.Candlestick.split("m")[0]

            const botData = newStrategiesData.botID
            const botID = botData._id
            const botName = botData.botName

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Password = botData.Password


            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                    IsActive: true
                }

            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {});
            newStrategiesData.ExpirePre = Date.now()

            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = newStrategiesData;

            cancelAll({ strategyID, botID })

        }

    }))

    await handleSocketBotApiList(newBotApiList)
}
const handleSocketUpdate = async ({
    newData = [],
    resetExpirePre = true,
    showLog = true
}) => {

    if (showLog) {
        console.log("[...] Update Config From Realtime", newData.length);
    }

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {

        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const Demo = strategiesData.botID.Demo

            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive
            const CandlestickMain = strategiesData.Candlestick
            const Candlestick = strategiesData.Candlestick.split("m")[0]

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const ExpirePre = allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID]?.ExpirePre
            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {});
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategiesData

            if (!resetExpirePre) {
                allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].ExpirePre = ExpirePre
            }
            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });


            if (IsActive) {
                if (!botApiList[botID]) {
                    botApiList[botID] = {
                        ...botApiList[botID],
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        Demo,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                        IsActive: true
                    }

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        Demo,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                        IsActive: true
                    }


                }
            }


            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: CandlestickMain,
                side,
                botName,
                botID
            }

            !listOrderOC[CandlestickMain] && (listOrderOC[CandlestickMain] = {});
            !listOrderOC[CandlestickMain][botID] && (listOrderOC[CandlestickMain][botID] = {});
            !listOrderOC[CandlestickMain][botID].listOC && (listOrderOC[CandlestickMain][botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
                botData: strategiesData.botID
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
                strategyID,
                candle: CandlestickMain,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });

            if (!IsActive) {

                allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                    ...cancelDataObject,
                    orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                    gongLai: true
                })


            }
            // if (strategyID?.includes("WAVE")) {
            //     clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.waveData?.checkingTP)
            //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].waveData = {}
            // }
        }

    }))


    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    await handleSocketBotApiList(newBotApiList, showLog)
}
const handleSocketDelete = async (newData = [], IsDeleted = true) => {

    console.log("[...] Delete Config From Realtime", newData.length);

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {
        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName
            const CandlestickMain = strategiesData.Candlestick
            const Candlestick = strategiesData.Candlestick.split("m")[0]
            const scannerID = strategiesData.scannerID

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"


            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: CandlestickMain,
                side,
                botName,
                botID
            }

            !listOrderOC[CandlestickMain] && (listOrderOC[CandlestickMain] = {});
            !listOrderOC[CandlestickMain][botID] && (listOrderOC[CandlestickMain][botID] = {});
            !listOrderOC[CandlestickMain][botID].listOC && (listOrderOC[CandlestickMain][botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });
            if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId) {
                (listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
                    strategyID,
                    candle: CandlestickMain,
                    symbol,
                    side,
                    botName,
                    botID,
                    orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
                });
            }

            if (IsDeleted) {
                allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                    ...cancelDataObject,
                    orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                    gongLai: true
                })
                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
                delete listOCByCandleBot[CandlestickMain]?.[botID]?.listOC?.[strategyID]

            }
            else {
                allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].IsDeleted = true

            }
            const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

            if (listConfigIDByScannerData?.every(strategy => {
                const strategyID = strategy.value
                return !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
            })) {
                scannerID && delete listConfigIDByScanner[scannerID]?.[symbol]
            }

        }
    }))

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])
}

const handleSocketScannerUpdate = async (newData = []) => {

    console.log("[...] Update BigBabol From Realtime", newData.length);
    const newBotApiList = {}
    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const scannerID = scannerData._id
            const IsActive = scannerData.IsActive
            const candle = scannerData.Candle.split("m")[0]

            const botData = scannerData.botID
            const botID = botData?._id
            const botName = botData.botName
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const Password = botData.Password

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
            }

            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            Object.values(allSymbol).forEach(symbolData => {

                const symbol = symbolData.value
                if (IsActive && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                    allScannerDataObject[candle] = allScannerDataObject[candle] || {}
                    allScannerDataObject[candle][symbol] = allScannerDataObject[candle][symbol] || {}

                    const newScannerData = { ...scannerData }
                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[candle][symbol][scannerID] = newScannerData
                }
                else {
                    delete allScannerDataObject[candle]?.[symbol]?.[scannerID]
                }
            })
        }
    })
    await handleSocketBotApiList(newBotApiList)
}

const handleSocketSyncCoin = async (data = { new: [] }) => {

    const newData = data.new || []

    console.log("[...] Sync New Symbol:", newData);

    const newListKline = []
    const newListKlineDay = []


    newData.forEach(item => {
        const symbol = item.value;
        const listKlineNumber = [1, 3, 5, 15];
        trichMauOCListObject[symbol] = {
            maxPrice: 0,
            minPrice: [],
            prePrice: 0,
            coinColor: [],
            curTime: 0,
            preTime: 0,
        }

        const arrayListKline = [
            {
                channel: "candle1m",
                instId: symbol
            },
            {
                channel: "candle3m",
                instId: symbol
            },
            {
                channel: "candle5m",
                instId: symbol
            },
            {
                channel: "candle15m",
                instId: symbol
            },
        ]
        const arrayListKlineDay = [
            {
                channel: "candle1s",
                instId: symbol
            },
        ]
        listKline.push(arrayListKline)
        listKlineDay.push(arrayListKlineDay)
        newListKline.push(arrayListKline)
        newListKlineDay.push(arrayListKlineDay)

        listKlineNumber.forEach(candle => {

            blockContinueOrderOCByStrategiesID[candle] = blockContinueOrderOCByStrategiesID[candle] || {}
            blockContinueOrderOCByStrategiesID[candle][symbol] = blockContinueOrderOCByStrategiesID[candle][symbol] || {}

            const symbolCandleID = `${symbol}-${candle}`

            allSymbol[symbol] = {
                value: symbol,
                volume24h: +item.volume24h
            }
            listPricePreOne[symbolCandleID] = {
                open: 0,
                close: 0,
                high: 0,
                low: 0,
            }

            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }

            priceMinMaxKhoangGiaCandleSymbol[symbolCandleID] = {
                Lowest: 0,
                Highest: 0,
                log: false
            }

        })
    });


    handleSocketListKline(newListKline)
    handleSocketListKlineDay(newListKlineDay)
    syncDigit()
    newData?.length > 0 && await handleStatistic(newData)
}

const handleSocketCancelAllConfigByScanner = async (newData = []) => {
    console.log("[...] Cancel All Config By BigBabol From Realtime", newData.length);

    const listOrderOC = {}

    await Promise.allSettled(newData.map((strategiesData) => {

        const botData = strategiesData.botID
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const botID = botData._id
        const botName = botData.botName
        const CandlestickMain = strategiesData.Candlestick
        const Candlestick = strategiesData.Candlestick.split("m")[0]
        const scannerID = strategiesData.scannerID

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        !listOrderOC[CandlestickMain] && (listOrderOC[CandlestickMain] = {});
        !listOrderOC[CandlestickMain][botID] && (listOrderOC[CandlestickMain][botID] = {});
        !listOrderOC[CandlestickMain][botID].listOC && (listOrderOC[CandlestickMain][botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId) {
            listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
                strategyID,
                candle: CandlestickMain,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            }
        }
        else {
            delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete listOCByCandleBot[CandlestickMain]?.[botID]?.listOC?.[strategyID]

        }
        scannerID && delete listConfigIDByScanner[scannerID]?.[symbol];
    }))

    const allData = ["1m", "3m", "5m", "15m"].reduce((pre, candleItem) => {
        const arr = Object.values(listOrderOC[candleItem] || {})

        if (arr.length > 0) {

            arr.forEach(item => {

                if (Object.values(item.listOC || {}).length > 0) {

                    pre[item.ApiKey] = {
                        listOC: {
                            ...(pre[item.ApiKey]?.listOC || {}),
                            ...item.listOC
                        },
                        ApiKey: item.ApiKey,
                        SecretKey: item.SecretKey,
                    }
                }
            })

        }
        return pre
    }, {});

    const listConfigIsDeleted = Object.values(allData || {})

    if (listConfigIsDeleted.length > 0) {

        await Promise.allSettled(listConfigIsDeleted.map(async item => {

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);

                const newList = list.reduce((pre, cur) => {

                    const botIDTemp = cur.botID
                    const strategyIDTemp = cur.strategyID
                    const candleTemp = cur.candle
                    const symbol = cur.symbol

                    if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                        !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC
                    ) {
                        pre.push(cur)
                    }
                    else {
                        console.log(`[V] x OC ( ${cur.botName} - ${cur.side} - ${symbol} - ${candleTemp} ) has been filled `);
                        allStrategiesByCandleAndSymbol[symbol][candleTemp.split("m")[0]][strategyIDTemp].IsDeleted = true
                    }
                    return pre
                }, [])

                await Promise.allSettled(newList.map(async item => {
                    const strategyID = item.strategyID
                    const botID = item.botID
                    const symbol = item.symbol
                    const side = item.side
                    const candle = item.candle
                    const botData = botApiList[botID]
                    handleCancelOrderOC({
                        botData,
                        orderLinkId: item.orderLinkId,
                        symbol
                    })
                        .then((res) => {
                            const response = res[0]
                            if (response.sCode == 0) {
                                console.log(`[V] x OC ( ${botData.botName} - ${side} - ${symbol} - ${candle} ) successful `);
                                cancelAll({
                                    botID,
                                    strategyID,
                                })
                                delete listOCByCandleBot[candle]?.[botID]?.listOC[strategyID]
                                delete allStrategiesByCandleAndSymbol[symbol]?.[candle.split("m")[0]]?.[strategyID]
                                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                            }
                            else {
                                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${botData.botName} - ${side} -  ${symbol} - ${candle} ) failed `, response.sMsg));
                                allStrategiesByCandleAndSymbol[symbol][candle.split("m")[0]][strategyID].IsDeleted = true
                            }
                        })
                }))
            }
        }))
        console.log("[V] Cancel All OC Successful");
    }
}
// ------------------------------ SCANNER ----------------------------------------------------


var allHistoryByCandleSymbol = {}

const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}


const sortListReverse = (arr) => {
    return [...arr].sort((a, b) => Math.abs(b.OC) - Math.abs(a.OC))
}
const handleGetLimitNen = (candle) => {
    let day = 1
    switch (candle) {
        case 1:
            day = 2
            break
        case 3:
            day = 2
            break
        case 5:
            day = 3
            break
        case 15:
            day = 5
            break
    }
    return day * 24 * 60 / Math.abs(candle)
}

const history = async ({
    symbol,
    interval,
    index,
    OpenTime
}) => {

    const limitNen = LIMIT_GET_HISTORY_ONE
    const TimeStart = OpenTime - (60 * 1000 * interval) - (60 * 1000 * interval * limitNen) * (index - 1)
    const symbolCandle = `${symbol}-${interval}`

    await clientPublic.getCandles({
        instId: symbol,
        bar: `${interval}m`,
        after: TimeStart,
        limit: limitNen
    })
        .then((listAllData) => {
            const listOC = [];
            const listOCLong = [];
            const listOCLongShort = [];

            if (listAllData?.length > 0) {

                for (let i = 0; i <= limitNen - 2; i++) {
                    const dataCoin = listAllData?.[i]
                    const dataCoinPre = listAllData?.[i + 1]

                    if (dataCoin && dataCoinPre) {
                        const Open = +dataCoin[1]
                        const Highest = +dataCoin[2]
                        const Lowest = +dataCoin[3]
                        const Close = +dataCoin[4]
                        const Turnover = +dataCoin[6]

                        const OpenPre = +dataCoinPre[1]
                        const HighestPre = +dataCoinPre[2]
                        const LowestPre = +dataCoinPre[3]
                        const ClosePre = +dataCoinPre[4]
                        const TurnoverPre = +dataCoinPre[6]


                        if (i == 0) {
                            const startTime = new Date(+dataCoin[0]).toLocaleString("vi-vn")

                            let TP = Math.abs((Highest - Close) / (Highest - Open)) || 0
                            let TPLong = Math.abs(Close - Lowest) / (Open - Lowest) || 0

                            if (TP == "Infinity") {
                                TP = 0
                            }
                            if (TPLong == "Infinity") {
                                TPLong = 0
                            }

                            const dataCoinHandle = {
                                open: Open,
                                close: Close,
                                high: Highest,
                                low: Lowest,
                                turnover: Turnover
                            }

                            const OCData = {
                                OC: roundNumber((Highest - Open) / Open),
                                TP: roundNumber(TP),
                                startTime,
                                dataCoin: dataCoinHandle
                            }
                            const OCLongData = {
                                OC: roundNumber((Lowest - Open) / Open),
                                TP: roundNumber(TPLong),
                                startTime,
                                dataCoin: dataCoinHandle
                            }
                            listOC.push(OCData)
                            listOCLong.push(OCLongData)
                            listOCLongShort.push(OCData, OCLongData)

                            if (Highest > priceMinMaxKhoangGiaCandleSymbol[symbolCandle]?.Highest || !priceMinMaxKhoangGiaCandleSymbol[symbolCandle]?.Highest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Highest = Highest
                            }
                            if (Lowest < priceMinMaxKhoangGiaCandleSymbol[symbolCandle]?.Lowest || !priceMinMaxKhoangGiaCandleSymbol[symbolCandle]?.Lowest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Lowest = Lowest
                            }
                        }
                        const startTime = new Date(+dataCoinPre[0]).toLocaleString("vi-vn")

                        let TP = Math.abs((HighestPre - ClosePre) / (HighestPre - OpenPre)) || 0
                        let TPLong = Math.abs(ClosePre - LowestPre) / (OpenPre - LowestPre) || 0

                        if (Lowest < Open) {
                            TP = Math.abs((Lowest - HighestPre) / (HighestPre - OpenPre)) || 0
                        }
                        if (Highest > Open) {
                            TPLong = Math.abs((Highest - LowestPre) / (LowestPre - OpenPre)) || 0
                        }

                        if (TP == "Infinity") {
                            TP = 0
                        }
                        if (TPLong == "Infinity") {
                            TPLong = 0
                        }

                        const dataCoinHandle = {
                            open: OpenPre,
                            close: ClosePre,
                            high: HighestPre,
                            low: LowestPre,
                            turnover: TurnoverPre
                        }
                        const OCData = {
                            OC: roundNumber((HighestPre - OpenPre) / OpenPre),
                            TP: roundNumber(TP),
                            startTime,
                            dataCoin: dataCoinHandle
                        }
                        const OCLongData = {
                            OC: roundNumber((LowestPre - OpenPre) / OpenPre),
                            TP: roundNumber(TPLong),
                            startTime,
                            dataCoin: dataCoinHandle
                        }
                        listOC.push(OCData)
                        listOCLong.push(OCLongData)
                        listOCLongShort.push(OCData, OCLongData)

                        if (i <= 100) {
                            if (HighestPre > priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Highest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Highest = HighestPre
                            }
                            if (LowestPre < priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Lowest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandle].Lowest = LowestPre
                            }
                        }
                    }
                }

                allHistoryByCandleSymbol[interval] = allHistoryByCandleSymbol[interval] || {}
                allHistoryByCandleSymbol[interval][symbol] = allHistoryByCandleSymbol[interval][symbol] || {
                    listOC: [],
                    listOCLong: [],
                    listOCLongShort: [],
                }

                allHistoryByCandleSymbol[interval][symbol].listOC.push(...listOC)
                allHistoryByCandleSymbol[interval][symbol].listOCLong.push(...listOCLong)
                allHistoryByCandleSymbol[interval][symbol].listOCLongShort.push(...listOCLongShort)
            }


        })
        .catch((error) => {
            console.error(`[!] Error get history ( ${symbol} - ${interval} )`, error);
        });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function getHistoryAllCoin({ coinList, interval, OpenTime }) {

    console.log(`[...] Processing history candle ( ${interval}m )`);
    console.time(`Timer ${interval}m`);

    let index = 0
    const batchSize = 15

    const limitNen = handleGetLimitNen(interval)
    const countLoopGet = Math.ceil(limitNen / LIMIT_GET_HISTORY_ONE)

    while (index < coinList.length) {
        const batch = coinList.slice(index, index + batchSize)

        await Promise.allSettled(batch.map(async coin => {
            for (let i = 0; i < countLoopGet; i++) {
                await history({
                    OpenTime,
                    symbol: coin.value,
                    interval,
                    index: i + 1,
                    limitNenAll: limitNen
                });
                await delay(1000);
            }
        }))

        await delay(1000);
        index += batchSize
    }

    console.log(`[V] Process history candle ( ${interval}m ) finished`);
    console.timeEnd(`Timer ${interval}m`);
}

const handleStatistic = async (coinList = Object.values(allSymbol)) => {
    for (const interval of [1, 3, 5, 15]) {
        await getHistoryAllCoin({
            coinList,
            interval,
            OpenTime: new Date().getTime()
        });
        await delay(1000);
    }
}

// ---
const handleScannerDataList = async ({
    candle,
    symbol,
}) => {

    // console.log(changeColorConsole.cyanBright(`[...] Handle history scanner ( ${symbol} - ${candle}m )`));

    const allScannerData = allScannerDataObject[candle]?.[symbol]

    allScannerData && Object.values(allScannerData)?.length > 0 && await Promise.allSettled(Object.values(allScannerData).map(async scannerData => {
        try {

            scannerData.OCLength = Math.abs(scannerData.OCLength)
            scannerData.OrderChange = Math.abs((+scannerData.OrderChange).toFixed(3))
            scannerData.TP = Math.abs(scannerData.TP)
            scannerData.ReTP = Math.abs(scannerData.ReTP)
            scannerData.Adjust = Math.abs(scannerData.Adjust)
            scannerData.Amount = Math.abs(scannerData.Amount)
            scannerData.Entry = Math.abs(scannerData.Entry)
            scannerData.Expire = Math.abs(scannerData.Expire)
            scannerData.Turnover = Math.abs(scannerData.Turnover)

            const scannerDataLabel = scannerData.Label
            const scannerID = scannerData._id
            const botData = scannerData.botID
            const Candlestick = scannerData.Candle
            const PositionSide = scannerData.PositionSide
            const Amount = scannerData.Amount
            const Expire = scannerData.Expire
            const OCLength = scannerData.OCLength
            const Turnover = scannerData.Turnover
            const OrderChange = scannerData.OrderChange
            const ReTP = scannerData.ReTP
            const IsBeta = scannerData.IsBeta
            const TakeProfit = scannerData.TP
            const Entry = scannerData.Entry

            const scannerDataIsActive = scannerData.IsActive

            const botID = botData._id
            const botName = botApiList[botID]?.botName || botData.botName

            const allHistory = allHistoryByCandleSymbol[candle]?.[symbol]

            if (scannerDataIsActive && botApiList[botID]?.IsActive && allHistory) {

                // const FrameMain = scannerData.Frame || "1D"
                // const checkTimeFrameHour = FrameMain.includes("h")
                // const Frame = checkTimeFrameHour ? FrameMain.split("h") : FrameMain.split("D")

                // const TimeHandle = checkTimeFrameHour ? 60 : 24 * 60

                // const candleQty = Math.round(Frame[0] * TimeHandle / 15)

                // const allHistory15 = allHistoryByCandleSymbol["15"]?.[symbol]

                let allHistoryList = []
                // let OCLengthCheck = false
                let conditionLongShort = 1

                switch (PositionSide) {
                    case "Long":
                        allHistoryList = allHistory.listOCLong
                        // OCLengthCheck = allHistory15.listOCLong.slice(0, candleQty).some(item => Math.abs(item.OC) >= OCLength)
                        break;
                    case "Short":
                        allHistoryList = allHistory.listOC
                        // OCLengthCheck = allHistory15.listOC.slice(0, candleQty).some(item => Math.abs(item.OC) >= OCLength)
                        break;
                    case "Long-Short":
                        allHistoryList = allHistory.listOCLongShort
                        const conditionOCLength = OCLength
                        // OCLengthCheck = allHistory15.listOCLongShort.slice(0, candleQty * 2).some(item => Math.abs(item.OC) >= conditionOCLength || Math.abs(item.OCLength) >= conditionOCLength)
                        conditionLongShort = 2
                        break
                }

                // // Check expire 
                // if (Expire && (new Date() - scannerData.ExpirePre) >= Expire * 60 * 60 * 1000) {
                //     // console.log(changeColorConsole.magentaBright(`[V] BigBabol ( ${botName} - ${symbol} - ${PositionSide} - ${Candlestick} ) expire: ${new Date() - scannerData.ExpirePre} > ${Expire * 60 * 60 * 1000}`));

                //     // Delete all config
                //     const listOCObject = listOCByCandleBot?.[Candlestick]?.[botID]?.listOC || {}

                //     const checkListOC = listOCObject && Object.values(listOCObject).filter(OCData => {
                //         return OCData.symbol === symbol && scannerID.toString() == OCData.scannerID._id.toString()
                //     })

                //     const checkListConfigIDByScanner = listConfigIDByScanner[scannerID]?.[symbol]
                //     // console.log("checkListOC",checkListOC,scannerID,listOCObject,symbol,checkListConfigIDByScanner);

                //     if (checkListConfigIDByScanner?.length > 0 && !checkListOC?.length) {
                //         delete listConfigIDByScanner[scannerID]?.[symbol]
                //         const success = await deleteStrategiesMultipleStrategyBE({
                //             botName,
                //             Candlestick,
                //             PositionSide,
                //             scannerID,
                //             symbol,
                //         })
                //         success && handleSocketDelete(checkListConfigIDByScanner.map(item => ({
                //             ...item,
                //             scannerID: item.scannerID._id
                //         })))
                //     }
                //     allScannerDataObject[candle][symbol][scannerID].ExpirePre = new Date()
                // }

                const vol24H = Math.abs(allSymbol[symbol].volume24h || 0)
                // if (OCLengthCheck && vol24H >= (Math.abs(Turnover) * 10 ** 6)) {
                if (vol24H >= (Math.abs(Turnover) * 10 ** 6)) {

                    // const RangeMain = scannerData.Range || "1D"
                    // const checkTimeFrameHour = RangeMain.includes("h")
                    // const Frame = checkTimeFrameHour ? RangeMain.split("h") : RangeMain.split("D")

                    // const TimeHandle = checkTimeFrameHour ? 60 : 24 * 60

                    const limitNenTrue = +scannerData.Range

                    const allHistoryListLimit50 = allHistoryList.slice(0, limitNenTrue * conditionLongShort)
                    // console.log("allHistoryListLimit50",allHistoryListLimit50.length);


                    const Longest = +scannerData.Longest
                    // const LongestQty = Math.round(allHistoryListLimit50.length * scannerData.Longest / 100)
                    // const RatioQty = Math.round(LongestQty * scannerData.Ratio / 100)
                    // const Elastic = Math.abs(scannerData.Elastic)
                    const Adjust = Math.abs(scannerData.Adjust)

                    // console.log("allHistoryListLimit50", allHistoryListLimit50.slice(0, 4), symbol, candle);

                    const allHistoryListSort = sortListReverse(allHistoryListLimit50)

                    // remove top max 
                    // allHistoryListSort.shift()

                    // const allHistoryListSlice = allHistoryListSort.slice(0, LongestQty).filter(allHistory => Math.abs(allHistory.TP) >= Elastic)

                    // if (allHistoryListSlice.length >= RatioQty / conditionLongShort) {

                    const allHistoryListLongestTop3 = allHistoryListSort.slice(0, Longest)
                    // const allHistoryListLongestTop3 = allHistoryListSlice

                    const OCTotal = allHistoryListLongestTop3.reduce((pre, cur) => {
                        return pre + Math.abs(cur.OC)
                    }, 0)

                    let OCAvg = Math.abs((OCTotal / allHistoryListLongestTop3.length).toFixed(3))

                    // console.log("OCAvg", OCAvg, symbol, candle, PositionSide);

                    if (OCAvg >= Math.abs(OrderChange)) {

                        let nearestCoin = Math.abs(allHistoryListLimit50[0].OC)

                        if (PositionSide === "Long-Short") {
                            nearestCoin = Math.max(Math.abs(allHistoryListLimit50[0].OC), Math.abs(allHistoryListLimit50[1].OC))
                        }

                        if (nearestCoin > OCAvg) {
                            console.log(changeColorConsole.blueBright(`[V] NearestCoin ( ${nearestCoin} ) > OCAvg ( ${OCAvg} ): ${scannerDataLabel} - ${botName} - ${PositionSide} - ${candle} - ${symbol} `));
                            OCAvg = Math.abs(((nearestCoin + OCAvg) / 2).toFixed(3))
                        }
                        // console.log("nearestCoin",nearestCoin,OCAvg,allHistoryListLimit50[0].OC,allHistoryListLimit50[1].OC,PositionSide);

                        const newOC = Math.abs((OCAvg * Adjust).toFixed(3))
                        const OCAdjust = `${OCAvg} x ${Adjust}`

                        if (listConfigIDByScanner[scannerID]?.[symbol]?.length > 0) {
                            const newDataUpdate = await updateStrategiesMultipleStrategyBE({
                                scannerID,
                                newOC,
                                symbol,
                            })

                            newDataUpdate?.length > 0 && handleSocketUpdate({
                                newData: newDataUpdate,
                                resetExpirePre: false,
                                showLog: false
                            })
                        } else {
                            const res = await createStrategiesMultipleStrategyBE({
                                botID,
                                botName,
                                symbol,
                                scannerID,
                                OCAdjust,
                                dataInput: {
                                    PositionSide,
                                    Amount,
                                    OrderChange: newOC,
                                    Candlestick,
                                    TakeProfit: TakeProfit || 40,
                                    ReduceTakeProfit: ReTP || 45,
                                    ExtendedOCPercent: 100,
                                    Ignore: 85,
                                    EntryTrailing: Entry || TakeProfit || 40,
                                    StopLose: 180,
                                    IsActive: true,
                                    Expire,
                                    Mode: scannerData.Mode,
                                    IsBeta
                                },
                            })


                            const newData = res.data

                            if (newData.length > 0) {
                                console.log(changeColorConsole.cyanBright(`\n${res.message}`));

                                listConfigIDByScanner[scannerID] = listConfigIDByScanner[scannerID] || {}
                                listConfigIDByScanner[scannerID][symbol] = newData

                                await handleSocketAddNew(newData)

                                sendMessageWithRetryWait({
                                    // messageText: `✚ ${scannerDataLabel} <b>${symbol.split("-")[0]}</b> ${PositionSide} • ${newOC}% • Vol24h: ${formatNumberString(vol24H)}`,
                                    messageText: `🌀 Create <b>${symbol.split("-")[0]}</b> ${newOC}% • ${PositionSide} • Bot: ${botName} • Label: ${scannerDataLabel}`,
                                    telegramID: botData.telegramID,
                                    telegramToken: botData.telegramToken,
                                })
                            }
                        }

                    }
                    // }
                }
            }
        } catch (error) {
            console.log(`[!] Error BigBabol ( ${symbol} - ${candle} ):`, error);
            allHistoryByCandleSymbol[candle] = {}
            allHistoryByCandleSymbol[candle][symbol] = {
                listOC: [],
                listOCLong: [],
                listOCLongShort: [],
            }
            handleStatistic(Object.values({
                [symbol]: {
                    value: symbol,
                }
            }))
        }
    }))
}

const syncVol24 = async () => {
    console.log("[...] Starting Sync Volume24h");
    const resData = await syncVol24hBE()

    resData.forEach(symbolData => {
        const symbol = symbolData.symbol
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +symbolData.volume24h
        }
    })
    console.log("[V] Sync Volume24h successfully");

}
const syncVol24AndAutoUpdateGroupCoin = async () => {

    console.log("[...] Starting Sync All Coin");

    const resData = await syncCoinBE(allbotOfServer)

    const listSymbolUpdate = resData?.newListSorted || []
    const allScannerCondition = resData?.allScannerCondition || []
    const strategiesConfigDeleted = resData?.strategiesConfigDeleted || []

    listSymbolUpdate.forEach(symbolData => {
        const symbol = symbolData.symbol
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +symbolData.volume24h
        }
    })

    allScannerCondition?.length > 0 && await handleSocketScannerUpdate(allScannerCondition)
    strategiesConfigDeleted?.length > 0 && await handleSocketCancelAllConfigByScanner(strategiesConfigDeleted)
    console.log("[V] Handle Sync All Coin Successful");
}


// ----------------------------------------------------------------------------------

const Main = async () => {

    allbotOfServer = await getAllBotIDByServerIP(SERVER_IP)

    const deleteAll = deleteAllScannerBE(allbotOfServer)
    const deleteAllUPcode = deleteAllForUPcode(allbotOfServer)

    await Promise.allSettled([deleteAll, deleteAllUPcode])

    const allSymbolArray = await getAllCoinFuturesBE()

    const allStrategiesActiveBE = getAllStrategiesActive(allbotOfServer)
    const getAllConfigScanner = getAllStrategiesActiveScannerV3BE(allbotOfServer)
    const getClearVDataBEData = getClearVDataBE()

    const result = await Promise.allSettled([allStrategiesActiveBE, getAllConfigScanner, getClearVDataBEData])

    const allStrategiesActiveObject = result[0].value || []
    const getAllConfigScannerRes = result[1].value || []
    clearVData = result[2].value || {}

    allStrategiesActiveObject.forEach(strategyItem => {
        if (checkConditionBot(strategyItem)) {

            const strategyID = strategyItem.value
            const botData = strategyItem.botID
            const botID = botData._id
            const botName = botData.botName
            const symbol = strategyItem.symbol
            const Candlestick = strategyItem.Candlestick.split("m")[0]

            botApiList[botID] = {
                ...botApiList[botID],
                id: botID,
                botName,
                ApiKey: botData.ApiKey,
                SecretKey: botData.SecretKey,
                Password: botData.Password,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
                IsActive: true
            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {});
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategyItem;

            cancelAll({ strategyID, botID })

        }
    })

    allSymbolArray.forEach(item => {
        const symbol = item.symbol
        const listKlineNumber = [1, 3, 5, 15];
        trichMauOCListObject[symbol] = {
            maxPrice: 0,
            minPrice: [],
            prePrice: 0,
            coinColor: [],
            curTime: 0,
            preTime: 0,
        }
        listKline.push(
            {
                channel: "candle1m",
                instId: symbol
            },
            {
                channel: "candle3m",
                instId: symbol
            },
            {
                channel: "candle5m",
                instId: symbol
            },
            {
                channel: "candle15m",
                instId: symbol
            },
        )
        listKlineDay.push(
            {
                channel: "candle1s",
                instId: symbol
            },
        )

        listKlineNumber.forEach(candle => {

            blockContinueOrderOCByStrategiesID[candle] = blockContinueOrderOCByStrategiesID[candle] || {}
            blockContinueOrderOCByStrategiesID[candle][symbol] = blockContinueOrderOCByStrategiesID[candle][symbol] || {}

            const symbolCandleID = `${symbol}-${candle}`



            allSymbol[symbol] = {
                value: symbol,
                volume24h: +item.volume24h
            }
            listPricePreOne[symbolCandleID] = {
                open: 0,
                close: 0,
                high: 0,
                low: 0,
            }

            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }

            priceMinMaxKhoangGiaCandleSymbol[symbolCandleID] = {
                Lowest: 0,
                Highest: 0,
                log: false
            }

        })
        getAllConfigScannerRes.forEach(scannerData => {
            const scannerID = scannerData._id

            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            if (checkConditionBot(scannerData) && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {
                const botData = scannerData.botID
                const botID = botData._id
                const botName = botData.botName

                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey: botData.ApiKey,
                    SecretKey: botData.SecretKey,
                    Password: botData.Password,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: true
                };

                const candleHandle = scannerData.Candle.split("m")[0]

                allScannerDataObject[candleHandle] = allScannerDataObject[candleHandle] || {}
                allScannerDataObject[candleHandle][symbol] = allScannerDataObject[candleHandle][symbol] || {}

                const newScannerData = { ...scannerData }

                newScannerData.ExpirePre = new Date()

                allScannerDataObject[candleHandle][symbol][scannerID] = newScannerData

            }
        })
    });


    await handleStatistic()
    await syncVol24AndAutoUpdateGroupCoin()

    allSymbolArray.forEach(item => {
        const symbol = item.symbol
        const listKlineNumber = [1, 3, 5, 15];
        listKlineNumber.forEach(candle => {
            handleScannerDataList({ candle, symbol })
        })
    });

    await syncDigit()

    await handleSocketBotApiList(botApiList)
    await handleSocketListKline(listKline)
    await handleSocketListKlineDay(listKlineDay)


    cron.schedule('*/2 * * * *', () => {
        getMoneyFuture(botApiList)
    });

    cron.schedule('*/5 * * * *', () => {
        syncVol24()
    });

    cron.schedule('*/15 * * * *', () => {
        syncVol24AndAutoUpdateGroupCoin()
    });

    cron.schedule('0 */1 * * *', async () => {
        syncDigit()
    });

    cron.schedule('0 */2 * * *', () => {
        handleClearV()
    });

    cron.schedule('0 6 * * *', () => {
        thongKeWinLoseByBot = {}
    });
}


try {
    Main()

    let cancelingAll = {};

    [1, 3, 5, 15].forEach(candleItem => {
        cancelingAll[candleItem] = {
            canceling: false,
        }
    });

    wsSymbol.on('update', async (dataCoin) => {

        if (timeoutRestartServer) {
            updatingAllMain = true
            timeoutRestartServer = false
            handleRestartServer()
        }

        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const candle = +arg.channel.split("candle")[1].split("m")[0]

        const coinOpen = +dataMain[1]
        const Highest = +dataMain[2]
        const Lowest = +dataMain[3]
        const coinCurrent = +dataMain[4]
        const turnoverCurrent = +dataMain[6]
        const dataConfirm = +dataMain[8]

        const symbolCandleID = `${symbol}-${candle}`


        if (symbol === "BTCUSDT" && candle == 1) {
            const BTCPricePercent = Math.abs(coinCurrent - coinOpen) / coinOpen * 100

            if (BTCPricePercent >= 0.7) {

                const text = `<b>🛑 BTC đang biến động ${BTCPricePercent.toFixed(2)}% [1m]</b>`
                if (BTCPricePercent >= 1) {
                    const newNangOCValue = Math.round(BTCPricePercent - 0.3) * 5

                    if (newNangOCValue !== nangOCValue) {
                        nangOCValue = newNangOCValue
                        checkOrderOCAll = false
                        sendAllBotTelegram(text)

                    }
                }
                else if (0.7 <= BTCPricePercent && BTCPricePercent < 0.8) {
                    const newNangOCValue = 1

                    if (newNangOCValue !== nangOCValue) {
                        nangOCValue = newNangOCValue
                        checkOrderOCAll = false
                        sendAllBotTelegram(text)

                    }
                }
            }
            else {
                checkOrderOCAll = true
            }

        }
        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]

        if (checkOrderOCAll) {

            !updatingAllMain && listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {

                const botID = strategy.botID._id

                if (checkConditionBot(strategy) && botApiList[botID]?.IsActive && botAmountListObject[botID]) {
                    try {
                        // if (checkConditionBot(strategy) && botApiList[botID]?.IsActive) {

                        strategy.Amount = Math.abs(strategy.Amount)
                        strategy.OrderChange = Math.abs((+strategy.OrderChange).toFixed(3))
                        strategy.TakeProfit = Math.abs(strategy.TakeProfit)
                        strategy.ReduceTakeProfit = Math.abs(strategy.ReduceTakeProfit)
                        strategy.ExtendedOCPercent = Math.abs(strategy.ExtendedOCPercent)
                        strategy.Ignore = Math.abs(strategy.Ignore)
                        strategy.EntryTrailing = Math.abs(strategy.EntryTrailing)
                        strategy.StopLose = Math.abs(strategy.StopLose)
                        strategy.OrderChangeOld = Math.abs(strategy.OrderChangeOld || strategy.OrderChange)
                        strategy.ExpirePre = strategy.ExpirePre || new Date()

                        // console.log("strategy.OrderChange", strategy.OrderChange, symbol, candle);
                        // console.log("strategy.EntryTrailing", strategy.EntryTrailing);

                        const strategyID = strategy.value
                        const Candlestick = strategy.Candlestick
                        const Amount = strategy.Amount
                        const OrderChange = strategy.OrderChange
                        const OrderChangeOld = strategy.OrderChangeOld
                        const StopLose = strategy.StopLose
                        const Ignore = strategy.Ignore
                        const ExtendedOCPercent = strategy.ExtendedOCPercent
                        const EntryTrailing = strategy.EntryTrailing
                        const EntryTrailingOld = strategy.EntryTrailingOld
                        const PositionSide = strategy.PositionSide
                        const ReduceTakeProfit = strategy.ReduceTakeProfit
                        const Expire = strategy.Expire
                        const scannerIDData = strategy?.scannerID

                        const botData = botApiList[botID]
                        const botName = botData.botName
                        const ApiKey = botData.ApiKey
                        const SecretKey = botData.SecretKey
                        const telegramID = botData.telegramID
                        const telegramToken = botData.telegramToken

                        const side = PositionSide === "Long" ? "Buy" : "Sell"

                        if (dataConfirm == 0) {


                            if (strategy.IsActive && !strategy.IsDeleted && !strategy.blockContinue) {

                                //Check expire config - OK
                                if (scannerIDData &&
                                    Expire &&
                                    (Date.now() - strategy.ExpirePre) >= Expire * 60 * 60 * 1000 &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                                ) {
                                    console.log(changeColorConsole.blueBright(`[V] Config Expire ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) ( ${Expire} min )`));

                                    strategy.IsActive = false

                                    const offSuccess = await deleteConfigBE({
                                        configID: strategy._id,
                                        symbol,
                                        strategy,
                                        botName,
                                        scannerLabel: scannerIDData?.Label
                                    })
                                    const newStrategy = strategy
                                    newStrategy.scannerID = scannerIDData?._id
                                    offSuccess && handleSocketDelete([newStrategy], false);
                                    strategy.Expire = 0
                                }
                                if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering &&
                                    !blockContinueOrderOCByStrategiesID[candle]?.[symbol]?.[botID]
                                ) {

                                    let priceOrderCheck = true

                                    // if (scannerID) {

                                    //     let listCandleCheckOCPre = []
                                    //     // let priceCheck = 0

                                    //     // if (side === "Buy") {
                                    //     //     priceCheck = (coinOpen - coinOpen * strategy.OrderChange / 100)
                                    //     // }
                                    //     // else {
                                    //     //     priceCheck = (coinOpen + coinOpen * strategy.OrderChange / 100)
                                    //     // }
                                    //     // priceCheck = Math.abs(priceCheck.toFixed(3))

                                    //     switch (Candlestick) {
                                    //         case "1m":
                                    //             listCandleCheckOCPre.push("1m")
                                    //             break
                                    //         case "3m":
                                    //             listCandleCheckOCPre.push("3m", "1m")
                                    //             break
                                    //         case "5m":
                                    //             listCandleCheckOCPre.push("5m", "1m", "3m")
                                    //             break
                                    //         case "15m":
                                    //             listCandleCheckOCPre.push("15m", "1m", "3m", "5m")
                                    //             break
                                    //     }

                                    //     for (let i = 0; i < listCandleCheckOCPre.length; i++) {
                                    //         const candle = listCandleCheckOCPre[i];
                                    //         const priceMin = minOCCandleSymbolBot[candle]?.[symbol]?.[strategy.PositionSide]?.[botID];
                                    //         if (priceMin) {
                                    //             // const adjustValue = i != 0 ? 1.3 : (1 + 0.3 / 100)
                                    //             // if (side === "Buy") {
                                    //             //     priceOrderCheck = priceCheck < priceMin * adjustValue;
                                    //             //     console.log('CHECK', Candlestick, symbol, candle, strategy.PositionSide, priceCheck, priceMin, priceMin * adjustValue, priceOrderCheck);

                                    //             // } else {
                                    //             //     priceOrderCheck = priceCheck > priceMin * adjustValue;
                                    //             //     console.log('CHECK', Candlestick, symbol, candle, strategy.PositionSide, priceCheck, priceMin, priceMin * adjustValue, priceOrderCheck);
                                    //             // }
                                    //             priceOrderCheck = strategy.OrderChange > priceMin * adjustValue;
                                    //             console.log('CHECK', symbol, candle, strategy.PositionSide, strategy.OrderChange, priceMin, priceMin * adjustValue, priceOrderCheck);

                                    //             if (i != 0) {
                                    //                 break
                                    //             }
                                    //         }
                                    //     }
                                    // }



                                    // console.log('CHECK', symbol, candle, strategy.PositionSide, OCMin, strategy.OrderChange, new Date().toLocaleString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }));;

                                    if (priceOrderCheck) {

                                        // CHECK OC MIN IN CANDLE
                                        // const OCMin = minOCCandleSymbolBot[Candlestick]?.[symbol]?.[PositionSide]?.[botID];

                                        if (true) {
                                            // strategy.OrderChange = strategy.OrderChangeOld * 1.2

                                            // let newOCNang = strategy.OrderChange
                                            // if (side === "Buy") {
                                            //     newOCNang = (coinOpen - Lowest) * 100 / coinOpen
                                            // }
                                            // else {
                                            //     newOCNang = (Highest - coinOpen) * 100 / coinOpen
                                            // }
                                            // strategy.OrderChange = Math.abs(newOCNang * 0.85)

                                            // console.log(`[V] Nâng OC: ${strategy.OrderChangeOld} -> ${strategy.OrderChange} for ${botName} - ${symbol} - ${candle} - ${strategy.PositionSide}`);

                                            // // DỰ ĐOÁN VI THE DEP-XAU
                                            // let priceOrder = 0
                                            // if (side === "Buy") {
                                            //     priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)
                                            // }
                                            // else {
                                            //     priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                                            // }
                                            // const minMaxCurrent = side == "Buy" ? Lowest : Highest
                                            // const percentPriceWithMax = Math.abs(((priceOrder - coinOpen) / (minMaxCurrent - coinOpen) * 100).toFixed(3))

                                            // let checkViTheDep = 0

                                            // if (percentPriceWithMax >= 85) {
                                            //     checkViTheDep = 1
                                            //     // Vị thế đẹp -> Bỏ Entry
                                            //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                            // }
                                            // else if (percentPriceWithMax <= 65) {
                                            //     checkViTheDep = -1
                                            //     // Hạ EntryTrailing
                                            //     strategy.EntryTrailingOld = strategy.EntryTrailingOld || strategy.EntryTrailing
                                            //     strategy.EntryTrailing = strategy.EntryTrailingOld / 2

                                            //     // Không cho mở lệnh candle hiện tại
                                            //     // allStrategiesByCandleAndSymbol[symbol][candle][strategyID].viTheXau = true
                                            //     // strategy.viTheXau = true

                                            //     // Nâng OC
                                            //     let newOCNang = 0
                                            //     if (side === "Buy") {
                                            //         newOCNang = (coinOpen - Lowest) * 100 / coinOpen


                                            //     }
                                            //     else {
                                            //         newOCNang = (Highest - coinOpen) * 100 / coinOpen
                                            //     }
                                            //     strategy.OrderChange = Math.abs(newOCNang * 0.85)
                                            // }

                                            // if (
                                            //     strategy?.duDoanViTheDepXauLog != checkViTheDep
                                            // ) {
                                            //     const info = `${botName} - ${symbol} - ${candle} - ${strategy.PositionSide}`
                                            //     let textViTheDepXau = `😊 ( ${info} )`
                                            //     switch (checkViTheDep) {
                                            //         case -1: {
                                            //             textViTheDepXau = `😢 ( ${info} ) \n-> Hạ Entry: ${strategy.EntryTrailingOld} -> ${strategy.EntryTrailing} + Nâng OC: ${strategy.OrderChangeOld} -> ${strategy.OrderChange}`
                                            //             break;
                                            //         }
                                            //         case 1: {
                                            //             textViTheDepXau = `😍 ( ${info} ) -> Remove Entry`
                                            //             break;
                                            //         }
                                            //     }
                                            //     console.log(`\n[V] Dự Đoán ViThe ( ${percentPriceWithMax}% ) ${textViTheDepXau}`)
                                            //     strategy.duDoanViTheDepXauLog = checkViTheDep
                                            // }
                                        }
                                        else {
                                            // strategy.OrderChange = strategy.OrderChangeOld
                                        }

                                        // if (new Date() - trichMauTimePre[strategyID] >= 150) {

                                        //     const khoangGia = Math.abs(coinCurrent - trichMauOCListObject[symbol].prePrice)

                                        //     // X-D-D || D-D-D

                                        //     const coinColor = (coinCurrent - trichMauOCListObject[symbol].prePrice) > 0 ? "Blue" : "Red"

                                        //     let checkColorListTrue = false

                                        //     const coinColorPre = trichMauOCListObject[symbol].coinColor

                                        //     if (coinColorPre.length > 0) {
                                        //         checkColorListTrue = coinColor === "Red"
                                        //     }
                                        //     else {
                                        //         checkColorListTrue = true
                                        //     }

                                        //     if (khoangGia > trichMauOCListObject[symbol].maxPrice) {
                                        //         trichMauOCListObject[symbol].maxPrice = khoangGia
                                        //         trichMauOCListObject[symbol].minPrice = []
                                        //         trichMauOCListObject[symbol].coinColor = []
                                        //     }
                                        //     else {
                                        //         if (khoangGia <= trichMauOCListObject[symbol].maxPrice / 4) {
                                        //             if (trichMauOCListObject[symbol].minPrice.length === 3) {
                                        //                 trichMauOCListObject[symbol].minPrice.shift()
                                        //             }
                                        //             trichMauOCListObject[symbol].minPrice.push(coinColor)
                                        //         }
                                        //     }

                                        //     if (!checkColorListTrue) {
                                        //         trichMauOCListObject[symbol].coinColor = []
                                        //     }
                                        //     else {
                                        //         if (trichMauOCListObject[symbol].coinColor.length === 3) {
                                        //             trichMauOCListObject[symbol].coinColor.shift()
                                        //         }
                                        //         trichMauOCListObject[symbol].coinColor.unshift(coinColor)
                                        //     }

                                        //     trichMauOCListObject[symbol].prePrice = coinCurrent

                                        //     trichMauTimePre[strategyID] = new Date()

                                        // }
                                        if (true) {

                                            // if (trichMauOCListObject[symbol].minPrice.length === 3) {

                                            let conditionOrderOC = 0
                                            let priceOrder = 0

                                            // Check pre coin type 

                                            let coinPreCoin = ""
                                            let coinCurCoin = ""
                                            let conditionOrder = false
                                            let conditionPre = true
                                            let checkHighLowCandle = false

                                            const pricePreData = listPricePreOne[symbolCandleID]
                                            // if (pricePreData.close) {
                                            if (pricePreData.close > pricePreData.open) {
                                                coinPreCoin = "Blue"
                                            }
                                            else {
                                                coinPreCoin = "Red"
                                            }
                                            const currentValue = coinCurrent - coinOpen
                                            if (currentValue > 0) {
                                                coinCurCoin = "Blue"
                                            }
                                            else {
                                                coinCurCoin = "Red"
                                            }
                                            // }
                                            // BUY
                                            if (side === "Buy") {

                                                if (coinPreCoin === "Blue" && coinCurCoin === "Red") {
                                                    const preValue = pricePreData.high - pricePreData.open
                                                    conditionPre = Math.abs(currentValue) >= Math.abs((Ignore / 100) * preValue)
                                                }
                                                conditionOrderOC = coinOpen - coinOpen * (OrderChange / 100) * (ExtendedOCPercent / 100)
                                                conditionOrder = conditionOrderOC >= coinCurrent && coinOpen > coinCurrent
                                                priceOrder = (coinOpen - coinOpen * OrderChange / 100)

                                                const LowPrice85 = coinOpen - Math.abs((Lowest - coinOpen) * 0.85)
                                                checkHighLowCandle = coinCurrent <= LowPrice85
                                            }
                                            else {
                                                // SELL
                                                if (coinPreCoin === "Red" && coinCurCoin === "Blue") {
                                                    const preValue = pricePreData.open - pricePreData.low
                                                    conditionPre = Math.abs(currentValue) >= Math.abs((Ignore / 100) * preValue)
                                                }
                                                conditionOrderOC = coinOpen + coinOpen * (OrderChange / 100) * (ExtendedOCPercent / 100)
                                                conditionOrder = conditionOrderOC <= coinCurrent && coinOpen < coinCurrent
                                                priceOrder = (coinOpen + coinOpen * OrderChange / 100)
                                                const HighPrice85 = coinOpen + Math.abs((Highest - coinOpen) * 0.85)
                                                checkHighLowCandle = coinCurrent >= HighPrice85
                                            }

                                            const qty = (botAmountListObject[botID] * Amount / 100 / +priceOrder).toFixed(0);


                                            const priceOC = roundPrice({
                                                price: priceOrder,
                                                symbol
                                            })

                                            const newOC = Math.abs((Math.abs((priceOC - coinOpen)) / coinOpen * 100).toFixed(3))

                                            const MaxOC = Math.abs((OrderChangeOld * StopLose / 100).toFixed(3))

                                            // let price2P = 0

                                            // if (side === "Buy") {
                                            //     const lowPrice1m = +dataMain.low;
                                            //     const price2Percent = lowPrice1m + lowPrice1m * 30 / 100;
                                            //     price2P = (price2Percent - lowPrice1m) / lowPrice1m;
                                            // }
                                            // else {
                                            //     const highPrice1m = +dataMain.high;
                                            //     const price2Percent = highPrice1m - highPrice1m * 30 / 100;
                                            //     price2P = (highPrice1m - price2Percent) / highPrice1m;
                                            // }

                                            if (conditionOrder && conditionPre && checkHighLowCandle) {
                                                // if (conditionPre) {

                                                const dataInput = {
                                                    strategy,
                                                    strategyID,
                                                    ApiKey,
                                                    SecretKey,
                                                    symbol,
                                                    qty,
                                                    side,
                                                    price: priceOC,
                                                    candle: Candlestick,
                                                    botName,
                                                    botID,
                                                    telegramID,
                                                    telegramToken,
                                                    coinOpen,
                                                    botData
                                                }


                                                if (newOC <= MaxOC) {
                                                    if (strategy?.IsBeta) {

                                                        let checkAll = -1
                                                        const trichMauColorTop3 = trichMauOCListObject[symbol].coinColor.slice(0, 3).join("-")

                                                        // let newOrderChange = strategy.OrderChange

                                                        if (side === "Buy") {
                                                            checkAll = 1
                                                            switch (trichMauColorTop3) {
                                                                case "Red-Red-Red":
                                                                    checkAll = 0
                                                                    break
                                                            }
                                                        }
                                                        else {
                                                            checkAll = 1
                                                            switch (trichMauColorTop3) {
                                                                case "Blue-Blue-Blue":
                                                                    checkAll = 0
                                                                    break
                                                            }
                                                        }
                                                        // strategy.OrderChange = newOrderChange
                                                        switch (checkAll) {
                                                            case 1: {
                                                                handleSubmitOrder(dataInput);
                                                                break
                                                            }
                                                            case 0: {
                                                                console.log(changeColorConsole.magentaBright(`Color failed: ${trichMauColorTop3} ( ${OrderChange}% ) ( ${botName} - ${symbol} - ${candle} - ${side} )`));
                                                                break
                                                            }
                                                        }
                                                    }
                                                    else {
                                                        handleSubmitOrder(dataInput)
                                                    }
                                                }
                                                else {
                                                    const scannerText = scannerIDData?._id ? `\n<code>Label: ${scannerIDData?.Label} 🌀</code>` : ""
                                                    const messageText = `⭕ Block MAXOC \n<b>${symbol.replace("USDT", "")}</b> | ${PositionSide} | ${Candlestick} ${scannerText} \nBot: ${botName} \nOC: ${OrderChangeOld} | NewOC: ${newOC} | MaxOC: ${MaxOC}`
                                                    console.log(changeColorConsole.redBright(`\n${messageText}`))
                                                    strategy.blockContinue = true
                                                    // sendMessageWithRetryWait({
                                                    //     messageText,
                                                    //     telegramID,
                                                    //     telegramToken
                                                    // })
                                                }
                                            }
                                        }
                                    }

                                }


                                // Xem xét dịch OC
                                if (
                                    allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
                                    // !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilledButMiss &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.moveAfterCompare
                                ) {

                                    const coinOpen = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen

                                    let checkMoveMain = false
                                    const percentt = 2 / 100
                                    const priceOrderOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrder

                                    if (side === "Buy") {
                                        if (coinCurrent <= (priceOrderOC + Math.abs(priceOrderOC - coinOpen) * percentt)) {
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = true
                                            checkMoveMain = true
                                        }
                                    }
                                    else {
                                        if (coinCurrent >= (priceOrderOC - Math.abs(priceOrderOC - coinOpen) * percentt)) {

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = true
                                            checkMoveMain = true
                                        }
                                    }
                                    if (checkMoveMain && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled) {

                                        const client = getRestClientV5Config({
                                            apiKey: botData.ApiKey,
                                            apiSecret: botData.SecretKey,
                                            apiPass: botData.Password,
                                        });

                                        const newOCTemp = Math.abs((coinCurrent - coinOpen)) / coinOpen * 100

                                        const priceMoveOC = roundPrice({
                                            price: coinCurrent,
                                            symbol
                                        })
                                        client
                                            .amendOrder({
                                                instId: symbol,
                                                newPx: priceMoveOC,
                                                ordId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.OC?.orderID
                                            })
                                            .then((res) => {
                                                const response = res[0]
                                                if (response.sCode == 0) {
                                                    console.log(changeColorConsole.blueBright(`[->] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, priceMoveOC))
                                                    const textQuayDau = `😃 Dịch OC ( ${OrderChange}% -> ${newOCTemp.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                                    console.log(changeColorConsole.yellowBright(textQuayDau));
                                                    // sendMessageWithRetryWait({
                                                    //     messageText: textQuayDau,
                                                    //     telegramID,
                                                    //     telegramToken
                                                    // })
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = false
                                                }
                                                else {
                                                    console.log(changeColorConsole.yellowBright(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response?.sMsg))
                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilledButMiss = true
                                                }
                                            })
                                            .catch((error) => {
                                                const errorText = error.data?.[0]?.sMsg || error.msg
                                                console.log(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error: ${errorText}`)
                                                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilledButMiss = true
                                            });
                                    }
                                }

                                // Xem xét dịch TP-Quay Đầu
                                if (
                                    allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilled
                                    // !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilledButMiss
                                ) {
                                    // if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.viTheDepXauConfirmTrue) {

                                    // const MAXKhoangGia = priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Highest
                                    // const MINKhoangGia = priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Lowest
                                    // // check min max khoảng giá

                                    // let checkKhoangGiaDep = true
                                    // if (side == "Sell") {
                                    //     if (coinCurrent >= MAXKhoangGia) {
                                    //         checkKhoangGiaDep = false
                                    //     }
                                    //     else {
                                    //         checkKhoangGiaDep = true
                                    //     }
                                    // }
                                    // else {
                                    //     if (coinCurrent <= MINKhoangGia) {
                                    //         checkKhoangGiaDep = false
                                    //     }
                                    //     else {
                                    //         checkKhoangGiaDep = true
                                    //     }
                                    // }
                                    // if (!checkKhoangGiaDep) {
                                    //     strategy.EntryTrailingOld = strategy.EntryTrailingOld || strategy.EntryTrailing
                                    //     strategy.EntryTrailing = strategy.EntryTrailingOld / 2

                                    //     if (!priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].log) {
                                    //         const info = `${symbol}-${candle}-${side}`
                                    //         console.log(`\n[V] Khoảng Giá ( ${info} ) Xấu 😢`)
                                    //         console.log(`Price Current: ${coinCurrent} - Max: ${MAXKhoangGia} - Min: ${MINKhoangGia}`);
                                    //         priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].log = true
                                    //     }
                                    // }

                                    // HANDLE CHECK VITHE FILLED

                                    // let percentOCFilledWithMixMax = 0
                                    // let checkViTheDep = 0
                                    // if (side === "Buy") {
                                    //     percentOCFilledWithMixMax = (OCPriceFilled - coinOpenOC) / (Lowest - coinOpenOC)
                                    // }
                                    // else {
                                    //     percentOCFilledWithMixMax = (OCPriceFilled - coinOpenOC) / (Highest - coinOpenOC)
                                    // }
                                    // percentOCFilledWithMixMax = Math.abs((percentOCFilledWithMixMax * 100).toFixed(3))

                                    // if (percentOCFilledWithMixMax <= 65) {
                                    //     checkViTheDep = -1
                                    //     // Hạ EntryTrailing
                                    //     strategy.EntryTrailingOld = strategy.EntryTrailingOld || strategy.EntryTrailing
                                    //     strategy.EntryTrailing = strategy.EntryTrailingOld / 2
                                    // }

                                    // if (percentOCFilledWithMixMax >= 85) {
                                    //     // Dep
                                    //     if (checkKhoangGiaDep) {
                                    //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                    //         checkViTheDep = 1
                                    //     }
                                    // }
                                    // else {
                                    //     // Nâng OC
                                    //     let newOCNang = strategy.OrderChange
                                    //     if (side === "Buy") {
                                    //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = OCPriceFilled + Math.abs((OCPriceFilled - coinOpenOC)) * (strategy.EntryTrailing / 100)
                                    //         newOCNang = (coinOpenOC - Lowest) * 100 / coinOpenOC
                                    //     }
                                    //     else {
                                    //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = OCPriceFilled - Math.abs((OCPriceFilled - coinOpenOC)) * (strategy.EntryTrailing / 100)
                                    //         newOCNang = (Highest - coinOpenOC) * 100 / coinOpenOC
                                    //     }
                                    //     newOCNang = Math.abs(newOCNang * 0.85)
                                    //     if (newOCNang) {
                                    //         strategy.OrderChange = newOCNang
                                    //     }
                                    // }

                                    // if (
                                    //     strategy?.viTheDepXauLog != checkViTheDep
                                    // ) {
                                    //     const info = `${botName} - ${symbol} - ${candle} - ${strategy.PositionSide}`
                                    //     let textViTheDepXau = `😊 ( ${info} ) \n-> Nâng OC: ${strategy.OrderChangeOld} -> ${strategy.OrderChange}`
                                    //     switch (checkViTheDep) {
                                    //         case -1: {
                                    //             textViTheDepXau = `😢 ( ${info} ) \n-> Hạ Entry: ${strategy.EntryTrailingOld} -> ${strategy.EntryTrailing} `
                                    //             break;
                                    //         }
                                    //         case 1: {
                                    //             textViTheDepXau = `😍 ( ${info} ) -> Remove Entry`
                                    //             break;
                                    //         }
                                    //     }
                                    //     console.log(`\n[V] ViThe ( ${percentOCFilledWithMixMax}% ) ${textViTheDepXau}`)
                                    //     strategy.viTheDepXauLog = checkViTheDep
                                    // }
                                    // }

                                    // const OCPriceFilled = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade
                                    // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen

                                    // if (side === "Buy") {
                                    //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = OCPriceFilled + Math.abs((OCPriceFilled - coinOpenOC)) * (strategy.EntryTrailing / 100)
                                    // }
                                    // else {
                                    //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = OCPriceFilled - Math.abs((OCPriceFilled - coinOpenOC)) * (strategy.EntryTrailing / 100)
                                    // }

                                    let checkMoveMain = false || allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess

                                    if (!checkMoveMain && !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.moveAfterCompare) {
                                        const PercentCheck = 2 / 100
                                        const sideCheck = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side

                                        const openTrade = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.coinClose || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade

                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice || coinCurrent

                                        let textQuanSat = ``
                                        if (sideCheck === "Buy") {
                                            if ((coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare)) {
                                                textQuanSat = `🙈 Vào khoảng theo dõi ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                                console.log(changeColorConsole.cyanBright(textQuanSat));
                                                // sendMessageWithRetryWait({
                                                //     messageText: textQuanSat,
                                                //     telegramID,
                                                //     telegramToken
                                                // })
                                                if (coinCurrent > allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice + Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess = true
                                                    checkMoveMain = true
                                                }
                                            }
                                        }
                                        else {
                                            if ((coinCurrent > allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare)) {
                                                textQuanSat = `🙈 Vào khoảng theo dõi ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                                console.log(changeColorConsole.cyanBright(textQuanSat));
                                                // sendMessageWithRetryWait({
                                                //     messageText: textQuanSat,
                                                //     telegramID,
                                                //     telegramToken
                                                // })
                                                if (coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice - Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess = true
                                                    checkMoveMain = true
                                                }
                                            }
                                        }
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = coinCurrent

                                    }

                                    if (checkMoveMain && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilled) {

                                        // console.log(changeColorConsole.cyanBright(`Price Move TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ):`, coinCurrent));
                                        const priceMoveTP = roundPrice({
                                            price: coinCurrent,
                                            symbol
                                        })
                                        const client = getRestClientV5Config({
                                            apiKey: botData.ApiKey,
                                            apiSecret: botData.SecretKey,
                                            apiPass: botData.Password,
                                        });

                                        client
                                            .amendOrder({
                                                instId: symbol,
                                                newPx: priceMoveTP,
                                                ordId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID
                                            })
                                            .then((res) => {
                                                const response = res[0]

                                                if (response.sCode == 0) {
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = coinCurrent
                                                    console.log(changeColorConsole.blueBright(`[->] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, priceMoveTP))
                                                    const textQuayDau = `\n😎 Quay đầu ( ${botName} - ${side} - ${symbol} - ${candle} )\n`
                                                    console.log(changeColorConsole.greenBright(textQuayDau));

                                                    strategy.blockContinue = true
                                                    // sendMessageWithRetryWait({
                                                    //     messageText: textQuayDau,
                                                    //     telegramID,
                                                    //     telegramToken
                                                    // })
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = false
                                                }
                                                else {
                                                    console.log(changeColorConsole.yellowBright(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response?.sMsg))
                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                                }
                                            })
                                            .catch((error) => {
                                                const errorText = error.data?.[0]?.sMsg || error.msg
                                                console.log(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error: ${errorText} `)
                                                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                            });


                                    }

                                }
                            }
                        }
                        // Coin CLosed
                        else if (dataConfirm == 1) {

                            // TP chưa khớp -> Dịch TP mới

                            if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP.orderID) {

                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.viTheDepXauConfirmTrue = true

                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = 0

                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.coinClose = coinCurrent

                                let newPriceCompare = 0
                                const oldPriceCompare = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare
                                if (PositionSide === "Long") {
                                    newPriceCompare = oldPriceCompare - Math.abs(oldPriceCompare - coinCurrent) * (ReduceTakeProfit / 100)
                                }
                                else {
                                    newPriceCompare = oldPriceCompare + Math.abs(oldPriceCompare - coinCurrent) * (ReduceTakeProfit / 100)
                                }

                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = newPriceCompare

                                !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID].TP.moveSuccess && handleMoveOrderTP({
                                    ApiKey,
                                    SecretKey,
                                    strategyID,
                                    strategy,
                                    candle: Candlestick,
                                    side,
                                    coinOpen: coinCurrent,
                                    botName,
                                    botID,
                                    botData
                                });
                            }

                            if (Highest > priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Highest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Highest = Highest
                            }
                            if (Lowest < priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Lowest) {
                                priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].Lowest = Lowest
                            }

                            priceMinMaxKhoangGiaCandleSymbol[symbolCandleID].log = false

                            // minOCCandleSymbolBot[Candlestick] = {}
                            // minOCCandleSymbolBot[Candlestick][symbol] = {}

                            // RESET Value
                            if (allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]) {
                                allStrategiesByCandleAndSymbol[symbol][candle][strategyID].EntryTrailing = EntryTrailingOld || EntryTrailing
                                allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = OrderChangeOld || OrderChange
                                // if (strategy.blockContinue && !strategy.nangOCBTC) {
                                // }
                            }

                            delete allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]?.duDoanViTheDepXauLog
                            delete allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]?.blockContinue
                            blockContinueOrderOCByStrategiesID[candle][symbol][botID] = false

                        }

                    } catch (error) {
                        console.log(changeColorConsole.redBright("Error When Handle Order"));
                        console.log(error);
                    }
                }
            }))

            // trichMauOCListObject[symbol].preTime = new Date()

        }

        else {
            console.log(changeColorConsole.greenBright(`[...] START NÂNG OC THÊM ${nangOCValue}`));

            if (!updatingAllMain) {

                updatingAllMain = true
                haOCFunc && clearTimeout(haOCFunc);

                const nangAllOC = Promise.allSettled(
                    Object.values(allSymbol).map(async symbolItem => {
                        const symbol = symbolItem.value;
                        return Promise.allSettled([1, 3, 5, 15].map(candle => {
                            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                            if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                    const strategyID = strategy.value
                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld || allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange
                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld + nangOCValue
                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].nangOCBTC = true
                                }))
                            }
                        }))
                    }
                    ))

                const cancelAllOC = cancelAllListOrderOC(listOCByCandleBot)

                await Promise.allSettled([nangAllOC, cancelAllOC])

                console.log(changeColorConsole.greenBright("[V] NÂNG OC XONG"));

                checkOrderOCAll = true

                haOCFunc = setTimeout(async () => {
                    console.log(changeColorConsole.greenBright("[...] START HẠ OC"));
                    await Promise.allSettled(
                        Object.values(allSymbol).map(async symbolItem => {
                            const symbol = symbolItem.value;
                            return Promise.allSettled([1, 3, 5, 15].map(candle => {
                                const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                                if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                    return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                        const strategyID = strategy.value
                                        allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld
                                        allStrategiesByCandleAndSymbol[symbol][candle][strategyID].nangOCBTC = false

                                    }))
                                }
                            }))
                        }
                        ))
                    console.log(changeColorConsole.greenBright("[V] HẠ OC XONG"));

                }, 5 * 60 * 1000)

                updatingAllMain = false
            }
        }

        // Coin CLosed
        if (dataConfirm == 1) {

            // if (candle == "D") {
            //     turnoverAvgCheckSendTeleBySymbol[symbol] = false
            // }
            const Open = coinOpen

            const Close = coinCurrent

            listPricePreOne[symbolCandleID] = {
                open: Open,
                close: Close,
                high: Highest,
                low: Lowest,
            }

            if (!cancelingAll[candle].canceling) {

                cancelingAll[candle].canceling = true

                console.log(`[V] Kline ( ${candle}m ) closed`);

                await handleCancelAllOrderOC(Object.values(listOCByCandleBot[`${candle}m`] || {}))

                setTimeout(() => {
                    cancelingAll[candle].canceling = false
                }, 10 * 1000)

            }

            // trichMauOCListObject[symbol] = {
            //     maxPrice: 0,
            //     minPrice: [],
            //     prePrice: 0,
            //     coinColor: [],
            //     curTime: 0,
            //     preTime: 0,
            // }

            // HANDLE SCANNER

            try {
                if (allHistoryByCandleSymbol[candle]?.[symbol]) {

                    const startTime = new Date(+dataMain[0]).toLocaleString("vi-vn")

                    let TP = Math.abs((Highest - Close) / (Highest - Open)) || 0

                    let TPLong = Math.abs(Close - Lowest) / (Open - Lowest) || 0

                    const dataPre = allHistoryByCandleSymbol[candle][symbol].listOC[0].dataCoin
                    const dataPreLong = allHistoryByCandleSymbol[candle][symbol].listOCLong[0].dataCoin
                    let TPPre = dataPre.TP
                    let TPLongPre = dataPreLong.TP

                    if (Lowest < Open) {
                        const OpenPre = +dataPre.open
                        const HighestPre = +dataPre.high
                        TPPre = Math.abs((Lowest - HighestPre) / (HighestPre - OpenPre)) || 0
                    }
                    if (Highest > Open) {
                        const OpenPre = +dataPreLong.open
                        const LowestPre = +dataPreLong.low
                        TPLongPre = Math.abs((Highest - LowestPre) / (LowestPre - OpenPre)) || 0
                    }

                    if (TP == "Infinity") {
                        TP = 0
                    }
                    if (TPLong == "Infinity") {
                        TPLong = 0
                    }
                    if (TPPre == "Infinity") {
                        TPPre = 0
                    }
                    if (TPLongPre == "Infinity") {
                        TPLongPre = 0
                    }

                    allHistoryByCandleSymbol[candle][symbol].listOC[0].TP = roundNumber(TPPre)
                    allHistoryByCandleSymbol[candle][symbol].listOCLong[0].TP = roundNumber(TPLongPre)

                    const OCData = {
                        OC: roundNumber((Highest - Open) / Open),
                        TP: roundNumber(TP),
                        startTime,
                        dataCoin: {
                            ...dataMain,
                            turnover: turnoverCurrent
                        }
                    }
                    const OCLongData = {
                        OC: roundNumber((Lowest - Open) / Open),
                        TP: roundNumber(TPLong),
                        startTime,
                        dataCoin: {
                            ...dataMain,
                            turnover: turnoverCurrent
                        }
                    }

                    allHistoryByCandleSymbol[candle][symbol].listOC.pop()
                    allHistoryByCandleSymbol[candle][symbol].listOC.unshift(OCData)

                    allHistoryByCandleSymbol[candle][symbol].listOCLong.pop()
                    allHistoryByCandleSymbol[candle][symbol].listOCLong.unshift(OCLongData)

                    allHistoryByCandleSymbol[candle][symbol].listOCLongShort.pop()
                    allHistoryByCandleSymbol[candle][symbol].listOCLongShort.pop()
                    allHistoryByCandleSymbol[candle][symbol].listOCLongShort.unshift(OCData, OCLongData)

                    handleScannerDataList({ candle, symbol })
                    // handleTurnoverCurrent({ candle, symbol })

                }
            }
            catch (err) {
                console.log(`Error handleScannerDataList: ${candle}-${symbol} ${err.message}`)
                allHistoryByCandleSymbol[candle] = {}
                allHistoryByCandleSymbol[candle][symbol] = {
                    listOC: [],
                    listOCLong: [],
                    listOCLongShort: [],
                }
                handleStatistic(Object.values({
                    [symbol]: {
                        value: symbol,
                    }
                }))
            }
        }

    })

    wsSymbolDay.on('update', async (dataCoin) => {
        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const coinOpen = +dataMain[1]
        const coinCurrent = +dataMain[4]

        const coinColor = (coinCurrent - coinOpen) > 0 ? "Blue" : "Red"

        trichMauOCListObject[symbol].coinColor.push(coinColor)

        if (trichMauOCListObject[symbol].coinColor?.length > 3) {
            trichMauOCListObject[symbol].coinColor.shift()
        }

    })

    wsSymbol.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbol.unsubscribe(listKline)
        wsSymbolDay.unsubscribe(listKlineDay)
    });

    wsSymbol.on('reconnected', async () => {
        if (connectKlineError) {
            const text = "🔰 Hệ thống khôi phục kết nối thành công"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[V] Reconnected kline successful')
            connectKlineError = false
            timeoutRestartServer = true
        }
    });

    wsSymbol.on('error', (err) => {
        if (!connectKlineError) {
            const text = "🚫 [ Cảnh báo ] Hệ thống đang bị gián đoạn kết nối"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[!] Connection kline error');
            console.log(err);
            connectKlineError = true
            wsSymbol.connectAll()
        }
        console.log("ERR:",err);
    });

}

catch (e) {
    console.log("Error Main:", e)
}


// REALTIME
const socket = require('socket.io-client');

const socketRealtime = socket(process.env.SOCKET_IP);

socketRealtime.on('connect', () => {
    console.log('\n[V] Connected Socket Realtime\n');
    socketRealtime.emit('joinRoom', SERVER_IP);
    socketRealtime.emit('joinRoom', 'OKX_V3');
});

socketRealtime.on('add', async (newData = []) => {
    await handleSocketAddNew(newData)

});

socketRealtime.on('update', async (newData = []) => {

    await handleSocketUpdate({ newData })


});

socketRealtime.on('delete', async (newData) => {

    await handleSocketDelete(newData)

});
socketRealtime.on('cancel-all-config-by-scanner', async (newData) => {
    await handleSocketCancelAllConfigByScanner(newData)
});


socketRealtime.on('bot-update', async (data = {}) => {

    const { botIDMain, botActive, botData, newData } = data;

    const botApiData = botApiList[botIDMain]

    if (botApiData) {
        botApiList[botIDMain].IsActive = botActive
    }

    const configData = newData.configData
    const scannerData = newData.scannerData

    const botNameExist = botApiData?.botName || botIDMain
    console.log(`[...] Bot-Update ( ${botNameExist} ) Config From Realtime: \nConfig: ${configData.length} - BigBabol: ${scannerData.length}`,);
    // console.log(`[...] Bot-Update ( ${botNameExist} ) Config From Realtime`,);

    const newBotApiList = {}


    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(configData.map((strategiesData) => {
        const botData = strategiesData.botID

        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey
        const Password = botData.Password
        const botID = botData._id
        const botName = botData.botName

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"
        const CandlestickMain = strategiesData.Candlestick
        const Candlestick = strategiesData.Candlestick.split("m")[0]

        if (checkConditionBot(strategiesData)) {

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {});
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategiesData
            // allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].IsActive = false

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

            if (botActive) {
                if (!botApiList[botID]) {

                    newBotApiList[botID] = {
                        id: botID,
                        ApiKey,
                        SecretKey,
                        Password,
                        botName,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                        IsActive: true
                    }
                }
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    ApiKey,
                    SecretKey,
                    Password,
                    botName,
                    telegramID: strategiesData.botID.telegramID,
                    telegramToken: strategiesData.botID.telegramToken,
                    IsActive: botActive
                }
            }
        }

        const cancelDataObject = {
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            candle: CandlestickMain,
            side,
            botName,
            botID
        }

        !listOrderOC[CandlestickMain] && (listOrderOC[CandlestickMain] = {});
        !listOrderOC[CandlestickMain][botID] && (listOrderOC[CandlestickMain][botID] = {});
        !listOrderOC[CandlestickMain][botID].listOC && (listOrderOC[CandlestickMain][botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
            strategyID,
            candle: CandlestickMain,
            symbol,
            side,
            botName,
            botID,
            orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
        });

        if (!botActive) {

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ...cancelDataObject,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })
        }

    }))

    Object.values(allSymbol).forEach(item => {
        const symbol = item.value
        scannerData.forEach(scannerItem => {
            if (checkConditionBot(scannerItem)) {

                const botData = scannerItem.botID
                const ApiKey = botData.ApiKey
                const SecretKey = botData.SecretKey
                const botID = botData._id
                const botName = botData.botName
                const telegramID = botData.telegramID
                const telegramToken = botData.telegramToken
                const Password = botData.Password

                const Candlestick = scannerItem.Candle.split("m")[0]
                const scannerID = scannerItem._id

                const groupCoinOnlyPairsData = scannerItem?.groupCoinOnlyPairsID
                const groupCoinBlacklistData = scannerItem?.groupCoinBlacklistID

                const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerItem.OnlyPairs)
                const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerItem.Blacklist)

                if (setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                    if (botActive) {
                        if (!botApiList[botID]) {

                            newBotApiList[botID] = {
                                id: botID,
                                ApiKey,
                                SecretKey,
                                botName,
                                telegramID,
                                telegramToken,
                                Password,
                                IsActive: true
                            }
                        }
                        botApiList[botID] = {
                            ...botApiList[botID],
                            id: botID,
                            ApiKey,
                            SecretKey,
                            botName,
                            telegramID,
                            telegramToken,
                            Password,
                            IsActive: botActive
                        }
                    }

                    allScannerDataObject[Candlestick] = allScannerDataObject[Candlestick] || {}
                    allScannerDataObject[Candlestick][symbol] = allScannerDataObject[Candlestick][symbol] || {}

                    const newScannerData = { ...scannerItem }

                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[Candlestick][symbol][scannerID] = newScannerData
                }
            }
        })
    })

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    if (botApiData) {



        // HANDLE CHANGE API
        const newBotData = botData

        const oldApi = botApiData.ApiKey
        const newApi = newBotData.ApiKey

        const oldSecretKey = botApiData.SecretKey
        const newSecretKey = newBotData.SecretKey

        if ((oldApi != newApi) || (oldSecretKey != newSecretKey)) {
            console.log("[...] Handle api change");

            // Unsub old api
            const wsOrderOld = botApiList[botIDMain].wsOrder
            await wsOrderOld?.unsubscribe(LIST_ORDER)
            await wsOrderOld?.closeAll()

            botApiList[botIDMain] = {
                ...botApiData,
                IsActive: botActive,
                ApiKey: newApi,
                SecretKey: newSecretKey,
            }

            await handleSocketBotApiList(botApiList)
        }

        if (!botActive) {
            allStrategiesByBotIDAndStrategiesID[botIDMain] = {};
            allStrategiesByBotIDAndOrderID[botIDMain] = {};
            [1, 3, 5, 15].forEach(candle => {
                Object.values(allSymbol).map(async symbolItem => {
                    const symbol = symbolItem.value
                    const botSymbolMissID = `${botIDMain}-${symbol}-Buy`
                    const botSymbolMissID2 = `${botIDMain}-${symbol}-Sell`
                    resetMissData(botSymbolMissID)
                    resetMissData(botSymbolMissID2)
                    delete listOCByCandleBot?.[`${candle}m`]?.[botIDMain]
                    blockContinueOrderOCByStrategiesID[candle][symbol][botIDMain] = false
                })
            });

            console.log(`[V] RESET All Symbol Bot: ${botApiData?.botName}`);
        }
    }
    else {
        botActive && await handleSocketBotApiList(newBotApiList)
    }

});


socketRealtime.on('bot-delete', async (data) => {
    const { newData, botID: botIDMain } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    const configData = newData.configData
    const scannerData = newData.scannerData

    console.log(`[...] Bot-Deleted ( ${botNameExist} ) Config From Realtime: \nConfig: ${configData.length} - BigBabol: ${scannerData.length}`,);

    const listOrderOC = []
    const listOrderTP = []

    await Promise.allSettled(configData.map(async (strategiesData) => {

        const ApiKey = strategiesData.botID.ApiKey
        const SecretKey = strategiesData.botID.SecretKey

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const botID = strategiesData.botID._id
        const botName = strategiesData.botID.botName

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"
        const CandlestickMain = strategiesData.Candlestick
        const Candlestick = strategiesData.Candlestick.split("m")[0]

        const cancelDataObject = {
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            candle: CandlestickMain,
            side,
            botName,
            botID
        }

        !listOrderOC[CandlestickMain] && (listOrderOC[CandlestickMain] = {});
        !listOrderOC[CandlestickMain][botID] && (listOrderOC[CandlestickMain][botID] = {});
        !listOrderOC[CandlestickMain][botID].listOC && (listOrderOC[CandlestickMain][botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });
        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
            strategyID,
            candle: CandlestickMain,
            symbol,
            side,
            botName,
            botID,
            orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
        })

        allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
            ...cancelDataObject,
            orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
            gongLai: true
        })


        delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
        delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]

    }))

    scannerData.forEach(scannerItem => {

        const Candlestick = scannerItem.Candle.split("m")[0]
        const scannerID = scannerItem._id

        Object.values(allSymbol).forEach(symbol => {
            delete allScannerDataObject[Candlestick]?.[symbol.value]?.[scannerID]
        })
    })

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    const wsOrderOld = botApiList[botIDMain].wsOrder
    await wsOrderOld?.unsubscribe(LIST_ORDER)
    await wsOrderOld?.closeAll()

    delete botApiList[botIDMain];

    ["1m", "3m", "5m", "15m"].forEach(candle => {
        delete listOCByCandleBot?.[candle]?.[botIDMain]
    });

});

socketRealtime.on('bot-telegram', async (data) => {

    const { botID: botIDMain, newApiData } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot-Telegram ( ${botNameExist} ) Update From Realtime`);

    if (botApiList[botIDMain]) {
        botApiList[botIDMain] = {
            ...botApiList[botIDMain],
            telegramID: newApiData.telegramID,
            telegramToken: newApiData.telegramToken,
            botName: newApiData.botName,
        }
    }

});

CoinFutureModel.watch([
    { $match: { operationType: "insert" } }
]).on("change", data => {
    const dataNew = data.fullDocument
    handleSocketSyncCoin({
        new: [
            {
                label: dataNew.symbol,
                value: dataNew.symbol,
                volume24h: dataNew.volume24h,
                children: []
            }
        ]
    })

})


socketRealtime.on('closeAllPosition', async (botListData = []) => {

    console.log(`[...] Close All Position From Realtime:`, botListData);

    await Promise.allSettled(botListData.map(async botData => {
        const botID = botData.botID
        const symbolList = botData.symbolList
        symbolList.forEach(symbol => {
            const botSymbolMissID = `${botID}-${symbol}-${side}`
            [1, 3, 5, 15].forEach(candle => {
                console.log(changeColorConsole.magentaBright(`[V] BLOCK Continue Order OC | ${symbol.split("-")[0]} - ${candle} - Bot: ${botApiList[botID]?.botName}`));
                const listOCByBot = listOCByCandleBot?.[`${candle}m`]?.[botID]
                listOCByBot && handleCancelAllOrderOCWithAutoCancelAll([listOCByBot])
                blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
            });
            setTimeout(() => {
                clearCheckMiss(botSymbolMissID)
                resetMissData(botSymbolMissID)

            }, 3000)
        });
    }))

});

socketRealtime.on('close-upcode', async () => {

    console.log(`[...] Closing All Bot For Upcode`);

    updatingAllMain = true

    const cancelOC = cancelAllListOrderOC(listOCByCandleBot)
    const deleteAll = deleteAllForUPcode()

    await Promise.allSettled([cancelOC, deleteAll])

    console.log("[[V] PM2 Kill Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 stop ${fileName}`)

});
socketRealtime.on('restart-code', async () => {

    handleRestartServer()

});

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});

socketRealtime.on('set-clearV', async (newData = {}) => {
    clearVData = newData
})
socketRealtime.on('clearV', async () => {
    handleClearV(true)
})

// ------- BigBabol --------------------------------

socketRealtime.on('scanner-add', async (newData = []) => {
    console.log("[...] Add BigBabol From Realtime", newData.length);

    const newBotApiList = {}

    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const scannerID = scannerData._id
            const botData = scannerData.botID
            const candle = scannerData.Candle.split("m")[0]
            const botID = botData?._id
            const botName = botData.botName
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const Password = botData.Password

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Password,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
            }


            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const OnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            OnlyPairs.forEach(symbol => {
                if (!setBlacklist.has(symbol)) {

                    allScannerDataObject[candle] = allScannerDataObject[candle] || {}
                    allScannerDataObject[candle][symbol] = allScannerDataObject[candle][symbol] || {}

                    const newScannerData = { ...scannerData }
                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[candle][symbol][scannerID] = newScannerData

                }
            })
        }
    })

    await handleSocketBotApiList(newBotApiList)

});


socketRealtime.on('scanner-update', async (newData = []) => {
    handleSocketScannerUpdate(newData)
});

socketRealtime.on('scanner-delete', async (newData = []) => {

    console.log("[...] Delete BigBabol From Realtime", newData.length);

    newData.forEach(scannerData => {
        const scannerID = scannerData._id
        const candle = scannerData.Candle.split("m")[0]
        Object.values(allSymbol).forEach(symbol => {
            delete allScannerDataObject[candle]?.[symbol.value]?.[scannerID]
        })
    })

});

socketRealtime.on('set-lever-futures', async (data) => {
    handleSetLeverForBotAndSymbolFutures(data)
});