const { default: axios } = require('axios');
const Big = require('big.js');
const crypto = require('crypto');
// const { v4: uuidv4 } = require('uuid');
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
    getAllStrategiesActiveSpotBE,
    createStrategiesMultipleSpotBE,
    offConfigSpotBE,
    increaseOCSpotBE,
    increaseAmountSpotBE
} = require('../../../controllers/Configs/OKX/V1/spot');

const {
    getAllStrategiesActiveMarginBE,
    createStrategiesMultipleMarginBE,
    offConfigMarginBE,
    increaseOCMarginBE,
    increaseAmountMarginBE
} = require('../../../controllers/Configs/OKX/V1/margin');

const {
    getAllStrategiesActiveFuturesBE,
    createStrategiesMultipleFuturesBE,
    offConfigFuturesBE,
    increaseOCFuturesBE,
    increaseAmountFuturesBE
} = require('../../../controllers/Configs/OKX/V1/futures');


const {
    getAllStrategiesActiveScannerBE,
    deleteAllScannerV1BE,
    addSymbolToBlacklistBE
} = require('../../../controllers/Configs/OKX/V1/scanner');


const { getAllBotIDByServerIP } = require('../../../controllers/servers');
const { getAllCoinBE } = require('../../../controllers/Coins/OKX/coin');
const { setLeverSymbolBotBE, setLeverSymbolBotFuturesBE } = require('../../../controllers/bot');
const { getClearVDataBE } = require('../../../controllers/Configs/OKX/V1/scannerV');
const { getAllCoinFuturesBE } = require('../../../controllers/Coins/OKX/coinFutures');

const { RestClient, WebsocketClient } = require('okx-api');

const wsSymbol = new WebsocketClient({
    market: "business",
});
const wsSymbol2 = new WebsocketClient({
    market: "business",
});
// const wsPublic = new WebsocketClient({
//     market: "prod",
// });

const clientPublic = new RestClient();

const LIST_ORDER = [
    {
        "channel": "orders",
        "instType": "SPOT",
    },
    {
        "channel": "orders",
        "instType": "MARGIN",
    },
    {
        "channel": "orders",
        "instType": "SWAP",
    },
    {
        "channel": "positions",
        "instType": "MARGIN",
    },
    // {
    //     "channel": "positions",
    //     "instType": "SWAP",
    // },
    // {
    //     "channel": "balance_and_position",
    // },
]
var TIME_MARKET_TP = 3000
const TP_TIME_AMEND_DELAY = 1000
const MAX_ORDER_LIMIT = 20
const MAX_AMEND_LIMIT = 200
const TP_ADAPTIVE = 80
const TP_NOT_ADAPTIVE = 50
const Sl_TRIGGER_PERCENT = 1
const LOSE_PERCENT = 0.1
const KENH_GIA_MOVE_OC = 0.01
// const Sl_TRIGGER_PERCENT_AFTER = .05

const SPOT_MODEL_DEFAULT = {
    AmountAutoPercent: 5,
    AmountExpire: 10,
    AmountIncreaseOC: 8,
}

// ----------------------------------------------------------------------------------
var historyCandleBeta = {}
var tuongMuaBanData = {}
var BTCPumpPercent = 0
var raceMeData = {}
var leverByBotSymbolSide = {}
var confirmSideMoveOCBySymbol = {}
var BTCPumpStatus = false
var PumpStatusBySymbol = {}
var pnlByBotAndSymbol = {}
var timeoutRestartServer = false
let missTPDataBySymbol = {}
var thongKeWinLoseByBot = {}

var messageTeleByBot = {}
var listKline = []
var listKline2 = []
var listKline3 = []

var checkSymbolNotDuplicate = []
var allSymbol = []
var updatingAllMain = false
var connectKlineError = false
var connectByBotError = {}

// -------  ------------

var baoByBotAndSymbol = {}
var missByBotIDAndSymbol = {}
var priceCurrentBySymbol = {}
var allScannerDataObject = {}
var allStrategiesByCandleAndSymbol = {}

var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
var moveMultipleOrderByBotAndConfigIDData = {}
var maxSubmitOrderOCData = {}
var maxAmendOrderOCData = {}
var maxCancelOrderOCData = {}
var botApiList = {}
var digitAllCoinObject = {}
var botListTelegram = {}

// -------  ------------

var listOCByCandleBot = {}
var listTPByCandleBot = {}
var listConfigIDByScanner = {}
var creatingListConfigIDByScanner = {}
// ----------------------------------------------------------------------------------

// BigBabol
var clearVData = {
    scanQty: 0,
    scanPercent: 0,
}
var clearVWinLose = {}

// ----------------------------------------------------------------------------------

const handleRestartServer = async () => {
    console.log(`[...] Restarting Code`);

    updatingAllMain = true

    await cancelAllListOrderOC(listOCByCandleBot)

    console.log("[V] PM2 Reset All Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 restart ${fileName}`)
}

const uuidv4 = () => crypto.randomBytes(16).toString('hex');

const handleIconMarketType = (market) => {
    switch (market) {
        case "Margin": {
            return "🍁"
        }
        case "Spot": {
            return "🍀"
        }
        case "Futures": {
            return "🌻"
        }
    }
}
const handleMarketText = (market) => {
    switch (market) {
        case "MARGIN": {
            return "Margin"
        }
        case "SPOT": {
            return "Spot"
        }
        case "SWAP": {
            return "Futures"
        }
    }
}

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

const handleCalcOrderChange = ({ OrderChange, Numbs }) => {
    const result = [];
    const step = OrderChange * 0.1;
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

const toFixedSmall = (value, tickSize) => {
    const precision = Math.max(0, -Math.floor(Math.log10(tickSize))); // Xác định số chữ số thập phân
    return new Big(value).toFixed(precision); // Giữ nguyên số 0 quan trọng
};

const roundPrice = (
    {
        price,
        tickSize
    }
) => {
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

        if (symbol?.includes("SWAP")) {
            const ctVal = new Big(data?.ctVal);
            newPrice = newPrice.div(ctVal);
        }
    }

    return toFixedSmall(newPrice, data.basePrecision);
};



const handleClearV = async (fromSocket = false) => {

    let filteredThongKe = Object.entries(clearVWinLose)
        .filter(([, value]) => {
            let total = value.Win + value.Lose;
            let winPercentage = total > 0 ? (value.Win / total) * 100 : 0;
            let check = false
            if (value.scannerID) {
                check = winPercentage >= clearVData.scanPercent && value.Win >= clearVData.scanQty
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
        telegramID: process.env.CLEARV_OKX_TELE_ID,
        telegramToken: process.env.CLEARV_BOT_TOKEN,
    });
    !fromSocket && (clearVWinLose = {});
};

const handleSocketSyncCoin = async (data = { new: [] }) => {

    const newData = data.new || []

    console.log(`[...] Sync New ${newData.length} Symbol `, newData);

    let newListKline = []
    let newListKline2 = []
    let newListKline3 = []

    newData.forEach(symbolData => {

        const symbol = symbolData.value

        if (!checkSymbolNotDuplicate.includes(symbol)) {
            checkSymbolNotDuplicate.push(symbol)
            allSymbol.push({
                ...symbolData,
                symbol
            })


            listKline.push(
                {
                    channel: "candle1s",
                    instId: symbol
                },
                {
                    channel: "candle1m",
                    instId: symbol
                }
            )
            newListKline.push(
                {
                    channel: "candle1s",
                    instId: symbol
                },
                {
                    channel: "candle1m",
                    instId: symbol
                }
            )

            listKline2.push({
                channel: "candle5m",
                instId: symbol
            })
            newListKline2.push({
                channel: "candle5m",
                instId: symbol
            })

            // listKline3.push({
            //     channel: "bbo-tbt",
            //     instId: symbol
            // })
            // newListKline3.push({
            //     channel: "bbo-tbt",
            //     instId: symbol
            // })
            // if (symbol.includes("SWAP")) {
            //     listKline3.push({
            //         channel: "mark-price",
            //         instId: symbol
            //     })
            //     newListKline3.push({
            //         channel: "mark-price",
            //         instId: symbol
            //     })
            // }

        }

        // symbolTradeTypeObject[symbol] = symbolData.market === "Spot" ? "Spot" : "Margin"

    })

    await syncDigit()

    await handleSocketListKline(newListKline)
    await handleSocketListKline2(newListKline2)
    // await handleSocketListKline3(newListKline3)


}
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
                Password: item.Password,
            }
        }
        return pre
    }, {});

    await handleCancelAllOrderOC(Object.values(allData || {}))

}
const syncDigit = async () => {

    const getSpot = clientPublic.getInstruments({
        instType: "SPOT"
    })
    const getMargin = clientPublic.getInstruments({
        instType: "MARGIN"
    })
    const getSwap = await clientPublic.getInstruments({
        instType: "SWAP"
    })

    const resultGetAll = await Promise.allSettled([getSpot, getMargin, getSwap])

    resultGetAll.forEach((symbolListData) => {
        symbolListData.value?.forEach(e => {
            let check = false
            const instType = e.instType
            if (instType != "SWAP") {
                check = e.quoteCcy == "USDT"
            }
            else {
                check = e.settleCcy == "USDT"
            }
            if (check) {
                const symbol = e.instId
                const min = e.ctVal * e.lotSz
                digitAllCoinObject[symbol] = {
                    symbol,
                    priceScale: +e.tickSz,
                    basePrecision: instType != "SWAP" ? +e.lotSz : min,
                    ctVal: e.ctVal,
                    minOrderQty: instType != "SWAP" ? +e.minSz : min,
                    lever: +e.lever
                }
            }
        })
    })
}

const handleSetLeverForBotAndSymbol = async ({
    botID,
    symbol,
    lever,
    side,
    leverID
}) => {

    const botData = botApiList[botID]
    let tdMode
    if (side == "Buy") {
        tdMode = "cross"
    }
    else {
        tdMode = "isolated"
    }

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

        if (symbolOC == symbol && side == sideOC) {
            await handleCancelOrderOC({
                ...strategyData,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
                qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
            })
        }
    }))

    // Hạ Lever
    const maxLever = digitAllCoinObject[symbol].lever
    await setLeverSymbolBotBE({
        botData,
        instId: symbol,
        lever: lever < maxLever ? lever : maxLever,
        mgnMode: tdMode
    })
    leverByBotSymbolSide[leverID].running = false

}
const handleSetLeverForBotAndSymbolFutures = async ({
    botID,
    symbol,
    lever,
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
    })
    leverByBotSymbolSide[leverID].running = false

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
}) => {

    const PositionSide = strategy.PositionSide

    const leverID = `${botID}-${symbol}-${PositionSide}`

    let orderOCFalse = false
    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

    maxSubmitOrderOCData[botID] = maxSubmitOrderOCData[botID] || {
        totalOC: 0,
        logError: false,
        timeout: "",
    }

    !listOCByCandleBot[botID] && (listOCByCandleBot[botID] = {
        listOC: {},
        ApiKey,
        SecretKey,
        Password: botData?.Password
    });

    const orderLinkId = uuidv4()
    const Amount = strategy.Amount
    const OrderChange = strategy.OrderChange

    if (!PumpStatusBySymbol?.[symbol]?.pump &&
        botApiList[botID]?.IsActive &&
        !allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.IsDeleted
    ) {

        leverByBotSymbolSide[leverID] = leverByBotSymbolSide[leverID] || {
            lever: 11,
            running: true
        }

        leverByBotSymbolSide[leverID].running = true

        maxSubmitOrderOCData[botID].totalOC += 1

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = true


        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp = priceOrderTPTemp

        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            timeOutFunc: "",
            OrderChangeFilled: OrderChange,
            OC: true
        }

        const client = getRestClientV5Config({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });

        let textTele = ""

        const scannerLabel = strategy?.scannerID?.Label
        const scannerText = scannerLabel ? `<code>• S: ${scannerLabel} 🌀</code> ` : ""
        const symbolSplit = symbol.split("-")[0]


        let tdMode = "cash"
        const marketSymbol = strategy.market

        if (marketSymbol != "Spot") {
            if (side == "Buy") {
                tdMode = "cross"
            }
            else {
                tdMode = "isolated"
            }
        }

        let slTriggerPx = 0

        const openTrade = Math.abs(price)

        if (side === "Buy") {
            slTriggerPx = openTrade - Sl_TRIGGER_PERCENT * openTrade / 100
        }
        else {
            slTriggerPx = Sl_TRIGGER_PERCENT * openTrade / 100 + openTrade
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPx = slTriggerPx
        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPxOld = slTriggerPx

        // console.log(changeColorConsole.cyanBright(`slTriggerPx: ${slTriggerPx} | Symbol: ${symbol} - ${side}`));



        const submitOrderObject = {
            instId: symbol,
            side: side?.toLowerCase(),
            ordType: "limit",
            sz: qty,
            px: price,
            clOrdId: orderLinkId,
            tdMode,
            ccy: "USDT",
        }
        if (marketSymbol == "Futures") {
            submitOrderObject.posSide = side == "Buy" ? "long" : "short"
        }
        await client
            .submitOrder(submitOrderObject)
            .then((res) => {
                leverByBotSymbolSide[leverID].running = false
                const response = res[0]

                if (response?.sCode == 0) {

                    const newOrderID = response.ordId
                    const newOrderLinkID = response.clOrdId

                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderOCCurrent = price

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

                    textTele = `<b>+ OC ${PositionSide}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText}• B: ${botName} • P: ${price} • Q: ${qty} • A: ${Amount}$ <i>-> Success</i>`
                    console.log(`${textTele}\nSL: ${slTriggerPx}\nID: ${newOrderLinkID}`)
                }
                else {
                    textTele = `<b>🟡 OC ${PositionSide}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText}• B: ${botName} • P: ${price} • Q: ${qty} • A: ${Amount}$ \n<code>Failed: ${response.sMsg}</code>`
                    console.log(`${textTele}\nSL: ${slTriggerPx}\n`)
                    orderOCFalse = true
                }
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
            })
            .catch(async (error) => {
                const errorData = error?.data?.[0]
                const errorText = errorData?.sMsg || error?.msg
                const sCode = errorData?.sCode
                textTele = `<b>🔴 OC ${PositionSide}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText}• B: ${botName} • P: ${price} • Q: ${qty} • A: ${Amount}$ \n<code>Error (${sCode}): ${errorText}</code>`
                console.log(`${textTele}\nSL: ${slTriggerPx}\n`)
                leverByBotSymbolSide[leverID].running = false

                if (sCode == "51008" && marketSymbol == "Margin") {

                    if (leverByBotSymbolSide[leverID].lever > 3) {
                        if (!leverByBotSymbolSide[leverID]?.running) {
                            await handleSetLeverForBotAndSymbol({
                                botID,
                                symbol,
                                lever: leverByBotSymbolSide[leverID].lever - 2,
                                side,
                                leverID
                            })

                            leverByBotSymbolSide[leverID].lever -= 2
                        }
                    }
                    else {
                        orderOCFalse = true
                        leverByBotSymbolSide[leverID] = {
                            lever: 11,
                            running: false
                        }
                    }
                }
                else {
                    orderOCFalse = true
                    leverByBotSymbolSide[leverID] = {
                        lever: 11,
                        running: false
                    }
                }


                // if (marketSymbol == "Spot" && PositionSide == "Short") {
                //     orderOCFalse = false

                //     blockCheckMissSpotBySymbol[`${botID}-${symbol}`] = {
                //         notHandleFilledOC: true,
                //         notCheckMiss: true
                //     }

                //     handleSubmitOrderMarketSpot({
                //         strategy,
                //         strategyID,
                //         symbol,
                //         qty,
                //         side,
                //         price,
                //         priceOrderTPTemp,
                //         ApiKey,
                //         SecretKey,
                //         botName,
                //         botID,
                //         botData,
                //     })
                // }
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false

            });


        if (orderOCFalse) {

            allStrategiesByCandleAndSymbol[symbol][strategyID].IsActive = false
            const configID = strategy._id

            let offSuccess = false
            const scannerLabel = strategy?.scannerID?.Label

            switch (strategy.market) {
                case "Spot":
                    {
                        offSuccess = await offConfigSpotBE({
                            configID,
                            symbol,
                            strategy,
                            botName,
                            scannerLabel,
                            AmountOld: strategy.AmountOld
                        })
                        break
                    }
                case "Margin":
                    {
                        offSuccess = await offConfigMarginBE({
                            configID,
                            symbol,
                            strategy,
                            botName,
                            scannerLabel,
                            AmountOld: strategy.AmountOld
                        });
                        await handleSetLeverForBotAndSymbol({
                            botID,
                            symbol,
                            lever: 10,
                            side,
                            leverID
                        })
                        break
                    }
                case "Futures":
                    {
                        offSuccess = await offConfigFuturesBE({
                            configID,
                            symbol,
                            strategy,
                            botName,
                            scannerLabel,
                            AmountOld: strategy.AmountOld
                        });
                        break
                    }
            }

            strategy.IsActive = false
            offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));
            // offSuccess && handleSocketUpdate([strategy]);

            delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
            const textTeleHandle = `${textTele} <i>-> Off Config Success</i>`
            // sendMessageWithRetryWait({
            //     messageText: textTeleHandle,
            //     telegramID: botData.telegramID,
            //     telegramToken: botData.telegramToken,
            // })
        }
    }
    // else {
    //     console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
    // }

    // clearTimeout(maxSubmitOrderOCData[botID]?.timeout)
    // maxSubmitOrderOCData[botID].timeout = setTimeout(() => {
    //     maxSubmitOrderOCData[botID] = {
    //         totalOC: 0,
    //         logError: false,
    //         timeout: "",
    //     }
    // }, 1000)

}



