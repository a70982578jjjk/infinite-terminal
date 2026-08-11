const MODULE_NAME = "infinite_terminal";

const STATE_KEY = "infinite_terminal_state";

const INJECTION_KEY = "infinite_terminal_prompt";

const STATE_START = "<INFINITE_TERMINAL_STATE>";

const STATE_END = "</INFINITE_TERMINAL_STATE>";


const DEFAULT_SETTINGS = {
    enabled: true,

    terminalInstruction: "",

    buttonPosition: {
        left: null,
        top: null
    }
};


// ============================================================
// SillyTavern Context
// ============================================================

function getContext() {

    if (
        typeof SillyTavern === "undefined"
        ||
        typeof SillyTavern.getContext !== "function"
    ) {

        return null;

    }

    return SillyTavern.getContext();

}


// ============================================================
// Settings
// ============================================================

function getSettings() {

    const context = getContext();

    if (!context) {
        return DEFAULT_SETTINGS;
    }


    if (!context.extensionSettings) {
        context.extensionSettings = {};
    }


    if (!context.extensionSettings[MODULE_NAME]) {

        context.extensionSettings[MODULE_NAME] =
            structuredClone(DEFAULT_SETTINGS);

    }


    const settings =
        context.extensionSettings[MODULE_NAME];


    if (typeof settings.enabled !== "boolean") {
        settings.enabled = true;
    }


    if (
        typeof settings.terminalInstruction
        !== "string"
    ) {

        settings.terminalInstruction = "";

    }


    if (!settings.buttonPosition) {

        settings.buttonPosition = {
            left: null,
            top: null
        };

    }


    return settings;

}


function saveSettings() {

    const context = getContext();

    if (
        context
        &&
        typeof context.saveSettingsDebounced
        === "function"
    ) {

        context.saveSettingsDebounced();

    }

}


// ============================================================
// 空白终端状态
// ============================================================

function createEmptyState() {

    return {

        version: 1,

        system: {

            mood: "◎",

            id: "WAITING",

            location: "等待剧情同步",

            time: "--:--:--"

        },

        commentary:
            "终端尚未收到本聊天的 AI 状态数据。发送一轮消息后，这里会自动同步。",

        quests: {

            main: [],

            side: []

        },

        shop: [],

        inventory: []

    };

}


// ============================================================
// 当前聊天状态
// ============================================================

function getChatState() {

    const context = getContext();

    if (!context) {
        return createEmptyState();
    }


    const metadata =
        context.chatMetadata || {};


    const state =
        metadata[STATE_KEY];


    if (!state || typeof state !== "object") {

        return createEmptyState();

    }


    return normalizeState(state);

}


// ============================================================
// 状态标准化
// ============================================================

function normalizeState(raw) {

    const state =
        raw && typeof raw === "object"
            ? structuredClone(raw)
            : createEmptyState();


    if (!state.system || typeof state.system !== "object") {

        state.system = {};

    }


    state.system.mood =
        String(
            state.system.mood ?? "◎"
        );


    state.system.id =
        String(
            state.system.id ?? "UNKNOWN"
        );


    state.system.location =
        String(
            state.system.location ?? "UNKNOWN"
        );


    state.system.time =
        String(
            state.system.time ?? "--:--:--"
        );


    state.commentary =
        String(
            state.commentary ?? ""
        );


    if (!state.quests || typeof state.quests !== "object") {

        state.quests = {};

    }


    if (!Array.isArray(state.quests.main)) {

        state.quests.main = [];

    }


    if (!Array.isArray(state.quests.side)) {

        state.quests.side = [];

    }


    if (!Array.isArray(state.shop)) {

        state.shop = [];

    }


    if (!Array.isArray(state.inventory)) {

        state.inventory = [];

    }


    return state;

}


// ============================================================
// 保存当前聊天状态
// ============================================================

async function saveChatState(state) {

    const context = getContext();

    if (!context) {
        return;
    }


    if (!context.chatMetadata) {

        context.chatMetadata = {};

    }


    context.chatMetadata[STATE_KEY] =
        normalizeState(state);


    if (
        typeof context.saveMetadata
        === "function"
    ) {

        await context.saveMetadata();

    }

}


// ============================================================
// Prompt Injection
// ============================================================

function clearTerminalPrompt() {

    const context = getContext();

    if (
        context
        &&
        typeof context.setExtensionPrompt
        === "function"
    ) {

        context.setExtensionPrompt(
            INJECTION_KEY,
            "",
            1,
            0,
            false
        );

    }

}


