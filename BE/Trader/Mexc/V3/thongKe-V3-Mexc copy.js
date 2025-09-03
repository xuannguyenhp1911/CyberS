const { MarketClient, MainSocket, TradeClient, AccountClient } = require("../../../packages/mexc-api");

const tradeClient = new TradeClient({
    apiKey:"mx0vgl8dYI0bhjkS93",
    apiSecret:"3b39cb8f6a9241f9aef4af20b28bee0f"
})
const accountClient = new AccountClient({
    apiKey:"mx0vgl8dYI0bhjkS93",
    apiSecret:"3b39cb8f6a9241f9aef4af20b28bee0f"
})
const marketClient = new MarketClient()

const Main = async () => {
    const data = await tradeClient.placeOrder({
        symbol: "BTC_USDT",
        price: "110000",
        triggerPrice: "105000",
        vol: 10000,
        side: 3,
        type: 1,
        leverage: 20,
        triggerType: 1,
        positionType: 1
      });
      
    // const data = await marketClient.getTicker()
    // const data = await accountClient.getAccountAssets()
    console.log(data);
    
}

Main()




