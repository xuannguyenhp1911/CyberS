require('dotenv').config({
    path: "../../../.env"
});

const TelegramBot = require('node-telegram-bot-api');

const { WebsocketClient, RestClient } = require('okx-api');
var cron = require('node-cron');
const { default: axios } = require('axios');

let wsSymbol = new WebsocketClient({
    market: "business"
});

const client = new RestClient()

const bot = new TelegramBot(process.env.BOT_TOKEN_RADA, {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});

const CHANNEL_ID = process.env.CHANNEL_ID_OKX_V1

var sendTeleCount = {
    logError: false,
    total: 0
}
let messageList = []

var preTurnover = {}
var trichMauData = {}
var trichMauDataArray = {}
var trichMau = {}
var symbolObject = {}
var trichMauTimeMainSendTele = {
    pre: 0,
}




//Funcition


// async function sendMessageWithRetry( messageText, CHANNELID = CHANNEL_ID) {
//     const url = 'https://bypass-telegram.thanhgk799.workers.dev/';

//     const params = new URLSearchParams({
//         token: process.env.BOT_TOKEN_RADA,
//         chat_id: CHANNELID,
//         text: messageText,
//         SECRET_KEY:process.env.TELE_BYPASS_SECRET_KEY
//     });

//     try {
//         const response = await axios.get(`${url}?${params.toString()}`);

//         const channelName = response.data?.result?.chat?.title || CHANNELID;
        
//         console.log(`[->] Message sent to channel ( ${channelName} ) successfully`);
        
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
async function getListSymbol() {

    let listSymbol = {}

    const getSpot = client.getInstruments({         instType: "SPOT"     })
    const getMargin = client.getInstruments({         instType: "MARGIN"     })
    const getFutures = client.getInstruments({         instType: "SWAP"     })

    try {
        const resultGetAll = await Promise.allSettled([getSpot, getMargin, getFutures])

        resultGetAll.forEach((symbolListData) => {
            symbolListData.value?.forEach(symbolData => {
                let check = false
                if (symbolData.instType != "SWAP") {
                    check = symbolData.quoteCcy == "USDT"
                }
                else {
                    check = symbolData.settleCcy == "USDT"
                }
                if (check) {
                    const symbol = symbolData.instId

                    listSymbol[symbol] = {
                        channel: "candle1s",
                        instId: symbolData.instId
                    }

                    let iconMarket
                    switch (symbolData.instType) {
                        case "MARGIN": {
                            iconMarket = "🍁"
                            break
                        }
                        case "SPOT": {
                            iconMarket = "🍀"
                            break
                        }
                        case "SWAP": {
                            iconMarket = "🌻"
                            break
                        }
                    }
                    symbolObject[symbol] = iconMarket

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
                }
            })
        })
    } catch (error) {
        console.log(`[!] Error get symbol: ${error.message}`);
    }

    return listSymbol

}



const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}

const getVol24hBySymbol = async (symbol) => {
    const res = await client.getTicker({instId:symbol})
    const data = res?.[0]
    const volCcy24h = data?.volCcy24h
    let vol = volCcy24h || 0
    if (symbol.includes("SWAP")) {
        vol = data?.last * volCcy24h
    }

    return vol
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

const sendMessageTinhOC = async (messageList) => {
    let messageListHandle = ""
    await Promise.allSettled(messageList.map(async item => {
        const vol24h = await getVol24hBySymbol(item.symbol)
        if (vol24h >= 10 ** 6) {
            messageListHandle += `${item.message} • V24H: ${formatNumberString(vol24h)}\n\n`
        }
    }))
    console.log(`Send telegram tính OC ( 🍁 ): `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
    await sendMessageWithRetry(messageListHandle)
}


const formatTime = time => new Date(time).toLocaleTimeString()



const tinhOC = (symbol, data = {}) => {

    const Close = +data.close
    const Open = +data.open
    const Highest = +data.high
    const Lowest = +data.low
    const vol = data.turnover
    const timestamp = data.timestamp

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
    if (vol >= 10 * 1000) {
        if (Math.abs(OCRound) >= .35 && Math.abs(TPRound) > 50) {
            const ht = (`${symbolObject[symbol]} | <b>${symbol.split("-")[0]}</b> • OC: ${OCRound}% • TP: ${TPRound}% • V: ${formatNumberString(vol)}`)

            messageList.push({
                symbol,
                message: ht
            })
            console.log(ht);
            console.log(data);
        }

        if (Math.abs(OCLongRound) >= .35 && Math.abs(TPLongRound) > 50) {
            const htLong = (`${symbolObject[symbol]} | <b>${symbol.split("-")[0]}</b> • OC: ${OCLongRound}% • TP: ${TPLongRound}% • V: ${formatNumberString(vol)}`)
            messageList.push({
                symbol,
                message: htLong
            })
            console.log(htLong);
            console.log(data);
        }
    }


    if (messageList.length > 0) {
        const time = Date.now()
        if (time - trichMauTimeMainSendTele.pre >= 3000) {
            sendTeleCount.total += 1
            sendMessageTinhOC(messageList)
            messageList = []
            trichMauTimeMainSendTele.pre = time
        }
    }

}
let Main = async () => {


    const listSymbolObject = await getListSymbol()

    const listSymbol = Object.values(listSymbolObject)

    await wsSymbol.subscribe(listSymbol)

    wsSymbol.on('update', (dataCoin) => {

        const dataMain = dataCoin.data[0]
        const symbol = dataCoin.arg.instId

        let turnover = +dataMain[6]

        if (symbol.includes("SWAP")) {
            turnover = +dataMain[7]
        }

        tinhOC(symbol, {
            timestamp: +dataMain[0],
            open: +dataMain[1],
            high: +dataMain[2],
            low: +dataMain[3],
            close: +dataMain[4],
            turnover
        })


    });


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