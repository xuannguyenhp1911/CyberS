const { RestClientV5 } = require('bybit-api');
const StrategiesModel = require('../../../../models/Configs/ByBit/V3/wave.model')
const BotModel = require('../../../../models/bot.model')
const ServerModel = require('../../../../models/servers.model')
const PositionV3Model = require('../../../../models/Positions/ByBit/V3/position.model')
const { v4: uuidv4 } = require('uuid');
const { default: mongoose } = require('mongoose');

const dataCoinByBitController = {
    // SOCKET
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

    getRestClientV5Config: ({
        ApiKey,
        SecretKey,
    }) => {
        return new RestClientV5({
            testnet: false,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,
            recvWindow: 20000,
        })
    },
    checkConditionStrategies: (strategiesData) => {
        return strategiesData.botID?.Status === "Running" && strategiesData.botID.ApiKey
    },
    getAllStrategiesNewUpdate: async (TimeTemp) => {

        const resultFilter = await StrategiesModel.aggregate([
            {
                $match: {
                    children: {
                        $elemMatch: {
                            TimeTemp: TimeTemp
                        }
                    }
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
                                $and: [
                                    { $eq: ["$$child.TimeTemp", TimeTemp] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await StrategiesModel.populate(resultFilter, {
            path: 'children.botID',
        })


        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `WAVE-${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },

    // GET
    closeAllBotForUpCode: async (req, res) => {
        dataCoinByBitController.sendDataRealtime({
            type: "close-upcode",
            serverIP: "ByBit_V3"
        })
        res.customResponse(200, "Send Successful", "");
    },
    getSymbolFromCloud: async () => {
        try {

            let CoinInfo = new RestClientV5({
                testnet: false,
                recvWindow: 100000,
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

            return data

        } catch (err) {
            return []
        }
    },

    getAllStrategies: async (req, res) => {
        try {
            const userID = req.user._id
            const { botListInput } = req.body

            const botList = botListInput.map(item => new mongoose.Types.ObjectId(item));

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "children.botID": { $in: botList }
                    }
                },
                {
                    $addFields: {
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $in: ["$$child.botID", botList]
                                }
                            }
                        }
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
                        label: 1
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        bookmarkList: 1,
                        children: 1
                    }
                }
            ]);

            resultFilter.forEach(item => {
                item.children.sort((a, b) => a.OrderChange - b.OrderChange);
            });
            const handleResult = await StrategiesModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            // const handleResult = result.reduce((result, child) => {
            //     if (child.children.some(childData => childData.botID?.Status === "Running")) {
            //         result.push({
            //             ...child,
            //             children: child.children.filter(item => item.botID?.Status === "Running")
            //         })
            //     }
            //     return result
            // }, []) || []


            res.customResponse(res.statusCode, "Get All Strategies Successful", handleResult);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllSymbol: async (req, res) => {
        try {
            const result = await StrategiesModel.find().sort({ "label": 1 });

            res.customResponse(res.statusCode, "Get All Symbol Successful", result.map(item => item.value))
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getTotalFutureByBot: async (req, res) => {
        try {

            const userID = req.user._id

            const { botType } = req.body

            const botListId = await BotModel.find({
                userID,
                botType,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListId.map(async botData => dataCoinByBitController.getFutureBE(botData._id)))


            if (resultAll.some(item => item?.value?.totalWalletBalance)) {
                res.customResponse(200, "Get Total Future Successful", resultAll.reduce((pre, cur) => {
                    return pre + (+cur?.value?.totalWalletBalance || 0)
                }, 0))
            }
            else {
                res.customResponse(400, "Get Total Future Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    getTotalFutureSpot: async (req, res) => {
        try {

            const userID = req.params.id;

            const botListId = await BotModel.find({
                userID,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListId.map(async botData => dataCoinByBitController.getFutureSpotBE(botData._id)))

            if (resultAll.some(item => item?.value?.future && item?.value?.spotTotal)) {
                res.customResponse(200, "Get Total Money Successful", resultAll.reduce((pre, cur) => {
                    return pre + (+cur?.value?.future || 0) + (+cur?.value?.spotTotal || 0)
                }, 0))
            }
            else {
                res.customResponse(400, "Get Total Money Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    getTotalFutureSpotByBot: async (req, res) => {
        try {

            const { botListId } = req.body

            const resultAll = await Promise.allSettled(botListId.map(async botID => dataCoinByBitController.getFutureSpotBE(botID)))

            if (resultAll.some(item => item?.value?.future && item?.value?.spotTotal)) {
                res.customResponse(200, "Get Total Money Successful", resultAll.reduce((pre, cur) => {
                    return pre + (+cur?.value?.future || 0) + (+cur?.value?.spotTotal || 0)
                }, 0))
            }
            else {
                res.customResponse(400, "Get Total Money Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // CREATE
    createStrategies: async (req, res) => {

        try {
            const userID = req.user._id

            const { data, botListId, Symbol } = req.body

            let result

            const TimeTemp = new Date().toString()

            const newData = {
                ...data,
                EntryTrailing: data.EntryTrailing || 40
            }

            if (newData.PositionSide === "Both") {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": Symbol } },
                    {
                        "$push": {
                            "children": [
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Long", botID, userID, TimeTemp })),
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Short", botID, userID, TimeTemp }))
                            ]
                        }
                    },
                    { new: true }
                )
            }
            else {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": Symbol } },
                    { "$push": { "children": botListId.map(botID => ({ ...newData, botID, userID, TimeTemp })) } },
                    { new: true }
                );
            }

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        children: {
                            $elemMatch: {
                                IsActive: true,
                                userID: new mongoose.Types.ObjectId(userID),
                                TimeTemp: TimeTemp
                            }
                        }
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
                                    $and: [
                                        { $eq: ["$$child.IsActive", true] },
                                        { $eq: ["$$child.userID", new mongoose.Types.ObjectId(userID)] },
                                        { $eq: ["$$child.TimeTemp", TimeTemp] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);


            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `WAVE-${data._id}-${child._id}`
                return child
            })) || []

            if (result.acknowledged && result.matchedCount !== 0) {

                handleResult.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "add",
                    data: handleResult
                })

                res.customResponse(200, "Add New Strategies Successful", []);
            }
            else {
                res.customResponse(400, "Add New Strategies Failed", "");
            }

        }

        catch (error) {
            console.log(error);

            res.status(500).json({ message: error.message });
        }

    },

    // UPDATE
    updateStrategiesByID: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const { parentID, newData, symbol } = req.body

            const result = await StrategiesModel.updateOne(
                { "children._id": strategiesID, _id: parentID },
                { $set: { "children.$": newData } }
            )


            if (result.acknowledged && result.matchedCount !== 0) {
                if (dataCoinByBitController.checkConditionStrategies(newData)) {

                    dataCoinByBitController.handleSendDataRealtime({
                        type: "update",
                        data: [{
                            ...newData,
                            value: `WAVE-${parentID}-${strategiesID}`,
                            symbol
                        }]
                    })
                }
                res.customResponse(200, "Update Strategies Successful", "");
            }
            else {
                res.customResponse(400, "Update Strategies Failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Strategies Error" });
        }
    },

    updateStrategiesMultiple: async (req, res) => {
        try {

            const dataList = req.body

            const TimeTemp = new Date().toString()

            const bulkOperations = dataList.map(data => ({
                updateOne: {
                    filter: { "children._id": data.id, _id: data.parentID },
                    update: {
                        $set: {
                            "children.$": {
                                ...data.UpdatedFields,
                                TimeTemp
                            }
                        }
                    }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);


                const resultFilter = await StrategiesModel.aggregate([
                    {
                        $match: {
                            children: {
                                $elemMatch: {
                                    TimeTemp: TimeTemp
                                }
                            }
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
                                        $and: [
                                            { $eq: ["$$child.TimeTemp", TimeTemp] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]);
                const result = await StrategiesModel.populate(resultFilter, {
                    path: 'children',
                    populate: [
                        { path: 'botID' },
                        { path: 'scannerID' }
                    ]
                })

                const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `WAVE-${data._id}-${child._id}`
                    return child
                })) || []

                newDataSocketWithBotData.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "update",
                    data: newDataSocketWithBotData
                })

                res.customResponse(200, "Update Mul-Strategies Successful", "");


        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Mul-Strategies Error" });
        }
    },

    addToBookmark: async (req, res) => {
        try {

            const symbolID = req.params.id;
            const userID = req.user._id;


            const result = await StrategiesModel.updateOne(
                { "_id": symbolID },
                { $addToSet: { bookmarkList: userID } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Add Bookmark Successful", "");
            }
            else {
                res.customResponse(400, "Add Bookmark Failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add Bookmark Error" });
        }
    },
    removeToBookmark: async (req, res) => {
        try {

            const symbolID = req.params.id;
            const userID = req.user._id;


            const result = await StrategiesModel.updateOne(
                { "_id": symbolID },
                { $pull: { bookmarkList: userID } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Remove Bookmark Successful", "");
            }
            else {
                res.customResponse(400, "Remove Bookmark Failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Remove Bookmark Error" });
        }
    },

    // DELETE
    deleteStrategies: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const strategiesIDList = req.body

            // const resultGet = await StrategiesModel.find(
            //     { _id: strategiesID },
            //     { "children._id": { $in: strategiesIDList } }
            // ).populate("children.botID")

            // console.log(resultGet);

            // const newDataSocketWithBotData = resultGet.children.map(child => {
            //     child.symbol = resultGet.value
            //     child.value = `WAVE-${resultGet._id}-${child._id}`
            //     return child
            // }) || []


            const result = await StrategiesModel.updateOne(
                { _id: strategiesID },
                { $pull: { children: { _id: { $in: strategiesIDList } } } }
            );

            if (result.acknowledged && result.matchedCount !== 0) {
                // console.log(newDataSocketWithBotData.length);

                // newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                //     type: "delete",
                //     data: newDataSocketWithBotData
                // })
                res.customResponse(200, "Delete Strategies Successful");

            }
            else {
                res.customResponse(400, "Delete Strategies Failed");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },

    deleteStrategiesItem: async (req, res) => {
        try {

            const { id, parentID } = req.body;

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "_id": new mongoose.Types.ObjectId(parentID),
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
                                cond: { $eq: ["$$child._id", new mongoose.Types.ObjectId(id)] }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })
            const newDataSocketWithBotData = resultGet[0].children.map(child => {
                child.symbol = resultGet.value
                child.value = `WAVE-${parentID}-${id}`
                return child
            }) || []



            const result = await StrategiesModel.updateOne(
                { _id: parentID },
                { $pull: { children: { _id: id } } }
            );



            if (result.acknowledged && result.deletedCount !== 0) {


                newDataSocketWithBotData.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "delete",
                    data: newDataSocketWithBotData
                })

                res.customResponse(200, "Delete Strategies Successful");
            }
            else {
                res.customResponse(400, "Delete Strategies failed");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },

    deleteStrategiesMultiple: async (req, res) => {
        try {

            const strategiesIDList = req.body

            const parentIDs = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.parentID));
            const ids = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.id));

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "_id": { $in: parentIDs }
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
                                    $in: ["$$child._id", ids]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `WAVE-${data._id}-${child._id}`
                return child
            })) || []



            const bulkOperations = strategiesIDList.map(data => ({
                updateOne: {
                    filter: { _id: data.parentID },
                    update: { $pull: { children: { _id: data.id } } }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);

            // if (result.acknowledged && result.deletedCount !== 0) {

                handleResult.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "delete",
                    data: handleResult
                })
                res.customResponse(200, "Delete Strategies Successful");

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },

    // OTHER

    copyMultipleStrategiesToSymbol: async (req, res) => {

        try {
            const { symbolListData, symbolList } = req.body

            const TimeTemp = new Date().toString()

            // const bulkOperations = [];

            // // Lặp qua danh sách symbolList và tạo các thao tác push vào mảng bulkOperations
            // symbolList.forEach(symbol => {
            //     const filter = { "value": symbol };
            //     const update = {
            //         $push: {
            //             "children": {
            //                 $each: symbolListData.map(data => {
            //                     const newObj = { ...data, TimeTemp };
            //                     delete newObj?._id
            //                     delete newObj?.value
            //                     return newObj

            //                 })
            //             }
            //         }
            //     };

            //     bulkOperations.push({
            //         updateOne: {
            //             filter,
            //             update
            //         }
            //     });
            // });

            const bulkOperations = symbolList.map(symbol => ({
                updateOne: {
                    filter: { "value": symbol },
                    update: {
                        $push: {
                            "children": {
                                $each: symbolListData.map(({ _id, value, ...rest }) => ({ ...rest, TimeTemp }))
                            }
                        }
                    }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);



                const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

                newDataSocketWithBotData.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "update",
                    data: newDataSocketWithBotData
                })


                res.customResponse(200, "Copy Strategies To Symbol Successful", []);

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    copyMultipleStrategiesToBot: async (req, res) => {

        try {
            const { symbolListData, symbolList } = req.body

            const TimeTemp = new Date().toString();

            const bulkOperations = symbolListData.map(({ _id, value, parentID, ...restData }) => ({
                updateOne: {
                    filter: { _id: parentID },
                    update: {
                        $push: {
                            children: {
                                $each: symbolList.map(symbol => ({
                                    ...restData,
                                    botID: symbol,
                                    TimeTemp
                                }))
                            }
                        }
                    }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);


                const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

                newDataSocketWithBotData.length > 0 && dataCoinByBitController.handleSendDataRealtime({
                    type: "update",
                    data: newDataSocketWithBotData
                })
                res.customResponse(200, "Copy Strategies To Bot Successful", "");

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    // syncSymbol: async (req, res) => {
    //     try {

    //         const listSymbolObject = await dataCoinByBitController.getSymbolFromCloud();

    //         if (listSymbolObject?.length) {

    //             // const existingDocs = await StrategiesModel.find({ value: { $in: listSymbolObject.map(item => item.symbol) } });
    //             const existingDocs = await StrategiesModel.find();

    //             const existingValues = existingDocs.reduce((pre, cur) => {
    //                 const symbol = cur.value
    //                 pre[symbol] = symbol
    //                 return pre
    //             }, {});

    //             const newSymbolList = []
    //             const newSymbolNameList = []

    //             listSymbolObject.forEach((value) => {
    //                 const symbol = value.symbol

    //                 if (!existingValues[symbol]) {
    //                     newSymbolList.push({
    //                         label: symbol,
    //                         value: symbol,
    //                         volume24h: value.volume24h,
    //                         children: [],
    //                     });
    //                     newSymbolNameList.push(symbol);
    //                 }
    //                 else {
    //                     delete existingValues[symbol]
    //                 }
    //             })
    //             const deleteList = Object.values(existingValues)

    //             const insertSymbolNew = StrategiesModel.insertMany(newSymbolList)

    //             const bulkOperations = listSymbolObject.map(data => ({
    //                 updateOne: {
    //                     filter: { "label": data.symbol },
    //                     update: {
    //                         $set: {
    //                             "volume24h": data.volume24h,
    //                         }
    //                     }
    //                 }
    //             }));


    //             const insertVol24 = StrategiesModel.bulkWrite(bulkOperations);
    //             const bulkOperationsDeletedRes = StrategiesModel.deleteMany({ value: { $in: deleteList } })

    //             await Promise.allSettled([insertSymbolNew, insertVol24, bulkOperationsDeletedRes])

    //             if (newSymbolList.length > 0) {

    //                 const newSymbolResult = await StrategiesModel.find({
    //                     value: { $in: newSymbolNameList }
    //                 })

    //                 dataCoinByBitController.sendDataRealtime({
    //                     type: "sync-symbol",
    //                     data: newSymbolResult
    //                 })
    //                 res.customResponse(200, "Have New Sync Successful", {
    //                     new: newSymbolList,
    //                     deleted: deleteList
    //                 })

    //             }
    //             else {
    //                 res.customResponse(200, "Sync Successful", {
    //                     list: listSymbolObject,
    //                     deleted: deleteList
    //                 })
    //             }
    //         }
    //         else {
    //             res.customResponse(400, "Sync Failed", []);
    //         }

    //     } catch (error) {
    //         res.status(500).json({ message: error.message });
    //     }
    // },

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
                })
                let myUUID = uuidv4();

                // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    (Math.floor(amount * 1000) / 1000).toString(),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        status ? res.customResponse(200, "Saving Successful", "") : res.customResponse(400, response.retMsg, "")

                    })
                    .catch((error) => {
                        res.customResponse(500, "Saving Error", error.message);
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
                })

                // get field totalWalletBalance
                await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                }).then((result) => {
                    const retCode = result.retCode
                    res.customResponse(retCode == 0 ? 200 : 400, retCode == 0 ? "Get Future Available Successful" : result.retMsg, result);
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
                })

                await client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                }).then((result) => {
                    const retCode = result.retCode
                    res.customResponse(retCode == 0 ? 200 : 400, retCode == 0 ? "Get Spot Total Successful" : result.retMsg, result);
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
                })

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

    getFutureBE: async (botData) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botData.id)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = dataCoinByBitController.getRestClientV5Config({
                    ApiKey: API_KEY,
                    SecretKey: SECRET_KEY,
                })

                // get field totalWalletBalance
                const result = await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                })

                if (result.retCode === 0) {
                    return {
                        totalWalletBalance: result.result?.list?.[0]?.coin[0].walletBalance || 0,
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
    balanceWalletByBitBE: async ({ amount, futureLarger, API_KEY, SECRET_KEY }) => {
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
                })

                let myUUID = uuidv4();

                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    (Math.floor(amount * 1000) / 1000).toString(),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        if (status) {
                            // console.log("-> Saving Successful");
                        }
                        else {
                            console.log("[!] Saving Failed: " + response.retMsg);
                        }

                    })
                    .catch((error) => {
                        console.log("[!] Saving Error", error.message);
                    });
            }
            else {
                console.log("[!] ApiKey not exist");
            }

        }
        catch (error) {
            console.log("[!] Saving Error", error.message);
        }
    },

    getAllStrategiesWaveActiveBE: async (allbotOfServer) => {
        try {

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "children.IsActive": true,
                        "children.botID": { $in: allbotOfServer },
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
                                    $and: [
                                        { $eq: ["$$child.IsActive", true] },
                                        { $in: ["$$child.botID", allbotOfServer] } // Kiểm tra botID có nằm trong allbotOfServer
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);
            const result = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = result.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `WAVE-${data._id}-${child._id}`
                return child
            })) || []

            return handleResult

            // const handleResult = result.reduce((result, child) => {
            //     if (child.children.length > 0 && child.children.some(childData =>
            //         dataCoinByBitController.checkConditionStrategies(childData)
            //     )) {
            //         result.push({
            //             ...child,
            //             children: child.children.filter(item =>
            //                 dataCoinByBitController.checkConditionStrategies(item)
            //             )
            //         })
            //     }
            //     return result
            // }, []) || []

        } catch (err) {
            console.log(err);

            return []
        }
    },
    getAllSymbolBE: async (req, res) => {
        try {
            const result = await StrategiesModel.find()
            return result || []

        } catch (err) {
            return []
        }
    },

    // SCANNER

    createStrategiesMultipleStrategyBE: async ({
        dataInput,
        botID,
        botName,
        symbol,
        scannerID,
        OCAdjust,
    }) => {

        try {
            const TimeTemp = new Date().toString()

            let result = ""

            if (dataInput.PositionSide === "Long-Short") {
                result = await StrategiesModel.updateMany(
                    { "value": symbol },
                    {
                        "$push": {
                            "children": [
                                { ...dataInput, botID, scannerID, TimeTemp, PositionSide: "Long" },
                                { ...dataInput, botID, scannerID, TimeTemp, PositionSide: "Short" },
                            ]
                        }
                    },
                );
            }
            else {
                result = await StrategiesModel.updateMany(
                    { "value": symbol },
                    { "$push": { "children": { ...dataInput, botID, scannerID, TimeTemp } } },
                );
            }

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        children: {
                            $elemMatch: {
                                IsActive: true,
                                TimeTemp: TimeTemp,
                                scannerID: new mongoose.Types.ObjectId(scannerID),
                            }
                        },
                        value: symbol
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
                                    $and: [
                                        { $eq: ["$$child.IsActive", true] },
                                        { $eq: ["$$child.TimeTemp", TimeTemp] },
                                        { $eq: ["$$child.scannerID", new mongoose.Types.ObjectId(scannerID)] },
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            });

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `WAVE-${data._id}-${child._id}`
                return child
            })) || []

            if (result.acknowledged && result.matchedCount !== 0) {
                return {
                    message: `[Mongo] Add New Mul-Config Strategies ( ${botName} - ${symbol} - ${dataInput.PositionSide} - ${dataInput.Candlestick} ) Successful: OCAdjust: ${OCAdjust} = ${dataInput.OrderChange}`,
                    data: handleResult || []
                }
            }
            else {
                return {
                    message: `[Mongo] Add New Mul-Config Strategies ( ${botName} - ${symbol} - ${dataInput.PositionSide} - ${dataInput.Candlestick} ) Failed: OCAdjust: ${OCAdjust} = ${dataInput.OrderChange}`,
                    data: []
                }
            }

        }

        catch (error) {
            return {
                message: `[Mongo] Add New Mul-Config Strategies ( ${botName} - ${symbol} - ${dataInput.PositionSide} - ${dataInput.Candlestick} ) Error: ${error.message}`,
                data: []
            }
        }

    },
    updateStrategiesMultipleStrategyBE: async ({
        scannerID,
        newOC,
        symbol,
    }) => {

        try {
            const TimeTemp = new Date().toString()

            const result = await StrategiesModel.updateMany(
                {
                    "children.scannerID": scannerID,
                    "children.IsActive": true,
                    "value": symbol
                },
                {
                    $set: {
                        "children.$[elem].OrderChange": newOC,
                        "children.$[elem].TimeTemp": TimeTemp,
                    }
                },
                {
                    arrayFilters: [{ "elem.scannerID": scannerID }]
                }
            );


            if (result.acknowledged && result.matchedCount !== 0) {
                const resultFilter = await StrategiesModel.aggregate([
                    {
                        $match: {
                            children: {
                                $elemMatch: {
                                    IsActive: true,
                                    TimeTemp: TimeTemp,
                                    scannerID: new mongoose.Types.ObjectId(scannerID),
                                }
                            },
                            value: symbol
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
                                        $and: [
                                            { $eq: ["$$child.IsActive", true] },
                                            { $eq: ["$$child.TimeTemp", TimeTemp] },
                                            { $eq: ["$$child.scannerID", new mongoose.Types.ObjectId(scannerID)] },
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]);

                const resultGet = await StrategiesModel.populate(resultFilter, {
                    path: 'children',
                    populate: [
                        { path: 'botID' },
                        { path: 'scannerID' }
                    ]
                });

                const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `WAVE-${data._id}-${child._id}`
                    return child
                })) || []
                return handleResult
            }
            else {
                return []
            }
        }

        catch (error) {
            console.log('updateStrategiesMultipleStrategyBE error:', error);
            return []
        }

    },

    deleteStrategiesMultipleStrategyBE: async ({
        scannerID,
        symbol,
        Candlestick,
        PositionSide,
        botName,
    }) => {
        try {

            const result = await StrategiesModel.updateMany(
                {
                    "children.scannerID": scannerID,
                    "value": symbol
                },
                { $pull: { "children": { scannerID } } }
            );

            if (result.acknowledged && result.matchedCount !== 0) {

                console.log(`[Mongo] Delete Mul-Config Strategies ( ${botName} - ${symbol} - ${PositionSide} - ${Candlestick} ) Successful`);
                return true
            }
            else {
                console.log(`[Mongo] Delete Mul-Config Strategies ( ${botName} - ${symbol} - ${PositionSide} - ${Candlestick} ) Failed`);
                return false
            }

        } catch (error) {
            console.log(`[Mongo] Delete Mul-Config Strategies ( ${botName} - ${symbol} - ${PositionSide} - ${Candlestick} ) Error: ${error.message} `)
            return false
        }
    },

    syncSymbolBE: async () => {
        try {

            const listSymbolObject = await dataCoinByBitController.getSymbolFromCloud();

            const listSymbolUpdate = []
            if (listSymbolObject?.length) {

                listSymbolObject.forEach((value) => {
                    const symbol = value.symbol

                    listSymbolUpdate.push({
                        value: symbol,
                        volume24h: value.volume24h,
                    });
                })
                return listSymbolUpdate
            }
            else {
                return []
            }
        } catch (error) {
            return []
        }
    },

    deleteAllScannerBE: async (allbotOfServer) => {

        try {

            await StrategiesModel.updateMany(
                {
                    "children.botID": { $in: allbotOfServer }
                },
                {
                    $pull: {
                        children: {
                            scannerID: { $exists: true, $ne: null },
                            botID: { $in: allbotOfServer }
                        }
                    }
                }
            );
            console.log("[V] Delete All Strategies By BigBabol Successful");

        } catch (error) {
            console.log("[V] Delete All Strategies By BigBabol Error:", error);
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
    deleteConfigBE: async ({
        symbol,
        configID,
        strategy,
        botName,
        scannerLabel = ""
    }) => {
        const PositionSide = strategy.PositionSide
        const OrderChange = strategy.OrderChange
        try {
            const result = await StrategiesModel.updateOne(
                { label: symbol },
                { $pull: { children: { _id: configID } } }
            )

            if (result.deletedCount !== 0) {
                console.log(`[Mongo] Delete config ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) successful`);
                return true
            }
            else {
                console.log(`[! Mongo] Delete config ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) failed`);
                return false

            }
        } catch (error) {
            console.log(`[! Mongo] Delete config ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) error: ${error.message}`);
            return false
        }
    },
}

module.exports = dataCoinByBitController 