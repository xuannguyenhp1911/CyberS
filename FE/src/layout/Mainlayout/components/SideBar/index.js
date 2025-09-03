import BlockIcon from '@mui/icons-material/Block';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FilterDramaIcon from '@mui/icons-material/FilterDrama';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ControlCameraIcon from '@mui/icons-material/ControlCamera';
import PermDataSettingIcon from '@mui/icons-material/PermDataSetting';
import PaymentsIcon from '@mui/icons-material/Payments';
import PersonIcon from '@mui/icons-material/Person';
import GridViewIcon from '@mui/icons-material/GridView';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsIcon from '@mui/icons-material/Groups';
import { NavLink, useLocation } from "react-router-dom"
import clsx from "clsx";
import styles from "./SideBar.module.scss"
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Collapse, Popover } from '@mui/material';
import { useState } from 'react';
import bybitIcon from "../../../../assets/bybit-logo.png"
import OKXIcon from "../../../../assets/okx_logo.png"
import BinanceIcon from "../../../../assets/binance_logo.png"
import MT5Icon from "../../../../assets/mt5_logo.png"

const renderByBitIcon = () => <img src={bybitIcon} width={"22px"} style={{ borderRadius: "6px" }} />
const renderOKXIcon = () => <img src={OKXIcon} width={"22px"} style={{ borderRadius: "6px" }} />
const renderBinanceIcon = () => <img src={BinanceIcon} width={"22px"} style={{ borderRadius: "6px" }} />
const renderMT5Icon = () => <img src={MT5Icon} width={"22px"} style={{ borderRadius: "6px" }} />

