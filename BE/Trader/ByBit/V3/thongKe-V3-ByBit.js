require('dotenv').config({
    path: "../../../.env"
});
const axios = require('axios');

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
const CHANNEL_ID = process.env.CHANNEL_ID_BYBIT_V3
const CHANNEL_ID_PUMP = process.env.CHANNEL_ID_BYBIT_V3_PUMP
const CHANNEL_ID_PUMP_2 = process.env.CHANNEL_ID_BYBIT_V3_PUMP_2
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

let listKline = []
let digit = []
let OpenTimem1 = []
let CoinFT = []
let messageList = []
let messageListPump = []
let messageListPump2 = []
let delayTimeOut = ""

let wsSymbol = new WebsocketClient({
    market: 'v5',
    recvWindow: 100000
});

let CoinInfo = new RestClientV5({
    testnet: false,
    recvWindow: 100000,
});



// async function sendMessageWithRetry(messageText, CHANNELID = CHANNEL_ID) {
//     const url = 'https://bypass-telegram.thanhgk799.workers.dev/';

//     const params = new URLSearchParams({
//         token: process.env.BOT_TOKEN_RADA,
//         chat_id: CHANNELID,
//         text: messageText,
//         SECRET_KEY: process.env.TELE_BYPASS_SECRET_KEY
//     });

//     try {
//         const response = await axios.get(`${url}?${params.toString()}`);

//         const channelName = response.data?.result?.chat?.title || CHANNELID;

//         console.log(`[->] Message sent to channel ( ${channelName} ) successfully`);
//         return

//     } catch (error) {
//         console.error('[!] Send Telegram Error:', error.response?.data || error.message);
//     }
// }

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
    let data = []
    await CoinInfo.getTickers({ category: 'linear' })
        .then((rescoin) => {
            rescoin.result.list.forEach((e) => {
                if (e.symbol.split("USDT")[1] === "") {
                    data.push(e.symbol)
                }
            })
        })
        .catch((error) => {
            console.error(error);
        });
    listKline = data.flatMap(symbol => ([
        `kline.1.${symbol}`,
        `kline.3.${symbol}`,
        `kline.5.${symbol}`,
        `kline.15.${symbol}`,
    ]))

    return data
}

const getVol24hBySymbol = async (symbol) => {
    let turnover24h = {}
    const res = await CoinInfo.getTickers({ category: 'linear', symbol })
    res.result.list.forEach((e) => {
        turnover24h = e.turnover24h

    })
    return turnover24h
}
async function TimeS0(symbol) { //lấy thời gian mở cửa của cây nến 1m
    let TimeStart = []
    await CoinInfo.getKline({
        category: 'linear',
        symbol: symbol,
        interval: '1',
    })
        .then((response) => {
            TimeStart.push(response.result.list[0][0])
            //console.log(TimeStart)
        })
        .catch((error) => {
            console.error(error);
        });
    return TimeStart
}

