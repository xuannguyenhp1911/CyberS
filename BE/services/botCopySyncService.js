const mongoose = require('../mongo');
const BotModel = require('../models/bot.model');

const StrategiesByBitV3Model = require('../models/Configs/ByBit/V3/config.model');
const WaveByBitV3Model = require('../models/Configs/ByBit/V3/wave.model');
const ScannerByBitV3Model = require('../models/Configs/ByBit/V3/scanner.model');

const SpotByBitV1Model = require('../models/Configs/ByBit/V1/spot.model');
const MarginByBitV1Model = require('../models/Configs/ByBit/V1/margin.model');
const FuturesByBitV1Model = require('../models/Configs/ByBit/V1/futures.model');
const ScannerByBitV1Model = require('../models/Configs/ByBit/V1/scanner.model');

const SpotOKXV1Model = require('../models/Configs/OKX/V1/spot.model');
const MarginOKXV1Model = require('../models/Configs/OKX/V1/margin.model');
const FuturesOKXV1Model = require('../models/Configs/OKX/V1/futures.model');
const ScannerOKXV1Model = require('../models/Configs/OKX/V1/scanner.model');

const ConfigOKXV3Model = require('../models/Configs/OKX/V3/config.model');
const ScannerOKXV3Model = require('../models/Configs/OKX/V3/scanner.model');

const ConfigBinanceV3ModelOld = require('../models/Configs/Binance/V3/configOld.model');
const ConfigBinanceV3Model = require('../models/Configs/Binance/V3/config.model');
const ScannerBinanceV3Model = require('../models/Configs/Binance/V3/scanner.model');

const BotController = require('../controllers/bot');

const CONFIG_SYNC_DELAY_MS = 500;

const syncByBotTypeTimers = new Map();
const syncByPairTimers = new Map();

const ROUTE_BOT_TYPE_MAP = [
    { prefix: '/api/configbybitv3', botType: 'ByBit_V3' },
    { prefix: '/api/wavebybitv3', botType: 'ByBit_V3' },
    { prefix: '/api/scannerbybitv3', botType: 'ByBit_V3' },

    { prefix: '/api/spotbybit', botType: 'ByBit_V1' },
    { prefix: '/api/marginbybit', botType: 'ByBit_V1' },
    { prefix: '/api/scannerbybitv1', botType: 'ByBit_V1' },
    { prefix: '/api/configbybitv1futures', botType: 'ByBit_V1' },

    { prefix: '/api/spotokx', botType: 'OKX_V1' },
    { prefix: '/api/marginokx', botType: 'OKX_V1' },
    { prefix: '/api/scannerokxv1', botType: 'OKX_V1' },
    { prefix: '/api/configokxv1futures', botType: 'OKX_V1' },

    { prefix: '/api/configokxv3', botType: 'OKX_V3' },
    { prefix: '/api/scannerokxv3', botType: 'OKX_V3' },

    { prefix: '/api/configbinancev3', botType: 'Binance_V3' },
    { prefix: '/api/configbinanceoldv3', botType: 'Binance_V3' },
    { prefix: '/api/scannerbinancev3', botType: 'Binance_V3' },
];