function buildTerminalPrompt() {

    const settings =
        getSettings();


    const state =
        getChatState();


    const instruction =
        settings.terminalInstruction
        ||
        "未设置无限流终端 AI 规则。";


    const stateJson =
        JSON.stringify(
            state,
            null,
            2
        );


    return `

<INFINITE_TERMINAL_PROTOCOL>

${instruction}


【扩展通信层】

你现在正在维护一个由外部 SillyTavern 扩展显示的“无限流个人终端”。

终端状态与正文分离。

你必须继续正常生成角色正文，不要把终端内容写进正文叙事。

每次角色正文结束后，必须额外生成一份最新的完整终端状态。

扩展会自动读取这份状态，并把它转换成可视化终端。

因此：

【必须每轮完整输出状态】

不要只输出发生变化的字段。

每一轮都必须输出完整的当前状态。

当前状态中没有发生变化的内容必须原样保留。

发生变化的内容必须更新。

已经完成并且应该消失的任务必须从数组中删除。

获得新物品必须新增 inventory 项。

消耗、丢失或明确移除的物品必须从 inventory 数组中删除。

主线任务和支线任务数组没有数量上限。

inventory 数组没有数量上限。

理论上可以有任意数量的任务和物品。

不要为了“整齐”主动限制数量。

商城固定为 7 个商品。

每一轮商城都必须重新检查并根据剧情、副本环境和当前状态更新。

【任务状态】

quests.main 保存所有当前主线任务。

quests.side 保存所有当前支线任务。

status 可以使用：

active
completed_unsettled
failed
delayed

completed_unsettled 表示任务已经完成，但奖励尚未正式结算。

对于 completed_unsettled 任务，终端 UI 会自动显示删除线效果。

彻底完成并结算的任务，不要继续保留。

如果任务失败或延期，更新 status 和相关详情。

【背包】

inventory 是动态数组。

绝对不要假设只有 inventory[0]、inventory[1]、inventory[2]。

需要多少格就输出多少格。

【商城】

shop 必须保持 7 个商品。

商品 1~3 是高阶专区。

商品 4~7 是二手坑人地摊。

每轮都根据剧情实时刷新商品。

【状态继承】

以下是当前聊天上一轮已经保存的终端状态：

<CURRENT_TERMINAL_STATE>

${stateJson}

</CURRENT_TERMINAL_STATE>

你必须以 CURRENT_TERMINAL_STATE 为基础继续维护。

除非当前剧情明确改变，否则不要凭空删除任务、物品或其他状态。

不要重置整个终端。

不要因为生成新回复而遗忘旧状态。

【输出格式】

角色正文正常输出。

正文结束后，在最末尾严格输出：

${STATE_START}

然后输出一个合法、完整、可解析的 JSON 对象。

最后输出：

${STATE_END}

${STATE_START} 与 ${STATE_END} 之间只能放 JSON。

禁止使用 Markdown 代码围栏。

禁止在 JSON 内加入解释。

禁止在 JSON 前后加入额外说明。

JSON 必须符合下面的结构：

{
  "version": 1,

  "system": {
    "mood": "系统表情或颜文字",
    "id": "当前终端档案ID",
    "location": "当前地点",
    "time": "当前时间"
  },

  "commentary": "本轮全新高维吐槽",

  "quests": {
    "main": [
      {
        "name": "主线任务名称",
        "detail": "任务目标、限定时间、隐藏风险或失败代价",
        "reward": "具体奖励",
        "status": "active"
      }
    ],

    "side": [
      {
        "name": "支线任务名称",
        "detail": "任务详情",
        "reward": "具体奖励",
        "status": "active"
      }
    ]
  },

  "shop": [
    {
      "name": "商品名称",
      "price": 22000,
      "description": "商品描述、功效、副作用或限制"
    }
  ],

  "inventory": [
    {
      "name": "物品名称",
      "detail": "当前状态、耐久、来历或吐槽"
    }
  ]
}

quests.main 可以无限增加。

quests.side 可以无限增加。

inventory 可以无限增加。

shop 必须恰好保持 7 个商品。

commentary 每轮必须重新生成，并针对本轮 user 的动作、对话和剧情进行实时分析。

${STATE_END}

</INFINITE_TERMINAL_PROTOCOL>

`;

}


