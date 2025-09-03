const Big = require('big.js');
const { exec } = require('child_process');
require('dotenv').config({
    path: "../../../.env"
});
const SERVER_IP = process.env.SERVER_IP

const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');

const { USDMClient, WebsocketClient, generateNewOrderId } = require('binance');
const {
    getAllStrategiesActive,
    getFutureBE,
    deleteAllForUPcode,
} = require('../../../controllers/Configs/Binance/V3/config');
const {
    createPositionBE,
    updatePositionBE,
    deletePositionBE,
    getPositionBySymbol
} = require('../../../controllers/Positions/Binance/position');

const { syncCoinBE, getAllCoinBE, syncVol24hBE } = require('../../../controllers/Coins/Binance/coinFutures');
const { getAllBotIDByServerIP } = require('../../../controllers/servers');
const { getClearVDataBE } = require('../../../controllers/Configs/Binance/V3/configVIP');
const CoinFutureModel = require('../../../models/Coins/Binance/coinFutures.model')

const wsSymbol = new WebsocketClient({
    beautify: true,
});
const wsSymbolDay = new WebsocketClient({
    beautify: true,
});


// CONST

var BTC_PUMP_TIME_RESET = 5
const LIST_ORDER = ["order", "position"]
const MAX_ORDER_LIMIT = 10
const LIMIT_GET_HISTORY_ONE = 500
const TRICH_MAU_LENGTH = 30
const TRICH_MAU_LOC_NHIEU_COLOR = 0.2


// ------------------

const clientPublic = new USDMClient({
    testnet: false,
    recvWindow: 10000,
});

// ----------------------------------------------------------------------------------

var BTCPumpStatus = false
var timeoutRestartServer = false
var messageTeleByBot = {}
var thongKeWinLoseByBot = {}
var clearVWinLose = {}
var minOCCandleSymbolBot = {}
var allbotOfServer = []
var allScannerDataObject = {}
let missTPDataBySymbol = {}

var blockContinueOrderOCByStrategiesID = {}
var allSymbol = {}
var updatingAllMain = false
var connectKlineError = false
var connectByBotError = {}


// -------  ------------

var allStrategiesByCandleAndSymbol = {}
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
var clearVData = {
    scanQty: 0,
    scanPercent: 0,
    botQty: 0,
    botPercent: 0
}

// ----------------------------------------------------------------------------------
const isEmptyObject = (obj = {}) => {
    return Object.keys(obj).length == 0
};

const findGocNen = (arr = []) => {

    let diffObjects = arr.map(obj => ({
        ...obj,
        diff: obj.end - obj.start
    }));

    diffObjects.sort((a, b) => a.diff - b.diff);
    let mid = Math.floor(diffObjects.length / 2);
    return diffObjects.length % 2 === 0 ? diffObjects[mid - 1] : diffObjects[mid]
}
const handleCalcOCBonusList = ({ OCBonus, Numbs, }) => {
    const step = OCBonus / 10
    const result = [];
    if (Numbs % 2 === 0) { // Nếu numbs là số chẵn
        for (let i = -(Numbs / 2); i < Numbs / 2; i++) {
            result.push(OCBonus + i * step);
        }
    } else { // Nếu numbs là số lẻ
        for (let i = -Math.floor((Numbs - 1) / 2); i <= Math.floor((Numbs - 1) / 2); i++) {
            result.push(OCBonus + i * step);
        }
    }
    return result;
};

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
        beautify: true,
        api_key: ApiKey,
        api_secret: SecretKey,
    })
}
const getRestClientV5Config = ({
    ApiKey,
    SecretKey,
    Demo
}) => {

    const client = new USDMClient({
        api_key: ApiKey,
        api_secret: SecretKey,
        beautifyResponses: true,
        recvWindow: 10000,
    })
    client.setTimeOffset(-3000)
    return client
}

const handleRestartServer = async () => {
    console.log(`[...] Restarting Code`);

    updatingAllMain = true

    const listOC = {}

    for (const botID in allStrategiesByBotIDAndStrategiesID) {
        for (const strategyID in allStrategiesByBotIDAndStrategiesID[botID]) {
            for (const bonusKey in allStrategiesByBotIDAndStrategiesID[botID][strategyID]) {
                const OCObj = allStrategiesByBotIDAndStrategiesID[botID][strategyID][bonusKey].OC

                if (!listOC[botID]) {
                    listOC[botID] = {
                        botData: OCObj.botData,
                        listOC: []
                    }
                }

                listOC[botID].listOC.push(OCObj)
            }
        }
    }

    const cancelOC = handleCancelAllOrderOC(Object.values(listOC))
    const deleteAll = deleteAllForUPcode()

    await Promise.allSettled([cancelOC, deleteAll])

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
        telegramID: process.env.CLEARV_BINANCE_TELE_ID,
        telegramToken: process.env.CLEARV_BOT_TOKEN,
    });
    !fromSocket && (clearVWinLose = {});
};

// ----------------------------------------------------------------------------------



const syncDigit = async () => {// proScale
    await clientPublic.getExchangeInfo()
        .then((response) => {
            response.symbols.forEach(item => {
                const filterArr = item.filters
                const symbol = item.symbol
                if (symbol.split("USDT")[1] === "") {
                    digitAllCoinObject[symbol] = {
                        priceTickSize: filterArr.find(item => item.filterType == "PRICE_FILTER")?.tickSize,
                        qtyStepSize: filterArr.find(item => item.filterType == "LOT_SIZE")?.stepSize,
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
    ApiKey,
    SecretKey,
    botData,
    botName,
    botID,
    coinOpen,
    orderMarketStatus = false,
    typeDanXenMau = false,
    giaDinh,
    coinCurrent,
    khoangOCBonusItem
}) => {

    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].botData = botData
    allStrategiesByBotIDAndStrategiesID[botID][strategyID][khoangOCBonusItem] = {
        OC: {},
        TP: {},
    }

    maxSubmitOrderOCData[botID] = maxSubmitOrderOCData[botID] || {
        totalOC: 0,
        logError: false,
        timeout: "",
    }

    const orderLinkId = generateNewOrderId("usdm")

    if (maxSubmitOrderOCData[botID].totalOC < MAX_ORDER_LIMIT) {

        maxSubmitOrderOCData[botID].totalOC += 1

        const OrderChangeOld = strategy.OrderChangeOld

        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            coinOpen,
            OrderChangeFilled: OrderChangeOld,
            OC: true,
            OCBonus: khoangOCBonusItem
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID][khoangOCBonusItem].OC = {
            ordering: true,
            orderLinkId,
            OCBonus: khoangOCBonusItem,
            OC: OrderChangeOld,
            strategy,
            strategyID,
            symbol,
            side,
            botName,
            botID,
            orderLinkId,
            OCBonus: khoangOCBonusItem,
            botData
        }

        const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

        const openTrade = Math.abs(price)
        const newOC = Math.abs((openTrade - coinOpen)) / coinOpen * 100

        const positionSide = side == "Sell" ? "SHORT" : "LONG"

        let orderMarketText = orderMarketStatus ? "MARKET" : "V"
        let orderDanXenMauText = typeDanXenMau ? "Blue-Red " : ""

        const scannerText = `<code>Label: ${strategy?.Label}</code>`
        const dataSend = {
            symbol,
            side: side?.toUpperCase(),
            type: !orderMarketStatus ? "LIMIT" : "MARKET",
            quantity: qty,
            newClientOrderId: orderLinkId,
            positionSide
        }
        if (!orderMarketStatus) {
            dataSend.timeInForce = 'GTC'
            dataSend.price = price
        }
        await client
            .submitNewOrder(dataSend)
            .then((response) => {
                if (response) {

                    const newOrderLinkID = response.clientOrderId

                    const giaDinhPre = giaDinh || strategy.OCBonusData?.giaDinh
                    const OC15s = (Math.abs(giaDinhPre - coinOpen) / coinOpen * 100).toFixed(3);

                    const text = `[${orderMarketText}] + OC ${orderDanXenMauText}( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) successful: ${price} - ${qty} \nOC+: ${khoangOCBonusItem}% | giaHienTai: ${coinCurrent}\ngiaGoc: ${coinOpen} -> giaDinh: ${giaDinhPre} = ${OC15s}%  `
                    console.log(`\n${text}`)
                    console.log(changeColorConsole.greenBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} ): ${newOrderLinkID}`));

                    setTimeout(() => {
                        if (
                            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[khoangOCBonusItem]?.OC?.orderLinkId &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[khoangOCBonusItem]?.OC?.orderFilled &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[khoangOCBonusItem]?.OC?.PartiallyFilledOC
                        ) {
                            handleCancelOC({
                                strategyID,
                                symbol,
                                side,
                                orderLinkId: newOrderLinkID,
                                ApiKey,
                                SecretKey,
                                botName,
                                botID,
                                strategy,
                                botData,
                                OCBonus: khoangOCBonusItem
                            })
                        }
                    }, strategy?.TimeOCBonusExpire * 1000 || 3000)

                    sendMessageWithRetryWait({
                        messageText: text,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                    })
                    // if limit
                    if (!orderMarketStatus) {
                        allStrategiesByCandleAndSymbol[symbol][strategyID].OCBonusData.totalOCOrder = allStrategiesByCandleAndSymbol[symbol][strategyID].OCBonusData.totalOCOrder || 0
                        allStrategiesByCandleAndSymbol[symbol][strategyID].OCBonusData.totalOCOrder += 1
                        allStrategiesByCandleAndSymbol[symbol][strategyID].OCBonusData.coinOpenOrderOC = coinOpen
                    }
                    else {
                        delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.OCBonusData
                    }
                }
                else {
                    console.log(changeColorConsole.yellowBright(`\n[${orderMarketText}] + OC ( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) failed: ${response.retMsg} | ${price} - ${qty}`,))
                    delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID][khoangOCBonusItem]

                }
            })
            .catch((error) => {
                console.log(changeColorConsole.redBright(`\n[${orderMarketText}] + OC ( ${OrderChangeOld}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) error ( ${price} - ${qty} ): \n${error?.message}`))
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID][khoangOCBonusItem]
            });

        if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[khoangOCBonusItem]?.OC) {
            allStrategiesByBotIDAndStrategiesID[botID][strategyID][khoangOCBonusItem].OC.ordering = false
        }

    }
    else {
        if (!maxSubmitOrderOCData[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
            maxSubmitOrderOCData[botID].logError = true
            if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[khoangOCBonusItem]?.OC) {
                allStrategiesByBotIDAndStrategiesID[botID][strategyID][khoangOCBonusItem].OC.ordering = false
            }
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

    const sideUpper = side.toUpperCase()
    const randomID = generateNewOrderId("usdm")

    const sideOC = sideUpper == "BUY" ? "Sell" : "Buy"

    client
        .submitNewOrder({
            symbol,
            side: sideUpper,
            type: 'MARKET',
            quantity: Quantity,
            newClientOrderId: `web_${randomID}`,
            positionSide: side == "Sell" ? "LONG" : "SHORT"
        })
        .then((response) => {

            if (response) {
                const text = `🍄 Clear Position | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${sideOC} \nBot: ${botName}`
                console.log(changeColorConsole.greenBright(text));
                sendMessageWithRetryWait({
                    messageText: text,
                    telegramID,
                    telegramToken
                })
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Auto Close Market ( ${botName} - ${symbol} - ${sideOC}) failed: ${Quantity} - ${response.retMsg}`));
            }
        })
        .catch((error) => {
            console.log(error);
            console.log(`[!] Auto Close Market ( ${botName} - ${symbol} - ${sideOC}) error: ${Quantity}`);
        });
}
const handleCloseMarketSL = async ({
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
    slprice,
    botID,
    strategyID,
    strategy,
    OCBonus,
    botSymbolMissID
}) => {

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });

    const sideUpper = side.toUpperCase()
    const randomID = generateNewOrderId("usdm")
    const sideOC = sideUpper == "BUY" ? "Sell" : "Buy"
    const PositionSide = side == "Sell" ? "LONG" : "SHORT"
    const Amount = Math.abs(strategy.Amount)
    const OrderChangeFilled = Math.abs((+strategy.OrderChangeOld).toFixed(3))
    const scannerText = `\n<code>Label: ${strategy?.Label} 🌈</code>`

    const closePrice = slprice;
    const scannerID = strategy._id
    const TP = strategy.TP


    const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.openTrade
    const newOC = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.OCFilled

    const priceOldOrder = (botAmountListObject[botID] * Amount / 100).toFixed(2)
    let priceWin = ((closePrice - openTradeOCFilled) * Quantity).toFixed(2) || 0;
    if (PositionSide == "SHORT") {
        priceWin = priceWin * -1
    }

    client
        .submitNewOrder({
            symbol,
            side: sideUpper,
            type: 'MARKET',
            quantity: Quantity,
            newClientOrderId: `web_${randomID}`,
            positionSide: PositionSide
        })
        .then((response) => {

            if (response) {
                // const text = `🍄 Clear Position | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${sideOC} \nBot: ${botName} ${slpriceText}`
                // console.log(changeColorConsole.greenBright(text));
                // sendMessageWithRetryWait({
                //     messageText: text,
                //     telegramID,
                //     telegramToken
                // })

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

                    thongKeWinLoseByBot[thongKeID].Lose++
                    clearVWinLose[thongKeID].Lose++
                    clearVWinLose[thongKeID].LoseMoney += priceWinABS

                }

                const textThongKeWinLose = `<i>${thongKeWinLoseByBot[thongKeID].Win} Win - ${thongKeWinLoseByBot[thongKeID].Lose} Lose</i>`

                const teleText = `<b>${textWinLoseShort} ${symbol.replace("USDT", "")}</b> | Close ${PositionSide} \n${textThongKeWinLose} ${scannerText} \nBot: ${botName} | OC+: ${OCBonus} \nOC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TP}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                console.log(`[V] Filled TP: \n${teleText}`)

                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]
                delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.OCBonusData

                if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                    delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                }

                clearVWinLose[thongKeID].text = `${scannerText} \nBot: ${botName}`

                missTPDataBySymbol[botSymbolMissID].size -= Math.abs(Quantity)

                sendMessageWithRetryWait({
                    messageText: `${teleText} \n${textWinLose}`,
                    telegramID,
                    telegramToken,
                })


            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Auto Close Market ( ${botName} - ${symbol} - ${sideOC}) failed: ${Quantity} - ${response.retMsg}`));
            }
        })
        .catch((error) => {
            console.log(error);
            console.log(`[!] Auto Close Market ( ${botName} - ${symbol} - ${sideOC}) error: ${Quantity}`);
        });
    clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeMarketAll)
    clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeWhenFilledSL)
}

