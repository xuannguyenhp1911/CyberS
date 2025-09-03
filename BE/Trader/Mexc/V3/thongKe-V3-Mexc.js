require('dotenv').config({
    path: "../../../.env"
});
const { MarketClient, MainSocket } = require("../../../packages/mexc-api");

const socket = new MainSocket();
const marketClient = new MarketClient()

var cron = require('node-cron');

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN_RADA, {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});
const CHANNEL_ID = process.env.CHANNEL_ID_BINANCE_V3
const CHANNEL_ID_PUMP = process.env.CHANNEL_ID_BINANCE_V3_PUMP
const CHANNEL_ID_PUMP_2 = process.env.CHANNEL_ID_BINANCE_V3_PUMP_2

let messageList = []
let messageListPump = []
let messageListPump2 = []
let coinListData = {}
let delayTimeOut = ""
const candleKlineData = {}

const TK_DATA = {
    "1": {
        OC: 3,
        TP: 40
    },
    "3": {
        OC: 6,
        TP: 40
    },
    "5": {
        OC: 9,
        TP: 35
    },
    "15": {
        OC: 12,
        TP: 35
    },
}


const getVol24hBySymbol = async (symbol) => {
    const res = await marketClient.get24hrChangeStatistics({ symbol })
    return res.quoteVolume
}

