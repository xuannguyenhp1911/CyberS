const { USDMClient, generateNewOrderId } = require('binance');
const PositionModel = require('../../../models/Positions/Binance/V3/position.model');
const ServerModel = require('../../../models/servers.model');

const PositionController = {

    // OTHER 
    getRestClientV5Config: ({
        ApiKey,
        SecretKey,
        Demo
    }) => {
        const client = new USDMClient({
            api_key: ApiKey,
            api_secret: SecretKey,
            beautifyResponses: true,
            recvWindow: 10000,
            useTestnet: !Demo ? false : true,

        })
        client.setTimeOffset(-3000)
        return client
    },
    handleSendDataRealtime: ({
        type,
        data = []
    }) => {
        const groupedByBotID = data.reduce((acc, item) => {
            const serverIP = item.serverIP

            if (!acc[serverIP]) {
                acc[serverIP] = [];
            }

            acc[serverIP].push(item);

            return acc;
        }, {});

        const list = Object.keys(groupedByBotID)
        list?.length > 0 && Promise.allSettled(list.map(async serverIPID => {

            const dataToSend = groupedByBotID[serverIPID];

            const resData = await ServerModel.findOne({ _id: serverIPID })

            if (!resData) return
            const serverIP = resData.IP

            if (dataToSend?.length > 0) {
                const { socketServer } = require('../../../../serverConfig');
                socketServer.to(serverIP).emit(type, dataToSend)
            }
        }))
    },
    // 
    getAllPosition: async (req, res) => {
        try {
            const { botListID } = req.body
            const data = await PositionModel.find({ botID: { $in: botListID } }).populate("botID")
            // const data = await BotApiModel.find({ botID })
            res.customResponse(res.statusCode, "Get All Position Successful", data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },


    updatePL: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {

                    if (dataBotItem?.ApiKey) {
                        const client = PositionController.getRestClientV5Config({
                            ApiKey: dataBotItem.ApiKey,
                            SecretKey: dataBotItem.SecretKey,
                            Demo: dataBotItem.Demo,
                        });
                        const botID = dataBotItem.value

                        return client.getPositionsV3({

                        }).then(async viTheList => {

                            if (viTheList?.length > 0) {
                                const dataPosition = await PositionModel.find({ botID: botID }).populate("botID")

                                const dataPositionObject = dataPosition.reduce((pre, cur) => {
                                    pre[`${botID}-${cur.Symbol}`] = cur
                                    return pre
                                }, {})

                                const dataAll = await Promise.allSettled((viTheList.map(async viTheListItem => {

                                    const Symbol = viTheListItem.symbol
                                    const positionID = `${botID}-${Symbol}`
                                    const positionData = dataPositionObject[positionID]

                                    let data = {
                                        Pnl: viTheListItem.unRealizedProfit,
                                        Side: viTheListItem.positionSide == "LONG" ? "Buy" : "Sell",
                                        Price: +viTheListItem.entryPrice,
                                        Symbol,
                                        Quantity: Math.abs(viTheListItem.positionAmt),
                                        botID,
                                        botName: dataBotItem?.name,
                                        botData: dataBotItem
                                    }
                                    if (positionData?._id) {
                                        data = {
                                            ...data,
                                            _id: positionData?._id,
                                            Time: positionData?.Time,
                                            TimeUpdated: new Date(),
                                            Miss: positionData.Miss,
                                        }
                                        delete dataPositionObject[positionID]
                                    }
                                    else {
                                        data = {
                                            ...data,
                                            Time: new Date(),
                                            TimeUpdated: new Date(),
                                            Miss: true,
                                        }
                                        const resNew = await PositionController.createPositionBE(data)
                                        data = {
                                            ...data,
                                            _id: resNew?.id || positionID,
                                        }

                                    }
                                    return data
                                })))

                                newData = newData.concat(dataAll.map(data => data.value))

                                const positionOld = Object.values(dataPositionObject)

                                positionOld.length > 0 && await PositionModel.deleteMany({ _id: { $in: positionOld.map(item => item._id) } })
                            }
                            else {
                                return await PositionModel.deleteMany({ botID: botID })
                            }

                        }).catch(error => {
                            console.log("Error Position V3", error);
                            return [];
                        });
                    }
                }));

                res.customResponse(200, "Refresh Position V3 Successful", newData);
            }
            else {
                res.customResponse(200, "Refresh Position V3 Successful", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    closeAllPosition: async (req, res) => {
        try {
            const { botListID, positionData } = req.body
            await Promise.allSettled(positionData.map(data => {
                const botData = data.botData
                const client = PositionController.getRestClientV5Config({
                    ApiKey: botData.ApiKey,
                    SecretKey: botData.SecretKey,
                    Demo: botData.Demo,
                });
                const randomID = generateNewOrderId()

                client.submitNewOrder({
                    symbol: data.Symbol,
                    side: data.Side == "Buy" ? "SELL" : "BUY",
                    type: 'MARKET',
                    quantity: data.Quantity,
                    positionSide: data.Side == "Buy" ? "LONG" : "SHORT",
                    newClientOrderId: `web_${randomID}`
                })
            }))


            res.customResponse(200, "Close All Position Successful", "");

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },


    getPriceLimitCurrent: async (req, res) => {
        try {
            const { symbol } = req.body

            const client = new USDMClient({
                recvWindow: 10000,
            });
            client.setTimeOffset(-3000)

            await client.getSymbolPriceTickerV2({
                symbol
            }).then(response => {
                res.customResponse(200, "Get Price Current Successful", response.price);
            }).catch(err => {
                res.customResponse(400, "Get Price Current Failed", "");
            })

        } catch (error) {
            res.customResponse(500, "Get Price Current Error", "");
        }
    },

    closeMarket: async (req, res) => {

        const { positionData, Quantity } = req.body

        const client = PositionController.getRestClientV5Config({
            ApiKey: positionData.botData.ApiKey,
            SecretKey: positionData.botData.SecretKey,
            Demo: positionData.botData.Demo,
        });
        const side = positionData.Side === "Sell" ? "BUY" : "SELL"
        const positionSide = positionData.Side === "Sell" ? "SHORT" : "LONG"

        const randomID = generateNewOrderId()
        client
            .submitNewOrder({
                symbol: positionData.Symbol,
                side,
                type: 'MARKET',
                quantity: Quantity,
                positionSide,
                newClientOrderId: `web_${randomID}`
            })
            .then((response) => {

                if (response) {
                    res.customResponse(200, "Close Market Successful");
                    PositionController.deletePositionBE({
                        orderID: positionData.id
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log(err);
                    })
                }
                else {
                    res.customResponse(400, response.retMsg);
                }
            })
            .catch((error) => {
                res.customResponse(500, error?.message);
            });
    },

    closeLimit: async (req, res) => {
        const { positionData, Quantity, Price } = req.body

        const symbol = positionData.Symbol
        const client = PositionController.getRestClientV5Config({
            ApiKey: positionData.botData.ApiKey,
            SecretKey: positionData.botData.SecretKey,
            Demo: positionData.botData.Demo,
        });
        const side = positionData.Side === "Sell" ? "BUY" : "SELL"
        const positionSide = positionData.Side === "Sell" ? "SHORT" : "LONG"
        const randomID = generateNewOrderId()

        client
            .submitNewOrder({
                symbol,
                side,
                type: 'LIMIT',
                quantity: Quantity,
                price: Price,
                timeInForce: 'GTC',
                positionSide,
                newClientOrderId: `web_${randomID}`
            })
            .then(async (response) => {

                if (response) {

                    const result = await PositionModel.updateOne({ Symbol: symbol, botID: positionData.botID }, {
                        $set: {
                            Miss: false,
                            TimeUpdated: new Date()
                        }
                    });

                    if (result.acknowledged && result.matchedCount !== 0) {
                        console.log(`[Mongo-Limit] Update Position ( ${positionData.BotName} ) Successful`)
                    }
                    else {
                        console.log(`[Mongo-Limit] Update Position ( ${positionData.BotName} ) Failed`)
                    }

                    res.customResponse(200, "Close Limit Successful");

                }
                else {
                    console.log(response);

                    if (response.retCode == 110017) {
                        const text = side === "Sell" ? "cao hơn" : "thấp hơn"
                        res.customResponse(400, `Giá TP không được ${text} giá TP hiện tại`);
                    }
                    else {
                        res.customResponse(400, response.retMsg);
                    }
                }
            })
            .catch((error) => {
                res.customResponse(500, error?.message);
            });

    },

    // OTHER

    getPositionBySymbol: async ({ symbol, botID }) => {
        try {
            const data = await PositionModel.findOne({
                Symbol: symbol,
                botID: botID
            }).lean()

            if (data) {
                return {
                    message: "[Mongo] Re-Get Position Successful",
                    id: data._id
                }
            }
            else {
                return {
                    message: "[Mongo] Re-Get Position Failed",
                    id: ""
                }
            }
        } catch (error) {
            return {
                message: `[Mongo] Re-Get Position Error: ${error}`,
                id: ""
            }

        }
    },

    createPositionBE: async (newData) => {
        try {

            const newBot = new PositionModel({
                ...newData,
                Time: new Date(),
                TimeUpdated: new Date()
            });

            const savedBot = await newBot.save();

            if (savedBot) {
                return {
                    message: "[Mongo] Add Position Successful",
                    id: savedBot._id
                }
            }
            else {
                return {
                    message: "[Mongo] Add Position Failed",
                    id: ""
                }
            }

        } catch (error) {
            return {
                message: `[Mongo] Add Position Error: ${error}`,
                id: ""
            }
        }
    },

    updatePositionBE: async ({
        newDataUpdate,
        orderID
    }) => {
        try {

            const result = await PositionModel.updateOne({ _id: orderID }, {
                $set: newDataUpdate
            });

            if (result.acknowledged && result.matchedCount !== 0) {
                return "[Mongo] Update Position Successful"
            }
            else {
                return `[Mongo] Update Position Failed`
            }

        } catch (error) {
            return `[Mongo] Update Position Error: ${error}`
        }
    },

    deletePositionBE: async ({ orderID }) => {
        try {

            const result = await PositionModel.deleteOne({ _id: orderID })

            if (result.deletedCount && result.deletedCount !== 0) {
                return "[Mongo] Delete Position Successful"
            }
            else {
                return `[Mongo] Delete Position Failed ${orderID}`
            }

        } catch (error) {
            return `[Mongo] Delete Position Error ${error}`
        }
    },


}

module.exports = PositionController 