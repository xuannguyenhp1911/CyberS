require('dotenv').config({
    path: "../../../.env"
});

const TelegramBot = require('node-telegram-bot-api');

const { WebsocketClient, RestClient } = require('okx-api');
var cron = require('node-cron');

const bot = new TelegramBot(process.env.BOT_TOKEN_RADA, {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});
const CHANNEL_ID = process.env.CHANNEL_ID_OKX_V3
const CHANNEL_ID_PUMP = process.env.CHANNEL_ID_OKX_V3_PUMP
const CHANNEL_ID_PUMP_2 = process.env.CHANNEL_ID_OKX_V3_PUMP_2
const TK_DATA = {
    "1": {
        OC: 2.5,
        TP: 25
    },
    "3": {
        OC: 5,
        TP: 25
    },
    "5": {
        OC: 7.5,
        TP: 25
    },
    "15": {
        OC: 11,
        TP: 25
    },
}

let listKline = []
let digit = []
let OpenTimem1 = []
let CoinFT = []
let messageList = []
let messageListPump = []
let messageListPump2 = []
let delayTimeOut = ""

let wsSymbol = new WebsocketClient({
    market: "business"
});

const client = new RestClient()



//Funcition
async function sendMessageWithRetry(messageText, CHANNELID = CHANNEL_ID) {
    for (let i = 0; i < 5; i++) {
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



async function getListSymbol() {

    const listKline = []
    try {
        const resultGetAll = await client.getInstruments({         instType: "SWAP"     })

        resultGetAll.forEach((symbolData) => {
            if (symbolData.settleCcy == "USDT") {
                const symbol = symbolData.instId
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
            }
        })
    } catch (error) {
        console.log(`[!] Error get symbol: ${error.message}`);
    }

    return listKline

}


const getVol24hBySymbol = async (symbol) => {
    const res = await client.getTicker(symbol)
    const data = res?.[0]
    const volCcy24h = data?.volCcy24h
    let vol = volCcy24h || 0
    if (symbol.includes("SWAP")) {
        vol = data?.last * volCcy24h
    }
    return vol
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
        case 1: {
            return "🟠"
        }
        case 3: {
            return "🟡"
        }
        case 5: {
            return "🟢"
        }
        case 15: {
            return "🟣"
        }
    }
}

function tinhOC(symbol, dataMain, interval) {

    const Open = +dataMain[1]
    const Highest = +dataMain[2]
    const Lowest = +dataMain[3]
    const Close = +dataMain[4]
    const vol = +dataMain[6]


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

    //console.log(OC);
    //console.log(TP);

    //if (OC < Math.abs(OC1)) { OC = OC1 }
    //if (Close < Open) { TP = TP1 }

    //console.log(`${symbol} : Price Close ${Close}, Price OC ${OC}`)

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
        const ht = (`${handleIconCandle(interval)} | <b>${symbol.split("-")[0]}</b> • ${intervalText} • OC: ${OCRound}% • TP: ${TPRound}% • V: ${formatNumberString(vol)}`)
        messageList.push(ht);
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
        const htLong = (`${handleIconCandle(interval)} | <b>${symbol.split("-")[0]}</b> • ${intervalText} • OC: ${OCLongRound}% • TP: ${TPLongRound}% • V: ${formatNumberString(vol)}`)
        messageList.push(htLong);
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


let Main = async () => {

    const listKline = await getListSymbol()

    await wsSymbol.subscribe(listKline)

    wsSymbol.on('update', async (dataCoin) => {

        const dataMain = dataCoin.data[0]
        const arg = dataCoin.arg
        const symbol = arg.instId
        const candle = +arg.channel.split("candle")[1].split("m")[0]
        const dataConfirm = +dataMain[8]

        if (dataConfirm == true) {

            tinhOC(symbol, dataMain, candle)

            delayTimeOut && clearTimeout(delayTimeOut)

            delayTimeOut = setTimeout(async () => {
                if (messageList.length) {
                    console.log(`Send telegram tính OC: `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
                    sendMessageWithRetry(messageList.join("\n\n"))
                    messageList = []
                }
                if (messageListPump.length) {
                    console.log(`Send telegram tính OC Pump: `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
                    let messagePump = ""
                    await Promise.allSettled(messageListPump.map(async item => {
                        const vol24h = await getVol24hBySymbol(item.symbol)
                        messagePump += `${item.message} • V24H: ${formatNumberString(vol24h)}\n\n`
                    }))
                    sendMessageWithRetry(messagePump, CHANNEL_ID_PUMP)
                    messageListPump = []
                }
                if (messageListPump2.length) {
                    let messagePump = ""
                    await Promise.allSettled(messageListPump2.map(async item => {
                        const vol24h = await getVol24hBySymbol(item.symbol)
                        messagePump += `${item.message} • V24H: ${formatNumberString(vol24h)}\n\n`
                    }))
                    sendMessageWithRetry(messagePump, CHANNEL_ID_PUMP_2)
                    messageListPump2 = []
                }
            }, 2000)
        }

        // if (dataCoin.topic.indexOf("kline.1.BTCUSDT") != -1) {
        //     if (dataCoin.data[0].confirm == true) {
        //         console.log("Trade 1 Closed: ", new Date().toLocaleString("vi-vn"));
        //         !statistic1 && statisticTimeLoop1.map(item => {
        //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
        //                 handleStatistic("Statistic 1...")
        //             });
        //         })
        //         statistic1 = true
        //     }
        // }

        // if (dataCoin.topic.indexOf("kline.3.BTCUSDT") != -1) {
        //     if (dataCoin.data[0].confirm == true) {
        //         console.log("Trade 3 Closed: ", new Date().toLocaleString("vi-vn"));
        //         !statistic3 && statisticTimeLoop3.map(item => {
        //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
        //                 handleStatistic("Statistic 3...")
        //             });
        //         })
        //         statistic3 = true
        //     }
        // }


        // if (dataCoin.topic.indexOf("kline.5.BTCUSDT") != -1) {
        //     if (dataCoin.data[0].confirm == true) {
        //         console.log("Trade 5 Closed: ", new Date().toLocaleString("vi-vn"));
        //         !statistic5 && statisticTimeLoop5.map(item => {
        //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
        //                 handleStatistic("Statistic 5...")
        //             });
        //         })
        //         statistic5 = true
        //     }
        // }




    });


    //Báo lỗi socket$ pm2 start app.js
    wsSymbol.on('error', (err) => {
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