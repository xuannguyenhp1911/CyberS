const { RestClientV5 } = require('bybit-api');


const PositionController = {

      // OTHER 
      getRestClientV5Config: ({
        ApiKey,
        SecretKey,
        Demo
    }) => {
        return new RestClientV5({
            testnet: !Demo ? false : true,
            demoTrading: !Demo ? false : true,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,
            recvWindow: 100000,
        })
    },
    getAllOrder: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = PositionController.getRestClientV5Config({
                            ApiKey: dataBotItem.ApiKey,
                            SecretKey: dataBotItem.SecretKey,
                            Demo: dataBotItem.Demo,
                        });

                        const getLinear = client.getActiveOrders({
                            category: "linear",
                            settleCoin: "USDT"
                        })
                        const getSpot = client.getActiveOrders({
                            category: "spot",
                            settleCoin: "USDT"
                        })
                        return Promise.allSettled([getLinear, getSpot]).then(resAll => {
                            resAll.forEach((resData, index) => {
                                resData.value?.result?.list?.forEach(dataOrder => {
                                    newData.push({
                                        category: index == 0 ? "linear" : "spot",
                                        id: dataOrder.orderId,
                                        orderId: dataOrder.orderId,
                                        botData: dataBotItem,
                                        symbol: dataOrder.symbol,
                                        market: dataOrder.isLeverage,
                                        side: dataOrder.side,
                                        cTime: dataOrder.updatedTime,
                                        state: dataOrder.orderStatus,
                                        reduceOnly: dataOrder.reduceOnly,
                                        priceOrder: dataOrder.price
                                    })
                                })
                            })

                        })
                            .catch(error => {
                                console.log("getAllOrder Error", error);
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

        const client = PositionController.getRestClientV5Config({
            ApiKey: botData.ApiKey,
            SecretKey: botData.SecretKey,
            Demo: botData.Demo,
        });


        client
            .cancelOrder({
                category: positionData.category,
                symbol: positionData.symbol,
                orderId: positionData.orderId,
            })
            .then((response) => {

                if (response.retCode == 0) {
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
            await Promise.allSettled(positionData.map(async positionDataItem => {
                const botData = positionDataItem.botData

                const client = PositionController.getRestClientV5Config({
                    ApiKey: botData.ApiKey,
                    SecretKey: botData.SecretKey,
                    Demo: botData.Demo,
                });

                const cancelAllSpot = client.cancelAllOrders({
                    category: "spot",
                    settleCoin: "USDT"
                })

                const cancelAllLinear = client.cancelAllOrders({
                    category: "linear",
                    settleCoin: "USDT"
                })
                try {
                    await Promise.allSettled([cancelAllSpot, cancelAllLinear])
                    res.customResponse(200, "Cancel Order Successful");
                } catch (error) {
                    res.customResponse(500, "Cancel Order Error");
                }
            }))

        } catch (error) {
            console.log(error);
            res.customResponse(500, error.msg);
        }

    },

}

module.exports = PositionController 