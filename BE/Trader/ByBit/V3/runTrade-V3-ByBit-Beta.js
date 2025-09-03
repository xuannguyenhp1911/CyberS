const { default: axios } = require('axios');
const Big = require('big.js');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
require('dotenv').config({
    path: "../../../.env"
});
const SERVER_IP = process.env.SERVER_IP

const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');
const { RestClientV5, WebsocketClient } = require('bybit-api');
const {
    getAllStrategiesActive,
    getFutureBE,
    createStrategiesMultipleStrategyBE,
    updateStrategiesMultipleStrategyBE,
    deleteAllScannerBE,
    deleteAllForUPcode,
    deleteConfigBE,
    setAutoOffVolBE,
} = require('../../../controllers/Configs/ByBit/V3/config');
const {
    createPositionBE,
    updatePositionBE,
    deletePositionBE,
    getPositionBySymbol
} = require('../../../controllers/Positions/ByBit/V3/position');

const { getAllStrategiesActiveScannerV3BE } = require('../../../controllers/Configs/ByBit/V3/scanner');
const { syncCoinBE, getAllCoinBE, syncVol24hBE } = require('../../../controllers/Coins/ByBit/coinFutures');
const { getAllBotIDByServerIP } = require('../../../controllers/servers');
const { getClearVDataBE } = require('../../../controllers/Configs/ByBit/V3/configVIP');
const CoinFutureModel = require('../../../models/Coins/ByBit/coinFutures.model')

const wsSymbol = new WebsocketClient({
    market: 'v5',
    recvWindow: 100000,
    fetchTimeOffsetBeforeAuth: true,
});



const Sl_TRIGGER_PERCENT = 2
var BTC_PUMP_TIME_RESET = 5
const LIST_ORDER = ["order", "position"]
const MAX_ORDER_LIMIT = 10
const LIMIT_GET_HISTORY_ONE = 500
const FUNDING_PRE_NEXT_TIME = 10 * 60 * 1000

const TRICH_MAU_LENGTH = 5

const clientPublic = new RestClientV5({
    testnet: false,
    recv_window: 100000,
    syncTimeBeforePrivateRequests: true
});

// ----------------------------------------------------------------------------------

var BTCPumpStatus = false
var timeoutRestartServer = false
var messageTeleByBot = {}
var thongKeWinLoseByBot = {}
var clearVWinLose = {}
var allbotOfServer = []
var allScannerDataObject = {}
let missTPDataBySymbol = {}

var blockContinueOrderOCByStrategiesID = {}
var listKline = []
// var listKlineDay = []
var allSymbol = {}
var updatingAllMain = false
var connectKlineError = false
var connectByBotError = {}


// -------  ------------

var allStrategiesByCandleAndSymbol = {}
var listPricePreOne = {}
var trichMauOCListObject = {}


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
const findGocNen = (arr = []) => {

    let diffObjects = arr.map(obj => ({
        ...obj,
        diff: obj.end - obj.start
    }));

    diffObjects.sort((a, b) => a.diff - b.diff);
    let mid = Math.floor(diffObjects.length / 2);
    return diffObjects.length % 2 === 0 ? diffObjects[mid - 1] : diffObjects[mid]
}

const clearCheckMiss = (botSymbolMissID) => {
    clearTimeout(missTPDataBySymbol?.[botSymbolMissID]?.timeOutFunc)
    clearTimeout(missTPDataBySymbol?.[botSymbolMissID]?.timeOutFuncCloseMiss)
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
    const tickSize = digitAllCoinObject[symbol]?.priceTickSize
    let newPrice = new Big(price);
    if (tickSize && price) {
        const tickSizeFix = new Big(+tickSize)
        newPrice = newPrice.div(tickSizeFix).round(0, Big.roundDown).times(tickSizeFix);
        return toFixedSmall(newPrice, tickSize)
    }
    return price.toString()
}
const roundQty = (
    {
        price,
        symbol
    }
) => {
    const tickSize = digitAllCoinObject[symbol]?.qtyStepSize
    let newPrice = new Big(price);
    if (tickSize && price) {
        const tickSizeFix = new Big(+tickSize)
        newPrice = newPrice.div(tickSizeFix).round(0, Big.roundDown).times(tickSizeFix);
        return toFixedSmall(newPrice, tickSize)
    }
    return (+price).toFixed(0)
}

const getWebsocketClientConfig = ({
    ApiKey,
    SecretKey,
    Demo
}) => {
    return new WebsocketClient({
        testnet: !Demo ? false : true,
        demoTrading: !Demo ? false : true,
        fetchTimeOffsetBeforeAuth: true,
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        market: 'v5',
        recvWindow: 100000,
    })
}
const getRestClientV5Config = ({
    ApiKey,
    SecretKey,
    Demo
}) => {

    return new RestClientV5({
        testnet: !Demo ? false : true,
        demoTrading: !Demo ? false : true,
        key: ApiKey,
        secret: SecretKey,
        syncTimeBeforePrivateRequests: true,
        recvWindow: 10000,

    })
}

const handleRestartServer = async () => {
    console.log(`[...] Restarting Code`);

    updatingAllMain = true

    let allViThe = {}

    // await Promise.allSettled(Object.values(botApiList).map(dataBotItem => {

    //     const ApiKey = dataBotItem.ApiKey
    //     const SecretKey = dataBotItem.SecretKey
    //     const Demo = dataBotItem.Demo

    //     const client = getRestClientV5Config({
    //         ApiKey,
    //         SecretKey,
    //         Demo,
    //     });


    //     const botID = dataBotItem.id

    //     return client.getPositionInfo({
    //         category: 'linear',
    //         settleCoin: "USDT"
    //         // symbol: positionData.Symbol
    //     }).then(async response => {

    //         const viTheList = response.result.list;
    //         let listOC = []
    //         let symbolList = []

    //         viTheList.forEach(viTheListItem => {
    //             const symbol = viTheListItem.symbol
    //             const side = viTheListItem.side === "Buy" ? "Sell" : "Buy"
    //             listOC.push({
    //                 side,
    //                 symbol,
    //                 qty: viTheListItem.size,
    //                 orderType: "Market",
    //                 positionIdx: side == "Buy" ? 2 : 1,
    //                 reduceOnly: true
    //             })
    //             symbolList.push({ symbol, side })
    //         })

    //         allViThe[botID] = {
    //             ApiKey,
    //             SecretKey,
    //             Demo,
    //             listOC
    //         }
    //     })
    // }))

    // const items = Object.values(allViThe)
    // if (items.length > 0) {
    //     await Promise.allSettled(items.map(async item => {

    //         const client = getRestClientV5Config({
    //             ApiKey: item.ApiKey,
    //             SecretKey: item.SecretKey,
    //             Demo: item.Demo,
    //         });

    //         const list = Object.values(item.listOC || {})

    //         if (list.length > 0) {
    //             console.log(`[...] Total Position Can Be Cancelled: ${list.length}`);
    //             let index = 0;
    //             const batchSize = 10
    //             while (index < list.length) {
    //                 const batch = list.slice(index, index + batchSize);

    //                 const res = await client.batchSubmitOrders("linear", batch)

    //                 await delay(1000)
    //                 index += batchSize
    //             }
    //         }
    //     }))
    //     console.log("[V] Cancel All Position Successful");
    // }

    await cancelAllListOrderOC(listOCByCandleBot)
    await deleteAllForUPcode()

    console.log("[V] PM2 Reset All Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 restart ${fileName}`)
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
        telegramID: process.env.CLEARV_BYBIT_TELE_ID,
        telegramToken: process.env.CLEARV_BOT_TOKEN,
    });
    !fromSocket && (clearVWinLose = {});
};

// ----------------------------------------------------------------------------------


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
                        botData: item.botData,
                    }
                }
            })

        }
        return pre
    }, {});

    await handleCancelAllOrderOC(Object.values(allData || {}))

}