// ============================================================
// 每次 AI 生成前注入
// ============================================================

globalThis.infiniteTerminalGenerateInterceptor =
    async function (
        chat,
        contextSize,
        abort,
        type
    ) {

        const settings =
            getSettings();


        if (!settings.enabled) {

            clearTerminalPrompt();

            return;

        }


        // quiet/background generation 不要求生成终端状态，
        // 避免其他扩展的后台调用被强制要求输出 JSON。

        if (type === "quiet") {

            clearTerminalPrompt();

            return;

        }


        const context =
            getContext();


        if (
            !context
            ||
            typeof context.setExtensionPrompt
            !== "function"
        ) {

            console.error(
                "[无限流终端] 当前 SillyTavern 不支持 setExtensionPrompt。"
            );

            return;

        }


        const prompt =
            buildTerminalPrompt();


        context.setExtensionPrompt(
            INJECTION_KEY,
            prompt,
            1,
            0,
            false
        );


        console.debug(
            "[无限流终端] 已注入本聊天终端状态。"
        );

    };


// ============================================================
// JSON 解析
// ============================================================

function extractTerminalState(text) {

    if (
        typeof text !== "string"
        ||
        !text.includes(STATE_START)
    ) {

        return null;

    }


    const pattern =
        new RegExp(
            STATE_START.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            )
            +
            "\\s*([\\s\\S]*?)\\s*"
            +
            STATE_END.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            ),
            "i"
        );


    const match =
        text.match(pattern);


    if (!match) {

        return null;

    }


    let jsonText =
        match[1].trim();


    // 某些模型还是会偷偷加代码围栏。
    // 这里帮它清掉。

    jsonText =
        jsonText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


    try {

        const state =
            JSON.parse(jsonText);


        return {

            state:
                normalizeState(state),

            cleanText:
                (
                    text.slice(0, match.index)
                    +
                    text.slice(
                        match.index
                        +
                        match[0].length
                    )
                ).trim()

        };

    } catch (error) {

        console.error(
            "[无限流终端] JSON 解析失败：",
            error,
            jsonText
        );


        return {

            state: null,

            cleanText:
                text.slice(
                    0,
                    match.index
                ).trim()

        };

    }

}


// ============================================================
// AI 回复完成后读取终端状态
// ============================================================

async function handleMessageReceived() {

    const context =
        getContext();


    if (
        !context
        ||
        !Array.isArray(context.chat)
        ||
        context.chat.length === 0
    ) {

        return;

    }


    // 从最后往前寻找最新的 AI 消息。

    let messageIndex = -1;


    for (
        let i = context.chat.length - 1;
        i >= 0;
        i--
    ) {

        const message =
            context.chat[i];


        if (
            message
            &&
            !message.is_user
            &&
            !message.is_system
            &&
            typeof message.mes === "string"
        ) {

            messageIndex = i;

            break;

        }

    }


    if (messageIndex < 0) {

        return;

    }


    const message =
        context.chat[messageIndex];


    const result =
        extractTerminalState(
            message.mes
        );


    if (!result) {

        console.warn(
            "[无限流终端] 本轮 AI 回复没有找到终端 JSON。旧状态保持不变。"
        );

        updateSyncStatus(
            "⚠ 本轮未收到终端状态"
        );

        return;

    }


    if (!result.state) {

        console.warn(
            "[无限流终端] 找到了终端状态标记，但 JSON 无法解析。旧状态保持不变。"
        );

        updateSyncStatus(
            "⚠ JSON 解析失败，旧状态保持"
        );

        // 即使 JSON 错误，也把通信标记隐藏，
        // 防止用户看到内部协议。

        message.mes =
            result.cleanText;


        return;

    }


    // ========================================================
    // 把 JSON 从 AI 正文中删除
    // ========================================================

    message.mes =
        result.cleanText;


    // ========================================================
    // 保存到当前聊天 metadata
    // ========================================================

    await saveChatState(
        result.state
    );


    // ========================================================
    // 尽量立即保存聊天
    // ========================================================

    if (
        typeof context.saveChatConditional
        === "function"
    ) {

        try {

            await context.saveChatConditional();

        } catch (error) {

            console.debug(
                "[无限流终端] saveChatConditional 未执行：",
                error
            );

        }

    }


    // ========================================================
    // 立即刷新面板
    // ========================================================

    renderTerminal(
        result.state
    );


    updateSyncStatus(
        "● 实时同步"
    );


    console.debug(
        "[无限流终端] 本轮终端状态同步完成。",
        result.state
    );

}


