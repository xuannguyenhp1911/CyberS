const { RestClientV5 } = require('bybit-api');
const InstrumentsInfoModel = require('../../../models/Coins/ByBit/coin.model')
const SpotModel = require('../../../models/Configs/ByBit/V1/spot.model')
const MarginModel = require('../../../models/Configs/ByBit/V1/margin.model')
const InstrumentsInfoController = {

    sendDataRealtime: ({
        type,
        data,
    }) => {
        const { socketServer } = require('../../../serverConfig');
        socketServer.to("ByBit_V1").emit(type, data)
    },
    getSymbolFromCloud: async (userID) => {
        try {
            const clientDigit = new RestClientV5({
                testnet: false,
                recvWindow: 100000,
            });


            const list = []
            const symbolTicker = {}

            const resGetVol = await clientDigit.getTickers({ category: "spot" })
            resGetVol.result.list?.forEach((e) => {

                symbolTicker[e.symbol] = {
                    lastPrice: e.lastPrice,
                    price24hPcnt: e.price24hPcnt * 100,
                    volume24h: e.turnover24h,
                }
            })


            const responseDigit = await clientDigit.getInstrumentsInfo({
                category: 'spot',
            })

            responseDigit.result.list?.forEach((e) => {
                const symbol = e.symbol
                if (symbol.split("USDT")[1] === "") {
                    list.push({
                        symbol,
                        market: e.marginTrading != "none" ? "Margin" : "Spot",
                        minOrderQty: e.lotSizeFilter.minOrderQty,
                        basePrecision: e.lotSizeFilter.basePrecision,
                        tickSize: e.priceFilter.tickSize,
                        ...symbolTicker[symbol]
                    })
                }
            })
            return list

        } catch (err) {
            return []
        }
    },
    getAll: async (req, res) => {
        try {
            const data = await InstrumentsInfoModel.find().sort({ price24hPcnt: -1 })

            res.customResponse(200, "Get All InstrumentsInfo Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    sync: async (req, res) => {
        try {

            const listSymbolObject = await InstrumentsInfoController.getSymbolFromCloud();

            if (listSymbolObject?.length) {
                // Lấy danh sách các coin hiện có từ InstrumentsInfoModel và StrategiesModel
                const existingDocsCoin = await InstrumentsInfoModel.find();

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
                const bulkOperationsStrategiesMargin = []
                const bulkOperationsStrategiesUpdateMargin = []

                
                // Lọc các coin mới và xây dựng danh sách mới
                listSymbolObject.forEach((value) => {
                    const symbol = value.symbol;
                    const volume24h = value.volume24h;
                    const market = value.market;

                    // Kiểm tra xem coin đã tồn tại trong InstrumentsInfoModel
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
                        market == "Margin" && bulkOperationsStrategiesMargin.push(dataNew);
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
                        market == "Margin" && bulkOperationsStrategiesUpdateMargin.push(dataUpdate);
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

                // Thực hiện các thao tác bulk cho InstrumentsInfoModel và StrategiesModel
                const insertVol24 = InstrumentsInfoModel.bulkWrite(bulkOperationsCoin);
                const bulkOperationsDeletedCoin = InstrumentsInfoModel.deleteMany({ symbol: { $in: deleteList } });
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
                    InstrumentsInfoController.sendDataRealtime({
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
            const data = await InstrumentsInfoModel.find().sort({ price24hPcnt: -1 })
            return data
        } catch (err) {
            return []
        }
    },
}
module.exports = InstrumentsInfoController 