const syncDigit = async () => {// proScale
    await clientPublic.getInstrumentsInfo({
        category: 'linear',
        limit: 1000
    })
        .then((response) => {
            response.result.list.forEach(item => {
                digitAllCoinObject[item.symbol] = {
                    priceTickSize: item.priceFilter?.tickSize,
                    qtyStepSize: item.lotSizeFilter?.qtyStep,
                }
            })
        })
        .catch((error) => {
            console.log("Error Digit:", error)
        });
}
function hasTooManyUniqueSymbols({ listOCByCandleBot, botID, symbol, maxUnique = 3 }) {
    const uniqueSymbols = new Set();

    for (const candle in listOCByCandleBot) {
        const botData = listOCByCandleBot[candle]?.[botID];
        if (!botData?.listOC) continue;

        for (const strategyID in botData.listOC) {
            const symbol = botData.listOC[strategyID]?.symbol;
            if (symbol) uniqueSymbols.add(symbol);
        }
    }

    if (uniqueSymbols.has(symbol)) {
        return false; // ✅ Symbol đã có rồi, thêm nữa không sao
    }

    return uniqueSymbols.size + 1 > maxUnique; // ❌ Nếu thêm vào thì vượt giới hạn
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
    botData,
    botName,
    botID,
    coinOpen,
    newOC
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
        botData
    });

    const orderLinkId = uuidv4()

    let checkMaxSymbol = false
    const maxSymbolOrder = botApiList[botID]?.maxSymbol
    if (maxSymbolOrder) {
        checkMaxSymbol = hasTooManyUniqueSymbols({
            botID,
            listOCByCandleBot,
            maxUnique: +maxSymbolOrder,
            symbol
        })
    }

    if (maxSubmitOrderOCData[botID].totalOC < MAX_ORDER_LIMIT && !checkMaxSymbol) {

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = true

        maxSubmitOrderOCData[botID].totalOC += 1

        const OrderChangeOld = strategy.OrderChangeOld
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


        const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

        let slTriggerPx = 0

        const openTrade = Math.abs(price)

        if (side === "Buy") {
            slTriggerPx = openTrade - Sl_TRIGGER_PERCENT * openTrade / 100
        }
        else {
            slTriggerPx = Sl_TRIGGER_PERCENT * openTrade / 100 + openTrade
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPx = slTriggerPx

        const checkIconConfigWave = strategyID?.includes("WAVE") ? "🌊" : ""

        if (!strategy?.IsOCWait) {

            await client
                .submitOrder({
                    category: 'linear',
                    symbol,
                    side,
                    positionIdx: side == "Buy" ? 1 : 2,
                    orderType: 'Limit',
                    qty,
                    price,
                    orderLinkId,
                })
                .then((response) => {
                    if (response.retCode == 0) {

                        const newOrderID = response.result.orderId
                        const newOrderLinkID = response.result.orderLinkId

                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen = coinOpen
                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrder = +price;


                        const text = `\n[V] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful: ${price} - ${qty}`
                        console.log(text)
                        console.log(changeColorConsole.greenBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ): ${newOrderLinkID}`));

                        // sendMessageWithRetryWait({
                        //     messageText: text,
                        //     telegramID,
                        //     telegramToken
                        // })


                    }
                    else {
                        console.log(changeColorConsole.yellowBright(`\n[!] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) failed: ${response.retMsg} | ${price} - ${qty}`,))
                        delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                        delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                    }
                })
                .catch((error) => {
                    console.log(`\n[!] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) error `, error)
                    delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                    delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                });
            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
        }
        else {
            const text = `\n[...] Wait OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful: ${price} - ${qty}`
            console.log(changeColorConsole.cyanBright(text))
            setTimeout(async () => {
                await client
                    .submitOrder({
                        category: 'linear',
                        symbol,
                        side,
                        positionIdx: side == "Buy" ? 1 : 2,
                        orderType: 'Limit',
                        qty,
                        price,
                        orderLinkId,
                    })
                    .then((response) => {
                        if (response.retCode == 0) {

                            const newOrderID = response.result.orderId
                            const newOrderLinkID = response.result.orderLinkId

                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen = coinOpen


                            const text = `\n[V] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful: ${price} - ${qty}`
                            console.log(text)
                            console.log(changeColorConsole.greenBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ): ${newOrderLinkID}`));

                            // sendMessageWithRetryWait({
                            //     messageText: text,
                            //     telegramID,
                            //     telegramToken
                            // })

                        }
                        else {
                            console.log(changeColorConsole.yellowBright(`\n[!] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) failed: ${response.retMsg} | ${price} - ${qty}`,))
                            delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                            delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                        }
                    })
                    .catch((error) => {
                        console.log(`\n[!] + OC ( ${OrderChangeOld}% -> ${newOC}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) error `, error)
                        delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                        delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]
                    });
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
            }, 5000)

        }
    }
    else {
        if (!maxSubmitOrderOCData[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} ): Symbol: ${maxSymbolOrder} | Config: ${maxSubmitOrderOCData[botID].totalOC}`));
            maxSubmitOrderOCData[botID].logError = true
            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
            clearTimeout(maxSubmitOrderOCData?.[botID]?.timeout);
            maxSubmitOrderOCData[botID].timeout = setTimeout(() => {
                maxSubmitOrderOCData[botID].logError = false
                maxSubmitOrderOCData[botID].totalOC = 0
            }, 1000)
        }
    };

    if (!maxSubmitOrderOCData[botID]?.logError) {
        clearTimeout(maxSubmitOrderOCData?.[botID]?.timeout);
        maxSubmitOrderOCData[botID].timeout = setTimeout(() => {
            maxSubmitOrderOCData[botID].logError = false
            maxSubmitOrderOCData[botID].totalOC = 0
        }, 1000)
    }


    // if (allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]) {
    //     allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = strategy.OrderChangeOld || strategy.OrderChange
    // }

}

const handleCloseMarketMiss = async ({
    Quantity,
    unrealisedPnl,
    ApiKey,
    SecretKey,
    botData,
    symbol,
    side,
    botName,
    telegramID,
    telegramToken,
}) => {

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

    client
        .submitOrder({
            category: 'linear',
            symbol,
            side,
            positionIdx: side == "Buy" ? 2 : 1,
            orderType: 'Market',
            qty: Quantity.toString(),
            reduceOnly: true
        })
        .then((response) => {

            if (response.retCode == 0) {
                const text = `🍄 Clear Position | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                console.log(changeColorConsole.greenBright(text));
                sendMessageWithRetryWait({
                    messageText: text,
                    telegramID,
                    telegramToken
                })
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Auto Close Market ( ${botName} - ${symbol} - ${side}) failed: ${Quantity} - ${response.retMsg}`));
            }
        })
        .catch((error) => {
            console.log(error);
            console.log(`[!] Auto Close Market ( ${botName} - ${symbol} - ${side}) error: ${Quantity}`);
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
    ApiKey,
    SecretKey,
    missState = false,
    botName,
    botID,
    botData,
    botSymbolMissID,
    OCFilled,
    openTradeOC,
    orderLinkIDOC
}) => {

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));


    const orderLinkId = uuidv4()

    allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
        strategy,
        OrderChangeFilled,
        TP: true,
        OCFilled,
        openTradeOC
    }
    const OrderChangeOld = strategy.OrderChangeOld

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const checkIconConfigWave = strategyID?.includes("WAVE") ? "🌊" : ""

    await client
        .submitOrder({
            category: 'linear',
            symbol,
            side,
            positionIdx: side == "Buy" ? 2 : 1,
            orderType: 'Limit',
            qty,
            price,
            orderLinkId,
            reduceOnly: true
        })
        .then((response) => {
            if (response.retCode == 0) {
                const newOrderID = response.result.orderId
                const newOrderLinkID = response.result.orderLinkId

                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderLinkId = newOrderLinkID

                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty),
                    priceOrderTP: price
                }

                missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                    orderID: newOrderID,
                    strategyID
                })

                console.log(`[V] + TP ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful:  ${price} - ${qty}`)
                console.log(changeColorConsole.greenBright(`[_TP orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ): ${newOrderLinkID}`));

                clearCheckMiss(botSymbolMissID)


            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] + TP ( ${OrderChangeOld}% ) - ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) failed `, response.retMsg))
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
            }
        })
        .catch((error) => {
            console.log(`[!] + TP ( ${OrderChangeOld}% ) - ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) error `, error)
            delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
            console.log("ERROR Order TP:", error)
        });
    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.ordering = false

}

const moveOrderTP = async ({
    symbol,
    strategyID,
    strategy,
    price,
    orderId,
    candle,
    side,
    ApiKey,
    SecretKey,
    botData,
    botName }) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const OrderChangeOld = strategy.OrderChangeOld
    const checkIconConfigWave = strategyID?.includes("WAVE") ? "🌊" : ""

    await client
        .amendOrder({
            category: 'linear',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[->] Move Order TP ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful: ${price}`)
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) failed `, response.retMsg))
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) error `, error)
        });

}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
    coinOpen,
    candle = "",
    side,
    ApiKey,
    SecretKey,
    botName,
    botID,
    botData,
    newTPPrice,
    orderId
}) => {

    const sideText = side === "Buy" ? "Sell" : "buy"
    const symbol = strategy.symbol

    if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID) {

        const TPOld = allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.price

        const ReduceTakeProfit = strategy.ReduceTakeProfit

        let TPNew
        if (newTPPrice) {
            TPNew = newTPPrice
        }
        else {

            if (strategy.PositionSide === "Long") {
                TPNew = TPOld - Math.abs(TPOld - coinOpen) * (ReduceTakeProfit / 100)
            }
            else {
                TPNew = TPOld + Math.abs(TPOld - coinOpen) * (ReduceTakeProfit / 100)
            }
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            symbol,
            price: roundPrice({
                price: TPNew,
                symbol
            }),
            orderId,
            candle,
            side: sideText,
            ApiKey,
            SecretKey,
            botName,
            botID,
            botData,
            strategy
        }
        await moveOrderTP(dataInput)

    }
}
const handleCancelAllOrderOC = async (items = [], batchSize = 10) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {

            const client = getRestClientV5Config({ ApiKey: item.ApiKey, SecretKey: item.SecretKey, Demo: item.botData.Demo });

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                let index = 0;
                const listCancel = {}
                while (index < list.length) {

                    const batch = list.slice(index, index + batchSize);

                    const newList = batch.reduce((pre, cur) => {
                        const curOrderLinkId = cur.orderLinkId

                        const botIDTemp = cur.botID
                        const strategyIDTemp = cur.strategyID
                        const candleTemp = cur.candle

                        if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                            !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC
                        ) {
                            pre.push({
                                symbol: cur.symbol,
                                orderLinkId: curOrderLinkId,
                            })
                            listCancel[curOrderLinkId] = cur
                        }
                        else {
                            console.log(`[V] x OC ( ${cur.botName} - ${cur.side} -  ${cur.symbol} - ${candleTemp} ) has been filled `);
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("linear", newList)
                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []


                    listSuccess.forEach((item, index) => {
                        const orderLinkId = item.orderLinkId
                        const data = listCancel[orderLinkId]
                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const strategyIDTemp = data.strategyID
                        const candleTemp = data.candle
                        const candleTempSplit = candleTemp.split("m")[0]
                        const symbol = data.symbol
                        const scannerID = data.scannerID

                        if (codeData.code == 0) {
                            console.log(`[V] x OC ( ${data.botName} - ${data.side} -  ${symbol} - ${candleTemp} ) successful `);
                            cancelAll({
                                botID: botIDTemp,
                                strategyID: strategyIDTemp,
                            })
                            delete listOCByCandleBot[candleTemp]?.[botIDTemp]?.listOC?.[strategyIDTemp]

                            if (allStrategiesByCandleAndSymbol[symbol]?.[candleTempSplit]?.[strategyIDTemp]?.IsDeleted) {
                                {
                                    delete allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]
                                    delete allStrategiesByCandleAndSymbol[symbol]?.[candleTempSplit]?.[strategyIDTemp]
                                }
                            }
                        }
                        else {
                            console.log(changeColorConsole.yellowBright(`[!] x OC ( ${data.botName} - ${data.side} -  ${symbol} - ${candleTemp} ) failed `, codeData.msg));

                        }
                    })

                    await delay(1200)
                    index += batchSize;
                }
            }
        }))
        console.log("[V] Cancel All OC Successful");
    }
}
const handleCancelAllOrderOCWithAutoCancelAll = async (items = [], symbol, batchSize = 10) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {

            const client = getRestClientV5Config({ ApiKey: item.ApiKey, SecretKey: item.SecretKey, Demo: item.Demo });

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                let index = 0;
                const listCancel = {}
                while (index < list.length) {

                    const batch = list.slice(index, index + batchSize);

                    const newList = batch.reduce((pre, cur) => {
                        const curOrderLinkId = cur.orderLinkId

                        const botIDTemp = cur.botID
                        const strategyIDTemp = cur.strategyID
                        const candleTemp = cur.candle
                        const symbolItem = cur.symbol
                        const CandlestickMain = candleTemp.split("m")[0]

                        if (symbol == symbolItem) {

                            if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                                !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC

                            ) {
                                pre.push({
                                    symbol: symbolItem,
                                    orderLinkId: curOrderLinkId,
                                })
                                listCancel[curOrderLinkId] = cur
                            }
                            else {
                                console.log(`[V] x OC ( ${cur.botName} - ${cur.side} -  ${symbolItem} - ${candleTemp} ) has been filled `);
                                cancelAll({
                                    botID: botIDTemp,
                                    strategyID: strategyIDTemp,
                                })
                                delete listOCByCandleBot[candleTemp]?.[botIDTemp]?.listOC?.[strategyIDTemp]

                                if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickMain]?.[strategyIDTemp]?.IsDeleted) {
                                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[CandlestickMain]?.[strategyIDTemp]
                                    delete allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]
                                }
                                const botSymbolMissID = `${botIDTemp}-${symbol}-${strategyIDTemp}`

                                clearCheckMiss(botSymbolMissID)
                                resetMissData(botSymbolMissID)
                            }
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("linear", newList)
                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []


                    listSuccess.forEach((item, index) => {
                        const orderLinkId = item.orderLinkId
                        const data = listCancel[orderLinkId]
                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const strategyIDTemp = data.strategyID
                        const candleTemp = data.candle
                        const CandlestickMain = candleTemp.split("m")[0]

                        if (codeData.code == 0) {
                            console.log(`[V] x OC ( ${data.botName} - ${data.side} -  ${data.symbol} - ${candleTemp} ) successful `);
                        }
                        else {
                            console.log(changeColorConsole.yellowBright(`[!] x OC ( ${data.botName} - ${data.side} -  ${data.symbol} - ${candleTemp} ) failed `, codeData.msg));
                        }
                        cancelAll({
                            botID: botIDTemp,
                            strategyID: strategyIDTemp,
                        })
                        delete listOCByCandleBot[candleTemp]?.[botIDTemp]?.listOC?.[strategyIDTemp]

                        if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickMain]?.[strategyIDTemp]?.IsDeleted) {
                            delete allStrategiesByCandleAndSymbol?.[symbol]?.[CandlestickMain]?.[strategyIDTemp]
                            delete allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]
                        }
                    })

                    await delay(1200)
                    index += batchSize;
                }
            }
        }))
        console.log("[V] Cancel All OC Successful");
    }
}

const handleCancelOC = async ({
    symbol,
    side,
    candle = "",
    orderLinkId,
    ApiKey,
    SecretKey,
    botName,
    strategy,
    checkIconConfigWave,
    botID,
    strategyID,
    botData,
    autoReset = true
}) => {

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const OrderChangeOld = strategy.OrderChangeOld

    orderLinkId && await client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderLinkId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] x OC ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) successful `);
                if (autoReset) {
                    cancelAll({ strategyID, botID })
                }
                delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) failed `, response.retMsg))
            }

        })
        .catch((error) => {
            console.log(`[!] x OC ( ${OrderChangeOld}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${candle} ) error `, error)
        });
}
const handleCancelOrderTP = async ({
    strategyID,
    symbol,
    side,
    candle = "",
    orderId,
    ApiKey,
    SecretKey,
    gongLai = false,
    botName,
    botID,
    botData
}) => {

    const botSymbolMissID = `${botID}-${symbol}-${side}`

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

    orderId && await client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful `);

                if (gongLai && !missTPDataBySymbol[botSymbolMissID].gongLai) {
                    missTPDataBySymbol[botSymbolMissID].gongLai = true
                    clearCheckMiss(botSymbolMissID)

                    missTPDataBySymbol[botSymbolMissID]?.orderIDToDB && updatePositionBE({
                        newDataUpdate: {
                            Miss: true,
                            TimeUpdated: Date.now()
                        },
                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log(err)
                    })
                    // resetMissData({
                    //     botID,
                    //     symbol
                    // })
                }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
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
            await Promise.allSettled(batch.map(item => {
                const botID = item.botID

                handleCancelOrderTP({
                    strategyID: item.strategyID,
                    symbol: item.symbol,
                    candle: item.candle,
                    side: item.side,
                    ApiKey: item.ApiKey,
                    SecretKey: item.SecretKey,
                    botData: botApiList[botID],
                    botName: item.botName,
                    botID,
                    orderId: item.orderId,
                    gongLai: item.gongLai,
                })
            }));
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
        // if (strategyID?.includes("WAVE")) {
        //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].waveData = {}
        // }
    }

}