// ============================================================
// 发送面板快捷指令到酒馆输入框
// ============================================================

function sendCommand(text) {

    const textarea =
        document.getElementById(
            "send_textarea"
        );


    if (!textarea) {

        try {

            navigator.clipboard.writeText(
                text
            );

            if (
                typeof toastr !== "undefined"
            ) {

                toastr.info(
                    "指令已复制，请粘贴到酒馆输入框。"
                );

            }

        } catch (error) {

            console.log(
                text
            );

        }

        return;

    }


    textarea.value =
        `${textarea.value}${text}`;


    textarea.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );


    textarea.focus();

}


// ============================================================
// HTML 安全转义
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// 任务名称状态处理
// ============================================================

function getQuestStatus(quest) {

    const status =
        String(
            quest?.status ?? "active"
        );


    const name =
        String(
            quest?.name ?? "未命名任务"
        );


    const hasStrike =
        name.includes("~~")
        ||
        status === "completed_unsettled";


    return {

        name:
            name
                .replace(/^~~/, "")
                .replace(/~~$/, "")
                .trim(),

        strike:
            hasStrike,

        status

    };

}


// ============================================================
// 渲染单个任务
// ============================================================

function renderQuest(
    quest,
    type
) {

    const safeQuest =
        quest && typeof quest === "object"
            ? quest
            : {};


    const status =
        getQuestStatus(
            safeQuest
        );


    if (
        status.status === "completed"
    ) {

        return "";

    }


    const label =
        type === "main"
            ? "主线任务"
            : "支线任务";


    const name =
        escapeHtml(
            status.name
        );


    const detail =
        escapeHtml(
            safeQuest.detail
            ?? ""
        );


    const reward =
        escapeHtml(
            safeQuest.reward
            ?? "未知"
        );


    const statusText = {

        active:
            "ACTIVE",

        completed_unsettled:
            "COMPLETED / 待结算",

        failed:
            "FAILED",

        delayed:
            "DELAYED"

    }[
        status.status
    ]
    ||
    escapeHtml(
        status.status
    );


    return `

        <div
            class="cyber-item quest-item
                   ${status.strike ? "quest-strike" : ""}"
        >

            <div class="cyber-item-label">

                ${label}

            </div>


            <div class="cyber-item-value">

                <div class="quest-title">

                    [ ${name} ]

                </div>


                <div class="quest-detail">

                    ${detail}

                </div>


                <div class="quest-reward">

                    REWARD:
                    ${reward}

                </div>


                <div class="quest-footer">

                    <span class="quest-status">
                        ${statusText}
                    </span>


                    <button
                        class="cyber-btn quest-command"
                        data-command="$接取任务：${escapeHtml(status.name)}"
                    >
                        PROCEED / 接取
                    </button>

                </div>

            </div>

        </div>

    `;

}


// ============================================================
// 渲染商城商品
// ============================================================

function renderShopItem(
    item,
    index
) {

    const safe =
        item && typeof item === "object"
            ? item
            : {};


    const name =
        escapeHtml(
            safe.name
            ?? "未同步商品"
        );


    const price =
        Number.isFinite(
            Number(safe.price)
        )
            ? Number(safe.price)
            : 0;


    const description =
        escapeHtml(
            safe.description
            ?? ""
        );


    const zone =
        index < 3
            ? "高阶专区"
            : "二手地摊";


    return `

        <div class="cyber-item shop-item">

            <div class="cyber-item-label">

                ${zone}

            </div>


            <div class="cyber-item-value">

                <div class="shop-top">

                    <span class="shop-name">

                        ${name}

                    </span>


                    <span class="highlight">

                        ${price.toLocaleString()}
                        PTS

                    </span>

                </div>


                <div class="shop-description">

                    ${description}

                </div>


                <div class="shop-actions">

                    <div class="qty-ctrl">

                        <button
                            class="qty-btn qty-minus"
                            type="button"
                        >
                            −
                        </button>


                        <span class="qty-val">

                            1

                        </span>


                        <button
                            class="qty-btn qty-plus"
                            type="button"
                        >
                            ＋
                        </button>

                    </div>


                    <button
                        class="cyber-btn shop-buy"
                        data-name="${name}"
                        data-price="${price}"
                    >
                        BUY / 购买
                    </button>

                </div>

            </div>

        </div>

    `;

}