const handleSubmitOrderTP = async ({
    strategy,
    OrderChangeFilled,
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
    botData,
    botSymbolMissID,
    OCFilled,
    openTradeOC,
    orderLinkIDOC,
    OCBonus
}) => {

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} ):`, price));


    const orderLinkId = generateNewOrderId("usdm")

    allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
        strategy,
        OrderChangeFilled,
        TP: true,
        OCFilled,
        openTradeOC,
        OCBonus
    }
    const OrderChangeOld = strategy.OrderChangeOld

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const positionSide = side == "Sell" ? "LONG" : "SHORT"
    const scannerText = `\n<code>Label: ${strategy?.Label} 🌈</code>`

    await client
        .submitNewOrder({
            symbol,
            side: side?.toUpperCase(),
            type: 'LIMIT',
            quantity: qty,
            price: price,
            timeInForce: 'GTC',
            newClientOrderId: orderLinkId,
            positionSide
        })
        .then((response) => {
            if (response) {
                const newOrderLinkID = response.clientOrderId

                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.orderLinkId = orderLinkId
                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.OCBonus = OCBonus

                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty),
                    priceOrderTP: price
                }

                console.log(`[V] + TP ( ${OrderChangeOld}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) successful:  ${price} - ${qty}`)
                console.log(changeColorConsole.greenBright(`[_TP orderID_] ( ${botName} - ${scannerText} - ${side} - ${symbol} ): ${newOrderLinkID}`));

                clearCheckMiss(botSymbolMissID)


            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] + TP ( ${OrderChangeOld}% - ${OCBonus} ) - ( ${botName} - ${scannerText} - ${side} - ${symbol} ) failed `, response.retMsg))
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.orderIDConfirm = true
            }
        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`[!] + TP ( ${OrderChangeOld}% - ${OCBonus} ) - ( ${botName} - ${scannerText} - ${side} - ${symbol} )  error ( ${price} - ${qty} ): \n${error?.message}`))
            delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
            console.log("ERROR Order TP:", error)
            allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.orderIDConfirm = true
        });
    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.ordering = false

}


const moveOrderTP = async ({
    symbol,
    strategyID,
    strategy,
    price,
    orderLinkId,
    side,
    ApiKey,
    SecretKey,
    botData,
    botName,
    botID,
    OCBonus
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} ):`, price));

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const OrderChangeOld = strategy.OrderChangeOld
    const scannerText = `\n<code>Label: ${strategy?.Label} 🌈</code>`

    await client
        .modifyOrder({
            symbol,
            price,
            side: side?.toUpperCase(),
            origClientOrderId: orderLinkId,
            quantity: allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.qty,
        })
        .then((response) => {
            if (response) {
                console.log(`[->] Move Order TP ( ${OrderChangeOld}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) successful: ${price}`)
                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.moveTime = Date.now()
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${OrderChangeOld}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) failed `, response.retMsg))
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${OrderChangeOld}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) error `, error?.message)
        });

}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
    coinOpen,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID,
    botData,
    newTPPrice,
    orderLinkId,
    symbol,
    OCBonus
}) => {

    const sideText = side === "Buy" ? "Sell" : "buy"

    if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.[OCBonus]?.TP?.orderLinkId) {

        const TPOld = allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.[OCBonus]?.TP?.price


        const ReTP = strategy.ReTP

        let TPNew
        if (newTPPrice) {
            TPNew = newTPPrice
        }
        else {

            if (strategy.PositionSide === "Long") {
                TPNew = TPOld - Math.abs(TPOld - coinOpen) * (ReTP / 100)
            }
            else {
                TPNew = TPOld + Math.abs(TPOld - coinOpen) * (ReTP / 100)
            }
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.price = TPNew

        const dataInput = {
            strategyID,
            symbol,
            price: roundPrice({
                price: TPNew,
                symbol
            }),
            orderLinkId,
            side: sideText,
            ApiKey,
            SecretKey,
            botName,
            botID,
            botData,
            strategy,
            OCBonus
        }
        await moveOrderTP(dataInput)
    }
}
const handleCancelAllOrderOC = async (items = []) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {
            const { botData, listOC } = item

            if (botData) {
                const { ApiKey, SecretKey, Demo } = botData

                const client = getRestClientV5Config({ ApiKey, SecretKey, Demo });

                const list = listOC || []

                if (list.length > 0) {
                    const listCancel = {}
                    const listSuccessOrderID = {}

                    console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);

                    // ---------
                    const groupedAndChunkedOrders = [];

                    const grouped = list.reduce((acc, cur) => {
                        const orderLinkId = cur.orderLinkId
                        const botID = cur.botID
                        const symbol = cur.symbol
                        const strategyID = cur.strategyID
                        const OCBonus = cur.OCBonus
                        const OC = cur.OC
                        const scannerText = `<code>Label: ${cur?.strategy?.Label}</code>`


                        if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.OC?.orderFilled &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.OC?.PartiallyFilledOC
                        ) {
                            acc[symbol] = acc[symbol] || [];
                            acc[symbol].push(orderLinkId);
                            listCancel[orderLinkId] = cur
                        }
                        else {
                            console.log(`[V] x OC ( ${OC}% - ${OCBonus} ) ( ${cur.botName} - ${scannerText} - ${cur.side} -  ${symbol}) has been filled `);
                        }
                        return acc;
                    }, {});

                    for (const symbol in grouped) {
                        const ids = grouped[symbol];
                        for (let i = 0; i < ids.length; i += 10) {
                            groupedAndChunkedOrders.push({
                                symbol,
                                origClientOrderIdList: ids.slice(i, i + 10)
                            });
                        }
                    }
                    // ---------

                    try {
                        await Promise.allSettled(groupedAndChunkedOrders.map(async data => {
                            const listSuccess = await client.cancelMultipleOrders(data)
                            listSuccess.forEach((item, index) => {
                                if (item?.status == "CANCELED") {
                                    listSuccessOrderID[item.clientOrderId] = true
                                }
                            })

                        }))
                        for (const orderLinkId in listCancel) {
                            const data = listCancel[orderLinkId]
                            const botIDTemp = data.botID
                            const strategyIDTemp = data.strategyID
                            const symbol = data.symbol
                            const botName = data.botName
                            const side = data.side
                            const OCBonus = data.OCBonus
                            const OC = data.OC
                            const scannerText = `<code>Label: ${data?.strategy?.Label}</code>`

                            if (listSuccessOrderID[orderLinkId]) {
                                console.log(`[V] x OC ( ${OC}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} -  ${symbol}) successful `);

                                delete allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]?.[OCBonus]

                                if (allStrategiesByCandleAndSymbol[symbol]?.[strategyIDTemp]?.IsDeleted) {
                                    {
                                        delete allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]

                                        delete allStrategiesByCandleAndSymbol[symbol]?.[strategyIDTemp]
                                    }
                                }
                            }
                            else {
                                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${OC} - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol}) failed`));
                            }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }))
        console.log("[V] Cancel All OC Successful");
    }
}


