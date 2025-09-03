import styles from "./BotDetail.module.scss"
import { Tab, Tabs } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import Overview from "./components/Overview";
import Wallet from "./components/Wallet";
import Api from "./components/Api";
import Setting from "./components/Setting";
import AddBreadcrumbs from "../../../../components/BreadcrumbsCutom";
import { getBotByID } from "../../../../services/botService";
import { addMessageToast } from "../../../../store/slices/Toast";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";


function BotDetail() {


    const [tabNumber, setTabNumber] = useState("Overview");
    const dispatch = useDispatch();

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Overview":
                return (
                    <Overview
                        getBotData={getBotData}
                        botData={botData}
                    />
                )

            case "Wallet":
                return <Wallet />
            case "Api":
                return <Api />
            case "Setting":
                return <Setting
                        getBotData={getBotData}
                        botData={botData}
                />
        }
    }

    const { botID } = useParams()
    const [botData, setBotData] = useState();

    const getBotData = useCallback(async() => {
            try {
                const res = await getBotByID(botID)
                const data = res.data.data;

                // let expiredAt
                // try {
                //     const resApi = await getApiInfo(data)
                //     const { data: expiredAtRes } = resApi.data
                //     expiredAt = expiredAtRes
                // } catch (error) {
                //     dispatch(addMessageToast({
                //         status: 500,
                //         message: "Get Bot API Error",
                //     }))
                // }
                const userData = data.userID
                setBotData(
                    {
                        ...data,
                        id: data?._id,
                        Created: data?.Created && new Date(data?.Created).toLocaleDateString(),
                        UserCreated: `${userData?.userName} ( ${userData?.roleName} )`
                        // expire: expiredAt ? new Date(expiredAt).toLocaleString() : ""
                    })
            } catch (error) {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Get Bot Detail Error",
                }))
            }
    }, [botID])

    useEffect(() => {
        getBotData()
    }, []);
    return (
        <div className={styles.botDetail}>
            <AddBreadcrumbs list={["Bots", "Detail"]} />

            <Tabs value={tabNumber} onChange={handleChangeTab}>
                <Tab label="Overview" value="Overview" ></Tab>
                <Tab label="Wallet" value="Wallet"></Tab>
                <Tab label="Api" value="Api"></Tab>
                <Tab label="Setting" value="Setting"></Tab>
            </Tabs>
            <div style={{
                marginTop: "24px"
            }}>
                {handleTabContent()}
            </div>

        </div>
    );
}

export default BotDetail;