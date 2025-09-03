const CoinOKXV1Model = require('../../../models/Coins/OKX/coin.model')
const SpotModel = require('../../../models/Configs/OKX/V1/spot.model')
const MarginModel = require('../../../models/Configs/OKX/V1/margin.model')
const { RestClient } = require('okx-api');
const client = new RestClient()


const InstrumentOKXV1Controller = {
    sendDataRealtime: ({
        type,
        data,
    }) => {
        const { socketServer } = require('../../../serverConfig');
        socketServer.to("OKX_V1").emit(type, data)
    },
    getSymbolFromCloud: async () => {
        try {

            const list = {}
            const getSpot = client.getInstruments({ instType: "SPOT" })
            const getMargin = client.getInstruments({ instType: "MARGIN" })

            const resultGetAll = await Promise.allSettled([getSpot, getMargin])
            const getTickers = await client.getTickers({ instType: "SPOT" })

            const symbolTicker = {}


            getTickers.forEach((ticker) => {
                const symbol = ticker.instId
                if (symbol.includes("USDT")) {
                    const lastPrice = ticker.last
                    const price24hPcnt = (((lastPrice - ticker.sodUtc0) / ticker.sodUtc0) * 100).toFixed(2)
                    symbolTicker[symbol] = {
                        lastPrice,
                        price24hPcnt,
                        volume24h: ticker.volCcy24h,
                    }
                }
            })

            resultGetAll.forEach((symbolListData) => {


                symbolListData.value?.forEach(e => {
                    if (e.quoteCcy == "USDT" && e.openType != "pre_quote") {
                        const market = e.instType == "MARGIN" ? "Margin" : "Spot"
                        const symbol = e.instId
                        const symbolID = `${symbol}-${market}`

                        if (!list[symbolID]) {
                            list[symbolID] = {
                                symbol,
                                market,
                                minOrderQty: e.minSz,
                                basePrecision: e.lotSz,
                                tickSize: e.tickSz,
                                lever: e.lever,
                                ...symbolTicker[symbol]
                            }
                        }
                        else {
                            market === "Margin" && (list[symbolID].market = market);
                        }
                    }
                })
            })
            return Object.values(list)
        } catch (err) {
            return []
        }
    },
    getAll: async (req, res) => {
        try {
            const data = await CoinOKXV1Model.find().sort({ price24hPcnt: -1 })
            res.customResponse(200, "Get All Instrument Info Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    sync: async (req, res) => {
        try {
            const listSymbolObject = await InstrumentOKXV1Controller.getSymbolFromCloud()

            if (listSymbolObject?.length) {
                const existingDocsCoin = await CoinOKXV1Model.find();

                const existingValuesCoin = existingDocsCoin.reduce((pre, cur) => {
                    const symbol = cur.symbol
                    const symbolID = `${symbol}-${cur.market}`
                    pre[symbolID] = symbol;
                    return pre;
                }, {});

                const newSymbolList = [];

                const bulkOperationsCoin = []
                const bulkOperationsStrategies = []
                const bulkOperationsStrategiesUpdate = []
                const bulkOperationsStrategiesMargin = []
                const bulkOperationsStrategiesUpdateMargin = []

                // Lọc các coin mới và xây dựng danh sách mới
                listSymbolObject.forEach((value) => {

                    const symbolID = `${value.symbol}-${value.market}`
                    const symbol = value.symbol;
                    const volume24h = value.volume24h;
                    const market = value.market;

                    // Kiểm tra xem coin đã tồn tại trong CoinOKXV1Model
                    if (!existingValuesCoin[symbolID]) {
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
                        market == "Spot" ? bulkOperationsStrategies.push(dataNew) : bulkOperationsStrategiesMargin.push(dataNew)
                    }
                    else {
                        delete existingValuesCoin[symbolID]
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
                        market == "Spot" ? bulkOperationsStrategiesUpdate.push(dataUpdate) : bulkOperationsStrategiesUpdateMargin.push(dataUpdate)
                    }
                    bulkOperationsCoin.push({
                        updateOne: {
                            filter: { symbol, market },
                            update: {
                                $set: value
                            },
                            upsert: true
                        }
                    })
                });

                const deleteList = Object.values(existingValuesCoin)

                // Thực hiện các thao tác bulk cho CoinOKXV1Model và StrategiesModel
                const insertVol24 = CoinOKXV1Model.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = CoinOKXV1Model.deleteMany({ symbol: { $in: deleteList } });
                const insertStrategies = SpotModel.bulkWrite(bulkOperationsStrategies, { ordered: false });
                const insertStrategiesUpdate = SpotModel.bulkWrite(bulkOperationsStrategiesUpdate);
                const bulkOperationsDeletedStrategies = SpotModel.deleteMany({ value: { $in: deleteList } });
                const insertStrategiesMargin = MarginModel.bulkWrite(bulkOperationsStrategiesMargin, { ordered: false });
                const insertStrategiesUpdateMargin = MarginModel.bulkWrite(bulkOperationsStrategiesUpdateMargin);
                const bulkOperationsDeletedStrategiesMargin = MarginModel.deleteMany({ value: { $in: deleteList } });

                await Promise.allSettled([
                    insertVol24,
                    bulkOperationsDeletedCoin,
                    insertStrategies,
                    insertStrategiesUpdate,
                    bulkOperationsDeletedStrategies,
                    insertStrategiesMargin,
                    insertStrategiesUpdateMargin,
                    bulkOperationsDeletedStrategiesMargin,
                ]);

                if (newSymbolList.length > 0) {

                    const data = {
                        new: newSymbolList,
                        deleted: deleteList
                    }
                    InstrumentOKXV1Controller.sendDataRealtime({
                        type: "sync-symbol",
                        data,
                    });

                    res.customResponse(200, "Have New Sync Successful", data);
                } else {
                    res.customResponse(200, "Sync Successful", {
                        new: listSymbolObject,
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
            const data = await CoinOKXV1Model.find().sort({ price24hPcnt: -1 })
            return data
        } catch (err) {
            return []
        }
    },

}
module.exports = InstrumentOKXV1Controller 