// const sendMessageWithRetryWait = async ({
//     messageText,
//     retries = 2,
//     telegramID,
//     telegramToken,
// }) => {
//     const url = 'https://bypass-telegram.thanhgk799.workers.dev/';

//     let BOT_TOKEN_RUN_TRADE = botListTelegram[telegramToken]

//     try {
//         if (!BOT_TOKEN_RUN_TRADE) {
//             const newBotInit = new TelegramBot(telegramToken, {
//                 polling: false,
//                 request: {
//                     agentOptions: {
//                         family: 4
//                     }
//                 }
//             })
//             BOT_TOKEN_RUN_TRADE = newBotInit
//             botListTelegram[telegramToken] = newBotInit

//             // BOT_TOKEN_RUN_TRADE.launch();
//         }

//         if (messageText) {

//             clearTimeout(messageTeleByBot[telegramID]?.timeOut)

//             messageTeleByBot[telegramID] = messageTeleByBot[telegramID] || {
//                 timeOut: "",
//                 text: [],
//                 running: false
//             }

//             if (messageTeleByBot[telegramID].running) {
//                 messageTeleByBot[telegramID].text = []
//                 messageTeleByBot[telegramID].running = false
//                 messageTeleByBot[telegramID].queue = true
//             }

//             messageTeleByBot[telegramID].text.push(messageText)

//             const messageTextListArray = messageTeleByBot[telegramID].text

//             messageTeleByBot[telegramID].timeOut = setTimeout(async () => {
//                 let index = 0;
//                 const batchSize = 10

//                 messageTeleByBot[telegramID].running = true
//                 messageTeleByBot[telegramID].queue = false


//                 while (index < messageTextListArray.length) {
//                     const batch = messageTextListArray.slice(index, index + batchSize);

//                     const messageTextList = batch.join("\n\n")

//                     for (let i = 0; i < retries; i++) {

//                         const params = new URLSearchParams({
//                             token: telegramToken,
//                             chat_id: telegramID,
//                             text: messageTextList,
//                             SECRET_KEY: process.env.TELE_BYPASS_SECRET_KEY
//                         });

//                         try {
//                             const response = await axios.get(`${url}?${params.toString()}`);

//                             const channelName = response.data?.result?.chat?.title || CHANNELID;

//                             console.log(`[->] Message sent to channel ( ${channelName} ) successfully`);
//                             break
//                         } catch (error) {
//                             console.error('[!] Send Telegram Error:', error.response?.data || error.message);
//                         }
//                     }

//                     index += batchSize;
//                     if (index < messageTextListArray.length) {
//                         await delay(3000)
//                     }
//                 }

//                 if (!messageTeleByBot[telegramID].queue) {
//                     messageTeleByBot[telegramID].text = []
//                     messageTeleByBot[telegramID].running = false
//                 }
//             }, 3000)
//         }
//     } catch (error) {
//         console.log("[!] Bot Telegram Error", error)
//     }
// };

// 

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