// ============================================================
// 渲染背包
// ============================================================

function renderInventoryItem(
    item,
    index
) {

    const safe =
        item && typeof item === "object"
            ? item
            : {};


    const name =
        escapeHtml(
            safe.name
            ?? `未命名物品 ${index + 1}`
        );


    const detail =
        escapeHtml(
            safe.detail
            ?? ""
        );


    return `

        <div
            class="cyber-item cyber-bag-item"
            data-command="$使用/查看道具：${name}"
        >

            <div
                class="cyber-item-label
                       inventory-mark"
            ></div>


            <div
                class="cyber-item-value
                       inventory-value"
            >

                ${name}

                <span class="inventory-detail">

                    (${detail})

                </span>

            </div>

        </div>

    `;

}


// ============================================================
// 主渲染
// ============================================================

function renderTerminal(
    inputState
) {

    const state =
        normalizeState(
            inputState
        );


    const panel =
        document.getElementById(
            "infinite-terminal-container"
        );


    if (!panel) {
        return;
    }


    const system =
        state.system;


    const idElement =
        document.getElementById(
            "terminal-meta-id"
        );


    const locationElement =
        document.getElementById(
            "terminal-meta-location"
        );


    const timeElement =
        document.getElementById(
            "terminal-meta-time"
        );


    const moodElement =
        document.getElementById(
            "terminal-mood"
        );


    if (idElement) {

        idElement.textContent =
            system.id;

    }


    if (locationElement) {

        locationElement.textContent =
            system.location;

    }


    if (timeElement) {

        timeElement.textContent =
            system.time;

    }


    if (moodElement) {

        moodElement.textContent =
            system.mood;

    }


    const commentaryList =
        document.getElementById(
            "terminal-commentary-list"
        );


    if (commentaryList) {

        commentaryList.innerHTML = `

            <div class="cyber-item">

                <div class="cyber-item-label">

                    <span class="cyber-emoji">

                        ${escapeHtml(system.mood)}

                    </span>

                </div>


                <div class="cyber-item-value">

                    <span class="system-code">

                        SYS // REALTIME

                    </span>


                    ${escapeHtml(
                        state.commentary
                        || "暂无高维吐槽。"
                    )}

                </div>

            </div>

        `;

    }


    const mainList =
        document.getElementById(
            "terminal-main-quests"
        );


    if (mainList) {

        const html =
            state.quests.main
                .map(
                    quest =>
                        renderQuest(
                            quest,
                            "main"
                        )
                )
                .join("");


        mainList.innerHTML =
            html
            ||
            `

                <div class="cyber-empty">

                    [ NO ACTIVE MAIN QUEST ]

                </div>

            `;

    }


    const sideList =
        document.getElementById(
            "terminal-side-quests"
        );


    if (sideList) {

        const html =
            state.quests.side
                .map(
                    quest =>
                        renderQuest(
                            quest,
                            "side"
                        )
                )
                .join("");


        sideList.innerHTML =
            html
            ||
            `

                <div class="cyber-empty">

                    [ NO ACTIVE SIDE QUEST ]

                </div>

            `;

    }


    const shopList =
        document.getElementById(
            "terminal-shop-list"
        );


    if (shopList) {

        const shop =
            state.shop.slice(
                0,
                7
            );


        while (
            shop.length < 7
        ) {

            shop.push({});

        }


        shopList.innerHTML =
            shop
                .map(
                    (item, index) =>
                        renderShopItem(
                            item,
                            index
                        )
                )
                .join("");

    }


    const inventoryList =
        document.getElementById(
            "terminal-inventory-list"
        );


    if (inventoryList) {

        inventoryList.innerHTML =
            state.inventory.length

                ?

                state.inventory
                    .map(
                        (item, index) =>
                            renderInventoryItem(
                                item,
                                index
                            )
                    )
                    .join("")

                :

                `

                    <div class="cyber-empty">

                        [ INVENTORY EMPTY ]

                    </div>

                `;

    }


    bindDynamicButtons();

}


// ============================================================
// 动态按钮绑定
// ============================================================

