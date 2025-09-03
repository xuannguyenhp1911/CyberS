import ControlCameraIcon from '@mui/icons-material/ControlCamera';
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Heading from "./components/Heading";
import SideBar from "./components/SideBar";
import styles from "./Mainlayout.module.scss"
import { Helmet } from "react-helmet";
import PermDataSettingIcon from '@mui/icons-material/PermDataSetting';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { memo, useEffect, useState } from "react";
import clsx from "clsx";
import { useDispatch } from "react-redux";
import { Breadcrumbs, Typography } from "@mui/material";
import { verifyLogin } from "../../services/authService";
import { getByRoleName } from "../../services/roleService";
import { getUserByID } from "../../services/userService";
import { addMessageToast } from "../../store/slices/Toast";
import { removeLocalStorage } from "../../functions";
import { setUserDataLocal } from "../../store/slices/UserData";
import { getTotalFutureBotByBotType } from "../../services/botService";
import { setTotalFuture } from "../../store/slices/TotalFuture";

function MainLayout({ children }) {

    const ROLE_LIST_EXCEPT = [
        "Bots/",
    ]
    
    const ROLE_LIST_DEFAULT = [
        "Bots",
        "CoinsBlock",
        
        "Configs/ByBit/V3",
        "Orders/ByBit",
        "Positions/ByBit",
        "Coins/ByBit",
    ]

    const [linkConfigAndPosition, setLinkConfigAndPosition] = useState({
        config: "",
        pos: ""
    });

    const [switchPageValue, setSwitchPageValue] = useState("");


    const linkList = [
        {
            link: "Bots",
            name: "Bots",
            icon: <SmartToyIcon className={styles.icon} />
        },
        {
            link: `Configs/${linkConfigAndPosition.config}`,
            name: "Configs",
            icon: <PermDataSettingIcon className={styles.icon} />
        },

        {
            link: `Positions/${linkConfigAndPosition.pos}`,
            name: "Positions",
            icon: <ControlCameraIcon className={styles.icon} />
        },

    ]

    const location = useLocation()
    const navigate = useNavigate()

    const dispatch = useDispatch()

    const [marginLeft, setMarginLeft] = useState(window.innerWidth <= 740 ? "" : "300px");
    const [userData, setUserData] = useState("");
    const [roleList, setRoleList] = useState([]);

    const getRouteName = () => (
        location.pathname.split("/")[1]
    )


    const toggleSidebar = () => {
        setMarginLeft(marginLeft ? "" : "300px")
    }

    const locationPathSplit = location.pathname.split("/")


    const renderLinkBreadcrumbs = (item) => {
        const path = locationPathSplit.slice(0, locationPathSplit.indexOf(item) + 1).join('/');
        return `${path}`;
    };


    const handleBreadcrumbs = () => {
        return <Breadcrumbs
            aria-label="breadcrumb"
            style={{
                fontWeight: 450,
                marginBottom: "12px"
            }}
        >

            {
                location.pathname.split("/").map((value, index) => {
                    if (index === 0) {
                        return <Link
                            to="/"
                            style={{ fontSize: ".9rem", opacity: .5 }}
                            key={index}
                        >
                            Home
                        </Link>
                    }
                    else if (index === locationPathSplit.length - 1) {
                        return <Typography
                            style={{
                                color: "var(--textColor)",
                                opacity: ".8",
                                fontSize: ".9rem"
                            }}
                            key={index}
                        >{value}</Typography>

                    }
                    else {
                        return <Link
                            to={renderLinkBreadcrumbs(value)}
                            style={{ fontSize: ".9rem", opacity: .5 }}
                            key={index}
                        >
                            {value}
                        </Link>
                    }
                })
            }

        </Breadcrumbs>
    }

    const handleVerifyLogin = async () => {
        try {
            const res = await verifyLogin()
            const userData = res.data.data
            const userIDMain = userData._id
            getRoleList(userIDMain)
        } catch (error) {
            removeLocalStorage()
            navigate("/login")
        }
    }

    const getRoleList = async (userID) => {
        try {

            const resUser = await getUserByID(userID)

            const { data: resUserData } = resUser.data
            if (resUserData) {

                let newRoleList = []
                setUserData(resUserData)
                const roleName = resUserData?.roleName
                if (roleName != "SuperAdmin") {
                    const res = await getByRoleName(roleName || "")
                    const { data: resData } = res.data

                    newRoleList = resData.roleList.concat(ROLE_LIST_DEFAULT, resUserData.roleMoreList || [])

                    const routeCurrent = location.pathname.replace("/", "")

                    if ((!newRoleList.find(item=>routeCurrent.includes(item)) && routeCurrent) && !ROLE_LIST_EXCEPT.find(item => routeCurrent.includes(item))) {
                        navigate("404")
                    }
                }
                setRoleList(newRoleList || [])
                dispatch(setUserDataLocal({
                    ...resUserData,
                    roleList: newRoleList
                }))
            }

        } catch (error) {
            console.log(error);

            dispatch(addMessageToast({
                status: 500,
                message: "Get Role User Error",
            }))
            // removeLocalStorage()
            // navigate("/login")
        }
    }

    const viewSwitchPage = () => {

        const pageName = getRouteName()
        let arrayRoute = []
        switch (pageName) {
            case "Configs": {
                arrayRoute = [
                    {
                        name: "ByBit_V3",
                        link: "Configs/ByBit/V3/Config"
                    },
                    // {
                    //     name: "ByBit_V1",
                    //     link: "Configs/ByBit/V1/Margin"
                    // },
                    {
                        name: "OKX_V1",
                        link: "Configs/OKX/V1/Margin"
                    },
                    // {
                    //     name: "OKX_V3",
                    //     link: "Configs/OKX/V3/Config"
                    // },
                    {
                        name: "Binance_V3",
                        link: "Configs/Binance/V3/Config"
                    },
                ]
                break
            }
            case "Positions": {
                arrayRoute = [
                    {
                        name: "ByBit",
                        link: "Positions/ByBit"
                    },
                    {
                        name: "OKX",
                        link: "Positions/OKX"
                    },
                    {
                        name: "Binance",
                        link: "Positions/Binance"
                    },
                ]
                break
            }
            case "Orders": {
                arrayRoute = [
                    {
                        name: "ByBit",
                        link: "Orders/ByBit"
                    },
                    {
                        name: "OKX",
                        link: "Orders/OKX"
                    },
                    {
                        name: "Binance",
                        link: "Orders/Binance"
                    },
                ]
                break
            }
            case "Coins": {
                arrayRoute = [
                    {
                        name: "ByBit",
                        link: "Coins/ByBit/Futures"
                    },
                    {
                        name: "OKX",
                        link: "Coins/OKX/Spot"
                    },
                    {
                        name: "Binance",
                        link: "Coins/Binance/Futures"
                    },
                ]
                break
            }
            default: {
                return []
            }
        }
        return arrayRoute.filter(route => userData?.roleName != "SuperAdmin" ? roleList.find(item => item.includes("/") && route.link.includes(item)) : true)

    }


    useEffect(() => {
        handleVerifyLogin()

    }, []);

    useEffect(() => {

        window.innerWidth <= 740 && setMarginLeft("")
        window.scrollTo(0, 0)
        if (userData) {
            const locationPath = location.pathname;
            const platformMap = [
                "ByBit/V3",
                "ByBit/V1",
                "OKX/V1",
                "OKX/V3",
                "Binance/V3",
            ]
            const platformTypeOld = localStorage.getItem("platformType")

            let platformType = ""

            for (const platform of platformMap) {
                const platformSplit = platform.split('/')
                if (locationPath.includes(platform)) {
                    platformType = platform
                }
                else if (locationPath.includes(platformSplit[0])) {
                    if (!platformTypeOld.includes(platformSplit[0])) {

                        const version = platformSplit[1]
                        switch (platformSplit[0]) {
                            case "OKX":
                                {
                                    platformType = `OKX/${version ? version : "V3"}`
                                    break
                                }
                            case "ByBit":
                                {
                                    platformType = `ByBit/${version ? version : "V3"}`
                                    break
                                }
                            case "Binance":
                                {
                                    platformType = `Binance/${version ? version : "V3"}`
                                    break
                                }
                        }
                    }
                }

                if (platformType) {
                    break
                }
            }
            
            platformType = platformType || platformTypeOld || "ByBit/V3"
            platformType =(roleList.includes(platformType) || userData?.roleName == "SuperAdmin") ? platformType  : "ByBit/V3"

            localStorage.setItem("platformType", platformType);

            let newData = {
                config: "",
                pos: platformType
            }

            switch (platformType?.split("/")?.[1]) {
                case "V1": {
                    newData.config = `${platformType}/Margin`
                    break
                }
                case "V3": {
                    newData.config = `${platformType}/Config`
                    break
                }
            }
            newData.pos = newData.pos.split("/")[0]

            if (locationPath.includes("Configs") && locationPath.includes(platformType)) {
                let botTypeForGetFuture = ""
                switch (platformType) {
                    case "ByBit/V3":
                        {
                            botTypeForGetFuture = "ByBit_V3"
                            setSwitchPageValue("ByBit_V3")
                            break
                        }
                    case "ByBit/V1":
                        {
                            botTypeForGetFuture = "ByBit_V1"
                            setSwitchPageValue("ByBit_V1")
                            break
                        }
                    case "OKX/V1":
                        {
                            botTypeForGetFuture = "OKX_V1"
                            setSwitchPageValue("OKX_V1")
                            break
                        }
                    case "OKX/V3":
                        {
                            botTypeForGetFuture = "OKX_V3"
                            setSwitchPageValue("OKX_V3")
                            break
                        }
                    case "Binance/V3":
                        {
                            botTypeForGetFuture = "Binance_V3"
                            setSwitchPageValue("Binance_V3")
                            break
                        }
                }

                botTypeForGetFuture && getTotalFutureBotByBotType(botTypeForGetFuture).then(res => {
                    const { data: resData } = res
                    dispatch(setTotalFuture({
                        total: (+resData.data.total).toFixed(1) || 0,
                        avai: (+resData.data.avai).toFixed(1) || 0,
                        botType: botTypeForGetFuture
                    }))
                })
            }
            else {
                setSwitchPageValue(newData.pos)

            }
            setLinkConfigAndPosition(newData)
        }

    }, [location, userData,roleList]);


    return (
        <div
            className={styles.mainlayout}
            style={{
                "--marginLeft": marginLeft
            }}
        >
            <Helmet title={`${getRouteName() || "Dashboard"} | CyberBot`} />
            <div className={styles.heading}>
                <Heading
                    toggleSidebar={toggleSidebar}
                    userData={userData}
                />
            </div>
            <div
                className={styles.body}
                onClick={() => {
                    window.innerWidth <= 740 && setMarginLeft("")
                }}>
                <SideBar
                    openSidebar={marginLeft}
                    roleList={roleList}
                    linkConfigAndPosition={linkConfigAndPosition}
                    roleName={userData?.roleName}
                />
                <div className={styles.content}>
                    <div className={styles.contentMain}>
                        <div className={styles.title} style={{
                            display: getRouteName() == "Bots" ? "block" : "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}>
                            <p style={{
                                fontSize: "1.5rem",
                                fontWeight: "500",
                                color: "var(--textColor)",
                                marginRight: "12px"
                            }}>{getRouteName()}</p>
                            {
                                getRouteName() == "Bots" ? (
                                    <div role="presentation" style={{ marginTop: "6px" }} >
                                        {location.pathname !== "/" && (
                                            handleBreadcrumbs()
                                        )}
                                    </div>
                                ) : (
                                    viewSwitchPage()?.length > 0 && (
                                        <div >
                                            {
                                                viewSwitchPage().map(item => {
                                                    const link = item.link
                                                    const name = item.name
                                                    return <span
                                                        className={switchPageValue == name ? styles.activeLink : undefined}
                                                        key={link}
                                                        style={{
                                                            margin: "0 10px"
                                                        }}
                                                        onClick={() => {
                                                            navigate(link)
                                                        }}
                                                    >
                                                        {name}
                                                    </span>
                                                })
                                            }
                                        </div>
                                    )
                                )
                            }


                        </div>
                        <div style={{
                            backgroundColor: "var(--bgColor)",
                            padding: "12px 0",
                            borderRadius: "5px",
                        }}>
                            <Outlet />
                        </div>
                    </div>
                    <div className={styles.footer}>
                        © Copyright <b>CYBER TEAM</b>. All Rights Reserved
                    </div>
                </div>
            </div>

            <div className={styles.footerLink}>
                {
                    linkList.map(item => (

                        <NavLink
                            className={({ isActive }) => clsx(styles.footerLinkItem, isActive ? styles.active : undefined)}
                            to={item.link}
                            key={item.link}
                        >
                            {item.icon}
                            <p className={styles.footerLinkItemName}>{item.name}</p>
                        </NavLink>
                    ))
                }
            </div>

        </div>
    );
}

export default memo(MainLayout);