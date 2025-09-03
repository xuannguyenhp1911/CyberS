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
const {
    getAllStrategiesActiveMarginBE,
    createStrategiesMultipleMarginBE,
    deleteStrategiesMultipleMarginBE,
    offConfigMarginBE
} = require('../../../controllers/Configs/ByBit/V1/margin');

const {
    getAllStrategiesActiveSpotBE,
    createStrategiesMultipleSpotBE,
    deleteStrategiesMultipleSpotBE,
    offConfigSpotBE
} = require('../../../controllers/Configs/ByBit/V1/spot');


const {
    getAllStrategiesActiveScannerBE,
    deleteAllForUPcodeV1,
    deleteAllScannerV1BE,
    addSymbolToBlacklistBE
} = require('../../../controllers/Configs/ByBit/V1/scanner');

const {
    createPositionBE,
    getPositionBySymbol,
    deletePositionBE,
    updatePositionBE
} = require('../../../controllers/Positions/ByBit/V1/position');
const { getAllBotIDByServerIP } = require('../../../controllers/servers');
const { getAllCoinBE } = require('../../../controllers/Coins/ByBit/V1/coin');

const { RestClientV5, WebsocketClient } = require('bybit-api');

const wsSymbol = new WebsocketClient({
    market: 'v5',
    recvWindow: 100000,
    fetchTimeOffsetBeforeAuth: true,
});
const clientDigit = new RestClientV5({
    testnet: false,
    recv_window: 100000,
    syncTimeBeforePrivateRequests: true
});

const LIST_ORDER = ["order", "execution"]
const MAX_ORDER_LIMIT = 20
const MAX_AMEND_LIMIT = 10
const MAX_CANCEL_LIMIT = 20
const TP_ADAPTIVE = 80
const TP_NOT_ADAPTIVE = 60

const SPOT_MODEL_DEFAULT = {
    AmountAutoPercent: 5,
    AmountExpire: 10,
    AmountIncreaseOC: 8,
}



// ----------------------------------------------------------------------------------
let missTPDataBySymbol = {}
var thongKeWinLoseByBot = {}

var messageTeleByBot = {}
var closeMarketRepayBySymbol = {}
var listKline = {}
var listKlineObject = {}

var allSymbol = []
var updatingAllMain = false
var connectKlineError = false
var connectByBotError = {}
var repayCoinObject = {}


// -------  ------------

var allScannerDataObject = {}
var allStrategiesByCandleAndSymbol = {}
var symbolTradeTypeObject = {}
var trichMauOCListObject = {}

var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
var allStrategiesByBotIDOrderOC = {}
var maxAmendOrderOCData = {}
var maxCancelOrderOCData = {}
var botApiList = {}
var digitAllCoinObject = {}
var botListTelegram = {}

// -------  ------------

var listOCByCandleBot = {}
var listConfigIDByScanner = {}
// ----------------------------------------------------------------------------------

// BigBabol
var preTurnover = {}
var trichMauData = {}
var trichMauDataArray = {}
var trichMau = {}

// ----------------------------------------------------------------------------------

const handleIconMarketType = (symbol) => {
    return symbolTradeTypeObject[symbol] == "Spot" ? "🍀" : "🍁"
}

const getWebsocketClientConfig = ({
    ApiKey,
    SecretKey,
}) => {
    return new WebsocketClient({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        market: 'v5',
        recvWindow: 100000,
        fetchTimeOffsetBeforeAuth: true
    })
}

const getRestClientV5Config = ({
    ApiKey,
    SecretKey,
}) => {
    return new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        syncTimeBeforePrivateRequests: true,
        recv_window: 10000,
    })
}

const handleCalcOrderChange = ({ OrderChange, Numbs }) => {
    const result = [];
    const step = OrderChange * 0.05; // 2% của OrderChange
    // const step = 0.1; // 2% của OrderChange

    if (Numbs % 2 === 0) { // Nếu numbs là số chẵn
        for (let i = -(Numbs / 2); i < Numbs / 2; i++) {
            result.push(OrderChange + i * step);
        }
    } else { // Nếu numbs là số lẻ
        for (let i = -Math.floor((Numbs - 1) / 2); i <= Math.floor((Numbs - 1) / 2); i++) {
            result.push(OrderChange + i * step);
        }
    }

    return result;
};

const roundPrice = (
    {
        price,
        tickSize
    }
) => {

    const priceFix = new Big(price)
    const tickSizeFIx = new Big(tickSize)

    return new Big(Math.floor(priceFix.div(tickSizeFIx).toNumber())).times(tickSizeFIx).toString();
}
const roundQty = (
    {
        price,
        tickSize
    }
) => {

    const priceFix = new Big(price)
    const tickSizeFIx = new Big(tickSize)

    return new Big(Math.floor(priceFix.div(tickSizeFIx).toNumber())).times(tickSizeFIx).toString();

}



// ----------------------------------------------------------------------------------


const cancelAllListOrderOC = async (listOCByCandleBotInput = {}) => {

    const allData = Object.values(listOCByCandleBotInput).reduce((pre, item) => {

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
        return pre
    }, {});

    await handleCancelAllOrderOC(Object.values(allData || {}))

}

const syncDigit = async () => {// proScale
    await clientDigit.getInstrumentsInfo({
        category: 'spot',
    })
        .then((response) => {
            response.result.list.forEach((e) => {
                const symbol = e.symbol
                if (symbol.split("USDT")[1] === "") {
                    digitAllCoinObject[symbol] = {
                        priceScale: +e.priceFilter.tickSize,
                        basePrecision: +e.lotSizeFilter.basePrecision,
                    }
                }
            })
        })
        .catch((error) => {
            console.log("Error Digit:", error)
        });
}

const handleSubmitOrder = async ({
    strategy,
    strategyID,
    symbol,
    qty,
    side,
    price,
    priceOrderTPTemp,
    ApiKey,
    SecretKey,
    botName,
    botID,
    botData,
    telegramID,
    telegramToken,
    isLeverage
}) => {

    let orderOCFalse = false
    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

    !allStrategiesByBotIDOrderOC[botID] && (
        allStrategiesByBotIDOrderOC[botID] = {
            totalOC: 0,
            logError: false,
            timeout: ""
        }
    );

    !listOCByCandleBot[botID] && (listOCByCandleBot[botID] = {
        listOC: {},
        ApiKey,
        SecretKey,
    });

    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = true

    const orderLinkId = uuidv4()


    if (allStrategiesByBotIDOrderOC[botID].totalOC < MAX_ORDER_LIMIT) {

        listOCByCandleBot[botID].listOC[strategyID] = {
            strategyID,
            strategy,
            symbol,
            side,
            botName,
            botID,
            botData,
            ApiKey,
            SecretKey,
            orderLinkId,
            OrderChange: strategy.OrderChange
        }

        allStrategiesByBotIDOrderOC[botID].totalOC += 1

        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            timeOutFunc: "",
            OC: true
        }

        const client = getRestClientV5Config({ ApiKey, SecretKey });;

        let textTele = ""

        const scannerLabel = strategy?.scannerID?.Label
        const scannerText = scannerLabel ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

        await client
            .submitOrder({
                category: 'spot',
                symbol,
                side,
                positionIdx: 0,
                orderType: 'Limit',
                qty,
                price,
                orderLinkId,
                isLeverage
            })
            .then((response) => {
                if (response.retCode == 0) {

                    const newOrderID = response.result.orderId
                    const newOrderLinkID = response.result.orderLinkId

                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp = priceOrderTPTemp

                    textTele = `<b>+ OC ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<i>-> Success</i>`
                    console.log(textTele)
                }
                else {
                    textTele = `<b>+ OC ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<code>🟡 Failed: ${response.retMsg}</code>`
                    console.log(textTele)
                    delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
                    delete listOCByCandleBot[botID].listOC[strategyID]
                    orderOCFalse = true

                }
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
            })
            .catch((error) => {
                textTele = `<b>+ OC ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<code>🔴 Error: ${error}</code>`
                console.log(textTele)
                orderOCFalse = true
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
                delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
                delete listOCByCandleBot[botID].listOC[strategyID]
            });

        allStrategiesByBotIDOrderOC[botID].timeout && clearTimeout(allStrategiesByBotIDOrderOC[botID].timeout)
        allStrategiesByBotIDOrderOC[botID].timeout = setTimeout(() => {

            allStrategiesByBotIDOrderOC[botID].logError = false
            allStrategiesByBotIDOrderOC[botID].totalOC = 0
        }, 1000)

        if (orderOCFalse) {
            allStrategiesByCandleAndSymbol[symbol][strategyID].IsActive = false
            const configID = strategy._id

            let offSuccess = false
            if (symbolTradeTypeObject[symbol] == "Spot") {
                offSuccess = await offConfigSpotBE({
                    configID,
                    symbol,
                })
            }
            else {
                offSuccess = await offConfigMarginBE({
                    configID,
                    symbol,
                    PositionSide: strategy.PositionSide
                });
            }
            offSuccess && await handleSocketUpdate([strategy])
        }

        const textTeleHandle = !orderOCFalse ? textTele : `${textTele}\n <i>-> Off Config Success</i>`

        sendMessageWithRetryWait({
            messageText: textTeleHandle,
            telegramID,
            telegramToken
        })
    }
    else {
        if (!allStrategiesByBotIDOrderOC[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
            allStrategiesByBotIDOrderOC[botID].logError = true
        }
    }


}

