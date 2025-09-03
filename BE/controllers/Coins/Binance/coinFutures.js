const { USDMClient } = require('binance');
const CoinModel = require('../../../models/Coins/Binance/coinFutures.model');
const GroupCoinModel = require('../../../models/Coins/Binance/groupCoin.model');
const ServerModel = require('../../../models/servers.model');
const StrategiesModel = require('../../../models/Configs/Binance/V3/config.model');
const StrategiesOldModel = require('../../../models/Configs/Binance/V3/configOld.model');
const { getSymbolFromCloud: getSymbolFromCloudByBit } = require('../ByBit/coinFutures');
const { getSymbolFromCloud: getSymbolFromCloudOKX } = require('../OKX/coinFutures');
const ScannerBinanceV3Model = require('../../../models/Configs/Binance/V3/scanner.model');


const CoinController = {

    sendDataRealtime: ({
        type,
        data,
        serverIP
    }) => {
        const { socketServer } = require('../../../serverConfig');
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


            dataToSend?.length > 0 && CoinController.sendDataRealtime({
                type,
                serverIP,
                data: dataToSend
            });
        }))
    },

    getSymbolFromCloud: async () => {
        try {
            let CoinInfo = new USDMClient({
                recv_window: 10000,
            });
            CoinInfo.setTimeOffset(-3000)

            let data = []
            const deliveryDateObject = {}
            await CoinInfo.getExchangeInfo().then(response => {
                response.symbols.forEach(item => {
                    const deliveryDate = item.deliveryDate
                    if (item.onboardDate <= Date.now() && deliveryDate >= Date.now()) {
                        const checkYeah = new Date(deliveryDate).getFullYear() <= new Date().getFullYear()
                        deliveryDateObject[item.symbol] = {
                            expire: checkYeah ? deliveryDate : null,
                            check: true
                        }
                    }
                })
            })

            await CoinInfo.get24hrChangeStatistics()
                .then((rescoin) => {
                    rescoin.forEach((e) => {
                        const symbol = e.symbol
                        const deliveryTime = deliveryDateObject[symbol]
                        if (symbol.split("USDT")?.[1] == "" && deliveryTime) {
                            data.push({
                                symbol,
                                lastPrice: e.lastPrice,
                                price24hPcnt: e.priceChangePercent,
                                volume24h: e.quoteVolume,
                                deliveryTime: deliveryTime.expire
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
    getAllCoin: async (req, res) => {
        try {
            const data = await CoinModel.find().sort({ price24hPcnt: -1 })

            res.customResponse(200, "Get All Coin Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllCoinDelist: async (req, res) => {
        try {
            const data = await CoinModel.find({
                deliveryTime: { $exists: true, $ne: null },
            })

            res.customResponse(200, "Get All Coin Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    syncCoin: async (req, res) => {
        try {

            const listSymbolObject = await CoinController.getSymbolFromCloud();

            if (listSymbolObject?.length) {
                const existingDocsCoin = await CoinModel.find();

                // Tạo một đối tượng để kiểm tra các coin đã tồn tại
                const existingValuesCoin = existingDocsCoin.reduce((pre, cur) => {
                    const symbol = cur.symbol
                    pre[symbol] = symbol;
                    return pre;
                }, {});

                const newSymbolList = [];

                const bulkOperationsCoin = []
                const bulkOperationsStrategies = []
                const bulkOperationsStrategiesUpdate = []

                // Lọc các coin mới và xây dựng danh sách mới
                listSymbolObject.forEach((value) => {
                    const symbol = value.symbol;
                    const volume24h = value.volume24h;

                    // Kiểm tra xem coin đã tồn tại trong CoinModel
                    if (!existingValuesCoin[symbol]) {
                        newSymbolList.push({
                            label: symbol,
                            value: symbol,
                            volume24h,
                            children: [],
                        });
                        bulkOperationsStrategies.push({
                            insertOne: {
                                document: {
                                    label: symbol,
                                    value: symbol,
                                    volume24h,
                                    children: []
                                }
                            }
                        })
                    }
                    else {
                        delete existingValuesCoin[symbol]
                        bulkOperationsStrategiesUpdate.push({
                            updateOne: {
                                filter: { label: symbol },
                                update: {
                                    $set: {
                                        volume24h,
                                    }
                                },
                            }
                        })
                    }
                    bulkOperationsCoin.push({
                        updateOne: {
                            filter: { symbol },
                            update: {
                                $set: {
                                    ...value
                                }
                            },
                            upsert: true
                        }
                    })
                });

                const deleteList = Object.values(existingValuesCoin)

                const insertVol24 = CoinModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinModel.deleteMany({ symbol: { $in: deleteList } });

                const insertStrategies = StrategiesOldModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = StrategiesOldModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = StrategiesOldModel.deleteMany({ value: { $in: deleteList } });


                await Promise.allSettled([
                    insertVol24,
                    bulkOperationsDeletedCoin,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedStrategies,
                ]);

                if (newSymbolList.length > 0) {

                    const data = {
                        new: newSymbolList,
                        list: listSymbolObject,
                        deleted: deleteList
                    }

                    res.customResponse(200, "Have New Sync Successful", data);
                } else {
                    res.customResponse(200, "Sync Successful", {
                        list: listSymbolObject,
                        deleted: deleteList
                    });
                }
            } else {
                res.customResponse(400, "Sync Failed", []);
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllCoinBE: async () => {
        try {
            const data = await CoinModel.find().sort({ price24hPcnt: -1 }).lean()
            return data

        } catch (err) {
            return []
        }
    },
    syncVol24hBE: async () => {
        try {

            const listSymbolObject = await CoinController.getSymbolFromCloud();

            return listSymbolObject

        } catch (err) {
            console.log(err);

            return []
        }
    },
    syncCoinBE: async (allbotOfServer = []) => {
        try {

            const listSymbolObject = await CoinController.getSymbolFromCloud();

            if (listSymbolObject?.length) {
                const existingDocsCoin = await CoinModel.find();

                // Tạo một đối tượng để kiểm tra các coin đã tồn tại
                const existingValuesCoin = existingDocsCoin.reduce((pre, cur) => {
                    const symbol = cur.symbol
                    pre[symbol] = symbol;
                    return pre;
                }, {});

                const newSymbolList = [];

                const bulkOperationsCoin = []
                const bulkOperationsStrategies = []
                const bulkOperationsStrategiesUpdate = []

                // Lọc các coin mới và xây dựng danh sách mới
                listSymbolObject.forEach((value) => {
                    const symbol = value.symbol;
                    const volume24h = value.volume24h;

                    // Kiểm tra xem coin đã tồn tại trong CoinModel
                    if (!existingValuesCoin[symbol]) {
                        newSymbolList.push({
                            label: symbol,
                            value: symbol,
                            volume24h,
                            children: [],
                        });
                        bulkOperationsStrategies.push({
                            insertOne: {
                                document: {
                                    label: symbol,
                                    value: symbol,
                                    volume24h,
                                    children: []
                                }
                            }
                        })
                    }
                    else {
                        delete existingValuesCoin[symbol]
                        bulkOperationsStrategiesUpdate.push({
                            updateOne: {
                                filter: { label: symbol },
                                update: {
                                    $set: {
                                        volume24h,
                                    }
                                },
                            }
                        })
                    }
                    bulkOperationsCoin.push({
                        updateOne: {
                            filter: { symbol },
                            update: {
                                $set: {
                                    ...value
                                }
                            },
                            upsert: true
                        }
                    })
                });

                const deleteList = Object.values(existingValuesCoin)

                const insertVol24 = CoinModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinModel.deleteMany({ symbol: { $in: deleteList } });

                const insertStrategies = StrategiesOldModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = StrategiesOldModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = StrategiesOldModel.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedCoin,
                    bulkOperationsDeletedStrategies,
                ]);


                const newListSorted = await CoinModel.find().sort({ price24hPcnt: -1 });
                const getAllGroupCoinWithAuto = await GroupCoinModel.find({ auto: true });
                let listCoinBinance = listSymbolObject.map(item => item.symbol?.split("USDT")[0])
                let listCoinOKX = []
                let listCoinByBit = []
                if (getAllGroupCoinWithAuto.some(item => item.selectedMode == "Auto-Platform")) {

                    const getByBit = getSymbolFromCloudByBit()

                    const getOKX = getSymbolFromCloudOKX()

                    const resALL = await Promise.allSettled([getByBit, getOKX])

                    listCoinByBit = (resALL[0].value || []).map(item => item.symbol?.split("USDT")[0])
                    listCoinOKX = (resALL[1].value || []).map(item => item.symbol?.split("-USDT")[0])

                }
                const allGroupCoinOnlyPairsWithAutoID = []
                const allGroupCoinBlacklistWithAutoID = []

                const updates = getAllGroupCoinWithAuto.map(groupCoin => {
                    const GroupCoinID = groupCoin._id
                    groupCoin.forType == "OnlyPairs" ? allGroupCoinOnlyPairsWithAutoID.push(GroupCoinID) : allGroupCoinBlacklistWithAutoID.push(GroupCoinID)
                    const selectedMode = groupCoin.selectedMode;
                    const sizeAuto = groupCoin.size;
                    let selectedCoins = [];

                    switch (selectedMode) {
                        case "Auto": {
                            const head = newListSorted.slice(0, sizeAuto).map(item => item.symbol);
                            const tail = newListSorted.slice(-sizeAuto).map(item => item.symbol);
                            selectedCoins = head.concat(tail);
                            break;
                        }
                        case "Auto-Up": {
                            selectedCoins = newListSorted.slice(0, sizeAuto).map(item => item.symbol)
                            break;
                        }
                        case "Auto-Down": {
                            selectedCoins = newListSorted.slice(-sizeAuto).map(item => item.symbol);
                            break;
                        }
                        case "Auto-Platform": {
                            const list = groupCoin?.Platform || []

                            try {
                                for (const platform of list) {
                                    switch (platform) {
                                        case "ByBit": {
                                            listCoinBinance = listCoinByBit.filter(item => listCoinBinance.includes(item))
                                            break
                                        }
                                        case "OKX": {
                                            listCoinBinance = listCoinOKX.filter(item => listCoinBinance.includes(item))
                                            break
                                        }
                                    }
                                }
                            } catch (error) {

                            }
                            selectedCoins = listCoinBinance.map(item => `${item}USDT`)
                            break
                        }
                    }

                    return {
                        updateOne: {
                            filter: { _id: GroupCoinID },
                            update: { $set: { symbolList: selectedCoins } }
                        }
                    };
                })

                await GroupCoinModel.bulkWrite(updates)
                const allScannerCondition = await StrategiesModel.find({
                    $or: [
                        { groupCoinOnlyPairsID: { $in: allGroupCoinOnlyPairsWithAutoID } },
                        { groupCoinBlacklistID: { $in: allGroupCoinBlacklistWithAutoID } },
                    ],
                    botID: { $in: allbotOfServer },
                    IsActive: true
                }).lean().populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']);
                const allScannerConditionOld = await ScannerBinanceV3Model.find({
                    $or: [
                        { groupCoinOnlyPairsID: { $in: allGroupCoinOnlyPairsWithAutoID } },
                        { groupCoinBlacklistID: { $in: allGroupCoinBlacklistWithAutoID } },
                    ],
                    botID: { $in: allbotOfServer },
                    IsActive: true
                }).lean().populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']);

                const listIDScanner = allScannerConditionOld.map(item => item._id)

                const resultFilterSpot = await StrategiesOldModel.aggregate([
                    {
                        $match: {
                            "children.scannerID": { $in: listIDScanner }
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
                                        $in: ["$$child.scannerID", listIDScanner]
                                    }
                                }
                            }
                        }
                    }
                ]);

                const resultGetSpot = await StrategiesOldModel.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []


                await StrategiesOldModel.updateMany(
                    { "children.scannerID": { $in: listIDScanner } },
                    {
                        $pull: {
                            children: {
                                scannerID: { $in: listIDScanner }
                            }
                        }
                    }
                );

                return {
                    newListSorted,
                    dataSync: {
                        new: newSymbolList,
                        deleted: deleteList
                    },
                    allScannerCondition,
                    allScannerConditionOld,
                    strategiesConfigDeleted: handleResultDelete
                }
            } else {
                return {
                    newListSorted: [],
                    dataSync: {
                        new: [],
                        deleted: []
                    },
                    allScannerCondition: [],
                    allScannerConditionOld: [],
                    strategiesConfigDeleted: [],
                }
            }

        } catch (err) {
            console.log(err);

            return {
                newListSorted: [],
                dataSync: {
                    new: [],
                    deleted: []
                },
                allScannerCondition: [],
                allScannerConditionOld: [],
                strategiesConfigDeleted: [],
            }
        }
    },

}
module.exports = CoinController 