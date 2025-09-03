const CoinOKXV1FuturesModel = require('../../../models/Coins/OKX/coinFutures.model')
const ConfigModel = require('../../../models/Configs/OKX/V1/futures.model')
const ConfigV3Model = require('../../../models/Configs/OKX/V3/config.model')
const GroupCoinModel = require('../../../models/Coins/OKX/groupCoinV3.model');
const ScannerByBitV3Model = require('../../../models/Configs/OKX/V3/scanner.model');

const { RestClient } = require('okx-api');
const client = new RestClient()


const InstrumentOKXV1Controller = {
    sendDataRealtime: ({
        type,
        data,
    }) => {
        const { socketServer } = require('../../../serverConfig');
        socketServer.to("OKX").emit(type, data)
    },
    getSymbolFromCloud: async () => {
        try {

            const list = {}
            const getTickers = client.getTickers({ instType: "SWAP" })
            const getInstruments = client.getInstruments({ instType: "SWAP" })

            const resultGetAll = await Promise.allSettled([getTickers, getInstruments])

            const symbolTicker = {}

            resultGetAll[0].value.forEach((ticker) => {
                const symbol = ticker.instId
                if (symbol.includes("USDT")) {

                    const lastPrice = ticker.last
                    const price24hPcnt = (((lastPrice - ticker.sodUtc0) / ticker.sodUtc0) * 100).toFixed(2)
                    symbolTicker[symbol] = {
                        lastPrice,
                        price24hPcnt,
                        volume24h: lastPrice * ticker.volCcy24h,
                    }
                }
            })

            resultGetAll[1].value.forEach((e) => {

                if (e.settleCcy == "USDT" && e.openType != "pre_quote") {
                    const symbol = e.instId
                    const min = e.ctVal * e.lotSz

                    list[symbol] = {
                        symbol,
                        minOrderQty: min,
                        basePrecision: min,
                        ctVal: e.ctVal,
                        tickSize: e.tickSz,
                        lever: e.lever,
                        ...symbolTicker[symbol]
                    }
                }
            })
            return Object.values(list)
        } catch (err) {
            return []
        }
    },
    getAll: async (req, res) => {
        try {
            const data = await CoinOKXV1FuturesModel.find().sort({ price24hPcnt: -1 })
            res.customResponse(200, "Get All Instrument Info Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    sync: async (req, res) => {
        try {
            const listSymbolObject = await InstrumentOKXV1Controller.getSymbolFromCloud()

            if (listSymbolObject?.length) {
                const existingDocsCoin = await CoinOKXV1FuturesModel.find();

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

                    // Kiểm tra xem coin đã tồn tại trong CoinOKXV1FuturesModel
                    if (!existingValuesCoin[symbol]) {
                        newSymbolList.push({
                            label: symbol,
                            value: symbol,
                            volume24h,
                            children: [],
                        });
                        const dataNew = {
                            insertOne: {
                                document: {
                                    label: symbol,
                                    value: symbol,
                                    volume24h,
                                    children: []
                                }
                            }
                        }
                        bulkOperationsStrategies.push(dataNew)
                    }
                    else {
                        delete existingValuesCoin[symbol]
                        const dataUpdate = {
                            updateOne: {
                                filter: { label: symbol },
                                update: {
                                    $set: {
                                        volume24h,
                                    }
                                },
                            }
                        }
                        bulkOperationsStrategiesUpdate.push(dataUpdate)
                    }
                    bulkOperationsCoin.push({
                        updateOne: {
                            filter: { symbol },
                            update: {
                                $set: value
                            },
                            upsert: true
                        }
                    })
                });

                const deleteList = Object.values(existingValuesCoin)

                // Thực hiện các thao tác bulk cho CoinOKXV1FuturesModel và ConfigV3Model
                const insertVol24 = CoinOKXV1FuturesModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinOKXV1FuturesModel.deleteMany({ symbol: { $in: deleteList } });
                const insertStrategies = ConfigModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = ConfigModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = ConfigModel.deleteMany({ value: { $in: deleteList } });
                const insertStrategiesV3 = ConfigV3Model.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateV3 = ConfigV3Model.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesV3 = ConfigV3Model.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    bulkOperationsDeletedCoin,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedStrategies,
                    insertStrategiesV3,
                    insertStrategiesUpdateV3,
                    bulkOperationsDeletedStrategiesV3,
                ]);

                if (newSymbolList.length > 0) {

                    const data = {
                        list: listSymbolObject,
                        new: newSymbolList,
                        deleted: deleteList
                    }
                    // InstrumentOKXV1Controller.sendDataRealtime({
                    //     type: "sync-symbol",
                    //     data,
                    // });

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

    getAllCoinFuturesBE: async () => {
        try {
            const data = await CoinOKXV1FuturesModel.find().sort({ price24hPcnt: -1 })
            return data
        } catch (err) {
            return []
        }
    },

    syncVol24hBE: async () => {
        try {

            const listSymbolObject = await InstrumentOKXV1Controller.getSymbolFromCloud();

            return listSymbolObject

        } catch (err) {
            console.log(err);

            return []
        }
    },
    syncCoinBE: async (allbotOfServer = []) => {
        try {


            const listSymbolObject = await InstrumentOKXV1Controller.getSymbolFromCloud();

            if (listSymbolObject?.length) {
                const existingDocsCoin = await CoinOKXV1FuturesModel.find();

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

                    // Kiểm tra xem coin đã tồn tại trong CoinOKXV1FuturesModel
                    if (!existingValuesCoin[symbol]) {
                        newSymbolList.push({
                            label: symbol,
                            value: symbol,
                            volume24h,
                            children: [],
                        });
                        const dataNew = {
                            insertOne: {
                                document: {
                                    label: symbol,
                                    value: symbol,
                                    volume24h,
                                    children: []
                                }
                            }
                        }
                        bulkOperationsStrategies.push(dataNew)
                    }
                    else {
                        delete existingValuesCoin[symbol]
                        const dataUpdate = {
                            updateOne: {
                                filter: { label: symbol },
                                update: {
                                    $set: {
                                        volume24h,
                                    }
                                },
                            }
                        }
                        bulkOperationsStrategiesUpdate.push(dataUpdate)
                    }
                    bulkOperationsCoin.push({
                        updateOne: {
                            filter: { symbol },
                            update: {
                                $set: value
                            },
                            upsert: true
                        }
                    })
                });

                const deleteList = Object.values(existingValuesCoin)

                // Thực hiện các thao tác bulk cho CoinOKXV1FuturesModel và ConfigV3Model
                const insertVol24 = CoinOKXV1FuturesModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinOKXV1FuturesModel.deleteMany({ symbol: { $in: deleteList } });
                const insertStrategies = ConfigModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = ConfigModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = ConfigModel.deleteMany({ value: { $in: deleteList } });
                const insertStrategiesV3 = ConfigV3Model.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdateV3 = ConfigV3Model.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategiesV3 = ConfigV3Model.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    bulkOperationsDeletedCoin,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedStrategies,
                    insertStrategiesV3,
                    insertStrategiesUpdateV3,
                    bulkOperationsDeletedStrategiesV3,
                ]);

                const newListSorted = await CoinOKXV1FuturesModel.find().sort({ price24hPcnt: -1 });
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

                const resultFilterSpot = await ConfigV3Model.aggregate([
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

                const resultGetSpot = await ConfigV3Model.populate(resultFilterSpot, {
                    path: 'children.botID',
                }) || []


                const handleResultDelete = resultGetSpot.flatMap((data) => data.children.map(child => {
                    child.symbol = data.value
                    child.value = `${data._id}-${child._id}`
                    return child
                })) || []


                await ConfigV3Model.updateMany(
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
    }
}
module.exports = InstrumentOKXV1Controller 