const handleMoveOrderOC = async ({
    strategy,
    strategyID,
    symbol,
    price,
    priceOrderTPTemp,
    orderId,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));
    !maxAmendOrderOCData[botID] && (
        maxAmendOrderOCData[botID] = {
            totalOC: 0,
            logError: false,
            timeout: ""
        }
    );
    if (maxAmendOrderOCData[botID].totalOC < MAX_AMEND_LIMIT) {

        const client = getRestClientV5Config({ ApiKey, SecretKey });

        maxAmendOrderOCData[botID].totalOC += 1
        await client
            .amendOrder({
                category: 'spot',
                symbol,
                price,
                orderId
            })
            .then((response) => {
                if (response.retCode == 0) {
                    console.log(`[->] Move Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) success: ${price}`)
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp = priceOrderTPTemp
                }
                else {
                    console.log(changeColorConsole.yellowBright(`[!] Move Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) failed: ${price} -`, response.retMsg))
                }
            })
            .catch((error) => {
                console.log(`[!] Move Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) error `, error)
            });
        maxAmendOrderOCData[botID].timeout && clearTimeout(maxAmendOrderOCData[botID].timeout)
        maxAmendOrderOCData[botID].timeout = setTimeout(() => {
            maxAmendOrderOCData[botID].logError = false
            maxAmendOrderOCData[botID].totalOC = 0
        }, 1000)
    }
    else {
        if (!maxAmendOrderOCData[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT AMEND OC ( ${botName} )`));
            maxAmendOrderOCData[botID].logError = true
        }
    }
}

const handleSubmitOrderTP = async ({
    strategy,
    strategyID,
    symbol,
    side,
    qty,
    price,
    ApiKey,
    SecretKey,
    missState = false,
    botName,
    botID,
    telegramID,
    telegramToken
}) => {

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const botSymbolMissID = `${botID}-${symbol}`

    const orderLinkId = uuidv4()

    if (!missState) {
        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            TP: true
        }
    }

    const client = getRestClientV5Config({ ApiKey, SecretKey });

    let textTele = ""

    const scannerLabel = strategy?.scannerID?.Label
    const scannerText = scannerLabel ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

    await client
        .submitOrder({
            category: 'spot',
            symbol,
            side,
            positionIdx: 0,
            orderType: 'Limit',
            qty,
            price,
            orderLinkId,
            isLeverage: symbolTradeTypeObject[symbol] === "Spot" ? 0 : 1,
        })
        .then((response) => {
            if (response.retCode == 0) {
                const newOrderID = response.result.orderId
                const newOrderLinkID = response.result.orderLinkId

                if (strategyID) {
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderLinkId = newOrderLinkID
                }


                missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)


                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty),
                    priceOrderTP: price
                }

                // missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                //     orderID: newOrderID,
                //     strategyID
                // })

                // if (missState) {

                //     // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true
                //     missTPDataBySymbol[botSymbolMissID].orderID = newOrderID
                //     missTPDataBySymbol[botSymbolMissID].ApiKey = ApiKey
                //     missTPDataBySymbol[botSymbolMissID].SecretKey = SecretKey
                //     missTPDataBySymbol[botSymbolMissID].botID = botID
                //     missTPDataBySymbol[botSymbolMissID].botName = botName
                // }


                textTele = `<b>+ TP ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<i>-> Success</i>`
                console.log(textTele)
                console.log(changeColorConsole.greenBright(`[_TP orderID_] ( ${botName} - ${side} - ${symbol} ): ${newOrderLinkID}`));

            }
            else {
                textTele = `<b>+ TP ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<code>🟨 Failed: ${response.retMsg}</code>`
                console.log(textTele)
                delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
            }
        })
        .catch((error) => {
            textTele = `<b>+ TP ${side}</b> ( ${strategy.OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \nPrice: ${price} | Amount: ${strategy.Amount} \n<code>🟥 Error: ${error}</code>`
            console.log(textTele)
            delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]

            console.log("ERROR Order TP:", error)
        });

    sendMessageWithRetryWait({
        messageText: textTele,
        telegramID,
        telegramToken
    })
}

const moveOrderTP = async ({
    strategyID,
    strategy,
    symbol,
    price,
    orderId,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const client = getRestClientV5Config({ ApiKey, SecretKey });

    await client
        .amendOrder({
            category: 'spot',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
                console.log(`[->] Move Order TP ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) success: ${price}`)
            }
            else {

                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) failed `, response.retMsg))
                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) error `, error)
            // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
        });

}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {

    const sideText = side === "Buy" ? "Sell" : "buy"
    const symbol = strategy.symbol

    if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID) {

        const TPOld = Math.abs(allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.price)

        const priceScale = Math.abs(digitAllCoinObject[symbol]?.priceScale)

        let TPNew
        if (strategy.PositionSide === "Long") {
            TPNew = TPOld - priceScale
        }
        else {
            TPNew = TPOld + priceScale
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            strategy,
            symbol,
            price: roundPrice({
                price: TPNew,
                tickSize: priceScale
            }),
            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID,
            side: sideText,
            ApiKey,
            SecretKey,
            botName,
            botID
        }
        await moveOrderTP(dataInput)

    }
}

const handleRepaySymbol = async ({
    symbol,
    botID,
    side,
    botData
}) => {
    let textTele = ""
    console.log(changeColorConsole.magentaBright(`[...] Repay ( ${symbol} - ${side} )`));

    repayCoinObject[botID] = repayCoinObject[botID] || {}

    repayCoinObject[botID][symbol] = true

    const clientRepay = getRestClientV5Config({ ApiKey: botData.ApiKey, SecretKey: botData.SecretKey });

    await clientRepay.repayLiability({ coin: symbol.replace("USDT", "") }).then((response) => {
        if (response.retCode == 0) {
            textTele = `💳 Repay ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<i>-> Success</i>`
            console.log(changeColorConsole.greenBright(textTele));
        }
        else {
            textTele = `💳 Repay ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<code>🟡Failed: ${response.retMsg}</code>`
            console.log(changeColorConsole.yellowBright(textTele));
            closeMarketRepayBySymbol[botID][symbol] = false
        }
    })
        .catch((error) => {
            textTele = `💳 Repay ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<code>🔴 Error: ${error}</code>`
            console.log(textTele)
            closeMarketRepayBySymbol[botID][symbol] = false
        });
    sendMessageWithRetryWait({
        messageText: textTele,
        telegramID: botData.telegramID,
        telegramToken: botData.telegramToken,
    })
    repayCoinObject[botID][symbol] = false
}

const handleCloseMarket = async ({
    symbol,
    side,
    botID,
    botData,
    qty,
}) => {

    if (!closeMarketRepayBySymbol[botID]?.[symbol]) {

        closeMarketRepayBySymbol[botID] = closeMarketRepayBySymbol[botID] || {}

        closeMarketRepayBySymbol[botID][symbol] = true

        const botSymbolMissID = `${botID}-${symbol}`

        const qtyMain = qty || missTPDataBySymbol[botSymbolMissID]?.size?.toString()

        if (missTPDataBySymbol[botSymbolMissID]?.size) {
            missTPDataBySymbol[botSymbolMissID].size = Math.abs(qtyMain)
        }

        const client = getRestClientV5Config({ ApiKey: botData.ApiKey, SecretKey: botData.SecretKey });

        const MarketName = symbolTradeTypeObject[symbol]
        const isLeverage = MarketName === "Spot" ? 0 : 1

        console.log("[...] Cancel All OC For Close Market-Repay");

        // await handleCancelAllOrderOC(listOCByCandleBot[botID])

        if (side === "Buy") {
            let textTele = ""
            await client
                .submitOrder({
                    category: 'spot',
                    symbol,
                    side: side === "Buy" ? "Sell" : "Buy",
                    positionIdx: 0,
                    orderType: 'Market',
                    qty: qtyMain,
                    isLeverage
                })
                .then((response) => {

                    if (response.retCode == 0) {
                        textTele = `💳 Close Market ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<i>-> Success</i>`
                        console.log(changeColorConsole.greenBright(textTele));
                    }
                    else {
                        textTele = `💳 Close Market ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<code>🟡 Failed: ${response.retMsg}</code>`
                        console.log(changeColorConsole.yellowBright(textTele));
                        closeMarketRepayBySymbol[botID][symbol] = false
                    }
                })
                .catch((error) => {
                    textTele = `💳 Close Market ${side} | <b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} \nBot: ${botData.botName} \n<code>🔴 Error: ${error}</code>`
                    console.log(textTele)
                    closeMarketRepayBySymbol[botID][symbol] = false
                });

            sendMessageWithRetryWait({
                messageText: textTele,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
            })
        }
        else {
            await handleRepaySymbol({
                symbol,
                botID,
                side,
                botData
            })
        }
    }
}

const handleCancelOrderOC = async ({
    strategyID,
    strategy,
    symbol,
    side,
    botData,
    OrderChange,
    orderId
}) => {

    const ApiKey = botData.ApiKey
    const SecretKey = botData.SecretKey
    const botName = botData.botName
    const botID = botData.id

    !maxCancelOrderOCData[botID] && (
        maxCancelOrderOCData[botID] = {
            totalOC: 0,
            logError: false,
            timeout: ""
        }
    );

    if (maxCancelOrderOCData[botID].totalOC < MAX_CANCEL_LIMIT) {

        const client = getRestClientV5Config({ ApiKey, SecretKey });

        let textTele = ""

        const scannerLabel = strategy?.scannerID?.Label
        const scannerText = scannerLabel ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

        await client
            .cancelOrder({
                category: 'spot',
                symbol,
                orderId: orderId || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
            })
            .then((response) => {
                if (response.retCode == 0) {
                    textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \n<i>-> Success</i>`
                    console.log(textTele);
                }
                else {
                    textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \n<code>🟡 Failed: ${response.retMsg}</code>`
                    console.log(textTele)
                    handleCloseMarket({
                        botID,
                        side,
                        symbol,
                        botData,
                    })
                }
            })
            .catch((error) => {
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${botName} \n<code>🔴 Error: ${error}</code>`
                console.log(textTele)
                handleCloseMarket({
                    botID,
                    side,
                    symbol,
                    botData,
                })
            });


        cancelAll({ strategyID, botID })
        delete listOCByCandleBot[botID].listOC[strategyID]

        maxCancelOrderOCData[botID].timeout && clearTimeout(maxCancelOrderOCData[botID].timeout)
        maxCancelOrderOCData[botID].timeout = setTimeout(() => {
            maxCancelOrderOCData[botID].logError = false
            maxCancelOrderOCData[botID].totalOC = 0
        }, 1000)

        sendMessageWithRetryWait({
            messageText: `<code>Cancel remain quantity</code> \n${textTele}`,
            telegramID: botData.telegramID,
            telegramToken: botData.telegramToken,
        })
    }
    else {
        if (!maxCancelOrderOCData[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT AMEND OC ( ${botName} )`));
            maxCancelOrderOCData[botID].logError = true
        }
    }

}


const handleCancelAllOrderOC = async (items = []) => {
    const batchSize = 10

    if (items.length > 0) {
        let messageListByBot = {}
        await Promise.allSettled(items.map(async item => {

            const client = getRestClientV5Config({ ApiKey: item.ApiKey, SecretKey: item.SecretKey });

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

                        if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled) {
                            pre.push({
                                symbol: cur.symbol,
                                orderLinkId: curOrderLinkId,
                            })
                            listCancel[curOrderLinkId] = cur
                        }
                        else {
                            const OrderChange = cur.strategy.OrderChange
                            console.log(`[V] Cancel order OC ( ${OrderChange} ) ( ${cur.botName} - ${cur.side} -  ${cur.symbol} ) has been filled `);
                            handleCloseMarket({
                                OrderChange,
                                botID: botIDTemp,
                                side: cur.side,
                                symbol: cur.symbol,
                                ApiKey: cur.ApiKey,
                                botData: cur.botData,
                                SecretKey: cur.SecretKey,
                            })
                            cancelAll({
                                botID: botIDTemp,
                                strategyID: strategyIDTemp,
                            })
                            delete listOCByCandleBot[botIDTemp].listOC[strategyIDTemp]
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("spot", newList)

                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []


                    listSuccess.forEach((item, index) => {

                        const data = listCancel[item.orderLinkId]
                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const strategyIDTemp = data.strategyID
                        const OrderChange = data.strategy.OrderChange
                        const symbol = data.symbol
                        const side = data.side

                        let textTele = ""

                        const scannerLabel = data?.strategy?.scannerID?.Label
                        const scannerText = scannerLabel ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

                        if (codeData.code == 0) {
                            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${data.botName} \n<i>-> Success</i>`
                            console.log(textTele);
                        }
                        else {
                            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${data.botName} \n<code>🟡 Failed: ${codeData.msg}</code>`
                            console.log(changeColorConsole.yellowBright(textTele));
                            handleCloseMarket({
                                botID: botIDTemp,
                                side,
                                symbol,
                                botData: data.botData,
                            })
                        }
                        messageListByBot[botIDTemp] = messageListByBot[botIDTemp] || {
                            botData: data.botData,
                            textTele: []
                        }

                        messageListByBot[botIDTemp].textTele.push(textTele)
                        cancelAll({
                            botID: botIDTemp,
                            strategyID: strategyIDTemp,
                        })
                        delete listOCByCandleBot[botIDTemp]?.listOC?.[strategyIDTemp]
                    })

                    await delay(1200)
                    index += batchSize
                }
            }
        }))

        const listTele = Object.values(messageListByBot)

        listTele?.length > 0 && await Promise.allSettled(listTele.map(messageData => {
            sendMessageWithRetryWait({
                messageText: messageData.textTele?.join("\n\n"),
                telegramID: messageData.botData.telegramID,
                telegramToken: messageData.botData.telegramToken,
            })
        }))

        console.log("[V] Cancel All OC Success");

    }

}
const handleCreateMultipleConfigSpot = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC
}) => {

    console.log(`[...] Create ${scannerData.Numbs} Config OC ( ${OC} ) Spot ( ${symbol} )`);

    const scannerID = scannerData._id
    const botData = scannerData.botID

    const listOC = handleCalcOrderChange({ OrderChange: OC, Numbs: +scannerData.Numbs })

    const dataInput = listOC.map(OCData => {
        return {
            "PositionSide": "Long",
            "OrderChange": OCData.toFixed(3),
            "Amount": scannerData.Amount,
            "IsActive": scannerData.IsActive,
            "Expire": scannerData.Expire,
            "Limit": scannerData.Limit,
            "AmountAutoPercent": SPOT_MODEL_DEFAULT.AmountAutoPercent,
            "AmountIncreaseOC": SPOT_MODEL_DEFAULT.AmountIncreaseOC,
            "AmountExpire": SPOT_MODEL_DEFAULT.AmountExpire,
            "Adaptive": true,
            "Reverse": false,
            "Remember": false
        }
    })

    const res = await createStrategiesMultipleSpotBE({
        dataInput,
        botID: botData._id,
        botName,
        symbol,
        scannerID
    })


    const newData = res.data

    if (newData.length > 0) {
        console.log(changeColorConsole.greenBright(`\n${res.message}`));

        listConfigIDByScanner[scannerID] = listConfigIDByScanner[scannerID] || {}

        listConfigIDByScanner[scannerID][symbol] = newData

        await handleSocketAddNew(newData)
    }

}
const handleCreateMultipleConfigMargin = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC
}) => {


    const scannerID = scannerData._id
    const PositionSide = scannerData.PositionSide
    const botData = scannerData.botID

    console.log(`[...] Create ${scannerData.Numbs} Config OC ( ${OC} ) Margin ( ${symbol} - ${PositionSide} )`);

    const listOC = handleCalcOrderChange({ OrderChange: OC, Numbs: +scannerData.Numbs })

    const dataInput = listOC.map(OCData => {
        return {
            "PositionSide": PositionSide,
            "OrderChange": OCData.toFixed(3),
            "Amount": scannerData.Amount,
            "IsActive": scannerData.IsActive,
            "Expire": scannerData.Expire,
            "Limit": scannerData.Limit,
            "AmountAutoPercent": SPOT_MODEL_DEFAULT.AmountAutoPercent,
            "AmountIncreaseOC": SPOT_MODEL_DEFAULT.AmountIncreaseOC,
            "AmountExpire": SPOT_MODEL_DEFAULT.AmountExpire,
            "Adaptive": true,
            "Reverse": false,
            "Remember": false
        }
    })


    const res = await createStrategiesMultipleMarginBE({
        dataInput,
        botID: botData._id,
        botName,
        symbol,
        scannerID,
        PositionSide
    })

    const newData = res.data

    if (newData.length > 0) {

        console.log(changeColorConsole.greenBright(`\n${res.message}`));

        listConfigIDByScanner[scannerID] = listConfigIDByScanner[scannerID] || {}

        listConfigIDByScanner[scannerID][symbol] = newData

        await handleSocketAddNew(newData)
    }

}

const handleCancelOrderTP = async ({
    strategyID,
    symbol,
    side,
    orderId,
    ApiKey,
    SecretKey,
    gongLai = false,
    botName,
    botID
}) => {

    const botSymbolMissID = `${botID}-${symbol}`
    const client = getRestClientV5Config({ ApiKey, SecretKey });

    orderId && await client
        .cancelOrder({
            category: 'spot',
            symbol,
            orderId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} ) success `);

                if (gongLai && !missTPDataBySymbol[botSymbolMissID].gongLai) {
                    missTPDataBySymbol[botSymbolMissID].gongLai = true
                    missTPDataBySymbol[botSymbolMissID]?.orderIDToDB && updatePositionBE({
                        newDataUpdate: {
                            Miss: true,
                            TimeUpdated: new Date()
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
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} ) failed `, response.retMsg))
            }
            // cancelAll({ strategyID, botID })
            // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} ) error `, error)
            // cancelAll({ strategyID, botID })
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
                side: item.side,
                ApiKey: item.ApiKey,
                SecretKey: item.SecretKey,
                botName: item.botName,
                botID: item.botID,
                orderId: item.orderId,
                gongLai: item.gongLai,
            })));
            await delay(1200)
            index += batchSize
        }
    }
}