const handleCancelOC = async ({
    symbol,
    side,
    orderLinkId,
    ApiKey,
    SecretKey,
    botName,
    strategy,
    botID,
    strategyID,
    botData,
    autoReset = true,
    OCBonus
}) => {

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const OrderChangeOld = strategy.OrderChangeOld
    const scannerText = `<code>Label: ${strategy?.Label}</code>`

    orderLinkId && await client
        .cancelOrder({
            symbol,
            origClientOrderId: orderLinkId
        })
        .then((response) => {
            if (response) {
                console.log(`[V] x OC ( ${OrderChangeOld}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) successful `);

                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] x OC ( ${OrderChangeOld}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) failed `, response.retMsg))
            }

        })
        .catch((error) => {
            console.log(`[!] x OC ( ${OrderChangeOld}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) error `, error)
        });
}

const handleCancelOrderTP = async ({
    strategyID,
    symbol,
    side,
    orderLinkId,
    ApiKey,
    SecretKey,
    gongLai = false,
    botName,
    botID,
    botData,
    strategy
}) => {

    const botSymbolMissID = `${botID}-${symbol}-${side}`

    const client = getRestClientV5Config({ ApiKey, SecretKey, Demo: botData.Demo });
    const scannerText = `<code>Label: ${strategy?.Label}</code>`

    orderLinkId && await client
        .cancelOrder({
            symbol,
            origClientOrderId: orderLinkId,
        })
        .then((response) => {
            if (response) {
                console.log(`[V] Cancel TP ( ${botName} - ${scannerText} - ${side} - ${symbol} ) successful `);

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
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${scannerText} - ${side} - ${symbol} ) failed `, response.retMsg))
            }

        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${botName} - ${scannerText} - ${side} - ${symbol} ) error `, error)
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
                handleCancelOrderTP(item)
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
        botID,
    }
) => {
    if (botID && strategyID) {
        const data = allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]

        allStrategiesByBotIDAndOrderID[botID] = allStrategiesByBotIDAndOrderID[botID] || {};
        allStrategiesByBotIDAndStrategiesID[botID] = allStrategiesByBotIDAndStrategiesID[botID] || {};

        allStrategiesByBotIDAndStrategiesID[botID][strategyID] = {}


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
const sendMessageWithRetry = async ({
    messageText,
    retries = 5,
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
            const params = new URLSearchParams({
                token: telegramToken,
                chat_id: telegramID,
                text: messageText,
                SECRET_KEY: process.env.TELE_BYPASS_SECRET_KEY
            });

            try {
                if (messageText) {
                    // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                    await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageText, {
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



const handleSocketBotApiList = async (botApiListInput = {}) => {

    try {
        const objectToArray = Object.values(botApiListInput);
        const objectToArrayLength = objectToArray.length;

        console.log(changeColorConsole.greenBright("[New-Bot-API] Length:", objectToArrayLength));

        if (objectToArrayLength > 0) {

            await getMoneyFuture(botApiListInput)

            await Promise.allSettled(objectToArray.map(botApiData => {

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id
                const botName = botApiList[botID]?.botName

                const wsOrder = getWebsocketClientConfig({ ApiKey, SecretKey, Demo: botApiData.Demo });

                wsOrder.subscribeUsdFuturesUserDataStream(false, true).then(() => {

                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    botApiList[botID].wsOrder = wsOrder

                    wsOrder.on('message', async (dataCoin) => {

                        const botData = botApiList[botID]

                        const ApiKey = botData?.ApiKey
                        const SecretKey = botData?.SecretKey
                        const IsActive = botData?.IsActive
                        const botName = botData?.botName

                        const telegramID = botData?.telegramID
                        const telegramToken = botData?.telegramToken

                        const topicMain = dataCoin.e

                        if (IsActive && ApiKey && SecretKey) {

                            if (topicMain == "ORDER_TRADE_UPDATE") {
                                const dataMain = dataCoin.o

                                const dataMainSide = dataMain.S
                                const symbol = dataMain.s

                                const orderID = dataMain.c
                                const orderType = dataMain.o
                                const orderStatus = dataMain.X
                                const qty = +dataMain.q


                                try {

                                    const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                    const strategy = strategyData?.strategy
                                    const OCTrue = strategyData?.OC
                                    const TPTrue = strategyData?.TP
                                    const OCBonus = strategyData?.OCBonus

                                    if (strategy) {

                                        const strategyID = `${strategy._id}-${symbol}`
                                        const OrderChangeFilled = Math.abs((+strategyData?.OrderChangeFilled || 0).toFixed(3))
                                        const PositionSide = strategy.PositionSide
                                        const sideOC = PositionSide == "Long" ? "Buy" : "Sell"
                                        const Amount = strategy.Amount
                                        const TP = strategy.TP
                                        const priceOldOrder = (botAmountListObject[botID] * Amount / 100).toFixed(2)

                                        const scannerID = strategy._id

                                        const scannerText = `\n<code>Label: ${strategy?.Label} 🌈</code>`

                                        if (orderStatus == "FILLED" || orderStatus == "PARTIALLY_FILLED") {

                                            if (OCTrue) {

                                                const botSymbolMissID = `${botID}-${symbol}-${sideOC}`

                                                const coinOpenOC = strategyData.coinOpen
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.orderFilled = true

                                                // Send telegram
                                                const openTrade = +dataMain.ap;  //Gia khop lenh

                                                let slTriggerPx = 0
                                                const SL = 3
                                                if (PositionSide == "Long") {
                                                    slTriggerPx = openTrade - SL * openTrade / 100
                                                }
                                                else {
                                                    slTriggerPx = SL * openTrade / 100 + openTrade
                                                }
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.SLPrice = slTriggerPx


                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.openTrade = openTrade

                                                const newOC = (Math.abs((openTrade - coinOpenOC)) / coinOpenOC * 100).toFixed(2)

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.OCFilled = newOC
                                                // Create TP

                                                let TPNew = 0
                                                let TPNewTemp = 0
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.price05 = Math.abs((openTrade - coinOpenOC)) * (0.5 / 100)

                                                const EntryTrailing = strategy.EntryTrailing || 40

                                                if (PositionSide === "Long") {
                                                    TPNew = openTrade + Math.abs((openTrade - coinOpenOC)) * (60 / 100)
                                                    TPNewTemp = openTrade + Math.abs((openTrade - coinOpenOC)) * (TP / 100)
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.priceCompare = openTrade + Math.abs((openTrade - coinOpenOC)) * (EntryTrailing / 100)
                                                }
                                                else {
                                                    TPNew = openTrade - Math.abs((openTrade - coinOpenOC)) * (60 / 100)
                                                    TPNewTemp = openTrade - Math.abs((openTrade - coinOpenOC)) * (TP / 100)
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.priceCompare = openTrade - Math.abs((openTrade - coinOpenOC)) * (EntryTrailing / 100)
                                                }


                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.side = PositionSide === "Long" ? "Sell" : "Buy"

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.price = TPNew
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.priceTemp = TPNewTemp

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.qty = qty

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
                                                    ApiKey,
                                                    SecretKey,
                                                    botName,
                                                    botID,
                                                    botData,
                                                    botSymbolMissID,
                                                    OCFilled: newOC,
                                                    openTradeOC: openTrade,
                                                    orderLinkIDOC: orderID,
                                                    OCBonus
                                                }


                                                if (orderStatus === "FILLED") {
                                                    // clearTimeout(allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc)
                                                    // allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""

                                                    if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.TP?.ordering) {

                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.ordering = true
                                                        clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.OC?.PartiallyFilledOCTimeout)

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

                                                        let teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${PositionSide} ${scannerText} \nBot: ${botName} | OC+: ${OCBonus} \nOC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TP}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                                        console.log(`\n[V] Filled OC: \n${teleText}\n`)
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
                                                    console.log(changeColorConsole.blueBright(`[V] Part_Filled OC ( ${OrderChangeFilled}% ) ( ${botName} - ${dataMainSide} - ${symbol} ): ${orderID} - ${qty}`));
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.PartiallyFilledOC = true

                                                    const orderTPWhenPartOC = 5000
                                                    if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.OC?.PartiallyFilledOCTimeout) {

                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.PartiallyFilledOCTimeout = setTimeout(async () => {

                                                            if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.TP?.ordering) {
                                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.ordering = true

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
                                                                    orderLinkId: orderID,
                                                                    ApiKey,
                                                                    SecretKey,
                                                                    botName,
                                                                    botID,
                                                                    strategy,
                                                                    botData,
                                                                    autoReset: false
                                                                })
                                                                console.log(changeColorConsole.blueBright(`[V] Set TP After ${orderTPWhenPartOC} Part_Filled OC ( ${OrderChangeFilled}% ) ( ${botName} - ${dataMainSide} - ${symbol} ): ${qty}`));


                                                                let teleText = `<b>${symbol.replace("USDT", "")}</b> | Part_Filled ${PositionSide} ${scannerText} \nBot: ${botName}| OC+: ${OCBonus} \nOC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TP}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

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
                                                    //         const teleText = `<b>${symbol.replace("USDT", "")}</b> | Part_Filled ${PositionSide} ${scannerText} \nBot: ${botName} \nFT: ${Candlestick} | OC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TP}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                                    //         console.log(`\n\n[V] Part_Filled OC: \n${teleText}\n`)

                                                    //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true

                                                    //         allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""
                                                    //         dataInput.qty = allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled?.toString()

                                                    //         handleCancelOC({
                                                    //             strategyID,
                                                    //             symbol,
                                                    //             side: sideOC,
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

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.PartiallyFilledOC = false

                                                const side = PositionSide === "Long" ? "Buy" : "Sell"
                                                const botSymbolMissID = `${botID}-${symbol}-${side}`

                                                clearCheckMiss(botSymbolMissID)

                                                if (orderStatus === "FILLED") {

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.orderFilled = true

                                                    const closePrice = +dataMain.ap;

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

                                                        thongKeWinLoseByBot[thongKeID].Lose++
                                                        clearVWinLose[thongKeID].Lose++
                                                        clearVWinLose[thongKeID].LoseMoney += priceWinABS

                                                    }

                                                    const textThongKeWinLose = `<i>${thongKeWinLoseByBot[thongKeID].Win} Win - ${thongKeWinLoseByBot[thongKeID].Lose} Lose</i>`

                                                    const teleText = `<b>${textWinLoseShort} ${symbol.replace("USDT", "")}</b> | Close ${PositionSide} \n${textThongKeWinLose} ${scannerText} \nBot: ${botName} | OC+: ${OCBonus} \nOC: ${OrderChangeFilled}% -> ${newOC}% | TP: ${TP}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                                    console.log(`[V] Filled TP: \n${teleText}`)

                                                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]
                                                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.OCBonusData

                                                    if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                                                        delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
                                                        delete [botID]?.[strategyID]
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
                                                        console.log(`\n[_FULL Filled_] Filled TP ( ${botName} - ${scannerText} - ${side} - ${symbol} )\n`);

                                                        if (missTPDataBySymbol?.[botSymbolMissID]?.orderIDToDB) {
                                                            deletePositionBE({
                                                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                            }).then(message => {
                                                                console.log(`[...] Delete Position ( ${botName} - ${scannerText} - ${side} - ${symbol} )`);
                                                                console.log(message);
                                                            }).catch(err => {
                                                                console.log("ERROR deletePositionBE:", err)
                                                            })
                                                        }

                                                        setTimeout(() => {
                                                            clearCheckMiss(botSymbolMissID)
                                                            resetMissData(botSymbolMissID)
                                                        }, 2000)
                                                    }
                                                    else {
                                                        console.log(`[_Part Filled_] Filled TP ( ${OrderChangeFilled}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} )\n`);
                                                    }
                                                }
                                                else {
                                                    console.log(changeColorConsole.blueBright(`[...] Part_Filled TP ( ${OrderChangeFilled}% ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ): : ${qty}`));
                                                }

                                            }
                                        }

                                        else if (orderStatus == "CANCELED" || orderStatus == "EXPIRED") {
                                            // console.log("[X] Cancelled");
                                            // Khớp TP
                                            if (TPTrue) {
                                                const botSymbolMissID = `${botID}-${symbol}-${PositionSide == "Long" ? "Buy" : "Sell"}`

                                                console.log(`[-] Cancelled TP ( ${OrderChangeFilled}% - ${OCBonus} ) ( ${botName} - ${PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} ) - Chốt lời `);

                                                if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]) {
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP = {}
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.orderIDConfirm = true
                                                }


                                            }
                                            else if (OCTrue) {
                                                // maxSubmitOrderOCData[botID][symbol].totalOC -= 1

                                                console.log(`[-] Cancelled OC ( ${OrderChangeFilled}% - ${OCBonus} ) ( ${botName} - ${PositionSide === "Long" ? "Buy" : "Sell"} - ${symbol} ) `);
                                                delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]

                                            }

                                        }
                                    }

                                    // User cancel vị thế ( Limit )
                                    if (orderID?.startsWith("web") && (orderStatus === "NEW" || orderStatus === "FILLED") && orderType !== "MARKET") {

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
                                    if (orderType === "MARKET") {
                                        console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} )`);


                                    }

                                    if (orderStatus === "FILLED") {
                                        console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMainSide} - ${symbol} ): ${orderID} - ${qty}`,));

                                        if (orderID?.startsWith("web")) {

                                            setTimeout(() => {
                                                const listObject = allStrategiesByBotIDAndStrategiesID?.[botID]

                                                listObject && Object.entries(listObject).map(([strategyID, OCBonusData]) => {
                                                    if (strategyID?.includes(symbol)) {

                                                        Object.entries(OCBonusData).forEach(([OCBonus, data]) => {
                                                            const strategyData = data?.OC
                                                            const strategyDataSide = strategyData?.side
                                                            const strategyDataOC = strategyData?.OC
                                                            const sideConfig = strategyDataSide == "Buy" ? "SELL" : "BUY"
                                                            const scannerText = `<code>Label: ${strategyData?.strategy?.Label}</code>`

                                                            if (sideConfig == dataMainSide && allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.[OCBonus]?.TP?.orderIDConfirm) {
                                                                {
                                                                    const botSymbolMissID = `${botID}-${symbol}-${strategyDataSide}`
                                                                    console.log(`[V] RESET-Filled ( ${strategyDataOC}$ - ${OCBonus} ) | ${symbol.replace("USDT", "")} - ${strategyDataSide} - Bot: ${strategyData?.botName} - ${scannerText}`);

                                                                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]
                                                                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.OCBonusData

                                                                    if (allStrategiesByCandleAndSymbol[symbol][strategyID]?.IsDeleted) {
                                                                        delete allStrategiesByCandleAndSymbol?.[symbol][strategyID]
                                                                        delete allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]
                                                                    }

                                                                    clearCheckMiss(botSymbolMissID)
                                                                    missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                                                    // resetMissData(botSymbolMissID)
                                                                }
                                                            }
                                                        })
                                                    }
                                                })
                                            }, 2000)
                                        }
                                    }
                                } catch (error) {
                                    console.log(`[!] Handle Error Filled Order: ${error.message}`);
                                }

                            }
                            // else if (topicMain == "ACCOUNT_UPDATE") {
                            //     const dataMain = dataCoin?.a?.P?.[0]

                            //     if (dataMain) {

                            //         const sideSocket = dataMain.ps
                            //         const dataMainSide = sideSocket == "LONG" ? "Buy" : "Sell"
                            //         const symbol = dataMain.s

                            //         const size = Math.abs(dataMain.pa)
                            //         const botSymbolMissID = `${botID}-${symbol}-${dataMainSide}`

                            //         !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                            //         missTPDataBySymbol[botSymbolMissID].sizeTotal = size
                            //         const unrealisedPnl = dataMain.up
                            //         missTPDataBySymbol[botSymbolMissID].unrealisedPnl = unrealisedPnl

                            //         if (size > 0) {


                            //             clearCheckMiss(botSymbolMissID)

                            //             missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {


                            //                 const side = dataMainSide
                            //                 const openTrade = +dataMain.ep;  //Gia khop lenh

                            //                 const unrealisedPnl = dataMain.up

                            //                 missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                            //                 const Quantity = side === "Buy" ? size : (size * -1)

                            //                 if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                            //                     const newDataToDB = {
                            //                         Symbol: symbol,
                            //                         Side: side,
                            //                         Quantity,
                            //                         Price: openTrade,
                            //                         Pnl: unrealisedPnl,
                            //                     }

                            //                     console.log(`\n[Saving->Mongo] Position When Check Miss ( ${botName} - ${side} - ${symbol} )`);

                            //                     createPositionBE({
                            //                         ...newDataToDB,
                            //                         botID,
                            //                     }).then(async data => {
                            //                         console.log(data.message);

                            //                         const newID = data.id

                            //                         !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                            //                         if (newID) {
                            //                             missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                            //                         }
                            //                         else {
                            //                             getPositionBySymbol({ symbol, botID }).then(data => {
                            //                                 console.log(data.message);
                            //                                 missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                            //                             }).catch(error => {
                            //                                 console.log("ERROR getPositionBySymbol:", error)
                            //                             })
                            //                         }

                            //                     }).catch(err => {
                            //                         console.log("ERROR createPositionBE:", err)
                            //                     })
                            //                 }

                            //                 if (!missTPDataBySymbol[botSymbolMissID]?.gongLai) {

                            //                     const sizeOfMiss = +missTPDataBySymbol[botSymbolMissID].size
                            //                     if (sizeOfMiss >= 0 && size > sizeOfMiss && size - sizeOfMiss >= 1) {

                            //                         const missSize = size - sizeOfMiss

                            //                         const teleText = `⚠️ MISS | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                            //                         console.log(changeColorConsole.redBright(`${teleText}\nMissSize: ${size} | ${sizeOfMiss}`));

                            //                         // const TPNew = missTPDataBySymbol[botSymbolMissID].priceOrderTP
                            //                         let TPNew = openTrade

                            //                         if (side === "Buy") {
                            //                             TPNew = openTrade + (openTrade * 3 / 100) * (50 / 100)
                            //                         }
                            //                         else {
                            //                             TPNew = openTrade - (openTrade * 3 / 100) * (50 / 100)
                            //                         }

                            //                         missTPDataBySymbol[botSymbolMissID].prePrice = TPNew
                            //                         missTPDataBySymbol[botSymbolMissID].side = side

                            //                         // const dataInput = {
                            //                         //     symbol,
                            //                         //     qty: missSize.toString(),
                            //                         //     price: roundPrice({
                            //                         //         price: TPNew,
                            //                         //         symbol
                            //                         //     }),
                            //                         //     side: side === "Buy" ? "Sell" : "Buy",
                            //                         //     ApiKey,
                            //                         //     SecretKey,
                            //                         //     missState: true,
                            //                         //     botName,
                            //                         //     botID,
                            //                         // }

                            //                         // console.log("[ Re-TP ] Order TP Miss");

                            //                         // handleSubmitOrderTP(dataInput)

                            //                         sendMessageWithRetryWait({
                            //                             messageText: teleText,
                            //                             telegramID,
                            //                             telegramToken
                            //                         })

                            //                         updatePositionBE({
                            //                             newDataUpdate: {
                            //                                 Miss: true
                            //                             },
                            //                             orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                            //                         }).then(message => {
                            //                             console.log(message);
                            //                         }).catch(err => {
                            //                             console.log("ERROR updatePositionBE:", err)
                            //                         })

                            //                         // handle close vithe miss

                            //                         missTPDataBySymbol[botSymbolMissID].timeOutFuncCloseMiss = setTimeout(() => {

                            //                             handleCloseMarketMiss({
                            //                                 Quantity: missSize,
                            //                                 unrealisedPnl,
                            //                                 ApiKey,
                            //                                 SecretKey,
                            //                                 symbol,
                            //                                 side: side === "Sell" ? "Buy" : "Sell",
                            //                                 botName,
                            //                                 botData,
                            //                                 telegramID,
                            //                                 telegramToken,

                            //                             });

                            //                         }, 10 * 1000)

                            //                     }
                            //                     else {

                            //                         console.log(`[ NOT-MISS ] | ${symbol.replace("USDT", "")} - ${side} - Bot: ${botName}`);
                            //                         updatePositionBE({
                            //                             newDataUpdate: {
                            //                                 Miss: false,
                            //                                 TimeUpdated: Date.now()
                            //                             },
                            //                             orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                            //                         }).then(message => {
                            //                             console.log(message);
                            //                         }).catch(err => {
                            //                             console.log("ERROR updatePositionBE:", err)
                            //                         })

                            //                         clearCheckMiss(botSymbolMissID)

                            //                     }
                            //                 }
                            //                 else {
                            //                     const teleText = `⚠️ Gong-Lai | ${unrealisedPnl}$ \n<b>${symbol.replace("USDT", "")}</b> | ${side} \nBot: ${botName}`
                            //                     console.log(changeColorConsole.redBright(teleText));
                            //                     // console.log("[...] Đang lọc OC MISS\n");

                            //                     sendMessageWithRetryWait({
                            //                         messageText: teleText,
                            //                         telegramID,
                            //                         telegramToken
                            //                     })
                            //                     // updatePositionBE({
                            //                     //     newDataUpdate: {
                            //                     //         Miss: true,
                            //                     //         TimeUpdated: Date.now()
                            //                     //     },
                            //                     //     orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                            //                     // }).then(message => {
                            //                     //     console.log(message);
                            //                     // }).catch(err => {
                            //                     //     console.log("ERROR updatePositionBE:", err)
                            //                     // })
                            //                 }

                            //             }, 8000)

                            //         }
                            //         else {
                            //             clearCheckMiss(botSymbolMissID)

                            //         }
                            //     }
                            //     else {
                            //         console.log("ACCOUNT_UPDATE", dataCoin);
                            //     }
                            // }

                        }

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

