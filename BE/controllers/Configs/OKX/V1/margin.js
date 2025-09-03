const { RestClient } = require('okx-api');
const ServerModel = require('../../../../models/servers.model')
const MarginModel = require('../../../../models/Configs/OKX/V1/margin.model')
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

        const resultFilter = await MarginModel.aggregate([
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
        const result = await MarginModel.populate(resultFilter, {
            path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
        })


        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Margin"
            child.value = `MARGIN-${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },
    // GET
    closeAllBotForUpCode: async (req, res) => {
        dataCoinByBitController.sendDataRealtime({
            type: "close-upcode"
        })
        res.customResponse(200, "Send Successful", "");
    },

    getMarginBorrowCheck: async (req, res) => {

        const { botListData, symbol, positionSide } = req.body

        try {
            const resultAll = await Promise.allSettled(botListData.map(async botData => {

                const client = dataCoinByBitController.getRestClientV5Config({
                    apiKey: botData.ApiKey,
                    apiSecret: botData.SecretKey,
                    apiPass: botData.Password,
                });
                let spotMaxTradeAmount = 0
                let availBal = 0
                try {
                    const res = await client.getMaxLoan({
                        instId: symbol,
                        mgnMode: positionSide == "Long" ? "cross" : "isolated",
                        mgnCcy: "USDT"
                    })
                    let maxLoan = res?.[1]?.maxLoan
                    if (positionSide !== "Long") {
                        const getCurrentPriceRes = await client.getTicker({instId:symbol})
                        const currentPrice = getCurrentPriceRes[0]?.last
                        maxLoan = currentPrice * res?.[0]?.maxLoan
                    }
                    const resAvailBal = await client.getMaxAvailableTradableAmount({
                        instId: symbol,
                        tdMode: positionSide == "Long" ? "cross" : "isolated",
                        ccy: "USDT"
                    })
                    const data = resAvailBal?.[0]
                    availBal = positionSide == "Long" ? data.availBuy || 0 : data.availSell || 0
                    spotMaxTradeAmount = maxLoan
                } catch (error) {
                    console.log(error);
                    console.log("getBorrowInterestLimits error: " + error);
                    spotMaxTradeAmount = 0
                }
                return {
                    botData,
                    spotMaxTradeAmount,
                    availBal
                }
            }))

            const handleResult = resultAll.map(item => item.value)

            res.customResponse(res.statusCode, "Get Margin Borrow Check Successful", handleResult);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }

    },

    getLever: async (req, res) => {

        const { instId, mgnMode, botData } = req.body

        const client = dataCoinByBitController.getRestClientV5Config({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });
        
        try {
            const resData = await client.getLeverageV2({
                instId,
                mgnMode
            })
            res.customResponse(resData.statusCode, "Get Lever Successful", +resData[0]?.lever);

        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }

    },

    getAllStrategiesSpot: async (req, res) => {
        try {
            const userID = req.user._id
            const { botListInput } = req.body

            const botList = botListInput.map(item => new mongoose.Types.ObjectId(item));

            const resultFilter = await MarginModel.aggregate([
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
            const handleResult = await MarginModel.populate(resultFilter, {
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
            const result = await MarginModel.find().sort({ "label": 1 });

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
                result = await MarginModel.updateMany(
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
                result = await MarginModel.updateMany(
                    { "value": { "$in": Symbol } },
                    { "$push": { "children": botListId.map(botID => ({ ...newData, botID, userID, TimeTemp })) } },
                    { new: true }
                );
            }

            const resultFilter = await MarginModel.aggregate([
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


            const resultGet = await MarginModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Margin"
                child.value = `MARGIN-${data._id}-${child._id}`
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

            const result = await MarginModel.updateOne(
                { "children._id": strategiesID, _id: parentID },
                { $set: { "children.$": newData } }
            )


            if (result.acknowledged && result.matchedCount !== 0) {
                if (dataCoinByBitController.checkConditionStrategies(newData)) {
                    dataCoinByBitController.handleSendDataRealtime({
                        type: "update",
                        data: [{
                            ...newData,
                            market: "Margin",
                            value: `MARGIN-${parentID}-${strategiesID}`,
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

            const bulkResult = await MarginModel.bulkWrite(bulkOperations);

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


            const result = await MarginModel.updateOne(
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


            const result = await MarginModel.updateOne(
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

            const resultGet = await MarginModel.findOne(
                { _id: strategiesID },
            ).populate("children.botID")

            const newDataSocketWithBotData = resultGet.children.map(child => {
                child.symbol = resultGet.value
                child.market = "Margin"
                child.value = `MARGIN-${resultGet._id}-${child._id}`
                return child
            }) || []


            const result = await MarginModel.updateOne(
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

            const resultFilter = await MarginModel.aggregate([
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

            const resultGet = await MarginModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })
            const newDataSocketWithBotData = resultGet[0].children.map(child => {
                child.symbol = resultGet.value
                child.market = "Margin"
                child.value = `MARGIN-${parentID}-${id}`
                return child
            }) || []



            const result = await MarginModel.updateOne(
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

            const resultFilter = await MarginModel.aggregate([
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

            const resultGet = await MarginModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Margin"
                child.value = `MARGIN-${data._id}-${child._id}`
                return child
            })) || []



            const bulkOperations = strategiesIDList.map(data => ({
                updateOne: {
                    filter: { _id: data.parentID },
                    update: { $pull: { children: { _id: data.id } } }
                }
            }));

            const bulkResult = await MarginModel.bulkWrite(bulkOperations);

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

            const bulkResult = await MarginModel.bulkWrite(bulkOperations);


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

            const bulkResult = await MarginModel.bulkWrite(bulkOperations);


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


    getAllStrategiesActiveMarginBE: async (allbotOfServer) => {
        try {

            const resultFilter = await MarginModel.aggregate([
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
            const result = await MarginModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })


            const handleResult = result.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Margin"
                child.value = `MARGIN-${data._id}-${child._id}`
                return child
            })) || []

            return handleResult


        } catch (err) {
            return []
        }
    },
    getAllSymbolMarginBE: async () => {
        try {
            const result = await MarginModel.find().sort({ "label": 1 });

            return result.map(item => ({
                value: item.value,
                type: "Margin"
            }))

        } catch (err) {
            return []
        }
    },

    createStrategiesMultipleMarginBE: async ({
        dataInput,
        botID,
        botName,
        symbol,
        scannerID,
        PositionSide
    }) => {

        try {

            const TimeTemp = new Date().toString()

            const result = await MarginModel.updateMany(
                { "value": symbol },
                { "$push": { "children": dataInput.map(newData => ({ ...newData, botID, TimeTemp, scannerID })) } },
            );

            const resultFilter = await MarginModel.aggregate([
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

            const resultGet = await MarginModel.populate(resultFilter, {
                path: 'children',
                populate: [
                    { path: 'botID' },
                    { path: 'scannerID' }
                ]
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.market = "Margin"
                child.value = `MARGIN-${data._id}-${child._id}`
                return child
            })) || []

            if (result.acknowledged && result.matchedCount !== 0) {
                return {
                    message: `[Mongo] Add New ${dataInput.length} Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Successful`,
                    data: handleResult || []
                }
            }
            else {
                return {
                    message: `[Mongo] Add New ${dataInput.length} Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Failed`,
                    data: []
                }
            }

        }

        catch (error) {
            return {
                message: `[Mongo] Add New ${dataInput.length} Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Error: ${error.message}`,
                data: []
            }
        }

    },
    deleteStrategiesMultipleMarginBE: async ({
        scannerID,
        symbol,
        PositionSide,
        botName,
    }) => {
        try {

            const result = await MarginModel.updateMany(
                {
                    "children.scannerID": scannerID,
                    "value": symbol
                },
                { $pull: { "children": { scannerID } } }
            );

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Delete Mul-Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Successful`);
                return true
            }
            else {
                console.log(`[Mongo] Delete Mul-Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Failed `)
                return false
            }


        } catch (error) {
            console.log(`[Mongo] Delete Mul-Config Margin ( ${botName} - ${symbol} - ${PositionSide} ) Error: ${error.message} `)
            return false
        }
    },

    offConfigMarginBE: async ({
        symbol,
        configID,
        strategy,
        botName,
        scannerLabel = "",
        AmountOld
    }) => {
        const PositionSide = strategy.PositionSide
        const OrderChange = strategy.OrderChange

        if (!scannerLabel) {
            try {
                const result = await MarginModel.updateOne(
                    { "children._id": configID, label: symbol },
                    {
                        $set: {
                            "children.$.IsActive": false,
                            "children.$.Amount": AmountOld
                        }
                    }
                )

                if (result.acknowledged && result.matchedCount !== 0) {
                    console.log(`[Mongo] OFF config MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) successful`);
                    return true
                }
                else {
                    console.log(`[! Mongo] OFF config MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) failed`);
                    return false

                }
            } catch (error) {
                console.log(`[! Mongo] OFF config MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) error: ${error.message}`);
                return false
            }
        }
        else {
            try {
                const result = await MarginModel.updateOne(
                    { label: symbol },
                    { $pull: { children: { _id: configID } } }
                )

                if (result.deletedCount !== 0) {
                    console.log(`[Mongo] Delete config MARGIN ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) successful`);
                    return true
                }
                else {
                    console.log(`[! Mongo] Delete config MARGIN ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) failed`);
                    return false

                }
            } catch (error) {
                console.log(`[! Mongo] Delete config MARGIN ( ${scannerLabel} - ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) error: ${error.message}`);
                return false
            }
        }
    },
    increaseOCMarginBE: async ({
        symbol,
        configID,
        oldOC,
        newOC,
        strategy,
        botName
    }) => {
        const PositionSide = strategy.PositionSide
        const OrderChange = strategy.OrderChange
        try {
            const result = await MarginModel.updateOne(
                { "children._id": configID, label: symbol },
                { $set: { "children.$.OrderChange": newOC } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Increase OC ( ${oldOC} -> ${newOC} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) successful`);
                return true
            }
            else {
                console.log(`[! Mongo] Increase OC ( ${oldOC} -> ${newOC} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) failed`);
                return false

            }
        } catch (error) {
            console.log(`[! Mongo] Increase OC ( ${oldOC} -> ${newOC} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) error: ${error.message}`);
            return false

        }
    },
    increaseAmountMarginBE: async ({
        symbol,
        configID,
        oldAmount,
        newAmount,
        botName,
        strategy
    }) => {
        const PositionSide = strategy.PositionSide
        const OrderChange = strategy.OrderChange
        try {
            const result = await MarginModel.updateOne(
                { "children._id": configID, label: symbol },
                { $set: { "children.$.Amount": newAmount } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                console.log(`[Mongo] Increase Amount ( ${oldAmount} -> ${newAmount} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) successful`);
                return true
            }
            else {
                console.log(`[! Mongo] Increase Amount ( ${oldAmount} -> ${newAmount} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) failed`);
                return false

            }
        } catch (error) {
            console.log(`[! Mongo] Increase Amount ( ${oldAmount} -> ${newAmount} ) MARGIN ( ${botName} - ${symbol} - ${PositionSide} - ${OrderChange} ) error: ${error.message}`);
            return false
        }
    },
}

module.exports = dataCoinByBitController 