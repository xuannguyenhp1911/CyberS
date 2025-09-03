const ConfigModel = require('../../../models/Configs/ByBit/V1/futures.model')
const { RestClientV5 } = require('bybit-api');
const CoinModel = require('../../../models/Coins/ByBit/coinFutures.model');
const StrategiesModel = require('../../../models/Configs/ByBit/V3/config.model');
const WaveModel = require('../../../models/Configs/ByBit/V3/wave.model');
const GroupCoinModel = require('../../../models/Coins/ByBit/groupCoinV3.model');
const ScannerByBitV3Model = require('../../../models/Configs/ByBit/V3/scanner.model');


const CoinController = {

    sendDataRealtime: ({
        type,
        data,
        serverIP
    }) => {
        const { socketServer } = require('../../../serverConfig');
        socketServer.to(serverIP).emit(type, data)
    },

    getSymbolFromCloud: async () => {
        try {

            let ListCoin1m = []

            let CoinInfo = new RestClientV5({
                testnet: false,
                recv_window: 100000
            });

            let data = []
            let deliveryTime = {}


            await CoinInfo.getInstrumentsInfo({ category: 'linear' })
                .then((rescoin) => {
                    rescoin.result.list.forEach((e) => {
                        if (e.symbol.split("USDT")[1] === "") {
                            if (e.deliveryTime > 0) {
                                deliveryTime[e.symbol] = +e.deliveryTime
                            }
                        }
                    })
                })

            await CoinInfo.getTickers({ category: 'linear' })
                .then((rescoin) => {
                    rescoin.result.list.forEach((e) => {
                        if (e.symbol.split("USDT")[1] === "" && e.curPreListingPhase != "NotStarted") {
                            const symbol = e.symbol
                            data.push({
                                symbol,
                                lastPrice: e.lastPrice,
                                price24hPcnt: e.price24hPcnt,
                                volume24h: e.turnover24h,
                                deliveryTime: deliveryTime[symbol],
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
                // Lấy danh sách các coin hiện có từ CoinModel và StrategiesModel
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

                // Thực hiện các thao tác bulk cho CoinModel và StrategiesModel
                const insertVol24 = CoinModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinModel.deleteMany({ symbol: { $in: deleteList } });

                const insertStrategies = StrategiesModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = StrategiesModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = StrategiesModel.deleteMany({ value: { $in: deleteList } });

                const insertStrategiesWave = WaveModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateWave = WaveModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesWave = WaveModel.deleteMany({ value: { $in: deleteList } });

                const insertStrategiesV1 = ConfigModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateV1 = ConfigModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesV1 = ConfigModel.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedCoin,
                    bulkOperationsDeletedStrategies,
                    insertStrategiesV1,
                    insertStrategiesUpdateV1,
                    bulkOperationsDeletedStrategiesV1,
                    insertStrategiesWave,
                    insertStrategiesUpdateWave,
                    bulkOperationsDeletedStrategiesWave,
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
                // Lấy danh sách các coin hiện có từ CoinModel và StrategiesModel
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

                // Thực hiện các thao tác bulk cho CoinModel và StrategiesModel
                const insertVol24 = CoinModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinModel.deleteMany({ symbol: { $in: deleteList } });

                const insertStrategies = StrategiesModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = StrategiesModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = StrategiesModel.deleteMany({ value: { $in: deleteList } });


                const insertStrategiesWave = WaveModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateWave = WaveModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesWave = WaveModel.deleteMany({ value: { $in: deleteList } });

                const insertStrategiesV1 = ConfigModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateV1 = ConfigModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesV1 = ConfigModel.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedCoin,
                    bulkOperationsDeletedStrategies,
                    insertStrategiesV1,
                    insertStrategiesUpdateV1,
                    bulkOperationsDeletedStrategiesV1,
                    insertStrategiesWave,
                    insertStrategiesUpdateWave,
                    bulkOperationsDeletedStrategiesWave,
                ]);


                const newListSorted = await CoinModel.find().sort({ price24hPcnt: -1 });
                const getAllGroupCoinWithAuto = await GroupCoinModel.find({ auto: true });
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
                    }

                    return {
                        updateOne: {
                            filter: { _id: GroupCoinID },
                            update: { $set: { symbolList: selectedCoins } }
                        }
                    };
                });

                await GroupCoinModel.bulkWrite(updates);
                const allScannerCondition = await ScannerByBitV3Model.find({
                    $or: [
                        { groupCoinOnlyPairsID: { $in: allGroupCoinOnlyPairsWithAutoID } },
                        { groupCoinBlacklistID: { $in: allGroupCoinBlacklistWithAutoID } },
                    ],
                    botID: { $in: allbotOfServer },
                    IsActive: true
                }).lean().populate(['botID', "groupCoinOnlyPairsID", 'groupCoinBlacklistID']);

                const listIDScanner = allScannerCondition.map(item => item._id)

                const resultFilterSpot = await StrategiesModel.aggregate([
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

                const resultGetSpot = await StrategiesModel.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []


                await StrategiesModel.updateMany(
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
                strategiesConfigDeleted: [],
            }
        }
    },

}
module.exports = CoinController 