const resetMissData = ({
    botID,
    symbol
}) => {
    const id = `${botID}-${symbol}`
    missTPDataBySymbol[id] = {
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
    delete closeMarketRepayBySymbol[botID]?.[symbol]
}

const cancelAll = (
    {
        strategyID,
        botID
    }
) => {
    if (botID && strategyID) {
        const data = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
        if (data) {
            const OCOrderID = data?.OC?.orderLinkId
            const TPOrderID = data?.TP?.orderLinkId
            OCOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[OCOrderID]
            TPOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[TPOrderID]
        }
        !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
        !allStrategiesByBotIDAndStrategiesID[botID] && (allStrategiesByBotIDAndStrategiesID[botID] = {});

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
                priceOrderTPTemp: 0,
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
    }

}

// 
const sendMessageWithRetry = async ({
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
        for (let i = 0; i < retries; i++) {
            try {
                if (messageText) {
                    // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                    await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageText, {
                        parse_mode: "HTML"
                    });
                    console.log('[->] Message sent to telegram successfully');
                    return;
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
    } catch (error) {
        console.log("[!] Bot Telegram Error", error)
    }
};

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
            messageTeleByBot[telegramToken] = {
                timeOut: "",
                text: []
            }
            // BOT_TOKEN_RUN_TRADE.launch();
        }
        if (messageText) {

            messageTeleByBot[telegramToken].timeOut && clearTimeout(messageTeleByBot[telegramToken].timeOut)
            messageTeleByBot[telegramToken].text.push(messageText)

            messageTeleByBot[telegramToken].timeOut = setTimeout(async () => {
                const messageTextList = messageTeleByBot[telegramToken].text.join("\n\n")
                for (let i = 0; i < retries; i++) {
                    try {
                        if (messageTextList) {
                             
                            // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                            await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageTextList, {
                                parse_mode: "HTML"
                            });
                            console.log('[->] Message sent to telegram successfully');
                            messageTeleByBot[telegramToken] = {
                                timeOut: "",
                                text: []
                            }
                            return;
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
            }, 3000)
        }
    } catch (error) {
        console.log("[!] Bot Telegram Error", error)
    }
};

// const getMoneyFuture = async (botApiListInput) => {

//     const list = Object.values(botApiListInput)
//     if (list.length > 0) {
//         const resultGetFuture = await Promise.allSettled(list.map(async botData => getFutureBE(botData.id)))

//         if (resultGetFuture.length > 0) {
//             resultGetFuture.forEach(({ value: data }) => {
//                 if (data?.botID) {
//                     botAmountListObject[data.botID] = +data?.totalWalletBalance || 0
//                 }
//             })
//         }
//     }
// }

const sendAllBotTelegram = async (text) => {

    await Promise.allSettled(Object.values(botApiList).map(botApiData => {
        const telegramID = botApiData.telegramID
        const telegramToken = botApiData.telegramToken
        return sendMessageWithRetry({
            messageText: text,
            telegramID,
            telegramToken
        })
    }))
}

