const { default: axios } = require('axios');
require('dotenv').config({
    path: "../../../.env"
});

const cron = require('node-cron');

const {
    getPositionBEProtect,
    getBalanceWalletBEProtect
} = require('../../../controllers/Positions/OKX/V1/position');

const { RestClient } = require('okx-api');
const { getAllBotActiveByBotTypeBE } = require('../../../controllers/bot');
const TelegramBot = require('node-telegram-bot-api');
const { getAllOrderOKXBEProtect } = require('../../../controllers/Orders/OKX/orders');


var botApiList = {}

var listPositionByID = {}
var listBalanceByID = {}
var listOrderByID = {}
var botListTelegram = {}

// 
const handleIconMarketType = (market) => {
    switch (market) {
        case "MARGIN": {
            return "🍁"
        }
        case "SPOT": {
            return "🍀"
        }
        case "SWAP": {
            return "🌻"
        }
    }
}
// const sendMessageWithRetry = async ({
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
//         for (let i = 0; i < retries; i++) {

//             const params = new URLSearchParams({
//                 token: telegramToken,
//                 chat_id: telegramID,
//                 text: messageText,
//                 SECRET_KEY:process.env.TELE_BYPASS_SECRET_KEY
//             });
        
//             try {
//                 const response = await axios.get(`${url}?${params.toString()}`);
        
//                 const channelName = response.data?.result?.chat?.title || CHANNELID;
                
//                 console.log(`[->] Message sent to channel ( ${channelName} ) successfully`);
//                 return
                
