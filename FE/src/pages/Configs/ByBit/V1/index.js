import { Tabs, Tab } from "@mui/material";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";


function ConfigV1TabByBit() {

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
            label: "Futures",
            value: "Configs/ByBit/V1/Futures",
        },
        {
            label: "BigBabol",
            value: "Configs/ByBit/V1/BigBabol",
        },
        // {
        //     label: "Raceme",
        //     value: "Configs/ByBit/V1/Raceme",
        // },
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

export default ConfigV1TabByBit;