async function Digit(symbol) {// proScale
    let PScale = []
    await CoinInfo.getInstrumentsInfo({
        category: 'linear',
        symbol: symbol,
    })
        .then((response) => {
            PScale.push(response.result.list[0].priceScale)
            //console.log(PScale)
        })
        .catch((error) => {
            console.error(error);
        });
    return PScale
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

function tinhOC(symbol, data) {

    const interval = data.interval
    const Close = +data.close
    const Open = +data.open
    const Highest = +data.high
    const Lowest = +data.low

    // console.log("Close",Close);
    // console.log("Open",Open);
    // console.log("Lowest",Lowest);
    // console.log("Highest",Highest);

    // const vol = +data.volume * +data.open
    const vol = +data.turnover


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
        const ht = (`${handleIconCandle(interval)} | <b>${symbol.replace("USDT", "")}</b> • ${intervalText} • OC: ${OCRound}% • TP: ${TPRound}% • V: ${formatNumberString(vol)}`)
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
        const htLong = (`${handleIconCandle(interval)} | <b>${symbol.replace("USDT", "")}</b> • ${intervalText} • OC: ${OCLongRound}% • TP: ${TPLongRound}% • V: ${formatNumberString(vol)}`)
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

async function history(symbol, OpenTime, limit = 10, dg, percentDefault = 1, coinListWin50 = []) {
    let TimeStart = OpenTime - limit * 60000
    let TimeSop = OpenTime - 60000
    let data = []
    //console.log(`BTCUSDT Open m1 : ${TimeStart}`)

    CoinInfo.getMarkPriceKline({
        category: 'linear',
        symbol,
        interval: "1",
        start: TimeStart,
        end: TimeSop,
        limit,
    })
        .then((response) => {
            const candles = [];

            //console.log(response.result.list)
            for (let i = 0; i < limit; i++) {
                //console.log(response.result.list[i][1])
                candles.push({
                    open: response.result.list[i][1],
                    high: response.result.list[i][2],
                    low: response.result.list[i][3],
                    close: response.result.list[i][4]
                });
            }
            // console.log(`open0`, response.result.list[0][1])

            let winCountShort = 0
            let winCountLong = 0
            let totalShort = limit
            let totalLong = limit

            const OCDownPercent = 40 / 100
            const TPDownPercent2 = 45


            for (let i = candles.length - 1; i >= 0; i--) {
                const OCDefault = candles[i].open * (100 + percentDefault) / 100
                const TPTemp = candles[i].open * (100 + 1 - OCDownPercent) / 100
                const closeTemp = candles[i].close
                if (OCDefault <= candles[i].high) {
                    if (closeTemp > TPTemp) {
                        if (candles[i - 1]?.open) {
                            const hieu = Math.abs((candles[i - 1].open - TPTemp) * TPDownPercent2 / 100)
                            const TPNew = TPTemp + hieu
                            if (TPNew <= OCDefault) {
                                if (candles[i - 1].low <= TPNew) {
                                    winCountShort++
                                }
                                else {
                                    if (candles[i - 2]?.open) {
                                        const hieu = Math.abs((candles[i - 2].open - TPTemp) * TPDownPercent2 / 100)
                                        const TPNew = TPTemp + hieu
                                        if (TPNew <= OCDefault) {
                                            if (candles[i - 2].low <= TPNew) {
                                                winCountShort++
                                            }
                                            else {
                                                if (candles[i - 3]?.open) {
                                                    const hieu = Math.abs((candles[i - 3].open - TPTemp) * TPDownPercent2 / 100)
                                                    const TPNew = TPTemp + hieu
                                                    if (TPNew <= OCDefault) {
                                                        if (candles[i - 3].low <= TPNew) {
                                                            winCountShort++
                                                        }
                                                        else {
                                                        }
                                                    }
                                                    else {
                                                    }
                                                }
                                                else {
                                                }
                                            }
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                    }
                                }
                            }
                            else {
                            }
                        }
                        else {
                        }
                    }
                    else {
                        winCountShort++
                    }
                }
                else {
                    totalShort--
                }

            }

            for (let i = candles.length - 1; i >= 0; i--) {
                const OCDefault = candles[i].open * (100 - percentDefault) / 100
                const TPTemp = candles[i].open * (100 - (1 - OCDownPercent)) / 100
                const closeTemp = candles[i].close
                if (OCDefault >= candles[i].low) {
                    if (closeTemp < TPTemp) {
                        if (candles[i - 1]?.open) {
                            const hieu = Math.abs((candles[i - 1].open - TPTemp) * TPDownPercent2 / 100)
                            const TPNew = TPTemp - hieu
                            if (TPNew >= OCDefault) {
                                if (candles[i - 1].high >= TPNew) {
                                    winCountLong++
                                }
                                else {
                                    if (candles[i - 2]?.open) {
                                        const hieu = Math.abs((candles[i - 2].open - TPTemp) * TPDownPercent2 / 100)
                                        const TPNew = TPTemp - hieu
                                        if (TPNew >= OCDefault) {
                                            if (candles[i - 2].high >= TPNew) {

                                                winCountLong++
                                            }
                                            else {
                                                if (candles[i - 3]?.open) {
                                                    const hieu = Math.abs((candles[i - 3].open - TPTemp) * TPDownPercent2 / 100)
                                                    const TPNew = TPTemp - hieu
                                                    if (TPNew >= OCDefault) {
                                                        if (candles[i - 3].high >= TPNew) {

                                                            winCountLong++
                                                        }
                                                        else {
                                                        }
                                                    }
                                                    else {
                                                    }
                                                }
                                                else {
                                                }
                                            }
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                    }
                                }
                            }
                            else {
                            }
                        }
                        else {
                        }
                    }
                    else {
                        winCountLong++
                    }
                }
                else {
                    totalLong--
                }

            }

            const shortPercent = (winCountShort / totalShort * 100).toFixed(3)
            const longPercent = (winCountLong / totalLong * 100).toFixed(3)

            const winShort = winCountShort && totalShort ? `${winCountShort} / ${totalShort}` : 0
            const winLong = winCountLong && totalLong ? `${winCountLong} / ${totalLong}` : 0


            // if (shortPercent > 80 && longPercent > 80) {
            //     let messageText = `${symbol} ( OC: ${percentDefault}% ):\n`
            //     if (shortPercent > 80) {

            //         messageText += `Short: ${winShort} - `
            //     }
            //     if (longPercent > 80) {
            //         messageText += `Long: ${winLong} - `
            //     }
            //     console.log(messageText);
            //     coinListWin50.push(messageText.slice(0, -2))
            //     // bot.telegram.sendMessage(CHANNEL_ID, messageText.slice(0, -2));
            // }
            const percentDefaultWin = 80
            if (shortPercent > percentDefaultWin || longPercent > percentDefaultWin) {
                let messageText = `🌎 <b>${symbol.replace("USDT", "")} ( OC: ${percentDefault}% ):</b>\n`
                let messageTextItem = ``
                if (shortPercent > percentDefaultWin) {

                    messageTextItem += `Short: ${winShort} - `
                }
                if (longPercent > percentDefaultWin) {
                    messageTextItem += `Long: ${winLong} - `
                }
                console.log(messageText + messageTextItem);
                coinListWin50.push(`${messageText}<i>${messageTextItem.slice(0, -2)}</i>`)
            }
            // else{
            //     console.log("Not Coin Win > 80%");
            // }

        })
        .catch((error) => {
            console.error(error);
        });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processCoin(coinItem, coinListWin50, percentDefault, nenCount) {
    const OpenTimem1 = TimeS0("BTCUSDT");
    const digit = Digit(coinItem);
    await Promise.all([OpenTimem1, digit])
    await history(coinItem, OpenTimem1, nenCount, digit, percentDefault, coinListWin50);
}

async function processCoinsWithDelay(coinList, delayTime, percentDefault, nenCount) {
    const coinListWin50 = []
    for (const index in coinList) {
        await processCoin(coinList[index], coinListWin50, percentDefault, nenCount);
        index % 50 == 0 && await delay(delayTime);
    }
    return coinListWin50
}


const handleStatistic = async (statisticLabel) => {


    const delayTime = 10;
    const percentDefault2 = 2
    const percentDefault25 = 2.5
    const percentDefault3 = 3
    const percentDefault35 = 3.5
    // Số cây nến
    const nenCount = 100;

    console.log(statisticLabel, new Date().toLocaleString("vi-vn"));

    const get2 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault2, nenCount)
    sendMessageWithRetry(get2.join("\n"))
    await delay(1000)

    const get25 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault25, nenCount)
    sendMessageWithRetry(get25.join("\n"))
    await delay(1000)

    const get3 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault3, nenCount)
    sendMessageWithRetry(get3.join("\n"))
    await delay(1000)

    const get35 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault35, nenCount)
    sendMessageWithRetry(get35.join("\n"))
    await delay(1000)
}


let Main = async () => {


    CoinFT = await ListCoinFT()

    wsSymbol.subscribeV5(listKline, 'linear').catch((err) => { console.log(err) });

    let statistic1 = false

    let statistic3 = false

    let statistic5 = false

    const statisticTimeLoop1 = [
        {
            hour: 6,
            minute: 0
        },
        {
            hour: 15,
            minute: 0
        },
        {
            hour: 22,
            minute: 0
        },
    ]
    const statisticTimeLoop3 = [
        {
            hour: 6,
            minute: 5
        },
        {
            hour: 15,
            minute: 5
        },
        {
            hour: 22,
            minute: 5
        },
    ]
    const statisticTimeLoop5 = [
        {
            hour: 6,
            minute: 10
        },
        {
            hour: 15,
            minute: 10
        },
        {
            hour: 22,
            minute: 10
        },
    ]


    wsSymbol.on('update', async (dataCoin) => {
        if (dataCoin.wsKey === "v5LinearPublic") {

            if (dataCoin.data[0].confirm === true) {

                const symbol = dataCoin.topic.split(".").slice(-1)[0]
                tinhOC(symbol, dataCoin.data[0])

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


        }

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