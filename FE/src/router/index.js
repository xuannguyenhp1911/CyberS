import Bot from "../pages/Bot"
import Strategies from "../pages/Configs/ByBit/V3/tabComponents/Config"
import NotFound from "../pages/NotFound"
import BotDetail from "../pages/Bot/components/BotDetail"
import MyProfile from "../pages/MyProfile"
import LoginPage from "../pages/LoginPage"
import Group from "../pages/Group"
import BotType from "../pages/BotType"
import User from "../pages/User"
import Dashboard from "../pages/Dashboard"
import PositionV3 from "../pages/Position/ByBit/V3"
import StrategiesV3Tab from "../pages/Configs/ByBit/V3"
import { Outlet } from "react-router-dom"
import ConfigV1TabOKX from "../pages/Configs/OKX/V1"
import SpotOKX from "../pages/Configs/OKX/V1/tabComponents/Spot"
import MarginOKX from "../pages/Configs/OKX/V1/tabComponents/Margin"
import LayoutBox from "../components/LayoutBox"

import PositionOKXV1 from "../pages/Position/OKX/V1"
import StrategiesHistory from "../pages/Configs/ByBit/V3/tabComponents/ConfigHistory"
import CoinsTab from "../pages/Coins/ByBit"
import CoinContent from "../pages/Coins/ByBit/Futures"
import GroupCoin from "../pages/Coins/ByBit/Group"
import ScannerV3 from "../pages/Configs/ByBit/V3/tabComponents/Scanner"
import ScannerV1OKX from "../pages/Configs/OKX/V1/tabComponents/Scanner"
import Servers from "../pages/Servers"

import BybitIcon from "../assets/bybit-logo.png"
import OKXIcon from "../assets/okx_logo.png"
import BinanceIcon from "../assets/binance_logo.png"
import ConfigBinanceV3Tab from "../pages/Configs/Binance/V3"
import ConfigBinanceV3 from "../pages/Configs/Binance/V3/tabComponents/Config"
import ScannerBinanceV3 from "../pages/Configs/Binance/V3/tabComponents/Scanner"
import ScannerV3ThongKe from "../pages/Configs/ByBit/V3V/tabComponents/Scanner"
import StrategiesV3TabVIP from "../pages/Configs/ByBit/V3V"
import ConfigThongKe from "../pages/Configs/ByBit/V3V/tabComponents/Config"
import CoinsTabOKX from "../pages/Coins/OKX"
import InstrumentOKXV1 from "../pages/Coins/OKX/Spot"
import InstrumentOKXV1Futures from "../pages/Coins/OKX/Futures"
import ConfigOKXV1Futures from "../pages/Configs/OKX/V1/tabComponents/Futures"
import ConfigV1VTabOKX from "../pages/Configs/OKX/V1V"
import ScannerV1VOKX from "../pages/Configs/OKX/V1V/tabComponents/Scanner"
import Mainlayout from "../layout/Mainlayout"
import OrderOKXV1 from "../pages/Order/OKX"
import ConfigOKXV3Tab from "../pages/Configs/OKX/V3"
import ConfigOKXV3 from "../pages/Configs/OKX/V3/tabComponents/Config"
import ScannerOKXV3 from "../pages/Configs/OKX/V3/tabComponents/Scanner"
import GroupCoinOKXV3 from "../pages/Coins/OKX/Group"
import ConfigOKXV3TabV from "../pages/Configs/OKX/V3V"
import ConfigOKXV3V from "../pages/Configs/OKX/V3V/tabComponents/Config"
import ScannerOKXV3V from "../pages/Configs/OKX/V3V/tabComponents/Scanner"
import MT5V4Tab from "../pages/Configs/MT5/V4"
import CoinsBlock from "../pages/CoinsBlock"
import OrdersByBit from "../pages/Order/ByBit"
import CoinSpotByBit from "../pages/Coins/ByBit/Spot"
import ConfigV1TabByBit from "../pages/Configs/ByBit/V1"
import ConfigV1VTabByBit from "../pages/Configs/ByBit/V1V"
import MarginByBit from "../pages/Configs/ByBit/V1/tabComponents/Margin"
import SpotByBit from "../pages/Configs/ByBit/V1/tabComponents/Spot"
import ConfigByBitV1Futures from "../pages/Configs/ByBit/V1/tabComponents/Futures"
import ScannerV1ByBit from "../pages/Configs/ByBit/V1/tabComponents/Scanner"
import WaveByBitV3 from "../pages/Configs/ByBit/V3/tabComponents/Wave"
import CoinBinanceFutures from "../pages/Coins/Binance/Futures"
import CoinsTabBinance from "../pages/Coins/Binance"
import GroupCoinBinance from "../pages/Coins/Binance/Group"
import OrdersBinance from "../pages/Order/Binance"
import PositionBinance from "../pages/Position/Binance"
import StrategiesV3TabVIPBinance from "../pages/Configs/Binance/V3V"
import ConfigThongKeBinance from "../pages/Configs/Binance/V3V/tabComponents/Config"
import ScannerV3ThongKeBinance from "../pages/Configs/Binance/V3V/tabComponents/Scanner"
import ConfigThongKeBinanceOld from "../pages/Configs/Binance/V3V/tabComponents/ConfigOld"
import ConfigBinanceOldV3 from "../pages/Configs/Binance/V3/tabComponents/ConfigOld"