//             } catch (error) {
//                 console.error('[!] Send Telegram Error:', error.response?.data || error.message);
//             }
//         }
//     } catch (error) {
//         console.log("[!] Bot Telegram Error", error)
//     }
// };

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
const handleGetPositionAll = async () => {
    const listViTheObject = await getPositionBEProtect(Object.values(botApiList), sendMessageWithRetry)

    const newListPositionByID = {}
    listViTheObject && Object.values(listViTheObject)?.length > 0 && await Promise.allSettled(Object.values(listViTheObject).map(async viTheData => {
        const botData = viTheData.botData
        const botID = botData.id
        const viTheList = viTheData.viTheList
        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        })
        const botName = botData.botName
        let textTele = `<b>💳 Close positions | ${botName}:</b>`
        let closeAll = false
        let index = 0


        await Promise.allSettled(viTheList.map(async (objectCloseMarketData) => {
            const objectCloseMarket = objectCloseMarketData
            const symbolMain = objectCloseMarket.instId
            // const side = objectCloseMarket.mgnMode == "cross" ? "Buy" : "Sell"
            const side = objectCloseMarket.side
            const Symbol = symbolMain?.split("-")[0]

            const listBalanceID = `${botID}-${Symbol}-${side}-${objectCloseMarket.qty}`
            let icon
            if (symbolMain.includes("SWAP")) {
                icon = "🌻"
            }
            else {
                icon = "🍁"
            }

            if (listPositionByID[listBalanceID]) {
                closeAll = true
                await client
                    .closePositions(objectCloseMarket)
                    .then((res) => {
                        if (res) {
                            textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> Success`
                        }
                        else {
                            textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> 🟡 Failed`
                        }
                    })
                    .catch(() => {
                        textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> 🔴 Error`
                    });


                index++
            }
            else {
                newListPositionByID[listBalanceID] = true
            }
        }))

        if (closeAll) {
            console.log(textTele);
            sendMessageWithRetry({
                messageText: textTele,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
            })
        }

    }))
    listPositionByID = newListPositionByID


}
const handleGetBalanceAll = async () => {
    const listViTheObject = await getBalanceWalletBEProtect(Object.values(botApiList), sendMessageWithRetry)
    const newListBalanceByID = {}

    listViTheObject && Object.values(listViTheObject)?.length > 0 && await Promise.allSettled(Object.values(listViTheObject).map(async viTheData => {
        const botData = viTheData.botData
        const botID = botData.id
        const viTheList = viTheData.viTheList
        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        })
        const botName = botData.botName
        let textTele = `<b>💳 Close balances | ${botName}:</b>`
        let closeAll = false
        let index = 0
        await Promise.allSettled(viTheList.map(async (objectCloseMarket) => {
            const Symbol = objectCloseMarket.instId?.split("-")[0]
            const listBalanceID = `${botID}-${Symbol}-${objectCloseMarket.sz}`
            if (listBalanceByID[listBalanceID]) {
                closeAll = true
                await client
                    .submitOrder(objectCloseMarket)
                    .then((res) => {
                        const response = res[0]
                        if (response.sCode == 0) {
                            textTele += `\n${index + 1}. <b>${Symbol} 🍀</b> -> Success`
                        }
                        else {
                            textTele += `\n${index + 1}. <b>${Symbol} 🍀</b> -> 🟡 Failed: ${response.sMsg}`
                        }
                    })
                    .catch((error) => {
                        const errorText = error.data?.[0]?.sMsg || error.msg
                        textTele += `\n${index + 1}. <b>${Symbol} 🍀</b> -> 🔴 Error: ${errorText}`
                    });
                index++

            }
            else {
                newListBalanceByID[listBalanceID] = true
            }
        }))
        if (closeAll) {
            console.log(textTele);
            sendMessageWithRetry({
                messageText: textTele,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
            })
        }
    }))
    listBalanceByID = newListBalanceByID

}
const handleGetOrderAll = async () => {
    const listViTheObject = await getAllOrderOKXBEProtect(Object.values(botApiList))
    const newListBalanceByID = {}

    listViTheObject && Object.values(listViTheObject)?.length > 0 && await Promise.allSettled(Object.values(listViTheObject).map(async viTheData => {
        const botData = viTheData.botData
        const botID = botData.id
        const viTheList = viTheData.viTheList
        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        })
        const botName = botData.botName
        let textTele = `<b>🔄 Cancel orders | ${botName}:</b>`
        let closeAll = false
        let index = 0

        await Promise.allSettled(viTheList.map(async (objectCloseMarket) => {

            const instId = objectCloseMarket.instId
            const side = objectCloseMarket.side
            const market = objectCloseMarket.market
            const priceOrder = objectCloseMarket.priceOrder
            const Symbol = instId?.split("-")[0]
            const icon = handleIconMarketType(market)
            const listBalanceID = `${botID}-${Symbol}-${market}-${side}`
            if (listOrderByID[listBalanceID] == priceOrder) {
                closeAll = true
                await client
                    .cancelOrder({
                        instId,
                        ordId: objectCloseMarket.ordId
                    })
                    .then((res) => {
                        const response = res[0]
                        if (response.sCode == 0) {
                            textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> Success`
                        }
                        else {
                            textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> 🟡 Failed: ${response.sMsg}`
                        }
                    })
                    .catch((error) => {
                        const errorText = error.data?.[0]?.sMsg || error.msg
                        textTele += `\n${index + 1}. <b>${Symbol} ${icon}</b> • ${side} -> 🔴 Error: ${errorText}`
                    });
                index++

            }
            else {
                newListBalanceByID[listBalanceID] = priceOrder
            }
        }))

        listOrderByID = newListBalanceByID

        if (closeAll) {
            console.log(textTele);
            sendMessageWithRetry({
                messageText: textTele,
                telegramID: botData.telegramID,
                telegramToken: botData.telegramToken,
            })
        }
    }))

}
// 
const Main = async () => {

    const allBotData = await getAllBotActiveByBotTypeBE("OKX_V1")

    allBotData.forEach(botData => {

        const botID = botData._id
        botApiList[botID] = {
            id: botID,
            botName: botData.botName,
            ApiKey: botData.ApiKey,
            SecretKey: botData.SecretKey,
            Password: botData.Password,
            telegramID: botData.telegramID,
            telegramToken: botData.telegramToken,
            IsActive: true
        }
    })

    cron.schedule('*/10 * * * * *', () => {
        handleGetPositionAll()
        handleGetBalanceAll()
    });

    // cron.schedule('*/10 * * * *', () => {
    //     handleGetOrderAll()
    // });
}

try {
    Main()
}

catch (e) {
    console.log("Error Main:", e)
}
const socket = require('socket.io-client');

const socketRealtime = socket(process.env.SOCKET_IP);
socketRealtime.on('connect', () => {
    console.log('\n[V] Connected Socket Realtime\n');
    const SERVER_IP = process.env.SERVER_IP
    socketRealtime.emit('joinRoom', SERVER_IP);
    socketRealtime.emit('joinRoom', 'OKX_V1');
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

socketRealtime.on('bot-update', async (data) => {
        const { botIDMain, botData } = data;
        const botNameExist = botApiList[botIDMain]?.botName || botIDMain

        console.log(`[...] Bot-Update ( ${botNameExist} ) Update From Realtime`);
        
        botApiList[botIDMain] = botData
})

