// const { ObjectId } = require('mongodb');
const BotModel = require('../models/bot.model');
const GroupModel = require('../models/group.model');
const UserModel = require('../models/user.model');
const ServerModel = require('../models/servers.model');
const ServersModel = require('../models/servers.model');

const StrategiesByBitV3Model = require('../models/Configs/ByBit/V3/config.model');
const StrategiesWaveByBitV3Model = require('../models/Configs/ByBit/V3/wave.model');
const ScannerByBitV3Model = require('../models/Configs/ByBit/V3/scanner.model');

const SpotByBitV1Model = require('../models/Configs/ByBit/V1/spot.model');
const MarginByBitV1Model = require('../models/Configs/ByBit/V1/margin.model');
const ScannerByBitV1Model = require('../models/Configs/ByBit/V1/scanner.model');

const SpotOKXV1Model = require('../models/Configs/OKX/V1/spot.model');
const MarginOKXV1Model = require('../models/Configs/OKX/V1/margin.model');
const FuturesOKXV1Model = require('../models/Configs/OKX/V1/futures.model');
const ScannerOKXV1Model = require('../models/Configs/OKX/V1/scanner.model');

const ConfigOKXV3Model = require('../models/Configs/OKX/V3/config.model');
const ScannerOKXV3Model = require('../models/Configs/OKX/V3/scanner.model');

const ConfigBinanceV3ModelOld = require('../models/Configs/Binance/V3/configOld.model');
const ConfigBinanceV3Model = require('../models/Configs/Binance/V3/config.model');
const ScannerBinanceV3Model = require('../models/Configs/Binance/V3/scanner.model');

const CoinModelBinance = require('../models/Coins/Binance/coinFutures.model');



const { default: mongoose } = require('mongoose');
const { RestClient } = require('okx-api');
const { RestClientV5 } = require('bybit-api');
const { MainClient, USDMClient } = require('binance');

