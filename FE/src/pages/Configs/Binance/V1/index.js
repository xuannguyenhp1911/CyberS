import { Tabs, Tab } from "@mui/material";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";


function StrategiesMargin() {

    const userData = useSelector(state => state.userDataSlice.userData)
    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }


    const tabList = [
        {
            label: "Spot",
            value: "Configs/ByBit/V1/Spot",
        },
        {
            label: "Margin",
            value: "Configs/ByBit/V1/Margin",
        },
        {
            label: "BigBabol",
            value: "Configs/ByBit/V1/BigBabol",
        }
    ]

    return (
        <Tabs value={location.pathname?.replace("/", "")} onChange={handleChangeTab}>
            {
                tabList.map(item => {
                    const value = item.value
                    return (
                        (userData?.roleName != "SuperAdmin" ? (userData?.roleName != "SuperAdmin" ? userData.roleList.find(item=>value.includes(item)) : true) : true) && <Tab label={item.label} value={value} key={value}></Tab>
                    )
                })
            }
        </Tabs>
    );
}

export default StrategiesMargin;