const handleMoveOrderOC = async ({
    strategy,
    strategyID,
    symbol,
    price,
    priceOrderTPTemp,
    orderId,
    side,
    botData,
    botName,
    botID,
}) => {

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });;

    const OrderChange = strategy.OrderChange

    await client
        .amendOrder({
            instId: symbol,
            newPx: price,
            ordId: orderId
        })
        .then((res) => {
            const response = res[0]
            if (response?.sCode == 0) {
                const orderLinkId = response.clOrdId
                // console.log(`[->] Move Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) success: ${price}`)
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp = priceOrderTPTemp
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderOCCurrent = price

                let slTriggerPx = 0

                const openTrade = Math.abs(price)
                if (side === "Buy") {
                    slTriggerPx = openTrade - Sl_TRIGGER_PERCENT * openTrade / 100
                }
                else {
                    slTriggerPx = Sl_TRIGGER_PERCENT * openTrade / 100 + openTrade
                }
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPx = slTriggerPx
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPxOld = slTriggerPx
                if (allStrategiesByBotIDAndOrderID?.[botID]?.[orderLinkId]) {
                    allStrategiesByBotIDAndOrderID[botID][orderLinkId].OrderChangeFilled = OrderChange
                }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order OC ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) failed: ${price} -`, response.sMsg))
            }
        })
        .catch((error) => {
            const errorText = error?.data?.[0]?.sMsg || error?.msg
            console.log(`[!] Move Order OC ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) error: ${errorText}`)
            if (
                errorText?.includes("Insufficient available") ||
                errorText?.includes("balance is insufficient") ||
                errorText?.includes("Insufficient USDT margin in account") ||
                errorText?.includes("Timestamp") ||
                errorText?.includes("requires borrowing")
            ) {
                handleCancelOrderOC(
                    {
                        strategyID,
                        strategy,
                        symbol,
                        side,
                        botData,
                        OrderChange,
                        orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId,
                    }
                )
            }
        });

    // clearTimeout(maxAmendOrderOCData?.[botID]?.timeout)
    // maxAmendOrderOCData[botID].timeout = setTimeout(() => {
    //     maxAmendOrderOCData[botID] = {
    //         totalOC: 0,
    //         logError: false,
    //         timeout: "",
    //     }
    // }, 1000)


    // else {
    //     if (!maxAmendOrderOCData[botID]?.logError) {
    //         console.log(changeColorConsole.redBright(`[!] LIMIT AMEND OC ( ${botName} )`));
    //         maxAmendOrderOCData[botID].logError = true
    //     }
    // }


}
const handleSubmitOrderTP = async ({
    strategy,
    OrderChangeFilled,
    strategyID,
    symbol,
    side,
    qty,
    price,
    missState = false,
    botName,
    botID,
    botData,
    openTrade,
}) => {


    const orderLinkId = uuidv4()

    if (!missState) {
        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            OrderChangeFilled,
            TP: true
        }
    }

    const ApiKey = botData.ApiKey
    const SecretKey = botData.SecretKey
    const Password = botData.Password

    const client = getRestClientV5Config({
        apiKey: ApiKey,
        apiSecret: SecretKey,
        apiPass: Password,
    });;

    let textTele = ""

    const scannerLabel = strategy?.scannerID?.Label
    const scannerText = scannerLabel ? `\n<code>• S: ${scannerLabel} 🌀</code> ` : ""
    const symbolSplit = symbol.split("-")[0]
    const marketSymbol = strategy.market

    let tdMode = "cash"
    if (marketSymbol != "Spot") {
        if (side == "Buy") {
            tdMode = "isolated"
        }
        else {
            tdMode = "cross"
        }
    }
    const Amount = strategy.Amount
    const OrderChange = strategy.OrderChange
    const sideOC = strategy.PositionSide == "Long" ? "Buy" : "Sell"
    const botSymbolMissID = `${botID}-${symbol}-${marketSymbol}-${sideOC}`

    let orderTP = false

    const submitOrderObject = {
        instId: symbol,
        side: side?.toLowerCase(),
        ordType: "limit",
        sz: qty,
        px: price,
        clOrdId: orderLinkId,
        tdMode,
        ccy: "USDT",
        reduceOnly: strategy.market != "Spot" ? true : false,
    }

    if (marketSymbol == "Futures") {
        submitOrderObject.posSide = side == "Buy" ? "short" : "long"
    }

    await client
        .submitOrder(submitOrderObject)
        .then((res) => {
            const response = res[0]

            if (response?.sCode == 0) {

                const newOrderID = response.ordId
                const newOrderLinkID = response.clOrdId

                if (strategyID) {
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderLinkId = newOrderLinkID
                    clearTimeoutMiss(botSymbolMissID)
                    // if (strategy?.Adaptive) {
                    //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                    // }
                    // else {
                    // }
                    setTimeout(() => {
                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                    }, 1000)
                }

                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty),
                    priceOrderTP: price
                }

                listTPByCandleBot[botID] = listTPByCandleBot[botID] || {
                    listOC: {},
                    ApiKey,
                    SecretKey,
                    Password
                }



                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.close3s = setTimeout(() => {
                    if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderFilled) {
                        // handleCloseMarket({
                        //     symbol,
                        //     side: side == "Buy" ? "Sell" : "Buy",
                        //     botID,
                        //     botData,
                        //     qty,
                        //     strategy
                        // })

                        console.log(changeColorConsole.blueBright(`[=>] Move TP To Price Current After ${TIME_MARKET_TP} ( ${botName} - ${symbol} ${handleIconMarketType(marketSymbol)} - ${side} - ${OrderChange}% )`));
                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveToPriceCurrent = true
                        handleMoveOrderTP({
                            strategyID,
                            strategy,
                            side: sideOC,
                            botData,
                            botName,
                            botID,
                            newTPPrice: priceCurrentBySymbol[symbol],
                        })


                        // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.closeMarketAfterSecond = setTimeout(() => {
                        //     console.log(changeColorConsole.blueBright(`[V] Close Market After ${TIME_MARKET_TP * 2.5} Order TP ( ${botName} - ${symbol} ${handleIconMarketType(marketSymbol)} - ${side} - ${OrderChange} )`));
                        //     handleCloseMarket({
                        //         side: sideOC,
                        //         botID,
                        //         botData,
                        //         symbol,
                        //         qty,
                        //         strategy,
                        //         market: marketSymbol
                        //     })
                        // }, TIME_MARKET_TP * 2.5)
                    }
                }, TIME_MARKET_TP)



                textTele = `<b>+ TP ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText} \nB: ${botName} • P: ${price} • A: ${Amount}$ \n<i>-> Success</i>`
                console.log(`${textTele}\nQty: ${qty}\nID: ${orderLinkId}`)
                orderTP = true
            }
            else {
                textTele = `<b>🟨 TP ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText} \nB: ${botName} • P: ${price} • A: ${Amount}$ \n<code>Failed: ${response.sMsg}</code>`
                console.log(`${textTele}\nQty: ${qty}\nID: ${orderLinkId}`)
                delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error?.msg || error
            textTele = `<b>🟥 TP ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${scannerText} \nB: ${botName} • P: ${price} • \Q: ${qty} • A: ${Amount}$ \n<code>Error: ${errorText}</code>`
            console.log(`${textTele}\nID: ${orderLinkId}`)
            delete allStrategiesByBotIDAndOrderID[botID]?.[orderLinkId]
            // console.log("qtyOCFilled", qtyOCFilled, digitAllCoinObject[symbol]);
            handleCloseMarket({
                symbol,
                side: sideOC,
                botID,
                botData,
                strategy,
                market: marketSymbol,
                qty
            })
            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true

        });

    !orderTP && sendMessageWithRetryWait({
        messageText: textTele,
        telegramID: botData.telegramID,
        telegramToken: botData.telegramToken,
    })
}
const moveOrderTP = async ({
    strategy,
    symbol,
    price,
    orderId,
    side,
    botData,
    botName,
    TPNew,
    botID,
    strategyID
}) => {

    const OrderChange = strategy.OrderChange

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });;

    await client
        .amendOrder({
            instId: symbol,
            newPx: toFixedSmall(price, digitAllCoinObject[symbol]?.priceScale),
            ordId: orderId
        })
        .then((res) => {
            const response = res[0]

            if (response?.sCode == 0) {
                console.log(changeColorConsole.cyanBright(`[<-] Move TP ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) success: ${price}`))
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move TP ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) failed: ${price} - ${response.sMsg}`))
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error?.msg || error
            console.log(`[!] Move TP ( ${OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) error: ${price} - TPNew: ${TPNew} - ${errorText}`)
        });
    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moving = false


}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
    side,
    botData,
    botName,
    botID,
    newTPPrice,
    coinCurrent
}) => {
    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moving = true


    const sideText = side === "Buy" ? "Sell" : "Buy"
    const symbol = strategy.symbol


    const TPOld = Math.abs(allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP?.price)

    if (TPOld) {

        const priceScale = Math.abs(digitAllCoinObject[symbol]?.priceScale)
        // let TPNew
        // if (strategy.PositionSide === "Long") {
        //     TPNew = TPOld - priceScale
        // }
        // else {
        //     TPNew = TPOld + priceScale
        // }

        const ReduceTakeProfit = 50
        let TPNew

        if (newTPPrice) {
            TPNew = newTPPrice
        }
        else {
            const khoangMoveTP = Math.abs(TPOld - coinCurrent)
            if (strategy.PositionSide === "Long") {
                TPNew = TPOld - khoangMoveTP * (ReduceTakeProfit / 100)
            }
            else {
                TPNew = TPOld + khoangMoveTP * (ReduceTakeProfit / 100)
            }
        }

        TPNew = roundPrice({
            price: TPNew,
            tickSize: priceScale
        })

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            strategy,
            symbol,
            price: TPNew,
            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID,
            side: sideText,
            botData,
            botName,
            botID,
            TPNew
        }
        await moveOrderTP(dataInput)
    }
}
const handleCloseMarket = async ({
    symbol,
    side,
    botID,
    botData,
    stopLose = false,
    coinCurrent,
    sendTele = true,
    strategy,
    market,
    qty
}) => {
    const marketSymbol = market || strategy?.market

    const textData = !stopLose ? {
        position: "Close",
        market: "Close",
    } : {
        position: "Stop-Loss",
        market: "Stop-Loss",
    }
    const coinCurrentSLText = stopLose ? `SL: ${coinCurrent}` : ""

    const botName = botData?.botName

    const telegramID = botData?.telegramID
    const telegramToken = botData?.telegramToken

    const symbolSplit = symbol.split("-")[0]

    const botSymbolMissID = `${botID}-${symbol}-${marketSymbol}-${side}`

    const sideFilled = side == "Buy" ? 'Sell' : 'Buy'
    const pnlByBotAndSymbolID = `${botID}-${symbol}-${sideFilled}`

    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });;

    let closeSuccess = false

    let textTele = ""
    let tdMode = "cash"

    if (marketSymbol != "Spot") {

        if (side == "Sell") {
            tdMode = "isolated"
        }
        else {
            tdMode = "cross"
        }
        const closePositionsObject = {
            ccy: "USDT",
            mgnMode: tdMode,
            instId: symbol,
            autoCxl: true
        }
        if (marketSymbol == "Futures") {
            closePositionsObject.posSide = side == "Buy" ? "long" : "short"
        }
        await client
            .closePositions(closePositionsObject)
            .then((res) => {

                const response = res[0]
                if (response) {

                    const pnlData = pnlByBotAndSymbol[pnlByBotAndSymbolID]

                    const pnlWinLose = +pnlData?.pnl
                    const lastPx = roundPrice({
                        price: +pnlData?.avgPx,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    })

                    const winLoseString = pnlWinLose != 0 ? pnlWinLose.toFixed(3) : 0
                    const pnlWinLoseText = pnlWinLose > 0 ? `✅ WIN: ${winLoseString}$` : `❌ LOSE: ${winLoseString}$`

                    textTele = `💳 <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} • P: ${lastPx} • Q: ${(+qty)?.toFixed(3)} • Bot: ${botName} • ${coinCurrentSLText}`
                    console.log(changeColorConsole.greenBright(textTele));
                    closeSuccess = true
                }
                else {
                    textTele = `💳 <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} | Bot: ${botName} \n<code>🟡 Failed: ${response.msg}</code>`
                    console.log(changeColorConsole.yellowBright(textTele));
                }
            })
            .catch((error) => {

                const errorText = error?.msg
                textTele = `💳 <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} | Bot: ${botName} \n<code>🔴 Error: ${errorText}</code>`
                console.log(textTele)
            });
    }
    else {
        await handleCancelOrderTP({
            symbol,
            side: sideFilled,
            orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategy?.value]?.TP?.orderID,
            botData,
            botName,
            botID,
            marketSymbol
        })
        let Quantity
        if (qty) {
            Quantity = qty
        }
        else {
            const data = await client.getBalance(symbolSplit)
            Quantity = data[0].details[0]?.availEq
        }

        await client
            .submitOrder({
                instId: symbol,
                side: sideFilled?.toLowerCase(),
                ordType: "market",
                sz: Quantity,
                tdMode,
                ccy: "USDT",
            })
            .then((res) => {
                const response = res[0]
                if (response?.sCode == 0) {
                    const pnlData = pnlByBotAndSymbol[pnlByBotAndSymbolID]

                    const AmountFilled = (+pnlData?.fillNotionalUsd).toFixed(2)
                    const pnlWinLose = +pnlData?.pnl
                    const lastPx = +pnlData?.avgPx
                    const qty = +pnlData?.accFillSz

                    const winLoseString = pnlWinLose > 0 ? pnlWinLose.toFixed(3) : 0
                    const pnlWinLoseText = pnlWinLose > 0 ? `✅ WIN: ${winLoseString}$` : `❌ LOSE: ${winLoseString}$`

                    textTele = `💳 ${textData.market} <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} • P: ${lastPx} • Q: ${qty} • Bot: ${botName} • ${coinCurrentSLText}`
                    console.log(changeColorConsole.greenBright(textTele, `\nQty: ${Quantity}`));
                    closeSuccess = true
                }
                else {
                    textTele = `💳 ${textData.market} <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} | Bot: ${botName}\n<code>🟡 Failed: ${response.sMsg}</code>`
                    console.log(changeColorConsole.yellowBright(textTele, `\nQty: ${Quantity}`));
                }
            })
            .catch((error) => {
                const errorText = error.data?.[0]?.sMsg || error?.msg || error
                textTele = `💳 ${textData.market} <b>${symbolSplit}</b> ${handleIconMarketType(marketSymbol)} ${side} | Bot: ${botName}\n<code>🔴 Error: ${errorText}</code>`
                console.log(textTele, `\nQty: ${Quantity}`)
            });
    };

    if (closeSuccess) {
        clearTimeoutMiss(botSymbolMissID)

        resetMissData(botSymbolMissID)

        delete baoByBotAndSymbol?.[botID]?.[symbol]

        sendTele && sendMessageWithRetryWait({
            messageText: textTele,
            telegramID,
            telegramToken,
        })
    }
    // closeSuccess && strategy && handleWinLose({
    //     botID,
    //     botData,
    //     strategy,
    //     symbol,
    //     openTradeOCFilled,
    //     qtyOCFilled,
    //     marketSymbol
    // })



}

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
    const scannerText = scannerLabel ? `<code>• S: ${scannerLabel} 🌀</code> ` : ""
    const Market = strategy.market
    const symbolSplit = symbol.split("-")[0]


    await client
        .cancelOrder({
            instId: symbol,
            ordId: orderId || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
        })
        .then((res) => {
            const response = res[0]
            if (response?.sCode == 0) {
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(Market)} ${scannerText}• B: ${botName} <i>-> Success</i>`
                console.log(textTele);
            }
            else {
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(Market)} ${scannerText}• B: ${botName} \n<code>🟡 Failed: ${response.sMsg}</code>`
                console.log(textTele)
            }
        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error?.msg || error
            textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(Market)} ${scannerText}• B: ${botName} \n<code>🔴 Error: ${errorText}</code>`
            console.log(textTele)

        });

    handleOrderTP()
    // await handleCloseMarket({
    //     botID,
    //     side,
    //     symbol,
    //     botData,
    //     strategy,
    //     qty,
    //     market: strategy.market,
    // })

    // sendMessageWithRetryWait({
    //     messageText: `<code>Cancel remain quantity</code> \n${textTele}`,
    //     telegramID: botData.telegramID,
    //     telegramToken: botData.telegramToken,
    // })


}

const handleCancelOrderOC = async ({
    strategyID,
    strategy,
    symbol,
    side,
    botData,
    OrderChange,
    IsDeleted = false,
    resetCancelAll = true,
    orderLinkId,
    closeMarket = true
}) => {


    const botName = botData.botName
    const botID = botData.id
    if (orderLinkId && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC) {

        maxCancelOrderOCData[botID] = maxCancelOrderOCData[botID] || {
            totalOC: 0,
            logError: false,
            timeout: ""
        }

        const client = getRestClientV5Config({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });;

        let textTele = ""

        const scannerIDData = strategy?.scannerID
        const scannerID = scannerIDData?._id
        const scannerLabel = scannerIDData?.Label
        const scannerText = scannerLabel ? `<code>• S: ${scannerLabel} 🌀</code> ` : ""

        const symbolSplit = symbol.split("-")[0]

        let checkCancelOC = false

        await client
            .cancelOrder({
                instId: symbol,
                clOrdId: orderLinkId
            })
            .then((res) => {
                const response = res[0]
                if (response?.sCode == 0) {
                    textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(strategy.market)} ${scannerText}• B: ${botName} <i>-> Success</i>`
                    console.log(textTele);
                    checkCancelOC = true
                }
                else {
                    textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(strategy.market)} ${scannerText}• B: ${botName} \n<code>🟡 Failed: ${response.sMsg}</code>`
                    console.log(textTele)
                }
            })
            .catch((error) => {
                const errorText = error.data?.[0]?.sMsg || error?.msg || error
                textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(strategy.market)} ${scannerText}• B: ${botName} \n<code>🔴 Error: ${errorText}</code>`
                console.log(textTele)

            });

        if (checkCancelOC) {
            resetCancelAll && cancelAll({
                botID,
                strategyID
            })
            if (IsDeleted || allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.IsDeleted) {
                delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                delete allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]
                scannerID && delete listConfigIDByScanner[scannerID]?.[symbol]
            }
        }
        else {
            if (IsDeleted) {
                allStrategiesByCandleAndSymbol[symbol][strategyID].IsDeleted = true
            }
            else {
                // closeMarket && await handleCloseMarket({
                //     botID,
                //     side,
                //     symbol,
                //     botData,
                //     strategy,
                // })
            }
        }

        // sendMessageWithRetryWait({
        //     messageText: `<code>Cancel remain quantity</code> \n${textTele}`,
        //     telegramID: botData.telegramID,
        //     telegramToken: botData.telegramToken,
        // })
    }
}

const handleCancelAllOrderOC = async (items = [], closeMarket = true) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                await Promise.allSettled(list.map(async item => {
                    const strategy = item.strategy
                    const strategyID = item.strategyID
                    const botID = item.botID
                    await handleCancelOrderOC({
                        ...item,
                        botData: botApiList[botID],
                        strategyID,
                        strategy,
                        OrderChange: strategy?.OrderChange,
                        orderLinkId: item?.orderLinkId,
                        qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
                        closeMarket
                    })
                }))
                // while (index < list.length) {
                //     const batch = list.slice(index, index + batchSize);

                //     const newList = batch.reduce((pre, cur) => {
                //         const curOrderLinkId = cur.orderLinkId

                //         const botIDTemp = cur.botID
                //         const strategyIDTemp = cur.strategyID

                //         if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled) {
                //             pre.push({
                //                 instId: cur.symbol,
                //                 clOrdId: curOrderLinkId,
                //             })
                //             listCancel[curOrderLinkId] = cur
                //         }
                //         else {
                //             const OrderChange = cur.strategy.OrderChange
                //             console.log(`[V] Cancel order OC ( ${OrderChange} ) ( ${cur.botName} - ${cur.side} -  ${cur.symbol} ) has been filled `);
                //             handleCloseMarket({
                //                 botID: botIDTemp,
                //                 side: cur.side,
                //                 symbol: cur.symbol,
                //                 botData: cur.botData,
                //                 strategy: cur.strategy,
                //                 qty: allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]?.TP?.qty
                //             })
                //             // cancelAll({
                //             //     botID: botIDTemp,
                //             //     strategyID: strategyIDTemp,
                //             // })

                //         }
                //         return pre
                //     }, [])

                //     console.log(`[...] Canceling ${newList.length} OC`);

                //     const listResult = await client.cancelMultipleOrders(newList)

                //     listResult.forEach((item, index) => {

                //         const data = listCancel[item.clOrdId]
                //         const botIDTemp = data.botID
                //         const strategyIDTemp = data.strategyID
                //         const strategy = data.strategy
                //         const OrderChange = strategy?.OrderChange
                //         const symbol = data.symbol
                //         const side = data.side

                //         let textTele = ""

                //         const scannerLabel = strategy?.scannerID?.Label
                //         const scannerText = scannerLabel ? `\n<code>• ${scannerLabel} 🌀</code> ` : ""
                //         const symbolSplit = symbol.split("-")[0]

                //         if (item.sCode == 0) {
                //             textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(strategy.market)} ${scannerText}• B: ${data.botName} <i>-> Success</i>`
                //             console.log(textTele);
                //             cancelAll({
                //                 botID: botIDTemp,
                //                 strategyID: strategyIDTemp,
                //             })
                //         }
                //         else {
                //             textTele = `<b>x OC ${side}</b> ( ${OrderChange}% ) • <b>${symbolSplit}</b> ${handleIconMarketType(strategy.market)} ${scannerText}• B: ${data.botName} \n<code>🟡 Failed: ${item.sMsg}</code>`
                //             console.log(changeColorConsole.yellowBright(textTele));
                //             handleCloseMarket({
                //                 botID: botIDTemp,
                //                 side,
                //                 symbol,
                //                 botData: data.botData,
                //                 strategy: data.strategy,
                //                 qty: allStrategiesByBotIDAndStrategiesID[botIDTemp]?.[strategyIDTemp]?.TP?.qty
                //             })
                //         }
                //         messageListByBot[botIDTemp] = messageListByBot[botIDTemp] || {
                //             botData: data.botData,
                //             textTele: []
                //         }

                //         messageListByBot[botIDTemp].textTele.push(textTele)


                //     })

                //     await delay(1200)
                //     index += batchSize
                // }
            }
        }))

        // const listTele = Object.values(messageListByBot)

        // listTele?.length > 0 && await Promise.allSettled(listTele.map(messageData => {
        //     // sendMessageWithRetryWait({
        //     //     messageText: messageData.textTele?.join("\n\n"),
        //     //     telegramID: messageData.botData.telegramID,
        //     //     telegramToken: messageData.botData.telegramToken,
        //     // })
        // }))

        console.log("[V] Cancel All OC Success");

    }

}