const BotController = {
    // SOCKET

    sendDataRealtime: async ({
        type,
        data,
        serverIP
    }) => {
        const { socketServer } = require('../serverConfig');
        const resData = await ServerModel.findOne({ _id: serverIP })
        if (!resData) return

        const serverIPMain = resData.IP

        socketServer.to(serverIPMain).emit(type, data)
    },
    getConfigRestClientByBit: ({
        ApiKey,
        SecretKey,
        Demo
    }) => {
        return new RestClientV5({
            testnet: !Demo ? false : true,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,
            recv_window: 100000,
            demoTrading: !Demo ? false : true,
        });
    },
    getConfigRestClientOKX: ({
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
    getConfigRestClientBinance: ({
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
    getAllConfigByBitV3ByBotID: async ({
        botID,
    }) => {
        const resultFilter = await StrategiesByBitV3Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await StrategiesByBitV3Model.populate(resultFilter, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })
        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `${data._id}-${child._id}`
            // child.IsActive = IsActive !== "not-modified" ? IsActive : child.IsActive
            return child
        })) || []

        const resultFilter2 = await StrategiesWaveByBitV3Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result2 = await StrategiesWaveByBitV3Model.populate(resultFilter2, {
            path: 'children',
            populate: [
                { path: 'botID' },
            ]
        })
        const newDataSocketWithBotData2 = result2.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `WAVE-${data._id}-${child._id}`
            return child
        })) || []

        return [
            ...newDataSocketWithBotData,
            ...newDataSocketWithBotData2
        ];
    },
    getAllConfigByBitV1ByBotID: async ({
        botID,
    }) => {
        const resultFilter = await SpotByBitV1Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await SpotByBitV1Model.populate(resultFilter, {
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

        const resultFilter2 = await MarginByBitV1Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result2 = await MarginByBitV1Model.populate(resultFilter2, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })

        const newDataSocketWithBotData2 = result2.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Margin"
            child.value = `MARGIN-${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData.concat(newDataSocketWithBotData2);
    },
    getAllConfigOKXV1ByBotID: async ({
        botID,
    }) => {
        const resultFilter = await SpotOKXV1Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await SpotOKXV1Model.populate(resultFilter, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })

        const newDataSocketWithBotDataSpot = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Spot"
            child.value = `SPOT-${data._id}-${child._id}`
            return child
        })) || []

        // 
        const resultFilter2 = await MarginOKXV1Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result2 = await MarginOKXV1Model.populate(resultFilter2, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })
        const newDataSocketWithBotDataMargin = result2.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Margin"
            child.value = `MARGIN-${data._id}-${child._id}`
            return child
        })) || []

        // 
        const resultFilter3 = await FuturesOKXV1Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result3 = await FuturesOKXV1Model.populate(resultFilter3, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })

        const newDataSocketWithBotDataFutures = result3.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.market = "Futures"
            child.value = `Futures-${data._id}-${child._id}`
            return child
        })) || []

        return [
            ...newDataSocketWithBotDataSpot,
            ...newDataSocketWithBotDataMargin,
            ...newDataSocketWithBotDataFutures,
        ]
    },
    getAllConfigOKXV3ByBotID: async ({
        botID,
    }) => {
        const resultFilter = await ConfigOKXV3Model.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await ConfigOKXV3Model.populate(resultFilter, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })

        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },
    getAllConfigBinanceV3ByBotID: async ({
        botID,
    }) => {
        const resultFilter = await ConfigBinanceV3ModelOld.aggregate([
            {
                $match: {
                    "children.botID": new mongoose.Types.ObjectId(botID)
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
                                    { $eq: ["$$child.botID", new mongoose.Types.ObjectId(botID)] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await ConfigBinanceV3ModelOld.populate(resultFilter, {
            path: 'children',
            populate: [
                { path: 'botID' },
                { path: 'scannerID' }
            ]
        })

        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },

    // 
    getAllBot: async (req, res) => {
        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({})
                .sort({ Created: -1 })
                .populate("userID", "userName roleName")
                .populate("serverIP", "name")
                .populate("botIDCopy", "botName")
                .populate("botIDBeCopyList", "botName")

            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotForCopyTrading: async (req, res) => {
        try {

            const userID = req.user._id;
            const botType = req.query.botType

            const data = await BotModel.find({
                userID: { $ne: userID },
                "Status": "Running",
                "botType": botType,
                $or: [
                    { botIDCopy: { $exists: false } }, // không có trường này
                    { botIDCopy: null }                // có nhưng gán null
                ],
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getAllBotByUserID: async (req, res) => {
        try {
            const userID = req.params.id;

            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({ userID }, { telegramToken: 0 }).sort({ Created: -1 }).populate("userID", "userName roleName").populate("serverIP", "name");
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotActiveByUserID: async (req, res) => {
        try {
            const userID = req.params.id;
            const botType = req.query.botType

            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({
                userID,
                "Status": "Running",
                "botType": botType,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            }, { telegramToken: 0 }).populate("serverIP")
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getAllBotActive: async (req, res) => {
        const botType = req.query.botType

        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find(
                {
                    Status: "Running",
                    "botType": botType,
                    ApiKey: { $exists: true, $ne: null },
                    SecretKey: { $exists: true, $ne: null }
                }
            ).sort({ Created: -1 })
            res.customResponse(200, "Get All Bot Active Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotOnlyApiKey: async (req, res) => {
        try {
            const botType = req.params.id;

            const data = await BotModel.find({
                botType,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            }, { telegramToken: 0 }).sort({ Created: -1 })

            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotOnlyApiKeyByUserID: async (req, res) => {
        try {
            const userID = req.params.id;
            const botType = req.query.botType

            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({
                userID,
                botType,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            }, { telegramToken: 0 }).sort({ Created: -1 })
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotByGroupCreatedByUserID: async (req, res) => {
        try {
            const userID = req.user._id;

            const resultGetAllGroup = await GroupModel.find({ userID })

            const userIDList = resultGetAllGroup.flatMap((group) => group.member.map((member => member.userID)))

            const data = await BotModel.find({ userID: { $in: [...userIDList, userID] } }).sort({ Created: -1 }).populate("userID", "userName roleName").populate("serverIP", "name");

            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotBySameGroup: async (req, res) => {
        try {
            const groupID = req.params.id;

            const resultGetAllUsersID = await UserModel.find({ groupID }, { telegramToken: 0 }).select('_id');

            const data = await BotModel.find({ userID: { $in: resultGetAllUsersID } }).sort({ Created: -1 }).populate("userID", "userName roleName").populate("serverIP", "name");
            res.customResponse(200, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotByListID: async (req, res) => {
        try {
            const { listID } = req.body;

            const data = await BotModel.find({ _id: { $in: listID } }, { telegramToken: 0 }).select('_id').populate("userID")

            res.customResponse(200, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getByID: async (req, res) => {
        try {
            const botID = req.params.id;
            const data = await BotModel.findById(botID)
                .sort({ Created: -1 })
                .populate("serverIP", "name")
                .populate("botIDCopy", "botName")
                .populate("botIDBeCopyList", "botName")
                .populate("userID", "userName roleName");
            res.customResponse(200, "Get Bot By ID Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getApiInfo: async (req, res) => {
        try {
            const botData = req.body;
            let expiredAt

            switch (botData.botType) {
                case "ByBit_V3":
                case "ByBit_V1":
                    {
                        const client = BotController.getConfigRestClientByBit({
                            ApiKey: botData.ApiKey,
                            SecretKey: botData.SecretKey,
                            Demo: botData.Demo,
                        })
                        const resData = await client.getQueryApiKey()
                        expiredAt = resData.result?.expiredAt
                        break
                    }
                case "OKX_V1":
                case "OKX_V3":
                    {
                        break

                    }
                case "Binance_V3":
                case "Binance_V1": {
                    const client = BotController.getConfigRestClientBinance({
                        ApiKey: botData.ApiKey,
                        SecretKey: botData.SecretKey,
                        Demo: botData.Demo,
                    })
                    const resData = await client.getApiTradingStatus()

                    break
                }
            }


            res.customResponse(200, "Get Bot Api Successful", expiredAt);


        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    createBot: async (req, res) => {
        try {

            const userID = req.user._id

            const data = req.body
            const newBot = new BotModel({
                ...data,
                Created: new Date(),
                userID
            });

            const savedBot = await newBot.save();
            const serverID = data.serverIP
            if (serverID) {
                await ServersModel.updateOne(
                    {
                        _id: serverID
                    },
                    {
                        $push: { botList: savedBot._id }
                    });
            }

            res.customResponse(200, "Add New Bot Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            console.log(error);
            res.status(500).json({ message: "Add New Bot Error" });
        }
    },
    updateFutureBalancePercent: async (req, res) => {
        try {

            const { botData, futureBalancePercent, timeBalanceLoop } = req.body

            const result = await BotModel.updateOne({ _id: botData._id }, { $set: { futureBalancePercent, timeBalanceLoop } })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Config Successful", "");
                const { socketServer } = require('../serverConfig');
                socketServer.to("Balance").emit("Balance", { botData, timeBalanceLoop })

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

    updateBot: async (req, res) => {
        try {

            const botID = req.params.id;

            const { type, checkBot, botType, serverIP, ...data } = req.body;

            let dataCheckBotApi = false

            if (data.ApiKey) {
                dataCheckBotApi = await BotModel.findOne({
                    ApiKey: data.ApiKey,
                    _id: { $ne: botID },
                    botType
                })

            }

            if (!dataCheckBotApi) {

                delete data?.Created
                const result = await BotModel.updateOne({ _id: botID }, { $set: data })

                if (result.acknowledged && result.matchedCount !== 0) {
                    switch (botType) {
                        case "ByBit_V3":
                            {
                                if (checkBot) {
                                    const getAllStrategiesActiveByBotID = BotController.getAllConfigByBitV3ByBotID({
                                        botID,
                                    })

                                    const getScannerV3ByBotID = await ScannerByBitV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                                    const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])
                                    const newDataSocketWithBotData = resultAll[0].value
                                    const scannerV3List = resultAll[1].value

                                    switch (type) {
                                        case "Active": {
                                            const IsActive = data.Status === "Running" ? true : false;

                                            // if (!IsActive) {
                                            //     const deActiveScanner = ScannerByBitV3Model.updateMany({ botID }, { IsActive: false })
                                            //     const deActiveStrategies = StrategiesByBitV3Model.updateMany(
                                            //         { "children.botID": botID },
                                            //         {
                                            //             $set: {
                                            //                 "children.$[elem].IsActive": false,
                                            //             }
                                            //         },
                                            //         {
                                            //             arrayFilters: [{ "elem.botID": botID }]
                                            //         }
                                            //     );

                                            //     await Promise.allSettled([deActiveScanner, deActiveStrategies])
                                            // }

                                            // (newDataSocketWithBotData?.length > 0 || scannerV3List?.length > 0) && BotController.sendDataRealtime({
                                            BotController.sendDataRealtime({
                                                type: "bot-update",
                                                data: {
                                                    newData: {
                                                        configData: newDataSocketWithBotData,
                                                        scannerData: scannerV3List
                                                    },
                                                    botIDMain: botID,
                                                    botActive: IsActive,
                                                    botData: data
                                                },
                                                serverIP
                                            })

                                            const { socketServer } = require('../serverConfig');
                                            socketServer.to("Balance").emit("Balance", { botData: data, timeBalanceLoop: data?.timeBalanceLoop })
                                            break
                                        }
                                        case "telegram": {

                                            BotController.sendDataRealtime({
                                                type: "bot-telegram",
                                                data: {
                                                    // newData: {
                                                    //     configData: newDataSocketWithBotData,
                                                    //     scannerData: scannerV3List
                                                    // },
                                                    botID,
                                                    newApiData: {
                                                        telegramTokenOld: data.telegramTokenOld,
                                                        telegramID: data.telegramID,
                                                        telegramToken: data.telegramToken,
                                                        botName: data.botName,
                                                    }
                                                },
                                                serverIP
                                            })
                                            break
                                        }
                                        case "CopyTrading": {

                                            console.log("CopyTrading");

                                            // BotController.sendDataRealtime({
                                            //     type: "bot-telegram",
                                            //     data: {
                                            //         // newData: {
                                            //         //     configData: newDataSocketWithBotData,
                                            //         //     scannerData: scannerV3List
                                            //         // },
                                            //         botID,
                                            //         newApiData: {
                                            //             telegramTokenOld: data.telegramTokenOld,
                                            //             telegramID: data.telegramID,
                                            //             telegramToken: data.telegramToken,
                                            //             botName: data.botName,
                                            //         }
                                            //     },
                                            //     serverIP
                                            // })
                                            break
                                        }
                                    }


                                }
                                break;
                            }
                        case "ByBit_V1":
                            {
                                if (checkBot) {
                                    const getAllStrategiesActiveByBotID = BotController.getAllConfigByBitV1ByBotID({
                                        botID,
                                    })

                                    const getScannerV3ByBotID = await ScannerByBitV1Model.find({ botID, IsActive: true }).populate(['botID'])

                                    const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])
                                    const newDataSocketWithBotData = resultAll[0].value
                                    const scannerV3List = resultAll[1].value

                                    if (type === "Active") {
                                        const IsActive = data.Status === "Running" ? true : false;

                                        // if (!IsActive) {
                                        //     const deActiveScanner = ScannerByBitV1Model.updateMany({ botID }, { IsActive: false })
                                        //     const deActiveStrategies = SpotByBitV1Model.updateMany(
                                        //         { "children.botID": botID },
                                        //         {
                                        //             $set: {
                                        //                 "children.$[elem].IsActive": false,
                                        //             }
                                        //         },
                                        //         {
                                        //             arrayFilters: [{ "elem.botID": botID }]
                                        //         }
                                        //     );
                                        //     const deActiveStrategiesMargin = MarginByBitV1Model.updateMany(
                                        //         { "children.botID": botID },
                                        //         {
                                        //             $set: {
                                        //                 "children.$[elem].IsActive": false,
                                        //             }
                                        //         },
                                        //         {
                                        //             arrayFilters: [{ "elem.botID": botID }]
                                        //         }
                                        //     );

                                        //     await Promise.allSettled([deActiveScanner, deActiveStrategies, deActiveStrategiesMargin])
                                        // }


                                        // (newDataSocketWithBotData?.length > 0 || scannerV3List?.length > 0) && BotController.sendDataRealtime({
                                        BotController.sendDataRealtime({
                                            type: "bot-update",
                                            data: {
                                                newData: {
                                                    configData: newDataSocketWithBotData,
                                                    scannerData: scannerV3List
                                                },
                                                botIDMain: botID,
                                                botActive: IsActive,
                                                botData: data
                                            },
                                            serverIP
                                        })
                                        const { socketServer } = require('../serverConfig');
                                        socketServer.to("Balance").emit("Balance", { botData: data, timeBalanceLoop: data?.timeBalanceLoop })

                                    }
                                    else if (type === "Api") {

                                        // BotController.sendDataRealtime({
                                        //     type: "bot-api",
                                        //     data: {
                                        //         // newData: {
                                        //         //     configData: newDataSocketWithBotData,
                                        //         //     scannerData: scannerV3List
                                        //         // },
                                        //         botID,
                                        //         newApiData: {
                                        //             ApiKey: data.ApiKey,
                                        //             SecretKey: data.SecretKey
                                        //         }
                                        //     },
                                        //     botType
                                        // })
                                    }
                                    else if (type === "telegram") {

                                        BotController.sendDataRealtime({
                                            type: "bot-telegram",
                                            data: {
                                                // newData: {
                                                //     configData: newDataSocketWithBotData,
                                                //     scannerData: scannerV3List
                                                // },
                                                botID,
                                                newApiData: {
                                                    telegramTokenOld: data.telegramTokenOld,
                                                    telegramID: data.telegramID,
                                                    telegramToken: data.telegramToken,
                                                    botName: data.botName,
                                                }
                                            },
                                            serverIP
                                        })
                                    }
                                }
                                break;
                            }
                        case "OKX_V1":
                            {
                                if (checkBot) {
                                    const getAllStrategiesActiveByBotID = BotController.getAllConfigOKXV1ByBotID({
                                        botID,
                                    })

                                    const getScannerV3ByBotID = await ScannerOKXV1Model.find({ botID, IsActive: true }).populate(['botID'])

                                    const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])
                                    const newDataSocketWithBotData = resultAll[0].value
                                    const scannerV3List = resultAll[1].value

                                    if (type === "Active") {
                                        const IsActive = data.Status === "Running" ? true : false;

                                        BotController.sendDataRealtime({
                                            type: "bot-update",
                                            data: {
                                                newData: {
                                                    configData: newDataSocketWithBotData,
                                                    scannerData: scannerV3List
                                                },
                                                botIDMain: botID,
                                                botActive: IsActive,
                                                botData: data
                                            },
                                            serverIP
                                        })
                                        const { socketServer } = require('../serverConfig');
                                        socketServer.to("Balance").emit("Balance", { botData: data, timeBalanceLoop: data?.timeBalanceLoop })

                                    }
                                    else if (type === "Api") {

                                    }
                                    else if (type === "telegram") {

                                        BotController.sendDataRealtime({
                                            type: "bot-telegram",
                                            data: {
                                                botID,
                                                newApiData: {
                                                    telegramTokenOld: data.telegramTokenOld,
                                                    telegramID: data.telegramID,
                                                    telegramToken: data.telegramToken,
                                                    botName: data.botName,
                                                }
                                            },
                                            serverIP
                                        })
                                    }
                                }
                                break;
                            }
                        case "OKX_V3":
                            {
                                if (checkBot) {
                                    const getAllStrategiesActiveByBotID = BotController.getAllConfigOKXV3ByBotID({
                                        botID,
                                    })

                                    const getScannerV3ByBotID =  ScannerOKXV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                                    const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])
                                    const newDataSocketWithBotData = resultAll[0].value
                                    const scannerV3List = resultAll[1].value

                                    if (type === "Active") {
                                        const IsActive = data.Status === "Running" ? true : false;

                                        BotController.sendDataRealtime({
                                            type: "bot-update",
                                            data: {
                                                newData: {
                                                    configData: newDataSocketWithBotData,
                                                    scannerData: scannerV3List
                                                },
                                                botIDMain: botID,
                                                botActive: IsActive,
                                                botData: data
                                            },
                                            serverIP
                                        })
                                        const { socketServer } = require('../serverConfig');
                                        socketServer.to("Balance").emit("Balance", { botData: data, timeBalanceLoop: data?.timeBalanceLoop })

                                    }
                                    else if (type === "Api") {

                                    }
                                    else if (type === "telegram") {

                                        BotController.sendDataRealtime({
                                            type: "bot-telegram",
                                            data: {
                                                botID,
                                                newApiData: {
                                                    telegramTokenOld: data.telegramTokenOld,
                                                    telegramID: data.telegramID,
                                                    telegramToken: data.telegramToken,
                                                    botName: data.botName,
                                                }
                                            },
                                            serverIP
                                        })
                                    }
                                }
                                break;
                            }
                        case "Binance_V3":
                            {
                                if (checkBot) {
                                    const getConfigOldV3ByBotID = BotController.getAllConfigBinanceV3ByBotID({
                                        botID,
                                    })

                                    const getConfigV3ByBotID =  ConfigBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])
                                    const getScannerV3ByBotID =  ScannerBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                                    const resultAll = await Promise.allSettled([getConfigV3ByBotID,getConfigOldV3ByBotID ,getScannerV3ByBotID])

                                    const newDataSocketWithBotData = resultAll[0].value
                                    const configOldData = resultAll[1].value
                                    const scannerV3List = resultAll[2].value

                                    if (type === "Active") {
                                        const IsActive = data.Status === "Running" ? true : false;

                                        BotController.sendDataRealtime({
                                            type: "bot-update",
                                            data: {
                                                newData: {
                                                    configData: newDataSocketWithBotData,
                                                    configOldData: configOldData,
                                                    scannerData: scannerV3List
                                                },
                                                botIDMain: botID,
                                                botActive: IsActive,
                                                botData: data
                                            },
                                            serverIP
                                        })

                                        const { socketServer } = require('../serverConfig');
                                        socketServer.to("Balance").emit("Balance", { botData: data, timeBalanceLoop: data?.timeBalanceLoop })

                                    }
                                    else if (type === "Api") {

                                        //  BotController.sendDataRealtime({
                                        //     type: "bot-api",
                                        //     data: {
                                        //         // newData: {
                                        //         //     configData: newDataSocketWithBotData,
                                        //         //     scannerData: scannerV3List
                                        //         // },
                                        //         botID,
                                        //         newApiData: {
                                        //             ApiKey: data.ApiKey,
                                        //             SecretKey: data.SecretKey
                                        //         }
                                        //     },
                                        //     botType
                                        // })
                                    }
                                    else if (type === "telegram") {

                                        BotController.sendDataRealtime({
                                            type: "bot-telegram",
                                            data: {
                                                // newData: {
                                                //     configData: newDataSocketWithBotData,
                                                //     scannerData: scannerV3List
                                                // },
                                                botID,
                                                newApiData: {
                                                    telegramTokenOld: data.telegramTokenOld,
                                                    telegramID: data.telegramID,
                                                    telegramToken: data.telegramToken,
                                                    botName: data.botName,
                                                }
                                            },
                                            serverIP
                                        })
                                    }
                                }
                                break;
                            }
                        default:
                            break;
                    }


                    res.customResponse(200, "Update Bot Successful", "");
                }
                else {
                    res.customResponse(400, "Update Bot failed", "");
                }
            }
            else {
                res.customResponse(400, "Api Bot Already Exists", "");
            }

        } catch (error) {
            console.log(error);
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Bot Error" });
        }
    },
    deleteBot: async (req, res) => {
        try {
            const { botID, botType, serverIP } = req.body;


            switch (botType) {
                case "ByBit_V3":
                    {
                        const getAllStrategiesActiveByBotID = BotController.getAllConfigByBitV3ByBotID({
                            botID,
                        })

                        const getScannerV3ByBotID = ScannerByBitV3Model.find({ botID }).populate("botID")

                        const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])

                        const newDataSocketWithBotData = resultAll[0].value
                        const scannerV3List = resultAll[1].value

                        // const deleteBot = BotModel.deleteOne({ _id: botID })

                        const deleteAllStrategies = StrategiesByBitV3Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteScannerV3 = ScannerByBitV3Model.deleteMany({ botID })

                        await Promise.allSettled([deleteAllStrategies, deleteScannerV3]);

                        (newDataSocketWithBotData?.length > 0 || scannerV3List?.length > 0) && BotController.sendDataRealtime({
                            type: "bot-delete",
                            data: {
                                newData: {
                                    configData: newDataSocketWithBotData,
                                    scannerData: scannerV3List
                                },
                                botID,
                            },
                            serverIP
                        })
                        break
                    }
                case "ByBit_V1":
                    {

                        const newDataSocketWithBotDataV1 = BotController.getAllConfigByBitV1ByBotID({
                            botID,
                        })

                        const getScannerV1ByBotID = ScannerByBitV1Model.find({ botID }).populate("botID")

                        const resultAll2 = await Promise.allSettled([newDataSocketWithBotDataV1, getScannerV1ByBotID])
                        const newDataSocketWithBotData1 = resultAll2[0].value
                        const scannerV1List = resultAll2[1].value


                        const deleteAllSpot = SpotByBitV1Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteAllMargin = MarginByBitV1Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteScannerV1 = ScannerByBitV1Model.deleteMany({ botID })

                        await Promise.allSettled([deleteAllSpot, deleteAllMargin, deleteScannerV1]);

                        (newDataSocketWithBotData1?.length > 0 || scannerV1List?.length > 0) && BotController.sendDataRealtime({
                            type: "bot-delete",
                            data: {
                                newData: {
                                    configData: newDataSocketWithBotData1,
                                    scannerData: scannerV1List
                                },
                                botID,
                            },
                            serverIP
                        })
                        break
                    }

                case "OKX_V1":
                    {

                        const newDataSocketWithBotDataV1OKX = BotController.getAllConfigOKXV1ByBotID({
                            botID,
                        })

                        const getScannerV1ByBotIDOKX = ScannerOKXV1Model.find({ botID }).populate("botID")

                        const resultAllOKX = await Promise.allSettled([newDataSocketWithBotDataV1OKX, getScannerV1ByBotIDOKX])
                        const newDataSocketWithBotDataOKX = resultAllOKX[0].value
                        const scannerV1ListOKX = resultAllOKX[1].value


                        const deleteAllSpotOKX = SpotOKXV1Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteAllMarginOKX = MarginOKXV1Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteAllFuturesOKX = FuturesOKXV1Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteScannerV1OKX = ScannerOKXV1Model.deleteMany({ botID })

                        await Promise.allSettled([deleteAllSpotOKX, deleteAllMarginOKX, deleteAllFuturesOKX, deleteScannerV1OKX]);

                        (newDataSocketWithBotDataOKX?.length > 0 || scannerV1ListOKX?.length > 0) && BotController.sendDataRealtime({
                            type: "bot-delete",
                            data: {
                                newData: {
                                    configData: newDataSocketWithBotDataOKX,
                                    scannerData: scannerV1ListOKX
                                },
                                botID,
                            },
                            serverIP
                        })
                        break
                    }
                case "OKX_V3":
                    {
                        const getAllStrategiesActiveByBotID = BotController.getAllConfigOKXV3ByBotID({
                            botID,
                        })

                        const getScannerV3ByBotID = ScannerOKXV3Model.find({ botID }).populate("botID")

                        const resultAll = await Promise.allSettled([getAllStrategiesActiveByBotID, getScannerV3ByBotID])

                        const newDataSocketWithBotData = resultAll[0].value
                        const scannerV3List = resultAll[1].value

                        // const deleteBot = BotModel.deleteOne({ _id: botID })

                        const deleteAllStrategies = ConfigOKXV3Model.updateMany(
                            { "children.botID": botID },
                            { $pull: { children: { botID: botID } } }
                        );
                        const deleteScannerV3 = ScannerOKXV3Model.deleteMany({ botID })

                        await Promise.allSettled([deleteAllStrategies, deleteScannerV3]);

                        (newDataSocketWithBotData?.length > 0 || scannerV3List?.length > 0) && BotController.sendDataRealtime({
                            type: "bot-delete",
                            data: {
                                newData: {
                                    configData: newDataSocketWithBotData,
                                    scannerData: scannerV3List
                                },
                                botID,
                            },
                            serverIP
                        })
                        break
                    }
                case "Binance_V3":
                    {

                        const getConfigV3ByBotID =  ConfigBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])
                        const getConfigOldV3ByBotID = BotController.getAllConfigBinanceV3ByBotID({
                            botID,
                        })

                        const getScannerV3ByBotID =  ScannerBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID'])

                        const resultAll = await Promise.allSettled([getConfigV3ByBotID,getConfigOldV3ByBotID ,getScannerV3ByBotID])

                        const newDataSocketWithBotData = resultAll[0].value
                        const configOldData = resultAll[1].value
                        const scannerV3List = resultAll[2].value
                  
                        await ConfigBinanceV3Model.deleteMany({ botID })

                        newDataSocketWithBotData?.length > 0 && BotController.sendDataRealtime({
                            type: "bot-delete",
                            data: {
                                newData: {
                                    configData: newDataSocketWithBotData,
                                    configOldData: configOldData,
                                    scannerData: scannerV3List
                                },
                                botID,
                            },
                            serverIP
                        })
                        break
                    }
            }

            const result = await BotModel.deleteOne({ _id: botID })
            await ServerModel.updateOne(
                {
                    _id: serverIP
                },
                {
                    $pull: { botList: botID }
                });

            if (result.deletedCount && result.deletedCount !== 0) {

                res.customResponse(200, "Delete Bot Successful");
            }
            else {
                res.customResponse(200, "Delete Bot Failed");
            }


        } catch (error) {
            res.status(500).json({ message: "Delete Bot Error" });
        }
    },
    updateBotCopyTrading: async (req, res) => {
        try {
            const { id, botIDCopy, botIDCopyOld } = req.body;

            const idConvert = new mongoose.Types.ObjectId(id)
            const botIDCopyConvert = new mongoose.Types.ObjectId(botIDCopy)

            const result = BotModel.updateOne({ _id: idConvert }, { $set: { botIDCopy: botIDCopyConvert } });
            const result2 = BotModel.updateOne({ _id: botIDCopyConvert }, {
                $addToSet: { botIDBeCopyList: idConvert }
            })
            const result3 = BotModel.updateOne({ _id: botIDCopyOld }, {
                $pull: { botIDBeCopyList: idConvert }
            })

            await Promise.all([result, result2, result3])

            res.customResponse(200, "Copy Bot Successful");

        } catch (error) {
            console.log(error);

            res.status(500).json({ message: "Copy Bot Error" });
        }
    },
    // deleteMultipleBot: async (req, res) => {
    //     try {
    //         const botIDList = req.body
    //         const botType = req.query.botType

    //         const botID = botIDList[0]

    //         let newDataSocketWithBotData = []

    //         switch (botType) {
    //             case "ByBit_V3":
    //                 newDataSocketWithBotData = await BotController.getAllConfigByBitV3ByBotID({
    //                     botID,
    //                 })
    //             case "ByBit_V1":
    //                 newDataSocketWithBotData = await BotController.getAllConfigByBitV1ByBotID({
    //                     botID,
    //                 })
    //                 break
    //         }

    //         const result = await BotModel.deleteMany({ _id: { $in: botIDList } })
    //         let resultStrategies
    //         switch (botType) {
    //             case "ByBit_V3":
    //                 resultStrategies = StrategiesByBitV3Model.updateMany(
    //                     { "children.botID": { $in: botIDList } },
    //                     { $pull: { children: { botID: { $in: botIDList } } } }
    //                 );
    //                 break
    //             case "ByBit_V1":
    //                 const spotDelete = SpotByBitV1Model.updateMany(
    //                     { "children.botID": { $in: botIDList } },
    //                     { $pull: { children: { botID: { $in: botIDList } } } }
    //                 );
    //                 const marginDelete = MarginByBitV1Model.updateMany(
    //                     { "children.botID": { $in: botIDList } },
    //                     { $pull: { children: { botID: { $in: botIDList } } } }
    //                 );
    //                 resultStrategies = Promise.allSettled([spotDelete, marginDelete]);
    //                 break
    //         }


    //         await Promise.all([result, resultStrategies])

    //         newDataSocketWithBotData.length > 0 && BotController.sendDataRealtime({
    //             type: "bot-delete",
    //             data: {
    //                 newData: newDataSocketWithBotData,
    //                 botID,
    //             },
    //             botType
    //         })

    //         res.customResponse(200, "Delete Bot Successful");


    //     } catch (error) {
    //         res.status(500).json({ message: "Delete Bot Error" });
    //     }
    // },

    setLever: async (req, res) => {
        try {

            const { lever, market, botData } = req.body
            const list = {}

            const leverConfig = Math.abs(lever)
            const clientOKX = new RestClient()

            if (market == "Spot") {
                const resultGetAll = await clientOKX.getInstruments({ instType: "MARGIN" })

                resultGetAll.forEach((e) => {
                    if (e.quoteCcy == "USDT") {
                        const symbol = e.instId
                        if (!list[symbol]) {
                            list[symbol] = {
                                symbol,
                                lever: e.lever,
                            }
                        }

                    }
                })
            }
            else {
                const resultGetAll = await clientOKX.getInstruments({ instType: "SWAP" })
                resultGetAll.forEach((e) => {
                    if (e.settleCcy == "USDT") {
                        const symbol = e.instId
                        if (!list[symbol]) {
                            list[symbol] = {
                                symbol,
                                lever: e.lever,
                            }
                        }

                    }
                })
            }

            const listSymbol = Object.values(list)

            let index = 0;
            const batchSize = 10

            let errorText = ""

            const clientOKXPrivate = BotController.getConfigRestClientOKX({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            })

            const listHandle = [];

            listSymbol.forEach((item) => {
                ["isolated", "cross"].forEach(async mgnMode => {
                    const symbol = item.symbol
                    const lever = Math.abs(item.lever)
                    const dataSet = {
                        lever: leverConfig > lever ? lever : leverConfig,
                        mgnMode,
                        instId: symbol,
                    }
                    if (market != "Spot") {
                        if (mgnMode == "cross") {
                            listHandle.push(dataSet)
                        }
                        else {
                            listHandle.push({
                                ...dataSet,
                                posSide: "long",
                            })
                            listHandle.push({
                                ...dataSet,
                                posSide: "short",
                            })
                        }

                    }
                    else {
                        listHandle.push(dataSet)
                    }
                })
            })

            while (index < listHandle.length) {
                const batch = listHandle.slice(index, index + batchSize);
                await Promise.allSettled(batch.map(async dataSet => {
                    try {
                        await clientOKXPrivate.setLeverage(dataSet)
                    } catch (error) {
                        errorText = error.msg
                        console.log(`[!] Set lever ( ${symbol} - ${lever} ) error`);
                        console.log(error);
                    }
                }))
                if (errorText) {
                    break
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                index += batchSize;
            }
            if (!errorText) {
                res.customResponse(200, "Set Lever Successful", listHandle);
            }
            else {
                res.customResponse(200, errorText, listHandle);
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: `Set Lever Error: ${error.message}` });
        }
    },
    setLeverByBit: async (req, res) => {
        try {

            const { lever, market, botData } = req.body



            const client = BotController.getConfigRestClientByBit({
                ApiKey: botData.ApiKey,
                SecretKey: botData.SecretKey,
                Demo: botData.Demo,
            })

            let CoinInfo = new RestClientV5({
                testnet: false,
                recv_window: 100000
            });

            await CoinInfo.getTickers({ category: 'linear' })
                .then(async (rescoin) => {
                    const list = rescoin.result.list

                    let index = 0
                    const batchSize = 10

                    while (index < list.length) {
                        const batch = list.slice(index, index + batchSize)
                        await Promise.allSettled(batch.map(async (e) => {
                            const maxLeverage = e.leverageFilter?.maxLeverage
                            if (e.symbol.split("USDT")[1] === "") {
                                // const newLever = leverConfig > maxLeverage ? maxLeverage : leverConfig?.toString()
                                const res = await client.setLeverage({
                                    buyLeverage: lever,
                                    sellLeverage: lever,
                                    category: "linear",
                                    symbol: e.symbol
                                })
                            }
                        }))
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        index += batchSize
                    }
                })
                .catch((error) => {
                    console.error(error);
                });
            res.customResponse(200, "Set Lever Successful",);
        } catch (error) {

            // Xử lý lỗi nếu có
            res.status(500).json({ message: `Set Lever Error: ${error.message}` });
        }
    },
    setLeverBinance: async (req, res) => {
        try {

            const { lever, market, botData } = req.body

            const listCoin = await CoinModelBinance.find().select("symbol")

            await Promise.allSettled(listCoin.map(item => {
                const symbol = item.symbol
                const client = new USDMClient({
                    api_key: botData.ApiKey,
                    api_secret: botData.SecretKey,
                    beautifyResponses: true,
                    recvWindow: 10000,
                    useTestnet: !botData.Demo ? false : true,
                })
                client.setTimeOffset(-3000)
                client.setLeverage({
                    leverage: Math.abs(lever),
                    symbol
                }).catch(err => {
                    // console.log(symbol,err?.message);
                })
            }))

            res.customResponse(200, "Set Lever Successful");

        } catch (error) {
            console.log(error);

            // Xử lý lỗi nếu có
            res.status(500).json({ message: `Set Lever Error: ${error.message}` });
        }
    },
    setLeverSymbolBot: async (req, res) => {

        BotController.sendDataRealtime({
            type: "set-lever",
            data: req.body,
            serverIP: req.body.serverIP
        })

        res.customResponse(200, "Setting Lever", req.body);
    },
    setLeverSymbolBotFutures: async (req, res) => {

        BotController.sendDataRealtime({
            type: "set-lever-futures",
            data: req.body,
            serverIP: req.body.serverIP
        })

        res.customResponse(200, "Setting Lever", req.body);
    },
    setMargin: async (req, res) => {
        try {

            const botData = req.body;

            const allSymbolMargin = []

            const client = BotController.getConfigRestClientByBit({
                ApiKey: botData.ApiKey,
                SecretKey: botData.SecretKey,
                Demo: botData.Demo,

            })

            await client.getCollateralInfo()
                .then((rescoin) => {
                    rescoin.result.list.forEach(coinData => {
                        const coin = coinData.currency
                        if (coinData.marginCollateral && !["USDT", "USDC"].includes(coin)) {
                            allSymbolMargin.push({
                                coin,
                                collateralSwitch: 'ON',
                            })
                        }
                    })
                })

            try {

                const resSet = await client.batchSetCollateralCoin({ request: allSymbolMargin })

                if (resSet.retCode == 0) {
                    res.customResponse(200, "Set Margin Bot Successful", allSymbolMargin);
                }
                else {
                    res.customResponse(400, resSet.retMsg, allSymbolMargin);
                }

            } catch (error) {
                console.log(error);
                throw new Error(error)
            }
        } catch (error) {
            console.log(error);
            // Xử lý lỗi nếu có
            res.status(500).json({ message: `Set Margin Bot Error: ${error.message}` });
        }
    },

    getTotalFutureSpot: async (req, res) => {
        try {

            const userID = req.params.id;

            const botListData = await BotModel.find({
                userID,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListData.map(async botData => {
                switch (botData.botType) {
                    case "ByBit_V3":
                    case "ByBit_V1":
                        {
                            return BotController.getFutureSpotByBitBE(botData)
                        }
                    case "OKX_V1":
                    case "OKX_V3":
                        {
                            return BotController.getFutureSpotOKXBE(botData)
                        }
                    case "Binance_V3":
                    case "Binance_V1": {
                        return BotController.getFutureSpotBinanceBE(botData)
                    }
                }
            }))


            res.customResponse(200, "Get Total Money Successful", resultAll.reduce((pre, cur) => {
                const value = cur.value
                return pre + (+value?.future || 0) + (+value?.spotTotal || 0)
            }, 0))

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    getTotalFutureSpotByBot: async (req, res) => {
        try {

            const { botListID } = req.body

            const botListData = await BotModel.find({
                _id: { $in: botListID }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });


            const resultAll = await Promise.allSettled(botListData.map(async botData => {
                switch (botData.botType) {
                    case "ByBit_V3":
                    case "ByBit_V1":
                        {
                            return BotController.getFutureSpotByBitBE(botData)
                        }
                    case "OKX_V1":
                    case "OKX_V3":
                        {
                            return BotController.getFutureSpotOKXBE(botData)
                        }
                    case "Binance_V3":
                    case "Binance_V1": {
                        return BotController.getFutureSpotBinanceBE(botData)
                    }
                }
            }))

            res.customResponse(200, "Get Total Money Successful", resultAll.reduce((pre, cur) => {
                const value = cur.value
                return pre + (+value?.future || 0) + (+value?.spotTotal || 0)
            }, 0))

        }

        catch (error) {
            console.log(`Get Total Money Error: ${error}`);
            res.status(500).json({ message: error.message });
        }
    },
    getTotalFutureBotByBotType: async (req, res) => {

        try {

            const userID = req.user._id

            const { botType } = req.body

            const botListId = await BotModel.find({
                userID,
                botType,
                Status: "Running",
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListId.map(async botData => {
                switch (botType) {
                    case "ByBit_V3":
                    case "ByBit_V1":
                        {
                            const client = BotController.getConfigRestClientByBit({
                                ApiKey: botData.ApiKey,
                                SecretKey: botData.SecretKey,
                                Demo: botData.Demo,

                            })

                            const getFuture = await client.getWalletBalance({
                                accountType: 'UNIFIED',
                                coin: 'USDT',
                            })
                            return {
                                future: Math.abs(getFuture?.result?.list?.[0]?.coin[0].walletBalance || 0)
                            }
                        }
                    case "OKX_V1":
                    case "OKX_V3":
                        {
                            const client = BotController.getConfigRestClientOKX({
                                apiKey: botData.ApiKey,
                                apiSecret: botData.SecretKey,
                                apiPass: botData.Password,
                            });

                            const getFuture = await client.getBalance({ ccy: "USDT" })
                            const dataMoney = getFuture[0]?.details[0]
                            return {
                                future: Math.abs(dataMoney?.availBal || 0),
                                total: Math.abs(dataMoney?.cashBal || 0),
                            }
                        }
                    case "Binance_V3":
                    case "Binance_V1": {
                        const client = BotController.getConfigRestClientBinance({
                            ApiKey: botData.ApiKey,
                            SecretKey: botData.SecretKey,
                            Demo: botData.Demo,
                        })

                        // get field totalWalletBalance
                        try {
                            const result = await client.getWalletBalances({
                                quoteAsset: "USDT",
                            })

                            return {
                                future: result.find(item => item.walletName === 'USDⓈ-M Futures')?.balance || 0
                            }
                        } catch (error) {
                            return {
                                future: 0
                            }
                        }
                    }
                }
            }))

            res.customResponse(200, "Get Total Future By BotType Successful", resultAll.reduce((pre, cur) => {
                return {
                    avai: pre.avai + cur?.value?.future || 0,
                    total: pre.total + cur?.value?.total || 0,
                }
            }, {
                avai: 0,
                total: 0
            }))

        } catch (error) {
            res.status(500).json({ message: error.message });


        }
    },







    // OTHER 
    getAllBotActiveBE: async () => {
        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find(
                {
                    Status: "Running",
                    // botType: "ByBit_V3",
                    ApiKey: { $exists: true, $ne: null },
                    SecretKey: { $exists: true, $ne: null }
                }
            ).sort({ Created: -1 }).lean()
            return data
        } catch (err) {
            console.log(err);
            return []
        }
    },
    getAllBotActiveByBotTypeBE: async (botType) => {
        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find(
                {
                    Status: "Running",
                    botType,
                    ApiKey: { $exists: true, $ne: null },
                    SecretKey: { $exists: true, $ne: null }
                }
            ).sort({ Created: -1 }).lean()
            return data
        } catch (err) {
            console.log(err);
            return []
        }
    },
    getBotDataBE: async (botID) => {
        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.findOne(({ _id: botID })).lean()
            return data
        } catch (err) {
            console.log(err);
            return {}
        }
    },

    getFutureSpotByBitBE: async (botData) => {

        try {


            const client = BotController.getConfigRestClientByBit({
                ApiKey: botData.ApiKey,
                SecretKey: botData.SecretKey,
                Demo: botData.Demo,

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


            if (result) {
                return {
                    future: result[0]?.result?.list?.[0]?.coin[0].walletBalance || 0,
                    spotTotal: result[1]?.result?.balance?.[0]?.walletBalance || 0,
                }
            }
            return {
                future: 0,
                spotTotal: 0,
            }


        } catch (error) {

            console.log(error);

            return {
                future: 0,
                spotTotal: 0,
            }

        }
    },
    getFutureSpotOKXBE: async (botData) => {

        try {

            const client = BotController.getConfigRestClientOKX({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            });

            // get field totalWalletBalance
            const result = await client.getAccountAssetValuation({ ccy: "USDT" })
            const resData2 = await client.getBalances()

            if (result) {
                return {
                    future: +result?.[0]?.details?.trading || 0,
                    spotTotal: +result?.[0]?.details?.funding || 0,
                    fundingUSDT: resData2[0]?.availBal || 0,
                }
            }
            return {
                future: 0,
                spotTotal: 0,
            }


        } catch (error) {
            console.log(error);
            return {
                future: 0,
                spotTotal: 0,
            }

        }
    },
    getFutureSpotBinanceBE: async (botData) => {

        try {

            const client = BotController.getConfigRestClientBinance({
                ApiKey: botData.ApiKey,
                SecretKey: botData.SecretKey,
                Demo: botData.Demo,

            });

            const result = await client.getWalletBalances({
                quoteAsset: "USDT",
            })
            if (result) {

                let spotFutureData = { spotTotal: '0', future: '0' };

                for (const item of result) {
                    if (item.walletName === 'Funding') {
                        spotFutureData.spotTotal = +item.balance;
                    } else if (item.walletName === 'USDⓈ-M Futures') {
                        spotFutureData.future = +item.balance;
                    }
                    // Thoát sớm nếu đã tìm đủ
                    if (spotFutureData.spotTotal !== '0' && spotFutureData.future !== '0') break;
                }
                return spotFutureData
            }
            return {
                future: 0,
                spotTotal: 0,
            }


        } catch (error) {
            console.log(error);
            return {
                future: 0,
                spotTotal: 0,
            }

        }
    },
    setLeverSymbolBotBE: async ({
        lever,
        mgnMode,
        instId,
        botData
    }) => {
        try {
            const clientOKXPrivate = BotController.getConfigRestClientOKX({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            })
            const res = await clientOKXPrivate.setLeverage({
                lever,
                mgnMode,
                instId,
            })
            if (res) {
                console.log(`[V] Set lever ( ${botData?.botName} - ${instId} - ${mgnMode} - ${lever} ) successful`);
            }
        } catch (error) {
            console.log(`[!] Set lever ( ${botData?.botName} - ${instId} - ${mgnMode} - ${lever} ) error`);
            console.log(error);
        }
    },
    setLeverSymbolBotFuturesBE: async ({
        lever,
        mgnMode,
        instId,
        botData,
        side
    }) => {

        try {
            const clientOKXPrivate = BotController.getConfigRestClientOKX({
                apiKey: botData.ApiKey,
                apiSecret: botData.SecretKey,
                apiPass: botData.Password,
            })

            switch (mgnMode) {
                case "cross":
                    {
                        await clientOKXPrivate.setLeverage({
                            lever,
                            mgnMode: "cross",
                            instId,
                        })
                        console.log(`[V] Set lever ( ${botData?.botName} - ${instId} - cross - ${lever} ) successful`);
                        break;
                    }
                case "isolated":
                    {
                        if (side == "Buy") {

                            await clientOKXPrivate.setLeverage({
                                lever,
                                mgnMode: "isolated",
                                instId,
                                posSide: "long"
                            })
                        }
                        else {
                            await clientOKXPrivate.setLeverage({
                                lever,
                                mgnMode: "isolated",
                                instId,
                                posSide: "short"
                            })
                        }

                        console.log(`[V] Set lever ( ${botData?.botName} - ${instId} - isolated - ${lever} ) successful`);
                        break;
                    }
                default:
                    {
                        const setCross = clientOKXPrivate.setLeverage({
                            lever,
                            mgnMode: "cross",
                            instId,
                        })
                        const setIsolated = clientOKXPrivate.setLeverage({
                            lever,
                            mgnMode: "isolated",
                            instId,
                            posSide: "long"
                        })
                        const setIsolated2 = clientOKXPrivate.setLeverage({
                            lever,
                            mgnMode: "isolated",
                            instId,
                            posSide: "short"
                        })
                        await Promise.allSettled([setCross, setIsolated, setIsolated2])
                        console.log(`[V] Set lever ( ${botData?.botName} - ${instId} - both - ${lever} ) successful`);
                        break;
                    }
            }

        } catch (error) {
            console.log(`[!] Set lever ( ${botData?.botName} - ${instId} - ${mgnMode} - ${lever} ) error`);
            console.log(error);
        }
    },


    getBalanceAvailable: async (botData) => {
        const client = BotController.getConfigRestClientOKX({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });

        const getFuture = await client.getBalance({ ccy: "USDT" })
        return Math.abs(getFuture[0]?.details[0]?.availBal || 0)
    }

}

module.exports = BotController 