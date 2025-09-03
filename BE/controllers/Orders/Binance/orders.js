const {  USDMClient } = require('binance');


const PositionController = {

    // OTHER 
    getRestClientV5Config: ({
        ApiKey,
        SecretKey,
        Demo
    }) => {
        const client = new USDMClient({
            api_key: ApiKey,
            api_secret: SecretKey,
            beautifyResponses: true,
            recvWindow: 10000,
            useTestnet: !Demo ? false : true,

        })
        client.setTimeOffset(-3000)
        return client
    },
    getAllOrder: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                let getAllFalse = false
                await Promise.allSettled(botListID.map(dataBotItem => {
                    if (dataBotItem?.ApiKey) {

                        const client = PositionController.getRestClientV5Config({
                            ApiKey: dataBotItem.ApiKey,
                            SecretKey: dataBotItem.SecretKey,
                            Demo: dataBotItem.Demo,
                        });

                        return client.getAllOpenOrders({
                        }).then(resAll => {

                            resAll.forEach((dataOrder, index) => {
                                newData.push({
                                    id: dataOrder.orderId,
                                    orderId: dataOrder.orderId,
                                    botData: dataBotItem,
                                    symbol: dataOrder.symbol,
                                    market: dataOrder.isLeverage,
                                    side: dataOrder.side == "BUY" ? "Buy" : "Sell",
                                    cTime: dataOrder.updateTime,
                                    state: dataOrder.status,
                                    reduceOnly: dataOrder.reduceOnly,
                                    priceOrder: dataOrder.price
                                })
                            })

                        })
                            .catch(error => {
                                console.log("getAllOrder Error", error);
                                getAllFalse = true
                                return [];
                            });
                    }
                }));
                if (!getAllFalse) {
                    res.customResponse(200, "Get All Order Successful", newData);
                }
                else {
                    res.customResponse(400, "Get All Order Failed");
                }
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
                symbol: positionData.symbol,
                orderId: positionData.orderId,
            })
            .then((response) => {

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
            let cancelError = false
            await Promise.allSettled(positionData.map(async positionDataItem => {
                try {
                    const botData = positionDataItem.botData
                    const client = PositionController.getRestClientV5Config({
                        ApiKey: botData.ApiKey,
                        SecretKey: botData.SecretKey,
                        Demo: botData.Demo,
                    });
    
                    await client.cancelAllOpenOrders({
                        symbol: positionDataItem.symbol
                    })
                } catch (error) {
                    console.log(error);
                    cancelError = true
                }
            }))
            if (!cancelError) {
                res.customResponse(200, "Cancel Order Successful");
            }
            else {
                res.customResponse(400, "Cancel Order Failed");
            }

        } catch (error) {
            console.log(error);
            res.customResponse(500, error.msg);
        }

    },

}

module.exports = PositionController 