const { RestClientV5 } = require('okx-api');
const ScannerV3Model = require('../../../../models/Configs/OKX/V3/scanner.model')
const StrategiesModel = require('../../../../models/Configs/OKX/V3/config.model')
const BotModel = require('../../../../models/bot.model')
const ServerModel = require('../../../../models/servers.model')
const { v4: uuidv4 } = require('uuid');
const { default: mongoose } = require('mongoose');

const dataCoinByBitController = {
    // SOCKET
    getRestClientV5Config: ({
        ApiKey,
        SecretKey,
    }) => {
        return new RestClientV5({
            testnet: false,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,
            recvWindow: 100000,
        })
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

            const resData = await ServerModel.findOne({ _id: serverIPID })
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

    getSymbolFromCloud: async (userID) => {
        try {

            let ListCoin1m = []

            let CoinInfo = new RestClientV5({
                testnet: false,
                recv_window: 100000
            });

            let data = []
            await CoinInfo.getTickers({ category: 'linear' })
                .then((rescoin) => {
                    rescoin.result.list.forEach((e) => {
                        if (e.symbol.split("USDT")[1] === "") {
                            data.push({
                                symbol: e.symbol,
                                volume24h: e.turnover24h,
                            })
                        }
                    })
                })
                .catch((error) => {
                    console.error(error);
                });
            ListCoin1m = data.flatMap((coin) => {
                return `kline.1.${coin}`
            });

            return data

        } catch (err) {
            return []
        }
    },

    syncSymbolScanner: async (req, res) => {
        try {
            const userID = req.user._id

            const listSymbolObject = await dataCoinByBitController.getSymbolFromCloud(userID);

            if (listSymbolObject?.length) {


                const existingDocs = await ScannerV3Model.find({ value: { $in: listSymbolObject.map(item => item.symbol) } });

                const existingValues = existingDocs.map(doc => doc.value);

                const valuesToAdd = listSymbolObject.filter(value => !existingValues.includes(value.symbol));

                const newSymbolList = []
                const newSymbolNameList = []

                valuesToAdd.forEach(value => {
                    newSymbolList.push({
                        label: value.symbol,
                        value: value.symbol,
                        volume24h: value.volume24h,
                        children: []
                    });
                    newSymbolNameList.push(value.symbol);
                })

                const insertSymbolNew = ScannerV3Model.insertMany(newSymbolList)

                const bulkOperations = listSymbolObject.map(data => ({
                    updateOne: {
                        filter: { "label": data.symbol },
                        update: {
                            $set: {
                                "volume24h": data.volume24h
                            }
                        }
                    }
                }));

                const insertVol24 = ScannerV3Model.bulkWrite(bulkOperations);

                await Promise.allSettled([insertSymbolNew, insertVol24])

                if (newSymbolList.length > 0) {

                    const newSymbolResult = await ScannerV3Model.find({
                        value: { $in: newSymbolNameList }
                    }).select("value")

                    dataCoinByBitController.sendDataRealtime({
                        type: "sync-symbol",
                        data: newSymbolResult
                    })
                    res.customResponse(200, "Have New Sync Successful", newSymbolList)

                }
                else {
                    res.customResponse(200, "Sync Successful", [])
                }
            }
            else {
                res.customResponse(400, "Sync Failed", []);

            }

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getAllConfigScannerV3: async (req, res) => {
        try {
            const userID = req.user._id

            const { botListInput } = req.body

            const botList = botListInput.map(item => new mongoose.Types.ObjectId(item));

            const resultFilter = await ScannerV3Model.aggregate([
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

            const handleResult = await ScannerV3Model.populate(resultFilter, [
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
                result = await ScannerV3Model.insertMany(
                    [
                        ...botListId.map(botID => ({ ...newData, PositionSide: "Long", botID, userID, TimeTemp, Blacklist, OnlyPairs })),
                        ...botListId.map(botID => ({ ...newData, PositionSide: "Short", botID, userID, TimeTemp, Blacklist, OnlyPairs }))
                    ]
                )
            }
            else {
                result = await ScannerV3Model.insertMany(
                    botListId.map(botID => ({ ...newData, botID, userID, TimeTemp, Blacklist, OnlyPairs }))
                );
            }

            const handleResult = await ScannerV3Model.find({
                IsActive: true,
                userID,
                TimeTemp
            }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

            if (result) {

                handleResult.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "scanner-add",
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

            const scannerActive = newData.IsActive

            !newData?.groupCoinID && delete newData.groupCoinID

            const result = await ScannerV3Model.updateOne(
                { _id: configID },
                { $set: newData }
            )

            if (result.acknowledged && result.matchedCount !== 0) {

                // handle get all config by scannerID
                const configIDBE = new mongoose.Types.ObjectId(configID)
                const resultFilterSpot = await StrategiesModel.aggregate([
                    {
                        $match: {
                            "children.scannerID": { $in: [configIDBE] }
                        }
                    },
                    {
                        $project: {
                            label: 1,
                            value: 1,
                            volume24h: 1,
                            children: {
                                $filter: {
                                    input: "$children",
                                    as: "child",
                                    cond: {
                                        $in: ["$$child.scannerID", [configIDBE]]
                                    }
                                }
                            }
                        }
                    }
                ]);

                const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []

                await StrategiesModel.updateMany(
                    { "children.scannerID": { $in: [configIDBE] } },
                    { $pull: { children: { scannerID: { $in: [configIDBE] } } } }
                );

                handleResultDelete.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: scannerActive ? "cancel-all-config-by-scanner" : "delete",
                    data: handleResultDelete
                })

                const newDataUpdate = await ScannerV3Model.find(
                    { _id: configID },
                ).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

                newDataUpdate?.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "scanner-update",
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

            // handle get all config by scannerID

            const resultFilterSpot = await StrategiesModel.aggregate([
                {
                    $match: {
                        "children.scannerID": { $in: spotDeleteID }
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $in: ["$$child.scannerID", spotDeleteID]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                path: 'children.botID',
            }) || []


            const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `${data._id}-${child._id}`
                return child
            })) || []

            await ScannerV3Model.bulkWrite(bulkOperations);

            await StrategiesModel.updateMany(
                { "children.scannerID": { $in: spotDeleteID } },
                { $pull: { children: { scannerID: { $in: spotDeleteID } } } }
            );

            const handleResult = await ScannerV3Model.find({
                TimeTemp
            }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

            handleResultDelete.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                type: scannerActive ? "cancel-all-config-by-scanner" : "delete",
                data: handleResultDelete
            })


            handleResult?.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                type: "scanner-update",
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
            const result = await ScannerV3Model.updateOne(
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

            const result = await ScannerV3Model.findOneAndDelete(
                {
                    "_id": configID
                }
            ).populate("botID")

            if (result) {

                dataCoinByBitController.handleSendDataRealtime({
                    type: "scanner-delete",
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


            const resultBeforeDelete = await ScannerV3Model.find(
                {
                    "_id": { $in: listScanner }
                }
            ).populate("botID")

            const resultFilterSpot = await StrategiesModel.aggregate([
                {
                    $match: {
                        "children.scannerID": { $in: listScanner }
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $in: ["$$child.scannerID", listScanner]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                path: 'children.botID',
            }) || []


            const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `${data._id}-${child._id}`
                return child
            })) || []


            const bulkOperationsRes = ScannerV3Model.deleteMany(
                {
                    "_id": { $in: listScanner }
                }
            )

            const bulkOperationsDelSpotRes = StrategiesModel.updateMany(
                { "children.scannerID": { $in: listScanner } },
                { $pull: { children: { scannerID: { $in: listScanner } } } }
            );

            // if (result.acknowledged && result.deletedCount !== 0) {

            await Promise.allSettled([bulkOperationsRes, bulkOperationsDelSpotRes])

            handleResultDelete.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                type: "delete",
                data: handleResultDelete
            })

            dataCoinByBitController.handleSendDataRealtime({
                type: "scanner-delete",
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

            const result = await ScannerV3Model.insertMany(symbolList.flatMap(botID => {
                return symbolListData.map(({ _id, ...data }) => {
                    return {
                        ...data,
                        TimeTemp,
                        botID
                    }
                })
            }))


            if (result) {
                const handleResult = await ScannerV3Model.find({
                    IsActive: true,
                    TimeTemp
                }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']).lean()

                handleResult.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "scanner-add",
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

    transferFunds: async (amount, FromWallet, ToWallet) => {

        const client = dataCoinByBitController.getRestClientV5Config({
            ApiKey: API_KEY,
            SecretKey: SECRET_KEY,
        });


        let myUUID = uuidv4();
        client.createInternalTransfer(
            myUUID,
            'USDT',
            amount,
            FromWallet,
            ToWallet,
        )
            .then((response) => {
                console.log(response);
            })
            .catch((error) => {
                console.error(error);
            });
    },


    balanceWallet: async (req, res) => {

        try {
            // FUND: Spot
            // UNIFIED: Future
            const { amount, futureLarger, botID } = req.body

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                let FromWallet = "FUND"
                let ToWallet = "UNIFIED"

                if (futureLarger) {
                    FromWallet = "UNIFIED"
                    ToWallet = "FUND"
                }

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                });


                let myUUID = uuidv4();

                // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    amount.toFixed(4),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        status ? res.customResponse(200, "Saving Successful", "") : res.customResponse(500, "Saving Error", "")

                    })
                    .catch((error) => {
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

    getFutureAvailable: async (req, res) => {

        try {
            const botID = req.params.id

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                });


                // get field totalWalletBalance
                await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                }).then((result) => {
                    res.customResponse(200, "Get Future Available Successful", result);
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

    getSpotTotal: async (req, res) => {

        try {
            const botID = req.params.id

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: resultApiKey.API_KEY,
                    SecretKey: resultApiKey.SECRET_KEY,
                });

                await client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                }).then((result) => {
                    res.customResponse(200, "Get Spot Total Successful", result);
                })
                    .catch((error) => {
                        res.customResponse(400, error.message, "");
                    });
            }
            else {
                res.customResponse(400, "Get Spot Total Failed", "");
            }

        } catch (error) {
            res.customResponse(500, "Get Spot Total Error", "");

        }

    },

    // OTHER

    getFutureSpotBE: async (botID) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: API_KEY,
                    SecretKey: SECRET_KEY,
                });

                // get field totalWalletBalance
                const getFuture = client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                })
                const getSpot = client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                })
                const result = await Promise.all([getFuture, getSpot])

                if (result.every(item => item.retCode === 0)) {
                    return {
                        future: result[0]?.result?.list?.[0]?.coin[0].walletBalance || 0,
                        spotTotal: result[1]?.result?.balance?.[0]?.walletBalance || 0,
                        API_KEY,
                        SECRET_KEY
                    }
                }
                return {}
            }
            else {
                return {}
            }

        } catch (error) {
            return {}

        }
    },

    getFutureBE: async (botID) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: API_KEY,
                    SecretKey: SECRET_KEY,
                });

                // get field totalWalletBalance
                const result = await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                })

                if (result.retCode === 0) {
                    return {
                        totalWalletBalance: result.result?.list?.[0]?.coin[0].walletBalance || 0,
                        botID
                    }
                }
                return {
                    totalWalletBalance: 0,
                    botID
                }

            }
        } catch (error) {
            return {
                totalWalletBalance: 0,
                botID
            }
        }
    },
    balanceWalletBE: async ({ amount, futureLarger, API_KEY, SECRET_KEY }) => {
        try {
            // FUND: Spot
            // UNIFIED: Future

            if (API_KEY && SECRET_KEY) {

                let FromWallet = "FUND"
                let ToWallet = "UNIFIED"

                if (futureLarger) {
                    FromWallet = "UNIFIED"
                    ToWallet = "FUND"
                }
                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: API_KEY,
                    SecretKey: SECRET_KEY,
                });

                let myUUID = uuidv4();

                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    amount.toFixed(4),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        if (status) {
                            // console.log("-> Saving Successful");
                        }
                        else {
                            console.log("-> Saving Error");
                        }

                    })
                    .catch((error) => {
                        console.log("-> Saving Error");
                    });
            }
            else {
                console.log("-> Saving Error");
            }

        }
        catch (error) {
            console.log("-> Saving Error");
        }
    },

    getAllStrategiesActiveScannerV3BE: async (allbotOfServer) => {
        try {
            const result = await ScannerV3Model.find({
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
            const result = await ScannerV3Model.find().select("value");
            return result || []

        } catch (err) {
            return []
        }
    },

}

module.exports = dataCoinByBitController 