const PositionV3Model = require('../../../../models/Positions/Binance/V3/position.model')
const StrategiesModel = require('../../../../models/Configs/Binance/V3/config.model')
const BotModel = require('../../../../models/bot.model')
const ServerModel = require('../../../../models/servers.model')
const { default: mongoose } = require('mongoose');
const { MainClient } = require('binance');

const dataCoinByBitController = {
    // SOCKET
    getRestClientV5Config: ({
        ApiKey,
        SecretKey,
        Demo
    }) => {
        const client = new MainClient({
            api_key: ApiKey,
            api_secret: SecretKey,
            beautifyResponses: true,
            recvWindow: 10000,
            useTestnet: !Demo ? false : true,

        })
        client.setTimeOffset(-3000)
        return client

    },
    sendDataRealtime: ({
        type,
        data,
        serverIP
    }) => {
        const { socketServer } = require('../../../../serverConfig');
        socketServer.to(serverIP).emit(type, data)
    },

    handleSendDataRealtime: ({
        type,
        data = []
    }) => {
        const groupedByBotID = data.reduce((acc, item) => {
            const serverIP = item.botID.serverIP

            if (!acc[serverIP]) {
                acc[serverIP] = [];
            }

            acc[serverIP].push(item);

            return acc;
        }, {});

        
        
        const list = Object.keys(groupedByBotID)
        list?.length > 0 && Promise.allSettled(list.map(async serverIPID => {
            
            const resData = await ServerModel.findOne({_id: serverIPID})
            if (!resData) return
            const serverIP = resData.IP            
            
            const dataToSend = groupedByBotID[serverIPID];

            dataToSend?.length > 0 && dataCoinByBitController.sendDataRealtime({
                type,
                serverIP,
                data: dataToSend
            });
        }))
    },

    getAllConfigScannerV3: async (req, res) => {
        try {
            const userID = req.user._id

            const { botListInput } = req.body

            const botList = botListInput.map(item => new mongoose.Types.ObjectId(item));

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "botID": { $in: botList }
                    }
                },
                {
                    $addFields: {
                        hasUserID: {
                            $cond: {
                                if: { $in: [userID, { $ifNull: ["$bookmarkList", []] }] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                },
                {
                    $sort: {
                        hasUserID: -1,
                    }
                },
            ]).sort({ IsBookmark: -1 })


            const handleResult = await StrategiesModel.populate(resultFilter, [
                { path: 'botID' },
                { path: 'groupCoinOnlyPairsID' },
                { path: 'groupCoinBlacklistID' },
            ]);


            res.customResponse(200, "Get All Config Successful", handleResult);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // CREATE
    createConfigScannerV3: async (req, res) => {

        try {
            const userID = req.user._id

            const { data: newData, botListId, Blacklist, OnlyPairs } = req.body

            let result

            const TimeTemp = new Date().toString()

            if (newData.PositionSide === "Both") {
                result = await StrategiesModel.insertMany(
                    [
                        ...botListId.map(botID => ({ ...newData, PositionSide: "Long", botID, userID, TimeTemp, Blacklist, OnlyPairs })),
                        ...botListId.map(botID => ({ ...newData, PositionSide: "Short", botID, userID, TimeTemp, Blacklist, OnlyPairs }))
                    ]
                )
            }
            else {
                result = await StrategiesModel.insertMany(
                    botListId.map(botID => ({ ...newData, botID, userID, TimeTemp, Blacklist, OnlyPairs }))
                );
            }

            const handleResult = await StrategiesModel.find({
                IsActive: true,
                userID,
                TimeTemp
            }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

            if (result) {

                handleResult.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "add",
                    data: handleResult
                })




                res.customResponse(200, "Add New Config Successful", []);
            }
            else {
                res.customResponse(400, "Add New Config Failed", "");
            }
        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    // UPDATE

    updateConfigByIDV3: async (req, res) => {
        try {

            const { newData, configID } = req.body

            !newData?.groupCoinID && delete newData.groupCoinID

            const result = await StrategiesModel.updateOne(
                { _id: configID },
                { $set: newData }
            )

            if (result.acknowledged && result.matchedCount !== 0) {

                const newDataUpdate = await StrategiesModel.find(
                    { _id: configID },
                ).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

                newDataUpdate?.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "update",
                    data: newDataUpdate
                })
                res.customResponse(200, "Update Config Successful", "");
            }
            else {
                res.customResponse(400, "Update Config Failed", "");
            }

        } catch (error) {
            console.log(error);

            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Config Error" });
        }
    },

    updateStrategiesMultipleScannerV3: async (req, res) => {
        try {

            const dataList = req.body

            const TimeTemp = new Date().toString()

            const bulkOperations = []
            const spotDeleteID = []

            const scannerActive = dataList[0].UpdatedFields?.IsActive

            dataList.forEach((data) => {
                const idMain = data.id
                bulkOperations.push({
                    updateOne: {
                        filter: { _id: idMain },
                        update: {
                            $set: {
                                ...data.UpdatedFields,
                                TimeTemp
                            }
                        }
                    }
                })
                const id = new mongoose.Types.ObjectId(idMain)
                spotDeleteID.push(id)
            });
          

            await StrategiesModel.bulkWrite(bulkOperations);

            const handleResult = await StrategiesModel.find({
                TimeTemp
            }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()


            handleResult?.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                type: "update",
                data: handleResult
            })

            res.customResponse(200, "Update Config Successful", "");

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Config Error" + error.message });
        }
    },

    handleBookmarkScannerV3: async (req, res) => {
        try {

            const { configID, IsBookmark } = req.body

            const text = IsBookmark ? "Add" : "Remove"
            const result = await StrategiesModel.updateOne(
                { "_id": configID },
                { IsBookmark }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, `${text} Bookmark Successful`, "");
            }
            else {
                res.customResponse(400, `${text} Bookmark Failed`, "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: `${text} Bookmark Error` });
        }
    },

    // DELETE

    deleteStrategiesByIDScannerV3: async (req, res) => {
        try {

            const { configID } = req.body

            const result = await StrategiesModel.findOneAndDelete(
                {
                    "_id": configID
                }
            ).populate("botID")

            if (result) {

                dataCoinByBitController.handleSendDataRealtime({
                    type: "delete",
                    data: [result]
                })

                res.customResponse(200, "Delete Config Successful");
            }
            else {
                res.customResponse(400, `Delete Config Failed `);
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Config Error" });
        }
    },

    deleteStrategiesMultipleScannerV3: async (req, res) => {
        try {

            const strategiesIDList = req.body

            const listScanner = []

            strategiesIDList.forEach(item => {
                const id = new mongoose.Types.ObjectId(item.id)
                listScanner.push(id)
            })


            const resultBeforeDelete = await StrategiesModel.find(
                {
                    "_id": { $in: listScanner }
                }
            ).populate("botID")

            await StrategiesModel.deleteMany(
                {
                    "_id": { $in: listScanner }
                }
            )

            dataCoinByBitController.handleSendDataRealtime({
                type: "delete",
                data: resultBeforeDelete
            })

            res.customResponse(200, "Delete Config Successful");


        } catch (error) {
            res.status(500).json({ message: "Delete Config Error" });
        }
    },

    // OTHER

    copyMultipleStrategiesToBotScannerV3: async (req, res) => {

        try {
            const { symbolListData, symbolList } = req.body

            const TimeTemp = new Date().toString();

            const result = await StrategiesModel.insertMany(symbolList.flatMap(botID => {
                return symbolListData.map(({ _id, ...data }) => {
                    return {
                        ...data,
                        TimeTemp,
                        botID
                    }
                })
            }))


            if (result) {
                const handleResult = await StrategiesModel.find({
                    IsActive: true,
                    TimeTemp
                }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

                handleResult.length > 0 &&     dataCoinByBitController.handleSendDataRealtime({
                    type: "add",
                    data: handleResult
                })

                res.customResponse(200, "Copy Config To Bot Successful", "");

            }
            else {
                res.customResponse(400, "Copy Config To Bot Failed", "");
            }



        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },


    getApiKeyByBot: async (botID) => {

        const resultApi = await BotModel.findOne({ _id: botID })

        if (!resultApi) {
            return ""
        }

        return {
            API_KEY: resultApi.ApiKey,
            SECRET_KEY: resultApi.SecretKey
        }
    },


    getFutureBE: async (botData) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botData.id)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: API_KEY,
                    SecretKey: SECRET_KEY,
                    Demo: resultApiKey.Demo,
                })

                // get field totalWalletBalance
                const result = await client.getWalletBalances({
                    quoteAsset: "USDT",
                })

                if (result) {
                    return {
                        totalWalletBalance: result.find(item => item.walletName === 'USDⓈ-M Futures')?.balance || 0,
                        botData
                    }
                }
                return {
                    totalWalletBalance: 0,
                    botData,
                    errorMessage: result.retMsg
                }

            }
        } catch (error) {
            const errorMessage = error.message
            return {
                totalWalletBalance: 0,
                botData,
                errorMessage
            }
        }
    },

    getAllStrategiesActive: async (allbotOfServer) => {
        try {
            const result = await StrategiesModel.find({
                IsActive: true,
                botID: { $in: allbotOfServer },
            }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()
            return result || []

        } catch (err) {
            console.log(err);
            return []
        }
    },
    getAllSymbolBE: async (req, res) => {
        try {
            const result = await StrategiesModel.find().select("value");
            return result || []

        } catch (err) {
            return []
        }
    },
    balanceWalletBinanceBE: async ({ amount, futureLarger, botID }) => {
        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                let typeTransfer = "FUNDING_UMFUTURE"

                if (futureLarger) {
                    typeTransfer = "UMFUTURE_FUNDING"
                }

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                    Demo: resultApiKey.Demo,

                })

                // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
                client.submitUniversalTransfer({
                    type: typeTransfer,
                    amount,
                    asset: "USDT",
                })
                    .then((response) => {
                        response ? console.log("Saving Successful") : console.log("Saving Failed")
                    })
                    .catch((error) => {
                        console.log("[!] Saving Error", error);
                    });
            }
            else {
                console.log("[!] Saving Error");
            }

        }
        catch (error) {

            console.log("[!] Saving Error", error);
        }
    },
    balanceWallet: async (req, res) => {

        try {
            // FUND: Spot
            // UNIFIED: Future
            const { amount, futureLarger, botID } = req.body

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                let typeTransfer = "FUNDING_UMFUTURE"

                if (futureLarger) {
                    typeTransfer = "UMFUTURE_FUNDING"
                }

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                    Demo: resultApiKey.Demo,

                })

                // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
                client.submitUniversalTransfer({
                    type: typeTransfer,
                    amount,
                    asset: "USDT",
                })
                    .then((response) => {
                        response ? res.customResponse(200, "Saving Successful", "") : res.customResponse(500, "Saving Error", "")
                    })
                    .catch((error) => {
                        console.log(error);
                        res.customResponse(500, "Saving Error", "");
                    });
            }
            else {
                res.customResponse(500, "Saving Error", "");
            }

        }
        catch (error) {

            res.customResponse(500, "Saving Error", "");
        }
    },
    getFutureAvailable: async (req, res) => {

        try {
            const botID = req.params.id

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                    Demo: resultApiKey.Demo,

                })

                // get field totalWalletBalance
                await client.getWalletBalances({
                    quoteAsset: "USDT",
                }).then((result) => {

                    let spotFutureData = { spot: '0', future: '0' };

                    for (const item of result) {
                        if (item.walletName === 'Funding') {
                            spotFutureData.spot = +item.balance;
                        } else if (item.walletName === 'USDⓈ-M Futures') {
                            spotFutureData.future = +item.balance;
                        }
                        // Thoát sớm nếu đã tìm đủ
                        if (spotFutureData.spot !== '0' && spotFutureData.future !== '0') break;
                    }
                    res.customResponse(200, "Get Spot-Future Successful", spotFutureData);
                })
                    .catch((error) => {
                        res.customResponse(400, error.message, "");
                    });
            }
            else {
                res.customResponse(400, "Get Future Available Failed", "");
            }

        } catch (error) {
            res.customResponse(500, "Get Future Available Error", "");

        }

    },
    deleteAllForUPcode: async (allbotOfServer) => {
        try {

            const cancelPositionV3 = PositionV3Model.deleteMany({
                botID: { $in: allbotOfServer }
            })
            await Promise.allSettled([cancelPositionV3])

            console.log("[V] RESET All For New Successful");

        } catch (error) {
            console.log("[V] RESET All For New error:", error);
        }
    },
}

module.exports = dataCoinByBitController 