const handleNewOCScanner = ({
    OCScan,
    OC,
    Alpha
}) => {
    const OCHandle = (OCScan - OCScan / OC * Alpha / 100)
    const newOC = OC < OCHandle ? OCHandle : OC
    return newOC
}
const handleCreateMultipleConfigSpot = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    dataBeta
}) => {

    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const scannerID = scannerData._id
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {
        newOCIFBao = XOCPump * OC
        checkBao = true
    }

    console.log(`[...] Create ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Spot ( ${botName} - ${symbol} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    let messageTextTeleList = `✚ ${scannerData.Label} <b>${symbol.split("-")[0]}</b> Long ${checkBao ? `( x${XOCPump} )` : ""}\n`

    const Amount = scannerData.Amount
    const dataInput = listOC.map(OCData => {
        const newOC = OCData.toFixed(3)
        messageTextTeleList += `${Math.abs(newOC).toFixed(3)}% • `;
        return {
            "PositionSide": "Long",
            "OrderChange": newOC,
            "Amount": Amount,
            "Expire": scannerData.Expire,
            "Limit": scannerData.Limit,
            "AmountAutoPercent": scannerData.AmountAutoPercent || SPOT_MODEL_DEFAULT.AmountAutoPercent,
            "AmountExpire": scannerData.AmountExpire || SPOT_MODEL_DEFAULT.AmountExpire,
            "AmountIncreaseOC": SPOT_MODEL_DEFAULT.AmountIncreaseOC,
            "IsActive": scannerData.IsActive,
            "Adaptive": scannerData.Adaptive,
            "Reverse": scannerData.Reverse,
            "XOCPump": scannerData.XOCPump,
            "IsBeta": scannerData.IsBeta,
            "Remember": false
        }
    })

    messageTextTeleList = messageTextTeleList.slice(0, -2)
    messageTextTeleList += `\nV: ${formatNumberString(vol)} • A: ${Amount}$`
    if (dataBeta) {
        messageTextTeleList += `\n<b>Data:</b> \n${dataBeta}`
    }

    console.log(messageTextTeleList);

    const res = await createStrategiesMultipleSpotBE({
        dataInput,
        botID,
        botName,
        symbol,
        scannerID
    })


    const newData = res.data

    if (newData.length > 0) {
        console.log(changeColorConsole.greenBright(`\n${res.message}`));

        listConfigIDByScanner[scannerID] = listConfigIDByScanner[scannerID] || {}

        listConfigIDByScanner[scannerID][symbol] = newData

        await handleSocketAddNew(newData.map(item => {
            if (checkBao) {
                item.OrderChangeOld = item.OrderChange / XOCPump
            }
            return item
        }))

        const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
        creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;


        sendMessageWithRetryWait({
            messageText: messageTextTeleList,
            telegramID: botData.telegramID,
            telegramToken: botData.telegramToken,
        })
    }

}

const handleCreateMultipleConfigMargin = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    dataBeta
}) => {


    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const scannerID = scannerData._id
    const PositionSide = scannerData.PositionSide
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {

        newOCIFBao = XOCPump * OC
        checkBao = true
    }


    console.log(`[...] Create ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Margin ( ${botName} - ${symbol} - ${PositionSide} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    // let messageTextTeleList = `✚ ${scannerData.Label} <b>${symbol.split("-")[0]}</b> ${handleIconMarketType("Margin")} ${digitAllCoinObject[symbol].lever}x / ${PositionSide} / ${formatNumberString(vol)} / `;
    let messageTextTeleList = `✚ ${scannerData.Label} <b>${symbol.split("-")[0]}</b> ${PositionSide} ${checkBao ? `( x${XOCPump} )` : ""}\n`

    const Amount = scannerData.Amount

    const dataInput = listOC.map(OCData => {
        const newOC = OCData.toFixed(3)
        messageTextTeleList += `${Math.abs(newOC).toFixed(3)}% • `;
        return {
            "PositionSide": PositionSide,
            "OrderChange": newOC,
            "Amount": Amount,
            "IsActive": scannerData.IsActive,
            "Expire": scannerData.Expire,
            "Limit": scannerData.Limit,
            "AmountAutoPercent": scannerData.AmountAutoPercent || SPOT_MODEL_DEFAULT.AmountAutoPercent,
            "AmountExpire": scannerData.AmountExpire || SPOT_MODEL_DEFAULT.AmountExpire,
            "AmountIncreaseOC": SPOT_MODEL_DEFAULT.AmountIncreaseOC,
            "Adaptive": scannerData.Adaptive,
            "Reverse": scannerData.Reverse,
            "XOCPump": scannerData.XOCPump,
            "IsBeta": scannerData.IsBeta,
            "Remember": false
        }
    })

    messageTextTeleList = messageTextTeleList.slice(0, -2)
    messageTextTeleList += `\nV: ${formatNumberString(vol)} • A: ${Amount}$`
    if (dataBeta) {
        messageTextTeleList += `\n<b>Data:</b> \n${dataBeta}`
    }
    console.log(messageTextTeleList);

    const res = await createStrategiesMultipleMarginBE({
        dataInput,
        botID,
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

        await handleSocketAddNew(newData.map(item => {
            if (checkBao) {
                item.OrderChangeOld = item.OrderChange / XOCPump
            }
            return item
        }))

        const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
        creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;

        sendMessageWithRetryWait({
            messageText: messageTextTeleList,
            telegramID: botData.telegramID,
            telegramToken: botData.telegramToken,
        })
    }

}

const handleCreateMultipleConfigFutures = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    dataBeta
}) => {

    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const scannerID = scannerData._id
    const PositionSide = scannerData.PositionSide
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {

        newOCIFBao = XOCPump * OC
        checkBao = true
    }


    console.log(`[...] Create ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Futures ( ${botName} - ${symbol} - ${PositionSide} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    let messageTextTeleList = `✚ ${scannerData.Label} <b>${symbol.split("-")[0]}</b> ${PositionSide} ${checkBao ? `( x${XOCPump} )` : ""}\n`

    const Amount = scannerData.Amount

    const dataInput = listOC.map(OCData => {
        const newOC = OCData.toFixed(3)
        messageTextTeleList += `${Math.abs(newOC).toFixed(3)}% • `;

        return {
            "PositionSide": PositionSide,
            "OrderChange": newOC,
            "Amount": Amount,
            "IsActive": scannerData.IsActive,
            "Expire": scannerData.Expire,
            "Limit": scannerData.Limit,
            "AmountAutoPercent": scannerData.AmountAutoPercent || SPOT_MODEL_DEFAULT.AmountAutoPercent,
            "AmountExpire": scannerData.AmountExpire || SPOT_MODEL_DEFAULT.AmountExpire,
            "AmountIncreaseOC": SPOT_MODEL_DEFAULT.AmountIncreaseOC,
            "Adaptive": scannerData.Adaptive,
            "Reverse": scannerData.Reverse,
            "XOCPump": scannerData.XOCPump,
            "IsBeta": scannerData.IsBeta,
            "Remember": false
        }
    })

    messageTextTeleList = messageTextTeleList.slice(0, -2)
    messageTextTeleList += `\nV: ${formatNumberString(vol)} • A: ${Amount}$`
    if (dataBeta) {
        messageTextTeleList += `\n<b>Data:</b> \n${dataBeta}`
    }
    console.log(messageTextTeleList);

    const res = await createStrategiesMultipleFuturesBE({
        dataInput,
        botID,
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

        await handleSocketAddNew(newData.map(item => {
            if (checkBao) {
                item.OrderChangeOld = item.OrderChange / XOCPump
            }
            return item
        }))

        const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
        creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;

        sendMessageWithRetryWait({
            messageText: messageTextTeleList,
            telegramID: botData.telegramID,
            telegramToken: botData.telegramToken,
        })
    }

}

// 4B
const handleCreateMultipleConfigSpot4B = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    listConfigIDByScannerData
}) => {

    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {

        newOCIFBao = XOCPump * OC
        checkBao = true
    }

    console.log(`[4B] Update ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Spot ( ${botName} - ${symbol} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    await Promise.allSettled(listConfigIDByScannerData.map(async (strategy, index) => {
        const OrderChangeOld = strategy.OrderChange
        const newOC = +listOC[index].toFixed(3)
        const configID = strategy._id
        const offSuccess = await increaseOCSpotBE({
            configID,
            symbol,
            oldOC: OrderChangeOld,
            newOC,
            strategy,
            botName
        });
        strategy.OrderChange = newOC
        strategy.OrderChangeOld = strategy.OrderChange / XOCPump
        offSuccess && await handleSocketUpdate([strategy]);
    }))

    const scannerID = scannerData._id
    const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;

}

const handleCreateMultipleConfigMargin4B = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    listConfigIDByScannerData
}) => {


    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const PositionSide = scannerData.PositionSide
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {

        newOCIFBao = XOCPump * OC
        checkBao = true
    }

    console.log(`[4B] Update ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Margin ( ${botName} - ${symbol} - ${PositionSide} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    await Promise.allSettled(listConfigIDByScannerData.map(async (strategy, index) => {
        const OrderChangeOld = strategy.OrderChange
        const newOC = +listOC[index].toFixed(3)
        const configID = strategy._id
        const offSuccess = await increaseOCMarginBE({
            configID,
            symbol,
            oldOC: OrderChangeOld,
            newOC,
            strategy,
            botName
        });
        strategy.OrderChange = newOC
        strategy.OrderChangeOld = strategy.OrderChange / XOCPump
        offSuccess && handleSocketUpdate([strategy]);
    }))
    const scannerID = scannerData._id
    const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;
}

const handleCreateMultipleConfigFutures4B = async ({
    scannerData = {},
    symbol = "",
    botName,
    OC,
    vol,
    listConfigIDByScannerData
}) => {

    const XOCPump = scannerData.XOCPump
    let newOCIFBao = OC
    let checkBao = false
    const PositionSide = scannerData.PositionSide
    const botData = scannerData.botID
    const botID = botData._id

    if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {

        newOCIFBao = XOCPump * OC
        checkBao = true
    }

    console.log(`[4B] Update ${scannerData.Numbs} Config OC ( ${newOCIFBao} ) Futures ( ${botName} - ${symbol} - ${PositionSide} )`);

    const listOC = handleCalcOrderChange({ OrderChange: newOCIFBao, Numbs: +scannerData.Numbs })

    await Promise.allSettled(listConfigIDByScannerData.map(async (strategy, index) => {
        const OrderChangeOld = strategy.OrderChange
        const newOC = +listOC[index].toFixed(3)
        const configID = strategy._id
        const offSuccess = await increaseOCFuturesBE({
            configID,
            symbol,
            oldOC: OrderChangeOld,
            newOC,
            strategy,
            botName
        });
        strategy.OrderChange = newOC
        strategy.OrderChangeOld = strategy.OrderChange / XOCPump
        offSuccess && handleSocketUpdate([strategy]);
    }))
    const scannerID = scannerData._id
    const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = false;
}

const handleCancelOrderTP = async ({
    symbol,
    side,
    orderId,
    botData,
    botName }) => {


    const client = getRestClientV5Config({
        apiKey: botData.ApiKey,
        apiSecret: botData.SecretKey,
        apiPass: botData.Password,
    });;

    orderId && await client
        .cancelOrder({
            instId: symbol,
            ordId: orderId
        })
        .then((res) => {
            const response = res[0]

            if (response?.sCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} ) success `);
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} ) failed `, response.sMsg))
            }

        })
        .catch((error) => {
            const errorText = error.data?.[0]?.sMsg || error?.msg || error
            console.log(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} ) error `, errorText)
        });

}

async function handleCancelAllOrderTP({
    items,
    batchSize = 30
}) {
    // if (items.length > 0) {
    //     console.log(`[...] Canceling TP`);

    //     let index = 0;
    //     while (index < items.length) {
    //         const batch = items.slice(index, index + batchSize);
    //         await Promise.allSettled(batch.map(item => handleCancelOrderTP({
    //             strategyID: item.strategyID,
    //             symbol: item.symbol,
    //             side: item.side,
    //             botData: item.botData,
    //             botName: item.botName,
    //             botID: item.botID,
    //             orderId: item.orderId,
    //             gongLai: item.gongLai,
    //         })));
    //         await delay(1200)
    //         index += batchSize
    //     }
    // }
}

const clearTimeoutMiss = (botSymbolMissID) => {
    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)
    clearTimeout(missTPDataBySymbol?.[botSymbolMissID]?.timeOutFunc)
    missTPDataBySymbol[botSymbolMissID].timeOutFunc = ""
}
const resetMissData = (botSymbolMissID) => {

    missTPDataBySymbol[botSymbolMissID] = {
        size: 0,
        side: "",
        Candlestick: "",
        timeOutFunc: "",
        sizeTotal: 0,
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

        clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSl)
        clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSlBeta)
        clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.closeMarketAfterSecond)
        clearTimeout(allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.close3s)

        const data = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]

        allStrategiesByBotIDAndOrderID[botID] = allStrategiesByBotIDAndOrderID[botID] || {}
        allStrategiesByBotIDAndStrategiesID[botID] = allStrategiesByBotIDAndStrategiesID[botID] || {}

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

        delete listTPByCandleBot?.[botID]?.listOC?.[strategyID]
        delete listOCByCandleBot?.[botID]?.listOC?.[strategyID]

        if (data) {
            const OCOrderID = data?.OC?.orderLinkId
            const TPOrderID = data?.TP?.orderLinkId
            OCOrderID && delete allStrategiesByBotIDAndOrderID?.[botID]?.[OCOrderID]
            TPOrderID && delete allStrategiesByBotIDAndOrderID?.[botID]?.[TPOrderID]
        }
    }

}

// 

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

