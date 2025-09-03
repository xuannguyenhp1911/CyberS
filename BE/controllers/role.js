// const { ObjectId } = require('mongodb');
const ServerModel = require('../models/servers.model');
const BotModel = require('../models/bot.model');
const RoleModel = require('../models/role.model');
const FuturesOKXV1Model = require('../models/Configs/OKX/V1/futures.model');
const SpotOKXV1Model = require('../models/Configs/OKX/V1/spot.model');
const MarginOKXV1Model = require('../models/Configs/OKX/V1/margin.model');
const ScannerOKXV1Model = require('../models/Configs/OKX/V1/scanner.model');
const { RestClientV5 } = require('bybit-api');
const { RestClient } = require('okx-api');

const RoleController = {

    getByRoleName: async (req, res) => {
        try {
            const roleName = req.params.roleName;
            const data = await RoleModel.findOne({ name: roleName })
            res.customResponse(res.statusCode, "Get Role Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    initCreate: async () => {
        try {

            const TraderRole = {
                list: []
            }
            const ManagerTraderRole = {
                list: [
                    ...TraderRole.list,
                    "Users"
                ]
            }
            const AdminRole = {
                list: [
                    ...ManagerTraderRole.list,
                    "Groups"
                ]
            }

            const roleList = [
               
                {
                    name: "Admin",
                    list: AdminRole.list
                },
                {
                    name: "ManagerTrader",
                    list: ManagerTraderRole.list
                },
                {
                    name: "Trader",
                    list: TraderRole.list
                },
            ]
            const newData = roleList.map(role => ({
                name: role.name,
                roleList: role.list
            }))

            await RoleModel.insertMany(newData)
            console.log("\n[V] Initialization Role Successful");

        } catch (error) {
            // Xử lý lỗi nếu có
            console.log("\n[!] Initialization Role Error:\n", error.message);
        }
    },

    addMore: async () => {
        try {

            // const client = new RestClientV5({
            //     testnet: false,
            //     key: "se",
            //     secret: "sd",
            //     syncTimeBeforePrivateRequests: true,
            //     recvWindow: 100000,
            // })
            // let CoinInfo = new RestClientV5({
            //     testnet: false,
            //     recv_window: 100000
            // });

            // await CoinInfo.getTickers({ category: 'linear' })
            //     .then(async (rescoin) => {
            //         const list = rescoin.result.list

            //         let index = 0
            //         const batchSize = 10

            //         while (index < list.length) {
            //             const batch = list.slice(index, index + batchSize)
            //             await Promise.allSettled(batch.map(async (e) => {
            //                 if (e.symbol.split("USDT")[1] === "") {
            //                     const res = await client.setLeverage({
            //                         buyLeverage: "10",
            //                         sellLeverage: "10",
            //                         category: "linear",
            //                         symbol: e.symbol
            //                     })
            //                     console.log(res.retMsg, e.symbol);
            //                 }
            //             }))
            //             await new Promise(resolve => setTimeout(resolve, 1000));
            //             index += batchSize
            //         }
            //     })
            //     .catch((error) => {
            //         console.error(error);
            //     });

            await RoleModel.updateMany(
                { name: { $in: ["SuperAdmin"] } },
                {
                    "$addToSet": {
                        roleList: [
                            "Coins/Binance",
                            "Coins/Binance/Futures",
                            "Coins/Binance/Group",
                            "Orders/Binance",
                            "Configs/Binance/V3",
                            "Configs/Binance/V3/ConfigHistory",
                            "Configs/Binance/V3/BigBabol",
                            "Positions/Binance",
                            "Configs/Binance/V3V",
                            "Configs/Binance/V3/Fomo",
                            "Configs/Binance/V3V/Fomo",
                            "Configs/Binance/V3V/BigBabol",

                        ]
                    }
                },
            );


            // await ScannerOKXV1Model.updateMany({}, { Alpha: 5 })


            // const botList = await BotModel.find({
            //     botType:"ByBit_V3"
            // })
            // await Promise.allSettled(botList.map(async botData=>{
            //     const client = new RestClientV5({
            //         testnet: false,
            //         key: botData.ApiKey,
            //         secret: botData.SecretKey,
            //         syncTimeBeforePrivateRequests: true,
            //         recvWindow: 100000,
            //     })
            //     try {
            //         const res = await client.switchPositionMode({
            //             mode:3,
            //             category:"linear",
            //             coin:"USDT"
            //         })
            //         if(res.retCode == 0)
            //         {
            //             console.log(`[V] Set success bot | ${botData.botName}`);
            //         }
            //         else 
            //         {
            //             console.log(`[!] Set failed bot | ${botData.botName}: ${res.retMsg}`);
            //         }

            //     } catch (error) {
            //         console.log(`[!] Set error bot | ${botData.botName}: ${error}`);

            //     }
            // }))


            // await StrategiesModel.updateMany({}, {
            //     $set: {
            //       "children.$[].StopLose": 180
            //     }
            //   })



            // Handle money all
            const botListData = await BotModel.find({
                botType: "ByBit_V3"
            })


            const resultAll = await Promise.allSettled(botListData.map(async botData => {
                const botType = botData.botType;
                const ApiKey = botData.ApiKey;
                const SecretKey = botData.SecretKey;
                const botName = botData.botName;
                let totalMoney = 0;

                switch (botType) {
                    case "ByBit_V3":
                    case "ByBit_V1": {
                        const client = new RestClientV5({
                            testnet: false,
                            key: ApiKey,
                            secret: SecretKey,
                            syncTimeBeforePrivateRequests: true,
                            recv_window: 100000
                        });

                        try {
                            // Get wallet balances
                            const getFuture = client.getWalletBalance({
                                accountType: 'UNIFIED',
                                coin: 'USDT',
                            });
                            const getSpot = client.getAllCoinsBalance({
                                accountType: 'FUND',
                                coin: 'USDT'
                            });

                            const result = await Promise.all([getFuture, getSpot]);

                            if (result.every(item => item.retCode === 0)) {
                                totalMoney = (+result[0]?.result?.list?.[0]?.coin[0].walletBalance || 0) + (+result[1]?.result?.balance?.[0]?.walletBalance || 0);
                                return { botName, totalMoney };
                            } else {
                                // Nếu có lỗi API key hoặc dữ liệu không hợp lệ, reject kết quả
                                return Promise.reject('API key is invalid.');
                            }
                        } catch (error) {
                            return Promise.reject(error);
                        }
                    }

                    case "OKX_V1":
                    case "OKX_V3": {
                        const client = new RestClient({
                            apiKey: ApiKey,
                            apiSecret: SecretKey,
                            apiPass: botData.Password,
                        });

                        try {
                            // Get account asset and balance
                            const result = await client.getAccountAssetValuation("USDT");
                            const resData2 = await client.getBalances();

                            if (result) {
                                totalMoney = (+result?.[0]?.details?.trading || 0) + (+result?.[0]?.details?.funding || 0) + (+resData2[0]?.availBal || 0);
                                return { botName, totalMoney };
                            } else {
                                return Promise.reject('API key is invalid.');
                            }
                        } catch (error) {
                            return Promise.reject(error);
                        }
                    }
                }
            }));

            // Loại bỏ các kết quả bị reject và sort kết quả còn lại
            const validResults = resultAll
                .filter(result => result.status === 'fulfilled') // Lọc các kết quả thành công
                .map(result => result.value) // Chỉ lấy value của các kết quả thành công
                .sort((a, b) => {
                    const moneyA = a?.totalMoney || 0;
                    const moneyB = b?.totalMoney || 0
                    return moneyB - moneyA;  // Sắp xếp giảm dần
                });

            console.log(validResults);

            // ----------------
            console.log('ok');


        } catch (err) {
            console.log("\n[!] Add More Role Error:\n", err.message);
        }
    }

}

module.exports = RoleController 