const handleSocketBotApiList = async (botApiListInput = {}) => {


    try {
        const objectToArray = Object.values(botApiListInput);
        const objectToArrayLength = objectToArray.length;
        console.log(changeColorConsole.greenBright("[New-Bot-API] Length:", objectToArrayLength));

        if (objectToArrayLength > 0) {

            // await getMoneyFuture(botApiListInput)

            await Promise.allSettled(objectToArray.map(botApiData => {

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id
                const botName = botApiList[botID].botName


                // allSymbol.forEach(symbol => {
                //     resetMissData({
                //         botID,
                //         symbol: symbol.value
                //     })
                // })


                const wsOrder = getWebsocketClientConfig({ ApiKey, SecretKey });

                wsOrder.subscribeV5(LIST_ORDER, 'spot').then(() => {

                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    botApiList[botID].wsOrder = wsOrder

                    wsOrder.on('update', async (dataCoin) => {

                        const botID = botApiData.id

                        const botDataMain = botApiList[botID]
                        const ApiKey = botDataMain.ApiKey
                        const SecretKey = botDataMain.SecretKey
                        const botName = botDataMain.botName

                        const telegramID = botDataMain.telegramID
                        const telegramToken = botDataMain.telegramToken

                        const topicMain = dataCoin.topic
                        const dataMainAll = dataCoin.data

                        // const dataMain = dataMainAll[0]
                        ApiKey && SecretKey && await Promise.allSettled(dataMainAll.map(async dataMain => {

                            if (dataMain.category == "spot") {

                                const symbol = dataMain.symbol
                                const orderID = dataMain.orderLinkId
                                const orderStatus = dataMain.orderStatus
                                const qty = +dataMain.cumExecQty


                                const botSymbolMissID = `${botID}-${symbol}`

                                if (orderStatus === "Filled") {
                                    console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMain.side} - ${symbol} ): ${orderID} - ${qty}`,));

                                    if (!orderID) {

                                        const listObject = listOCByCandleBot?.[botID]?.listOC
                                        listObject && Object.values(listObject).map(strategyData => {
                                            const strategyID = strategyData.strategyID
                                            const symbolItem = strategyData.symbol
                                            if (symbol == symbolItem && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderID) {
                                                {
                                                    console.log(`[V] RESET-Filled | ${symbol.replace("USDT", "")} - ${strategyData.side} - Bot: ${strategyData.botName}`);
                                                    cancelAll({ botID, strategyID })
                                                    delete listOCByCandleBot[botID].listOC[strategyID]
                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                                                        cancelAll({
                                                            botID,
                                                            strategyID,
                                                        })
                                                        delete allStrategiesByCandleAndSymbol[symbol][strategyID]
                                                    }
                                                }
                                            }
                                        })

                                    }
                                }
                                if (orderStatus === "PartiallyFilled") {
                                    console.log(changeColorConsole.blueBright(`[V] PartiallyFilled OrderID( ${botName} - ${dataMain.side} - ${symbol}):`, qty));
                                }

                                if (topicMain === "order") {

                                    const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                    const strategy = strategyData?.strategy

                                    const OCTrue = strategyData?.OC
                                    const TPTrue = strategyData?.TP


                                    if (strategy) {

                                        const strategyID = strategy.value
                                        const PositionSide = strategy.PositionSide
                                        // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen || strategy.coinOpen

                                        const scannerIDData = strategy?.scannerID
                                        const scannerID = scannerIDData?._id || "Manual"
                                        const scannerLabel = scannerIDData?.Label
                                        const scannerText = scannerIDData ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

                                        const TPMain = strategy.Adaptive ? TP_ADAPTIVE : TP_NOT_ADAPTIVE

                                        let timeOut = 5000

                                        if (orderStatus === "Filled" || orderStatus === "PartiallyFilled") {
                                            strategyData?.timeOutFunc && clearTimeout(strategyData?.timeOutFunc)

                                            if (orderStatus === "Filled") {
                                                timeOut = 0
                                            }

                                            allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = setTimeout(async () => {


                                                if (OCTrue) {

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true

                                                    const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                                    // const newOC = (Math.abs((openTrade - coinOpenOC)) / coinOpenOC * 100).toFixed(2)

                                                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC = newOC


                                                    const teleText = `<b>${symbol.replace("USDT", "")} ${handleIconMarketType(symbol)}</b> | Open ${PositionSide} ${scannerText} \nBot: ${botName} \nOC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${openTrade} | Amount: ${strategy.Amount}`
                                                    console.log(`\n\n[V] Filled OC: \n${teleText}\n`)

                                                    if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                        const Quantity = dataMain.side === "Buy" ? qty : (qty * -1)

                                                        const newDataToDB = {
                                                            Symbol: symbol,
                                                            Side: dataMain.side,
                                                            Quantity,
                                                            TradeType: symbolTradeTypeObject[symbol]
                                                        }

                                                        console.log(`\n[Saving->Mongo] Position When ${orderStatus} OC ( ${botName} - ${dataMain.side} - ${symbol} )`);

                                                        await createPositionBE({
                                                            ...newDataToDB,
                                                            botID,
                                                        }).then(async data => {
                                                            console.log(data.message);
                                                            !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                                            const newID = data.id
                                                            if (newID) {
                                                                missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                            }
                                                            else {
                                                                await getPositionBySymbol({ symbol, botID }).then(data => {
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

                                                    // Create TP


                                                    const TPNew = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side = strategy.PositionSide === "Long" ? "Sell" : "Buy"

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew


                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.qty = qty

                                                    // const basePrecision = digitAllCoinObject[symbol]?.basePrecision

                                                    const dataInput = {
                                                        strategy,
                                                        strategyID,
                                                        symbol,
                                                        qty: roundQty({
                                                            price: qty - qty * 0.15 / 100,
                                                            // price: qty,
                                                            tickSize: digitAllCoinObject[symbol]?.basePrecision
                                                        }),
                                                        price: roundPrice({
                                                            price: TPNew,
                                                            tickSize: digitAllCoinObject[symbol]?.priceScale
                                                        }),
                                                        side: strategy.PositionSide === "Long" ? "Sell" : "Buy",
                                                        ApiKey,
                                                        SecretKey,
                                                        botName,
                                                        botID,
                                                        telegramID,
                                                        telegramToken
                                                    }


                                                    handleSubmitOrderTP(dataInput)

                                                    sendMessageWithRetry({
                                                        messageText: teleText,
                                                        telegramID,
                                                        telegramToken,
                                                    })
                                                }
                                                // Khớp TP
                                                else if (TPTrue) {
                                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilled = true

                                                    const closePrice = +dataMain.avgPrice

                                                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                                                    const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC.openTrade

                                                    const qty = +dataMain.qty


                                                    const priceWinPercent = (Math.abs(closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2) || 0;
                                                    const priceWin = (closePrice - openTradeOCFilled) * qty;
                                                    const priceWinText = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;

                                                    let textWinLose = ""
                                                    let textWinLoseShort = ""
                                                    let textThongKeWinLose = ""

                                                    thongKeWinLoseByBot[botID] = thongKeWinLoseByBot[botID] || {}
                                                    thongKeWinLoseByBot[botID][scannerID] = thongKeWinLoseByBot[botID][scannerID] || { Win: 0, Lose: 0 }
                                                    if (side === "Buy") {
                                                        if (priceWin > 0) {
                                                            textWinLose = `\n[WIN - LONG]: ${priceWinText} | ${priceWinPercent}%\n`
                                                            textWinLoseShort = "✅"
                                                            console.log(changeColorConsole.greenBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsWin = true
                                                            thongKeWinLoseByBot[botID][scannerID].Win++
                                                        }
                                                        else {
                                                            textWinLose = `\n[LOSE - LONG]: ${priceWinText} | ${priceWinPercent}%\n`
                                                            textWinLoseShort = "❌"
                                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLose = true
                                                            thongKeWinLoseByBot[botID][scannerID].Lose++
                                                        }
                                                    }
                                                    else {
                                                        if (priceWin > 0) {
                                                            textWinLose = `\n[LOSE - SHORT]: ${-1 * priceWinText} | ${priceWinPercent}%\n`
                                                            textWinLoseShort = "❌"
                                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLose = true
                                                            thongKeWinLoseByBot[botID][scannerID].Lose++
                                                        }
                                                        else {
                                                            textWinLose = `\n[WIN - SHORT]: ${Math.abs(priceWinText)} | ${priceWinPercent}%\n`
                                                            textWinLoseShort = "✅"
                                                            console.log(changeColorConsole.greenBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsWin = true
                                                            thongKeWinLoseByBot[botID][scannerID].Win++
                                                        }
                                                    }
                                                    textThongKeWinLose = `<i>${thongKeWinLoseByBot[botID][scannerID].Win} Win - ${thongKeWinLoseByBot[botID][scannerID].Lose} Lose</i>`

                                                    const teleText = `<b>${textWinLoseShort} ${symbol.replace("USDT", "")} ${handleIconMarketType(symbol)}</b> | Close ${PositionSide} \n${textThongKeWinLose} ${scannerText} \nBot: ${botName} \nOC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${closePrice} | Amount: ${strategy.Amount}`
                                                    console.log(`[V] Filled TP: \n${teleText}\n`)

                                                    cancelAll({ strategyID, botID })

                                                    delete listOCByCandleBot?.[botID]?.listOC?.[strategyID]

                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                                                        cancelAll({
                                                            botID,
                                                            strategyID,
                                                        })
                                                        delete allStrategiesByCandleAndSymbol[symbol][strategyID]
                                                    }

                                                    missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)


                                                    // Fill toàn bộ
                                                    if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol[botSymbolMissID]?.size == 0) {
                                                        console.log(`\n[_FULL Filled_] TP ( ${botName} - ${side} - ${symbol})\n`);

                                                        if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                                            deletePositionBE({
                                                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                            }).then(message => {
                                                                console.log(`[...] Delete Position ( ${botName} - ${side} - ${symbol})`);
                                                                console.log(message);
                                                            }).catch(err => {
                                                                console.log("ERROR deletePositionBE:", err)
                                                            })
                                                        }

                                                        console.log(`[...] Reset All ( ${botName} - ${side} - ${symbol})`);

                                                        resetMissData({
                                                            botID,
                                                            symbol,
                                                        })

                                                    }
                                                    else {
                                                        console.log(`\n[_Part Filled_] TP ( ${botName} - ${side} - ${symbol})\n`);
                                                    }

                                                    sendMessageWithRetry({
                                                        messageText: `${teleText} \n${textWinLose}`,
                                                        telegramID,
                                                        telegramToken,
                                                    })

                                                }

                                                if (timeOut !== 0) {
                                                    handleCancelOrderOC({
                                                        strategyID,
                                                        strategy,
                                                        symbol,
                                                        side: strategy.PositionSide === "Long" ? "Buy" : "Sell",
                                                        botData: botDataMain,
                                                        OrderChange: strategy.OrderChange,
                                                        orderId: dataMain.orderId
                                                    })
                                                }
                                            }, timeOut)

                                        }

                                        else if (orderStatus === "Cancelled") {
                                            // console.log("[X] Cancelled");
                                            // Khớp TP
                                            if (TPTrue) {
                                                console.log(`[-] Cancelled TP ( ${botName} - ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol}  ) - Chốt lời `);

                                                // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""

                                                const qty = +dataMain.qty
                                                missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                                if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal - missTPDataBySymbol[botSymbolMissID].size > 0) {
                                                    missTPDataBySymbol[botSymbolMissID].gongLai = true
                                                    updatePositionBE({
                                                        newDataUpdate: {
                                                            Miss: true,
                                                            TimeUpdated: new Date()
                                                        },
                                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                    }).then(message => {
                                                        console.log(message);
                                                    }).catch(err => {
                                                        console.log("ERROR updatePositionBE:", err)
                                                    })
                                                    // resetMissData({
                                                    //     botID,
                                                    //     symbol,
                                                    // })
                                                }

                                            }
                                            else if (OCTrue) {
                                                // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

                                                console.log(`[-] Cancelled OC ( ${botName} - ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} ) `);
                                                cancelAll({ botID, strategyID })
                                                listOCByCandleBot?.[botID]?.listOC?.[strategyID] && delete listOCByCandleBot[botID].listOC[strategyID]
                                            }

                                        }
                                    }
                                }

                                else if (topicMain === "execution") {

                                    const size = Math.abs(dataMain.execQty)

                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                    missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                    try {
                                        if (size > 0) {
                                            missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                                            missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                                                const symbol = dataMain.symbol
                                                const side = dataMain.side
                                                const openTrade = +dataMain.execPrice  //Gia khop lenh

                                                const missSize = size - missTPDataBySymbol[botSymbolMissID]?.size || 0

                                                const Quantity = side === "Buy" ? size : (size * -1)

                                                if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                    const newDataToDB = {
                                                        Symbol: symbol,
                                                        Side: side,
                                                        Quantity,
                                                        TradeType: symbolTradeTypeObject[symbol]
                                                    }

                                                    console.log(`\n[Saving->Mongo] Position When Check Miss ( ${botName} - ${side} - ${symbol} )`);

                                                    await createPositionBE({
                                                        ...newDataToDB,
                                                        botID,
                                                    }).then(async data => {
                                                        console.log(data.message);

                                                        const newID = data.id

                                                        !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                                        if (newID) {
                                                            missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                        }
                                                        else {
                                                            await getPositionBySymbol({ symbol, botID }).then(data => {
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
                                                    if (missSize > 0) {

                                                        const teleText = `<b>⚠️ [ MISS ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName}: QTY: ${missSize} \n`
                                                        console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));

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


                                                        const dataInput = {
                                                            symbol,
                                                            qty: roundQty({
                                                                price: missSize - missSize * 0.15 / 100,
                                                                tickSize: digitAllCoinObject[symbol]?.basePrecision
                                                            }),
                                                            // price: roundPrice({
                                                            //     price: TPNew,
                                                            //     tickSize: digitAllCoinObject[symbol]?.priceScale
                                                            // }),
                                                            side,
                                                            botData: botDataMain,
                                                            botID,
                                                            missState: true,
                                                        }

                                                        console.log(changeColorConsole.magentaBright(`[...] Close TP Miss ( ${missSize} ) - QTY: ${dataInput.qty} `));

                                                        handleCloseMarket(dataInput)

                                                        // updatePositionBE({
                                                        //     newDataUpdate: {
                                                        //         Miss: true
                                                        //     },
                                                        //     orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                        // }).then(message => {
                                                        //     console.log(message);
                                                        // }).catch(err => {
                                                        //     console.log("ERROR updatePositionBE:", err)
                                                        // })

                                                        // sendMessageWithRetry({
                                                        //     messageText: teleText,
                                                        //     telegramID,
                                                        //     telegramToken
                                                        // })
                                                    }
                                                    else {
                                                        console.log(`[_ Not Miss _] TP ( ${botName} - ${side} - ${symbol}} )`);
                                                        // updatePositionBE({
                                                        //     newDataUpdate: {
                                                        //         Miss: false,
                                                        //         TimeUpdated: new Date()
                                                        //     },
                                                        //     orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                        // }).then(message => {
                                                        //     console.log(message);
                                                        // }).catch(err => {
                                                        //     console.log("ERROR updatePositionBE:", err)
                                                        // })
                                                    }
                                                }
                                                else {
                                                    const teleText = `<b>⚠️ [ MISS-GongLai ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName}  \n`
                                                    console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));
                                                    // updatePositionBE({
                                                    //     newDataUpdate: {
                                                    //         Miss: true,
                                                    //         TimeUpdated: new Date()
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
                                            missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                                        }
                                    } catch (error) {
                                        console.log("error check miss", error);

                                    }
                                }


                                // User cancel vị thế ( Limit )
                                if (!orderID && (orderStatus === "New" || orderStatus === "Filled") && dataMain.orderType !== "Market") {

                                    console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Limit) - ( ${symbol} )`)

                                    const botSymbolMissID = `${botID}-${symbol}`

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

                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                    resetMissData({ botID, symbol })

                                    // missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                                    //     orderID: dataMain.orderId,
                                    // })
                                    missTPDataBySymbol[botSymbolMissID].size = Math.abs(dataMain.qty)
                                }
                                // User cancel vị thế ( Market )
                                if (dataMain.orderType === "Market") {

                                    console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} - ${dataMain.side} )`)

                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                    if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                        await deletePositionBE({
                                            orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log("ERROR deletePositionBE:", err)
                                        })
                                    }

                                    resetMissData({ botID, symbol })


                                }

                            }
                        }))
                    })

                    wsOrder.on('close', () => {
                        console.log('Connection order closed');
                        wsOrder.connectPrivate(LIST_ORDER, "spot")
                    });

                    wsOrder.on('reconnected', () => {
                        if (connectByBotError[botID]) {
                            const telegramID = botDataMain?.telegramID
                            const telegramToken = botDataMain?.telegramToken

                            const text = `🔰 ${botName} khôi phục kết nối thành công`
                            console.log(text);
                            console.log(`[V] Reconnected Bot ( ${botName} ) success`)
                            connectByBotError[botID] = false
                            sendMessageWithRetry({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })

                            const listOCByBot = listOCByCandleBot?.[botID]
                            const listObject = listOCByBot?.listOC
                            listOCByBot && handleCancelAllOrderOC([listOCByBot])

                            listObject && Object.values(listObject).map(strategyData => {
                                const strategyID = strategyData.strategyID
                                cancelAll({ botID, strategyID })
                                delete listOCByCandleBot[botID].listOC[strategyID]
                                console.log(`[V] RESET-Reconnected | ${strategyData.symbol.replace("USDT", "")} - ${strategyData.side} - Bot: ${strategyData.botName}`);
                            })
                        }
                    });

                    wsOrder.on('error', (err) => {
                        if (!connectByBotError[botID]) {
                            const telegramID = botDataMain?.telegramID
                            const telegramToken = botDataMain?.telegramToken

                            const text = `🚫 [ Cảnh báo ] ${botName} đang bị gián đoạn kết nối`
                            console.log(text);
                            console.log(`[!] Connection bot ( ${botName} ) error`);
                            console.log(err);
                            connectByBotError[botID] = true
                            wsOrder.connectAll()

                            sendMessageWithRetry({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })
                        }
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

const handleSocketListKline = async (listKlineInput) => {

    await wsSymbol.subscribeV5(listKlineInput, 'spot').then(() => {
        const length = listKlineInput.length

        console.log(`[V] Subscribe ${length} kline success\n`);

    }).catch(err => {
        console.log(`[!] Subscribe ${length} kline error: ${err}`,)
    })

}


// ----------------------------------------------------------------------------------
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const checkConditionBot = (botData) => {
    return botData.botID?.Status === "Running" && botData.botID?.ApiKey && botData.botID?.SecretKey
}

// ----------------------------------------------------------------------------------
const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}

const formatNumberString = number => {
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
const checkInfinityValue = value => [Infinity, -Infinity].includes(value)
const formatTime = time => new Date(time).toLocaleString()

const tinhOC = (symbol, dataAll = []) => {

    if (dataAll.length > 0) {

        let dataOC = {
            close: 0,
            open: 0,
            high: 0,
            low: 0,
            OCData: {
                OC: 0,
                timestamp: 0,
            },
            TPData: {
                TP: 0,
                timestamp: 0,
            }
        }
        let dataOCLong = {
            close: 0,
            open: 0,
            high: 0,
            low: 0,
            OCData: {
                OC: 0,
                timestamp: 0,
            },
            TPData: {
                TP: 0,
                timestamp: 0,
            }
        }

        const vol = dataAll[dataAll.length - 1].turnover - preTurnover[symbol]

        dataAll.forEach((data, index) => {

            const Close = +data.close
            const Open = +data.open
            const Highest = +data.high
            const Lowest = +data.low
            // const turnover = data.turnover
            const timestamp = data.timestamp

            if (!dataOC.close) {
                const OC = (Highest - Open) / Open
                const TP = Math.abs((Highest - Close) / (Highest - Open)) || 0

                if (!checkInfinityValue(OC)) {
                    dataOC = {
                        close: Close,
                        open: Open,
                        high: Highest,
                        low: Lowest,
                        OCData: {
                            OC,
                            timestamp,
                        },
                        TPData: {
                            TP: checkInfinityValue(TP) ? 0 : TP,
                            timestamp,
                        }
                    }
                }
            }
            else {
                if (Lowest < dataOC.close) {
                    const TPTemp = Math.abs((Lowest - dataOC.high) / (dataOC.high - dataOC.open)) || 0
                    if (!checkInfinityValue(TPTemp) && TPTemp > dataOC.TPData.TP) {
                        dataOC.TPData = {
                            TP: TPTemp,
                            timestamp,
                        }
                    }
                }
            }
            if (!dataOCLong.close) {
                const OCLong = (Lowest - Open) / Open
                const TPLong = Math.abs(Close - Lowest) / (Open - Lowest) || 0
                if (!checkInfinityValue(OCLong)) {
                    dataOCLong = {
                        close: Close,
                        open: Open,
                        high: Highest,
                        low: Lowest,
                        OCData: {
                            OC: OCLong,
                            timestamp,
                        },
                        TPData: {
                            TP: checkInfinityValue(TPLong) ? 0 : TPLong,
                            timestamp,
                        }
                    }
                }
            }
            else {

                if (Highest > dataOCLong.close) {
                    const TPLongTemp = Math.abs((Highest - dataOCLong.low) / (dataOCLong.low - dataOCLong.open)) || 0
                    if (!checkInfinityValue(TPLongTemp) && TPLongTemp > dataOCLong.TPData.TP) {
                        dataOCLong.TPData = {
                            TP: TPLongTemp,
                            timestamp,
                        }

                    }
                }
            }
        })

        const OCRound = roundNumber(dataOC.OCData.OC)
        const TPRound = Math.abs(roundNumber(dataOC.TPData.TP))
        const OCLongRound = roundNumber(dataOCLong.OCData.OC)
        const TPLongRound = Math.abs(roundNumber(dataOCLong.TPData.TP))

        // if (symbol === "ECOXUSDT") {

        //     const htLong = (`LONG:  <b>${symbol.replace("USDT", "")}</b> - OC: ${OCLongRound}% - TP: ${TPLongRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(dataOCLong.OCData.timestamp)}`)
        //     console.log(htLong);

        //     const ht = (` ${symbol.replace("USDT", "")} - OC: ${OCRound}% - TP: ${TPRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(dataOC.OCData.timestamp)}`)
        //     console.log(changeColorConsole.cyanBright(ht));
        //     console.log(dataAll);
        // }

        const listScannerObject = allScannerDataObject[symbol]

        listScannerObject && Object.values(listScannerObject)?.length > 0 && Promise.allSettled(Object.values(listScannerObject).map(async scannerData => {

            scannerData.Amount = Math.abs((+scannerData.Amount).toFixed(3))
            scannerData.OrderChange = Math.abs((+scannerData.OrderChange).toFixed(3))
            scannerData.Turnover = Math.abs(scannerData.Turnover)
            scannerData.Numbs = Math.abs(scannerData.Numbs)
            scannerData.Elastic = Math.abs(scannerData.Elastic)
            scannerData.Limit = Math.abs(scannerData.Limit)
            scannerData.Expire = Math.abs(scannerData.Expire)

            const PositionSide = scannerData.PositionSide
            const OrderChange = Math.abs(scannerData.OrderChange)
            const Elastic = Math.abs(scannerData.Elastic)
            const Turnover = Math.abs(scannerData.Turnover)
            const Market = scannerData.Market
            const scannerID = scannerData._id
            const Expire = Math.abs(scannerData.Expire)
            const botData = scannerData.botID
            const botID = botData._id
            const botName = botApiList[botID]?.botName || botData.botName

            if (scannerData.IsActive && botApiList[botID]?.IsActive) {

                // Check expire 
                if (Expire && (new Date() - scannerData.ExpirePre) >= Expire * 60 * 1000) {

                    // Delete all config
                    const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]
                    if (listConfigIDByScannerData?.length > 0) {
                        let deleteResSuccess = false
                        console.log(changeColorConsole.blueBright(`[V] BigBabol ${scannerData.Label} Expire ( ${symbol} - ${PositionSide} - ${OrderChange} ) ( ${Expire} min )`));
                        if (Market === "Spot") {
                            deleteResSuccess = await deleteStrategiesMultipleSpotBE({
                                botName,
                                PositionSide,
                                scannerID,
                                symbol
                            })
                        }
                        else {
                            deleteResSuccess = await deleteStrategiesMultipleMarginBE({
                                botName,
                                PositionSide,
                                scannerID,
                                symbol
                            })
                        }

                        if (deleteResSuccess) {
                            delete listConfigIDByScanner[scannerID]?.[symbol]
                            await handleSocketDelete(listConfigIDByScannerData)
                        }
                    }

                    allScannerDataObject[symbol][scannerID].ExpirePre = new Date()

                }

                if (vol >= Turnover) {
                    const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

                    if (PositionSide === "Long") {

                        const OCLongRoundAbs = Math.abs(OCLongRound)
                        if (OCLongRoundAbs >= OrderChange && TPLongRound >= Elastic) {
                            const htLong = (`\n[RADA-${Market}] | ${symbol.replace("USDT", "")} - OC: ${OCLongRound}% - TP: ${TPLongRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(dataOCLong.OCData.timestamp)}`)
                            console.log(changeColorConsole.cyanBright(htLong));
                            // console.log(dataAll);
                            if (!listConfigIDByScannerData?.length) {
                                Market == "Spot" ? handleCreateMultipleConfigSpot({
                                    scannerData,
                                    symbol,
                                    botName,
                                    OC: OCLongRoundAbs
                                }) : handleCreateMultipleConfigMargin({
                                    scannerData,
                                    symbol,
                                    botName,
                                    OC: OCLongRoundAbs
                                });
                            }
                        }

                    }
                    else {
                        const OCRoundAbs = Math.abs(OCRound)
                        if (OCRoundAbs >= OrderChange && TPRound >= Elastic) {
                            const ht = (`\n[RADA-${Market}] | ${symbol.replace("USDT", "")} - OC: ${OCRound}% - TP: ${TPRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(dataOC.OCData.timestamp)}`)
                            console.log(changeColorConsole.cyanBright(ht));
                            // console.log(dataAll);
                            if (!listConfigIDByScannerData?.length) {
                                handleCreateMultipleConfigMargin({
                                    scannerData,
                                    symbol,
                                    botName,
                                    OC: OCRoundAbs
                                })
                            }
                        }
                    }
                }
            }


        }))

    }
}
// ----------------------------------------------------------------------------------


const Main = async () => {

    const allbotOfServer = await getAllBotIDByServerIP(SERVER_IP)

    const deleteAll = deleteAllScannerV1BE(allbotOfServer)
    const deleteAllUPCode = deleteAllForUPcodeV1(allbotOfServer)

    await Promise.allSettled([deleteAll, deleteAllUPCode])

    const allSymbolBE = await getAllCoinBE()

    const getAllConfigSpot = getAllStrategiesActiveSpotBE(allbotOfServer)
    const getAllConfigMargin = getAllStrategiesActiveMarginBE(allbotOfServer)
    const getAllConfigScanner = getAllStrategiesActiveScannerBE(allbotOfServer)


    const allRes = await Promise.allSettled([getAllConfigSpot, getAllConfigMargin, getAllConfigScanner])

    const getAllConfigRes = [
        ...allRes[0].value || [],
        ...allRes[1].value || [],
    ]

    const getAllConfigScannerRes = allRes[2].value || []

    allSymbol = [...new Set(allSymbolBE)]

    allSymbol.forEach(symbolData => {
        const symbol = symbolData.symbol
        trichMauOCListObject[symbol] = {
            preTime: 0
        }
        symbolTradeTypeObject[symbol] = symbolData.market === "Spot" ? "Spot" : "Margin"

        trichMauData[symbol] = {
            open: 0,
            close: 0,
            high: 0,
            low: 0,
            turnover: 0
        }
        preTurnover[symbol] = 0
        trichMauDataArray[symbol] = []
        trichMau[symbol] = {
            cur: 0,
            pre: 0,
        }

        listKline[symbol] = `kline.D.${symbol}`

        getAllConfigScannerRes.forEach(scannerData => {
            const scannerID = scannerData._id
            const setBlacklist = new Set(scannerData.Blacklist)
            const setOnlyPairs = new Set(scannerData.OnlyPairs)
            if (checkConditionBot(scannerData) && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {
                const botID = scannerData.botID._id
                const botName = scannerData.botID.botName

                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey: scannerData.botID.ApiKey,
                    SecretKey: scannerData.botID.SecretKey,
                    telegramID: scannerData.botID.telegramID,
                    telegramToken: scannerData.botID.telegramToken,
                    IsActive: true
                };

                allScannerDataObject[symbol] = allScannerDataObject[symbol] || {}
                const newScannerData = { ...scannerData }

                newScannerData.ExpirePre = new Date()
                allScannerDataObject[symbol][scannerID] = newScannerData
            }
        })

    })

    getAllConfigRes.forEach(strategyItem => {
        if (checkConditionBot(strategyItem)) {

            const strategyID = strategyItem.value

            const botID = strategyItem.botID._id
            const botName = strategyItem.botID.botName
            const symbol = strategyItem.symbol

            botApiList[botID] = {
                id: botID,
                botName,
                ApiKey: strategyItem.botID.ApiKey,
                SecretKey: strategyItem.botID.SecretKey,
                telegramID: strategyItem.botID.telegramID,
                telegramToken: strategyItem.botID.telegramToken,
                IsActive: true

            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategyItem;

            cancelAll({ strategyID, botID })

        }
    })

    await syncDigit()
    console.log(digitAllCoinObject);


    await handleSocketBotApiList(botApiList)

    await handleSocketListKline(Object.values(listKline))

    // Rest thongke Win-Lose
    cron.schedule('0 6 * * *', () => {
        thongKeWinLoseByBot = {}
    });

    cron.schedule('0 */1 * * *', async () => {
        await syncDigit()
    });
}

try {
    Main()

    wsSymbol.on('update', (dataCoin) => {

        const [_, candle, symbol] = dataCoin.topic.split(".");

        const dataMain = dataCoin.data[0]

        const coinCurrent = +dataMain.close
        const coinOpen = +dataMain.open

        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]

        listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {
            const botID = strategy.botID._id

            if (checkConditionBot(strategy) && strategy.IsActive && !strategy?.IsDeleted && botApiList[botID]?.IsActive && !updatingAllMain && !repayCoinObject[botID]?.[symbol]) {

                // console.log("strategy.Amount", strategy.Amount,symbol);
                // console.log("strategy.OrderChange", strategy.OrderChange,symbol);

                strategy.Amount = Math.abs((+strategy.Amount).toFixed(3))
                strategy.OrderChange = Math.abs((+strategy.OrderChange).toFixed(3))
                strategy.AmountAutoPercent = Math.abs(strategy.AmountAutoPercent)
                strategy.AmountExpire = Math.abs(strategy.AmountExpire)
                strategy.AmountIncreaseOC = Math.abs(strategy.AmountIncreaseOC)
                strategy.Limit = Math.abs(strategy.Limit)
                strategy.Expire = Math.abs(strategy.Expire)

                const strategyID = strategy.value

                const botData = strategy.botID
                const botName = strategy.botID.botName

                const Expire = Math.abs(strategy.Expire)
                const AmountExpire = Math.abs(strategy.AmountExpire)
                const ApiKey = strategy.botID.ApiKey
                const SecretKey = strategy.botID.SecretKey
                const telegramID = strategy.botID.telegramID
                const telegramToken = strategy.botID.telegramToken
                const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"


                // Gắn time limit config
                !strategy.ExpirePre && (strategy.ExpirePre = new Date());
                !strategy.AmountOld && (strategy.AmountOld = strategy.Amount);
                !strategy.AmountExpirePre && (strategy.AmountExpirePre = new Date());



                //Check expire Increase-Amount - OK
                if (AmountExpire && (new Date() - strategy.AmountExpirePre) >= AmountExpire * 60 * 1000) {
                    console.log(changeColorConsole.blueBright(`[V] Amount Expire ( ${symbol} ) ( ${strategy.AmountExpire} min )`));
                    strategy.Amount = strategy.AmountOld
                    strategy.AmountExpirePre = new Date()
                }

                //Check expire config - OK
                if (Expire && (new Date() - strategy.ExpirePre) >= Expire * 60 * 1000) {

                    console.log(changeColorConsole.blueBright(`[V] Config ( ${symbolTradeTypeObject[symbol]} - ${symbol} ) Expire ( ${strategy.Expire} min )`));

                    strategy.IsActive = false
                    const configID = strategy._id

                    let offSuccess = false
                    if (symbolTradeTypeObject[symbol] == "Spot") {
                        offSuccess = await offConfigSpotBE({
                            configID,
                            symbol,
                        })
                    }
                    else {
                        offSuccess = await offConfigMarginBE({
                            configID,
                            symbol,
                            PositionSide: strategy.PositionSide
                        });
                    }
                    offSuccess && await handleSocketUpdate([strategy])

                    strategy.ExpirePre = new Date()
                }


                let priceOrderOC = 0
                let priceOrderTPTemp = 0
                let qty = 0
                const TPMain = strategy.Adaptive ? TP_ADAPTIVE : TP_NOT_ADAPTIVE

                if (side === "Buy") {
                    priceOrderOC = coinCurrent - coinCurrent * strategy.OrderChange / 100
                    priceOrderTPTemp = priceOrderOC + Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                }
                else {
                    priceOrderOC = coinCurrent + coinCurrent * strategy.OrderChange / 100
                    priceOrderTPTemp = priceOrderOC - Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                }

                qty = (strategy.Amount / +priceOrderOC)

                const dataInput = {
                    strategy,
                    strategyID,
                    ApiKey,
                    SecretKey,
                    symbol,
                    qty: roundQty({
                        price: qty,
                        tickSize: digitAllCoinObject[symbol]?.basePrecision
                    }),
                    side,
                    price: roundPrice({
                        price: priceOrderOC,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    }),
                    priceOrderTPTemp: roundPrice({
                        price: priceOrderTPTemp,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    }),
                    botName,
                    botID,
                    botData,
                    telegramID,
                    telegramToken,
                    coinOpen,
                    isLeverage: symbolTradeTypeObject[symbol] === "Spot" ? 0 : 1
                }


                if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                ) {

                    if (strategy.IsActive && new Date() - trichMauOCListObject[symbol].preTime >= 1000) {
                        handleMoveOrderOC({
                            ...dataInput,
                            orderId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID
                        })
                    }

                }
                else if (strategy.IsActive && allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderID &&
                    strategy.Adaptive &&
                    new Date() - trichMauOCListObject[symbol].preTime >= 1000) {
                    handleMoveOrderTP({
                        ...dataInput,
                        orderId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderID
                    })
                }

                else if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering) {

                    //  CHECK WIN - LOSE 
                    if (strategy.preIsWin) {
                        const newAmount = strategy.Amount + strategy.Amount * strategy.AmountAutoPercent / 100
                        newAmount <= strategy.Limit && (strategy.Amount = newAmount);
                    }
                    else if (strategy.preIsLose) {
                        strategy.OrderChange = strategy.OrderChange + strategy.OrderChange * strategy.AmountIncreaseOC / 100
                        // add blacklist

                        const scannerID = strategy.scannerID?._id
                        if (scannerID) {
                            const updateSuccess = await addSymbolToBlacklistBE({
                                scannerID,
                                symbol,
                            })

                            if (updateSuccess) {
                                const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]
                                if (scannerDataUpdate) {
                                    const newScannerDataUpdate = { ...scannerDataUpdate }
                                    newScannerDataUpdate.Blacklist.push(symbol)
                                    handleSocketScannerUpdate([newScannerDataUpdate] || [])
                                }

                            }
                        }

                    }

                    let priceOrderOCNew = 0
                    if (side === "Buy") {
                        priceOrderOCNew = coinCurrent - coinCurrent * strategy.OrderChange / 100
                        priceOrderTPTemp = priceOrderOC + Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                    }
                    else {
                        priceOrderOCNew = coinCurrent + coinCurrent * strategy.OrderChange / 100
                        priceOrderTPTemp = priceOrderOC - Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                    }


                    const qtyNew = (strategy.Amount / +priceOrderOCNew)

                    dataInput.price = roundPrice({
                        price: priceOrderOCNew,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    })

                    dataInput.priceOrderTPTemp = roundPrice({
                        price: priceOrderTPTemp,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    })

                    dataInput.qty = roundQty({
                        price: qtyNew,
                        tickSize: digitAllCoinObject[symbol]?.basePrecision
                    })


                    if (dataInput.qty > 0) {
                        strategy.IsActive && handleSubmitOrder(dataInput)
                    }
                    else {
                        console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} ) failed: ( QTY : ${dataInput.qty} ) `))
                    }
                }

            }
        }))

        trichMauOCListObject[symbol].preTime = new Date()

        //----------------------------------------------------------------
        // SCANNER
        const turnover = +dataMain.turnover

        listKlineObject[symbol] = symbol

        if (!trichMauData[symbol].open) {
            trichMauData[symbol] = {
                open: coinCurrent,
                close: coinCurrent,
                high: coinCurrent,
                low: coinCurrent,
                turnover,
                turnoverD: turnover
            }
            preTurnover[symbol] = turnover
            trichMauDataArray[symbol].push(trichMauData[symbol])
        }

        if (coinCurrent > trichMauData[symbol].high) {
            trichMauData[symbol].high = coinCurrent

        }
        if (coinCurrent < trichMauData[symbol].low) {
            trichMauData[symbol].low = coinCurrent
        }


        // trichMauData[symbol].turnover = turnover - trichMauData[symbol].turnover
        trichMauData[symbol].turnoverD = turnover
        trichMauData[symbol].close = coinCurrent
        trichMauData[symbol].timestamp = dataMain.timestamp


        const time = Date.now()
        if (time - trichMau[symbol].pre >= 1000) {
            trichMauDataArray[symbol].push(trichMauData[symbol])
            trichMau[symbol].pre = time
        }
        trichMauData[symbol] = {
            open: coinCurrent,
            close: coinCurrent,
            high: coinCurrent,
            low: coinCurrent,
            turnover,
            turnoverD: turnover
        }

    })

    wsSymbol.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbol.unsubscribeV5(listKline, "spot")
    });

    wsSymbol.on('reconnected', async () => {
        if (connectKlineError) {
            const text = "🔰 Hệ thống khôi phục kết nối thành công"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[V] Reconnected kline success')
            connectKlineError = false
            console.log(`[...] Restarting Code`);

            updatingAllMain = true

            const cancelOC = cancelAllListOrderOC(listOCByCandleBot)
            const deleteAll = deleteAllForUPcode()

            await Promise.allSettled([cancelOC, deleteAll])

            console.log("[V] PM2 Reset All Successful");
            const fileName = __filename.split(/(\\|\/)/g).pop()
            exec(`pm2 restart ${fileName}`)
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
    });

    setInterval(() => {

        Object.values(listKlineObject).forEach(symbol => {
            tinhOC(symbol, trichMauDataArray[symbol])
            const coinCurrent = trichMauData[symbol].close
            const turnover = trichMauData[symbol].turnover
            trichMauData[symbol] = {
                open: coinCurrent,
                close: coinCurrent,
                high: coinCurrent,
                low: coinCurrent,
                turnover,
            }
            preTurnover[symbol] = turnover
            trichMauDataArray[symbol] = []
        })
        listKlineObject = {}
    }, 3000)


    // handleCreateMultipleConfigSpot({
    //     scannerData: getAllConfigScannerRes[0],
    //     symbol: "CRDSUSDT",
    // })


    // handleCreateMultipleConfigMargin({
    //     scannerData: getAllConfigScannerRes[1],
    //     symbol: "AAVEUSDT",
    // })
}

