require('dotenv').config({
    path: "../../../.env"
});

const TelegramBot = require('node-telegram-bot-api');

const { RestClientV5, WebsocketClient } = require('bybit-api');
var cron = require('node-cron');

const bot = new TelegramBot(process.env.BOT_TOKEN_RADA, {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});
const CHANNEL_ID = process.env.CHANNEL_ID_BYBIT_V1


var sendTeleCount = {
    logError: false,
    total: 0
}
let messageList = []
var listKlineObject = {}

var preTurnover = {}
var symbolObject = {}
var trichMauTimeMainSendTele = {
    pre: 0,
}

let wsSymbol = new WebsocketClient({
    market: 'v5',
    recvWindow: 100000
});

let CoinInfo = new RestClientV5({
    testnet: false,
    recvWindow: 100000,
});

//Funcition

async function sendMessageWithRetry(messageText, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            messageText && await bot.sendMessage(CHANNEL_ID, messageText, {
                parse_mode: "HTML",
            });
            console.log('[->] Message sent to telegram successfully');
            return;
        } catch (error) {
            if (error.code === 429) {
                const retryAfter = error.parameters?.retry_after;
                console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                console.log("[!] Send Telegram Error", error)
            }
        }
    }
    throw new Error('Failed to send message after multiple retries');

}



async function ListCoinSpot() {

    let ListCoin1m = []

    const getv1 = await CoinInfo.getInstrumentsInfo({ category: 'spot' })
    const rescoin = getv1?.result?.list || []
    rescoin.forEach((e) => {
        const symbol = e.symbol
        if (symbol.split("USDT")[1] === "") {
            ListCoin1m.push(`kline.D.${symbol}`)
        }
        symbolObject[symbol] = e.marginTrading != "none" ? "🍁" : "🍀"

    })

    // return ListCoin1m
    return [`kline.D.LAYERUSDT`]
}



const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}

const formatNumberString = (number = 0) => {
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

const sendMessageTinhOC = async (messageList) => {
    console.log(`Send telegram tính OC ( 🍁 ): `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
    await sendMessageWithRetry(messageList.join("\n\n"))

}

const tinhOC = (symbol, data = {}) => {

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


    // if (true) {
    if (vol >= 0) {
        if (Math.abs(OCRound) >= .1 && Math.abs(TPRound) >= 0) {
            const ht = (`${symbolObject[symbol]} | <b>${symbol.split("-")[0]}</b> • OC: ${OCRound}% • TP: ${TPRound}% • V: ${formatNumberString(vol)}`)

            messageList.push({
                symbol,
                message: ht
            })
            console.log(ht, new Date(timestamp).toLocaleTimeString());
            console.log(data);
        }

        if (Math.abs(OCLongRound) >= .1 && Math.abs(TPLongRound) >= 0) {
            const htLong = (`${symbolObject[symbol]} | <b>${symbol.split("-")[0]}</b> • OC: ${OCLongRound}% • TP: ${TPLongRound}% • V: ${formatNumberString(vol)}`)
            messageList.push({
                symbol,
                message: htLong
            })
            console.log(htLong, new Date(timestamp).toLocaleTimeString());
            console.log(data);
        }
    }


    // if (messageList.length > 0) {
    //     const time = Date.now()
    //     if (time - trichMauTimeMainSendTele.pre >= 3000) {
    //         sendTeleCount.total += 1
    //         sendMessageTinhOC(messageList)
    //         messageList = []
    //         trichMauTimeMainSendTele.pre = time
    //     }
    // }

}

let Main = async () => {

    const listKlineSpot = await ListCoinSpot()

    wsSymbol.subscribeV5(listKlineSpot, 'spot').then(() => {
        console.log("[V] Subscribe Kline Successful");

        wsSymbol.on('update', (dataCoin) => {
            const [_, candle, symbol] = dataCoin.topic.split(".");
            const dataMain = dataCoin.data[0]
            const timestamp = +dataMain.timestamp
            const turnover = +dataMain.turnover
            const coinCurrent = +dataMain.close


            listKlineObject[symbol] = listKlineObject[symbol] || {
                timestamp,
                open: coinCurrent,
                high: coinCurrent,
                low: coinCurrent,
                close: coinCurrent,
                turnover,
            }
            if (coinCurrent > listKlineObject[symbol].high) {
                listKlineObject[symbol].high = coinCurrent
            }
            if (coinCurrent < listKlineObject[symbol].low) {
                listKlineObject[symbol].low = coinCurrent
            }
          

            listKlineObject[symbol].close = coinCurrent

            if (timestamp - listKlineObject[symbol].timestamp >= 3000) {

                const dataSend = listKlineObject[symbol]
                listKlineObject[symbol] = {
                    timestamp,
                    open: coinCurrent,
                    high: coinCurrent,
                    low: coinCurrent,
                    close: coinCurrent,
                    turnover,
                }

                tinhOC(symbol, {
                    ...dataSend,
                    turnover: turnover - dataSend.turnover
                })
                listKlineObject[symbol].timestamp = timestamp
                listKlineObject[symbol].turnover = turnover
            }
        })
    }).catch((err) => { console.log(err) });

    // const listKlineFutures = await ListCoinFutures()

    // wsSymbol.subscribeV5(listKlineFutures, 'inverse').then(() => {
    //     console.log("[V] Subscribe Kline Successful");

    //     wsSymbol.on('update', (dataCoin) => {
    //         const dataMain = dataCoin.data[0]

    //         const coinCurrent = +dataMain.close
    //         const turnover = +dataMain.turnover
    //         const timestamp = dataMain.timestamp
    //         const [_, candle, symbol] = dataCoin.topic.split(".");

    //         listKlineObject[symbol] = listKlineObject[symbol] || { timestamp, listData: [] }
    //         listKlineObject[symbol].listData.push(dataMain)
    //         if (timestamp - listKlineObject[symbol].timestamp >= 1000) {
    //             if (listKlineObject[symbol].listData?.length > 1) {
    //                 console.log(listKlineObject[symbol].listData);
    //             }
    //         }
    //     })
    // }).catch((err) => { console.log(err) });

    //Báo lỗi socket$ pm2 start app.js
    wsSymbol.on('error', () => {
        process.exit(1);
    });

};

try {
    Main()

    // setInterval(() => {

    //     Object.values(listKlineObject).forEach(symbol => {
    //         tinhOC(symbol, trichMauDataArray[symbol])
    //         const coinCurrent = trichMauData[symbol].close
    //         const turnover = trichMauData[symbol].turnover
    //         trichMauData[symbol] = {
    //             open: coinCurrent,
    //             close: coinCurrent,
    //             high: coinCurrent,
    //             low: coinCurrent,
    //             turnover,
    //         }
    //         preTurnover[symbol] = turnover
    //         trichMauDataArray[symbol] = []
    //     })
    //     listKlineObject = {}
    // }, 3000)

    setTimeout(() => {
        cron.schedule('0 */3 * * *', async () => {
            process.exit(0);
        });
    }, 1000)
}

catch (e) {
    console.log("Error Main:", e)
}