const sendAllBotTelegram = async (text) => {

    await Promise.allSettled(Object.values(botApiList).map(botApiData => {
        const telegramID = botApiData.telegramID
        const telegramToken = botApiData.telegramToken
        botApiData?.IsActive && sendMessageWithRetryWait({
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

            await Promise.allSettled(objectToArray.map(async botApiData => {

                const botID = botApiData.id
                const botName = botApiList[botID].botName

                const wsOrder = getWebsocketClientConfig({
                    apiKey: botApiData.ApiKey,
                    apiPass: botApiData.Password,
                    apiSecret: botApiData.SecretKey
                });

                botApiList[botID].wsOrder = wsOrder

                try {
                    await wsOrder.subscribe(LIST_ORDER)
                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    wsOrder.on('update', async (dataCoin) => {

                        const botID = botApiData.id

                        const botDataMain = botApiList[botID]
                        const ApiKey = botDataMain?.ApiKey
                        const SecretKey = botDataMain?.SecretKey
                        const IsActive = botDataMain?.IsActive
                        const botName = botDataMain?.botName

                        const telegramID = botDataMain?.telegramID
                        const telegramToken = botDataMain?.telegramToken

                        const topicMain = dataCoin.arg.channel

                        const dataMainAll = dataCoin.data

                        ApiKey && SecretKey && await Promise.allSettled(dataMainAll.map(async dataMain => {

                            if (topicMain === "orders") {
                                const symbol = dataMain.instId
                                const orderID = dataMain.clOrdId
                                const ordId = dataMain.ordId
                                const orderStatus = dataMain.state
                                const qtyFilled = Math.abs(dataMain.accFillSz)
                                const fillFeePart = +dataMain.fillFee
                                const fillFee = +dataMain.fee || fillFeePart
                                const priceFilled = Math.abs(dataMain.avgPx || dataMain.fillPx)
                                const AmountFilled = Math.abs(dataMain.notionalUsd || dataMain.fillNotionalUsd).toFixed(2)

                                const sideFilled = dataMain.side == "buy" ? "Buy" : "Sell"
                                const ordType = dataMain.ordType
                                const instType = handleMarketText(dataMain.instType)
                                const symbolSplit = symbol.split("-")[0]
                                const fillSzPart = +dataMain.fillSz

                                const sideMISS = sideFilled == "Buy" ? "Sell" : "Buy"
                                let botSymbolMissID = `${botID}-${symbol}-${instType}-${sideMISS}`

                                const pnlByBotAndSymbolID = `${botID}-${symbol}-${sideFilled}`
                                pnlByBotAndSymbol[pnlByBotAndSymbolID] = dataMain
                                pnlByBotAndSymbol[pnlByBotAndSymbolID].AmountFilled = AmountFilled

                                let qtyFilledAndFee = qtyFilled
                                if (sideFilled == "Buy") {
                                    qtyFilledAndFee += fillFee
                                }
                                switch (instType) {

                                    case "Futures": {
                                        qtyFilledAndFee = qtyFilled * digitAllCoinObject[symbol]?.ctVal
                                        break;
                                    }
                                }

                                if (IsActive) {
                                    try {
                                        if (orderStatus === "filled") {

                                            console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${sideFilled} - ${symbol} ${handleIconMarketType(instType)} ): ${orderID} - ${qtyFilled}`));

                                            if (!orderID) {
                                                // if (instType == "Spot") {
                                                //     console.log(changeColorConsole.greenBright(`[V] Clear Block Check Miss Spot ( ${botName} - ${symbol} )`));
                                                //     blockCheckMissSpotBySymbol[`${botID}-${symbol}`] = {}
                                                // }
                                                setTimeout(() => {
                                                    const listObject = listOCByCandleBot?.[botID]?.listOC

                                                    listObject && Object.values(listObject).map(async strategyData => {
                                                        const strategyID = strategyData?.strategyID
                                                        const symbolItem = strategyData?.symbol
                                                        const strategyDataSide = strategyData?.side
                                                        const sideConfig = strategyDataSide == "Buy" ? "Sell" : "Buy"

                                                        if (symbol == symbolItem && sideFilled == sideConfig && allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderIDConfirm) {
                                                            {
                                                                console.log(changeColorConsole.greenBright(`[V] RESET-Filled | ${symbolSplit} - ${strategyDataSide} - ${strategyData?.OrderChange} | Bot: ${strategyData?.botName}`));
                                                                cancelAll({ botID, strategyID })
                                                                if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                                                                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                                                                    delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                                }
                                                                clearTimeoutMiss(botSymbolMissID)
                                                                resetMissData(botSymbolMissID)
                                                            }
                                                        }
                                                    })
                                                }, 2000)

                                            }
                                        }

                                        const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]
                                        const strategy = strategyData?.strategy
                                        const OCTrue = strategyData?.OC
                                        const TPTrue = strategyData?.TP

                                        if (strategy) {

                                            const strategyID = strategy.value
                                            const PositionSide = strategy.PositionSide
                                            const Market = strategy.market
                                            const OrderChangeFilled = Math.abs((+strategyData?.OrderChangeFilled || 0).toFixed(3))
                                            const OrderChange = strategy.OrderChange
                                            const AmountConfig = strategy.Amount
                                            // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen || strategy.coinOpen

                                            const scannerIDData = strategy?.scannerID
                                            const scannerID = scannerIDData?._id || "Manual"
                                            const scannerLabel = scannerIDData?.Label
                                            const scannerText = scannerIDData ? `\n<code>S: ${scannerLabel} 🌀</code>` : ""


                                            if (orderStatus === "filled" || orderStatus === "partially_filled") {

                                                if (OCTrue) {

                                                    botSymbolMissID = `${botID}-${symbol}-${instType}-${sideFilled}`
                                                    baoByBotAndSymbol[botID][symbol] = true

                                                    clearTimeoutMiss(botSymbolMissID)

                                                    let timeOut = 3000

                                                    if (orderStatus === "partially_filled") {
                                                        let qtyPartFilledOC = fillSzPart
                                                        if (sideFilled == "Buy") {
                                                            qtyPartFilledOC += fillFeePart
                                                        }
                                                        switch (instType) {

                                                            case "Futures": {
                                                                qtyPartFilledOC = fillSzPart * digitAllCoinObject[symbol]?.ctVal
                                                                break;
                                                            }
                                                        }

                                                        allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled = (allStrategiesByBotIDAndOrderID[botID][orderID]?.totalQtyPartFilled || 0) + qtyPartFilledOC
                                                        console.log(changeColorConsole.blueBright(`[V] PartiallyFilled OC ( ${botName} - ${sideFilled} - ${symbolSplit} ${handleIconMarketType(Market)} - ${OrderChangeFilled}% ): ${orderID} - ${qtyPartFilledOC}`));
                                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].PartiallyFilledOC = true
                                                    }

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true

                                                    const openTrade = priceFilled


                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.qtyFilled = qtyFilledAndFee

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.AmountFilled = AmountFilled

                                                    // Create TP

                                                    const TPNew = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrderTPTemp

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side = PositionSide === "Long" ? "Sell" : "Buy"

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.qty = qtyFilledAndFee

                                                    missTPDataBySymbol[botSymbolMissID].qtyOCFilled = qtyFilledAndFee

                                                    const dataInputOrderTP = {
                                                        strategy,
                                                        OrderChangeFilled,
                                                        strategyID,
                                                        symbol,
                                                        qty: roundQty({
                                                            price: qtyFilledAndFee,
                                                            symbol
                                                        }),
                                                        price: TPNew,
                                                        side: PositionSide === "Long" ? "Sell" : "Buy",
                                                        botName,
                                                        botID,
                                                        botData: botApiData,
                                                        telegramID,
                                                        telegramToken,
                                                        openTrade,
                                                    }


                                                    if (orderStatus === "filled") {
                                                        timeOut = 0
                                                        clearTimeout(allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc)
                                                        allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""
                                                    }

                                                    if (timeOut == 0) {

                                                        // const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChange}% • P: ${openTrade} • Q: ${qtyFilledOC.toFixed(2)} • A: ${AmountFilled}`
                                                        const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChangeFilled}% • P: ${openTrade} • A: ${AmountFilled}`
                                                        console.log(`\n\n[V] Filled OC: \n${teleTextFillOC} \nQty: ${qtyFilledAndFee}`)


                                                        // allStrategiesByBotIDAndOrderID[botID][orderID] = {
                                                        //     strategy,
                                                        //     TP: true
                                                        // }

                                                        handleSubmitOrderTP(dataInputOrderTP)


                                                        // setTimeout(() => {
                                                        //     if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilled) {
                                                        //         console.log(`[...] Moving Sl Down ${Sl_TRIGGER_PERCENT_AFTER}%`);

                                                        //         let newSlTriggerPx = 0
                                                        //         if (sideFilled === "Buy") {
                                                        //             newSlTriggerPx = openTrade - Sl_TRIGGER_PERCENT_AFTER * openTrade / 100
                                                        //         }
                                                        //         else {
                                                        //             newSlTriggerPx = Sl_TRIGGER_PERCENT_AFTER * openTrade / 100 + openTrade
                                                        //         }

                                                        //         newSlTriggerPx = roundPrice({
                                                        //             price: newSlTriggerPx,
                                                        //             tickSize: digitAllCoinObject[symbol]?.priceScale
                                                        //         })
                                                        //         handleMoveSLOrderOC({
                                                        //             ...dataInput,
                                                        //             side: sideFilled,
                                                        //             attachAlgoClOrdId,
                                                        //             newSlTriggerPx,
                                                        //             nguongDichSl: 0,
                                                        //             attachAlgoOrds
                                                        //         })
                                                        //     }
                                                        // }, 1000)

                                                        // listTPByCandleBot[botID] = listTPByCandleBot[botID] || {
                                                        //     listOC: {},
                                                        //     ApiKey,
                                                        //     SecretKey,
                                                        //     Password
                                                        // }

                                                        // setTimeout(() => {
                                                        //     listTPByCandleBot[botID].listOC[strategyID] = {
                                                        //         strategyID,
                                                        //         strategy,
                                                        //         symbol,
                                                        //         side: PositionSide === "Long" ? "Sell" : "Buy",
                                                        //         botName,
                                                        //         botID,
                                                        //         botData: botApiData,
                                                        //     }
                                                        // }, TP_TIME_AMEND_DELAY)

                                                        sendMessageWithRetryWait({
                                                            messageText: teleTextFillOC,
                                                            telegramID,
                                                            telegramToken,
                                                        })
                                                    }
                                                    else {

                                                        if (!allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc) {
                                                            allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = setTimeout(() => {
                                                                const totalQtyPartFilledOC = allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled
                                                                // const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Part_Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChange}% • P: ${openTrade} • Q: ${qtyFilledAndFee.toFixed(2)} • A: ${AmountFilled}`
                                                                const teleTextFillOC = `<b>${symbolSplit} ${handleIconMarketType(Market)}</b> | Part_Filled ${PositionSide} ${scannerText} \nB: ${botName} • OC: ${OrderChangeFilled}% • P: ${openTrade} • A: ${AmountFilled}`
                                                                console.log(`\n\n[V] Part_Filled OC: \n${teleTextFillOC}\nQty: ${totalQtyPartFilledOC}`)

                                                                console.log(changeColorConsole.cyanBright(`[V] Close OC Filled ( ${OrderChangeFilled}% ) ( ${botName} - ${sideFilled} - ${symbolSplit} ${handleIconMarketType(Market)} ) After ${timeOut}`));
                                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true

                                                                dataInputOrderTP.qty = roundQty({
                                                                    price: totalQtyPartFilledOC,
                                                                    symbol
                                                                })

                                                                allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""

                                                                handleCancelOrderOCPartFill({
                                                                    strategyID,
                                                                    strategy,
                                                                    symbol,
                                                                    side: PositionSide === "Long" ? "Buy" : "Sell",
                                                                    botData: botDataMain,
                                                                    OrderChange: OrderChangeFilled,
                                                                    orderId: ordId,
                                                                    // qty: qtyFilledAndFee,
                                                                    handleOrderTP: () => {
                                                                        handleSubmitOrderTP(dataInputOrderTP)
                                                                    }
                                                                })

                                                                sendMessageWithRetryWait({
                                                                    messageText: teleTextFillOC,
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

                                                    delete baoByBotAndSymbol?.[botID]?.[symbol]

                                                    clearTimeoutMiss(botSymbolMissID)

                                                    if (orderStatus === "partially_filled") {
                                                        console.log(changeColorConsole.blueBright(`[V] PartiallyFilled TP ( ${botName} - ${sideFilled} - ${symbolSplit} ${handleIconMarketType(Market)} - ${OrderChangeFilled}% ):`, fillSzPart));
                                                        allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled = (allStrategiesByBotIDAndOrderID[botID][orderID]?.totalQtyPartFilled || 0) + qtyFilled
                                                        missTPDataBySymbol[botSymbolMissID].PartiallyFilledTP = true
                                                    }
                                                    let timeOut = TIME_MARKET_TP

                                                    if (orderStatus === "filled") {
                                                        timeOut = 0
                                                        clearTimeout(allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc)
                                                        allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = ""
                                                    }

                                                    if (timeOut == 0) {
                                                        missTPDataBySymbol[botSymbolMissID].PartiallyFilledTP = false

                                                        const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.openTrade
                                                        const qtyOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.qtyFilled
                                                        const AmountOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.AmountFilled

                                                        let qtyFilledTP = qtyFilled

                                                        switch (instType) {

                                                            case "Futures": {
                                                                qtyFilledTP = qtyFilled * digitAllCoinObject[symbol]?.ctVal
                                                                break;
                                                            }
                                                        }



                                                        const openTradeTPFilled = roundPrice({
                                                            price: priceFilled,
                                                            tickSize: digitAllCoinObject[symbol]?.priceScale
                                                        })

                                                        const hieuExitEntry = (+openTradeTPFilled) - openTradeOCFilled
                                                        let priceWin = hieuExitEntry * qtyFilledTP

                                                        if (PositionSide == "Short") {
                                                            priceWin = priceWin * -1
                                                        }

                                                        const priceWinNotFee = priceWin.toFixed(3) || 0
                                                        priceWin = (priceWin - AmountFilled * 0.15 / 100).toFixed(3) || 0

                                                        // const feeTP = Math.abs(fillFee)
                                                        // if (PositionSide == "Long" || Market == "Futures") {
                                                        //     priceWin2 = priceWin2 - feeTP
                                                        // }
                                                        // else {
                                                        //     priceWin2 = priceWin2 - ((+openTradeTPFilled) - openTradeOCFilled) * feeTP
                                                        // }


                                                        // const priceWinPercent = Math.abs(priceWinNotFee / AmountFilled * 100).toFixed(2) || 0;
                                                        const priceWinPercent = Math.abs(hieuExitEntry / openTradeOCFilled * 100).toFixed(2) || 0;

                                                        // let priceWin = +((+dataMain.pnl).toFixed(3))
                                                        // const priceWinPercent = Math.abs(priceWin / AmountFilled * 100).toFixed(2) || 0;

                                                        let textWinLose = ""
                                                        let textWinLoseShort = ""
                                                        let textThongKeWinLose = ""

                                                        const thongKeID = `${botID}`
                                                        const thongKeIDByConfig = `${botID}-${strategyID}`
                                                        thongKeWinLoseByBot[thongKeIDByConfig] = thongKeWinLoseByBot[thongKeIDByConfig] || { Win: 0, Lose: 0 }
                                                        clearVWinLose[thongKeID] = clearVWinLose[thongKeID] || { Win: 0, Lose: 0, WinMoney: 0, LoseMoney: 0 }
                                                        clearVWinLose[thongKeID].scannerID = scannerID !== "Manual" ? scannerID : ""
                                                        const priceWinABS = Math.abs(priceWin)

                                                        if (priceWin > 0) {
                                                            textWinLose = `WIN: ${priceWin}$ • ${priceWinPercent}%`
                                                            textWinLoseShort = "✅"
                                                            console.log(changeColorConsole.greenBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsWin = true
                                                            thongKeWinLoseByBot[thongKeIDByConfig].Win++
                                                            clearVWinLose[thongKeID].Win++
                                                            clearVWinLose[thongKeID].WinMoney += priceWinABS
                                                        }
                                                        else {
                                                            textWinLose = `LOSE: ${priceWin}$ • ${priceWinPercent * -1}%`
                                                            textWinLoseShort = "❌"
                                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLose = true
                                                            allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLosePercent = priceWinPercent
                                                            thongKeWinLoseByBot[thongKeIDByConfig].Lose++
                                                            clearVWinLose[thongKeID].Lose++
                                                            clearVWinLose[thongKeID].LoseMoney += priceWinABS
                                                        }

                                                        textThongKeWinLose = `<i>( ${thongKeWinLoseByBot[thongKeIDByConfig].Win} W - ${thongKeWinLoseByBot[thongKeIDByConfig].Lose} L )</i>`


                                                        // const teleText = `<b>${textWinLoseShort} ${symbolSplit} ${handleIconMarketType(Market)}</b> ${PositionSide} ${textThongKeWinLose} \n${textWinLose} ${scannerText} \nB: ${botName} • OC: ${OrderChange}% \nOC | P: ${openTradeOCFilled} • Q: ${Math.abs(qtyOCFilled).toFixed(2)} • A: ${AmountOCFilled}\nTP | P: ${openTradeTPFilled} • Q: ${qtyFilledTP.toFixed(2)}  A: ${AmountFilled}`
                                                        const teleText = `<b>${textWinLoseShort} ${symbolSplit} ${handleIconMarketType(Market)}</b> ${PositionSide} ${textThongKeWinLose} \n${textWinLose} ${scannerText} \nB: ${botName} • OC: ${OrderChangeFilled}% \nOC | P: ${openTradeOCFilled} • A: ${AmountOCFilled}\nTP | P: ${openTradeTPFilled} • A: ${AmountFilled}`

                                                        console.log(`[V] Filled TP: \n${teleText} \nQtyOC: ${qtyOCFilled} | QtyTP: ${qtyFilledTP}`)

                                                        cancelAll({ strategyID, botID })

                                                        clearTimeoutMiss(botSymbolMissID)

                                                        if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.IsDeleted) {
                                                            delete allStrategiesByCandleAndSymbol[symbol][strategyID]
                                                            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
                                                        }

                                                        resetMissData(botSymbolMissID)

                                                        clearVWinLose[thongKeID].text = `${scannerText} \nBot: ${botName}`

                                                        sendMessageWithRetryWait({
                                                            messageText: teleText,
                                                            telegramID,
                                                            telegramToken,
                                                        })
                                                    }
                                                    // else {

                                                    //     if (!allStrategiesByBotIDAndOrderID[botID]?.[orderID]?.timeOutFunc) {
                                                    //         allStrategiesByBotIDAndOrderID[botID][orderID].timeOutFunc = setTimeout(async () => {
                                                    //             const sidePartFilled = Math.abs(dataMain.sz) - allStrategiesByBotIDAndOrderID[botID][orderID].totalQtyPartFilled
                                                    //             console.log(changeColorConsole.blueBright(`[V] Close TP ( ${OrderChange}% ) Filled ( ${botName} - ${sideFilled} - ${symbolSplit} ${handleIconMarketType(Market)} ) After ${timeOut}: ${sidePartFilled}`));
                                                    //             allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
                                                    //             sidePartFilled && handleCloseMarket({
                                                    //                 symbol,
                                                    //                 side: PositionSide == "Long" ? "Buy" : "Sell",
                                                    //                 botID,
                                                    //                 botData: botDataMain,
                                                    //                 strategy,
                                                    //                 market: Market
                                                    //             })
                                                    //         }, timeOut)
                                                    //     }

                                                    // }

                                                }

                                            }
                                            else if (orderStatus === "canceled") {
                                                // console.log("[X] Cancelled");
                                                // Khớp TP
                                                if (TPTrue) {
                                                    console.log(`[-] Cancelled TP ( ${botName} - ${PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} ${handleIconMarketType(strategy.market)} - ${OrderChange} ) - Chốt lời `);

                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP = {}
                                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderIDConfirm = true
                                                    delete listTPByCandleBot?.[botID]?.listOC?.[strategyID]

                                                    let qtyFilledTP = qtyFilled

                                                    switch (instType) {

                                                        case "Futures": {
                                                            qtyFilledTP = qtyFilled * digitAllCoinObject[symbol]?.ctVal
                                                            break;
                                                        }
                                                    }

                                                    missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qtyFilledTP)

                                                }
                                                else if (OCTrue) {
                                                    console.log(`[-] Cancelled OC ( ${botName} - ${PositionSide === "Long" ? "Buy" : "Sell"} - ${symbol} ${handleIconMarketType(strategy.market)} - ${OrderChange} ): ${orderID} `);
                                                    if (allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID] && !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderIDConfirm) {
                                                        cancelAll({ botID, strategyID })
                                                    }
                                                }
                                            }


                                        }
                                        // User cancel vị thế ( Limit )
                                        if (!orderID && (orderStatus === "live" || orderStatus === "filled") && ordType !== "market") {

                                            console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Limit) - ( ${symbol} ${handleIconMarketType(instType)} - ${sideFilled}  )`)

                                            // const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP

                                            // listMiss?.length > 0 && await handleCancelAllOrderTP({
                                            //     items: listMiss.map((orderIdTPData) => ({
                                            //         ApiKey,
                                            //         SecretKey,
                                            //         strategyID: orderIdTPData?.strategyID,
                                            //         symbol,
                                            //         side: sideFilled,
                                            //         orderId: orderIdTPData?.orderID,
                                            //         botID,
                                            //         botName
                                            //     }))
                                            // })

                                            clearTimeoutMiss(botSymbolMissID)

                                            resetMissData(botSymbolMissID)

                                            // missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                                            //     orderID: dataMain.orderId,
                                            // })
                                            missTPDataBySymbol[botSymbolMissID].size = Math.abs(qtyFilled)
                                        }
                                        // User cancel vị thế ( Market )
                                        if (ordType === "market") {


                                            console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} ${handleIconMarketType(instType)} - ${sideFilled} )`)

                                            clearTimeoutMiss(botSymbolMissID)

                                            resetMissData(botSymbolMissID)
                                        }
                                    } catch (error) {
                                        console.log(`[!] Handle Order Filled Error: ${error}`);
                                    }
                                }
                                // }
                            }

                            // else if (topicMain === "balance_and_position") {
                            //     const balData = dataMain.balData

                            //     IsActive && await Promise.allSettled(balData.map(async (posDataItem) => {

                            //         const symbolRes = posDataItem.ccy
                            //         const symbol = `${symbolRes}-USDT`

                            //         // if (!blockCheckMissSpotBySymbol?.[`${botID}-${symbol}`]?.notCheckMiss) {

                            //         const symbolSplit = symbolRes

                            //         const botSymbolMissID = `${botID}-${symbol}-Spot`
                            //         !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                            //         if (symbolRes !== "USDT") {
                            //             const size = Math.abs(posDataItem.cashBal)
                            //             try {
                            //                 if (size > Math.abs(digitAllCoinObject[symbol]?.minOrderQty)) {

                            //                     if (size != missTPDataBySymbol[botSymbolMissID].sizeTotal) {
                            //                         clearTimeoutMiss(botSymbolMissID)
                            //                     }

                            //                     missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                            //                     if (!missTPDataBySymbol[botSymbolMissID]?.timeOutFunc) {

                            //                         missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                            //                             const size = Math.abs(posDataItem.cashBal)

                            //                             const side = "Buy"


                            //                             if (size > Math.abs(digitAllCoinObject[symbol]?.minOrderQty)) {

                            //                                 const missSize = size

                            //                                 const teleText = `<b>⚠️ MISS | ${symbolSplit} ${handleIconMarketType("Spot")}</b> • ${side} • Bot: ${botName} • Qty: ${missSize}`
                            //                                 console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));
                            //                                 missByBotIDAndSymbol[botID] = missByBotIDAndSymbol[botID] || {}
                            //                                 missByBotIDAndSymbol[botID][symbol] = true
                            //                                 // const TPNew = missTPDataBySymbol[botSymbolMissID].priceOrderTP

                            //                                 missTPDataBySymbol[botSymbolMissID].side = side


                            //                                 const dataInput = {
                            //                                     symbol,
                            //                                     // qty: roundQty({
                            //                                     //     price: missSize,
                            //                                     //     tickSize: digitAllCoinObject[symbol]?.basePrecision
                            //                                     // }),
                            //                                     qty: missSize.toString(),
                            //                                     side,
                            //                                     botData: botDataMain,
                            //                                     botID,
                            //                                     missState: true,
                            //                                     market: "Spot",
                            //                                 }

                            //                                 console.log(changeColorConsole.magentaBright(`[...] Close TP Miss Balance | QTY: ${dataInput.qty} `));

                            //                                 sendMessageWithRetryWait({
                            //                                     messageText: teleText,
                            //                                     telegramID,
                            //                                     telegramToken
                            //                                 })

                            //                                 handleCloseMarket(dataInput)

                            //                             }
                            //                             else {
                            //                                 console.log(`[_ Not Miss _] TP Balance ( ${botName} - ${side} - ${symbol} ${handleIconMarketType(symbol)}} )`);

                            //                             }

                            //                         }, 10 * 1000)
                            //                     }
                            //                 }
                            //                 else {
                            //                     clearTimeoutMiss(botSymbolMissID)
                            //                 }
                            //             } catch (error) {
                            //                 console.log("error check miss balance", error);
                            //             }
                            //         }
                            //         // }
                            //     }))


                            // }
                            else if (topicMain === "positions") {
                                if (IsActive) {

                                    const posDataItem = dataMain
                                    const symbol = posDataItem.instId
                                    const Market = handleMarketText(posDataItem.instType)

                                    const symbolSplit = symbol.split("-")[0]

                                    let size

                                    if (posDataItem.liabCcy !== "USDT") {
                                        size = +posDataItem.liab
                                    }
                                    else {
                                        size = +posDataItem.pos
                                    }

                                    let side = size > 0 ? "Buy" : "Sell"

                                    if (Market == "Futures") {
                                        side = posDataItem.posSide == "long" ? "Buy" : "Sell"
                                        size = +posDataItem.pos
                                    }

                                    size = Math.abs(size).toString()
                                    const botSymbolMissID = `${botID}-${symbol}-${Market}-${side}`

                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData(botSymbolMissID)

                                    try {
                                        if (size > 0) {
                                            if (size != missTPDataBySymbol[botSymbolMissID].sizeTotal) {
                                                clearTimeoutMiss(botSymbolMissID)

                                                if (Market == "Margin" && size > 0 && size < Math.abs(digitAllCoinObject[symbol]?.minOrderQty) * 2 && !missTPDataBySymbol[botSymbolMissID]?.PartiallyFilledTP) {
                                                    console.log(changeColorConsole.magentaBright(`[...] Close Dư ViThe ( ${botName} - ${symbolSplit} ${handleIconMarketType(Market)} - ${side} ) | Size: ${size} `));
                                                    const dataInput = {
                                                        symbol,
                                                        side,
                                                        botData: botDataMain,
                                                        botID,
                                                        missState: true,
                                                        sendTele: false,
                                                        market: Market,
                                                        qty: +size
                                                    }

                                                    handleCloseMarket(dataInput)
                                                }
                                            }

                                            missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                            // if (!missTPDataBySymbol[botSymbolMissID]?.timeOutFunc) {
                                            //     missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {


                                            //         if (size > missTPDataBySymbol[botSymbolMissID]?.size) {
                                            //             const missSize = size - missTPDataBySymbol[botSymbolMissID]?.size || 0

                                            //             const teleText = `<b>⚠️ MISS | ${symbolSplit} ${handleIconMarketType(Market)}</b> • ${side} • Bot: ${botName} • Qty: ${missSize}`

                                            //             console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));

                                            //             missByBotIDAndSymbol[botID] = missByBotIDAndSymbol[botID] || {}
                                            //             missByBotIDAndSymbol[botID][symbol] = true
                                            //             // const TPNew = missTPDataBySymbol[botSymbolMissID].priceOrderTP


                                            //             missTPDataBySymbol[botSymbolMissID].side = side


                                            //             const dataInput = {
                                            //                 symbol,
                                            //                 // qty: roundQty({
                                            //                 //     price: missSize,
                                            //                 //     tickSize: digitAllCoinObject[symbol]?.basePrecision
                                            //                 // }),
                                            //                 side,
                                            //                 botData: botDataMain,
                                            //                 botID,
                                            //                 missState: true,
                                            //                 market: Market,
                                            //             }

                                            //             console.log(changeColorConsole.magentaBright(`[...] Close TP Miss Position | QTY: ${missSize} `));

                                            //             sendMessageWithRetryWait({
                                            //                 messageText: teleText,
                                            //                 telegramID,
                                            //                 telegramToken
                                            //             })

                                            //             handleCloseMarket(dataInput)

                                            //         }
                                            //         else {
                                            //             console.log(`[_ Not Miss _] TP ( ${botName} - ${side} - ${symbol} ${handleIconMarketType(Market)}} )`);

                                            //         }
                                            //     }, 10 * 1000)
                                            // }
                                        }
                                        else {
                                            clearTimeoutMiss(botSymbolMissID)
                                        }

                                    } catch (error) {
                                        console.log("error check miss pos", error);
                                    }
                                }
                            }

                        }))
                    })

                    wsOrder.on('close', () => {
                        console.log('Connection order closed');
                    });

                    wsOrder.on('reconnected', () => {
                        if (connectByBotError[botID]?.error) {
                            const botDataMain = botApiList[botID]

                            const telegramID = botDataMain?.telegramID
                            const telegramToken = botDataMain?.telegramToken

                            const text = `🔰 ${botName} khôi phục kết nối thành công`
                            console.log(text);
                            console.log(`[V] Reconnected Bot ( ${botName} ) successful`)
                            sendMessageWithRetryWait({
                                messageText: text,
                                telegramID,
                                telegramToken
                            })

                            connectByBotError[botID].error = false

                            // const listOCByBot = listOCByCandleBot?.[botID]
                            // const listObject = listOCByBot?.listOC
                            // listOCByBot && handleCancelAllOrderOC([listOCByBot])

                            // listObject && Object.values(listObject).map(strategyData => {
                            //     const strategyID = strategyData.strategyID
                            //     cancelAll({ botID, strategyID })

                            //     console.log(`[V] RESET-Reconnected | ${strategyData.symbol.split("-")[0]} - ${strategyData.side} - Bot: ${strategyData.botName}`);
                            // })
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
const handleSocketListKline2 = async (listKlineInput = []) => {

    const length = listKlineInput.length
    try {
        wsSymbol2.subscribe(listKlineInput)
        console.log(`[V] Subscribe ${length} kline2 success\n`);
    } catch (err) {
        console.log(`[!] Subscribe ${length} kline2 error: ${err}`,)
    }

}
const handleSocketListKline3 = async (listKlineInput = []) => {

    const length = listKlineInput.length
    try {
        wsPublic.subscribe(listKlineInput)
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
    return botData.botID?.Status === "Running" && botData.botID?.ApiKey && botData.botID?.SecretKey
}

// ----------------------------------------------------------------------------------
const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
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
const formatTime = time => new Date(time).toLocaleString()

const handleTinhOC = (data) => {
    const Close = +data.close
    const Open = +data.open
    const Highest = +data.high
    const Lowest = +data.low
    const vol = +data.turnover
    const timestamp = +data.timestamp

    let OC = (Highest - Open) / Open
    let TP = Math.abs((Highest - Close) / (Highest - Open)) || 0
    let OCLong = (Lowest - Open) / Open
    let TPLong = Math.abs(Close - Lowest) / (Open - Lowest) || 0


    if ([Infinity, -Infinity].includes(OC)) {
        OC = 0
    }

    if ([Infinity, -Infinity].includes(OCLong)) {
        OCLong = 0
    }
    if ([Infinity, -Infinity].includes(TP)) {
        TP = 0
    }

    if ([Infinity, -Infinity].includes(TPLong)) {
        TPLong = 0
    }

    const OCRound = roundNumber(OC)
    const TPRound = roundNumber(TP)
    const OCLongRound = roundNumber(OCLong)
    const TPLongRound = roundNumber(TPLong)
    return {
        OCRound,
        TPRound,
        OCLongRound,
        TPLongRound,
        vol,
        timestamp
    }
}

const tinhOC = (symbol, data = {}) => {

    const {
        OCRound,
        TPRound,
        OCLongRound,
        TPLongRound,
        vol,
        timestamp
    } = handleTinhOC(data)


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
        const Alpha = +scannerData.Alpha || 0
        const OrderChange = Math.abs(scannerData.OrderChange)
        const Elastic = Math.abs(scannerData.Elastic)
        const Turnover = Math.abs(scannerData.Turnover)
        const MaxTurnover = Math.abs(scannerData.MaxTurnover)
        const Market = scannerData.Market
        const scannerID = scannerData._id
        const botData = scannerData.botID
        const botID = botData._id
        const botName = botApiList[botID]?.botName || botData.botName
        const scannerDataLabel = scannerData.Label
        const scannerFourB = scannerData?.FourB
        const IsBeta = scannerData?.IsBeta

        // const checkRunScan = !scannerData?.IsBeta ? true : !(BTCPumpPercent >= 1 || baoByBotAndSymbol[botID]?.nangOC)
        const checkRunScan = !(BTCPumpPercent >= .8 || baoByBotAndSymbol[botID]?.nangOC)

        if (checkRunScan && scannerData.IsActive && botApiList[botID]?.IsActive) {

            const creatingListConfigIDByScannerID = `${scannerID}-${symbol}`
            creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = creatingListConfigIDByScanner[creatingListConfigIDByScannerID] || false
            if (!creatingListConfigIDByScanner[creatingListConfigIDByScannerID]) {

                const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]
                const checkVolTrue = vol >= Turnover && (scannerData.Amount * scannerData.Numbs) <= vol / 5
                let checkMaxVol = true
                if (MaxTurnover > 0 && Turnover > 0) {
                    checkMaxVol = vol <= Turnover * MaxTurnover
                }

                // FIND MAX CANDLE PRE BETA
                let OCPreMaxBeta = 0
                if (IsBeta) {
                    OCPreMaxBeta = historyCandleBeta[symbol]?.reduce((max, item) => {
                        return Math.max(max, Math.abs(item.OCRound), Math.abs(item.OCLongRound));
                    }, -Infinity);
                }

                if (PositionSide === "Long") {

                    const OCLongRoundAbs = Math.abs(OCLongRound)

                    if (OCLongRoundAbs >= OrderChange && (IsBeta ? OCLongRoundAbs >= OCPreMaxBeta : true)) {
                        const symbolSplit = symbol.split("-")[0]
                        const htLong = (`\n[RADA-${Market}] | ${scannerDataLabel} - ${symbolSplit} - OC: ${OCLongRound}% - TP: ${TPLongRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(timestamp)}`)

                        if (TPLongRound >= Elastic && checkVolTrue && checkMaxVol) {
                            // console.log(dataAll);
                            if (!listConfigIDByScannerData?.length) {
                                console.log(changeColorConsole.cyanBright(htLong));

                                // HANDLE RACEME MODE
                                let createState = false
                                // if (scannerData?.Raceme || (PumpStatusBySymbol?.[symbol]?.nangOC && scannerData?.IsBeta)) {
                                if (scannerData?.Raceme || PumpStatusBySymbol?.[symbol]?.nangOC) {
                                    const timeCheckRaceMe = !scannerData?.Raceme ? 5 : 10
                                    const raceDataPre = raceMeData[scannerID]?.[symbol]
                                    if (raceDataPre) {
                                        const volPre = raceDataPre.vol
                                        if (Date.now() - raceDataPre.time <= timeCheckRaceMe * 1000) {
                                            if (scannerData?.Raceme) {
                                                // const volMiddleSumData = raceMeData[scannerID][symbol].volMiddleSum
                                                // if (volMiddleSumData?.length > 0) {
                                                //     const volMiddleAverage = volMiddleSumData.reduce((sum, num) => sum + num, 0) / volMiddleSumData.length
                                                //     // if (volPre * (1 - 0.5) < vol && vol < volPre * (1 + 0.5) && volMiddleAverage <= vol / 50) {
                                                //     if (volMiddleAverage <= vol / 50) {
                                                //         createState = true
                                                //     }
                                                // }
                                                createState = true
                                            }
                                            else {
                                                createState = true
                                            }
                                        }
                                    }
                                    raceMeData[scannerID] = raceMeData[scannerID] || {}
                                    raceMeData[scannerID][symbol] = {
                                        time: Date.now(),
                                        vol,
                                        volMiddleSum: []

                                    }
                                }
                                else {
                                    createState = true
                                }
                                if (createState) {
                                    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = true;
                                    switch (Market) {
                                        case "Spot": {
                                            handleCreateMultipleConfigSpot({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs,
                                                }),
                                                vol,
                                                dataBeta: IsBeta ? `OC: ${OrderChange} • OCScan: ${OCLongRoundAbs} • OCMax: ${OCPreMaxBeta}` : ""
                                            })
                                            break
                                        }
                                        case "Margin": {
                                            handleCreateMultipleConfigMargin({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs
                                                }),
                                                vol,
                                                dataBeta: IsBeta ? `OC: ${OrderChange} • OCScan: ${OCLongRoundAbs} • OCMax: ${OCPreMaxBeta}` : ""

                                            })
                                            break
                                        }
                                        case "Futures": {
                                            handleCreateMultipleConfigFutures({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs
                                                }),
                                                vol,
                                                dataBeta: IsBeta ? `OC: ${OrderChange} • OCScan: ${OCLongRoundAbs} • OCMax: ${OCPreMaxBeta}` : ""

                                            })
                                            break
                                        }
                                    }
                                    delete raceMeData[scannerID]?.[symbol]
                                }
                            }
                            else {
                                if (scannerFourB) {
                                    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = true;

                                    console.log(changeColorConsole.cyanBright(htLong));

                                    console.log(changeColorConsole.magentaBright(`\n[4B-Long] Update ${scannerData.Numbs} Config OC ${Market} ( ${botName} - ${symbol} - ${PositionSide} )`));
                                    switch (Market) {
                                        case "Spot": {
                                            handleCreateMultipleConfigSpot4B({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs
                                                }),
                                                vol,
                                                listConfigIDByScannerData
                                            })
                                            break
                                        }
                                        case "Margin": {
                                            handleCreateMultipleConfigMargin4B({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs
                                                }),
                                                vol,
                                                listConfigIDByScannerData
                                            })
                                            break
                                        }
                                        case "Futures": {
                                            handleCreateMultipleConfigFutures4B({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCLongRoundAbs
                                                }),
                                                vol,
                                                listConfigIDByScannerData
                                            })
                                            break
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            if (scannerFourB && listConfigIDByScannerData?.length > 0) {
                                console.log(changeColorConsole.cyanBright(htLong));

                                if (listConfigIDByScannerData.every(strategy => {
                                    const strategyID = strategy.value
                                    return !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                                })) {
                                    // Delete config
                                    console.log(changeColorConsole.redBright(`\n[4B-Long] Delete ${scannerData.Numbs} Config OC ${Market} ( ${botName} - ${symbol} - ${PositionSide} )`));
                                    handleSocketDelete(listConfigIDByScannerData, false)

                                    await Promise.allSettled(listConfigIDByScannerData.map(async (strategy, index) => {
                                        const scannerLabel = strategy?.scannerID?.Label
                                        const configID = strategy._id
                                        switch (strategy.market) {
                                            case "Spot":
                                                {
                                                    offSuccess = await offConfigSpotBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    })
                                                    break
                                                }
                                            case "Margin":
                                                {
                                                    offSuccess = await offConfigMarginBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    });
                                                    await handleSetLeverForBotAndSymbol({
                                                        botID,
                                                        symbol,
                                                        lever: 10,
                                                        side,
                                                        leverID
                                                    })
                                                    break
                                                }
                                            case "Futures":
                                                {
                                                    offSuccess = await offConfigFuturesBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    });
                                                    break
                                                }
                                        }
                                    }))

                                    const strategy = listConfigIDByScannerData.find(strategy => {
                                        const strategyID = strategy.value
                                        return strategy.preIsLose && allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.preIsLosePercent >= LOSE_PERCENT
                                    })
                                    if (strategy) {

                                        if (!strategy?.Reverse) {

                                            // add blacklist
                                            if (scannerID) {

                                                const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]

                                                addSymbolToBlacklistBE({
                                                    scannerID,
                                                    symbol,
                                                    Market
                                                })

                                                if (scannerDataUpdate) {
                                                    const newScannerDataUpdate = { ...scannerDataUpdate }
                                                    newScannerDataUpdate.Blacklist.push(symbol)
                                                    handleSocketScannerUpdate([newScannerDataUpdate] || [])
                                                }
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    }

                }
                else {
                    const OCRoundAbs = Math.abs(OCRound)

                    if (OCRoundAbs >= OrderChange && (IsBeta ? OCRoundAbs >= OCPreMaxBeta : true)) {
                        const symbolSplit = symbol.split("-")[0]
                        const ht = (`\n[RADA-${Market}] | ${scannerDataLabel} - ${symbolSplit} - OC: ${OCRound}% - TP: ${TPRound}% - VOL: ${formatNumberString(vol)} - ${formatTime(timestamp)}`)

                        if (TPRound >= Elastic && checkVolTrue && checkMaxVol) {
                            // console.log(dataAll);
                            if (!listConfigIDByScannerData?.length) {
                                console.log(changeColorConsole.cyanBright(ht));

                                // HANDLE RACEME MODE
                                let createState = false
                                if (scannerData?.Raceme || PumpStatusBySymbol?.[symbol]?.nangOC) {
                                    const timeCheckRaceMe = !scannerData?.Raceme ? 5 : 10
                                    const raceDataPre = raceMeData[scannerID]?.[symbol]
                                    if (raceDataPre) {
                                        const volPre = raceDataPre.vol
                                        if (Date.now() - raceDataPre.time <= timeCheckRaceMe * 1000) {
                                            if (scannerData?.Raceme) {

                                                // const volMiddleSumData = raceMeData[scannerID][symbol].volMiddleSum
                                                // if (volMiddleSumData?.length > 0) {
                                                //     const volMiddleAverage = volMiddleSumData.reduce((sum, num) => sum + num, 0) / volMiddleSumData.length
                                                //     // if (volPre * (1 - 0.5) < vol && vol < volPre * (1 + 0.5) && volMiddleAverage <= vol / 50) {
                                                //     if (volMiddleAverage <= vol / 50) {
                                                //         createState = true
                                                //     }
                                                // }
                                                createState = true
                                            }
                                            else {
                                                createState = true
                                            }
                                        }
                                    }
                                    raceMeData[scannerID] = raceMeData[scannerID] || {}
                                    raceMeData[scannerID][symbol] = {
                                        time: Date.now(),
                                        vol,
                                        volMiddleSum: []
                                    }
                                }
                                else {
                                    createState = true
                                }

                                if (createState) {
                                    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = true;
                                    switch (Market) {
                                        case "Margin": {
                                            handleCreateMultipleConfigMargin({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCRoundAbs
                                                }),
                                                vol,
                                                dataBeta: IsBeta ? `OC: ${OrderChange} • OCScan: ${OCRoundAbs} • OCMax: ${OCPreMaxBeta}` : ""

                                            })
                                            break
                                        }
                                        case "Futures": {
                                            handleCreateMultipleConfigFutures({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCRoundAbs
                                                }),
                                                vol,
                                                dataBeta: IsBeta ? `OC: ${OrderChange} • OCScan: ${OCRoundAbs} • OCMax: ${OCPreMaxBeta}` : ""
                                            })
                                            break
                                        }
                                    }
                                    delete raceMeData[scannerID]?.[symbol]
                                }

                            }
                            else {
                                if (scannerFourB) {
                                    creatingListConfigIDByScanner[creatingListConfigIDByScannerID] = true;

                                    console.log(changeColorConsole.cyanBright(ht));

                                    console.log(changeColorConsole.magentaBright(`\n[4B-Short] Update ${scannerData.Numbs} Config OC ${Market} ( ${botName} - ${symbol} - ${PositionSide} )`));
                                    switch (Market) {
                                        case "Margin": {
                                            handleCreateMultipleConfigMargin4B({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCRoundAbs
                                                }),
                                                vol,
                                                listConfigIDByScannerData
                                            })
                                            break
                                        }
                                        case "Futures": {
                                            handleCreateMultipleConfigFutures4B({
                                                scannerData,
                                                symbol,
                                                botName,
                                                OC: handleNewOCScanner({
                                                    Alpha,
                                                    OC: OrderChange,
                                                    OCScan: OCRoundAbs
                                                }),
                                                vol,
                                                listConfigIDByScannerData
                                            })
                                            break
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            if (scannerFourB && listConfigIDByScannerData?.length > 0) {
                                console.log(changeColorConsole.cyanBright(ht));

                                if (listConfigIDByScannerData.every(strategy => {
                                    const strategyID = strategy.value
                                    return !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                                })) {

                                    // Delete config
                                    console.log(changeColorConsole.redBright(`\n[4B-Short] Delete ${scannerData.Numbs} Config OC ${Market} ( ${botName} - ${symbol} - ${PositionSide} )`));
                                    handleSocketDelete(listConfigIDByScannerData, false)
                                    await Promise.allSettled(listConfigIDByScannerData.map(async (strategy, index) => {
                                        const scannerLabel = strategy?.scannerID?.Label
                                        const configID = strategy._id
                                        switch (strategy.market) {
                                            case "Spot":
                                                {
                                                    offSuccess = await offConfigSpotBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    })
                                                    break
                                                }
                                            case "Margin":
                                                {
                                                    offSuccess = await offConfigMarginBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    });
                                                    await handleSetLeverForBotAndSymbol({
                                                        botID,
                                                        symbol,
                                                        lever: 10,
                                                        side,
                                                        leverID
                                                    })
                                                    break
                                                }
                                            case "Futures":
                                                {
                                                    offSuccess = await offConfigFuturesBE({
                                                        configID,
                                                        symbol,
                                                        strategy,
                                                        botName,
                                                        scannerLabel,
                                                        AmountOld: strategy.AmountOld
                                                    });
                                                    break
                                                }
                                        }
                                    }))

                                    const strategy = listConfigIDByScannerData.find(strategy => {
                                        const strategyID = strategy.value
                                        return strategy.preIsLose && allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.preIsLosePercent >= LOSE_PERCENT
                                    })
                                    if (strategy) {

                                        if (!strategy?.Reverse) {

                                            // add blacklist
                                            if (scannerID) {

                                                const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]

                                                addSymbolToBlacklistBE({
                                                    scannerID,
                                                    symbol,
                                                    Market
                                                })

                                                if (scannerDataUpdate) {
                                                    const newScannerDataUpdate = { ...scannerDataUpdate }
                                                    newScannerDataUpdate.Blacklist.push(symbol)
                                                    handleSocketScannerUpdate([newScannerDataUpdate] || [])
                                                }
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    }
                }

            }
        }

        if (raceMeData?.[scannerID]?.[symbol]) {
            raceMeData[scannerID][symbol].volMiddleSum.push(vol)
        }

    }))

    historyCandleBeta[symbol] = historyCandleBeta[symbol] || Array(30).fill({
        OCRound,
        OCLongRound,
        vol,
    });
    historyCandleBeta[symbol].push({
        OCRound,
        OCLongRound,
        vol,
    })
    if (historyCandleBeta[symbol].length > 30) {
        historyCandleBeta[symbol].shift()
    }


    // handlePump1D({
    //     OCRound,
    //     TPRound,
    //     OCLongRound,
    //     TPLongRound,
    //     timestamp,
    //     data,
    //     instId: symbol
    // })

}
// ----------------------------------------------------------------------------------

