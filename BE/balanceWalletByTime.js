const { default: axios } = require('axios');
require('dotenv').config();
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const { getAllBotActiveBE, getBotDataBE, getFutureSpotByBitBE, getFutureSpotOKXBE, getFutureSpotBinanceBE } = require('./controllers/bot');
const { balanceWalletByBitBE } = require('./controllers/Configs/ByBit/V3/config');
const { balanceWalletOKXBE } = require('./controllers/Configs/OKX/V1/spot');
const { balanceWalletBinanceBE } = require('./controllers/Configs/Binance/V3/config');

var botListTelegram = {}

var botBalance = {}

const formatNumber = number => {
    return Math.abs(number).toLocaleString("en-EN")

}


// async function sendMessageWithRetryByBot({
//     messageText,
//     telegramID,
//     telegramToken,
// }) {
//     const url = 'https://bypass-telegram.thanhgk799.workers.dev/';

//     const params = new URLSearchParams({
//         token: telegramToken,
//         chat_id: telegramID,
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

const sendMessageWithRetryByBot = async ({
    messageText,
    retries = 2,
    telegramID,
    telegramToken,
    botName
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
        }
        for (let i = 0; i < retries; i++) {
            try {
                if (messageText) {
                    // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                    await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageText, {
                        parse_mode: "HTML"
                    });
                    console.log(`[->] Message sent to ( ${botName} ) telegram successfully`);
                    return;
                }
            } catch (error) {
                if (error.code === 429) {
                    const retryAfter = error.parameters?.retry_after;
                    console.log(`[!] Rate limited. Retrying after ${retryAfter} seconds...`)
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
const handleWalletBalance = async (botID = "") => {

    const botData = await getBotDataBE(botID)

    if (botData) {
        if (botData?.Status == "Running") {

            const botType = botData.botType
            const API_KEY = botData.ApiKey
            const SECRET_KEY = botData.SecretKey

            let resultGetMoney = {}

            let balancePrice = 0

            switch (botType) {
                case "ByBit_V3":
                case "ByBit_V1": {
                    resultGetMoney = await getFutureSpotByBitBE(botData)
                    const future = +resultGetMoney?.future
                    const spotTotal = +resultGetMoney?.spotTotal

                    balancePrice = spotTotal + future

                    botData.spotTotal = spotTotal
                    botData.future = future
                    break
                }
                case "OKX_V1":
                    {
                        resultGetMoney = await getFutureSpotOKXBE(botData)

                        const future = +resultGetMoney?.future
                        botData.spotTotal = +resultGetMoney?.fundingUSDT
                        botData.future = future

                        balancePrice = (+resultGetMoney.spotTotal) + future
                        break
                    }
                case "Binance_V3": {
                    resultGetMoney = await getFutureSpotBinanceBE(botData)
                    const future = +resultGetMoney?.future
                    const spotTotal = +resultGetMoney?.spotTotal

                    balancePrice = spotTotal + future

                    botData.spotTotal = spotTotal
                    botData.future = future
                    break
                }
            }

            botData.spotSavings = +botData?.spotSavings
            // botData.errorGetSpot = resultGetMoney?.errorGetSpot
            // botData.errorGetFuture = resultGetMoney?.errorGetFuture

            const newSpotAvailable = botData.spotTotal - botData.spotSavings


            const targetFuture = (newSpotAvailable + botData.future) * ((botData.futureBalancePercent || botData.futureBalancePercent == 0) ? botData.futureBalancePercent : 50) / 100;

            let amount = Math.abs(targetFuture - botData.future);
            let futureLarger = targetFuture < botData.future

            let teleText = `<b>Bot:</b> ${botData.botName}`

            if (amount > 0.1) {
                switch (botData.futureBalancePercent) {
                    case 100: {
                        futureLarger = false
                        amount = newSpotAvailable
                        break
                    }
                    case 0: {
                        futureLarger = true
                        amount = futureAvailable
                        break
                    }
                }

                const amountText = formatNumber(amount)
                const checkWin = futureLarger ? `😎 Unif-Fund` : `😢 Fund-Unif`
                teleText += `<code>\n${checkWin}: ${amountText}$</code>`

                switch (botType) {
                    case "ByBit_V3":
                    case "ByBit_V1": {
                        await balanceWalletByBitBE({
                            amount,
                            futureLarger,
                            API_KEY,
                            SECRET_KEY,
                            Demo: botData.Demo
                        })
                        break
                    }
                    case "OKX_V1":
                        {
                            await balanceWalletOKXBE({
                                amount,
                                futureLarger,
                                botData
                            })
                            break
                        }
                    case "Binance_V3": {
                        await balanceWalletBinanceBE({
                            amount,
                            futureLarger,
                            botID
                        })
                        break
                    }

                }
                console.log(`\n[V] Saving ( ${botData.botName} ) Successful\n`);
            }
            else {
                teleText += `<code>\n😐 Unif-Fund: 0$</code>`
            }



            // if (botData?.errorGetSpot) {
            //     teleText += `\n<code>Error Get Spot: ${botData?.errorGetSpot}</code>`
            // }
            // if (botData?.errorGetFuture) {
            //     teleText += `\n<code>Error Get Future: ${botData?.errorGetFuture}</code>`
            // }
            teleText += `\n💵 <b>Balance:</b> ${formatNumber(balancePrice)}$`

            balancePrice && sendMessageWithRetryByBot({
                messageText: teleText,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
                botName: botData.botName
            })
        }
    }
    else {
        const botDataPre = botBalance[botID]
        const botName = botData?.botName
        console.log(`[X] Bot ( ${botName} ) off balance`);
        botDataPre?.schedule && botDataPre?.schedule?.stop()
    }

}

const setBalanceBot = (botData = {}) => {
    const timeBalanceLoop = (botData?.timeBalanceLoop || botData?.timeBalanceLoop == 0) ? botData?.timeBalanceLoop : 3
    const botID = botData._id

    botBalance[botID] = {
        timeBalanceLoop,
        botName: botData?.botName
    }

    if (timeBalanceLoop > 0) {

        const schedule = cron.schedule(`0 */${timeBalanceLoop} * * *`, () => {
            handleWalletBalance(botID)
        });
        botBalance[botID].schedule = schedule
    }
}
const Main = async () => {

    const allBot = await getAllBotActiveBE()
    allBot.forEach(botData => {
        setBalanceBot(botData)
    })

}

Main()

const socket = require('socket.io-client');

const socketRealtime = socket(process.env.SOCKET_IP);


socketRealtime.on('connect', () => {
    console.log('\n[V] Connected Socket Realtime\n');
    socketRealtime.emit('joinRoom', process.env.SERVER_IP);
    socketRealtime.emit('joinRoom', 'Balance');
});

socketRealtime.on('Balance', async (newData = {}) => {
    const { botData, timeBalanceLoop } = newData
    const newTime = Math.abs(timeBalanceLoop)
    const botID = botData._id
    if (botID) {
        const botDataPre = botBalance[botID]

        const botName = botData?.botName
        const time = botData?.timeBalanceLoop || 3
        if (botDataPre) {
            if (time != newTime) {
                botDataPre?.schedule && botDataPre?.schedule?.stop()
                if (newTime > 0) {
                    console.log(`[V] Bot ( ${botName} ) change time balance`);
                    const newSchedule = cron.schedule(`0 */${newTime} * * *`, () => {
                        handleWalletBalance(botID)
                    });
                    botBalance[botID].schedule = newSchedule
                }
                else {
                    console.log(`[X] Bot ( ${botName} ) cancel balance`);
                }
                botBalance[botID].timeBalanceLoop = newTime
            }
        }
        else {
            if (botData?.Status == "Running") {
                console.log(`[V] Set balance ( ${botName} )`);
                setBalanceBot(botData)
            }
        }
    }
});