const handleSocketListKline = async (allSymbol = []) => {

    try {
        await Promise.allSettled(allSymbol.map((symbol) => {
            Promise.allSettled(["1m", "3m", "5m", "15m"].map((interval) => {
                wsSymbol.subscribeKlines(symbol, interval, "usdm")
            }))
        }))
        console.log("[V] Subscribe kline successful\n");
    } catch (err) {
        console.log("[!] Subscribe kline error:", err)
    }

}
const handleSocketListKlineDay = async (allSymbol = []) => {

    try {
        await Promise.allSettled(allSymbol.map((symbol) => {
            Promise.allSettled(["1d"].map((interval) => {
                wsSymbolDay.subscribeKlines(symbol, interval, "usdm")
            }))
        }))
        console.log("[V] Subscribe klineDay successful\n");
    } catch (err) {
        console.log("[!] Subscribe klineDay error:", err)
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

    await Promise.allSettled(newData.map(async scannerData => {

        if (checkConditionBot(scannerData)) {

            delete scannerData.TimeTemp

            const botData = scannerData.botID

            const botID = botData._id
            const botName = botData.botName

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Demo = botData.Demo

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: true,
                    Demo
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: true,
                    Demo

                }

            }

            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            Object.values(allSymbol).forEach(symbolData => {
                const symbol = symbolData.value
                const strategyID = `${scannerData._id}-${symbol}`
                if (IsActive && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                    const newScannerData = { ...scannerData }

                    allStrategiesByCandleAndSymbol[symbol] = allStrategiesByCandleAndSymbol[symbol] || {}
                    allStrategiesByCandleAndSymbol[symbol][strategyID] = newScannerData;

                    !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
                    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

                }
                else {
                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                }

            })

        }

    }))

    await handleSocketBotApiList(newBotApiList)
}