catch (e) {
    console.log("Error Main:", e)
}


// ----------------------------------------------------------------

const handleSocketAddNew = async (newData = []) => {
    console.log("[...] Add New Strategies From Realtime", newData.length);

    const newBotApiList = {}

    await Promise.allSettled(newData.map(async newStrategiesData => {

        if (checkConditionBot(newStrategiesData)) {

            delete newStrategiesData.TimeTemp

            const symbol = newStrategiesData.symbol

            const strategyID = newStrategiesData.value

            const botID = newStrategiesData.botID._id
            const botName = newStrategiesData.botID.botName

            const ApiKey = newStrategiesData.botID.ApiKey
            const SecretKey = newStrategiesData.botID.SecretKey

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                    IsActive: true
                }

                // !allStrategiesByBotIDOrderOC[botID] && (allStrategiesByBotIDOrderOC[botID] = {})
                // !allStrategiesByBotIDOrderOC[botID][symbol] && (
                //     allStrategiesByBotIDOrderOC[botID][symbol] = {
                //         totalOC: 0,
                //         logError: false
                //     }
                // )
            }



            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = newStrategiesData;

            cancelAll({ strategyID, botID })

        }

    }))

    await handleSocketBotApiList(newBotApiList)

}
const handleSocketUpdate = async (newData = []) => {
    console.log("[...] Update Strategies From Realtime", newData.length);

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {

        if (checkConditionBot(strategiesData)) {

            const botData = strategiesData.botID
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const botID = botData._id
            const botName = botData.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive


            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });


            if (IsActive) {
                if (!botApiList[botID]) {
                    botApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true

                    }

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true

                    }

                    // !allStrategiesByBotIDOrderOC[botID] && (allStrategiesByBotIDOrderOC[botID] = {})
                    // !allStrategiesByBotIDOrderOC[botID][symbol] && (
                    //     allStrategiesByBotIDOrderOC[botID][symbol] = {
                    //         totalOC: 0,
                    //         logError: false
                    //     }
                    // )
                }
            }

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                symbol,
                strategy: strategiesData,
                side,
                botName,
                botID,
                botData,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                side,
                botName,
                botID,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })
        }

    }))


    await handleCancelAllOrderTP({ items: listOrderTP })
    await cancelAllListOrderOC(listOrderOC)

    await handleSocketBotApiList(newBotApiList)
}