function SideBar({
    openSidebar,
    roleList,
    linkConfigAndPosition,
    roleName
}, ref) {

    const [openAll, setOpenAll] = useState({
        Config: {
            open: false,
            children: {
                ByBit: "",
                OKX: "",
                Binance: "",
                MT5: "",
            }
        },
        Position: {
            open: false,
            children: {
                ByBit: "",
                OKX: "",
                Binance: "",
            }
        },
        Orders: {
            open: false,
            children: {
                OKX: "",
            }
        },
        Coins: {
            open: false,
            children: {
                ByBit: "",
                OKX: "",
                Binance: "",
            }
        },
        Instruments: {
            open: false,
            children: {
                ByBit: "",
                OKX: "",
            }
        },
    });

    const linkList = [

        {
            link: "Servers",
            name: "Servers",
            icon: <FilterDramaIcon className={styles.icon} />
        },
        {
            link: "Users",
            name: "Users",
            icon: <PersonIcon className={styles.icon} />
        },
        {
            link: "Groups",
            name: "Groups Member",
            icon: <GroupsIcon className={styles.icon} />
        },
        {
            link: "Bots",
            name: "Bots",
            icon: <SmartToyIcon className={styles.icon} />
        },
        {
            link: "BotTypes",
            name: "BotTypes",
            icon: <PrecisionManufacturingIcon className={styles.icon} />
        },
        {
            link: `Configs/${linkConfigAndPosition.config}`,
            name: "Configs",
            icon: <PermDataSettingIcon className={styles.icon} />,
            // open: openAll.Config.open,
            // openFunc: () => {
            //     setOpenAll(data => {
            //         const newData = { ...data }
            //         newData.Config.open = !newData.Config.open
            //         return newData
            //     })
            // },
            // children: [
            //     {
            //         link: "Configs/ByBit",
            //         name: "ByBit",
            //         icon: renderByBitIcon(),
            //     },
            //     {
            //         link: "Configs/OKX",
            //         name: "OKX",
            //         icon: renderOKXIcon(),
            //     },
            //     {
            //         link: "Configs/Binance",
            //         name: "Binance",
            //         icon: renderBinanceIcon(),
            //     },
            //     {
            //         link: "Configs/MT5",
            //         name: "MT5",
            //         icon: renderMT5Icon(),
            //     },

            // ]
        },
        {
            link: `Positions/${linkConfigAndPosition.pos}`,
            name: "Positions",
            icon: <ControlCameraIcon className={styles.icon} />,
            // open: openAll.Position.open,
            // openFunc: () => {
            //     setOpenAll(data => {
            //         const newData = { ...data }
            //         newData.Position.open = !newData.Position.open
            //         return newData
            //     })
            // },
            // children: [
            //     {
            //         link: "Positions/ByBit",
            //         name: "ByBit",
            //         icon: renderByBitIcon(),
            //     },
            //     {
            //         link: "Positions/OKX",
            //         name: "OKX",
            //         icon: renderOKXIcon(),
            //     },

            // ]
        },
        {
            link: `Orders/${linkConfigAndPosition.pos}`,
            name: "Orders",
            icon: <ShoppingCartIcon className={styles.icon} />,
            // open: openAll.Orders.open,
            // openFunc: () => {
            //     setOpenAll(data => {
            //         const newData = { ...data }
            //         newData.Orders.open = !newData.Orders.open
            //         return newData
            //     })
            // },
            // children: [

            //     {
            //         link: "Orders/OKX",
            //         name: "OKX",
            //         icon: renderOKXIcon(),
            //     },

            // ]
        },
        {
            link: `Coins/${linkConfigAndPosition.pos}`,
            name: "Coins",
            icon: <CurrencyExchangeIcon className={styles.icon} />,
            // open: openAll.Coins.open,
            // openFunc: () => {
            //     setOpenAll(data => {
            //         const newData = { ...data }
            //         newData.Coins.open = !newData.Coins.open
            //         return newData
            //     })
            // },
            // children: [
            //     {
            //         link: "Coins/ByBit/Futures",
            //         name: "ByBit",
            //         icon: renderByBitIcon(),
            //     },
            //     {
            //         link: "Coins/OKX/Spot",
            //         name: "OKX",
            //         icon: renderOKXIcon(),
            //     },
            //     {
            //         link: "Coins/Binance",
            //         name: "Binance",
            //         icon: renderBinanceIcon(),
            //     },

            // ]
        },
        {
            link: "CoinsBlock",
            name: "Coins Block",
            icon: <BlockIcon className={styles.icon} />,
        },
    ]
    const location = useLocation()

    const checkRoleList = (link="") => {
        return roleName != "SuperAdmin" ? roleList?.find(item=>link.includes(item)) : true
    }

    return (
        <div
            className={styles.sidebar}
            style={{
                transform: openSidebar ? undefined : "translateX(-100%)"
            }}
            onClick={e => {
                e.preventDefault();
                e.stopPropagation()
            }}
        >

            <NavLink
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                to={"/"}
                key={"/"}
            >
                <GridViewIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Dashboard</p>
            </NavLink>
            {
                linkList.map(item => {
                    if (item.children?.length && checkRoleList(item.link)) {
                        return <div key={item.link} >
                            <div
                                className={clsx(styles.sidebarItem, location.pathname.includes(item.link) && styles.active)}
                                onClick={item.openFunc}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    alignItems: "center"
                                }}>
                                    {item.icon}
                                    <p className={styles.sidebarItemName}>{item.name}</p>
                                </div>
                                {item.open ? <ExpandLess /> : <ExpandMore />}
                            </div>
                            <Collapse in={item.open} timeout="auto" unmountOnExit>
                                <div style={{ paddingLeft: "16px" }}>
                                    {item.children.map(child => {

                                            if (child.children?.length && checkRoleList(child.link)) {
                                                return <>
                                                    <div
                                                        className={clsx(styles.sidebarItem, location.pathname.includes(child.link) && styles.active)}
                                                        onClick={e => {
                                                            child.openFunc(e.currentTarget)
                                                        }}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between"
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: "flex",
                                                            alignItems: "center"
                                                        }}>
                                                            {child.icon}
                                                            <p className={styles.sidebarItemName}>{child.name}</p>
                                                        </div>
                                                        <KeyboardArrowRightIcon />
                                                    </div>
                                                    <Popover
                                                        open={child.open}
                                                        anchorEl={child.open}
                                                        onClose={() => {
                                                            child.openFunc("")
                                                        }}
                                                        anchorOrigin={{
                                                            vertical: 'top',
                                                            horizontal: 'right',
                                                        }}
                                                        sx={{
                                                            ".MuiPopover-paper": {
                                                                boxShadow: "0 5px 25px 0 #60606033"
                                                            }
                                                        }}
                                                    >
                                                        {child.children.map(childItem => (
                                                            checkRoleList(childItem.link) && <NavLink
                                                                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                                                                to={childItem.link}
                                                                style={{ margin: 0 }}
                                                                onClick={() => {
                                                                    child.openFunc("")
                                                                }}
                                                            >
                                                                {childItem.name}
                                                            </NavLink>
                                                        ))}
                                                    </Popover>
                                                </>
                                            }
                                            else {
                                                if (checkRoleList(child.link)) {
                                                    return <div key={child.link}>
                                                        {
                                                           <NavLink
                                                                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                                                                to={child.link}
                                                            >
                                                                {child.icon}
                                                                <p className={styles.sidebarItemName}>{child.name}</p>
                                                            </NavLink>
                                                        }
                                                    </div>
                                                }
                                            }
                                    })}
                                </div>
                            </Collapse>
                        </div>
                    }
                    else {
                        return <div key={item.link}>
                            {
                                checkRoleList(item.link) && <NavLink
                                    className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                                    to={item.link}
                                >
                                    {item.icon}
                                    <p className={styles.sidebarItemName}>{item.name}</p>
                                </NavLink>
                            }
                        </div>
                    }

                })
            }

        </div >
    );
}

export default SideBar;