const handleSocketUpdate = async (newData = []) => {

    console.log("[...] Update Config From Realtime", newData?.length);

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []

    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const IsActive = scannerData.IsActive
            const side = scannerData.PositionSide === "Long" ? "Buy" : "Sell"

            const botData = scannerData.botID
            const botID = botData?._id
            const botName = botData.botName
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Demo = botData.Demo
            const telegramID = botData.telegramID
            const telegramToken = botData.telegramToken

            if (!botApiList[botID] && IsActive) {
                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    Demo,
                    telegramID,
                    telegramToken,
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
                    IsActive: true
                }
            }

            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            Object.values(allSymbol).forEach(symbolData => {
                const symbol = symbolData.value
                const strategyID = `${scannerData._id}-${symbol}`


                const dataOCConfigList = Object.values(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] || {})


                listOrderOC[botID] = listOrderOC[botID] || { botData, listOC: [] }
                listOrderOC[botID].listOC = listOrderOC[botID].listOC.concat(dataOCConfigList.map(item => item.OC))


                if (!IsActive) {
                    listOrderTP.concat(dataOCConfigList.map(item => (
                        {
                            ...item.TP,
                            ApiKey,
                            SecretKey,
                            strategyID,
                            symbol,
                            side,
                            botName,
                            botData,
                            botID,
                            gongLai: true,
                            strategy: scannerData,
                        }
                    )))
                }

                if (IsActive && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                    const newScannerData = { ...scannerData }

                    allStrategiesByCandleAndSymbol[symbol] = allStrategiesByCandleAndSymbol[symbol] || {}
                    allStrategiesByCandleAndSymbol[symbol][strategyID] = newScannerData;

                    !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
                    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

                }
                else {
                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                }
            })
        }
    })

    const cancelAllOC = handleCancelAllOrderOC(Object.values(listOrderOC))

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    await handleSocketBotApiList(newBotApiList)
}

const handleSocketDelete = async (newData = [], IsDeleted = true) => {

    console.log("[...] Delete Config From Realtime", newData.length);

    const listOrderOC = {}
    const listOrderTP = []


    newData.forEach(scannerData => {

        const IsActive = scannerData.IsActive
        const side = scannerData.PositionSide === "Long" ? "Buy" : "Sell"

        const botData = scannerData.botID
        const botID = botData?._id
        const botName = botData.botName
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey
        const Demo = botData.Demo
        const telegramID = botData.telegramID
        const telegramToken = botData.telegramToken

        Object.values(allSymbol).forEach(symbolData => {
            const symbol = symbolData.value
            const strategyID = `${scannerData._id}-${symbol}`


            const dataOCConfigList = Object.values(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] || {})

            listOrderOC[botID] = listOrderOC[botID] || { botData, listOC: [] }
            listOrderOC[botID].listOC = listOrderOC[botID].listOC.concat(dataOCConfigList.map(item => item.OC))


            listOrderTP.concat(dataOCConfigList.map(item => (
                {
                    ...item.TP,
                    ApiKey,
                    SecretKey,
                    strategyID,
                    symbol,
                    side,
                    botName,
                    botData,
                    botID,
                    gongLai: true,
                    strategy: scannerData,
                }
            )))


            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]

        })
    })
    const cancelAllOC = handleCancelAllOrderOC(Object.values(listOrderOC))

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

}


const handleSocketSyncCoin = async (data = []) => {

    const newData = data.new || []

    console.log("[...] Sync New Symbol:", newData);

    const allSymbolTemp = []

    newData.forEach(item => {
        const symbol = item.value;
        allSymbolTemp.push(symbol)
        trichMauOCListObject[symbol] = {
            maxPrice: 0,
            minPrice: [],
            prePrice: 0,
            curPrice: 0,
            coinColor: [],
            curTime: 0,
            preTime: 0,

        }
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +item.volume24h
        }

    });

    handleSocketListKlineDay(allSymbolTemp)
    syncDigit()
    // newData?.length > 0 && await handleStatistic(newData)
}


var allHistoryByCandleSymbol = {}

const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
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
    const TimeStop = OpenTime - 60 * 1000 * interval * limitNen * (index - 1)

    const symbolCandle = `${symbol}-${interval}`

    await clientPublic.getKlines({
        symbol,
        interval: `${interval}m`,
        startTime: TimeStart,
        endTime: TimeStop,
        limit: limitNen,
    })
        .then((listAllData) => {
            const listOC = [];
            const listOCLong = [];
            const listOCLongShort = [];

            listAllData.reverse()

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
    const batchSize = 25

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
                await delay(2000);
            }
        }))

        await delay(2000);
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



const syncVol24AndAutoUpdateGroupCoin = async () => {

    console.log("[...] Starting Sync All Coin");

    const resData = await syncCoinBE(allbotOfServer)

    const listSymbolUpdate = resData?.newListSorted || []
    const allScannerCondition = resData?.allScannerCondition || []

    listSymbolUpdate.forEach(symbolData => {
        const symbol = symbolData.symbol
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +symbolData.volume24h
        }
    })

    allScannerCondition?.length > 0 && await handleSocketUpdate(allScannerCondition)
    console.log("[V] Handle Sync All Coin Successful");
}


// ----------------------------------------------------------------------------------


function getHourRange(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const start = Math.floor(hour / 2) * 2;
    const end = start + 2;
    return `${start}-${end}`;
}


function detectSequenceByColor({
    candles = [],
    requiredColor = 'red',
}) {
    if (!candles.length) return null;

    // Nếu cây đầu không có màu xác định → bỏ qua
    if (candles[0]?.OC == 0) return null;

    let streak = [];

    for (let i = 0; i < candles.length; i++) {
        const { OC } = candles[i];

        const checkcolor = requiredColor == 'red' ? OC <= TRICH_MAU_LOC_NHIEU_COLOR : OC >= -TRICH_MAU_LOC_NHIEU_COLOR

        if (checkcolor) {
            streak.push(candles[i]);
        } else {
            break; // Đổi màu → dừng
        }
    }

    if (streak.length >= 2) {
        return streak
    }

    return null;
}

const getKhoangOCBonus = (OC15s) =>
    OC15s < 3 ? 0.5 :
        OC15s < 5 ? 1 :
            OC15s < 9 ? 2 :
                OC15s < 13 ? 2.5 :
                    OC15s < 18 ? 3 : 3.5;