const renderByBitIcon = () => <img src={BybitIcon} width={"70px"} style={{ borderRadius: "6px" }} />
const renderOKXIcon = () => <img src={OKXIcon} width={"70px"} style={{ borderRadius: "6px" }} />
const renderBinanceIcon = () => <img src={BinanceIcon} width={"70px"} style={{ background: "white" }} />

const routeList = [
    {
        path: "/",
        element: <Mainlayout />,
        children: [
            {
                path: "",
                element: <Dashboard />,
            },
            {
                path: "Servers",
                element: <Servers />,
            },
            {
                path: "Users",
                element: <User />,
            },
            {
                path: "Groups",
                element: <Group />,
            },
            {
                path: "Bots",
                element: <Bot />,
            },
            {
                path: "BotTypes",
                element: <BotType />,
            },
            {
                path: "Bots",
                element: <>
                    <Outlet />
                </>,
                children: [
                    {
                        path: ":botID",
                        element: <BotDetail />,
                    }
                ]
            },
            {
                path: "Configs",
                element: <>
                    <Outlet />
                </>,
                children: [
                    {
                        path: "",
                        element: <LayoutBox
                            list={[
                                {
                                    label: renderByBitIcon(),
                                    link: "/Configs/ByBit",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderOKXIcon(),
                                    link: "/Configs/OKX",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderBinanceIcon(),
                                    link: "/Configs/Binance",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                            ]}
                        />
                    },
                    {
                        path: "ByBit",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element: <LayoutBox list={[
                                    {
                                        label: "V1",
                                        link: "/Configs/ByBit/V1/Margin"
                                    },
                                    {
                                        label: "V3",
                                        link: "/Configs/ByBit/V3/Config"
                                    }
                                ]} />
                            },
                            {
                                path: "V3",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <StrategiesV3Tab />
                                                <Strategies />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <StrategiesV3Tab />
                                                <Strategies />
                                            </>,
                                    },
                                    {
                                        path: "Wave",
                                        element:
                                            <>
                                                <StrategiesV3Tab />
                                                <WaveByBitV3 />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <StrategiesV3Tab />
                                                <ScannerV3 />
                                            </>,
                                    },
                                    {
                                        path: "ConfigHistory",
                                        element: <StrategiesHistory />,
                                    },
                                ]
                            },
                            {
                                path: "V3V",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <StrategiesV3TabVIP />
                                                <ConfigThongKe />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <StrategiesV3TabVIP />
                                                <ConfigThongKe />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <StrategiesV3TabVIP />
                                                <ScannerV3ThongKe />
                                            </>,
                                    },
                                    {
                                        path: "ConfigHistory",
                                        element: <StrategiesHistory />,
                                    },
                                ]
                            },
                            {
                                path: "V1",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigV1TabByBit />
                                                <MarginByBit />
                                            </>
                                    },
                                    {
                                        path: "Spot",
                                        element:
                                            <>
                                                <ConfigV1TabByBit />
                                                <SpotByBit />
                                            </>
                                    },
                                    {
                                        path: "Margin",
                                        element:
                                            <>
                                                <ConfigV1TabByBit />
                                                <MarginByBit />
                                            </>
                                    },
                                    {
                                        path: "Futures",
                                        element:
                                            <>
                                                <ConfigV1TabByBit />
                                                <ConfigByBitV1Futures />
                                            </>
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigV1TabByBit />
                                                <ScannerV1ByBit />
                                            </>
                                    },
                                   
                                ]
                            },
                            {
                                path: "V1V",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigV1VTabByBit />
                                                <ScannerV1VOKX />
                                            </>
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigV1VTabByBit />
                                                <ScannerV1VOKX />
                                            </>
                                    },
                                ]
                            },
                            
                        ]
                    },
                    {
                        path: "OKX",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element: <LayoutBox list={[
                                    {
                                        label: "V1",
                                        link: "/Configs/OKX/V1/Margin"
                                    },
                                    {
                                        label: "V3",
                                        link: "/Configs/OKX/V3/Config"
                                    }
                                ]} />
                            },
                            {
                                path: "V1",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <SpotOKX />
                                            </>
                                    },
                                    {
                                        path: "Spot",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <SpotOKX />
                                            </>
                                    },
                                    {
                                        path: "Margin",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <MarginOKX />
                                            </>
                                    },
                                    {
                                        path: "Futures",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <ConfigOKXV1Futures />
                                            </>
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <ScannerV1OKX />
                                            </>
                                    },
                                   
                                ]
                            },
                            {
                                path: "V1V",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigV1VTabOKX />
                                                <ScannerV1VOKX />
                                            </>
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigV1VTabOKX />
                                                <ScannerV1VOKX />
                                            </>
                                    },
                                ]
                            },
                            {
                                path: "V3",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigOKXV3Tab />
                                                <ConfigOKXV3 />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <ConfigOKXV3Tab />
                                                <ConfigOKXV3 />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigOKXV3Tab />
                                                <ScannerOKXV3 />
                                            </>,
                                    },
                                ]
                            },
                            {
                                path: "V3V",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigOKXV3TabV />
                                                <ConfigOKXV3V />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <ConfigOKXV3TabV />
                                                <ConfigOKXV3V />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigOKXV3TabV />
                                                <ScannerOKXV3V />
                                            </>,
                                    },

                                ]
                            },
                        ]
                    },
                    {
                        path: "Binance",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element: <LayoutBox list={[
                                    {
                                        label: "V1",
                                        link: "/Configs/Binance/V1/Margin"
                                    },
                                    {
                                        label: "V3",
                                        link: "/Configs/Binance/V3/Config"
                                    }
                                ]} />
                            },
                            {
                                path: "V3",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigBinanceV3Tab />
                                                <ConfigBinanceV3 />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <ConfigBinanceV3Tab />
                                                <ConfigBinanceOldV3 />
                                            </>,
                                    },
                                    {
                                        path: "Fomo",
                                        element:
                                            <>
                                                <ConfigBinanceV3Tab />
                                                <ConfigBinanceV3 />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigBinanceV3Tab />
                                                <ScannerBinanceV3 />
                                            </>,
                                    },
                                    // {
                                    //     path: "ConfigHistory",
                                    //     element: <ConfigBinanceV3History />,
                                    // },
                                ]
                            },
                            {
                                path: "V3V",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <StrategiesV3TabVIPBinance />
                                                <ConfigThongKeBinanceOld />
                                            </>,
                                    },
                                    {
                                        path: "Config",
                                        element:
                                            <>
                                                <StrategiesV3TabVIPBinance />
                                                <ConfigThongKeBinanceOld />
                                            </>,
                                    },
                                    {
                                        path: "Fomo",
                                        element:
                                            <>
                                                <StrategiesV3TabVIPBinance />
                                                <ConfigThongKeBinance />
                                            </>,
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <StrategiesV3TabVIPBinance />
                                                <ScannerV3ThongKeBinance/>
                                            </>,
                                    },
                                ]
                            },
                            {
                                path: "V1",
                                element: <>
                                    <Outlet />
                                </>,
                                children: [
                                    {
                                        path: "",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <SpotOKX />
                                            </>
                                    },
                                    {
                                        path: "Spot",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <SpotOKX />
                                            </>
                                    },
                                    {
                                        path: "Margin",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <MarginOKX />
                                            </>
                                    },
                                    {
                                        path: "BigBabol",
                                        element:
                                            <>
                                                <ConfigV1TabOKX />
                                                <ScannerV1OKX />
                                            </>
                                    },
                                ]
                            }
                        ]
                    },
                    {
                        path: "MT5",
                        element: <MT5V4Tab />,
                    }

                ]
            },

            {
                path: "Positions",
                element: <>
                    <Outlet />
                </>,
                children: [
                    {
                        path: "",
                        element: <LayoutBox
                            list={[
                                {
                                    label: renderByBitIcon(),
                                    link: "/Positions/ByBit",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderOKXIcon(),
                                    link: "/Positions/OKX",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                }
                            ]}
                        />
                    },
                    {
                        path: "ByBit",
                        element: <PositionV3 />
                    },
                    {
                        path: "OKX",
                        element: <PositionOKXV1 />,
                    },
                    {
                        path: "Binance",
                        element: <PositionBinance />,
                    },

                ]
            },
            {
                path: "Orders",
                element: <>
                    <Outlet />
                </>,
                children: [
                    {
                        path: "",
                        element: <LayoutBox
                            list={[
                                {
                                    label: renderByBitIcon(),
                                    link: "/Orders/ByBit",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderOKXIcon(),
                                    link: "/Orders/OKX",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                               
                            ]}
                        />
                    },

                    {
                        path: "OKX",
                        element: <OrderOKXV1 />,
                    },
                    {
                        path: "ByBit",
                        element: <OrdersByBit />,
                    },
                    {
                        path: "Binance",
                        element: <OrdersBinance />,
                    },

                ]
            },

            {
                path: "Coins",
                element: <>
                    <Outlet />
                </>,
                children: [
                    {
                        path: "",
                        element: <LayoutBox
                            list={[
                                {
                                    label: renderByBitIcon(),
                                    link: "/Coins/ByBit/Futures",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderOKXIcon(),
                                    link: "/Coins/OKX/Spot",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                                {
                                    label: renderBinanceIcon(),
                                    link: "/Coins/Binance/Futures",
                                    style: {
                                        padding: "0",
                                        lineHeight: "100%",
                                        flexBasis: 0
                                    }
                                },
                            ]}
                        />
                    },
                    {
                        path: "ByBit",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element:
                                    <>
                                        <CoinsTab />
                                        <CoinContent />
                                    </>,
                            },
                            {
                                path: "Spot",
                                element:
                                    <>
                                        <CoinsTab />
                                        <CoinSpotByBit />
                                    </>,
                            },
                            {
                                path: "Futures",
                                element:
                                    <>
                                        <CoinsTab />
                                        <CoinContent />
                                    </>,
                            },
                            {
                                path: "Group",
                                element:
                                    <>
                                        <CoinsTab />
                                        <GroupCoin />
                                    </>,
                            }


                        ]
                    },
                    {
                        path: "OKX",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element:
                                    <>
                                        <CoinsTabOKX />
                                        <InstrumentOKXV1 />
                                    </>,
                            },
                            {
                                path: "Spot",
                                element:
                                    <>
                                        <CoinsTabOKX />
                                        <InstrumentOKXV1 />
                                    </>,
                            },
                            {
                                path: "Futures",
                                element:
                                    <>
                                        <CoinsTabOKX />
                                        <InstrumentOKXV1Futures />
                                    </>,
                            },
                            {
                                path: "Group",
                                element:
                                    <>
                                        <CoinsTabOKX />
                                        <GroupCoinOKXV3 />
                                    </>,
                            }
                        ]
                    },
                    {
                        path: "Binance",
                        element: <>
                            <Outlet />
                        </>,
                        children: [
                            {
                                path: "",
                                element:
                                    <>
                                        <CoinsTabBinance />
                                        <CoinBinanceFutures />
                                    </>,
                            },
                            {
                                path: "Futures",
                                element:
                                    <>
                                        <CoinsTabBinance />
                                        <CoinBinanceFutures />
                                    </>,
                            },
                            {
                                path: "Group",
                                element:
                                    <>
                                        <CoinsTabBinance />
                                        <GroupCoinBinance />
                                    </>,
                            }

                        ]


                    },

                ]
            },
            {
                path: "CoinsBlock",
                element: <CoinsBlock />,
            },
            {
                path: "MyProfile",
                element: <MyProfile />,
            },

            // {
            //     path: "Instruments",
            //     element: <>
            //         <Outlet />
            //     </>,
            //     children: [
            //         {
            //             path: "",
            //             element: <LayoutBox
            //                 list={[
            //                     {
            //                         label: renderByBitIcon(),
            //                         link: "/Instruments/ByBit",
            //                         style: {
            //                             padding: "0",
            //                             lineHeight: "100%",
            //                             flexBasis: 0
            //                         }
            //                     },
            //                     {
            //                         label: renderOKXIcon(),
            //                         link: "/Instruments/OKX",
            //                         style: {
            //                             padding: "0",
            //                             lineHeight: "100%",
            //                             flexBasis: 0
            //                         }
            //                     }
            //                 ]}
            //             />
            //         },
            //         {
            //             path: "ByBit",
            //             element: <InstrumentsByBitV1 />

            //         },
            //         {
            //             path: "OKX",
            //             element: <InstrumentOKXV1 />
            //         },

            //     ]
            // },

        ]
    },
    {
        path: "login",
        element: <LoginPage />,
    },
    {
        path: "*",
        element: <NotFound />,
    },

]

export default routeList