function bindDynamicButtons() {

    document
        .querySelectorAll(
            ".quest-command"
        )
        .forEach(
            button => {

                button.onclick =
                    function () {

                        sendCommand(
                            ` ${this.dataset.command} `
                        );

                    };

            }
        );


    document
        .querySelectorAll(
            ".shop-buy"
        )
        .forEach(
            button => {

                button.onclick =
                    function () {

                        const parent =
                            this.closest(
                                ".shop-item"
                            );


                        const qty =
                            parseInt(
                                parent
                                    ?.querySelector(
                                        ".qty-val"
                                    )
                                    ?.textContent
                                ||
                                "1"
                            );


                        const name =
                            this.dataset.name;


                        const price =
                            Number(
                                this.dataset.price
                            );


                        sendCommand(
                            ` $花费 ${
                                price * qty
                            } 积分购买 ${
                                qty
                            } 个：${
                                name
                            } `
                        );

                    };

            }
        );


    document
        .querySelectorAll(
            ".qty-minus"
        )
        .forEach(
            button => {

                button.onclick =
                    function (event) {

                        event.stopPropagation();


                        const value =
                            this.parentElement
                                .querySelector(
                                    ".qty-val"
                                );


                        const current =
                            parseInt(
                                value.textContent
                            );


                        if (
                            current > 1
                        ) {

                            value.textContent =
                                current - 1;

                        }

                    };

            }
        );


    document
        .querySelectorAll(
            ".qty-plus"
        )
        .forEach(
            button => {

                button.onclick =
                    function (event) {

                        event.stopPropagation();


                        const value =
                            this.parentElement
                                .querySelector(
                                    ".qty-val"
                                );


                        const current =
                            parseInt(
                                value.textContent
                            );


                        value.textContent =
                            current + 1;

                    };

            }
        );


    document
        .querySelectorAll(
            ".cyber-bag-item"
        )
        .forEach(
            item => {

                item.onclick =
                    function () {

                        sendCommand(
                            ` ${this.dataset.command} `
                        );

                    };

            }
        );

}


// ============================================================
// 同步状态文字
// ============================================================

function updateSyncStatus(
    text
) {

    const element =
        document.getElementById(
            "terminal-sync-status"
        );


    if (element) {

        element.textContent =
            text;

    }

}


// ============================================================
// 终端内部关闭按钮
// ============================================================

function closeTerminal() {

    const panel =
        $("#infinite-terminal-container");


    if (panel.length) {

        panel.stop(
            true,
            true
        ).fadeOut(180);

    }

}


function toggleTerminal() {

    const panel =
        $("#infinite-terminal-container");


    if (!panel.length) {
        return;
    }


    panel
        .stop(
            true,
            true
        )
        .fadeToggle(180);

}


// ============================================================
// 内部关闭按钮
// ============================================================

function createTerminalCloseButton() {

    const panel =
        $("#infinite-terminal-container");


    if (!panel.length) {
        return;
    }


    if (
        $("#infinite-terminal-close")
            .length
    ) {

        return;

    }


    panel.append(`

        <button
            id="infinite-terminal-close"
            type="button"
            aria-label="关闭无限流终端"
        >
            ×
        </button>

    `);


    $("#infinite-terminal-close")
        .on(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                closeTerminal();

            }
        );

}


// ============================================================
// 悬浮按钮
// ============================================================