const handleSocketDelete = async (newData = []) => {
    console.log("[...] Delete Strategies From Realtime", newData.length);

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {
        if (checkConditionBot(strategiesData)) {

            const botData = strategiesData.botID

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const botID = botData._id
            const botName = botData.botName
            const scannerID = strategiesData.scannerID?._id

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                strategy: strategiesData,
                symbol,
                side,
                botName,
                botID,
                botData,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                side,
                botName,
                botID,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })

            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
            //     gongLai: true
            // })


            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
            scannerID && delete listConfigIDByScanner[scannerID]?.[symbol]
        }
    }))

    await handleCancelAllOrderTP({ items: listOrderTP })

    await cancelAllListOrderOC(listOrderOC)

}

const handleSocketScannerUpdate = async (newData = []) => {

    console.log("[...] Update BigBabol From Realtime", newData.length);
    const newBotApiList = {}

    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const scannerID = scannerData._id
            const IsActive = scannerData.IsActive
            const botData = scannerData.botID

            const botID = botData?._id
            const botName = botData.botName
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
            }
            const setOnlyPairs = new Set(scannerData.OnlyPairs)
            const setBlacklist = new Set(scannerData.Blacklist)
            allSymbol.forEach(symbolData => {

                const symbol = symbolData.symbol
                if (IsActive && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {
                    !allScannerDataObject[symbol] && (allScannerDataObject[symbol] = {})

                    const newScannerData = { ...scannerData }
                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[symbol][scannerID] = newScannerData

                }
                else {
                    delete allScannerDataObject[symbol]?.[scannerID]
                }
            })

        }
    })
    await handleSocketBotApiList(newBotApiList)
}