const getDataCandleFilled = async () => {
    try {
        const data = await clientPublic.getHistoricCandlesV2({
            instId: "KAITO-USDT-SWAP",
            bar: '1s',
            after: "1740194060584",
            limit: 1
        })
        const dataMain = data[0]
        console.log(dataMain);

        const dataTinhOC = {
            timestamp: +dataMain[0],
            open: +dataMain[1],
            high: +dataMain[2],
            low: +dataMain[3],
            close: +dataMain[4],
        }

        console.log(handleTinhOC(dataTinhOC));
    } catch (error) {

    }
}


// 
const Main = async () => {

    const allbotOfServer = await getAllBotIDByServerIP(SERVER_IP)

    await deleteAllScannerV1BE(allbotOfServer)

    const allSymbolSpotBE = getAllCoinBE()
    const allSymbolFuturesBE = getAllCoinFuturesBE()
    const allSymbolRes = await Promise.allSettled([allSymbolSpotBE, allSymbolFuturesBE])

    const allSymbolBE = [
        ...allSymbolRes[0].value || [],
        ...allSymbolRes[1].value || [],
    ]

    allSymbolBE.forEach(symbolData => {
        const symbol = symbolData.symbol
        if (!checkSymbolNotDuplicate.includes(symbol)) {
            checkSymbolNotDuplicate.push(symbol)
            allSymbol.push(symbolData)
        }
    })

    const getAllConfigSpot = getAllStrategiesActiveSpotBE(allbotOfServer)
    const getAllConfigMargin = getAllStrategiesActiveMarginBE(allbotOfServer)
    const getAllConfigSwap = getAllStrategiesActiveFuturesBE(allbotOfServer)
    const getAllConfigScanner = getAllStrategiesActiveScannerBE(allbotOfServer)
    const getClearVDataBEData = getClearVDataBE()


    const allRes = await Promise.allSettled([getAllConfigScanner, getClearVDataBEData, getAllConfigSpot, getAllConfigMargin, getAllConfigSwap])


    const getAllConfigScannerRes = allRes[0].value || []
    clearVData = allRes[1].value || {}


    const getAllConfigRes = [
        ...allRes[2].value || [],
        ...allRes[3].value || [],
        ...allRes[4].value || [],
    ]

    allSymbol.forEach(symbolData => {
        const symbol = symbolData.symbol

        // symbolTradeTypeObject[symbol] = symbolData.market === "Spot" ? "Spot" : "Margin"

        listKline.push(
            {
                channel: "candle1s",
                instId: symbol
            },
            {
                channel: "candle1m",
                instId: symbol
            }
        )
        listKline2.push(
            {
                channel: "candle5m",
                instId: symbol
            },
        )
        // if (symbol.includes("SWAP")) {
        //     listKline3.push(
        //         {
        //             channel: "mark-price",
        //             instId: symbol
        //         },
        //     )
        // }


        getAllConfigScannerRes.forEach(scannerData => {
            const scannerID = scannerData._id
            const setBlacklist = new Set(scannerData.Blacklist)
            const setOnlyPairs = new Set(scannerData.OnlyPairs)
            if (checkConditionBot(scannerData) && setOnlyPairs.has(symbol) && !setBlacklist.has(symbol)) {
                const botData = scannerData.botID
                const botID = botData._id
                const botName = botData.botName

                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey: botData.ApiKey,
                    SecretKey: botData.SecretKey,
                    Password: botData.Password,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    IsActive: true
                };

                allScannerDataObject[symbol] = allScannerDataObject[symbol] || {}
                const newScannerData = { ...scannerData }

                newScannerData.ExpirePre = Date.now()
                allScannerDataObject[symbol][scannerID] = newScannerData
            }
        })

    })

    getAllConfigRes.forEach(strategyItem => {

        if (checkConditionBot(strategyItem)) {

            const strategyID = strategyItem.value

            const botData = strategyItem.botID
            const botID = botData._id
            const botName = botData.botName
            const symbol = strategyItem.symbol

            botApiList[botID] = {
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
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategyItem;

            cancelAll({ strategyID, botID })

        }
    })


    // handleGetHistory(allSymbol, Date.now().getTime())

    await cancelOrderAllBE(Object.values(botApiList))
    await syncDigit()

    await handleSocketBotApiList(botApiList)

    await handleSocketListKline(listKline)
    await handleSocketListKline2(listKline2)
    // await handleSocketListKline3(listKline3)

    cron.schedule('0 6 * * *', () => {
        thongKeWinLoseByBot = {}
    });

    cron.schedule('0 */2 * * *', () => {
        handleClearV()
    });

    cron.schedule('0 */1 * * *', async () => {
        await syncDigit()
    });

}