function createFloatingButton() {

    if (
        $("#floating-terminal-btn")
            .length
    ) {

        return;

    }


    const settings =
        getSettings();


    $("body").append(`

        <div
            id="floating-terminal-btn"
            role="button"
            aria-label="无限流终端"
        >

            <span class="floating-dot"></span>

            <span>

                ◈ 终端

            </span>

        </div>

    `);


    const button =
        $("#floating-terminal-btn");


    function applyPosition() {

        const width =
            button.outerWidth();


        const height =
            button.outerHeight();


        let left =
            settings.buttonPosition.left;


        let top =
            settings.buttonPosition.top;


        if (
            typeof left !== "number"
            ||
            typeof top !== "number"
        ) {

            left =
                window.innerWidth
                - width
                - 24;


            top =
                window.innerHeight
                - height
                - 110;

        }


        left =
            Math.max(
                8,
                Math.min(
                    left,
                    window.innerWidth
                    - width
                    - 8
                )
            );


        top =
            Math.max(
                8,
                Math.min(
                    top,
                    window.innerHeight
                    - height
                    - 8
                )
            );


        button.css({

            left:
                `${left}px`,

            top:
                `${top}px`,

            right:
                "auto",

            bottom:
                "auto",

            zIndex:
                "2147483647"

        });

    }


    requestAnimationFrame(
        applyPosition
    );


    let dragging = false;

    let moved = false;

    let startX = 0;

    let startY = 0;

    let startLeft = 0;

    let startTop = 0;


    button.on(
        "pointerdown",
        function (event) {

            if (
                event.pointerType === "mouse"
                &&
                event.button !== 0
            ) {

                return;

            }


            const rect =
                button[0]
                    .getBoundingClientRect();


            dragging = true;

            moved = false;


            startX =
                event.clientX;

            startY =
                event.clientY;


            startLeft =
                rect.left;

            startTop =
                rect.top;


            button.css(
                "cursor",
                "grabbing"
            );


            try {

                button[0]
                    .setPointerCapture(
                        event.pointerId
                    );

            } catch (error) {}


            event.preventDefault();

            event.stopPropagation();

        }
    );


    button.on(
        "pointermove",
        function (event) {

            if (!dragging) {
                return;
            }


            const dx =
                event.clientX
                - startX;


            const dy =
                event.clientY
                - startY;


            if (
                Math.abs(dx) > 4
                ||
                Math.abs(dy) > 4
            ) {

                moved = true;

            }


            const width =
                button.outerWidth();


            const height =
                button.outerHeight();


            const left =
                Math.max(
                    8,
                    Math.min(
                        startLeft + dx,
                        window.innerWidth
                        - width
                        - 8
                    )
                );


            const top =
                Math.max(
                    8,
                    Math.min(
                        startTop + dy,
                        window.innerHeight
                        - height
                        - 8
                    )
                );


            button.css({

                left:
                    `${left}px`,

                top:
                    `${top}px`

            });


            event.preventDefault();

            event.stopPropagation();

        }
    );


    button.on(
        "pointerup pointercancel",
        function (event) {

            if (!dragging) {
                return;
            }


            dragging = false;


            button.css(
                "cursor",
                "grab"
            );


            const rect =
                button[0]
                    .getBoundingClientRect();


            settings.buttonPosition.left =
                rect.left;


            settings.buttonPosition.top =
                rect.top;


            saveSettings();


            if (!moved) {

                toggleTerminal();

            }


            try {

                button[0]
                    .releasePointerCapture(
                        event.pointerId
                    );

            } catch (error) {}


            event.preventDefault();

            event.stopPropagation();

        }
    );


    $(window).on(
        "resize.infiniteTerminalButton",
        function () {

            applyPosition();

        }
    );

}


// ============================================================
// 加载终端
// ============================================================

async function loadTerminal() {

    if (
        $("#infinite-terminal-container")
            .length
    ) {

        renderTerminal(
            getChatState()
        );

        return;

    }


    try {

        const html =
            await $.get(
                "./scripts/extensions/third-party/infinite-terminal/index.html"
            );


        $("body").append(`

            <div
                id="infinite-terminal-container"
            >

                ${html}

            </div>

        `);


        createTerminalCloseButton();

        createFloatingButton();


        renderTerminal(
            getChatState()
        );


        console.log(
            "[无限流终端] 终端 UI 加载完成。"
        );


    } catch (error) {

        console.error(
            "[无限流终端] 终端加载失败：",
            error
        );


        if (
            typeof toastr !== "undefined"
        ) {

            toastr.error(
                "无限流终端加载失败，请查看控制台。"
            );

        }

    }

}


// ============================================================
// 卸载
// ============================================================

function unloadTerminal() {

    clearTerminalPrompt();


    $("#floating-terminal-btn")
        .remove();


    $("#infinite-terminal-container")
        .remove();


    $(window).off(
        "resize.infiniteTerminalButton"
    );

}


// ============================================================
// 清空当前聊天状态
// ============================================================

async function clearCurrentChatState() {

    const context =
        getContext();


    if (!context) {
        return;
    }


    if (!context.chatMetadata) {

        context.chatMetadata = {};

    }


    context.chatMetadata[STATE_KEY] =
        createEmptyState();


    if (
        typeof context.saveMetadata
        === "function"
    ) {

        await context.saveMetadata();

    }


    renderTerminal(
        createEmptyState()
    );


    updateSyncStatus(
        "● 已清空当前聊天状态"
    );

}


// ============================================================
// 设置页面
// ============================================================

