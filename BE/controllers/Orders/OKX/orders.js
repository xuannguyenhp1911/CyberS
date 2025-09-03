const { RestClient } = require('okx-api');


const PositionController = {


    getAllOrder: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        return client.getOrderList().then(dataAllOrder => {

                            dataAllOrder.forEach(dataOrder => {
                                newData.push({
                                    ordId: dataOrder.ordId,
                                    botData: dataBotItem,
                                    symbol: dataOrder.instId,
                                    market: dataOrder.instType,
                                    side: dataOrder.side,
                                    cTime: dataOrder.uTime,
                                    state: dataOrder.state,
                                    reduceOnly: dataOrder.reduceOnly == "true" ? true : false,
                                    priceOrder: dataOrder.px
                                })
                            })
                        })
                            .catch(error => {
                                console.log("getAllOrderOKXV1 Error", error);
                                return [];
                            });
                    }
                }));

                res.customResponse(200, "Get All Order Successful", newData);
            }
            else {
                res.customResponse(200, "Get All Order Successful", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    cancelOrder: async (req, res) => {

        const { positionData } = req.body

        const botData = positionData.botData

        const client = new RestClient({
            apiKey: botData.ApiKey,
            apiSecret: botData.SecretKey,
            apiPass: botData.Password,
        });

        client
            .cancelOrder({
                instId: positionData.symbol,
                ordId: positionData.ordId,
            })
            .then((res2) => {
                const response = res2[0]
                if (response) {
                    res.customResponse(200, "Cancel Order Successful");
                }
                else {
                    res.customResponse(400, "Cancel Order Failed");
                }
            })
            .catch((error) => {
                console.log(error);
                res.customResponse(500, error.msg);
            });

    },
    cancelOrderAll: async (req, res) => {

        const { positionData } = req.body

        try {
            await Promise.allSettled(positionData.map(positionDataItem => {
                const botData = positionDataItem.botData

                const client = new RestClient({
                    apiKey: botData.ApiKey,
                    apiSecret: botData.SecretKey,
                    apiPass: botData.Password,
                });

                client
                    .cancelOrder({
                        instId: positionDataItem.symbol,
                        ordId: positionDataItem.ordId,
                    })
            }))
            res.customResponse(200, "Cancel Order Successful");

        } catch (error) {
            console.log(error);
            res.customResponse(500, error.msg);
        }

    },

    getAllOrderOKXBEProtect: async (botListID) => {
        try {

            if (botListID.length > 0) {
                const listViTheByBotData = {}

                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });
                        let viTheHaveData = []

                        return client.getOrderList().then(dataAllOrder => {

                            dataAllOrder.forEach(dataOrder => {
                                viTheHaveData.push({
                                    ordId: dataOrder.ordId,
                                    instId: dataOrder.instId,
                                    market: dataOrder.instType,
                                    side: dataOrder.side,
                                    priceOrder: dataOrder.px
                                })
                            })
                            if (viTheHaveData.length > 0) {
                                listViTheByBotData[dataBotItem.id] = {
                                    botData: dataBotItem,
                                    viTheList: viTheHaveData
                                }
                            }
                        })
                            .catch(error => {
                                console.log("getAllOrderOKXV1 Error", error);
                                return {}
                            });
                    }
                }));

                return listViTheByBotData
            }
            else {
                return {}
            }

        } catch (err) {
            return {}
        }
    },
    cancelOrderAllBE: async (botListID) => {

        try {

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = new RestClient({
                            apiKey: dataBotItem.ApiKey,
                            apiSecret: dataBotItem.SecretKey,
                            apiPass: dataBotItem.Password,
                        });

                        return client.getOrderList().then(dataAllOrder => {

                            dataAllOrder.forEach(dataOrder => {
                                newData.push({
                                    ordId: dataOrder.ordId,
                                    botData: dataBotItem,
                                    symbol: dataOrder.instId,
                                })
                            })
                        })
                            .catch(error => {
                                console.log("getAllOrderOKXV1 Error", error);
                                return [];
                            });
                    }
                }));

                if (newData?.length > 0) {

                    await Promise.allSettled(newData.map(positionDataItem => {
                        const botData = positionDataItem.botData

                        const client = new RestClient({
                            apiKey: botData.ApiKey,
                            apiSecret: botData.SecretKey,
                            apiPass: botData.Password,
                        });

                        client
                            .cancelOrder({
                                instId: positionDataItem.symbol,
                                ordId: positionDataItem.ordId,
                            })
                    }))
                    console.log(`[V] Cancel All Order Success: ${newData.length}`,);

                }
            }


        } catch (err) {
            console.log(`[!] Cancel All Order Error:`, err);

        }


    },

}

module.exports = PositionController 