const sendMessageWithRetry = async ({
    messageText,
    retries = 5,
    telegramID,
    telegramToken,
}) => {
    const url = 'https://bypass-telegram.thanhgk799.workers.dev/';

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
        for (let i = 0; i < retries; i++) {

            const params = new URLSearchParams({
                token: telegramToken,
                chat_id: telegramID,
                text: messageText,
                SECRET_KEY: process.env.TELE_BYPASS_SECRET_KEY
            });

            try {
                const response = await axios.get(`${url}?${params.toString()}`);

                const channelName = response.data?.result?.chat?.title || CHANNELID;

                console.log(`[->] Message sent to channel ( ${channelName} ) successfully`);
                return

            } catch (error) {
                console.error('[!] Send Telegram Error:', error.response?.data || error.message);
            }
        }

        throw new Error('[!] Failed to send message after multiple retries');
    } catch (error) {
        console.log("[!] Bot Telegram Error", error)
    }
};

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
                        errorMessage.includes("expired") && sendMessageWithRetryWait({
                            messageText: textError,
                            telegramID: botData.telegramID,
                            telegramToken: botData.telegramToken
                        })
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

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id
                const botName = botApiList[botID]?.botName

                const wsOrder = getWebsocketClientConfig({ ApiKey, SecretKey, Demo: botApiData.Demo });

                wsOrder.subscribeV5(LIST_ORDER, 'linear').then(() => {

                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    botApiList[botID].wsOrder = wsOrder

                    wsOrder.on('update', async (dataCoin) => {

                        const botData = botApiList[botID]

                        const ApiKey = botData?.ApiKey
                        const SecretKey = botData?.SecretKey
                        const IsActive = botData?.IsActive
                        const botName = botData?.botName

                        const telegramID = botData?.telegramID
                        const telegramToken = botData?.telegramToken

                        const topicMain = dataCoin.topic
                        const dataMainAll = dataCoin.data


                        IsActive && ApiKey && SecretKey && await Promise.allSettled(dataMainAll.map(async dataMain => {

                            if (dataMain) {
                                const dataMainSide = dataMain.side
                                const symbol = dataMain.symbol
                                if (topicMain === "order") {
                                    const orderID = dataMain.orderLinkId
                                    const orderType = dataMain.orderType
                                    const orderStatus = dataMain.orderStatus
                                    const qty = +dataMain.qty

                                    try {



                                        const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                        const strategy = strategyData?.strategy
                                        const OCTrue = strategyData?.OC
                                        const TPTrue = strategyData?.TP

                                        if (strategy) {

                                            const strategyID = strategy.value
                                            const OrderChangeFilled = Math.abs((+strategyData?.OrderChangeFilled || 0).toFixed(3))
                                            const Candlestick = strategy.Candlestick
                                            const CandlestickSplit = Candlestick?.split("m")?.[0]
                                            const PositionSide = strategy.PositionSide
                                            const sideOC = PositionSide == "Long" ? "Buy" : "Sell"
                                            const Amount = strategy.Amount
                                            const TakeProfit = strategy.TakeProfit
                                            const priceOldOrder = (botAmountListObject[botID] * Amount / 100).toFixed(2)
                                            const checkIconConfigWave = strategyID?.includes("WAVE") ? "🌊" : ""

                                            // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen || strategy.coinOpen

                                            const scannerIDData = strategy?.scannerID
                                            const scannerID = scannerIDData?._id || "Manual"
                                            const scannerLabel = scannerIDData?.Label
                                            const scannerText = scannerIDData ? `\n<code>Label: ${scannerLabel} 🌀</code>` : ""

                                            if (orderStatus === "Filled" || orderStatus === "PartiallyFilled") {
                                                if (OCTrue) {

                                                    clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OCCancelTimeout)
                                                    const botSymbolMissID = `${botID}-${symbol}-${sideOC}`
                                                    clearCheckMiss(botSymbolMissID)

                                                    const coinOpenOC = strategyData.coinOpen
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true
                                                    allStrategiesByBotIDAndOrderID[botID][orderID].orderFilledOC = true

                                                    // Send telegram
                                                    const openTrade = +dataMain.avgPrice;  //Gia khop lenh

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                                    const newOC = (Math.abs((openTrade - coinOpenOC)) / coinOpenOC * 100).toFixed(2)

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
                                                        qty: qty.toString(),
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
                                                        botSymbolMissID,
                                                        OCFilled: newOC,
                                                        openTradeOC: openTrade,
                                                        orderLinkIDOC: orderID
                                                    }


                                                    if (orderStatus === "Filled") {
                                                        // clearTimeout(allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc)
                                                        // allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""

                                                        if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.ordering) {

                                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.ordering = true
                                                            clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOCTimeout)

                                                            if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                                const Quantity = dataMainSide === "Buy" ? qty : (qty * -1)

                                                                const newDataToDB = {
                                                                    Symbol: symbol,
                                                                    Side: dataMainSide,
                                                                    Quantity,
                                                                    Price: openTrade,
                                                                }

                                                                console.log(`\n[Saving->Mongo] Position When Filled OC ( ${botName} - ${dataMainSide} - ${symbol} )`);

                                                                createPositionBE({
                                                                    ...newDataToDB,
                                                                    botID,
                                                                }).then(async data => {
                                                                    console.log(data.message);
                                                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                                                    const newID = data.id
                                                                    if (newID) {
                                                                        missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                                    }
                                                                    else {
                                                                        getPositionBySymbol({ symbol, botID }).then(data => {
                                                                            console.log(data.message);
                                                                            missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                                                        }).catch(error => {
                                                                            console.log("ERROR getPositionBySymbol:", error)
                                                                        })
                                                                    }

                                                                }).catch(err => {
                                                                    console.log("ERROR createPositionBE:", err)
                                                                })
                                                            }

                                                            let teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${PositionSide} ${checkIconConfigWave} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                                            console.log(`\n\n[V] Filled OC: \n${teleText}\n`)
                                                            handleSubmitOrderTP(dataInput)
                                                            sendMessageWithRetryWait({
                                                                messageText: teleText,
                                                                telegramID,
                                                                telegramToken,
                                                            })
                                                        }
                                                    }
                                                    else {
                                                        // allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled = (allStrategiesByBotIDAndOrderID[botID][orderID]?.totalQtyPartFilled || 0) + qty
                                                        console.log(changeColorConsole.blueBright(`[V] Part_Filled OC ( ${OrderChangeFilled}% ) ( ${botName} - ${dataMainSide} - ${symbol} ${checkIconConfigWave} ): ${orderID} - ${qty}`));
                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOC = true

                                                        const orderTPWhenPartOC = 5000
                                                        if (!allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOCTimeout) {

                                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOCTimeout = setTimeout(async () => {

                                                                if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.ordering) {
                                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.ordering = true

                                                                    if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                                        const Quantity = dataMainSide === "Buy" ? qty : (qty * -1)

                                                                        const newDataToDB = {
                                                                            Symbol: symbol,
                                                                            Side: dataMainSide,
                                                                            Quantity,
                                                                            Price: openTrade,
                                                                        }

                                                                        console.log(`\n[Saving->Mongo] Position When Filled OC ( ${botName} - ${dataMainSide} - ${symbol} )`);

                                                                        createPositionBE({
                                                                            ...newDataToDB,
                                                                            botID,
                                                                        }).then(async data => {
                                                                            console.log(data.message);
                                                                            !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                                                            const newID = data.id
                                                                            if (newID) {
                                                                                missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                                            }
                                                                            else {
                                                                                getPositionBySymbol({ symbol, botID }).then(data => {
                                                                                    console.log(data.message);
                                                                                    missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                                                                }).catch(error => {
                                                                                    console.log("ERROR getPositionBySymbol:", error)
                                                                                })
                                                                            }

                                                                        }).catch(err => {
                                                                            console.log("ERROR createPositionBE:", err)
                                                                        })
                                                                    }

                                                                    await handleCancelOC({
                                                                        strategyID,
                                                                        symbol,
                                                                        side: sideOC,
                                                                        candle: Candlestick,
                                                                        orderLinkId: orderID,
                                                                        ApiKey,
                                                                        SecretKey,
                                                                        botName,
                                                                        botID,
                                                                        strategy,
                                                                        botData,
                                                                        autoReset: false
                                                                    })
                                                                    console.log(changeColorConsole.blueBright(`[V] Set TP After ${orderTPWhenPartOC} Part_Filled OC ( ${OrderChangeFilled}% ) ( ${botName} - ${dataMainSide} - ${symbol} ${checkIconConfigWave} ): ${qty}`));

                                                                    let teleText = `<b>${symbol.replace("USDT", "")}</b> | Part_Filled ${PositionSide} ${checkIconConfigWave} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                                                    console.log(`\n\n[V] Filled OC: \n${teleText}\n`)
                                                                    handleSubmitOrderTP(dataInput)
                                                                    sendMessageWithRetryWait({
                                                                        messageText: teleText,
                                                                        telegramID,
                                                                        telegramToken,
                                                                    })

                                                                }
                                                            }, orderTPWhenPartOC)
                                                        }

                                                        // if (!allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc) {
                                                        //     allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = setTimeout(async () => {
                                                        //         // const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Part_Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChange}% • P: ${openTrade} • Q: ${qtyFilledAndFee.toFixed(2)} • A: ${AmountFilled}`
                                                        //         const teleText = `<b>${symbol.replace("USDT", "")}</b> | Part_Filled ${PositionSide} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                                        //         console.log(`\n\n[V] Part_Filled OC: \n${teleText}\n`)

                                                        //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true

                                                        //         allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""
                                                        //         dataInput.qty = allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled?.toString()

                                                        //         handleCancelOC({
                                                        //             strategyID,
                                                        //             symbol,
                                                        //             side: sideOC,
                                                        //             candle: Candlestick,
                                                        //             orderLinkId: orderID,
                                                        //             ApiKey,
                                                        //             SecretKey,
                                                        //             botName,
                                                        //             botID,
                                                        //             strategy
                                                        //         })

                                                        //         handleSubmitOrderTP(dataInput)

                                                        //         sendMessageWithRetryWait({
                                                        //             messageText: teleText,
                                                        //             telegramID,
                                                        //             telegramToken,
                                                        //         })


                                                        //     }, 6000)
                                                        // }
                                                    }




                                                }
                                                // Khớp TP
                                                else if (TPTrue) {

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOC = false

                                                    const side = PositionSide === "Long" ? "Buy" : "Sell"
                                                    const botSymbolMissID = `${botID}-${symbol}-${side}`

                                                    clearCheckMiss(botSymbolMissID)
                                                    // clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.khoangNumberTimeout)

                                                    if (orderStatus === "Filled") {

                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilled = true

                                                        const closePrice = +dataMain.avgPrice;

                                                        const openTradeOCFilled = strategyData.openTradeOC

                                                        const newOC = strategyData.OCFilled

                                                        let priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;
                                                        if (PositionSide == "Short") {
                                                            priceWin = priceWin * -1
                                                        }

                                                        const priceWinPercent = Math.abs(priceWin / priceOldOrder * 100).toFixed(2) || 0;

                                                        let textWinLose = ""
                                                        let textWinLoseShort = ""

                                                        const thongKeID = `${botID}-${scannerID}`

                                                        thongKeWinLoseByBot[thongKeID] = thongKeWinLoseByBot[thongKeID] || { Win: 0, Lose: 0 }
                                                        clearVWinLose[thongKeID] = clearVWinLose[thongKeID] || { Win: 0, Lose: 0, WinMoney: 0, LoseMoney: 0 }
                                                        clearVWinLose[thongKeID].scannerID = scannerID !== "Manual" ? scannerID : ""

                                                        const priceWinABS = Math.abs(priceWin)

                                                        const PositionSideUpper = PositionSide?.toUpperCase()
                                                        if (priceWin > 0) {
                                                            textWinLose = `\n[WIN - ${PositionSideUpper}]: ${priceWin} | ${priceWinPercent}%`
                                                            textWinLoseShort = "✅"
                                                            console.log(changeColorConsole.greenBright(textWinLose));
                                                            thongKeWinLoseByBot[thongKeID].Win++
                                                            clearVWinLose[thongKeID].Win++
                                                            clearVWinLose[thongKeID].WinMoney += priceWinABS
                                                        }
                                                        else {
                                                            textWinLose = `\n[LOSE - ${PositionSideUpper}]: ${priceWin} | ${priceWinPercent}%`
                                                            textWinLoseShort = "❌"
                                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                                            if (allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID]) {
                                                                allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].blockContinue = true
                                                            }
                                                            thongKeWinLoseByBot[thongKeID].Lose++
                                                            clearVWinLose[thongKeID].Lose++
                                                            clearVWinLose[thongKeID].LoseMoney += priceWinABS

                                                        }

                                                        const textThongKeWinLose = `<i>${thongKeWinLoseByBot[thongKeID].Win} Win - ${thongKeWinLoseByBot[thongKeID].Lose} Lose</i>`

                                                        const teleText = `<b>${textWinLoseShort} ${symbol.replace("USDT", "")}</b> | Close ${PositionSide} ${checkIconConfigWave} \n${textThongKeWinLose} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                                        console.log(`[V] Filled TP: \n${teleText}`)

                                                        delete listOCByCandleBot?.[Candlestick]?.[botID]?.listOC?.[strategyID]

                                                        cancelAll({ strategyID, botID })

                                                        if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]?.IsDeleted) {
                                                            delete allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]
                                                            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                        }

                                                        clearVWinLose[thongKeID].text = `${scannerText} \nBot: ${botName}`

                                                        sendMessageWithRetryWait({
                                                            messageText: `${teleText} \n${textWinLose}`,
                                                            telegramID,
                                                            telegramToken,
                                                        })

                                                        // allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChangeOld || allStrategiesByCandleAndSymbol[symbol][CandlestickSplit][strategyID].OrderChange

                                                        missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)


                                                        // Fill toàn bộ
                                                        if (missTPDataBySymbol?.[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol?.[botSymbolMissID]?.size == 0) {
                                                            console.log(`\n[_FULL Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${Candlestick} )\n`);

                                                            if (missTPDataBySymbol?.[botSymbolMissID]?.orderIDToDB) {
                                                                deletePositionBE({
                                                                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                                }).then(message => {
                                                                    console.log(`[...] Delete Position ( ${botName} - ${side} - ${symbol} - ${Candlestick} )`);
                                                                    console.log(message);
                                                                }).catch(err => {
                                                                    console.log("ERROR deletePositionBE:", err)
                                                                })
                                                            }

                                                            console.log(`[...] Reset All ( ${botName} - ${side} - ${symbol} - ${Candlestick} )`);
                                                            setTimeout(() => {
                                                                clearCheckMiss(botSymbolMissID)
                                                                resetMissData(botSymbolMissID)
                                                            }, 2000)
                                                        }
                                                        else {
                                                            console.log(`[_Part Filled_] Filled TP ( ${OrderChangeFilled}% ) ( ${botName} - ${side} - ${symbol} - ${Candlestick} )\n`);
                                                        }
                                                    }
                                                    else {
                                                        console.log(changeColorConsole.blueBright(`[...] Part_Filled TP ( ${OrderChangeFilled}% ) ( ${botName} - ${side} - ${symbol} ${checkIconConfigWave} - ${Candlestick} ): : ${qty}`));
                                                    }

                                                }

                                            }

                                            else if (orderStatus === "Cancelled") {
                                                // console.log("[X] Cancelled");
                                                // Khớp TP
                                                if (TPTrue) {
                                                    const botSymbolMissID = `${botID}-${symbol}-${PositionSide == "Long" ? "Buy" : "Sell"}`

                                                    console.log(`[-] Cancelled TP ( ${botName} - ${PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} ${checkIconConfigWave} - ${Candlestick} ) - Chốt lời `);

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP = {}
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
                                                    // maxSubmitOrderOCData[botID][symbol].totalOC -= 1

                                                    // missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                                }
                                                else if (OCTrue) {
                                                    // maxSubmitOrderOCData[botID][symbol].totalOC -= 1

                                                    console.log(`[-] Cancelled OC ( ${botName} - ${PositionSide === "Long" ? "Buy" : "Sell"} - ${symbol} ${checkIconConfigWave} - ${Candlestick} ) `);
                                                    delete listOCByCandleBot[Candlestick]?.[botID]?.listOC?.[strategyID]

                                                    if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC) {
                                                        cancelAll({ botID, strategyID })
                                                    }
                                                }

                                            }
                                        }

                                        // User cancel vị thế ( Limit )
                                        if (!orderID && (orderStatus === "New" || orderStatus === "Filled") && orderType !== "Market") {

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
                                            //         side: dataMainSide,
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

                                            const newSize = Math.abs(qty)

                                            missTPDataBySymbol[botSymbolMissID].size = newSize
                                        }
                                        // User cancel vị thế ( Market )
                                        if (orderType === "Market") {
                                            console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} )`);

                                            [1, 3, 5, 15].forEach(candle => {
                                                console.log(changeColorConsole.magentaBright(`[V] BLOCK Continue Order OC | ${symbol.replace("USDT", "")} - ${candle} - Bot: ${botName}`));
                                                const listOCByBot = listOCByCandleBot?.[`${candle}m`]?.[botID]
                                                listOCByBot && handleCancelAllOrderOCWithAutoCancelAll([listOCByBot], symbol)
                                                blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
                                            });
                                            const botSymbolMissID = `${botID}-${symbol}-${dataMainSide == "Buy" ? "Sell" : "Buy"}`

                                            if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                                await deletePositionBE({
                                                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                }).then(message => {
                                                    console.log(message);
                                                }).catch(err => {
                                                    console.log("ERROR deletePositionBE:", err)
                                                })
                                            }
                                            setTimeout(() => {
                                                clearCheckMiss(botSymbolMissID)
                                                resetMissData(botSymbolMissID)
                                            }, 3000)
                                        }

                                        if (orderStatus === "Filled") {
                                            console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMainSide} - ${symbol} ): ${orderID} - ${qty}`,));

                                            if (!orderID) {

                                                setTimeout(() => {
                                                    ["1m", "3m", "5m", "15m"].forEach(candle => {
                                                        const listObject = listOCByCandleBot?.[candle]?.[botID]?.listOC
                                                        listObject && Object.values(listObject).map(strategyData => {
                                                            const orderLinkId = strategyData?.orderLinkId
                                                            const strategyID = strategyData?.strategyID
                                                            const symbolItem = strategyData?.symbol
                                                            const strategyDataSide = strategyData?.side
                                                            const sideConfig = strategyDataSide == "Buy" ? "Sell" : "Buy"
                                                            const CandlestickMain = candle.split("m")[0]
                                                            if (symbol == symbolItem && sideConfig == dataMainSide && allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderIDConfirm) {
                                                                {
                                                                    const botSymbolMissID = `${botID}-${symbol}-${strategyDataSide}`
                                                                    console.log(`[V] RESET-Filled | ${symbol.replace("USDT", "")} - ${strategyDataSide} - ${strategyData?.candle} - Bot: ${strategyData?.botName}`);
                                                                    cancelAll({ botID, strategyID })
                                                                    delete listOCByCandleBot[candle]?.[botID]?.listOC?.[strategyID]

                                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickMain]?.[strategyID]?.IsDeleted) {
                                                                        delete allStrategiesByCandleAndSymbol?.[symbol]?.[CandlestickMain]?.[strategyID]
                                                                        delete allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]
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
                                    } catch (error) {
                                        console.log(`[!] Handle Error Filled Order: ${error.message}`);
                                    }
                                }

                                else if (topicMain === "position") {


                                    const size = Math.abs(dataMain.size)
                                    const botSymbolMissID = `${botID}-${symbol}-${dataMainSide}`

                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                    missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                    if (size > 0) {

                                        clearCheckMiss(botSymbolMissID)

                                        missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                                            const symbol = dataMain.symbol
                                            const side = dataMainSide
                                            const openTrade = +dataMain.entryPrice;  //Gia khop lenh

                                            const unrealisedPnl = dataMain.unrealisedPnl

                                            const size = Math.abs(dataMain.size)

                                            missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                            const Quantity = side === "Buy" ? size : (size * -1)

                                            if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                const newDataToDB = {
                                                    Symbol: symbol,
                                                    Side: side,
                                                    Quantity,
                                                    Price: openTrade,
                                                    Pnl: unrealisedPnl,
                                                }

                                                console.log(`\n[Saving->Mongo] Position When Check Miss ( ${botName} - ${side} - ${symbol} )`);

                                                createPositionBE({
                                                    ...newDataToDB,
                                                    botID,
                                                }).then(async data => {
                                                    console.log(data.message);

                                                    const newID = data.id

                                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                                    if (newID) {
                                                        missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                    }
                                                    else {
                                                        getPositionBySymbol({ symbol, botID }).then(data => {
                                                            console.log(data.message);
                                                            missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                                        }).catch(error => {
                                                            console.log("ERROR getPositionBySymbol:", error)
                                                        })
                                                    }

                                                }).catch(err => {
                                                    console.log("ERROR createPositionBE:", err)
                                                })
                                            }

                                            if (!missTPDataBySymbol[botSymbolMissID]?.gongLai) {

                                                const sizeOfMiss = +missTPDataBySymbol[botSymbolMissID].size

                                                if (sizeOfMiss >= 0 && size > sizeOfMiss && size - sizeOfMiss >= 1) {
                                                    const missSize = size - sizeOfMiss

                                                    const teleText = `⚠️ MISS | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                                                    console.log(changeColorConsole.redBright(`${teleText}\nMissSize: ${size} | ${sizeOfMiss}`));

                                                    // const TPNew = missTPDataBySymbol[botSymbolMissID].priceOrderTP
                                                    let TPNew = openTrade

                                                    if (side === "Buy") {
                                                        TPNew = openTrade + (openTrade * 3 / 100) * (50 / 100)
                                                    }
                                                    else {
                                                        TPNew = openTrade - (openTrade * 3 / 100) * (50 / 100)
                                                    }

                                                    missTPDataBySymbol[botSymbolMissID].prePrice = TPNew
                                                    missTPDataBySymbol[botSymbolMissID].side = side

                                                    // const dataInput = {
                                                    //     symbol,
                                                    //     qty: missSize.toString(),
                                                    //     price: roundPrice({
                                                    //         price: TPNew,
                                                    //     }),
                                                    //     side: side === "Buy" ? "Sell" : "Buy",
                                                    //     ApiKey,
                                                    //     SecretKey,
                                                    //     missState: true,
                                                    //     botName,
                                                    //     botID,
                                                    // }

                                                    // console.log("[ Re-TP ] Order TP Miss");

                                                    // handleSubmitOrderTP(dataInput)

                                                    sendMessageWithRetryWait({
                                                        messageText: teleText,
                                                        telegramID,
                                                        telegramToken
                                                    })

                                                    updatePositionBE({
                                                        newDataUpdate: {
                                                            Miss: true
                                                        },
                                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                    }).then(message => {
                                                        console.log(message);
                                                    }).catch(err => {
                                                        console.log("ERROR updatePositionBE:", err)
                                                    })

                                                    // handle close vithe miss

                                                    missTPDataBySymbol[botSymbolMissID].timeOutFuncCloseMiss = setTimeout(() => {

                                                        handleCloseMarketMiss({
                                                            Quantity: missSize,
                                                            unrealisedPnl,
                                                            ApiKey,
                                                            SecretKey,
                                                            symbol,
                                                            side: side === "Sell" ? "Buy" : "Sell",
                                                            botName,
                                                            botData,
                                                            telegramID,
                                                            telegramToken,

                                                        });
                                                        [1, 3, 5, 15].forEach(candle => {
                                                            blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
                                                        })
                                                    }, 60 * 1000)

                                                }
                                                else {

                                                    console.log(`[ NOT-MISS ] | ${symbol.replace("USDT", "")} - ${side} - Bot: ${botName}`);
                                                    updatePositionBE({
                                                        newDataUpdate: {
                                                            Miss: false,
                                                            TimeUpdated: Date.now()
                                                        },
                                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                    }).then(message => {
                                                        console.log(message);
                                                    }).catch(err => {
                                                        console.log("ERROR updatePositionBE:", err)
                                                    })

                                                    clearCheckMiss(botSymbolMissID)

                                                }
                                            }
                                            else {
                                                const teleText = `⚠️ Gong-Lai | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                                                console.log(changeColorConsole.redBright(teleText));
                                                // console.log("[...] Đang lọc OC MISS\n");

                                                sendMessageWithRetryWait({
                                                    messageText: teleText,
                                                    telegramID,
                                                    telegramToken
                                                })
                                                // updatePositionBE({
                                                //     newDataUpdate: {
                                                //         Miss: true,
                                                //         TimeUpdated: Date.now()
                                                //     },
                                                //     orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                // }).then(message => {
                                                //     console.log(message);
                                                // }).catch(err => {
                                                //     console.log("ERROR updatePositionBE:", err)
                                                // })
                                            }

                                        }, 8000)
                                    }
                                    else {
                                        clearCheckMiss(botSymbolMissID)
                                    }
                                }
                            }

                        }))

                    })

                    wsOrder.on('close', () => {
                        wsOrder?.unsubscribeV5(LIST_ORDER, 'linear')
                        console.log('[V] Connection order closed');
                    });

                    wsOrder.on('reconnected', () => {
                        if (connectByBotError[botID]) {
                            const telegramID = botApiList[botID]?.telegramID
                            const telegramToken = botApiList[botID]?.telegramToken
                            const text = `🔰 ${botName} khôi phục kết nối thành công`
                            console.log(text);
                            console.log(`[V] Reconnected Bot ( ${botName} ) successful`)
                            connectByBotError[botID] = false
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
                            //         console.log(`[V] RESET-Reconnected | ${strategyData.symbol.replace("USDT", "")} - ${strategyData.side} - ${strategyData.candle} - Bot: ${strategyData.botName}`);
                            //     })
                            // });
                        }
                    });

                    wsOrder.on('error', (err) => {

                        if (!connectByBotError[botID]) {
                            const telegramID = botApiList[botID]?.telegramID
                            const telegramToken = botApiList[botID]?.telegramToken

                            const text = `🚫 [ Cảnh báo ] ${botName} đang bị gián đoạn kết nối`

                            console.log(text);
                            console.log(`[!] Connection bot ( ${botName} ) error`);
                            console.log(err);
                            connectByBotError[botID] = true
                            wsOrder.connectAll()

                            sendMessageWithRetryWait({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })
                        }
        console.log("BOT ERR:",err);

                    });
                }).catch(err => {
                    console.log(`[V] Subscribe order ( ${botName} ) error:`, err)
                })



            }))
        }
    } catch (error) {
        console.log("[!] Error BotApi Socket:", error)
    }
}

const handleSocketListKline = async (listKlineInput = []) => {

    listKlineInput?.length > 0 && await wsSymbol.subscribeV5(listKlineInput, 'linear').then(() => {
        console.log("[V] Subscribe kline successful\n");

    }).catch(err => {
        console.log("[!] Subscribe kline error:", err)
    })

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

            const botData = newStrategiesData.botID

            const botID = botData._id
            const botName = botData.botName
            const Candlestick = newStrategiesData.Candlestick.split("m")[0]

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Demo = botData.Demo
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const maxSymbol = botData.maxSymbol


            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    maxSymbol,
                    IsActive: true,
                    Demo
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    maxSymbol,
                    IsActive: true,
                    Demo

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

            const botData = strategiesData.botID


            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Demo = botData.Demo
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const maxSymbol = botData.maxSymbol

            const botID = botData._id
            const botName = botData.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive
            const CandlestickMain = strategiesData.Candlestick
            const Candlestick = strategiesData.Candlestick.split("m")[0]

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const ExpirePre = allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]?.ExpirePre
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
                        telegramID,
                        telegramToken,
                        maxSymbol,
                        IsActive: true
                    }

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        Demo,
                        telegramID,
                        telegramToken,
                        maxSymbol,
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
                botData: strategiesData.botID

            });
            const orderLinkId = allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            if (orderLinkId) {
                (listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
                    strategyID,
                    candle: CandlestickMain,
                    symbol,
                    side,
                    botName,
                    botID,
                    orderLinkId
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
            const Demo = botData.Demo
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const maxSymbol = botData.maxSymbol

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Demo,
                    telegramID,
                    telegramToken,
                    IsActive: true,
                    maxSymbol
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Demo,
                    telegramID,
                    telegramToken,
                    IsActive: true,
                    maxSymbol
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
                    newScannerData.ExpirePre = Date.now()

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

const handleSocketSyncCoin = async (data = []) => {

    const newData = data.new || []

    console.log("[...] Sync New Symbol:", newData);

    const newListKline = []

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
        // const klineDay = `kline.D.${symbol}`
        // newListKlineDay.push(klineDay)
        // listKlineDay.push(klineDay)


        listKlineNumber.forEach(candle => {

            const klineNew = `kline.${candle}.${symbol}`
            newListKline.push(klineNew)
            listKline.push(klineNew)

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

        })
    });

    handleSocketListKline(newListKline)
    // handleSocketListKlineDay(newListKlineDay)
    syncDigit()
    newData?.length > 0 && handleStatistic(newData)
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
            botData
        });

        const orderLinkId = allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId

        if (orderLinkId) {
            listOrderOC[CandlestickMain][botID].listOC[strategyID] = {
                strategyID,
                candle: CandlestickMain,
                symbol,
                side,
                botName,
                botID,
                orderLinkId
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
                        botData: item.botData,
                    }
                }
            })

        }
        return pre
    }, {});

    const listConfigIsDeleted = Object.values(allData || {})

    if (listConfigIsDeleted.length > 0) {
        const batchSize = 10

        await Promise.allSettled(listConfigIsDeleted.map(async item => {

            const client = getRestClientV5Config({ ApiKey: item.ApiKey, SecretKey: item.SecretKey, Demo: botData.Demo });

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                let index = 0;
                const listCancel = {}
                while (index < list.length) {

                    const batch = list.slice(index, index + batchSize);

                    const newList = batch.reduce((pre, cur) => {
                        const curOrderLinkId = cur.orderLinkId

                        const botIDTemp = cur.botID
                        const strategyIDTemp = cur.strategyID
                        const candleTemp = cur.candle
                        const symbol = cur.symbol

                        if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled &&
                            !allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.PartiallyFilledOC
                        ) {
                            pre.push({
                                symbol,
                                orderLinkId: curOrderLinkId,
                            })
                            listCancel[curOrderLinkId] = cur
                        }
                        else {
                            console.log(`[V] x OC ( ${cur.botName} - ${cur.side} -  ${symbol} - ${candleTemp} ) has been filled `);
                            allStrategiesByCandleAndSymbol[symbol][candleTemp.split("m")[0]][strategyIDTemp].IsDeleted = true
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("linear", newList)
                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []


                    listSuccess.forEach((item, index) => {
                        const orderLinkId = item.orderLinkId
                        const data = listCancel[orderLinkId]
                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const strategyIDTemp = data.strategyID
                        const candleTemp = data.candle
                        const symbol = data.symbol

                        if (codeData.code == 0) {
                            console.log(`[V] x OC ( ${data.botName} - ${data.side} -  ${symbol} - ${candleTemp} ) successful `);
                            cancelAll({
                                botID: botIDTemp,
                                strategyID: strategyIDTemp,
                            })
                            delete listOCByCandleBot[candleTemp]?.[botIDTemp]?.listOC[strategyIDTemp]
                            delete allStrategiesByCandleAndSymbol[symbol]?.[candleTemp.split("m")[0]]?.[strategyIDTemp]
                            delete allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]
                        }
                        else {
                            console.log(changeColorConsole.yellowBright(`[!] x OC ( ${data.botName} - ${data.side} -  ${symbol} - ${candleTemp} ) failed `, codeData.msg));
                            allStrategiesByCandleAndSymbol[symbol][candleTemp.split("m")[0]][strategyIDTemp].IsDeleted = true
                        }
                    })

                    await delay(1200)
                    index += batchSize;
                }

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
            {
                day = 2
                break
            }
        case 3:
            {
                day = 2
                break
            }
        case 5:
            {
                day = 3
                break
            }
        case 15:
            {
                day = 5
                break
            }
    }
    return day * 24 * 60 / Math.abs(candle)
}
const history = async ({
    symbol,
    OpenTime,
    interval,
    index,
    limitNenAll
}) => {


    const limitNen = limitNenAll > LIMIT_GET_HISTORY_ONE ? LIMIT_GET_HISTORY_ONE : limitNenAll
    const TimeStart = OpenTime - (limitNen * index) * 60 * 1000 * interval
    const TimeStop = OpenTime - 60 * 1000 * interval - 60 * 1000 * interval * limitNen * (index - 1)

    const symbolCandle = `${symbol}-${interval}`

    await clientPublic.getKline({
        category: 'linear',
        symbol,
        interval,
        start: TimeStart,
        end: TimeStop,
        limit: limitNen,
    })
        .then((response) => {
            const listOC = [];
            const listOCLong = [];
            const listOCLongShort = [];

            const listAllData = response?.result?.list

            if (listAllData?.length > 0) {

                for (let i = 0; i <= limitNen - 2; i++) {
                    const dataCoin = listAllData?.[i]
                    const dataCoinPre = listAllData?.[i + 1]

                    if (dataCoin && dataCoinPre) {
                        const Time = +dataCoin[0]
                        const Open = +dataCoin[1]
                        const Highest = +dataCoin[2]
                        const Lowest = +dataCoin[3]
                        const Close = +dataCoin[4]
                        const Turnover = +dataCoin[5]

                        const TimePre = +dataCoinPre[0]
                        const OpenPre = +dataCoinPre[1]
                        const HighestPre = +dataCoinPre[2]
                        const LowestPre = +dataCoinPre[3]
                        const ClosePre = +dataCoinPre[4]
                        const TurnoverPre = +dataCoinPre[5]


                        if (i == 0) {
                            // const startTime = new Date(Time).toLocaleString("vi-vn")
                            const startTime = Time

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
                                turnover: Turnover,
                                timestamp: Time
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
                                dataCoin: dataCoinHandle,

                            }
                            listOC.push(OCData)
                            listOCLong.push(OCLongData)
                            listOCLongShort.push(OCData, OCLongData)
                            
                        }
                        const startTime = TimePre

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
                            turnover: TurnoverPre,
                            timestamp: TimePre
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
    const batchSize = 30

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
        // for (const interval of [1, 15]) {
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
            scannerData.MaxOC = Math.abs(scannerData.MaxOC)

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
            const MaxOC = scannerData.MaxOC

            const scannerDataIsActive = scannerData.IsActive

            const botID = botData._id
            const botName = botApiList[botID]?.botName || botData.botName

            const allHistory = allHistoryByCandleSymbol[candle]?.[symbol]

            if (scannerDataIsActive && botApiList[botID]?.IsActive && allHistory) {

                const FrameMain = scannerData.Frame || "1D"
                const checkTimeFrameHour = FrameMain.includes("h")
                const Frame = checkTimeFrameHour ? FrameMain.split("h") : FrameMain.split("D")

                const TimeHandle = checkTimeFrameHour ? 60 : 24 * 60

                const candleQty = Math.round(Frame[0] * TimeHandle / 15)

                const allHistory15 = allHistoryByCandleSymbol["15"]?.[symbol]

                let allHistoryList = []
                let OCLengthCheck = false
                let conditionLongShort = 1

                switch (PositionSide) {
                    case "Long":
                        allHistoryList = allHistory.listOCLong
                        OCLengthCheck = allHistory15?.listOCLong.slice(0, candleQty).some(item => Math.abs(item.OC) >= OCLength)
                        break;
                    case "Short":
                        allHistoryList = allHistory.listOC
                        OCLengthCheck = allHistory15?.listOC.slice(0, candleQty).some(item => Math.abs(item.OC) >= OCLength)
                        break;
                    case "Long-Short":
                        allHistoryList = allHistory.listOCLongShort
                        const conditionOCLength = OCLength
                        OCLengthCheck = allHistory15?.listOCLongShort.slice(0, candleQty * 2).some(item => Math.abs(item.OC) >= conditionOCLength || Math.abs(item.OCLength) >= conditionOCLength)
                        conditionLongShort = 2
                        break
                }


                if (OCLengthCheck && Math.abs(allSymbol[symbol].volume24h || 0) >= (Math.abs(Turnover) * 10 ** 6)) {

                    const RangeMain = scannerData.Range || "1D"
                    const checkTimeFrameHour = RangeMain.includes("h")
                    const Frame = checkTimeFrameHour ? RangeMain.split("h") : RangeMain.split("D")

                    const TimeHandle = checkTimeFrameHour ? 60 : 24 * 60

                    const limitNenTrue = Math.round(Frame[0] * TimeHandle / Math.abs(candle))

                    const allHistoryListLimit50 = allHistoryList.slice(0, limitNenTrue * conditionLongShort)
                    // console.log("allHistoryListLimit50",allHistoryListLimit50.length);


                    const LongestQty = Math.round(allHistoryListLimit50.length * scannerData.Longest / 100)
                    const RatioQty = Math.round(LongestQty * scannerData.Ratio / 100)
                    const Elastic = Math.abs(scannerData.Elastic)
                    const Adjust = Math.abs(scannerData.Adjust)

                    // console.log("allHistoryListLimit50", allHistoryListLimit50.slice(0, 4), symbol, candle);

                    const allHistoryListSort = sortListReverse(allHistoryListLimit50)


                    const allHistoryListSlice = allHistoryListSort.slice(0, LongestQty).filter(allHistory => Math.abs(allHistory.TP) >= Elastic)

                    if (allHistoryListSlice.length >= RatioQty / conditionLongShort) {

                        // remove top max 
                        allHistoryListSort.shift()

                        const allHistoryListLongestTop3 = allHistoryListSort.slice(0, 3)
                        // const allHistoryListLongestTop3 = allHistoryListSlice

                        const OCTotal = allHistoryListLongestTop3.reduce((pre, cur) => {
                            return pre + Math.abs(cur.OC)
                        }, 0)

                        let OCAvg = Math.abs((OCTotal / allHistoryListLongestTop3.length).toFixed(3))

                        // console.log("OCAvg", OCAvg, symbol, candle, PositionSide);
                        const checkMaxOC = MaxOC > 0 ? OCAvg <= MaxOC : true

                        if (OCAvg >= Math.abs(OrderChange) && checkMaxOC) {
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
                                        IsBeta,
                                        IsOCWait: scannerData?.IsOCWait,
                                        IsDev: scannerData?.IsDev
                                    },
                                })


                                const newData = res.data

                                if (newData.length > 0) {
                                    console.log(changeColorConsole.cyanBright(`\n${res.message}`));

                                    listConfigIDByScanner[scannerID] = listConfigIDByScanner[scannerID] || {}
                                    listConfigIDByScanner[scannerID][symbol] = newData

                                    await handleSocketAddNew(newData)

                                    sendMessageWithRetryWait({
                                        messageText: `🌀 Create <b>${symbol.replace("USDT", "")}</b> ${newOC}% • ${PositionSide} • Bot: ${botName} • Label: ${scannerDataLabel}`,
                                        telegramID: botData.telegramID,
                                        telegramToken: botData.telegramToken,
                                    })
                                }
                            }


                        }
                    }
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
    console.log("[...] Starting Sync Volume 24h");
    const resData = await syncVol24hBE()

    resData.forEach(symbolData => {
        const symbol = symbolData.symbol
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +symbolData.volume24h
        }
    })
    console.log("[V] Sync Volume 24h successfully");

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

    const allUpdateConfig = await setAutoOffVolBE(Object.values(botApiList).map(item => item.id), SERVER_IP)
    allUpdateConfig?.length > 0 && await handleSocketUpdate({ newData: allUpdateConfig })

}


// ----------------------------------------------------------------------------------

// Hàm tính Bollinger Bands
function calculateBollingerBands(data, period = 20, multiplier = 2) {

    if (!data || data.length < period) {
        return { upper: [], middle: [], lower: [], timestamps: [] };
    }

    const result = {
        middle: [],   // Đường trung bình (SMA)
        upper: [],    // Dải trên
        lower: [],    // Dải dưới
    };

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1)

        const sma = slice.reduce((sum, price) => sum + price, 0) / period;

        const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        const upperBand = sma + multiplier * stdDev;
        const lowerBand = sma - multiplier * stdDev;

        result.middle.push(sma);
        result.upper.push(upperBand);
        result.lower.push(lowerBand);
    }

    return result;
}



function getHourRange(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const start = Math.floor(hour / 2) * 2;
    const end = start + 2;
    return `${start}-${end}`;
}

function groupByHourRange(data) {
    const grouped = {};
    for (const item of data) {
        const range = getHourRange(item.startTime);
        if (!grouped[range]) {
            grouped[range] = [];
        }
        grouped[range].push(item);
    }
    return grouped;
}




const Main = async () => {

    allbotOfServer = await getAllBotIDByServerIP(SERVER_IP)

    const deleteAll = deleteAllScannerBE(allbotOfServer)
    const deleteAllUPcode = deleteAllForUPcode(allbotOfServer)

    await Promise.allSettled([deleteAll, deleteAllUPcode])

    const allSymbolArray = await getAllCoinBE()

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
                Demo: botData.Demo,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
                maxSymbol: botData.maxSymbol,
                IsActive: true,
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
        // listKlineDay.push(`kline.D.${symbol}`)

        listKlineNumber.forEach(candle => {

            blockContinueOrderOCByStrategiesID[candle] = blockContinueOrderOCByStrategiesID[candle] || {}
            blockContinueOrderOCByStrategiesID[candle][symbol] = blockContinueOrderOCByStrategiesID[candle][symbol] || {}

            const symbolCandleID = `${symbol}-${candle}`
            listKline.push(`kline.${candle}.${symbol}`)
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
                    Demo: botData.Demo,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    maxSymbol: botData.maxSymbol,
                    IsActive: true
                };

                const candleHandle = scannerData.Candle.split("m")[0]

                allScannerDataObject[candleHandle] = allScannerDataObject[candleHandle] || {}
                allScannerDataObject[candleHandle][symbol] = allScannerDataObject[candleHandle][symbol] || {}

                const newScannerData = { ...scannerData }

                newScannerData.ExpirePre = Date.now()

                allScannerDataObject[candleHandle][symbol][scannerID] = newScannerData

            }
        })
    });

    // await handleStatistic(Object.values({
    //     ["BTCUSDT"]: {
    //         value: "BTCUSDT",
    //     }
    // }))


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
    // await handleSocketListKlineDay(listKlineDay)

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

        const [_, candle, symbol] = dataCoin.topic.split(".");

        const symbolCandleID = `${symbol}-${candle}`

        const dataMain = dataCoin.data[0]
        const coinOpen = +dataMain.open;
        const coinCurrent = +dataMain.close;
        const dataConfirm = dataMain.confirm
        const turnoverCurrent = +dataMain.volume
        const Highest = +dataMain.high
        const Lowest = +dataMain.low
        const timestamp = +dataMain.timestamp


        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]

        !updatingAllMain &&
            listDataObject &&
            Object.values(listDataObject)?.length > 0 &&
            await Promise.allSettled(Object.values(listDataObject).map(async strategy => {

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
                        strategy.ExpirePre = strategy.ExpirePre || Date.now()

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

                        if (dataConfirm == false) {

                            if (strategy.IsActive && !strategy.IsDeleted && !strategy.blockContinue) {

                                //Check expire config - OK
                                if (scannerIDData &&
                                    Expire &&
                                    (Date.now() - strategy.ExpirePre) >= Expire * 60 * 60 * 1000 &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                                ) {

                                    console.log(changeColorConsole.blueBright(`[V] Config Expire ( ${botName} - ${symbol} - ${PositionSide} - ${candle} - ${OrderChange} ) ( ${Expire} h )`));

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
                                    offSuccess && handleSocketDelete([newStrategy]);
                                }

                                // Order OC
                                if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering &&
                                    !blockContinueOrderOCByStrategiesID[candle]?.[symbol]?.[botID] &&
                                    strategy.IsActive
                                ) {

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

                                    const qty = botAmountListObject[botID] * Amount / 100 / +priceOrder

                                    const priceOC = roundPrice({
                                        price: priceOrder,
                                        symbol
                                    })

                                    const newOC = Math.abs((Math.abs((coinCurrent - coinOpen)) / coinOpen * 100).toFixed(3))

                                    const MaxOC = Math.abs((OrderChangeOld * StopLose / 100).toFixed(3))


                                    if (conditionOrder && conditionPre && checkHighLowCandle) {
                                        // if (conditionPre) {

                                        const dataInput = {
                                            strategy,
                                            strategyID,
                                            ApiKey,
                                            SecretKey,
                                            botData,
                                            symbol,
                                            qty: roundQty({
                                                price: qty,
                                                symbol
                                            }),
                                            side,
                                            price: priceOC,
                                            candle: Candlestick,
                                            botName,
                                            botID,
                                            telegramID,
                                            telegramToken,
                                            coinOpen,
                                            newOC
                                        }


                                        if (newOC <= MaxOC || !MaxOC) {
                                            if (strategy?.IsBeta) {

                                                let checkAll = 1
                                                const trichMauColorTop3 = trichMauOCListObject[symbol].coinColor.slice(TRICH_MAU_LENGTH - 3, TRICH_MAU_LENGTH)?.map(item => item.color)?.join("-")

                                                // let newOrderChange = strategy.OrderChange

                                                if (side === "Buy") {
                                                    switch (trichMauColorTop3) {
                                                        case "Red-Red-Red":
                                                            checkAll = 0
                                                            break
                                                    }
                                                }
                                                else {
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
                                                        console.log(changeColorConsole.magentaBright(`Color failed: ${trichMauColorTop3} | ${OrderChange}% ( ${botName} - ${symbol} - ${candle} - ${side} )`));
                                                        break
                                                    }
                                                }
                                            }
                                            else if (strategy?.IsDev) {

                                                const NGUONG_OC_BLOCK_COLOR = 0.04
                                                const CHONG_PUMP = 2
                                                const trichMauColorTop = trichMauOCListObject[symbol].coinColor.slice(0, TRICH_MAU_LENGTH)

                                                if (trichMauColorTop?.length == TRICH_MAU_LENGTH) {

                                                    const trichMauColorTop3 = trichMauColorTop?.slice(TRICH_MAU_LENGTH - 3, TRICH_MAU_LENGTH)

                                                    let checkBlockColorTrichMauTop3 = false
                                                    let checkSameColorSpecial = -1
                                                    let OCAvgWithLastElePercent = 0
                                                    let trichMauColorTop3OCTotal = 0
                                                    let colorTrichMau = ""
                                                    let textFailed = ""

                                                    for (const item of trichMauColorTop3) {
                                                        trichMauColorTop3OCTotal += Math.abs(item.OC)
                                                        if (side == "Sell") {
                                                            if (item.OC <= -NGUONG_OC_BLOCK_COLOR) {
                                                                colorTrichMau += "Red-"
                                                            }
                                                            else {
                                                                if (item.OC == 0) {
                                                                    checkBlockColorTrichMauTop3 = true
                                                                    textFailed = `OC = 0`
                                                                }
                                                                else {
                                                                    colorTrichMau += "Blue-"
                                                                }
                                                            }
                                                        }
                                                        else {
                                                            if (item.OC >= NGUONG_OC_BLOCK_COLOR) {
                                                                colorTrichMau += "Blue-"
                                                            }
                                                            else {
                                                                if (item.OC == 0) {
                                                                    checkBlockColorTrichMauTop3 = true
                                                                    textFailed = `OC = 0`
                                                                }
                                                                else {
                                                                    colorTrichMau += "Red-"
                                                                }
                                                            }
                                                        }
                                                    }
                                                    if (!checkBlockColorTrichMauTop3) {
                                                        if (side === "Sell") {
                                                            if (colorTrichMau == "Blue-Blue-Blue-") {
                                                                checkSameColorSpecial = 0
                                                            }
                                                            else if (colorTrichMau == "Red-Blue-Blue-") {
                                                                checkSameColorSpecial = 1
                                                            }
                                                        }
                                                        else {
                                                            if (colorTrichMau == "Red-Red-Red-") {
                                                                checkSameColorSpecial = 0
                                                            }
                                                            else if (colorTrichMau == "Blue-Red-Red-") {
                                                                checkSameColorSpecial = 1
                                                            }
                                                        }
                                                        switch (checkSameColorSpecial) {
                                                            case 0: {
                                                                const lastEle = trichMauColorTop3[trichMauColorTop3.length - 1]
                                                                const lastEleOC = Math.abs(lastEle?.OC)
                                                                const avgPercent = trichMauColorTop3OCTotal / 3
                                                                OCAvgWithLastElePercent = lastEleOC / avgPercent * 100
                                                                checkBlockColorTrichMauTop3 = OCAvgWithLastElePercent >= 30
                                                                if (checkBlockColorTrichMauTop3) {
                                                                    textFailed = "K Hồi"
                                                                }
                                                                break
                                                            }
                                                            case 1: {
                                                                const candle1 = trichMauColorTop3[1].OC
                                                                const candle2 = trichMauColorTop3[2].OC
                                                                const tylePump = candle1 / candle2
                                                                const tylePumpHandle = tylePump > 1 ? tylePump : 1 / tylePump
                                                                OCAvgWithLastElePercent = Math.abs(tylePumpHandle)
                                                                if (OCAvgWithLastElePercent >= CHONG_PUMP) {
                                                                    checkBlockColorTrichMauTop3 = true
                                                                    textFailed = `Cbi Pump`
                                                                }
                                                            }
                                                        }

                                                    }

                                                    if (!checkBlockColorTrichMauTop3) {
                                                        if (checkSameColorSpecial > -1) {
                                                            console.log(changeColorConsole.redBright(`Color Special: ${colorTrichMau} | ${OCAvgWithLastElePercent.toFixed(2)}% | OC: ${OrderChange}% ( ${botName} - ${symbol} - ${candle} - ${side} )`));
                                                            console.log(trichMauColorTop3);
                                                        }
                                                        handleSubmitOrder(dataInput);
                                                    }
                                                    else {
                                                        console.log(changeColorConsole.magentaBright(`Color failed2: ${colorTrichMau} | ${textFailed} | ${OCAvgWithLastElePercent.toFixed(2)}% | OC: ${OrderChange}% ( ${botName} - ${symbol} - ${candle} - ${side} )`));
                                                        console.log(trichMauColorTop3);
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
                                            sendMessageWithRetryWait({
                                                messageText,
                                                telegramID,
                                                telegramToken
                                            })
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
                                        const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

                                        const newOCTemp = Math.abs((coinCurrent - coinOpen)) / coinOpen * 100

                                        const priceMoveOC = coinCurrent.toString()
                                        client
                                            .amendOrder({
                                                category: 'linear',
                                                symbol,
                                                price: priceMoveOC,
                                                orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
                                            })
                                            .then(async (response) => {
                                                if (response.retCode == 0) {
                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = response.result.orderId
                                                    console.log(changeColorConsole.blueBright(`[->] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, priceMoveOC))
                                                    // console.log(changeColorConsole.blackBright(`[_OC orderID Move_] ( ${botName} - ${side} - ${symbol} - ${candle} ) :`, response.result.orderId));

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
                                                    console.log(changeColorConsole.yellowBright(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilledButMiss = true
                                                }
                                            })
                                            .catch((error) => {
                                                console.log(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
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
                                                textQuanSat = `🙈 Vào khoảng theo dõi ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) `
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
                                                textQuanSat = `🙈 Vào khoảng theo dõi ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) `
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
                                        const priceMoveTP = coinCurrent.toString()
                                        const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
                                        const textQuayDau = `😎 Quay đầu ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} )`
                                        console.log(changeColorConsole.greenBright(textQuayDau));

                                        client
                                            .amendOrder({
                                                category: 'linear',
                                                symbol,
                                                price: priceMoveTP,
                                                orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID
                                            })
                                            .then(async (response) => {
                                                if (response.retCode == 0) {
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = coinCurrent

                                                    console.log(changeColorConsole.blueBright(`[->] Move Order TP Compare ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, priceMoveTP))

                                                    // sendMessageWithRetryWait({
                                                    //     messageText: textQuayDau,
                                                    //     telegramID,
                                                    //     telegramToken
                                                    // })
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = false
                                                }
                                                else {
                                                    const retMsg = response.retMsg
                                                    console.log(changeColorConsole.yellowBright(`[!] Move Order TP Compare ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) failed: ${retMsg}`))
                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                                    if (retMsg?.includes("order not exists")) {
                                                        delete listOCByCandleBot?.[Candlestick]?.[botID]?.listOC?.[strategyID]

                                                        cancelAll({ strategyID, botID })
                                                        const CandlestickSplit = Candlestick?.split("m")?.[0]

                                                        if (allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]?.IsDeleted) {
                                                            delete allStrategiesByCandleAndSymbol[symbol]?.[CandlestickSplit]?.[strategyID]
                                                            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                        }
                                                    }
                                                }
                                            })
                                            .catch((error) => {
                                                console.log(`[!] Move Order TP Compare ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
                                                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                            });


                                    }

                                }
                            }

                        }
                        // Coin CLosed
                        else if (dataConfirm == true) {

                            // TP chưa khớp -> Dịch TP mới

                            const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP.orderID
                            if (TPOrderID) {

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
                                    botData,
                                    botID,
                                    orderId: TPOrderID
                                });
                            }
              

                            delete allStrategiesByCandleAndSymbol[symbol]?.[candle]?.[strategyID]?.blockContinue
                            blockContinueOrderOCByStrategiesID[candle][symbol][botID] = false

                        }


                    } catch (error) {
                        console.log(changeColorConsole.redBright("Error When Handle Order"));
                        console.log(error);
                    }
                }
            }))


        // Coin CLosed
        if (dataConfirm == true) {

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

                    const startTime = +dataMain.start

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

                    // if (symbol == "GRASSUSDT") {
                    //     let bollingerBands = calculateBollingerBands(allHistoryByCandleSymbol[candle][symbol].listOC.slice(0, 20).map(item => item.dataCoin));
                    //     console.log(candle,bollingerBands);
                    // }
                }
            }
            catch (err) {
                console.log(`[!] Error handleScannerDataList: ${candle}-${symbol} ${err.message}`)
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

        if (symbol === "BTCUSDT" && candle == 1 && !BTCPumpStatus) {
            const BTCPricePercent = Math.abs(coinCurrent - coinOpen) / coinOpen * 100
            if (BTCPricePercent >= 0.6) {
                updatingAllMain = true
                BTCPumpStatus = true
                let xOCPump

                if (BTCPricePercent >= 1) {
                    xOCPump = Math.round(BTCPricePercent) + 2
                    BTC_PUMP_TIME_RESET = 5
                }
                else {
                    xOCPump = 2
                    BTC_PUMP_TIME_RESET = 3
                }
                const text = `<b>🛑 BTC</b> đang biến động ${BTCPricePercent.toFixed(2)}% • 1m -> Auto nâng OC ( x${xOCPump} ) trong ${BTC_PUMP_TIME_RESET} min`
                console.log(text);
                sendAllBotTelegram(text)

                console.log(changeColorConsole.greenBright(`[...] START NÂNG OC THÊM ( x${xOCPump} )`));

                const nangAllOC = Promise.allSettled(
                    Object.values(allSymbol).map(async symbolItem => {
                        const symbol = symbolItem.value;
                        return Promise.allSettled([1, 3, 5, 15].map(candle => {
                            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                            if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                    const strategyID = strategy.value


                                    strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange
                                    const OrderChangeOld = strategy.OrderChangeOld
                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = Math.abs((OrderChangeOld * xOCPump).toFixed(3))

                                }))
                            }
                        }))
                    }
                    ))

                const cancelAllOC = cancelAllListOrderOC(listOCByCandleBot)

                await Promise.allSettled([nangAllOC, cancelAllOC])

                console.log(changeColorConsole.greenBright("[V] NÂNG OC XONG"));
                updatingAllMain = false

                setTimeout(async () => {

                    console.log(changeColorConsole.greenBright("[...] START HẠ OC"));
                    await Promise.allSettled(
                        Object.values(allSymbol).map(async symbolItem => {
                            const symbol = symbolItem.value;
                            return Promise.allSettled([1, 3, 5, 15].map(candle => {
                                const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                                if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                    return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                        const strategyID = strategy.value

                                        allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = strategy.OrderChangeOld || strategy.OrderChange
                                    }))
                                }
                            }))
                        }
                        ))
                    console.log(changeColorConsole.greenBright("[V] HẠ OC XONG"));
                    BTCPumpStatus = false
                }, BTC_PUMP_TIME_RESET * 60 * 1000)

            }

        }

    })

    wsSymbol.on('update', async (dataCoin) => {
        const [_, candle, symbol] = dataCoin.topic.split(".");

        const dataMain = dataCoin.data[0]
        const coinCurrent = +dataMain.close;
        const timestampsocket = +dataMain.timestamp;

        if (candle == 1) {

            trichMauOCListObject[symbol].preTime = trichMauOCListObject[symbol].preTime || timestampsocket

            if (timestampsocket - trichMauOCListObject[symbol].preTime >= 1000) {
                const prePrice = trichMauOCListObject[symbol].prePrice || coinCurrent

                const OCHieu = (coinCurrent - prePrice)
                const OC = OCHieu / prePrice * 100
                const coinColor = OCHieu > 0 ? "Blue" : "Red"

                const timestamp = new Date(timestampsocket).toLocaleTimeString()

                trichMauOCListObject[symbol].coinColor.push({
                    color: coinColor,
                    OC,
                    prePrice,
                    coinCurrent,
                    timestamp
                })
                trichMauOCListObject[symbol].preTime = timestampsocket
                trichMauOCListObject[symbol].prePrice = coinCurrent


                if (trichMauOCListObject[symbol].coinColor?.length > TRICH_MAU_LENGTH) {
                    trichMauOCListObject[symbol].coinColor.shift()
                }
            }
        }

    })

    // ----------------------------------------------------------------

    wsSymbol.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbol.unsubscribeV5(listKline, "linear")
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
    socketRealtime.emit('joinRoom', 'ByBit_V3');
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
        const Demo = botData.Demo
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
                        Demo,
                        botName,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true,
                        maxSymbol: botData.maxSymbol
                    }
                }
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    ApiKey,
                    SecretKey,
                    Demo,
                    botName,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: botActive,
                    maxSymbol: botData.maxSymbol
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
                const Demo = botData.Demo
                const botID = botData._id
                const botName = botData.botName
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
                                Demo,
                                botName,
                                telegramID: botData.telegramID,
                                telegramToken: botData.telegramToken,
                                maxSymbol: botData.maxSymbol,
                                IsActive: true
                            }
                        }
                        botApiList[botID] = {
                            ...botApiList[botID],
                            id: botID,
                            ApiKey,
                            SecretKey,
                            Demo,
                            botName,
                            telegramID: botData.telegramID,
                            telegramToken: botData.telegramToken,
                            maxSymbol: botData.maxSymbol,
                            IsActive: botActive
                        }
                    }

                    allScannerDataObject[Candlestick] = allScannerDataObject[Candlestick] || {}
                    allScannerDataObject[Candlestick][symbol] = allScannerDataObject[Candlestick][symbol] || {}

                    const newScannerData = { ...scannerItem }

                    newScannerData.ExpirePre = Date.now()

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
            botApiList[botIDMain].wsOrder?.unsubscribeV5(LIST_ORDER, 'linear')
            // botApiList[botIDMain].wsOrder?.closeAll()

            const newDataObj = {
                ...botApiData,
                IsActive: botActive,
                ApiKey: newApi,
                SecretKey: newSecretKey,
            }
            botApiList[botIDMain] = newDataObj
            const newBotApiList = {
                botIDMain: newDataObj
            }

            await handleSocketBotApiList(newBotApiList)
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

    botApiList[botIDMain].wsOrder?.unsubscribeV5(LIST_ORDER, 'linear');

    ["1m", "3m", "5m", "15m"].forEach(candle => {
        delete listOCByCandleBot?.[candle]?.[botIDMain]
    });
    delete botApiList[botIDMain];

});