function createSettingsUI() {

    if (
        $("#infinite-terminal-settings")
            .length
    ) {

        return;

    }


    const settings =
        getSettings();


    $("#extensions_settings")
        .append(`

            <div
                id="infinite-terminal-settings"
                class="inline-drawer"
            >

                <div
                    class="inline-drawer-toggle
                           inline-drawer-header"
                >

                    <b>

                        无限流个人终端设置

                    </b>


                    <div
                        class="inline-drawer-icon
                               fa-solid
                               fa-chevron-down"
                    ></div>

                </div>


                <div
                    class="inline-drawer-content"
                    style="display:block;"
                >


                    <label
                        class="checkbox_label"
                    >

                        <input
                            type="checkbox"
                            id="infinite-terminal-toggle"
                            ${
                                settings.enabled
                                    ? "checked"
                                    : ""
                            }
                        >


                        <span>

                            开启赛博终端悬浮窗

                        </span>

                    </label>


                    <hr>


                    <div class="terminal-setting-title">

                        无限流终端 AI 规则

                    </div>


                    <div
                        class="terminal-setting-help"
                    >

                        这里填写 AI 每轮维护无限流终端状态时必须遵守的规则。

                        <br><br>

                        扩展会自动把“当前聊天上一轮状态”和 JSON 通信协议注入 AI。

                        <br>

                        你不需要手动填写 terminal_data。

                        <br>

                        <b>
                            背包、主线、支线都是动态数组，没有数量上限。
                        </b>

                    </div>


                    <textarea
                        id="infinite-terminal-instruction"
                        placeholder="把你的无限流 terminal_instruction 粘贴到这里……"
                    ></textarea>


                    <button
                        id="infinite-terminal-save-instruction"
                        class="menu_button"
                    >

                        💾 保存无限流终端规则

                    </button>


                    <button
                        id="infinite-terminal-clear-state"
                        class="menu_button"
                        style="margin-top:8px;"
                    >

                        🗑 清空当前聊天终端状态

                    </button>


                    <div
                        id="infinite-terminal-save-status"
                    >

                        规则尚未修改

                    </div>


                </div>

            </div>

        `);


    $("#infinite-terminal-instruction")
        .val(
            settings.terminalInstruction
        );


    $("#infinite-terminal-toggle")
        .on(
            "change",
            function () {

                settings.enabled =
                    this.checked;


                saveSettings();


                if (
                    settings.enabled
                ) {

                    loadTerminal();

                } else {

                    unloadTerminal();

                }

            }
        );


    $("#infinite-terminal-instruction")
        .on(
            "input",
            function () {

                $("#infinite-terminal-save-status")
                    .text(
                        "规则已修改，记得点击保存。"
                    );

            }
        );


    $("#infinite-terminal-save-instruction")
        .on(
            "click",
            function () {

                settings.terminalInstruction =
                    $(
                        "#infinite-terminal-instruction"
                    )
                        .val();


                saveSettings();


                $("#infinite-terminal-save-status")
                    .text(
                        "✅ 无限流终端规则已保存！"
                    );


                if (
                    typeof toastr !== "undefined"
                ) {

                    toastr.success(
                        "无限流终端规则已保存！"
                    );

                }

            }
        );


    $("#infinite-terminal-clear-state")
        .on(
            "click",
            function () {

                clearCurrentChatState();

            }
        );

}


// ============================================================
// 聊天切换
// ============================================================

function registerEvents() {

    const context =
        getContext();


    if (!context) {
        return;
    }


    const {
        eventSource,
        event_types
    } = context;


    if (
        eventSource
        &&
        event_types
    ) {

        eventSource.on(
            event_types.MESSAGE_RECEIVED,
            async function () {

                await handleMessageReceived();

            }
        );


        eventSource.on(
            event_types.CHAT_CHANGED,
            function () {

                clearTerminalPrompt();


                setTimeout(
                    function () {

                        renderTerminal(
                            getChatState()
                        );

                        updateSyncStatus(
                            "● 当前聊天状态"
                        );

                    },
                    50
                );

            }
        );

    }


    $(document)
        .on(
            "keydown.infiniteTerminal",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    closeTerminal();

                }

            }
        );

}


// ============================================================
// 启动
// ============================================================

jQuery(
    async function () {

        try {

            getSettings();

            createSettingsUI();

            registerEvents();


            const settings =
                getSettings();


            if (
                settings.enabled
            ) {

                await loadTerminal();

            }


            console.log(
                "[无限流终端] AI 实时状态同步系统已启动。"
            );


        } catch (error) {

            console.error(
                "[无限流终端] 初始化失败：",
                error
            );

        }

    }
);
