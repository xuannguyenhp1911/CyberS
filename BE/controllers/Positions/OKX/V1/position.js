const { RestClient } = require('okx-api');

const CoinOKXV1 = require('../../../../models/Coins/OKX/coin.model');


const PositionController = {

    getPosition: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        const botID = dataBotItem.value

                        return client.getPositions().then(async viTheList => {

                            if (viTheList?.length > 0) {

                                const dataAll = await Promise.allSettled((viTheList.map(async viTheListItem => {

                                    const mgnMode = viTheListItem.mgnMode
                                    const instType = viTheListItem.instType
                                    let qty
                                    if (viTheListItem.liabCcy !== "USDT") {
                                        qty = viTheListItem.liab
                                    }
                                    else {
                                        qty = viTheListItem.pos
                                    }
                                    let Side = qty > 0 ? "Buy" : "Sell"
                                    if (instType == "SWAP") {
                                        Side = viTheListItem.posSide == "long" ? "Buy" : "Sell"
                                        qty = viTheListItem.pos
                                    }

                                    return {
                                        _id: viTheListItem.posId,
                                        Symbol: viTheListItem.instId,
                                        Price: viTheListItem.avgPx,
                                        usdValue: viTheListItem.notionalUsd,
                                        Pnl: viTheListItem.upl,
                                        Quantity: qty,
                                        Side,
                                        mgnMode,
                                        TimeUpdated: new Date(),
                                        instType,
                                        botID,
                                        botName: dataBotItem?.name,
                                        botData: dataBotItem,
                                    }
                                })))

                                newData = newData.concat(dataAll.map(data => data.value)).filter(item => item)
                            }

                        }).catch(error => {
                            console.log("Error", error);
                            return [];
                        });
                    }
                }));

                res.customResponse(200, "Refresh Position Successful", newData);
            }
            else {
                res.customResponse(200, "Refresh Position Successful", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getBalanceWallet: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                let minOrderQtyObject = {}

                const responseDigit = await CoinOKXV1.find()

                responseDigit.forEach((e) => {
                    const symbolSplit = e.symbol.split("-USDT")
                    if (symbolSplit[1] === "") {
                        minOrderQtyObject[symbolSplit[0]] = {
                            minOrderQty: e.minOrderQty,
                            basePrecision: e.basePrecision,
                            market: e.market,
                        }
                    }
                })


                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {
                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        const botID = dataBotItem.value

                        return client.getBalance().then(async viTheList => {

                            if (viTheList?.length > 0) {

                                const dataAll = await Promise.allSettled((viTheList.map(async viTheListData => {

                                    const dataAllList = []
                                    await Promise.allSettled(viTheListData.details.map(async viTheListItem => {

                                        const Symbol = viTheListItem.ccy
                                        const Quantity = +viTheListItem.availEq

                                        if (Quantity >= minOrderQtyObject[Symbol]?.minOrderQty || Symbol == "USDT") {
                                            dataAllList.push(
                                                {
                                                    _id: `${botID}-${Symbol}`,
                                                    instType: "SPOT",
                                                    Symbol,
                                                    Quantity,
                                                    usdValue: viTheListItem.eqUsd,
                                                    Side: "Buy",
                                                    Pnl: viTheListItem.spotUpl,
                                                    TimeUpdated: new Date(),
                                                    botID,
                                                    botName: dataBotItem?.name,
                                                    botData: dataBotItem,
                                                }
                                            )
                                        }

                                    }))

                                    return dataAllList
                                })))

                                newData = newData.concat(...dataAll.map(data => data.value));

                            }

                        }).catch(error => {
                            console.log("Error", error);
                            return [];
                        });
                    }
                }));

                res.customResponse(200, "Refresh Position Successful", newData);
            }
            else {
                res.customResponse(200, "Refresh Position Successful", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    closeAllPosition: async (req, res) => {
        try {
            const { botListID } = req.body

            let allViThe = {}

            await Promise.allSettled(botListID.map(dataBotItem => {

                const client = new RestClient({
                    testnet: false,
                    key: dataBotItem.ApiKey,
                    secret: dataBotItem.SecretKey,
                    syncTimeBeforePrivateRequests: true,
                });

                const botID = dataBotItem.value

                return client.getWalletBalance({
                    accountType: "UNIFIED"
                }).then(async response => {

                    const viTheList = response.result.list;

                    allViThe[botID] = {
                        ApiKey: dataBotItem.ApiKey,
                        SecretKey: dataBotItem.SecretKey,
                        listOC: viTheList.map(viTheListItem => (
                            {
                                side: viTheListItem.side === "Buy" ? "Sell" : "Buy",
                                symbol: `${viTheListItem.coin}USDT`,
                                qty: Math.floor(((+viTheListItem.walletBalance) - (+viTheListItem.walletBalance * 0.15) / 100)).toString(),
                                orderType: "Market",
                                positionIdx: 0,
                            }
                        ))
                    }
                })
            }))
            await PositionController.handleCancelAllPosition(
                Object.values(allViThe))

            res.customResponse(200, "Close All Position Successful", "");

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    repayAll: async (req, res) => {
        try {
            const { botListID } = req.body

            await Promise.allSettled(botListID.map(async dataBotItem => {

                const client = new RestClient({
                    apiKey: dataBotItem.ApiKey,
                    apiSecret: dataBotItem.SecretKey,
                    apiPass: dataBotItem.Password,
                });


                const coinRepay = ["MEME"]
                try {
                    const response = await client.submitOneClickRepay({
                        debtCcys:coinRepay,
                        repayCcy:"USDT"
                    })
                    console.log("response", response);
                } catch (error) {
                    console.log(error);

                }
            }))

            res.customResponse(200, "Repay All Successful", "");

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    handleCancelAllPosition: async (items = [], batchSize = 10) => {

        if (items.length > 0) {
            await Promise.allSettled(items.map(async item => {
                const client = new RestClient({
                    testnet: false,
                    key: item.ApiKey,
                    secret: item.SecretKey,
                    syncTimeBeforePrivateRequests: true,

                });
                const list = Object.values(item.listOC || {})

                if (list.length > 0) {
                    console.log(`[...] Total Position Can Be Cancelled: ${list.length}`);
                    let index = 0;
                    while (index < list.length) {
                        const batch = list.slice(index, index + batchSize);


                        await delay(1000)
                        index += batchSize
                    }
                }
            }))
            console.log("[V] Cancel All Position Successful");
        }
    },

    getPriceLimitCurrent: async (req, res) => {
        try {
            const { symbol } = req.body

            const client = new RestClient();

            await client.getCandlesV2({
                instId: symbol,
            }).then(response => {

                const priceCurrent = response[0]?.[4]
                res.customResponse(200, "Get Price Current Successful", priceCurrent);
            }).catch(() => {
                res.customResponse(400, "Get Price Current Failed", "");
            })

        } catch (error) {
            res.customResponse(500, "Get Price Current Error", "");
        }
    },

    closeMarket: async (req, res) => {

        const { positionData } = req.body

        const botData = positionData.botData
        const Symbol = positionData.Symbol

        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });

        const closePositionsObject = {
            ccy: "USDT",
            mgnMode: positionData.mgnMode,
            instId: Symbol,
            autoCxl: true,
        }
        if (positionData.instType == "SWAP") {
            closePositionsObject.posSide = positionData.Side == "Buy" ? "long" : "short"
        }

        client
            .closePositions(closePositionsObject)
            .then((res2) => {
                const response = res2[0]
                if (response) {
                    res.customResponse(200, "Close Market Successful");

                }
                else {
                    res.customResponse(400, "Close Market Failed");
                }
            })
            .catch((error) => {
                console.log(error);
                res.customResponse(500, error.msg);
            });

    },

    closeLimit: async (req, res) => {
        const { positionData, Quantity, Price } = req.body

        const symbol = positionData.Symbol
        const botData = positionData.botData
        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });

        client
            .submitOrder({
                tdMode: positionData.mgnMode,
                instId: symbol,
                ccy: positionData.ccy,
                side: (+Quantity) > 0 ? "buy" : "sell",
                ordType: 'limit',
                sz: Math.abs(Quantity).toString(),
                px: Math.abs(Price).toString(),
                reduceOnly: true
            })
            .then(async (response) => {
                if (response.retCode == 0) {

                    res.customResponse(200, "Close Limit Successful");

                }
                else {
                    res.customResponse(400, response.retMsg);
                }
            })
            .catch((error) => {
                console.log(error);

                res.customResponse(500, `Close Limit Error`);
            });

    },

    closeCoin: async (req, res) => {

        const { positionData, Quantity } = req.body

        const botData = positionData.botData
        const Symbol = positionData.Symbol

        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });
        client
            .submitOrder({
                instId: `${Symbol}-USDT`,
                side: 'sell',
                ordType: "market",
                sz: Quantity,
                tdMode: "cash",
                ccy: "USDT",
            })
            .then((res2) => {
                const response = res2[0]
                if (response.sCode == 0) {
                    res.customResponse(200, "Close Market Successful");
                }
                else {
                    res.customResponse(200, response.sMsg);
                }
            })
            .catch((error) => {
                console.log(error);
                res.customResponse(500, error.msg);
            });
    },

    // OTHER


    getPositionBEProtect: async (botListData = [], sendMessageWithRetry) => {
        try {

            const listViTheByBotData = {}
            if (botListData.length > 0) {
                await Promise.allSettled(botListData.map(async dataBotItem => {

                    const botID = dataBotItem.id
                    if (dataBotItem?.ApiKey) {
                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        await client.getPositions().then(viTheList => {
                            if (viTheList?.length > 0) {

                                let listSymbolText = ``
                                const viTheHaveData = []

                                viTheList.forEach(async (viTheListItem, index) => {

                                    const symbol = viTheListItem.instId
                                    let icon

                                    const instType = viTheListItem.instType
                                    let qty
                                    if (viTheListItem.liabCcy !== "USDT") {
                                        qty = viTheListItem.liab
                                    }
                                    else {
                                        qty = viTheListItem.pos
                                    }
                                    let side = qty > 0 ? "Buy" : "Sell"
                                    if (instType == "SWAP") {
                                        side = viTheListItem.posSide == "long" ? "Buy" : "Sell"
                                        qty = viTheListItem.pos
                                    }


                                    qty = Math.abs(qty).toString()

                                    const posSide = viTheListItem.posSide
                                    const dataPush = {
                                        ccy: "USDT",
                                        mgnMode: viTheListItem.mgnMode,
                                        instId: symbol,
                                        autoCxl: true,
                                        qty,
                                        side
                                    }
                                    if (symbol.includes("SWAP")) {
                                        icon = "🌻"
                                        dataPush.posSide = posSide
                                    }
                                    else {
                                        icon = "🍁"
                                    }
                                    viTheHaveData.push(dataPush)
                                    listSymbolText += `\n${index + 1}. <b>${symbol.split("-")[0]} ${icon}</b> • ${side} • ${(+qty).toFixed(2)} • ${(+viTheListItem.upl).toFixed(3)}$`
                                })
                                if (listSymbolText) {
                                    const listSend = `🔺 <b>Positions | ${dataBotItem?.botName}</b>: ${listSymbolText}`
                                    console.log(listSend);
                                    sendMessageWithRetry({
                                        messageText: listSend,
                                        telegramID: dataBotItem.telegramID,
                                        telegramToken: dataBotItem.telegramToken,
                                    })
                                }
                                if (viTheHaveData.length > 0) {
                                    listViTheByBotData[botID] = {
                                        botData: dataBotItem,
                                        viTheList: viTheHaveData
                                    }
                                }

                            }
                        })
                    }
                }))
            }
            return listViTheByBotData
        } catch (err) {
            console.log("getPositionBEProtect Error")
            console.log(err);
            return []
        }
    },
    getBalanceWalletBEProtect: async (botListData = [], sendMessageWithRetry) => {
        try {
            const listViTheByBotData = {}

            if (botListData.length > 0) {

                let minOrderQtyObject = {}

                const responseDigit = await CoinOKXV1.find()

                responseDigit.forEach((e) => {
                    const symbolSplit = e.symbol.split("-USDT")
                    if (symbolSplit[1] === "") {
                        minOrderQtyObject[symbolSplit[0]] = {
                            minOrderQty: e.minOrderQty,
                            basePrecision: e.basePrecision,
                            market: e.market,
                        }
                    }
                })

                await Promise.allSettled(botListData.map(async dataBotItem => {

                    const botID = dataBotItem.id
                    if (dataBotItem?.ApiKey) {
                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        await client.getBalance().then(viTheList => {
                            const viTheHaveData = []
                            let listSymbolText = ``

                            viTheList.forEach(async viTheListData => {

                                let viTheIndex = 0
                                viTheListData.details.forEach(async (viTheListItem) => {

                                    const Symbol = viTheListItem.ccy
                                    const Quantity = +viTheListItem.availEq

                                    if (Quantity >= minOrderQtyObject[Symbol]?.minOrderQty && Symbol != "USDT") {
                                        listSymbolText += `\n${viTheIndex + 1}. <b>${Symbol.split("-")[0]} 🍀</b> • ${Quantity > 0 ? "Buy" : "Sell"} • ${Quantity.toFixed(2)} • ${(+viTheListItem.spotUpl).toFixed(3)}$`
                                        viTheHaveData.push({
                                            instId: `${Symbol}-USDT`,
                                            side: "sell",
                                            ordType: "market",
                                            sz: Quantity,
                                            tdMode: "cash",
                                            ccy: "USDT",
                                        })
                                        viTheIndex++
                                    }

                                })
                            })
                            if (listSymbolText) {
                                const listSend = `🔺 <b>Balances | ${dataBotItem?.botName}</b>: ${listSymbolText}`
                                console.log(listSend);
                                sendMessageWithRetry({
                                    messageText: listSend,
                                    telegramID: dataBotItem.telegramID,
                                    telegramToken: dataBotItem.telegramToken,
                                })
                            }
                            if (viTheHaveData.length > 0) {
                                listViTheByBotData[botID] = {
                                    botData: dataBotItem,
                                    viTheList: viTheHaveData
                                }
                            }
                        })
                    }
                }))
            }
            return listViTheByBotData

        } catch (err) {
            console.log("getBalanceWalletBEProtect Error")
            console.log(err);
        }
    },
}

module.exports = PositionController 