const Main = async () => {

    allbotOfServer = await getAllBotIDByServerIP(SERVER_IP)

    await deleteAllForUPcode(allbotOfServer)

    const allSymbolArray = await getAllCoinBE()

    const allStrategiesActiveBE = getAllStrategiesActive(allbotOfServer)
    const getClearVDataBEData = getClearVDataBE()

    const result = await Promise.allSettled([allStrategiesActiveBE, getClearVDataBEData])

    const allStrategiesActiveObject = result[0].value || []
    clearVData = result[1].value || {}


    allSymbolArray.forEach(item => {
        const symbol = item.symbol
        trichMauOCListObject[symbol] = {
            maxPrice: 0,
            minPrice: [],
            prePrice: 0,
            curPrice: 0,
            coinColor: [],
            curTime: 0,
            preTime: 0,

        }
        allSymbol[symbol] = {
            value: symbol,
            volume24h: +item.volume24h
        }

        allStrategiesActiveObject.forEach(scannerData => {
            const strategyID = `${scannerData._id}-${symbol}`

            const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
            const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

            const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
            const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

            if (checkConditionBot(scannerData) && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                const botID = scannerData.botID._id
                const botName = scannerData.botID.botName

                botApiList[botID] = {
                    ...botApiList[botID],
                    id: botID,
                    botName,
                    ApiKey: scannerData.botID.ApiKey,
                    SecretKey: scannerData.botID.SecretKey,
                    Demo: scannerData.botID.Demo,
                    telegramID: scannerData.botID.telegramID,
                    telegramToken: scannerData.botID.telegramToken,
                    IsActive: true
                };

                const newScannerData = { ...scannerData }

                allStrategiesByCandleAndSymbol[symbol] = allStrategiesByCandleAndSymbol[symbol] || {}
                allStrategiesByCandleAndSymbol[symbol][strategyID] = newScannerData;

                cancelAll({ strategyID, botID })

            }
        })
    });



    const allSymbolTemp = []
    allSymbolArray.forEach(item => {
        const symbol = item.symbol
        allSymbolTemp.push(symbol)

    });

    await syncVol24AndAutoUpdateGroupCoin()
    await syncDigit()

    await handleSocketListKlineDay(allSymbolTemp)
    await handleSocketBotApiList(botApiList)


    cron.schedule('*/2 * * * *', () => {
        getMoneyFuture(botApiList)
    });

    cron.schedule('*/20 * * * *', () => {
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


    wsSymbolDay.on('message', async (dataCoin) => {

        if (timeoutRestartServer) {
            updatingAllMain = true
            timeoutRestartServer = false
            handleRestartServer()
        }

        const symbol = dataCoin.s
        const dataMain = dataCoin.k
        const coinCurrent = +dataMain.c
        const coinOpen = +dataMain.o
        const Highest = +dataMain.h
        const Lowest = +dataMain.l
        const dataConfirm = dataMain.x

        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]

        !updatingAllMain && listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {

            const botID = strategy.botID._id

            if (checkConditionBot(strategy) && botApiList[botID]?.IsActive && botAmountListObject[botID]) {
                try {
                    // if (checkConditionBot(strategy) && botApiList[botID]?.IsActive) {

                    strategy.Amount = Math.abs(strategy.Amount)
                    strategy.OrderChange = Math.abs((+strategy.OrderChange).toFixed(3))
                    strategy.TP = Math.abs(strategy.TP)
                    strategy.ReTP = Math.abs(strategy.ReTP)
                    strategy.OrderChangeOld = Math.abs(strategy.OrderChangeOld || strategy.OrderChange)
                    strategy.OCBonusData = strategy.OCBonusData || {}

                    // console.log("strategy.OrderChange", strategy.OrderChange, symbol, candle);
                    // console.log("strategy.EntryTrailing", strategy.EntryTrailing);

                    const strategyID = `${strategy._id}-${symbol}`

                    const Numbs = Math.abs(strategy.Numbs || 1)
                    const Amount = strategy.Amount
                    const Label = strategy.Label
                    const OrderChange = strategy.OrderChange
                    const OrderChangeOld = strategy.OrderChangeOld
                    const OCBonus = strategy.OCBonus
                    const PositionSide = strategy.PositionSide

                    const botData = botApiList[botID]
                    const botName = botData.botName
                    const ApiKey = botData.ApiKey
                    const SecretKey = botData.SecretKey
                    const telegramID = botData.telegramID
                    const telegramToken = botData.telegramToken

                    const side = PositionSide === "Long" ? "Buy" : "Sell"

                    if (dataConfirm == false) {

                        if (strategy.IsActive && !strategy.IsDeleted) {

                            const dataInput = {
                                strategy,
                                strategyID,
                                ApiKey,
                                SecretKey,
                                botData,
                                symbol,

                                side,

                                botName,
                                botID,
                                telegramID,
                                telegramToken,
                                coinOpen
                            }
                            // Order OC
                            if (
                                isEmptyObject(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID])
                            ) {
                                strategy.OCBonusData.khoangOCBonus = strategy.OCBonusData.khoangOCBonus || OCBonus

                                if (!strategy?.OCBonusData?.totalOCOrder) {

                                    const trichMauColorTop = trichMauOCListObject[symbol].coinColor.slice(0, TRICH_MAU_LENGTH)

                                    if (trichMauColorTop?.length >= TRICH_MAU_LENGTH / 2) {

                                        let checkOrderOC = false

                                        let candleTPData = trichMauOCListObject[symbol].coinColor[0]
                                        let candleTP = candleTPData?.OC
                                        const candleTPAbs = Math.abs(candleTP)

                                        let checkHoiTP = false

                                        let requiredColor = ""
                                        if (side == "Buy") {
                                            requiredColor = "red"
                                        }
                                        else {
                                            requiredColor = "green"
                                        }
                                        checkHoiTP = requiredColor == 'red' ? candleTP >= TRICH_MAU_LOC_NHIEU_COLOR : candleTP <= -TRICH_MAU_LOC_NHIEU_COLOR

                                        if (checkHoiTP) {

                                            const listCheck = trichMauColorTop.slice(1)
                                            const dataList = detectSequenceByColor({
                                                candles: listCheck,
                                                requiredColor,
                                            })

                                            if (dataList) {

                                                const coinCurrentStart = dataList[0]?.coinCurrent; // cây đầu
                                                const prePriceEnd = dataList[dataList.length - 1]?.prePrice; // cây cuối
                                                const OC15s = Math.abs(coinCurrentStart - prePriceEnd) / prePriceEnd * 100;
                                                const checkSide = side == "Buy" ? coinCurrent < prePriceEnd : coinCurrent > prePriceEnd

                                                if (checkSide && OC15s >= OrderChange) {
                                                    // Check pham vi hoi TP
                                                    if (candleTPAbs >= OC15s * 5 / 100 && candleTPAbs <= OC15s * 35 / 100) {

                                                        // Order 35% OC +
                                                        const candleTPCoinClose = candleTPData.coinCurrent

                                                        // let khoangOCBonus = candleTPAbs * 35 / 100
                                                        // khoangOCBonus = khoangOCBonus > OCBonus ? khoangOCBonus : OCBonus

                                                        const khoangOCBonus = Math.max(getKhoangOCBonus(OC15s), OCBonus)

                                                        strategy.OCBonusData.khoangOCBonus = khoangOCBonus
                                                        strategy.OCBonusData.OC15s = OC15s
                                                        strategy.OCBonusData.giaDinh = coinCurrentStart
                                                        strategy.OCBonusData.checkTP = true


                                                        if (candleTPAbs >= OC15s * 20 / 100 && candleTPAbs <= OC15s * 35 / 100) {
                                                            strategy.OCBonusData.timeCheckMarket = Date.now()
                                                        }
                                                        checkOrderOC = true;

                                                        const khoangOCBonusList = handleCalcOCBonusList({
                                                            Numbs,
                                                            OCBonus: khoangOCBonus,
                                                        })

                                                        strategy.OCBonusData.khoangOCBonusList = khoangOCBonusList

                                                        await Promise.allSettled(khoangOCBonusList.map(khoangOCBonusItem => {


                                                            let newOCBonusPrice

                                                            if (side == "Buy") {
                                                                newOCBonusPrice = candleTPCoinClose - candleTPCoinClose * khoangOCBonusItem / 100
                                                            }
                                                            else {
                                                                newOCBonusPrice = candleTPCoinClose + candleTPCoinClose * khoangOCBonusItem / 100
                                                            }
                                                            // console.log("OC15s", OC15s, symbol, candleTPData, Label);

                                                            const newQty = botAmountListObject[botID] * Amount / Numbs / 100 / +newOCBonusPrice

                                                            handleSubmitOrder({
                                                                ...dataInput,
                                                                price: roundPrice({
                                                                    price: newOCBonusPrice,
                                                                    symbol
                                                                }),
                                                                qty: roundQty({
                                                                    price: newQty,
                                                                    symbol
                                                                }),
                                                                coinOpen: prePriceEnd,
                                                                orderMarketStatus: false,
                                                                giaDinh: coinCurrentStart,
                                                                coinCurrent,
                                                                khoangOCBonusItem
                                                            });
                                                        }))
                                                    }
                                                }
                                            }

                                            // if (!checkOrderOC) {
                                            //     // Check market
                                            //     const trichMauColorTop3 = trichMauOCListObject[symbol].coinColor.slice(1, 1 + 3)
                                            //     let allOCSameSide = true;

                                            //     const ONE_PUMP_VALUE = 12;

                                            //     let checkOnePump = false;
                                            //     let totalOCMarket = 0;

                                            //     for (const item of trichMauColorTop3) {
                                            //         const oc = item?.OC;

                                            //         if (side === "Buy") {
                                            //             if (oc <= -TRICH_MAU_LOC_NHIEU_COLOR) {
                                            //                 totalOCMarket += oc
                                            //                 if (oc <= -ONE_PUMP_VALUE) {
                                            //                     checkOnePump = true
                                            //                 }
                                            //             }
                                            //             else {
                                            //                 allOCSameSide = false;
                                            //                 break;
                                            //             }
                                            //         } else {
                                            //             if (oc >= TRICH_MAU_LOC_NHIEU_COLOR) {
                                            //                 totalOCMarket += oc
                                            //                 if (oc >= ONE_PUMP_VALUE) {
                                            //                     checkOnePump = true
                                            //                 }
                                            //             }
                                            //             else {
                                            //                 allOCSameSide = false;
                                            //                 break;
                                            //             }
                                            //         }
                                            //     }

                                            //     const totalOCMarketAbs = Math.abs(totalOCMarket)
                                            //     if (allOCSameSide &&
                                            //         checkOnePump &&
                                            //         trichMauColorTop3.some(item => Math.abs(item.OC) >= totalOCMarketAbs * 75 / 100) &&
                                            //         candleTPAbs >= totalOCMarketAbs * 5 / 100 && candleTPAbs <= totalOCMarketAbs * 15 / 100
                                            //     ) {
                                            //         // order market
                                            //         const prePriceEnd = trichMauColorTop3[trichMauColorTop3.length - 1]?.prePrice; // cây cuối

                                            //         const newQty = botAmountListObject[botID] * Amount / 100 / coinCurrent

                                            //         handleSubmitOrder({
                                            //             ...dataInput,
                                            //             coinOpen: prePriceEnd,
                                            //             orderMarketStatus: true,
                                            //             giaDinh: trichMauColorTop3[0]?.coinCurrent,
                                            //             coinCurrent,
                                            //             qty: roundQty({
                                            //                 price: newQty,
                                            //                 symbol
                                            //             }),
                                            //         });
                                            //     }
                                            // }
                                        }

                                        if (!checkOrderOC) {
                                            // TH 15s
                                            const lenGet = 15
                                            const trichMauColorTop15 = trichMauOCListObject[symbol].coinColor.slice(0, lenGet)

                                            const coinCurrentStart = trichMauColorTop15[0]?.coinCurrent; // cây đầu
                                            const prePriceEnd = trichMauColorTop15[trichMauColorTop15.length - 1]?.prePrice; // cây cuối
                                            const OC15s = Math.abs(coinCurrentStart - prePriceEnd) / prePriceEnd * 100;
                                            const checkSide = side == "Buy" ? coinCurrent < prePriceEnd : coinCurrent > prePriceEnd

                                            if (checkSide && OC15s >= 6) {
                                                let blueCandle = 0
                                                let redCandle = 0
                                                if (side == "Buy") {
                                                    blueCandle = trichMauColorTop15.filter(item => item.OC > 0)?.length
                                                    redCandle = trichMauColorTop15.filter(item => item.OC <= 0)?.length
                                                }
                                                else {
                                                    blueCandle = trichMauColorTop15.filter(item => item.OC >= 0)?.length
                                                    redCandle = trichMauColorTop15.filter(item => item.OC < 0)?.length

                                                }
                                                const blueCandlePercent = blueCandle / lenGet * 100
                                                if ((blueCandle + redCandle == lenGet) && blueCandlePercent >= 35 && blueCandlePercent <= 65) {
                                                    console.log(changeColorConsole.blueBright(`TH 15s: blueCandle: ${blueCandlePercent} - ${symbol} - ${side}`, Label));

                                                    const khoangOCBonus = Math.max(getKhoangOCBonus(OC15s), OCBonus)

                                                    strategy.OCBonusData.khoangOCBonus = khoangOCBonus
                                                    strategy.OCBonusData.OC15s = OC15s
                                                    strategy.OCBonusData.giaDinh = coinCurrentStart

                                                    const khoangOCBonusList = handleCalcOCBonusList({
                                                        Numbs,
                                                        OCBonus: khoangOCBonus,
                                                    })
                                                    checkOrderOC = true;
                                                    strategy.OCBonusData.khoangOCBonusList = khoangOCBonusList


                                                    await Promise.allSettled(khoangOCBonusList.map(khoangOCBonusItem => {


                                                        let newOCBonusPrice
                                                        if (side == "Buy") {
                                                            newOCBonusPrice = coinCurrent - coinCurrent * khoangOCBonusItem / 100
                                                        }
                                                        else {
                                                            newOCBonusPrice = coinCurrent + coinCurrent * khoangOCBonusItem / 100
                                                        }
                                                        const newQty = botAmountListObject[botID] * Amount / Numbs / 100 / +newOCBonusPrice


                                                        handleSubmitOrder({
                                                            ...dataInput,
                                                            price: roundPrice({
                                                                price: newOCBonusPrice,
                                                                symbol
                                                            }),
                                                            qty: roundQty({
                                                                price: newQty,
                                                                symbol
                                                            }),
                                                            coinOpen: prePriceEnd,
                                                            orderMarketStatus: false,
                                                            giaDinh: coinCurrentStart,
                                                            typeDanXenMau: true,
                                                            coinCurrent,
                                                            khoangOCBonusItem
                                                        });
                                                    }))

                                                }
                                                else {
                                                    console.log(changeColorConsole.yellowBright(`TH 15s FAILED: ( blueCandle: ${blueCandle} | redCandle: ${redCandle} ) - ${symbol} - ${side}`, Label));
                                                }
                                            }


                                        }

                                    }

                                }
                                else {
                                    // Order continue
                                    let checkOrderOC = false
                                    const khoangOCBonus = strategy?.OCBonusData?.khoangOCBonus

                                    if (strategy?.OCBonusData?.totalOCOrder < 3 && khoangOCBonus) {

                                        const coinOpenOCOld = strategy?.OCBonusData?.coinOpenOrderOC
                                        const giaDinhOld = strategy?.OCBonusData?.giaDinh
                                        const checkTPOld = strategy?.OCBonusData?.checkTP
                                        const OC15sCurrentPercent = Math.abs(coinCurrent - coinOpenOCOld) / coinOpenOCOld * 100;
                                        const OC15sOld = strategy?.OCBonusData?.OC15s
                                        let checkTPHoi = false

                                        dataInput.coinOpen = coinOpenOCOld
                                        const checkSide = side == "Buy" ? coinCurrent < coinOpenOCOld : coinCurrent > coinOpenOCOld

                                        if (checkSide) {
                                            if (checkTPOld) {

                                                let checkTPHoiFirst = false
                                                if (side == "Buy") {
                                                    checkTPHoiFirst = coinCurrent > giaDinhOld
                                                }
                                                else {
                                                    checkTPHoiFirst = coinCurrent < giaDinhOld
                                                }
                                                if (checkTPHoiFirst) {
                                                    const TPHoiCurrentPercent = Math.abs(coinCurrent - giaDinhOld) / giaDinhOld * 100;
                                                    checkTPHoi = TPHoiCurrentPercent >= OC15sOld * 10 / 100 && TPHoiCurrentPercent <= OC15sOld * 30 / 100
                                                }
                                            }
                                            else {
                                                checkTPHoi = true
                                            }

                                            if (OC15sCurrentPercent >= OrderChange && checkTPHoi) {

                                                checkOrderOC = true
                                                const khoangOCBonusList = handleCalcOCBonusList({
                                                    Numbs,
                                                    OCBonus: khoangOCBonus,
                                                })

                                                await Promise.allSettled(khoangOCBonusList.map(khoangOCBonusItem => {

                                                    let newOCBonusPrice

                                                    if (side == "Buy") {
                                                        newOCBonusPrice = coinCurrent - coinCurrent * khoangOCBonusItem / 100
                                                    }
                                                    else {
                                                        newOCBonusPrice = coinCurrent + coinCurrent * khoangOCBonusItem / 100
                                                    }
                                                    const newQty = botAmountListObject[botID] * Amount / Numbs / 100 / +newOCBonusPrice

                                                    handleSubmitOrder({
                                                        ...dataInput,
                                                        price: roundPrice({
                                                            price: newOCBonusPrice,
                                                            symbol
                                                        }),
                                                        qty: roundQty({
                                                            price: newQty,
                                                            symbol
                                                        }),
                                                        coinCurrent,
                                                        khoangOCBonusItem
                                                    });
                                                }))
                                            }

                                        }
                                    }
                                    if (!checkOrderOC) {
                                        delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.OCBonusData
                                    }
                                }
                            }

                            // // Check market 5%
                            // if (
                            //     !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering &&
                            //     !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
                            //     strategy?.OCBonusData?.timeCheckMarket
                            // ) {
                            //     if (Date.now() - strategy?.OCBonusData?.timeCheckMarket <= 9 * 1000) {
                            //         const khoangOCBonus = strategy?.OCBonusData?.khoangOCBonus

                            //         const coinOpenOCOld = strategy?.OCBonusData?.coinOpenOrderOC
                            //         const giaDinhOld = strategy?.OCBonusData?.giaDinh
                            //         const OC15sCurrentPercent = Math.abs(coinCurrent - coinOpenOCOld) / coinOpenOCOld * 100;
                            //         const OC15sOld = strategy?.OCBonusData?.OC15s
                            //         let checkTPHoi = false

                            //         dataInput.coinOpen = coinOpenOCOld
                            //         const checkSide = side == "Buy" ? coinCurrent < coinOpenOCOld : coinCurrent > coinOpenOCOld

                            //         if (checkSide) {

                            //             let checkTPHoiFirst = false
                            //             if (side == "Buy") {
                            //                 checkTPHoiFirst = coinCurrent > giaDinhOld
                            //             }
                            //             else {
                            //                 checkTPHoiFirst = coinCurrent < giaDinhOld
                            //             }
                            //             if (checkTPHoiFirst) {
                            //                 const TPHoiCurrentPercent = Math.abs(coinCurrent - giaDinhOld) / giaDinhOld * 100;
                            //                 checkTPHoi = TPHoiCurrentPercent < OC15sOld * 5 / 100
                            //             }


                            //             if (OC15sCurrentPercent >= OrderChange && checkTPHoi) {
                            //                 let newOCBonusPrice
                            //                 checkOrderOC = true

                            //                 if (side == "Buy") {
                            //                     newOCBonusPrice = coinCurrent - coinCurrent * khoangOCBonus / 100
                            //                 }
                            //                 else {
                            //                     newOCBonusPrice = coinCurrent + coinCurrent * khoangOCBonus / 100
                            //                 }
                            //                 const newQty = botAmountListObject[botID] * Amount / 100 / newOCBonusPrice

                            //                 const orderIDOld = allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
                            //                 console.log("[V] Market 5%", symbol, side, Label);

                            //                 if (orderIDOld) {
                            //                     await handleCancelOC({
                            //                         strategyID,
                            //                         symbol,
                            //                         side,
                            //                         orderLinkId: orderIDOld,
                            //                         ApiKey,
                            //                         SecretKey,
                            //                         botName,
                            //                         botID,
                            //                         strategy,
                            //                         botData,
                            //                     })
                            //                 }

                            //                 handleSubmitOrder({
                            //                     ...dataInput,
                            //                     price: roundPrice({
                            //                         price: newOCBonusPrice,
                            //                         symbol
                            //                     }),
                            //                     qty: roundQty({
                            //                         price: newQty,
                            //                         symbol
                            //                     }),
                            //                     coinCurrent,
                            //                     orderMarketStatus: true
                            //                 });
                            //             }

                            //         }
                            //     }
                            // }


                            // Handle sl oc bonus
                            strategy?.OCBonusData?.khoangOCBonusList?.forEach(OCBonus => {
                                if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.orderFilled) {
                                    const botSymbolMissID = `${botID}-${symbol}-${side}`
                                    let SLPrice = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.SLPrice
                                    const TPpriceTemp = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.TP?.priceTemp
                                    const price05 = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.TP?.price05

                                    // const QuantityTotal = missTPDataBySymbol[botSymbolMissID]?.sizeTotal || missTPDataBySymbol[botSymbolMissID]?.size
                                    const QuantityTotal = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.TP?.qty
                                    // check pnl
                                    let filledSL = false
                                    let khoangTPTemp = false
                                    const closeAlltime = 10

                                    if (side == "Buy") {
                                        if (coinCurrent >= TPpriceTemp) {
                                            khoangTPTemp = true
                                        }
                                    }
                                    else {
                                        if (coinCurrent <= TPpriceTemp) {
                                            khoangTPTemp = true
                                        }
                                    }
                                    const scannerText = `\n<code>Label: ${strategy?.Label} 🌈</code>`

                                    // Move sl
                                    const SL = 1.5
                                    let newSLPrice = 0
                                    if (PositionSide === "Long") {
                                        if (!khoangTPTemp) {
                                            newSLPrice = (coinCurrent - coinCurrent * SL / 100)
                                        }
                                        else {
                                            newSLPrice = coinCurrent - price05
                                        }
                                        if (newSLPrice > SLPrice) {
                                            console.log(changeColorConsole.cyanBright(`[V] Change SL ${khoangTPTemp ? "Near " : ""}( ${OrderChange}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ): ${newSLPrice}`));
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.SLPrice = newSLPrice
                                        }
                                    }
                                    else {
                                        if (!khoangTPTemp) {
                                            newSLPrice = (coinCurrent + coinCurrent * SL / 100)
                                        }
                                        else {
                                            newSLPrice = coinCurrent + price05
                                        }
                                        if (newSLPrice < SLPrice) {
                                            console.log(changeColorConsole.cyanBright(`[V] Change SL ${khoangTPTemp ? "Near " : ""}( ${OrderChange}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ): ${newSLPrice}`));
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.SLPrice = newSLPrice
                                        }
                                    }

                                    SLPrice = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.SLPrice

                                    if (side == "Buy") {
                                        // Check SL
                                        if (coinCurrent <= SLPrice) {
                                            filledSL = true
                                        }

                                    }
                                    else {
                                        if (coinCurrent >= SLPrice) {
                                            filledSL = true
                                        }
                                    }

                                    // filledSL
                                    if (filledSL) {
                                        if (!allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeWhenFilledSL) {
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.closeWhenFilledSL = setTimeout(() => {
                                                if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.orderFilled) {
                                                    console.log(changeColorConsole.blueBright(`\n[V] Filled SL ( ${OrderChange}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ): ${coinCurrent} `));

                                                    clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeMarketAll)

                                                    handleCloseMarketSL({
                                                        botSymbolMissID,
                                                        OCBonus,
                                                        strategy,
                                                        Quantity: QuantityTotal,
                                                        unrealisedPnl: missTPDataBySymbol[botSymbolMissID].unrealisedPnl,
                                                        ApiKey,
                                                        SecretKey,
                                                        botData,
                                                        symbol,
                                                        side: PositionSide === "Long" ? "Sell" : "Buy",
                                                        botName,
                                                        telegramID,
                                                        telegramToken,
                                                        slprice: coinCurrent,
                                                        botID,
                                                        strategyID
                                                    })
                                                }
                                            }, 1000)
                                        }
                                    }
                                    else {
                                        clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeWhenFilledSL)
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.closeWhenFilledSL = ""
                                    }

                                    // Close 5s
                                    if (!allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeMarketAll) {
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].OC.closeMarketAll = setTimeout(() => {
                                            if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.orderFilled) {
                                                console.log(changeColorConsole.blueBright(`\n[V] Close After ${closeAlltime}s ( ${OrderChange}% - ${OCBonus} ) ( ${botName} - ${scannerText} - ${side} - ${symbol} ) `));

                                                clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.OC?.closeWhenFilledSL)
                                                handleCloseMarketSL({
                                                    OCBonus,
                                                    botSymbolMissID,
                                                    strategy,
                                                    Quantity: QuantityTotal,
                                                    unrealisedPnl: missTPDataBySymbol[botSymbolMissID].unrealisedPnl,
                                                    ApiKey,
                                                    SecretKey,
                                                    botData,
                                                    botID,
                                                    symbol,
                                                    side: PositionSide === "Long" ? "Sell" : "Buy",
                                                    botName,
                                                    telegramID,
                                                    telegramToken,
                                                    strategyID,
                                                    slprice: coinCurrent,
                                                })
                                            }
                                        }, closeAlltime * 1000)
                                    }

                                    // move TP
                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.moveTime = allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.moveTime || Date.now()
                                    if (Date.now() - allStrategiesByBotIDAndStrategiesID[botID][strategyID][OCBonus].TP.moveTime >= 1000) {
                                        handleMoveOrderTP({
                                            symbol,
                                            ApiKey,
                                            SecretKey,
                                            strategyID,
                                            strategy,
                                            side,
                                            coinOpen: coinCurrent,
                                            botName,
                                            botData,
                                            botID,
                                            orderLinkId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.[OCBonus]?.TP?.orderLinkId,
                                            OCBonus
                                        });
                                    }
                                }
                            })
                        }




                    }

                    // Coin CLosed
                    else if (dataConfirm == true) {

                    }


                } catch (error) {
                    console.log(changeColorConsole.redBright("Error When Handle Order"));
                    console.log(error);
                }
            }
        }))


        // Coin CLosed
        if (dataConfirm == true) {

        }

    })

    // Trich-mau
    wsSymbolDay.on('message', async (dataCoin) => {

        const symbol = dataCoin.s
        const dataMain = dataCoin.k
        const coinCurrent = +dataMain.c
        const timestampsocket = +dataCoin.E;

        trichMauOCListObject[symbol].curPrice = coinCurrent

        if (dataMain.x == false) {

            trichMauOCListObject[symbol].preTime = trichMauOCListObject[symbol].preTime || timestampsocket

            if (timestampsocket - trichMauOCListObject[symbol].preTime >= 1000) {

                const prePrice = trichMauOCListObject[symbol].prePrice || coinCurrent
                const OC = (coinCurrent - prePrice) / prePrice * 100

                trichMauOCListObject[symbol].coinColor.unshift({
                    OC,
                    prePrice,
                    coinCurrent,
                    timestampsocket: new Date(timestampsocket).toLocaleTimeString()
                })

                trichMauOCListObject[symbol].preTime = timestampsocket
                trichMauOCListObject[symbol].prePrice = coinCurrent

                if (trichMauOCListObject[symbol].coinColor?.length > TRICH_MAU_LENGTH) {
                    trichMauOCListObject[symbol].coinColor.pop()
                }

            }
        }
    })

    // ----------------------------------------------------------------

    wsSymbolDay.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbolDay.closeWs(wsSymbolDay)
    });

    wsSymbolDay.on('reconnected', async () => {
        if (connectKlineError) {
            const text = "🔰 Hệ thống khôi phục kết nối thành công"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[V] Reconnected kline successful')
            connectKlineError = false
            timeoutRestartServer = true
        }
    });

    wsSymbolDay.on('error', (err) => {
        if (!connectKlineError) {
            const text = "🚫 [ Cảnh báo ] Hệ thống đang bị gián đoạn kết nối"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[!] Connection kline error');
            console.log(err);
            connectKlineError = true
            wsSymbolDay.closeAll(true)
        }
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
    socketRealtime.emit('joinRoom', 'Binance_V3');
});