socketRealtime.on('bot-telegram', async (data) => {

    const { botID, newApiData } = data;

    const botApiListData = botApiList[botID]

    const botNameExist = botApiListData?.botName || botID

    console.log(`[...] Bot-Telegram ( ${botNameExist} ) Update From Realtime`, newApiData);

    if (botApiListData) {
        botApiList[botID] = {
            ...botApiListData,
            telegramID: newApiData.telegramID,
            telegramToken: newApiData.telegramToken,
            botName: newApiData.botName,
        }
    }

});
socketRealtime.on('bot-max-symbol', async (data) => {

    const { newData, maxSymbol } = data;

    const botID = newData.value

    const botApiListData = botApiList[botID]

    const botNameExist = botApiListData?.botName || botID

    console.log(`[...] Bot Max_Symbol ( ${botNameExist} ) Update From Realtime: ${maxSymbol}`);

    if (botApiListData) {
        botApiList[botID].maxSymbol = +maxSymbol
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

// socketRealtime.on('closeAllPosition', async (botListData = []) => {

//     console.log(`[...] Close All Position From Realtime:`, botListData);

//     await Promise.allSettled(botListData.map(async botData => {
//         const botID = botData.botID
//         const symbolList = botData.symbolList
//         symbolList.forEach(symbolData => {
//             const { side, symbol } = symbolData
//             const botSymbolMissID = `${botID}-${symbol}-${side}`

//             [1, 3, 5, 15].forEach(candle => {
//                 console.log(changeColorConsole.magentaBright(`[V] BLOCK Continue Order OC | ${symbol.replace("USDT", "")} - ${candle} - Bot: ${botApiList[botID]?.botName}`));
//                 const listOCByBot = listOCByCandleBot?.[`${candle}m`]?.[botID]
//                 listOCByBot && handleCancelAllOrderOCWithAutoCancelAll([listOCByBot])
//                 blockContinueOrderOCByStrategiesID[candle][symbol][botID] = true
//             });
//             setTimeout(() => {
//                 clearCheckMiss(botSymbolMissID)
//                 resetMissData(botSymbolMissID)
//             }, 3000)
//         });
//     }))

// });

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
            const candle = scannerData.Candle.split("m")[0]
            const botData = scannerData.botID

            const botID = botData?._id
            const botName = botData.botName
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Demo = botData.Demo
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken
            const maxSymbol = botData.maxSymbol

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true,
                    Demo,
                    maxSymbol
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true,
                    Demo,
                    maxSymbol
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
                    newScannerData.ExpirePre = Date.now()

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

