import { Tabs, Tab } from "@mui/material";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";


function StrategiesV3Tab() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }
    const userData = useSelector(state => state.userDataSlice.userData)

    const tabList = [
        {
            label: "Config",
            value: "Configs/ByBit/V3/Config",
        },
        // {
        //     label: "Wave",
        //     value: "Configs/ByBit/V3/Wave",
        // },
        {
            label: "BigBabol",
            value: "Configs/ByBit/V3/BigBabol",
        }
    ]

    
    return (
            <Tabs value={location.pathname?.replace("/","")} onChange={handleChangeTab}>
                {
                    tabList.map(item => {
                        const value = item.value
                        return (
                            (userData?.roleName != "SuperAdmin" ? userData.roleList.find(item=>value.includes(item)) : true) && <Tab label={item.label} value={value} key = {value}></Tab>
                        )
                    })
                }
            </Tabs>
    );
}

export default StrategiesV3Tab;