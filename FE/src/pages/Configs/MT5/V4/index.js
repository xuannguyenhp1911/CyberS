import { Tabs, Tab, Button } from "@mui/material";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { testMT5 } from "../../../../services/Configs/MT5/V4/configService";


function MT5V4Tab() {

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
        {
            label: "BigBabol",
            value: "Configs/ByBit/V3/BigBabol",
        }
    ]


    return (
        // <Tabs value={location.pathname?.replace("/","")} onChange={handleChangeTab}>
        //     {
        //         tabList.map(item => {
        //             const value = item.value
        //             return (
        //                 (userData?.roleName != "SuperAdmin" ? userData.roleList.find(item=>value.includes(item)) : true) && <Tab label={item.label} value={value} key = {value}></Tab>
        //             )
        //         })
        //     }
        // </Tabs>
        <Button
            variant="contained"
            onClick={async () => {
                try {
                    const resdata = await testMT5({ a: "1" })
                } catch (error) {
                    console.log(error);

                }
            }}
        >
            test
        </Button>
    );
}

export default MT5V4Tab;