socketRealtime.on('add', async (newData = []) => {
    await handleSocketAddNew(newData)

});

socketRealtime.on('update', async (newData = []) => {

    await handleSocketUpdate(newData)

});

socketRealtime.on('delete', async (newData) => {

    await handleSocketDelete(newData)

});


socketRealtime.on('bot-update', async (data = {}) => {

    const { botIDMain, botActive, botData, newData } = data;

    const botApiData = botApiList[botIDMain]

    if (botApiData) {
        botApiList[botIDMain].IsActive = botActive
    }

    const configData = newData.configData
    // const scannerData = newData.scannerData
    const botNameExist = botApiData?.botName || botIDMain
    console.log(`[...] Bot-Update ( ${botNameExist} ) Config From Realtime: \nConfig: ${configData.length}`,);
    // console.log(`[...] Bot-Update ( ${botNameExist} ) Config From Realtime`,);

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []


    configData.forEach(scannerData => {

        const IsActive = scannerData.IsActive
        const side = scannerData.PositionSide === "Long" ? "Buy" : "Sell"

        const botData = scannerData.botID
        const botID = botData?._id
        const botName = botData.botName
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey
        const Demo = botData.Demo
        const telegramID = botData.telegramID
        const telegramToken = botData.telegramToken

        if (!botApiList[botID] && botActive) {
            botApiList[botID] = {
                ...botApiList[botID],
                id: botID,
                botName,
                ApiKey,
                SecretKey,
                Demo,
                telegramID,
                telegramToken,
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
                IsActive: true
            }
        }

        const groupCoinOnlyPairsData = scannerData?.groupCoinOnlyPairsID
        const groupCoinBlacklistData = scannerData?.groupCoinBlacklistID

        const setOnlyPairs = new Set(groupCoinOnlyPairsData ? (groupCoinOnlyPairsData?.symbolList || []) : scannerData.OnlyPairs)
        const setBlacklist = new Set(groupCoinBlacklistData ? (groupCoinBlacklistData?.symbolList || []) : scannerData.Blacklist)

        Object.values(allSymbol).forEach(symbolData => {
            const symbol = symbolData.value
            const strategyID = `${scannerData._id}-${symbol}`

            const dataOCConfigList = Object.values(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] || {})

            listOrderOC[botID] = listOrderOC[botID] || { botData, listOC: [] }
            listOrderOC[botID].listOC = listOrderOC[botID].listOC.concat(dataOCConfigList.map(item => item.OC))


            if (!botActive) {
                listOrderTP.concat(dataOCConfigList.map(item => (
                    {
                        ...item.TP,
                        ApiKey,
                        SecretKey,
                        strategyID,
                        symbol,
                        side,
                        botName,
                        botData,
                        botID,
                        gongLai: true,
                        strategy: scannerData,
                    }
                )))
            }

            if (botActive && IsActive && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {

                const newScannerData = { ...scannerData }

                allStrategiesByCandleAndSymbol[symbol] = allStrategiesByCandleAndSymbol[symbol] || {}
                allStrategiesByCandleAndSymbol[symbol][strategyID] = newScannerData;

                !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
                !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

            }
            else {
                delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
            }

        })
    })

    const cancelAllOC = handleCancelAllOrderOC(Object.values(listOrderOC))


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
            Object.values(allSymbol).map(async symbolItem => {
                const symbol = symbolItem.value
                const botSymbolMissID = `${botIDMain}-${symbol}-Buy`
                const botSymbolMissID2 = `${botIDMain}-${symbol}-Sell`
                resetMissData(botSymbolMissID)
                resetMissData(botSymbolMissID2)
            })

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

    console.log(`[...] Bot-Deleted ( ${botNameExist} ) Config From Realtime: \nConfig: ${configData.length}`,);

    const listOrderOC = {}
    const listOrderTP = []


    configData.forEach(scannerData => {

        const IsActive = scannerData.IsActive
        const side = scannerData.PositionSide === "Long" ? "Buy" : "Sell"

        const botData = scannerData.botID
        const botID = botData?._id
        const botName = botData.botName
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey
        const Demo = botData.Demo
        const telegramID = botData.telegramID
        const telegramToken = botData.telegramToken

        Object.values(allSymbol).forEach(symbolData => {
            const symbol = symbolData.value
            const strategyID = `${scannerData._id}-${symbol}`

            const dataOCConfigList = Object.values(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] || {})

            listOrderOC[botID] = listOrderOC[botID] || { botData, listOC: [] }
            listOrderOC[botID].listOC = listOrderOC[botID].listOC.concat(dataOCConfigList.map(item => item.OC))


            listOrderTP.concat(dataOCConfigList.map(item => (
                {
                    ...item.TP,
                    ApiKey,
                    SecretKey,
                    strategyID,
                    symbol,
                    side,
                    botName,
                    botData,
                    botID,
                    gongLai: true,
                    strategy: scannerData,
                }
            )))


            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]

        })
    })
    const cancelAllOC = handleCancelAllOrderOC(Object.values(listOrderOC))


    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])


    botApiList[botIDMain].wsOrder?.unsubscribeV5(LIST_ORDER, 'linear');

    delete allStrategiesByBotIDAndStrategiesID?.[botIDMain]
    delete botApiList[botIDMain];

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


socketRealtime.on('close-upcode', async () => {

    console.log(`[...] Closing All Bot For Upcode`);

    updatingAllMain = true

    const listOC = {}

    for (const botID in allStrategiesByBotIDAndStrategiesID) {
        for (const strategyID in allStrategiesByBotIDAndStrategiesID[botID]) {
            for (const bonusKey in allStrategiesByBotIDAndStrategiesID[botID][strategyID]) {
                const OCObj = allStrategiesByBotIDAndStrategiesID[botID][strategyID][bonusKey].OC

                if (!listOC[botID]) {
                    listOC[botID] = {
                        botData: OCObj.botData,
                        listOC: []
                    }
                }

                listOC[botID].listOC.push(OCObj)
            }
        }
    }

    const cancelOC = handleCancelAllOrderOC(Object.values(listOC))
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