const COPY_PLAN_BY_BOT_TYPE = {
    ByBit_V3: {
        flatModels: [
            { model: ScannerByBitV3Model, scannerMap: true },
        ],
        childModels: [
            StrategiesByBitV3Model,
            WaveByBitV3Model,
        ],
    },
    ByBit_V1: {
        flatModels: [
            { model: ScannerByBitV1Model, scannerMap: true },
        ],
        childModels: [
            SpotByBitV1Model,
            MarginByBitV1Model,
            FuturesByBitV1Model,
        ],
    },
    Binance_V1: {
        flatModels: [
            { model: ScannerByBitV1Model, scannerMap: true },
        ],
        childModels: [
            SpotByBitV1Model,
            MarginByBitV1Model,
            FuturesByBitV1Model,
        ],
    },
    OKX_V1: {
        flatModels: [
            { model: ScannerOKXV1Model, scannerMap: true },
        ],
        childModels: [
            SpotOKXV1Model,
            MarginOKXV1Model,
            FuturesOKXV1Model,
        ],
    },
    OKX_V3: {
        flatModels: [
            { model: ScannerOKXV3Model, scannerMap: true },
        ],
        childModels: [
            ConfigOKXV3Model,
        ],
    },
    Binance_V3: {
        flatModels: [
            { model: ScannerBinanceV3Model, scannerMap: true },
            { model: ConfigBinanceV3Model, scannerMap: false },
        ],
        childModels: [
            ConfigBinanceV3ModelOld,
        ],
    },
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NON_SYNC_CONFIG_PATHS = [
    '/get',
    '/closeallbotforupcode',
];

const parseObjectId = (value) => {
    if (!value || !mongoose.isValidObjectId(value)) {
        return null;
    }
    return new mongoose.Types.ObjectId(value);
};

const cleanClone = (data) => {
    const clone = { ...data };
    delete clone._id;
    delete clone.__v;
    return clone;
};

const mergeScannerMap = (targetMap, nextMap) => {
    Object.keys(nextMap).forEach((followerID) => {
        if (!targetMap[followerID]) {
            targetMap[followerID] = {};
        }
        targetMap[followerID] = {
            ...targetMap[followerID],
            ...nextMap[followerID],
        };
    });
};

const copyFlatModelToFollowers = async ({
    model,
    masterBotID,
    followerBots,
    scannerMap = false,
}) => {
    const resultMap = {};
    if (!followerBots.length) {
        return resultMap;
    }

    const followerBotIDs = followerBots.map((item) => item._id);
    await model.deleteMany({ botID: { $in: followerBotIDs } });

    const sourceList = await model.find({ botID: masterBotID }).lean();
    if (!sourceList.length) {
        return resultMap;
    }

    const timeTemp = new Date().toString();
    const insertList = [];
    const scannerTraceList = [];

    followerBots.forEach((followerBot) => {
        sourceList.forEach((sourceItem) => {
            const clone = cleanClone(sourceItem);
            clone.botID = followerBot._id;
            if (followerBot.userID) {
                clone.userID = followerBot.userID;
            }
            clone.TimeTemp = timeTemp;

            insertList.push(clone);
            if (scannerMap) {
                scannerTraceList.push({
                    followerID: String(followerBot._id),
                    sourceID: String(sourceItem._id),
                });
            }
        });
    });

    const insertedList = insertList.length > 0 ? await model.insertMany(insertList) : [];
    if (!scannerMap) {
        return resultMap;
    }

    insertedList.forEach((insertedItem, idx) => {
        const trace = scannerTraceList[idx];
        if (!trace) {
            return;
        }
        if (!resultMap[trace.followerID]) {
            resultMap[trace.followerID] = {};
        }
        resultMap[trace.followerID][trace.sourceID] = insertedItem._id;
    });

    return resultMap;
};

const copyChildModelToFollowers = async ({
    model,
    masterBotID,
    followerBots,
    scannerMapByFollower = {},
}) => {
    if (!followerBots.length) {
        return;
    }

    const masterIDString = String(masterBotID);
    const followerIDList = followerBots.map((botItem) => botItem._id);
    const followerIDSet = new Set(followerIDList.map((item) => String(item)));
    const allBotIDList = [masterBotID, ...followerIDList];
    const syncTime = new Date().toString();

    const dataList = await model.find({
        children: {
            $elemMatch: {
                botID: { $in: allBotIDList }
            }
        }
    }).lean();

    if (!dataList.length) {
        return;
    }

    const updateList = dataList.map((dataItem) => {
        const childrenList = Array.isArray(dataItem.children) ? dataItem.children : [];
        const sourceChildren = childrenList.filter((childItem) => String(childItem.botID) === masterIDString);
        const keepChildren = childrenList.filter((childItem) => !followerIDSet.has(String(childItem.botID)));

        const nextChildren = [...keepChildren];

        followerBots.forEach((followerBot) => {
            const followerIDString = String(followerBot._id);
            const scannerMap = scannerMapByFollower[followerIDString] || {};

            sourceChildren.forEach((sourceChild) => {
                const childClone = cleanClone(sourceChild);
                childClone.botID = followerBot._id;
                if (followerBot.userID) {
                    childClone.userID = followerBot.userID;
                }
                childClone.TimeTemp = syncTime;

                if (childClone.scannerID) {
                    const mappedScannerID = scannerMap[String(childClone.scannerID)];
                    if (mappedScannerID) {
                        childClone.scannerID = mappedScannerID;
                    } else {
                        delete childClone.scannerID;
                    }
                }

                nextChildren.push(childClone);
            });
        });

        return {
            updateOne: {
                filter: { _id: dataItem._id },
                update: { $set: { children: nextChildren } },
            }
        };
    });

    updateList.length > 0 && await model.bulkWrite(updateList);
};

const getRealtimeDataByBotType = async ({ botType, botID }) => {
    switch (botType) {
        case 'ByBit_V3': {
            const configDataPromise = BotController.getAllConfigByBitV3ByBotID({ botID });
            const scannerDataPromise = ScannerByBitV3Model.find({ botID, IsActive: true }).populate(['botID', 'groupCoinOnlyPairsID', 'groupCoinBlacklistID']).lean();
            const [configData, scannerData] = await Promise.all([configDataPromise, scannerDataPromise]);
            return { configData, scannerData };
        }
        case 'ByBit_V1':
        case 'Binance_V1': {
            const configDataPromise = BotController.getAllConfigByBitV1ByBotID({ botID });
            const scannerDataPromise = ScannerByBitV1Model.find({ botID, IsActive: true }).populate(['botID']).lean();
            const [configData, scannerData] = await Promise.all([configDataPromise, scannerDataPromise]);
            return { configData, scannerData };
        }
        case 'OKX_V1': {
            const configDataPromise = BotController.getAllConfigOKXV1ByBotID({ botID });
            const scannerDataPromise = ScannerOKXV1Model.find({ botID, IsActive: true }).populate(['botID']).lean();
            const [configData, scannerData] = await Promise.all([configDataPromise, scannerDataPromise]);
            return { configData, scannerData };
        }
        case 'OKX_V3': {
            const configDataPromise = BotController.getAllConfigOKXV3ByBotID({ botID });
            const scannerDataPromise = ScannerOKXV3Model.find({ botID, IsActive: true }).populate(['botID', 'groupCoinOnlyPairsID', 'groupCoinBlacklistID']).lean();
            const [configData, scannerData] = await Promise.all([configDataPromise, scannerDataPromise]);
            return { configData, scannerData };
        }
        case 'Binance_V3': {
            const configDataPromise = ConfigBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', 'groupCoinOnlyPairsID', 'groupCoinBlacklistID']).lean();
            const scannerDataPromise = ScannerBinanceV3Model.find({ botID, IsActive: true }).populate(['botID', 'groupCoinOnlyPairsID', 'groupCoinBlacklistID']).lean();
            const [configData, scannerData] = await Promise.all([configDataPromise, scannerDataPromise]);
            return { configData, scannerData };
        }
        default:
            return { configData: [], scannerData: [] };
    }
};

const emitBotRealtimeAfterSync = async ({ botData, botType }) => {
    if (!botData?.serverIP) {
        return;
    }

    const newData = await getRealtimeDataByBotType({
        botType,
        botID: botData._id,
    });

    await BotController.sendDataRealtime({
        type: 'bot-update',
        data: {
            newData,
            botIDMain: botData._id,
            botActive: botData?.Status === 'Running',
            botData,
        },
        serverIP: botData.serverIP,
    });
};

const syncMasterConfigsToFollowers = async ({
    masterBot,
    followerBots = [],
}) => {
    if (!masterBot || !followerBots.length) {
        return { status: false, message: 'No follower bot' };
    }

    const syncPlan = COPY_PLAN_BY_BOT_TYPE[masterBot.botType];
    if (!syncPlan) {
        return { status: false, message: 'Unsupported bot type' };
    }

    const scannerMapByFollower = {};

    for (const flatItem of (syncPlan.flatModels || [])) {
        const newScannerMap = await copyFlatModelToFollowers({
            model: flatItem.model,
            masterBotID: masterBot._id,
            followerBots,
            scannerMap: flatItem.scannerMap,
        });
        mergeScannerMap(scannerMapByFollower, newScannerMap);
    }

    for (const childModel of (syncPlan.childModels || [])) {
        await copyChildModelToFollowers({
            model: childModel,
            masterBotID: masterBot._id,
            followerBots,
            scannerMapByFollower,
        });
    }

    await Promise.allSettled(followerBots.map((botItem) => emitBotRealtimeAfterSync({
        botData: botItem,
        botType: masterBot.botType,
    })));

    return {
        status: true,
        message: 'Synced',
        count: followerBots.length,
    };
};

const syncMasterToFollower = async ({ masterBotID, followerBotID }) => {
    const masterID = parseObjectId(masterBotID);
    const followerID = parseObjectId(followerBotID);
    if (!masterID || !followerID) {
        return { status: false, message: 'Invalid ID' };
    }

    const [masterBot, followerBot] = await Promise.all([
        BotModel.findById(masterID).lean(),
        BotModel.findById(followerID).lean(),
    ]);

    if (!masterBot || !followerBot) {
        return { status: false, message: 'Bot not found' };
    }
    if (String(masterBot._id) === String(followerBot._id)) {
        return { status: false, message: 'Master cannot equal follower' };
    }
    if (masterBot.botType !== followerBot.botType) {
        return { status: false, message: 'BotType mismatch' };
    }
    if (String(followerBot.botIDCopy || '') !== String(masterBot._id)) {
        return { status: false, message: 'Follower is not linked to master' };
    }

    return syncMasterConfigsToFollowers({
        masterBot,
        followerBots: [followerBot],
    });
};

const syncFollowersByBotType = async (botType) => {
    const masterBots = await BotModel.find({
        botType,
        botIDBeCopyList: { $exists: true, $ne: [] },
    }).lean();

    if (!masterBots.length) {
        return { status: true, message: 'No master to sync', count: 0 };
    }

    const resultList = await Promise.allSettled(masterBots.map(async (masterBot) => {
        const followerBots = await BotModel.find({
            _id: { $in: masterBot.botIDBeCopyList || [] },
            botIDCopy: masterBot._id,
            botType,
        }).lean();

        if (!followerBots.length) {
            return { status: true, message: 'No follower', count: 0 };
        }

        return syncMasterConfigsToFollowers({
            masterBot,
            followerBots,
        });
    }));

    return {
        status: true,
        message: 'Synced by bot type',
        count: resultList.reduce((prev, current) => {
            return prev + (current?.value?.count || 0);
        }, 0),
    };
};

const resolveBotTypeByPath = (pathLowerCase = '') => {
    const match = ROUTE_BOT_TYPE_MAP.find((item) => pathLowerCase.startsWith(item.prefix));
    return match?.botType;
};

const canAutoSyncFromRequest = ({
    method = '',
    pathLowerCase = '',
}) => {
    if (!MUTATING_METHODS.has(method)) {
        return false;
    }
    return !NON_SYNC_CONFIG_PATHS.some((item) => pathLowerCase.includes(item));
};

const scheduleSyncByBotType = (botType) => {
    const oldTimer = syncByBotTypeTimers.get(botType);
    oldTimer && clearTimeout(oldTimer);

    const nextTimer = setTimeout(async () => {
        syncByBotTypeTimers.delete(botType);
        try {
            await syncFollowersByBotType(botType);
        } catch (error) {
            console.log(`[!] Sync by botType failed (${botType}):`, error?.message || error);
        }
    }, CONFIG_SYNC_DELAY_MS);

    syncByBotTypeTimers.set(botType, nextTimer);
};

const scheduleSyncByMasterFollower = ({ masterBotID, followerBotID }) => {
    if (!masterBotID || !followerBotID) {
        return;
    }
    const pairKey = `${masterBotID}-${followerBotID}`;
    const oldTimer = syncByPairTimers.get(pairKey);
    oldTimer && clearTimeout(oldTimer);

    const nextTimer = setTimeout(async () => {
        syncByPairTimers.delete(pairKey);
        try {
            await syncMasterToFollower({ masterBotID, followerBotID });
        } catch (error) {
            console.log('[!] Sync by pair failed:', error?.message || error);
        }
    }, 150);

    syncByPairTimers.set(pairKey, nextTimer);
};

const scheduleSyncFromRequest = ({ req, status }) => {
    if (status !== 200 || !req) {
        return;
    }

    const pathLowerCase = ((req.originalUrl || req.url || '').split('?')[0] || '').toLowerCase();
    const method = (req.method || '').toUpperCase();

    if (pathLowerCase.startsWith('/api/bot/updatebotcopytrading')) {
        const followerBotID = req.body?.id;
        const masterBotID = req.body?.botIDCopy;
        if (followerBotID && masterBotID) {
            scheduleSyncByMasterFollower({ masterBotID, followerBotID });
        }
        return;
    }

    const botType = resolveBotTypeByPath(pathLowerCase);
    if (!botType) {
        return;
    }
    if (!canAutoSyncFromRequest({ method, pathLowerCase })) {
        return;
    }

    scheduleSyncByBotType(botType);
};

module.exports = {
    scheduleSyncFromRequest,
    syncMasterToFollower,
    syncFollowersByBotType,
};