//Funcition
async function sendMessageWithRetry(messageText, CHANNELID = CHANNEL_ID) {
    for (let i = 0; i < 2; i++) {
        try {
            messageText && await bot.sendMessage(CHANNELID, messageText, {
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



async function ListCoinFT() {
    const list = {}
    const data = await marketClient.getTicker()
    data.forEach(item => {
        const symbol = item.symbol
        if (symbol?.split("_USDT")[1] == "") {
            list[symbol] = {
                symbol,
                vol24h: item.amount24
            }
        }
    })
    return list
}

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
        return number.toString();
    }
}

const handleIconCandle = (candle) => {
    switch (candle) {
        case "1": {
            return "🟠"
        }
        case "3": {
            return "🟡"
        }
        case "5": {
            return "🟢"
        }
        case "15": {
            return "🟣"
        }
    }
}

function tinhOC(symbol, data, interval) {

    const Close = +data.c
    const Open = +data.o
    const Highest = +data.h
    const Lowest = +data.l
    const vol = +data.a

    let OC = ((Highest - Open) / Open) || 0
    let TP = ((Highest - Close) / (Highest - Open)) || 0

    let OCLong = (Lowest - Open) / Open || 0
    let TPLong = (Close - Lowest) / (Open - Lowest) || 0

    if (OC == "Infinity") {
        console.log("Open", Open);
        OC = 0
    }
    if (TP == "Infinity") {
        TP = 0
    }
    if (OCLong == "Infinity") {
        OCLong = 0
    }
    if (TPLong == "Infinity") {
        TPLong = 0
    }

    const OCRound = roundNumber(OC)
    const TPRound = roundNumber(TP)
    const OCLongRound = roundNumber(OCLong)
    const TPLongRound = roundNumber(TPLong)

    const intervalText = Math.abs(interval) != 15 ? `${interval}min` : "15Min"

    const OCRoundABS = Math.abs(OCRound)
    const OCRoundLongABS = Math.abs(OCLongRound)
    const TPRoundABS = Math.abs(TPRound)
    const TPRoundLongABS = Math.abs(TPLongRound)


    if (OCRoundABS > 1) {
        const ht = (`${handleIconCandle(interval)} | <b>${symbol.replace("_USDT", "")}</b> • ${intervalText} • OC: ${OCRound}% • TP: ${TPRound}% • V: ${formatNumberString(vol)}`)
        messageList.push({
            symbol,
            message: ht
        })
        switch (Math.abs(interval)) {
            case 1:
                OCRoundABS >= 4 && messageListPump.push({
                    symbol,
                    message: ht
                })
                OCRoundABS >= TK_DATA[1].OC && TPRoundABS > TK_DATA[1].TP && messageListPump2.push({
                    symbol,
                    message: ht
                })
                break;
            case 3:
                OCRoundABS >= TK_DATA[3].OC && TPRoundABS > TK_DATA[3].TP && messageListPump2.push({
                    symbol,
                    message: ht
                })
                break;
            case 5:
                OCRoundABS >= TK_DATA[5].OC && TPRoundABS > TK_DATA[5].TP && messageListPump2.push({
                    symbol,
                    message: ht
                })
                break;
            case 15:
                OCRoundABS >= 10 && messageListPump.push({
                    symbol,
                    message: ht
                })
                OCRoundABS >= TK_DATA[15].OC && TPRoundABS > TK_DATA[15].TP && messageListPump2.push({
                    symbol,
                    message: ht
                })
                break;
        }
    }
    if (OCRoundLongABS > 1) {
        const htLong = (`${handleIconCandle(interval)} | <b>${symbol.replace("_USDT", "")}</b> • ${intervalText} • OC: ${OCLongRound}% • TP: ${TPLongRound}% • V: ${formatNumberString(vol)}`)
        messageList.push({
            symbol,
            message: htLong
        })
        switch (Math.abs(interval)) {
            case 1:
                OCRoundLongABS >= 4 && messageListPump.push({
                    symbol,
                    message: htLong
                })
                OCRoundLongABS >= TK_DATA[1].OC && TPRoundLongABS > TK_DATA[1].TP && messageListPump2.push({
                    symbol,
                    message: htLong
                })
                break;
            case 3:
                OCRoundLongABS >= TK_DATA[3].OC && TPRoundLongABS > TK_DATA[3].TP && messageListPump2.push({
                    symbol,
                    message: htLong
                })
                break;
            case 5:
                OCRoundLongABS >= TK_DATA[5].OC && TPRoundLongABS > TK_DATA[5].TP && messageListPump2.push({
                    symbol,
                    message: htLong
                })
                break;
            case 15:
                OCRoundLongABS >= 10 && messageListPump.push({
                    symbol,
                    message: htLong
                })
                OCRoundLongABS >= TK_DATA[15].OC && TPRoundLongABS > TK_DATA[15].TP && messageListPump2.push({
                    symbol,
                    message: htLong
                })
                break;
        }
    }
}


async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const splitHandleFunction = async ({
    batchSize = 10,
    list = [],
    func = (batch) => { },
}) => {
    let index = 0;
    while (index < list.length) {
        const batch = list.slice(index, index + batchSize);
        func(batch)
        await delay(1000)
        index += batchSize;
    }
}


let Main = async () => {

    coinListData = await ListCoinFT()

    splitHandleFunction({
        batchSize: 100,
        list: Object.values(coinListData),
        // list: [{ symbol: "GALA_USDT" }],
        func: async (batch) => {
            await Promise.allSettled(batch.map((symbolData) => {
                const symbol = symbolData.symbol
                Promise.allSettled(["Min1","Min5","Min15"].map((interval) => {
                    const candleKlineDataID = `${symbol}-${interval}`
                    candleKlineData[candleKlineDataID] = {}
                    socket.sub('kline', { symbol: symbol, interval });
                }))
            }))
        }
    })


    socket.on('message', async (dataCoin) => {
        const channel = dataCoin.channel
        const symbol = dataCoin.symbol
        const dataMain = dataCoin.data
        const candle = dataMain.interval
        
        if (channel == "push.kline") {
            const time = new Date(dataCoin.ts).getMinutes()
            const candleKlineDataID = `${symbol}-${candle}`

            const interval = candle.split("Min")[1]
            const preTime = candleKlineData[candleKlineDataID]?.time
            const dataClosed = preTime && (time - preTime) == interval 

            if (dataClosed) {
                candleKlineData[candleKlineDataID].time =  time

                tinhOC(symbol, candleKlineData[candleKlineDataID].dataMain, interval)
                delayTimeOut && clearTimeout(delayTimeOut)

                delayTimeOut = setTimeout(async () => {
                    // if (messageList.length) {
                    //     console.log(`Send telegram tính OC: `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
                    //     await splitHandleFunction({
                    //         list: messageList,
                    //         func: (batchData) => {
                    //             const messagePump = batchData.reduce((pre, item) => {
                    //                 pre += `${item.message} • V24H: ${formatNumberString(coinListData[item.symbol].vol24h)}\n\n`
                    //                 return pre
                    //             }, "")
                    //             sendMessageWithRetry(messagePump)
                    //         }
                    //     })
                    //     messageList = []
                    // }

                    // if (messageListPump.length) {
                    //     console.log(`Send telegram tính OC Pump: `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
                    //     const messagePump = messageListPump.reduce((pre, item) => {
                    //         pre += `${item.message} • V24H: ${formatNumberString(coinListData[symbol].vol24h)}\n\n`
                    //         return pre
                    //     }, "")
                    //     sendMessageWithRetry(messagePump, CHANNEL_ID_PUMP)
                    //     messageListPump = []
                    // }
                    if (messageListPump2.length) {

                        await splitHandleFunction({
                            list: messageListPump2,
                            func: (batchData) => {
                                const messagePump = batchData.reduce((pre, item) => {
                                    pre += `${item.message} • V24H: ${formatNumberString(coinListData[item.symbol].vol24h)}\n\n`
                                    return pre
                                }, "")
                                sendMessageWithRetry(messagePump, CHANNEL_ID_PUMP_2)
                            }
                        })
                        messageListPump2 = []
                    }
                }, 2000)
            }

            candleKlineData[candleKlineDataID].dataMain = dataMain
            candleKlineData[candleKlineDataID].time = candleKlineData[candleKlineDataID].time || time

        }
    });


    //Báo lỗi socket$ pm2 start app.js
    socket.on('error', (err) => {
        console.log(err);

        process.exit(1);
    });

};

try {
    Main()

    setTimeout(() => {
        cron.schedule('0 */3 * * *', async () => {
            process.exit(0);
        });
    }, 1000)
}

catch (e) {
    console.log("Error Main:", e)
}