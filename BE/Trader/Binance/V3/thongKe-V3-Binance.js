require('dotenv').config({
    path: "../../../.env"
});


const { WebsocketClient, USDMClient } = require('binance');
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
let delayTimeOut = ""

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

let wsSymbol = new WebsocketClient();

let CoinInfo = new USDMClient({
    recvWindow: 10000,
});

const getVol24hBySymbol = async (symbol) => {
    const res = await CoinInfo.get24hrChangeStatistics({symbol})
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
    let listKline = []
    await CoinInfo.get24hrChangeStatistics()
        .then((rescoin) => {
            rescoin.forEach((e) => {
                if (e.symbol.split("USDT")[1] === "") {
                    listKline.push(e.symbol)
                }
            })
        })
        .catch((error) => {
            console.error(error);
        });
    return listKline
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

    const interval = data.i.split("m")[0]
    const Close = +data.c
    const Open = +data.o
    const Highest = +data.h
    const Lowest = +data.l


    const vol = +data.q


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


async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let Main = async () => {

    const listKline = await ListCoinFT()


    await Promise.allSettled(listKline.map((symbol) => {
        Promise.allSettled(["1m", "3m", "5m", "15m"].map((interval) => {
            wsSymbol.subscribeKlines(symbol, interval, "usdm")
        }))
    }))

    wsSymbol.on('message', async (dataCoin) => {
        const symbol = dataCoin.s
        const dataMain = dataCoin.k
        if (dataMain.x == true) {
            tinhOC(symbol, dataMain)
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


    });


    //Báo lỗi socket$ pm2 start app.js
    wsSymbol.on('error', (err) => {
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