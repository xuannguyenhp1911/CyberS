import { Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";


function CoinsTab() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }

    const tabList = [
        // {
        //     label: "Spot",
        //     value: "Coins/ByBit/Spot",
        // },
        {
            label: "Futures",
            value: "Coins/ByBit/Futures",
        },
        {
            label: "Group",
            value: "Coins/ByBit/Group",
        },

    ]


    return (
        <Tabs value={location.pathname?.replace("/", "")} onChange={handleChangeTab} style={{ marginBottom: "20px" }}>
            {
                tabList.map(item => {
                    const value = item.value
                    return (
                        <Tab label={item.label} value={value} key={value}></Tab>
                    )
                })
            }
        </Tabs>
    );
}

export default CoinsTab;