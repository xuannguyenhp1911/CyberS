const { RestClient } = require('okx-api');
const SpotModel = require('../../../../models/Configs/OKX/V1/spot.model')
const ServerModel = require('../../../../models/servers.model')
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
        apiKey,
        apiSecret,
        apiPass,
    }) => {
        return new RestClient({
            apiKey,
            apiSecret,
            apiPass,
        })
    },
    checkConditionStrategies: (strategiesData) => {
        return strategiesData.botID?.Status === "Running" && strategiesData.botID.ApiKey
    },
    getAllStrategiesNewUpdate: async (TimeTemp) => {

        const resultFilter = await SpotModel.aggregate([
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
        const result = await SpotModel.populate(resultFilter, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })


        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Spot"
            child.value = `SPOT-${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },
    // GET OTHER

    getFutureAvailable: async (req, res) => {

        const { botData } = req.body

        try {
            const client = dataCoinByBitController.getRestClientV5Config({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            });
            const resData = await client.getBalance({ccy:"USDT"})

            res.customResponse(400, "Get Future Available Successful", +resData[0].details[0]?.availBal || 0);

        }
        catch (err) {
            res.status(500).json({ message: err.msg });
        }
    },

    getSpotTotal: async (req, res) => {

        const { botData } = req.body

        try {
            const client = dataCoinByBitController.getRestClientV5Config({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            });
            const resData = await client.getAccountAssetValuation({ccy:"USDT"})
            const resData2 = await client.getBalances()
            const data = resData[0]

            res.customResponse(400, "Get Spot Total Successful", {
                funding: +data?.details?.funding || 0,
                trading: +data?.details?.trading || 0,
                totalBal: +data?.totalBal || 0,
                fundingUSDT: resData2[0]?.availBal || 0,
            });
        }
        catch (err) {
            res.status(500).json({ message: err.msg });
        }
    },
    balanceWallet: async (req, res) => {

        try {
            const { amount, futureLarger, botData } = req.body

            let FromWallet = "6"
            let ToWallet = "18"

            if (futureLarger) {
                FromWallet = "18"
                ToWallet = "6"
            }

            const client = dataCoinByBitController.getRestClientV5Config({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            })

            // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
            client.fundsTransfer(
                {
                    ccy: "USDT",
                    amt: amount,
                    from: FromWallet,
                    to: ToWallet
                }
            )
                .then((response) => {
                    res.customResponse(200, "Saving Successful", response)
                })
                .catch((error) => {
                    res.status(500).json({ message: error.msg });
                });


        }
        catch (error) {
            res.status(500).json({ message: err.message });
        }
    },
    getSpotBorrowCheck: async (req, res) => {

        const { botListData, symbol } = req.body

        try {
            const resultAll = await Promise.allSettled(botListData.map(async botData => {

                const client = dataCoinByBitController.getRestClientV5Config({
                    apiKey: botData.ApiKey,
                    apiSecret: botData.SecretKey,
                    apiPass: botData.Password,
                });
                let spotMaxTradeAmount = 0
                try {
                    const res = await client.getMaxLoan(symbol, "isolated", "USDT")
                    spotMaxTradeAmount = res?.[1]?.maxLoan || 0
                } catch (error) {
                    console.log(error);
                    console.log("getBorrowInterestLimits error: " + error);
                    spotMaxTradeAmount = 0
                }
                return {
                    botData,
                    spotMaxTradeAmount
                }
            }))

            const handleResult = resultAll.map(item => item.value)

            res.customResponse(res.statusCode, "Get Spot Borrow Check Successful", handleResult);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // GET
    getAllStrategiesSpot: async (req, res) => {
        try {
            const userID = req.user._id
            const { botListInput } = req.body

            const botList = botListInput.map(item => new mongoose.Types.ObjectId(item));

            const resultFilter = await SpotModel.aggregate([
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
            const handleResult = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            // const handleResult = result.reduce((result, child) => {
            //     if (child.children.some(childData => childData.botID.Status === "Running")) {
            //         result.push({
            //             ...child,
            //             children: child.children.filter(item => item.botID.Status === "Running")
            //         })
            //     }
            //     return result
            // }, []) || []


            res.customResponse(res.statusCode, "Get All Strategies Successful", handleResult);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllSymbolSpot: async (req, res) => {
        try {
            const result = await SpotModel.find().sort({ "label": 1 });

            res.customResponse(res.statusCode, "Get All Symbol Successful", result.map(item => item.value));

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },


    // CREATE
    createStrategiesSpot: async (req, res) => {

        try {
            const userID = req.user._id

            const { data, botListId, Symbol } = req.body

            let result

            const TimeTemp = new Date().toString()

            const newData = data

            if (newData.PositionSide === "Both") {
                result = await SpotModel.updateMany(
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
                result = await SpotModel.updateMany(
                    { "value": { "$in": Symbol } },
                    { "$push": { "children": botListId.map(botID => ({ ...newData, botID, userID, TimeTemp })) } },
                    { new: true }
                );
            }

            const resultFilter = await SpotModel.aggregate([
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


            const resultGet = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Spot"
                child.value = `SPOT-${data._id}-${child._id}`
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
            res.status(500).json({ message: error.message });
        }

    },


    // UPDATE
    updateStrategiesSpotByID: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const { parentID, newData, symbol } = req.body

            const result = await SpotModel.updateOne(
                { "children._id": strategiesID, _id: parentID },
                { $set: { "children.$": newData } }
            )


            if (result.acknowledged && result.matchedCount !== 0) {
                if (dataCoinByBitController.checkConditionStrategies(newData)) {
                    dataCoinByBitController.handleSendDataRealtime({
                        type: "update",
                        data: [{
                            ...newData,
                            market: "Spot",
                            value: `SPOT-${parentID}-${strategiesID}`,
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

    updateStrategiesMultipleSpot: async (req, res) => {
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

            const bulkResult = await SpotModel.bulkWrite(bulkOperations);

                const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

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

    addToBookmarkSpot: async (req, res) => {
        try {

            const symbolID = req.params.id;
            const userID = req.user._id;


            const result = await SpotModel.updateOne(
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
    removeToBookmarkSpot: async (req, res) => {
        try {

            const symbolID = req.params.id;
            const userID = req.user._id;


            const result = await SpotModel.updateOne(
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
    deleteStrategiesSpot: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const resultGet = await SpotModel.findOne(
                { _id: strategiesID },
            ).populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const newDataSocketWithBotData = resultGet.children.map(child => {
                child.symbol = resultGet.value
                child.market = "Spot"
                child.value = `SPOT-${resultGet._id}-${child._id}`
                return child
            }) || []


            const result = await SpotModel.updateOne(
                { _id: strategiesID },
                {
                    "children": []
                }
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

    deleteStrategiesItemSpot: async (req, res) => {
        try {

            const { id, parentID } = req.body;

            const resultFilter = await SpotModel.aggregate([
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

            const resultGet = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })
            const newDataSocketWithBotData = resultGet[0].children.map(child => {
                child.symbol = resultGet.value
                child.market = "Spot"
                child.value = `SPOT-${parentID}-${id}`
                return child
            }) || []



            const result = await SpotModel.updateOne(
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

    deleteStrategiesMultipleSpot: async (req, res) => {
        try {

            const strategiesIDList = req.body

            const parentIDs = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.parentID));
            const ids = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.id));

            const resultFilter = await SpotModel.aggregate([
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

            const resultGet = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Spot"
                child.value = `SPOT-${data._id}-${child._id}`
                return child
            })) || []



            const bulkOperations = strategiesIDList.map(data => ({
                updateOne: {
                    filter: { _id: data.parentID },
                    update: { $pull: { children: { _id: data.id } } }
                }
            }));

            const bulkResult = await SpotModel.bulkWrite(bulkOperations);

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

    copyMultipleStrategiesToSymbolSpot: async (req, res) => {

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

            const bulkResult = await SpotModel.bulkWrite(bulkOperations);




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

    copyMultipleStrategiesToBotSpot: async (req, res) => {

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

            const bulkResult = await SpotModel.bulkWrite(bulkOperations);


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



    getAllStrategiesActiveSpotBE: async (allbotOfServer) => {
        try {

            const resultFilter = await SpotModel.aggregate([
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
            const result = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })


            const handleResult = result.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Spot"
                child.value = `SPOT-${data._id}-${child._id}`
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
            return []
        }
    },
    getAllSymbolSpotBE: async () => {
        try {
            const result = await SpotModel.find().sort({ "label": 1 });

            return result.map(item => ({
                value: item.value,
                type: "Spot"
            }))

        } catch (err) {
            return []
        }
    },

    deleteStrategiesItemSpotBE: async ({
        id, parentID
    }) => {
        try {
            const result = await SpotModel.updateOne(
                { _id: parentID },
                { $pull: { children: { _id: id } } }
            );

            if (result.acknowledged && result.deletedCount !== 0) {

                return "Delete Config Spot Successful"
            }
            else {
                return "Delete Config Spot failed"
            }

        } catch (error) {
            return "Delete Config Spot Error: " + error.message
        }
    },

    createStrategiesMultipleSpotBE: async ({
        dataInput,
        botID,
        botName,
        symbol,
        scannerID
    }) => {

        try {

            const TimeTemp = new Date().toString()

            const result = await SpotModel.updateMany(
                { "value": symbol },
                { "$push": { "children": dataInput.map(newData => ({ ...newData, botID, TimeTemp, scannerID })) } },
            );

            const resultFilter = await SpotModel.aggregate([
                {
                    $match: {
                        children: {
                            $elemMatch: {
                                IsActive: true,
                                scannerID: new mongoose.Types.ObjectId(scannerID),
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
                                        { $eq: ["$$child.scannerID", new mongoose.Types.ObjectId(scannerID)] },
                                        { $eq: ["$$child.TimeTemp", TimeTemp] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await SpotModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Spot"
                child.value = `SPOT-${data._id}-${child._id}`
                return child
            })) || []

            if (result.acknowledged && result.matchedCount !== 0) {

                return {
                    message: `[Mongo] Add New ${dataInput.length} Config Spot ( ${botName} - ${symbol} ) Successful`,
                    data: handleResult || []
                }
            }
            else {
                return {
                    message: `[Mongo] Add New ${dataInput.length} Config Spot ( ${botName} - ${symbol} ) Failed`,
                    data: []
                }
            }

        }

        catch (error) {
            return {
                message: `[Mongo] Add New ${dataInput.length} Config Spot ( ${botName} - ${symbol} ) Error: ${error.message}`,
                data: []
            }
        }

    },

    deleteStrategiesMultipleSpotBE: async ({
        scannerID,
        symbol,
        PositionSide,
        botName,
    }) => {
        try {
            const result = await SpotModel.updateMany(
                {
                    "children.scannerID": scannerID,
                    "value": symbol
                },
                { $pull: { "children": { scannerID } } }
            );

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Delete Mul-Config Spot ( ${botName} - ${symbol} ) Successful`);
                return true
            }
            else {
                console.log(`[Mongo] Delete Mul-Config Spot ( ${botName} - ${symbol} ) Failed `)
                return false
            }


        } catch (error) {
            console.log(`[Mongo] Delete Mul-Config Spot ( ${botName} - ${symbol} ) Error: ${error.message} `)
            return false
        }
    },

    offConfigSpotBE: async ({
        symbol,
        configID,
        strategy,
        botName,
        scannerLabel = "",
        AmountOld
    }) => {
        const OrderChange = strategy.OrderChange
        if (!scannerLabel) {

            try {
                const result = await SpotModel.updateOne(
                    { "children._id": configID, label: symbol },
                    {
                        $set: {
                            "children.$.IsActive": false,
                            "children.$.Amount": AmountOld
                        }
                    }
                )

                if (result.acknowledged && result.matchedCount !== 0) {
                    console.log(`[Mongo] OFF config SPOT ( ${botName} - ${symbol} - ${OrderChange} ) successful`);
                    return true
                }
                else {
                    console.log(`[! Mongo] OFF config SPOT ( ${botName} - ${symbol} - ${OrderChange} ) failed`);
                    return false

                }
            } catch (error) {
                console.log(`[! Mongo] OFF config SPOT ( ${botName} - ${symbol} - ${OrderChange} ) error: ${error.message}`);
                return false
            }
        }
        else {
            try {
                const result = await SpotModel.updateOne(
                    { label: symbol },
                    { $pull: { children: { _id: configID } } }
                )
                if (result.deletedCount !== 0) {
                    console.log(`[Mongo] Delete config SPOT ( ${scannerLabel} - ${botName} - ${symbol} - ${OrderChange} ) successful`);
                    return true
                }
                else {
                    console.log(`[! Mongo] Delete config SPOT ( ${scannerLabel} - ${botName} - ${symbol} - ${OrderChange} ) failed`);
                    return false

                }
            } catch (error) {
                console.log(`[! Mongo] Delete config SPOT ( ${scannerLabel} - ${botName} - ${symbol} - ${OrderChange} ) error: ${error.message}`);
                return false
            }
        }
    },
    increaseOCSpotBE: async ({
        symbol,
        configID,
        oldOC,
        newOC,
        strategy,
        botName
    }) => {
        const OrderChange = strategy.OrderChange
        try {
            const result = await SpotModel.updateOne(
                { "children._id": configID, label: symbol },
                { $set: { "children.$.OrderChange": newOC } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Increase OC ( ${oldOC} -> ${newOC} ) SPOT ( ${botName} - ${symbol} - ${OrderChange} ) successful`);
                return true
            }
            else {
                console.log(`[! Mongo] Increase OC ( ${oldOC} -> ${newOC} ) SPOT ( ${botName} - ${symbol} - ${OrderChange} ) failed`);
                return false

            }
        } catch (error) {
            console.log(`[! Mongo] Increase OC ( ${oldOC} -> ${newOC} ) SPOT ( ${botName} - ${symbol} - ${OrderChange} ) error: ${error.message}`);
            return false

        }
    },
    increaseAmountSpotBE: async ({
        symbol,
        configID,
        oldAmount,
        newAmount,
        botName,
        strategy
    }) => {

        const OrderChange = strategy.OrderChange
        try {

            const result = await SpotModel.updateOne(
                { "children._id": configID, label: symbol },
                { $set: { "children.$.Amount": newAmount } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Increase Amount SPOT ( ${oldAmount} -> ${newAmount} ) (  ${botName} - ${symbol} - ${OrderChange} ) successful`);
                return true
            }
            else {
                console.log(`[! Mongo] Increase Amount SPOT ( ${oldAmount} -> ${newAmount} ) (  ${botName} - ${symbol} - ${OrderChange} ) failed`);
                return false

            }
        } catch (error) {
            console.log(`[! Mongo] Increase Amount SPOT ( ${oldAmount} -> ${newAmount} ) (  ${botName} - ${symbol} - ${OrderChange} ) error: ${error.message}`);
            return false

        }
    },

    balanceWalletOKXBE: async ({
        amount, futureLarger, botData
    }) => {

        try {
            let FromWallet = "6"
            let ToWallet = "18"

            if (futureLarger) {
                FromWallet = "18"
                ToWallet = "6"
            }

            const client = dataCoinByBitController.getRestClientV5Config({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            })

            // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
            client.fundsTransfer(
                {
                    ccy: "USDT",
                    amt: amount,
                    from: FromWallet,
                    to: ToWallet
                }
            )
                .then((response) => {
                })
                .catch((error) => {
                    console.log("[!] Saving Failed:", error.msg);
                });


        }
        catch (error) {
            console.log("[!] Saving Failed:", error.message);
        }
    },
}

module.exports = dataCoinByBitController 