// REALTIME
const socket = require('socket.io-client');

const socketRealtime = socket(process.env.SOCKET_IP);


socketRealtime.on('connect', () => {
    console.log('\n[V] Connected Socket Realtime\n');
    socketRealtime.emit('joinRoom', SERVER_IP);
    socketRealtime.emit('joinRoom', 'ByBit_V1');
});

socketRealtime.on('add', async (newData = []) => {

    await handleSocketAddNew(newData)

});

socketRealtime.on('update', async (newData = []) => {

    await handleSocketUpdate(newData, false)

});
socketRealtime.on('delete', async (newData) => {
    await handleSocketDelete(newData)

});

socketRealtime.on('cancel-all-config-by-scanner', async (newData) => {
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
        const scannerID = strategiesData.scannerID?._id

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId) {
            listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
                strategy: strategiesData,
                botData
            }
        }
        else {
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
        }
        scannerID && delete listConfigIDByScanner[scannerID]?.[symbol]
    }))

    const allData = Object.values(listOrderOC).reduce((pre, item) => {

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
        return pre
    }, {});

    const listConfigIsDeleted = Object.values(allData || {})

    if (listConfigIsDeleted.length > 0) {
        const batchSize = 10

        let messageListByBot = {}
        await Promise.allSettled(listConfigIsDeleted.map(async item => {

            const client = getRestClientV5Config({ ApiKey: item.ApiKey, SecretKey: item.SecretKey });

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
                        const symbol = cur.symbol

                        if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled) {
                            pre.push({
                                symbol,
                                orderLinkId: curOrderLinkId,
                            })
                            listCancel[curOrderLinkId] = cur
                        }
                        else {
                            console.log(`[V] Cancel order OC ( ${cur.botName} - ${cur.side} -  ${symbol} ) has been filled `);
                            allStrategiesByCandleAndSymbol[symbol][strategyIDTemp].IsDeleted = true
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("spot", newList)

                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []

                    listSuccess.forEach((item, index) => {
                        const data = listCancel[item.orderLinkId]

                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const OrderChange = data.strategy.OrderChange
                        const strategyIDTemp = data.strategyID
                        const symbol = data.symbol
                        const side = data.side

                        let textTele = ""

                        const scannerLabel = data?.strategy?.scannerID?.Label
                        const scannerText = scannerLabel ? `\n<code>Scan: ${scannerLabel} 🌀</code>` : ""

                        if (codeData.code == 0) {
                            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${data.botName} \n<i>-> Success</i>`
                            console.log(textTele);
                            cancelAll({
                                botID: botIDTemp,
                                strategyID: strategyIDTemp,
                            })
                            delete listOCByCandleBot?.[botIDTemp]?.listOC[strategyIDTemp]
                            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyIDTemp]
                        }
                        else {
                            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) ${scannerText} \n<b>${symbol.replace("USDT", "")}</b> ${handleIconMarketType(symbol)} | Bot: ${data.botName} \n<code>🟡 Failed: ${codeData.msg}</code>`
                            console.log(changeColorConsole.yellowBright(textTele));
                            allStrategiesByCandleAndSymbol[symbol][strategyIDTemp].IsDeleted = true
                        }

                        messageListByBot[botIDTemp] = messageListByBot[botIDTemp] || {
                            botData: data.botData,
                            textTele: []
                        }

                        messageListByBot[botIDTemp].textTele.push(textTele)

                    })

                    await delay(1200)
                    index += batchSize;
                }

            }
        }))

        const listTele = Object.values(messageListByBot)

        listTele?.length > 0 && await Promise.allSettled(listTele.map(messageData => {
            sendMessageWithRetryWait({
                messageText: messageData.textTele?.join("\n\n"),
                telegramID: messageData.botData.telegramID,
                telegramToken: messageData.botData.telegramToken,
            })
        }))
        console.log("[V] Cancel All OC Success");
    }
});

