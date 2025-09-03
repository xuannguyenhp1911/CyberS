import { Tabs, Tab } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";


function CoinsTabBinance() {

    const location = useLocation()

    const navigate = useNavigate()

    const handleChangeTab = (e, newValue) => {
        navigate(`/${newValue}`)
    }

    const tabList = [
        {
            label: "Futures",
            value: "Coins/Binance/Futures",
        },
        {
            label: "Group",
            value: "Coins/Binance/Group",
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

export default CoinsTabBinance;