import { Tabs, Tab } from "@mui/material";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";


function ConfigBinanceV3Tab() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }
    const userData = useSelector(state => state.userDataSlice.userData)
    
    const tabList = [
        {
            label: "Config",
            value: "Configs/Binance/V3/Config",
        },
        {
            label: "BigBabol",
            value: "Configs/Binance/V3/BigBabol",
        },
        {
            label: "Fomo",
            value: "Configs/Binance/V3/Fomo",
        },
    ]

    
    return (
            <Tabs value={location.pathname?.replace("/","")} onChange={handleChangeTab}>
                {
                    tabList.map(item => {
                        const value = item.value
                        return (
                            (userData?.roleName != "SuperAdmin" ? (userData?.roleName != "SuperAdmin" ? userData.roleList.find(item=>value.includes(item)) : true) : true) && <Tab label={item.label} value={value} key = {value}></Tab>
                        )
                    })
                }
            </Tabs>
    );
}

export default ConfigBinanceV3Tab;