socketRealtime.on('scanner-add', async (newData = []) => {
    console.log("[...] Add BigBabol From Realtime", newData.length);
    const newBotApiList = {}

    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const scannerID = scannerData._id

            const botID = scannerData.botID?._id
            const botName = scannerData.botID.botName
            const ApiKey = scannerData.botID.ApiKey
            const SecretKey = scannerData.botID.SecretKey
            const telegramID = scannerData.botID.telegramID
            const telegramToken = scannerData.botID.telegramToken

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    IsActive: true
                }
            }

            const setBlacklist = new Set(scannerData.Blacklist)
            scannerData.OnlyPairs.forEach(symbol => {
                if (!setBlacklist.has(symbol)) {
                    !allScannerDataObject[symbol] && (allScannerDataObject[symbol] = {})

                    const newScannerData = { ...scannerData }
                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[symbol][scannerID] = newScannerData
                }
            })
        }
    })
    await handleSocketBotApiList(newBotApiList)

});

socketRealtime.on('scanner-update', async (newData = []) => {
    await handleSocketScannerUpdate(newData)
});

socketRealtime.on('scanner-delete', async (newData = []) => {
    console.log("[...] Delete BigBabol From Realtime", newData.length);


    newData.forEach(scannerData => {
        const scannerID = scannerData._id
        allSymbol.forEach(symbol => {
            delete allScannerDataObject[symbol.symbol]?.[scannerID]
        })
    })

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
        const botID = botData._id
        const botName = botData.botName

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        if (checkConditionBot(strategiesData)) {

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

            if (botActive) {
                if (!botApiList[botID]) {

                    newBotApiList[botID] = {
                        id: botID,
                        ApiKey,
                        SecretKey,
                        botName,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true
                    }
                }
                botApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: botActive
                }
            }
        }

        const cancelDataObject = {
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            side,
            botName,
            botID
        }

        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
            strategyID,
            symbol,
            side,
            botName,
            botID,
            orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
            strategy: strategiesData,
            botData
        });

        allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            side,
            botName,
            botID,
            orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
            gongLai: true
        })

    }))

    allSymbol.forEach(item => {
        const symbol = item.symbol
        scannerData.forEach(scannerItem => {
            if (checkConditionBot(scannerItem)) {

                const ApiKey = scannerItem.botID.ApiKey
                const SecretKey = scannerItem.botID.SecretKey
                const botID = scannerItem.botID._id
                const botName = scannerItem.botID.botName
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
                                telegramID: scannerItem.botID.telegramID,
                                telegramToken: scannerItem.botID.telegramToken,
                                IsActive: true
                            }
                        }
                        botApiList[botID] = {
                            id: botID,
                            ApiKey,
                            SecretKey,
                            botName,
                            telegramID: scannerItem.botID.telegramID,
                            telegramToken: scannerItem.botID.telegramToken,
                            IsActive: botActive
                        }
                    }

                    allScannerDataObject[symbol] = allScannerDataObject[symbol] || {}

                    const newScannerData = { ...scannerItem }

                    newScannerData.ExpirePre = new Date()

                    allScannerDataObject[symbol][scannerID] = newScannerData
                }
            }
        })
    })

    await handleCancelAllOrderTP({ items: listOrderTP })

    await cancelAllListOrderOC(listOrderOC)

    if (botApiData) {

        if (!botActive) {
            allSymbol.forEach(async symbolItem => {
                const symbol = symbolItem.symbol
                resetMissData({ botID: botIDMain, symbol })
            })
            allStrategiesByBotIDAndStrategiesID[botIDMain] = {}
            allStrategiesByBotIDAndOrderID[botIDMain] = {}
            console.log(`[V] RESET All Symbol Bot: ${botApiData?.botName}`);
        }

        // HANDLE CHANGE API
        const newBotData = botData

        const oldApi = botApiData.ApiKey
        const newApi = newBotData.ApiKey

        const oldSecretKey = botApiData.SecretKey
        const newSecretKey = newBotData.SecretKey

        if ((oldApi != newApi) || (oldSecretKey != newSecretKey)) {
            console.log("[...] Handle api change");

            // Unsub old api
            botApiList[botIDMain].wsOrder?.unsubscribeV5(LIST_ORDER, 'spot')

            botApiList[botIDMain] = {
                ...botApiData,
                ApiKey: newApi,
                SecretKey: newSecretKey,
            }

            await handleSocketBotApiList(botApiList)
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

    const listOrderOC = {}
    const listOrderTP = []
    const botApiData = botApiList[botIDMain]

    delete botApiList[botIDMain];

    await Promise.allSettled(configData.map(async (strategiesData) => {

        const botData = strategiesData.botID
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const botID = botData._id
        const botName = botData.botName

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        const cancelDataObject = {
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            side,
            botName,
            botID
        }

        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
            strategyID,
            symbol,
            side,
            botName,
            botID,
            orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
            strategy: strategiesData,
            botData
        })
        allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            side,
            botName,
            botID,
            orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
            gongLai: true
        })
        delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
        delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]

    }))

    scannerData.forEach(scannerItem => {

        const scannerID = scannerItem._id

        allSymbol.forEach(symbol => {
            delete allScannerDataObject?.[symbol.symbol]?.[scannerID]
        })
    })
    await handleCancelAllOrderTP({ items: listOrderTP })

    await cancelAllListOrderOC(listOrderOC)

    botApiList[botIDMain].wsOrder?.unsubscribeV5(LIST_ORDER, 'spot')

    delete listOCByCandleBot?.[botIDMain]

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

socketRealtime.on('sync-symbol', async (data) => {

    const newData = data.new || []

    console.log("[...] Sync Symbol:", newData.length);

    allSymbol = allSymbol.concat(newData.map(item => item.value))

    let newListKline = {}

    await syncDigit()

    newData.forEach(symbolData => {
        const symbol = symbolData.value
        trichMauOCListObject[symbol] = {
            preTime: 0
        }
        symbolTradeTypeObject[symbol] = symbolData.market === "Spot" ? "Spot" : "Margin"

        trichMauData[symbol] = {
            open: 0,
            close: 0,
            high: 0,
            low: 0,
            turnover: 0
        }
        preTurnover[symbol] = 0
        trichMauDataArray[symbol] = []
        trichMau[symbol] = {
            cur: 0,
            pre: 0,
        }

        const klineText = `kline.D.${symbol}`
        listKline[symbol] = klineText
        newListKline[symbol] = klineText

    })

    await handleSocketListKline(Object.values(newListKline))

});


socketRealtime.on('close-upcode', async () => {

    console.log(`[...] Close All Bot For Upcode`);

    updatingAllMain = true

    const cancelOC = cancelAllListOrderOC(listOCByCandleBot)
    const deleteAll = deleteAllForUPcodeV1()

    await Promise.allSettled([cancelOC, deleteAll])

    console.log("[V] PM2 Kill Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 stop ${fileName}`)

});

socketRealtime.on('restart-code', async () => {

    console.log(`[...] Restarting Code`);

    updatingAllMain = true

    const cancelOC = cancelAllListOrderOC(listOCByCandleBot)
    const deleteAll = deleteAllForUPcode()

    await Promise.allSettled([cancelOC, deleteAll])

    console.log("[V] PM2 Reset All Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 restart ${fileName}`)

});

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});