try {
    Main()

    wsSymbol.on('update', async (dataCoin) => {

        if (timeoutRestartServer) {
            updatingAllMain = true
            timeoutRestartServer = false
            handleRestartServer()
        }

        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const channel = arg.channel

        const coinCurrent = +dataMain[4]
        const coinOpen = +dataMain[1]
        let turnover = +dataMain[6]
        const confirmClose = +dataMain[8]


        if (symbol.includes("SWAP")) {
            turnover = +dataMain[7]
        }

        priceCurrentBySymbol[symbol] = coinCurrent

        if (channel == "candle1m") {

            if (confirmClose == 0) {

                // 
                const coinPercent = Math.abs(coinCurrent - coinOpen) / coinOpen * 100
                let percentPump = 6
                if (coinPercent >= percentPump && !PumpStatusBySymbol?.[symbol]?.nangOC) {

                    PumpStatusBySymbol[symbol] = {
                        nangOC: true,
                        pump: true
                    }
                    const timeTraderAfter = 15
                    const timeReset = Math.round(coinPercent / 2)
                    const pumpText = `<b>🛑 ${symbol}</b> đang biến động ${coinPercent.toFixed(2)}% • 1m \n1. Auto nâng OC trong ${timeReset} min\n2. Trade sau ${timeTraderAfter}s`
                    console.log(pumpText);

                    sendAllBotTelegram(pumpText)
                    const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]

                    console.log(changeColorConsole.greenBright(`[...] START NÂNG OC ( ${symbol} )`));
                    listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                        // Nâng OC
                        const strategyID = strategy.value
                        const configID = strategy._id
                        const Market = strategy.market

                        const botID = strategy.botID._id
                        const botData = botApiList[botID]
                        const botName = botData.botName

                        strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange
                        const OrderChangeOld = strategy.OrderChangeOld
                        const xOC = strategy.XOCPump

                        const newOCNang = Math.abs((OrderChangeOld * xOC).toFixed(3))
                        allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                        strategy.OrderChange = newOCNang

                        let offSuccess = false
                        switch (Market) {
                            case "Spot":
                                {
                                    offSuccess = await increaseOCSpotBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChangeOld,
                                        newOC: newOCNang,
                                        strategy,
                                        botName
                                    });
                                    break
                                }

                            case "Margin":
                                {
                                    offSuccess = await increaseOCMarginBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChangeOld,
                                        newOC: newOCNang,
                                        strategy,
                                        botName
                                    });
                                    break
                                }
                            case "Futures": {
                                offSuccess = await increaseOCFuturesBE({
                                    configID,
                                    symbol,
                                    oldOC: OrderChangeOld,
                                    newOC: newOCNang,
                                    strategy,
                                    botName
                                })
                                break
                            }
                        }

                        offSuccess && handleSocketUpdate([strategy]);
                    }))

                    console.log(changeColorConsole.greenBright(`[V] NÂNG OC ( ${symbol} ) XONG`));

                    setTimeout(async () => {
                        console.log(changeColorConsole.greenBright(`[...] START HẠ OC ( ${symbol} ) after ${timeReset} min`));
                        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                        listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                            // Hạ OC
                            const strategyID = strategy.value
                            const configID = strategy._id
                            const Market = strategy.market

                            const botID = strategy.botID._id
                            const botData = botApiList[botID]
                            const botName = botData.botName
                            if (BTCPumpStatus || baoByBotAndSymbol[botID]?.nangOC) {
                                return
                            }
                            const OrderChange = strategy.OrderChange
                            const newOCNang = strategy.OrderChangeOld || OrderChange
                            allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                            strategy.OrderChange = newOCNang

                            let offSuccess = false
                            switch (Market) {
                                case "Spot":
                                    {
                                        offSuccess = await increaseOCSpotBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChange,
                                            newOC: strategy.OrderChangeOld,
                                            strategy,
                                            botName
                                        })
                                        break
                                    }
                                case "Margin":
                                    {
                                        offSuccess = await increaseOCMarginBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChange,
                                            newOC: strategy.OrderChangeOld,
                                            strategy,
                                            botName
                                        })
                                        break
                                    }
                                case "Futures": {
                                    offSuccess = await increaseOCFuturesBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChange,
                                        newOC: strategy.OrderChangeOld,
                                        strategy,
                                        botName
                                    })
                                    break
                                }

                            }


                            offSuccess && handleSocketUpdate([strategy]);
                        }))
                        console.log(changeColorConsole.greenBright(`[V] HẠ OC ( ${symbol} ) XONG`));
                        PumpStatusBySymbol[symbol].nangOC = false

                    }, timeReset * 60 * 1000)

                    setTimeout(() => {
                        console.log(changeColorConsole.greenBright(`[V] Start Trader ( ${symbol} ) after ${timeTraderAfter}s`));
                        PumpStatusBySymbol[symbol].pump = false
                    }, timeTraderAfter * 1000)

                }

                if (symbol === "BTC-USDT") {
                    const BTCPricePercent = Math.abs(coinCurrent - coinOpen) / coinOpen * 100
                    BTCPumpPercent = BTCPricePercent
                    if (BTCPricePercent >= .6 && !BTCPumpStatus) {
                        const timeReset = 5
                        const text = `<b>🛑 BTC</b> đang biến động ${BTCPricePercent.toFixed(2)}% • 1m \n1. Auto nâng OC trong ${timeReset} min\n2. Chỉ trade OC > 1.5\n3. Hạ TP = ${TP_NOT_ADAPTIVE}`
                        console.log(text);
                        updatingAllMain = true
                        await cancelAllListOrderOC(listOCByCandleBot)
                        sendAllBotTelegram(text)
                        BTCPumpStatus = true
                        TIME_MARKET_TP /= 2

                        console.log(changeColorConsole.greenBright(`[...] START NÂNG ALL OC`));

                        await Promise.allSettled(allSymbol.map(symbolData => {
                            const symbol = symbolData.symbol

                            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                            listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                // Nâng OC
                                const strategyID = strategy.value
                                const configID = strategy._id
                                const Market = strategy.market

                                const botID = strategy.botID._id
                                const botData = botApiList[botID]
                                const botName = botData.botName

                                strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange
                                const OrderChangeOld = strategy.OrderChangeOld

                                const xOC = strategy.XOCPump
                                const newOCNang = Math.abs((OrderChangeOld * xOC).toFixed(3))
                                allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                                strategy.OrderChange = newOCNang

                                let offSuccess = false
                                switch (Market) {
                                    case "Spot":
                                        {
                                            offSuccess = await increaseOCSpotBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChangeOld,
                                                newOC: newOCNang,
                                                strategy,
                                                botName
                                            })
                                            break
                                        }
                                    case "Margin":
                                        {
                                            offSuccess = await increaseOCMarginBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChangeOld,
                                                newOC: newOCNang,
                                                strategy,
                                                botName
                                            });
                                            break
                                        }
                                    case "Futures": {
                                        offSuccess = await increaseOCFuturesBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChangeOld,
                                            newOC: newOCNang,
                                            strategy,
                                            botName
                                        })
                                        break
                                    }
                                }

                                offSuccess && handleSocketUpdate([strategy], false);
                            }))
                        }))
                        console.log(changeColorConsole.greenBright(`[V] NÂNG ALL OC XONG`));

                        updatingAllMain = false

                        setTimeout(async () => {
                            TIME_MARKET_TP = 5000
                            await cancelAllListOrderOC(listOCByCandleBot)

                            console.log(changeColorConsole.greenBright(`[...] START HẠ OC after ${timeReset} min`));
                            Promise.allSettled(allSymbol.map(symbolData => {
                                const symbol = symbolData.symbol
                                const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                                listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                    // Hạ OC
                                    const strategyID = strategy.value
                                    const configID = strategy._id
                                    const Market = strategy.market

                                    const botID = strategy.botID._id
                                    const botData = botApiList[botID]
                                    const botName = botData.botName

                                    if (PumpStatusBySymbol?.[symbol]?.nangOC || baoByBotAndSymbol[botID]?.nangOC) {
                                        return
                                    }
                                    const OrderChange = strategy.OrderChange
                                    const newOCNang = strategy.OrderChangeOld || OrderChange
                                    allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                                    strategy.OrderChange = newOCNang

                                    let offSuccess = false
                                    switch (Market) {
                                        case "Spot":
                                            {
                                                offSuccess = await increaseOCSpotBE({
                                                    configID,
                                                    symbol,
                                                    oldOC: OrderChange,
                                                    newOC: strategy.OrderChangeOld,
                                                    strategy,
                                                    botName
                                                })
                                                break
                                            }

                                        case "Margin":
                                            {
                                                offSuccess = await increaseOCMarginBE({
                                                    configID,
                                                    symbol,
                                                    oldOC: OrderChange,
                                                    newOC: strategy.OrderChangeOld,
                                                    strategy,
                                                    botName
                                                });
                                                break
                                            }
                                        case "Futures": {
                                            offSuccess = await increaseOCFuturesBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChange,
                                                newOC: strategy.OrderChangeOld,
                                                strategy,
                                                botName
                                            })
                                            break
                                        }
                                    }

                                    offSuccess && handleSocketUpdate([strategy], false);
                                }))
                            }))
                            console.log(changeColorConsole.greenBright(`[V] HẠ ALL OC XONG`));
                            BTCPumpStatus = false

                        }, timeReset * 60 * 1000)
                    }
                }

            }

        }

        else if (channel == "candle1s") {


            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]

            listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {

                const botID = strategy.botID._id
                const botData = botApiList[botID]
                const botName = botData.botName
                const ApiKey = botData.ApiKey
                const SecretKey = botData.SecretKey
                const telegramID = botData.telegramID
                const telegramToken = botData.telegramToken

                if (!updatingAllMain && checkConditionBot(strategy) && botApiList[botID]?.IsActive) {

                    // console.log("strategy.Amount", strategy.Amount,symbol);
                    // console.log("strategy.OrderChange", strategy.OrderChange,symbol);


                    strategy.Amount = Math.abs((+strategy.Amount).toFixed(3))
                    strategy.OrderChange = Math.abs((+strategy.OrderChange).toFixed(3))
                    strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange

                    strategy.AmountAutoPercent = Math.abs(strategy.AmountAutoPercent)
                    strategy.AmountExpire = Math.abs(strategy.AmountExpire)
                    strategy.AmountIncreaseOC = Math.abs(strategy.AmountIncreaseOC)
                    strategy.Limit = Math.abs(strategy.Limit)
                    strategy.Expire = Math.abs(strategy.Expire)
                    strategy.ExpirePre = strategy.ExpirePre || Date.now()
                    strategy.AmountOld = strategy.AmountOld || strategy.Amount
                    strategy.AmountExpirePre = strategy.AmountExpirePre || Date.now()

                    const strategyID = strategy.value

                    const Market = strategy.market

                    const Expire = strategy.Expire
                    const AmountExpire = strategy.AmountExpire
                    const PositionSide = strategy.PositionSide
                    const Adaptive = strategy.Adaptive
                    const OrderChange = strategy.OrderChange
                    const AmountAutoPercent = strategy.AmountAutoPercent
                    const AmountIncreaseOC = strategy.AmountIncreaseOC
                    const Amount = strategy.Amount
                    const Limit = strategy.Limit
                    const configID = strategy._id
                    const scannerIDData = strategy?.scannerID
                    const scannerID = scannerIDData?._id
                    const scannerLabel = scannerIDData?.Label

                    const side = PositionSide === "Long" ? "Buy" : "Sell"

                    if (strategy.IsActive) {
                        //Check expire config - OK
                        if (Expire &&
                            (Date.now() - strategy.ExpirePre) >= Expire * 60 * 1000 &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
                        ) {
                            console.log(changeColorConsole.blackBright(`[V] Config Expire ( ${botName} - ${scannerLabel} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ) ( ${Expire} min )`));

                            strategy.IsActive = false
                            let offSuccess = false
                            if (strategy.preIsLose) {
                                if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.preIsLosePercent >= LOSE_PERCENT) {
                                    // add blacklist
                                    if (scannerID) {

                                        const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]
                                        const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

                                        if (!strategy?.Reverse) {
                                            addSymbolToBlacklistBE({
                                                scannerID,
                                                symbol,
                                                Market
                                            })

                                            if (scannerDataUpdate) {
                                                const newScannerDataUpdate = { ...scannerDataUpdate }
                                                newScannerDataUpdate.Blacklist.push(symbol)
                                                handleSocketScannerUpdate([newScannerDataUpdate] || [])
                                            }
                                        }

                                        handleSocketDelete(listConfigIDByScannerData)
                                    }
                                }
                            }

                            switch (Market) {
                                case "Spot":
                                    {
                                        offSuccess = await offConfigSpotBE({
                                            configID,
                                            symbol,
                                            strategy,
                                            botName,
                                            scannerLabel,
                                            AmountOld: strategy.AmountOld
                                        })
                                        break;
                                    }
                                case "Margin":
                                    {
                                        offSuccess = await offConfigMarginBE({
                                            configID,
                                            symbol,
                                            strategy,
                                            botName,
                                            scannerLabel,
                                            AmountOld: strategy.AmountOld
                                        });
                                        await handleSetLeverForBotAndSymbol({
                                            botID,
                                            symbol,
                                            lever: 10,
                                            side,
                                            leverID: `${botID}-${symbol}-${PositionSide}`
                                        })
                                        break;
                                    }
                                case "Futures": {
                                    offSuccess = await offConfigFuturesBE({
                                        configID,
                                        symbol,
                                        strategy,
                                        botName,
                                        scannerLabel,
                                        AmountOld: strategy.AmountOld
                                    });
                                    break;
                                }
                            }

                            offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));


                        }

                        //Check expire Increase-Amount - OK
                        if (AmountExpire && (Date.now() - strategy.AmountExpirePre) >= AmountExpire * 60 * 1000) {
                            strategy.AmountExpirePre = Date.now()

                            if (Amount != strategy.AmountOld) {
                                console.log(changeColorConsole.blackBright(`[V] Amount Expire ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ) ( ${AmountExpire} min )`));
                                strategy.Amount = strategy.AmountOld
                                let offSuccess = false
                                switch (Market) {
                                    case "Spot":
                                        {
                                            offSuccess = await increaseAmountSpotBE({
                                                configID,
                                                symbol,
                                                oldAmount: Amount,
                                                newAmount: strategy.AmountOld,
                                                strategy,
                                                botName
                                            })
                                            break
                                        }
                                    case "Margin": {
                                        offSuccess = await increaseAmountMarginBE({
                                            configID,
                                            symbol,
                                            oldAmount: Amount,
                                            newAmount: strategy.AmountOld,
                                            strategy,
                                            botName
                                        });
                                        break;
                                    }
                                    case "Futures": {
                                        offSuccess = await increaseAmountFuturesBE({
                                            configID,
                                            symbol,
                                            oldAmount: Amount,
                                            newAmount: strategy.AmountOld,
                                            strategy,
                                            botName
                                        });
                                        break;
                                    }
                                }

                                offSuccess && await handleSocketUpdate([strategy]);
                            }
                        }

                        let priceOrderOC = 0
                        let priceOrderTPTemp = 0
                        let qty = 0
                        let TPMain
                        if (BTCPumpStatus || baoByBotAndSymbol[botID]?.nangOC) {
                            TPMain = TP_NOT_ADAPTIVE
                        }
                        else {
                            TPMain = Adaptive ? TP_ADAPTIVE : TP_NOT_ADAPTIVE
                        }

                        // const hoTuongPercent = tuongMuaBanData[symbol]?.OC
                        // const checkMoveOCWhenHoTuong = strategy?.IsBeta && hoTuongPercent >= OrderChange * 20 / 100;

                        if (side === "Buy") {
                            priceOrderOC = coinCurrent - coinCurrent * strategy.OrderChange / 100
                            // if (checkMoveOCWhenHoTuong) {
                            //     priceOrderOC = coinCurrent - coinCurrent * (strategy.OrderChange + hoTuongPercent) / 100
                            // }
                            priceOrderTPTemp = priceOrderOC + Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                        }
                        else {
                            priceOrderOC = coinCurrent + coinCurrent * strategy.OrderChange / 100
                            // if (checkMoveOCWhenHoTuong) {
                            //     priceOrderOC = coinCurrent + coinCurrent * (strategy.OrderChange + hoTuongPercent) / 100
                            // }
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
                                symbol
                            }),
                            // qty:qty.toString(),
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
                            coinCurrent
                        }

                        moveMultipleOrderByBotAndConfigIDData[strategyID] = dataInput

                        // MOVE OC
                        if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID &&
                            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderFilled) {

                            // if (checkMoveOCWhenHoTuong) {
                            //     const textHoTuong = `📊 Hở Tường ${hoTuongPercent?.toFixed(3)}% • <b>${symbol}</b> ${handleIconMarketType(Market)} • ${botName} • ${PositionSide} • ${OrderChange}%`
                            //     console.log(textHoTuong);
                            //     console.log(`[->] Move Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) success: ${dataInput.price}`)
                            // }

                            // console.log(`OCLongRound: ${OCLongRound} \nOCLongRoundMain: ${OCLongRoundMain} \nOCRound: ${OCRound} \nOCRoundMain : ${OCRoundMain} \n${new Date(+dataMain[0]).toLocaleTimeString()}`);

                            const priceOrderOCCurrent = +allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC.priceOrderOCCurrent
                            const OCPercent = strategy.OrderChange * 5 / 100
                            const OCTop = strategy.OrderChange + OCPercent
                            const OCDown = strategy.OrderChange - OCPercent
                            const OCkhoangCachCoinCurrentAndOC = Math.abs(coinCurrent - priceOrderOCCurrent) * 100 / priceOrderOCCurrent
                            // console.log(`OCkhoangCachCoinCurrentAndOC: ${OCkhoangCachCoinCurrentAndOC} | OCTop: ${OCTop} | OCDown: ${OCDown} | time: ${new Date(+dataMain[0]).toLocaleTimeString()}`);

                            if (OCkhoangCachCoinCurrentAndOC >= OCTop || OCkhoangCachCoinCurrentAndOC <= OCDown) {
                                handleMoveOrderOC({
                                    ...dataInput,
                                    orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID,
                                })

                            }
                        }

                        // MOVE TP
                        if (
                            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID &&
                            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderFilled &&
                            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.moving
                        ) {
                            await handleMoveOrderTP({
                                ...dataInput,
                                coinCurrent,
                                newTPPrice: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.moveToPriceCurrent && coinCurrent,
                            })
                        }

                        //     // MOVE SL
                        // if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled && khoangMoveTP) {
                        //     let newSLPrice = 0
                        //     const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.openTrade

                        //     const khoangCachPercent = 0.2
                        //     if (PositionSide == "Long") {
                        //         if (coinCurrent > openTradeOCFilled) {
                        //             newSLPrice = coinCurrent + khoangMoveTP * khoangCachPercent / 100
                        //         }
                        //     }
                        //     else {
                        //         if (coinCurrent < openTradeOCFilled) {
                        //             newSLPrice = coinCurrent - khoangMoveTP * khoangCachPercent / 100
                        //         }
                        //     }
                        //     if (newSLPrice) {
                        //         console.log(changeColorConsole.cyanBright(`[...] Moving SL ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ): ${newSLPrice}`));
                        //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.slTriggerPx = newSLPrice
                        //     }

                        //     // CHECK SL
                        //     // let closeMarket = false
                        //     // if (side == "Buy") {
                        //     //     if (coinCurrent <= allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPx) {
                        //     //         closeMarket = true
                        //     //     }
                        //     // }
                        //     // else {
                        //     //     if (coinCurrent >= allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPx) {
                        //     //         closeMarket = true
                        //     //     }
                        //     // }
                        //     // if (closeMarket) {
                        //     //     if (!allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSl) {
                        //     //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.timeoutFilledSl = setTimeout(async () => {
                        //     //             console.log(changeColorConsole.blueBright(`[V] Filled SL ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ): ${coinCurrent}`));
                        //     //             // handleCloseMarket({
                        //     //             //     symbol,
                        //     //             //     side,
                        //     //             //     botID,
                        //     //             //     botData,
                        //     //             //     qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
                        //     //             //     stopLose: true,
                        //     //             //     coinCurrent,
                        //     //             //     strategy
                        //     //             // })
                        //     //             if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPx != allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPxOld) {

                        //     //                 allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveToPriceCurrent = true

                        //     //                 handleMoveOrderTP({
                        //     //                     ...dataInput,
                        //     //                     newTPPrice: coinCurrent,
                        //     //                     khoangMoveTP
                        //     //                 })
                        //     //             }
                        //     //             else {
                        //     //                 console.log(changeColorConsole.redBright(`[V] Filled SL ${Sl_TRIGGER_PERCENT}% ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ): ${coinCurrent}`));
                        //     //                 await handleCloseMarket({
                        //     //                     symbol,
                        //     //                     side,
                        //     //                     botID,
                        //     //                     botData,
                        //     //                     qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
                        //     //                     stopLose: true,
                        //     //                     coinCurrent,
                        //     //                     strategy
                        //     //                 })

                        //     //                 // OFF
                        //     //                 strategy.IsActive = false

                        //     //                 let offSuccess = false

                        //     //                 // add blacklist
                        //     //                 if (scannerID) {

                        //     //                     const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]
                        //     //                     const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

                        //     //                     addSymbolToBlacklistBE({
                        //     //                         scannerID,
                        //     //                         symbol,
                        //     //                         Market
                        //     //                     })

                        //     //                     if (scannerDataUpdate) {
                        //     //                         const newScannerDataUpdate = { ...scannerDataUpdate }
                        //     //                         newScannerDataUpdate.Blacklist.push(symbol)
                        //     //                         handleSocketScannerUpdate([newScannerDataUpdate] || [])
                        //     //                         // handleSocketDelete(listConfigIDByScannerData.map(item => ({
                        //     //                         //     ...item,
                        //     //                         //     scannerID
                        //     //                         // })))
                        //     //                         handleSocketDelete(listConfigIDByScannerData, false)
                        //     //                     }
                        //     //                 }
                        //     //                 else {
                        //     //                     switch (Market) {
                        //     //                         case "Spot":
                        //     //                             {
                        //     //                                 offSuccess = await offConfigSpotBE({
                        //     //                                     configID,
                        //     //                                     symbol,
                        //     //                                     strategy,
                        //     //                                     botName,
                        //     //                                     scannerLabel,
                        //     //                                     AmountOld: strategy.AmountOld

                        //     //                                 })
                        //     //                                 break
                        //     //                             }
                        //     //                         case "Margin":
                        //     //                             {
                        //     //                                 offSuccess = await offConfigMarginBE({
                        //     //                                     configID,
                        //     //                                     symbol,
                        //     //                                     strategy,
                        //     //                                     botName,
                        //     //                                     scannerLabel,
                        //     //                                     AmountOld: strategy.AmountOld

                        //     //                                 });
                        //     //                                 if (offSuccess && !strategy?.IsBeta) {
                        //     //                                     await handleSetLeverForBotAndSymbol({
                        //     //                                         botID,
                        //     //                                         symbol,
                        //     //                                         lever: 10,
                        //     //                                         side,
                        //     //                                         leverID: `${botID}-${symbol}-${PositionSide}`
                        //     //                                     })
                        //     //                                 }
                        //     //                                 break

                        //     //                             }
                        //     //                         case "Futures": {
                        //     //                             offSuccess = await offConfigFuturesBE({
                        //     //                                 configID,
                        //     //                                 symbol,
                        //     //                                 strategy,
                        //     //                                 botName,
                        //     //                                 scannerLabel,
                        //     //                                 AmountOld: strategy.AmountOld
                        //     //                             })
                        //     //                             break
                        //     //                         }
                        //     //                     }
                        //     //                 }
                        //     //                 offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));
                        //     //             }
                        //     //         }, 1000)
                        //     //     }
                        //     // }
                        //     // else {
                        //     //     clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSl)
                        //     //     allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.timeoutFilledSl = ""
                        //     // }

                        //     // else {
                        //     //     // CHECK SL BETA
                        //     //     let closeMarketBeta = false
                        //     //     if (side == "Buy") {
                        //     //         if (coinCurrent <= allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPxBeta) {
                        //     //             closeMarketBeta = true
                        //     //         }
                        //     //     }
                        //     //     else {
                        //     //         if (coinCurrent >= allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.slTriggerPxBeta) {
                        //     //             closeMarketBeta = true
                        //     //         }
                        //     //     }
                        //     //     if (closeMarketBeta) {
                        //     //         if (!allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSlBeta) {
                        //     //             allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.timeoutFilledSlBeta = setTimeout(async () => {
                        //     //                 console.log(changeColorConsole.cyanBright(`[V] Filled SL BETA ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ): ${coinCurrent}`));
                        //     //                 await handleCloseMarket({
                        //     //                     symbol,
                        //     //                     side,
                        //     //                     botID,
                        //     //                     botData,
                        //     //                     qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
                        //     //                     stopLose: true,
                        //     //                     coinCurrent,
                        //     //                     strategy
                        //     //                 })


                        //     //                 // OFF
                        //     //                 strategy.IsActive = false

                        //     //                 let offSuccess = false

                        //     //                 // add blacklist
                        //     //                 if (scannerID) {

                        //     //                     const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]
                        //     //                     const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

                        //     //                     addSymbolToBlacklistBE({
                        //     //                         scannerID,
                        //     //                         symbol,
                        //     //                         Market
                        //     //                     })

                        //     //                     if (scannerDataUpdate) {
                        //     //                         const newScannerDataUpdate = { ...scannerDataUpdate }
                        //     //                         newScannerDataUpdate.Blacklist.push(symbol)
                        //     //                         handleSocketScannerUpdate([newScannerDataUpdate] || [])
                        //     //                         // handleSocketDelete(listConfigIDByScannerData.map(item => ({
                        //     //                         //     ...item,
                        //     //                         //     scannerID
                        //     //                         // })))
                        //     //                         handleSocketDelete(listConfigIDByScannerData, false)
                        //     //                     }
                        //     //                 }
                        //     //                 else {
                        //     //                     switch (Market) {
                        //     //                         case "Spot":
                        //     //                             {
                        //     //                                 offSuccess = await offConfigSpotBE({
                        //     //                                     configID,
                        //     //                                     symbol,
                        //     //                                     strategy,
                        //     //                                     botName,
                        //     //                                     scannerLabel,
                        //     //                                     AmountOld: strategy.AmountOld

                        //     //                                 })
                        //     //                                 break
                        //     //                             }
                        //     //                         case "Margin":
                        //     //                             {
                        //     //                                 offSuccess = await offConfigMarginBE({
                        //     //                                     configID,
                        //     //                                     symbol,
                        //     //                                     strategy,
                        //     //                                     botName,
                        //     //                                     scannerLabel,
                        //     //                                     AmountOld: strategy.AmountOld

                        //     //                                 });
                        //     //                                 if (offSuccess && !strategy?.IsBeta) {
                        //     //                                     await handleSetLeverForBotAndSymbol({
                        //     //                                         botID,
                        //     //                                         symbol,
                        //     //                                         lever: 10,
                        //     //                                         side,
                        //     //                                         leverID: `${botID}-${symbol}-${PositionSide}`
                        //     //                                     })
                        //     //                                 }
                        //     //                                 break

                        //     //                             }
                        //     //                         case "Futures": {
                        //     //                             offSuccess = await offConfigFuturesBE({
                        //     //                                 configID,
                        //     //                                 symbol,
                        //     //                                 strategy,
                        //     //                                 botName,
                        //     //                                 scannerLabel,
                        //     //                                 AmountOld: strategy.AmountOld
                        //     //                             })
                        //     //                             break
                        //     //                         }
                        //     //                     }
                        //     //                 }
                        //     //                 offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));
                        //     //             }, 1000)
                        //     //         }
                        //     //     }
                        //     //     else {
                        //     //         clearTimeout(allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.timeoutFilledSlBeta)
                        //     //         allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.timeoutFilledSlBeta = ""
                        //     //     }
                        //     // }
                        // }

                        // ADD OC
                        if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering &&
                            !strategy.IsDeleted
                        ) {

                            try {

                                //  CHECK WIN - LOSE 
                                const configID = strategy._id

                                if (strategy.preIsWin) {

                                    strategy.AmountExpirePre = Date.now()
                                    strategy.preIsWin = false

                                    let newAmount = Amount + Amount * AmountAutoPercent / 100
                                    newAmount = Math.abs((+newAmount).toFixed(3))
                                    newAmount = newAmount <= Limit ? newAmount : Limit

                                    strategy.Amount = newAmount
                                    let offSuccess = false
                                    switch (Market) {
                                        case "Spot":
                                            {
                                                offSuccess = await increaseAmountSpotBE({
                                                    configID,
                                                    symbol,
                                                    oldAmount: Amount,
                                                    newAmount: newAmount,
                                                    strategy,
                                                    botName
                                                })
                                                break
                                            }

                                        case "Margin":
                                            {
                                                offSuccess = await increaseAmountMarginBE({
                                                    configID,
                                                    symbol,
                                                    oldAmount: Amount,
                                                    newAmount: newAmount,
                                                    strategy,
                                                    botName
                                                });
                                                break
                                            }
                                        case "Futures": {
                                            offSuccess = await increaseAmountFuturesBE({
                                                configID,
                                                symbol,
                                                oldAmount: Amount,
                                                newAmount: newAmount,
                                                strategy,
                                                botName
                                            });
                                            break
                                        }


                                    }

                                    offSuccess && handleSocketUpdate([strategy]);
                                }
                                else if (strategy.preIsLose) {
                                    strategy.preIsLose = false

                                    if (allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.preIsLosePercent >= LOSE_PERCENT) {
                                        if (!strategy?.Reverse) {
                                            strategy.IsActive = false

                                            let offSuccess = false

                                            // add blacklist
                                            if (scannerID) {

                                                const scannerDataUpdate = allScannerDataObject[symbol]?.[scannerID]
                                                const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

                                                addSymbolToBlacklistBE({
                                                    scannerID,
                                                    symbol,
                                                    Market
                                                })

                                                if (scannerDataUpdate) {
                                                    const newScannerDataUpdate = { ...scannerDataUpdate }
                                                    newScannerDataUpdate.Blacklist.push(symbol)
                                                    handleSocketScannerUpdate([newScannerDataUpdate] || [])
                                                    handleSocketDelete(listConfigIDByScannerData, false)
                                                }
                                            }
                                            else {
                                                switch (Market) {
                                                    case "Spot":
                                                        {
                                                            offSuccess = await offConfigSpotBE({
                                                                configID,
                                                                symbol,
                                                                strategy,
                                                                botName,
                                                                scannerLabel,
                                                                AmountOld: strategy.AmountOld

                                                            })
                                                            break
                                                        }
                                                    case "Margin":
                                                        {
                                                            offSuccess = await offConfigMarginBE({
                                                                configID,
                                                                symbol,
                                                                strategy,
                                                                botName,
                                                                scannerLabel,
                                                                AmountOld: strategy.AmountOld

                                                            });
                                                            await handleSetLeverForBotAndSymbol({
                                                                botID,
                                                                symbol,
                                                                lever: 10,
                                                                side,
                                                                leverID: `${botID}-${symbol}-${PositionSide}`
                                                            })
                                                            break

                                                        }
                                                    case "Futures": {
                                                        offSuccess = await offConfigFuturesBE({
                                                            configID,
                                                            symbol,
                                                            strategy,
                                                            botName,
                                                            scannerLabel,
                                                            AmountOld: strategy.AmountOld
                                                        })
                                                        break
                                                    }
                                                }
                                            }
                                            offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));
                                        }
                                    }
                                    else {
                                        strategy.OrderChange = OrderChange + OrderChange * AmountIncreaseOC / 100
                                        strategy.OrderChange = Math.abs((+strategy.OrderChange).toFixed(3))
                                        let offSuccess = false

                                        switch (Market) {
                                            case "Spot":
                                                {
                                                    offSuccess = await increaseOCSpotBE({
                                                        configID,
                                                        symbol,
                                                        oldOC: OrderChange,
                                                        newOC: strategy.OrderChange,
                                                        strategy,
                                                        botName
                                                    })
                                                    break
                                                }

                                            case "Margin":
                                                {
                                                    offSuccess = await increaseOCMarginBE({
                                                        configID,
                                                        symbol,
                                                        oldOC: OrderChange,
                                                        newOC: strategy.OrderChange,
                                                        strategy,
                                                        botName
                                                    });
                                                    break
                                                }

                                            case "Futures": {
                                                offSuccess = await increaseOCFuturesBE({
                                                    configID,
                                                    symbol,
                                                    oldOC: OrderChange,
                                                    newOC: strategy.OrderChange,
                                                    strategy,
                                                    botName
                                                })
                                                break
                                            }
                                        }
                                        strategy.IsActive = false

                                        offSuccess && handleSocketUpdate([strategy]);
                                        const timeoutReOrderOC = 3000
                                        setTimeout(() => {
                                            if (
                                                !allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.IsDeleted &&
                                                allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                                            ) {
                                                console.log(changeColorConsole.greenBright(`[V] Re-Order OC ( ${OrderChange}% ) After ${timeoutReOrderOC} ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} )`));
                                                strategy.IsActive = true
                                                handleSocketUpdate([strategy]);
                                            }
                                        }, timeoutReOrderOC)
                                    }
                                }

                                if (side === "Buy") {
                                    priceOrderOC = coinCurrent - coinCurrent * strategy.OrderChange / 100
                                    priceOrderTPTemp = priceOrderOC + Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                                }
                                else {
                                    priceOrderOC = coinCurrent + coinCurrent * strategy.OrderChange / 100
                                    priceOrderTPTemp = priceOrderOC - Math.abs((priceOrderOC - coinCurrent)) * (TPMain / 100)
                                }


                                const qtyNew = (strategy.Amount / +priceOrderOC)

                                dataInput.price = roundPrice({
                                    price: priceOrderOC,
                                    tickSize: digitAllCoinObject[symbol]?.priceScale
                                })

                                dataInput.priceOrderTPTemp = roundPrice({
                                    price: priceOrderTPTemp,
                                    tickSize: digitAllCoinObject[symbol]?.priceScale
                                })

                                dataInput.qty = roundQty({
                                    price: qtyNew,
                                    symbol
                                })
                                // dataInput.qty = qtyNew.toString()

                                if (dataInput.qty > 0) {
                                    const leverID = `${botID}-${symbol}-${PositionSide}`;
                                    const checkOCWithBTCPump = (BTCPumpStatus || baoByBotAndSymbol[botID]?.nangOC) ? OrderChange > 1.5 : true

                                    !PumpStatusBySymbol?.[symbol]?.pump &&
                                        checkOCWithBTCPump &&
                                        allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]?.IsActive &&
                                        strategy.IsActive && !leverByBotSymbolSide[leverID]?.running && handleSubmitOrder(dataInput)

                                }
                                else {
                                    console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${symbol} ${handleIconMarketType(Market)} - ${PositionSide} - ${OrderChange}% ) failed: ( QTY : ${dataInput.qty} ) `))
                                    allStrategiesByCandleAndSymbol[symbol][strategyID].IsActive = false

                                    let offSuccess = false

                                    switch (Market) {
                                        case "Spot":
                                            {
                                                offSuccess = await offConfigSpotBE({
                                                    configID,
                                                    symbol,
                                                    strategy,
                                                    botName,
                                                    scannerLabel,
                                                    AmountOld: strategy.AmountOld
                                                })
                                                break
                                            }
                                        case "Margin":
                                            {
                                                offSuccess = await offConfigMarginBE({
                                                    configID,
                                                    symbol,
                                                    strategy,
                                                    botName,
                                                    scannerLabel,
                                                    AmountOld: strategy.AmountOld
                                                });
                                                await handleSetLeverForBotAndSymbol({
                                                    botID,
                                                    symbol,
                                                    lever: 10,
                                                    side,
                                                    leverID: `${botID}-${symbol}-${PositionSide}`
                                                })
                                                break
                                            }
                                        case "Futures":
                                            {
                                                offSuccess = await offConfigFuturesBE({
                                                    configID,
                                                    symbol,
                                                    strategy,
                                                    botName,
                                                    scannerLabel,
                                                    AmountOld: strategy.AmountOld
                                                });
                                                break
                                            }
                                    }

                                    strategy.IsActive = false
                                    offSuccess && (!scannerLabel ? handleSocketUpdate([strategy]) : handleSocketDelete([strategy]));
                                }
                            } catch (error) {
                                console.log(changeColorConsole.redBright("ERRORRRRRRRRRR"));

                                console.log(error);

                            }
                        }

                    }

                }

                // CHECK BAO
                baoByBotAndSymbol[botID] = baoByBotAndSymbol[botID] || {}
                const baoByBotAndSymbolTotal = Object.values(baoByBotAndSymbol?.[botID] || {})?.length

                if (baoByBotAndSymbolTotal >= 10 && !baoByBotAndSymbol[botID]?.nangOC) {
                    const timeReset = 5
                    const text = `<b>🛑 Bot ( ${botName} )</b> đang có ${baoByBotAndSymbolTotal} vị thế \n1. Auto nâng OC trong ${timeReset} min\n2. Chỉ trade OC > 1.5\n3. Hạ TP = ${TP_NOT_ADAPTIVE}`
                    console.log(text);
                    updatingAllMain = true

                    baoByBotAndSymbol[botID].nangOC = true

                    const listOCByBot = listOCByCandleBot?.[botID]
                    listOCByBot && await handleCancelAllOrderOC([listOCByBot], false)

                    sendMessageWithRetryWait({
                        messageText: text,
                        telegramID,
                        telegramToken
                    })

                    TIME_MARKET_TP /= 2

                    console.log(changeColorConsole.greenBright(`[...] START NÂNG ALL OC ( ${botName} )`));

                    await Promise.allSettled(allSymbol.map(symbolData => {
                        const symbol = symbolData.symbol

                        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                        listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                            // Nâng OC
                            const strategyID = strategy.value
                            const configID = strategy._id
                            const Market = strategy.market

                            const botIDConfig = strategy.botID._id
                            const botData = botApiList[botIDConfig]
                            const botName = botData.botName

                            if (botID.toString() == botIDConfig.toString()) {

                                strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange
                                const OrderChangeOld = strategy.OrderChangeOld
                                const xOC = strategy.XOCPump
                                const newOCNang = Math.abs((OrderChangeOld * xOC).toFixed(3))
                                allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                                strategy.OrderChange = newOCNang

                                let offSuccess = false

                                switch (Market) {
                                    case "Spot":
                                        {
                                            offSuccess = await increaseOCSpotBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChangeOld,
                                                newOC: newOCNang,
                                                strategy,
                                                botName
                                            })
                                            break
                                        }
                                    case "Margin":
                                        {
                                            offSuccess = await increaseOCMarginBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChangeOld,
                                                newOC: newOCNang,
                                                strategy,
                                                botName
                                            });
                                            break
                                        }
                                    case "Futures": {
                                        offSuccess = await increaseOCFuturesBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChangeOld,
                                            newOC: newOCNang,
                                            strategy,
                                            botName
                                        });
                                        break
                                    }
                                }

                                offSuccess && handleSocketUpdate([strategy], false);
                            }
                        }))
                    }))
                    console.log(changeColorConsole.greenBright(`[V] NÂNG ALL OC ( ${botName} ) XONG`));

                    updatingAllMain = false

                    setTimeout(async () => {

                        TIME_MARKET_TP = 5000
                        console.log(changeColorConsole.greenBright(`[...] START HẠ OC ( ${botName} ) after ${timeReset} min`));

                        const listOCByBot = listOCByCandleBot?.[botID]
                        listOCByBot && await handleCancelAllOrderOC([listOCByBot], false)

                        Promise.allSettled(allSymbol.map(symbolData => {
                            const symbol = symbolData.symbol
                            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                            listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                // Hạ OC
                                const strategyID = strategy.value
                                const configID = strategy._id
                                const Market = strategy.market

                                const botIDConfig = strategy.botID._id
                                const botData = botApiList[botIDConfig]
                                const botName = botData.botName
                                if (BTCPumpStatus || PumpStatusBySymbol?.[symbol]?.nangOC) {
                                    return
                                }
                                if (botID.toString() == botIDConfig.toString()) {

                                    const OrderChange = strategy.OrderChange
                                    const newOCNang = strategy.OrderChangeOld || OrderChange
                                    allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                                    strategy.OrderChange = newOCNang

                                    let offSuccess = false
                                    switch (Market) {
                                        case "Spot":
                                            {
                                                offSuccess = await increaseOCSpotBE({
                                                    configID,
                                                    symbol,
                                                    oldOC: OrderChange,
                                                    newOC: strategy.OrderChangeOld,
                                                    strategy,
                                                    botName
                                                })
                                                break
                                            }

                                        case "Margin":
                                            {
                                                offSuccess = await increaseOCMarginBE({
                                                    configID,
                                                    symbol,
                                                    oldOC: OrderChange,
                                                    newOC: strategy.OrderChangeOld,
                                                    strategy,
                                                    botName
                                                });
                                                break
                                            }

                                        case "Futures": {
                                            offSuccess = await increaseOCFuturesBE({
                                                configID,
                                                symbol,
                                                oldOC: OrderChange,
                                                newOC: strategy.OrderChangeOld,
                                                strategy,
                                                botName
                                            });
                                            break
                                        }
                                    }


                                    offSuccess && handleSocketUpdate([strategy], false);
                                }
                            }))
                        }))
                        console.log(changeColorConsole.greenBright(`[V] HẠ ALL OC ( ${botName} ) XONG`));
                        delete baoByBotAndSymbol?.[botID]

                    }, timeReset * 60 * 1000)
                }
            }))
        }



    })

    // 3B
    wsSymbol.on('update', async (dataCoin) => {

        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const channel = arg.channel

        const coinCurrent = +dataMain[4]
        const coinOpen = +dataMain[1]
        let turnover = +dataMain[6]

        if (symbol.includes("SWAP")) {
            turnover = +dataMain[7]
        }

        if (channel == "candle1s") {
            const dataTinhOC = {
                timestamp: +dataMain[0],
                open: coinOpen,
                high: +dataMain[2],
                low: +dataMain[3],
                close: coinCurrent,
                turnover,
            }
            tinhOC(symbol, dataTinhOC)
        }

    })

    wsSymbol.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbol.unsubscribe(listKline)
        wsSymbol2.unsubscribe(listKline2)
        // wsPublic.unsubscribe(listKline3)
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
        const errorCode = err.code || err.error?.code
        if (!connectKlineError && errorCode == "ENOTFOUND") {
            const text = "🚫 [ Cảnh báo ] Hệ thống đang bị gián đoạn kết nối"
            console.log(text);
            sendAllBotTelegram(text)
            console.log('[!] Connection kline error');
            connectKlineError = true
            wsSymbol.connectAll()
        }
        console.log("ERR:",err);
        
    });

    wsSymbol2.on('update', async (dataCoin) => {

        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const channel = arg.channel

        if (channel == "candle5m") {
            const coinCurrent = +dataMain[4]
            const coinOpen = +dataMain[1]
            let turnover = +dataMain[6]
            const confirmClose = +dataMain[8]

            if (symbol.includes("SWAP")) {
                turnover = +dataMain[7]
            }
            if (confirmClose == 0) {
                const coinPercent = Math.abs(coinCurrent - coinOpen) / coinOpen * 100
                let percentPump = 10
                if (coinPercent >= percentPump && !PumpStatusBySymbol?.[symbol]?.nangOC) {

                    PumpStatusBySymbol[symbol] = {
                        nangOC: true,
                        pump: true
                    }
                    const timeTraderAfter = 15
                    const timeReset = Math.round(coinPercent / 2)
                    const pumpText = `<b>🛑 ${symbol}</b> đang biến động ${coinPercent.toFixed(2)}% • 5m \n1. Auto nâng OC trong ${timeReset} min\n2. Trade sau ${timeTraderAfter}s`
                    console.log(pumpText);

                    sendAllBotTelegram(pumpText)
                    const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]

                    console.log(changeColorConsole.greenBright(`[...] START NÂNG OC ( ${symbol} )`));
                    listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                        // Nâng OC
                        const strategyID = strategy.value
                        const configID = strategy._id
                        const Market = strategy.market

                        const botID = strategy.botID._id
                        const botData = botApiList[botID]
                        const botName = botData.botName

                        strategy.OrderChangeOld = strategy.OrderChangeOld || strategy.OrderChange
                        const OrderChangeOld = strategy.OrderChangeOld
                        const xOC = strategy.XOCPump

                        const newOCNang = Math.abs((OrderChangeOld * xOC).toFixed(3))
                        allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                        strategy.OrderChange = newOCNang

                        let offSuccess = false
                        switch (Market) {
                            case "Spot":
                                {
                                    offSuccess = await increaseOCSpotBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChangeOld,
                                        newOC: newOCNang,
                                        strategy,
                                        botName
                                    });
                                    break
                                }

                            case "Margin":
                                {
                                    offSuccess = await increaseOCMarginBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChangeOld,
                                        newOC: newOCNang,
                                        strategy,
                                        botName
                                    });
                                    break
                                }
                            case "Futures": {
                                offSuccess = await increaseOCFuturesBE({
                                    configID,
                                    symbol,
                                    oldOC: OrderChangeOld,
                                    newOC: newOCNang,
                                    strategy,
                                    botName
                                })
                                break
                            }
                        }

                        offSuccess && handleSocketUpdate([strategy]);
                    }))

                    console.log(changeColorConsole.greenBright(`[V] NÂNG OC ( ${symbol} ) XONG`));

                    setTimeout(async () => {
                        console.log(changeColorConsole.greenBright(`[...] START HẠ OC ( ${symbol} ) after ${timeReset} min`));
                        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]
                        listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                            // Hạ OC
                            const strategyID = strategy.value
                            const configID = strategy._id
                            const Market = strategy.market

                            const botID = strategy.botID._id
                            const botData = botApiList[botID]
                            const botName = botData.botName
                            if (BTCPumpStatus || baoByBotAndSymbol[botID]?.nangOC) {
                                return
                            }
                            const OrderChange = strategy.OrderChange
                            const newOCNang = strategy.OrderChangeOld || OrderChange
                            allStrategiesByCandleAndSymbol[symbol][strategyID].OrderChange = newOCNang
                            strategy.OrderChange = newOCNang

                            let offSuccess = false
                            switch (Market) {
                                case "Spot":
                                    {
                                        offSuccess = await increaseOCSpotBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChange,
                                            newOC: strategy.OrderChangeOld,
                                            strategy,
                                            botName
                                        })
                                        break
                                    }
                                case "Margin":
                                    {
                                        offSuccess = await increaseOCMarginBE({
                                            configID,
                                            symbol,
                                            oldOC: OrderChange,
                                            newOC: strategy.OrderChangeOld,
                                            strategy,
                                            botName
                                        })
                                        break
                                    }
                                case "Futures": {
                                    offSuccess = await increaseOCFuturesBE({
                                        configID,
                                        symbol,
                                        oldOC: OrderChange,
                                        newOC: strategy.OrderChangeOld,
                                        strategy,
                                        botName
                                    })
                                    break
                                }

                            }

                            offSuccess && handleSocketUpdate([strategy]);
                        }))
                        console.log(changeColorConsole.greenBright(`[V] HẠ OC ( ${symbol} ) XONG`));
                        PumpStatusBySymbol[symbol].nangOC = false

                    }, timeReset * 60 * 1000)

                    setTimeout(() => {
                        console.log(changeColorConsole.greenBright(`[V] Start Trader ( ${symbol} ) after ${timeTraderAfter}s`));
                        PumpStatusBySymbol[symbol].pump = false
                    }, timeTraderAfter * 1000)

                }
            }
        }

    })

    // wsPublic.on('update', async (dataCoin) => {

    //     const dataMain = dataCoin.data[0]
    //     const arg = dataCoin.arg
    //     const symbol = arg.instId
    //     const channel = arg.channel

    //     if (channel == "bbo-tbt") {
    //         tuongMuaBanData[symbol] = {
    //             ask: +dataMain.asks?.[0]?.[0] || 0,
    //             bid: +dataMain.bids?.[0]?.[0] || 0
    //         }
    //     }
    //     else if (channel == "mark-price") {
    //         if (symbol == "TRB-USDT-SWAP") {
    //             console.log("markPx", dataMain.markPx);
    //         }

    //     }
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

            const botData = newStrategiesData.botID
            const botID = botData._id
            const botName = botData.botName

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    Password: botData.Password,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    Password: botData.Password,
                    IsActive: true
                }


            }



            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            newStrategiesData.ExpirePre = Date.now()
            newStrategiesData.AmountExpirePre = Date.now()
            allStrategiesByCandleAndSymbol[symbol][strategyID] = newStrategiesData;

            cancelAll({ strategyID, botID })

        }

    }))

    await handleSocketBotApiList(newBotApiList)

}

const handleSocketUpdate = async (newData = [], cancelStatus = true, resetExpirePre = false) => {
    console.log("[...] Update Strategies From Realtime", newData.length);

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {

        if (checkConditionBot(strategiesData)) {

            const botData = strategiesData.botID
            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Password = botData.Password
            const botID = botData._id
            const botName = botData.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive


            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const ExpirePre = allStrategiesByCandleAndSymbol[symbol]?.[strategyID]?.ExpirePre
            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});

            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

            if (!resetExpirePre) {
                allStrategiesByCandleAndSymbol[symbol][strategyID].ExpirePre = ExpirePre
            }

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

            if (IsActive) {
                if (!botApiList[botID]) {
                    botApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        Password,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true

                    }

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        Password,
                        telegramID: botData.telegramID,
                        telegramToken: botData.telegramToken,
                        IsActive: true

                    }


                }
            }

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
                Password,
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
                botData,
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

    if (cancelStatus) {
        await handleCancelAllOrderTP({ items: listOrderTP })
        await cancelAllListOrderOC(listOrderOC)
        await handleSocketBotApiList(newBotApiList)
    }
}

const handleSocketDelete = async (newData = [], autoDelete = true) => {
    console.log("[...] Delete Strategies From Realtime", newData.length);

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {
        if (checkConditionBot(strategiesData)) {

            const botData = strategiesData.botID

            const ApiKey = botData.ApiKey
            const SecretKey = botData.SecretKey
            const Password = botData.Password

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const botID = botData._id
            const botName = botData.botName
            const scannerID = strategiesData?.scannerID?._id

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
                Password,

            });
            // if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId) {
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
                botData,
                strategyID,
                symbol: symbol,
                side,
                botName,
                botID,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })

            if (autoDelete) {
                if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled) {
                    allStrategiesByCandleAndSymbol[symbol][strategyID].IsDeleted = true
                }
                else {
                    delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]
                    delete allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]
                }
            }
            else {
                allStrategiesByCandleAndSymbol[symbol][strategyID].IsDeleted = true
            }
            const listConfigIDByScannerData = listConfigIDByScanner[scannerID]?.[symbol]

            if (listConfigIDByScannerData?.every(strategy => {
                const strategyID = strategy.value
                return !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.PartiallyFilledOC && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled
            })) {
                scannerID && delete listConfigIDByScanner[scannerID]?.[symbol]
            }

            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
            //     gongLai: true
            // })



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
            const Password = botData.Password

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    Password,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    Password,
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
                    newScannerData.ExpirePre = Date.now()

                    allScannerDataObject[symbol][scannerID] = newScannerData

                }
                else {
                    delete allScannerDataObject[symbol]?.[scannerID]
                }
            })

            raceMeData[scannerID] = {}

        }
    })
    await handleSocketBotApiList(newBotApiList)
}

// REALTIME
const socket = require('socket.io-client');
const { cancelOrderAllBE } = require('../../../controllers/Orders/OKX/orders');

const socketRealtime = socket(process.env.SOCKET_IP);


socketRealtime.on('connect', () => {
    console.log('\n[V] Connected Socket Realtime\n');
    socketRealtime.emit('joinRoom', SERVER_IP);
    socketRealtime.emit('joinRoom', 'OKX_V1');
});

socketRealtime.on('add', async (newData = []) => {

    await handleSocketAddNew(newData)

});

socketRealtime.on('update', async (newData = []) => {

    await handleSocketUpdate(newData, undefined, true)

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
        const Password = botData.Password

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const botID = botData._id
        const botName = botData.botName
        const scannerID = strategiesData?.scannerID?._id

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
            Password
        });

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
                Password: item.Password,
            }
        }
        return pre
    }, {});

    const listConfigIsDeleted = Object.values(allData || {})

    if (listConfigIsDeleted.length > 0) {

        await Promise.allSettled(listConfigIsDeleted.map(async item => {

            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                await Promise.allSettled(list.map(async item => {
                    const strategy = item.strategy
                    const strategyID = item.strategyID
                    const botID = item.botID
                    await handleCancelOrderOC({
                        ...item,
                        botData: botApiList[botID],
                        strategyID,
                        strategy,
                        OrderChange: strategy?.OrderChange,
                        orderLinkId: item.orderLinkId,
                        qty: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.qty,
                        IsDeleted: true
                    })
                }))

            }
        }))


        console.log("[V] Cancel All OC Success");
    }
});

socketRealtime.on('set-clearV', async (newData = {}) => {
    clearVData = newData
})
socketRealtime.on('clearV', async () => {
    handleClearV(true)
})

socketRealtime.on('scanner-add', async (newData = []) => {
    console.log("[...] Add BigBabol From Realtime", newData.length);
    const newBotApiList = {}

    newData.forEach(scannerData => {
        if (checkConditionBot(scannerData)) {

            const scannerID = scannerData._id

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
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    Password,
                    IsActive: true
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID,
                    telegramToken,
                    Password,
                    IsActive: true
                }
            }

            const setBlacklist = new Set(scannerData.Blacklist)
            scannerData.OnlyPairs.forEach(symbol => {
                if (!setBlacklist.has(symbol)) {
                    !allScannerDataObject[symbol] && (allScannerDataObject[symbol] = {})

                    const newScannerData = { ...scannerData }
                    newScannerData.ExpirePre = Date.now()

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
            delete listConfigIDByScanner?.[scannerID]
        })
        delete raceMeData[scannerID]
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
        const Password = botData.Password
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
                    telegramID: botData.telegramID,
                    telegramToken: botData.telegramToken,
                    Password,
                    IsActive: botActive
                }
            }
        }


        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
            Password
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
            botData,
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

                const botData = scannerItem.botID
                const ApiKey = botData.ApiKey
                const SecretKey = botData.SecretKey
                const botID = botData._id
                const botName = botData.botName
                const telegramID = botData.telegramID
                const telegramToken = botData.telegramToken
                const Password = botData.Password
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

                    allScannerDataObject[symbol] = allScannerDataObject[symbol] || {}

                    const newScannerData = { ...scannerItem }

                    newScannerData.ExpirePre = Date.now()

                    allScannerDataObject[symbol][scannerID] = newScannerData
                }
            }
        })
    })

    await handleCancelAllOrderTP({ items: listOrderTP })

    await cancelAllListOrderOC(listOrderOC)

    if (botApiData) {

        if (!botActive) {
            // allSymbol.forEach(async symbolItem => {
            //     resetMissData(`${botIDMain}-${symbolItem.symbol}-${symbolItem.market}`)
            // })
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

        const oldPassword = botApiData.Password
        const newPassword = newBotData.Password

        if ((oldApi != newApi) || (oldSecretKey != newSecretKey) || (oldPassword != newPassword)) {
            console.log("[...] Handle api change");

            // Unsub old api
            const wsOrderOld = botApiList[botIDMain].wsOrder
            await wsOrderOld?.unsubscribe(LIST_ORDER)
            await wsOrderOld?.closeAll()

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


    await Promise.allSettled(configData.map(async (strategiesData) => {

        const botData = strategiesData.botID
        const ApiKey = botData.ApiKey
        const SecretKey = botData.SecretKey
        const Password = botData.Password

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const botID = botData._id
        const botName = botData.botName

        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"


        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
            Password
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
            botData,
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

    const wsOrderOld = botApiList[botIDMain].wsOrder
    await wsOrderOld?.unsubscribe(LIST_ORDER)
    await wsOrderOld?.closeAll()

    delete listOCByCandleBot?.[botIDMain]

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

socketRealtime.on('sync-symbol', async (data) => {
    handleSocketSyncCoin(data)
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

    console.log(`[...] Close All Bot For Upcode`);

    updatingAllMain = true

    await cancelAllListOrderOC(listOCByCandleBot)

    console.log("[V] PM2 Kill Successful");
    const fileName = __filename.split(/(\\|\/)/g).pop()
    exec(`pm2 stop ${fileName}`)

});

socketRealtime.on('restart-code', async () => {
    handleRestartServer()
});

socketRealtime.on('set-lever', async (data) => {
    handleSetLeverForBotAndSymbol(data)
});
socketRealtime.on('set-lever-futures', async (data) => {
    handleSetLeverForBotAndSymbolFutures(data)
});

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});


process.on('exit', (code) => {
    console.log(`[!] Process exit with code ${code}`);
});
