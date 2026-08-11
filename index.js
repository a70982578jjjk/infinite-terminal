const MODULE_NAME = 'infinite_terminal';
const PANEL_ID = 'infinite-terminal-panel';
const BUTTON_ID = 'floating-terminal-btn';
const META_KEY = 'infinite_terminal_state_v1';

const STATE_TAG =
    /<INFINITE_TERMINAL_STATE>\s*([\s\S]*?)\s*<\/INFINITE_TERMINAL_STATE>/i;

const DEFAULT_STATE = {
    systemMood: '⏳',
    comment: '终端等待本轮 AI 状态同步……',
    mainQuests: [],
    sideQuests: [],
    shop: [],
    inventory: [],
};


/* ============================================================
 * 基础工具
 * ============================================================ */

function clone(value) {
    return structuredClone(value);
}


function getContextSafe() {
    try {
        return typeof SillyTavern !== 'undefined' &&
            SillyTavern.getContext
            ? SillyTavern.getContext()
            : null;
    } catch (error) {
        console.error(
            `[${MODULE_NAME}] 无法读取 SillyTavern context`,
            error
        );

        return null;
    }
}


function getSettings() {
    const context = getContextSafe();
    const settings = context?.extensionSettings;

    if (!settings) {
        return {
            enabled: true,
            buttonX: null,
            buttonY: null,
        };
    }

    if (!settings[MODULE_NAME]) {
        settings[MODULE_NAME] = {
            enabled: true,
            buttonX: null,
            buttonY: null,
        };
    }

    if (
        typeof settings[MODULE_NAME].enabled !==
        'boolean'
    ) {
        settings[MODULE_NAME].enabled = true;
    }

    if (
        !Object.hasOwn(
            settings[MODULE_NAME],
            'buttonX'
        )
    ) {
        settings[MODULE_NAME].buttonX = null;
    }

    if (
        !Object.hasOwn(
            settings[MODULE_NAME],
            'buttonY'
        )
    ) {
        settings[MODULE_NAME].buttonY = null;
    }

    return settings[MODULE_NAME];
}


function saveSettings() {
    const context = getContextSafe();

    try {
        context?.saveSettingsDebounced?.();
    } catch (error) {
        console.warn(
            `[${MODULE_NAME}] 保存设置失败`,
            error
        );
    }
}


/* ============================================================
 * HTML 安全处理
 * ============================================================ */

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function textHtml(value) {
    return escapeHtml(value)
        .replace(/\r?\n/g, '<br>');
}


function displayStrike(value) {
    const text = String(value ?? '');

    if (
        text.startsWith('~~') &&
        text.endsWith('~~') &&
        text.length >= 4
    ) {
        return `<del>${textHtml(
            text.slice(2, -2)
        )}</del>`;
    }

    return textHtml(text);
}


function asArray(value) {
    return Array.isArray(value)
        ? value
        : null;
}


function normalizeItem(item) {
    if (typeof item === 'string') {
        return {
            name: item,
        };
    }

    if (!item || typeof item !== 'object') {
        return {
            name: String(item ?? ''),
        };
    }

    return item;
}


/* ============================================================
 * 状态标准化
 * ============================================================ */

function normalizeState(
    raw,
    previous = DEFAULT_STATE
) {
    const incoming =
        raw && typeof raw === 'object'
            ? raw
            : {};

    const next =
        clone(previous || DEFAULT_STATE);

    if (
        Object.hasOwn(
            incoming,
            'systemMood'
        )
    ) {
        next.systemMood =
            String(
                incoming.systemMood ?? ''
            );
    }

    if (
        Object.hasOwn(
            incoming,
            'comment'
        )
    ) {
        next.comment =
            String(
                incoming.comment ?? ''
            );
    }

    const arrayFields = [
        'mainQuests',
        'sideQuests',
        'shop',
        'inventory',
    ];

    for (const key of arrayFields) {
        if (
            Object.hasOwn(
                incoming,
                key
            )
        ) {
            const arr =
                asArray(
                    incoming[key]
                );

            if (arr !== null) {
                next[key] =
                    arr.map(
                        normalizeItem
                    );
            } else if (
                incoming[key] === null
            ) {
                next[key] = [];
            }
        }
    }

    return next;
}


/* ============================================================
 * 当前聊天状态
 * ============================================================ */

function getCurrentChatState() {
    const context =
        getContextSafe();

    const stored =
        context?.chatMetadata?.[
            META_KEY
        ];

    if (
        stored &&
        typeof stored === 'object'
    ) {
        return normalizeState(
            stored,
            DEFAULT_STATE
        );
    }

    return clone(
        DEFAULT_STATE
    );
}


async function saveCurrentChatState(
    state
) {
    const context =
        getContextSafe();

    if (!context?.chatMetadata) {
        return;
    }

    try {
        context.chatMetadata[
            META_KEY
        ] = clone(state);

        if (
            typeof context.saveMetadata ===
            'function'
        ) {
            await context.saveMetadata();
        }
    } catch (error) {
        console.error(
            `[${MODULE_NAME}] 保存聊天状态失败`,
            error
        );
    }
}


/* ============================================================
 * JSON 解析
 * ============================================================ */

function parseJsonText(text) {
    let candidate =
        String(text ?? '')
            .trim();

    candidate =
        candidate
            .replace(
                /^```(?:json)?\s*/i,
                ''
            )
            .replace(
                /\s*```$/i,
                ''
            )
            .trim();

    try {
        return JSON.parse(
            candidate
        );
    } catch (_) {
        const first =
            candidate.indexOf('{');

        const last =
            candidate.lastIndexOf('}');

        if (
            first >= 0 &&
            last > first
        ) {
            try {
                return JSON.parse(
                    candidate.slice(
                        first,
                        last + 1
                    )
                );
            } catch (__) {
                return null;
            }
        }
    }

    return null;
}


function extractTerminalState(
    messageText
) {
    const text =
        String(
            messageText ?? ''
        );

    const match =
        text.match(
            STATE_TAG
        );

    if (!match) {
        return null;
    }

    const parsed =
        parseJsonText(
            match[1]
        );

    if (
        !parsed ||
        typeof parsed !== 'object'
    ) {
        return null;
    }

    return parsed;
}


/* ============================================================
 * 面板 HTML 骨架
 *
 * 保留上一版赛博视觉需要的 class。
 * 数据本身仍然由最新 JSON 状态系统控制。
 * ============================================================ */

function buildPanelShell() {
    return `
        <button
            id="infinite-terminal-close"
            type="button"
            aria-label="关闭终端"
        >×</button>

        <div class="cyber-terminal-content">

            <div class="cyber-alert-box">

                <div class="cyber-alert-title">
                    ABSOLUTE TOP SECRET // 绝密档案
                </div>

                <div
                    id="terminal-meta-line"
                    class="system-code"
                >
                    [ INFINITE TERMINAL ]
                    [ REALTIME STATE ]
                </div>

            </div>


            <div class="cyber-header">
                SYSTEM_LOGS
            </div>

            <div class="cyber-divider"></div>

            <div
                id="terminal-system-log"
                class="cyber-list"
            ></div>


            <div class="cyber-header">
                QUEST_TERMINAL
            </div>

            <div class="cyber-divider"></div>

            <div
                id="terminal-quests"
                class="cyber-list"
            ></div>


            <div class="cyber-header">
                DARK_MARKET
            </div>

            <div class="cyber-divider"></div>

            <div
                id="terminal-shop"
                class="cyber-list"
            ></div>


            <div class="cyber-header">
                INVENTORY
            </div>

            <div class="cyber-divider"></div>

            <div
                id="terminal-inventory"
                class="cyber-list terminal-inventory-grid"
            ></div>

        </div>
    `;
}


/* ============================================================
 * 任务渲染
 * ============================================================ */

function questHtml(
    item,
    type
) {
    const q =
        normalizeItem(item);

    const label =
        type === 'main'
            ? '主线任务'
            : '支线任务';

    const name =
        q.name ??
        q.title ??
        '未命名任务';

    const detail =
        q.detail ??
        q.description ??
        '暂无任务详情';

    const reward =
        q.reward ??
        q.rewards ??
        '暂无';

    const time =
        q.timeLimit ??
        q.deadline ??
        '';

    const risk =
        q.risk ??
        q.failureCost ??
        '';

    const status =
        q.status ??
        'active';

    const cleanName =
        String(name)
            .replace(/^~~/, '')
            .replace(/~~$/, '')
            .trim();

    if (
        status === 'completed'
    ) {
        return '';
    }

    const isStrike =
        String(name)
            .startsWith('~~') &&
        String(name)
            .endsWith('~~');

    const extra = [
        time
            ? `限定时间：${time}`
            : '',

        risk
            ? `风险/代价：${risk}`
            : '',
    ]
        .filter(Boolean)
        .join('\n');

    return `
        <div
            class="cyber-item ${
                isStrike
                    ? 'quest-strike'
                    : ''
            }"
        >

            <div class="cyber-item-label">
                ${escapeHtml(label)}
            </div>

            <div class="cyber-item-value">

                <div class="quest-title">
                    [
                    ${
                        isStrike
                            ? `<del>${textHtml(cleanName)}</del>`
                            : textHtml(cleanName)
                    }
                    ]
                </div>

                <div class="quest-detail">
                    ${textHtml(detail)}
                </div>

                ${
                    extra
                        ? `
                            <div
                                class="quest-detail"
                                style="
                                    color:#888;
                                    font-size:11px;
                                "
                            >
                                ${textHtml(extra)}
                            </div>
                        `
                        : ''
                }

                <div class="quest-reward">
                    REWARD:
                    ${textHtml(reward)}
                </div>

            </div>

        </div>
    `;
}


/* ============================================================
 * 商城渲染
 * ============================================================ */

function shopHtml(
    item,
    index
) {
    const s =
        normalizeItem(item);

    const name =
        s.name ??
        s.title ??
        `商品 ${index + 1}`;

    const price =
        s.price ??
        '???';

    const description =
        s.description ??
        s.detail ??
        '暂无商品说明';

    const section =
        index < 3
            ? '高阶专区'
            : '二手地摊';

    return `
        <div class="cyber-item shop-item">

            <div class="cyber-item-label">
                ${escapeHtml(section)}
            </div>

            <div class="cyber-item-value">

                <div class="shop-top">

                    <span class="shop-name">
                        ${textHtml(name)}
                    </span>

                    <span class="highlight">
                        ${textHtml(price)}
                        PTS
                    </span>

                </div>

                <div class="shop-description">
                    ${textHtml(description)}
                </div>

                <div
                    class="shop-footer"
                    style="
                        font-size:10px;
                        color:#555;
                    "
                >
                    ITEM_${String(
                        index + 1
                    ).padStart(2, '0')}
                    // LIVE ROTATION
                </div>

            </div>

        </div>
    `;
}


/* ============================================================
 * 背包渲染
 *
 * 数量完全由 AI JSON 数组决定。
 * 理论上无限。
 * ============================================================ */

function inventoryHtml(
    item,
    index
) {
    const it =
        normalizeItem(item);

    const name =
        it.name ??
        it.title ??
        `未知物品 ${index + 1}`;

    const status =
        it.status ??
        it.detail ??
        '';

    return `
        <div
            class="cyber-item cyber-bag-item"
        >

            <div
                class="cyber-item-label"
                style="
                    width:10px;
                    border-left-width:2px;
                    padding:0;
                "
            ></div>

            <div
                class="cyber-item-value"
            >

                ${textHtml(name)}

                ${
                    status
                        ? `
                            <span
                                class="inventory-detail"
                            >
                                (${textHtml(status)})
                            </span>
                        `
                        : ''
                }

            </div>

        </div>
    `;
}


/* ============================================================
 * 主渲染
 * ============================================================ */

function renderState(
    state
) {
    const panel =
        document.getElementById(
            PANEL_ID
        );

    if (!panel) {
        return;
    }

    const safeState =
        normalizeState(
            state,
            DEFAULT_STATE
        );

    const mood =
        safeState.systemMood ||
        '⏳';

    const comment =
        safeState.comment ||
        '本轮暂无系统吐槽。';

    const main =
        safeState.mainQuests ||
        [];

    const side =
        safeState.sideQuests ||
        [];

    const shop =
        safeState.shop ||
        [];

    const inventory =
        safeState.inventory ||
        [];


    const log =
        document.getElementById(
            'terminal-system-log'
        );

    const quests =
        document.getElementById(
            'terminal-quests'
        );

    const market =
        document.getElementById(
            'terminal-shop'
        );

    const bag =
        document.getElementById(
            'terminal-inventory'
        );


    /* -------------------------
     * 系统吐槽
     * ------------------------- */

    if (log) {

        log.innerHTML = `
            <div class="cyber-item">

                <div class="cyber-item-label">

                    <span class="cyber-emoji">
                        ${textHtml(mood)}
                    </span>

                </div>

                <div class="cyber-item-value">

                    <span class="system-code">
                        SYS // REALTIME CAPTURE
                    </span>

                    ${textHtml(comment)}

                </div>

            </div>
        `;
    }


    /* -------------------------
     * 主线 + 支线
     * ------------------------- */

    if (quests) {

        const questBlocks = [

            ...main.map(
                item =>
                    questHtml(
                        item,
                        'main'
                    )
            ),

            ...side.map(
                item =>
                    questHtml(
                        item,
                        'side'
                    )
            ),

        ].filter(Boolean);

        quests.innerHTML =
            questBlocks.length
                ? questBlocks.join('')
                : `
                    <div class="cyber-empty">
                        [ NO ACTIVE QUEST ]
                    </div>
                `;
    }


    /* -------------------------
     * 商城
     *
     * 永远显示 7 格。
     * AI 实际提供多少就显示多少，
     * 不足 7 格自动显示等待刷新。
     * ------------------------- */

    if (market) {

        const shopBlocks =
            shop
                .slice(0, 7)
                .map(shopHtml);

        while (
            shopBlocks.length < 7
        ) {

            const index =
                shopBlocks.length;

            shopBlocks.push(`
                <div
                    class="cyber-item"
                    style="
                        opacity:.45;
                    "
                >

                    <div class="cyber-item-label">
                        ${
                            index < 3
                                ? '高阶专区'
                                : '二手地摊'
                        }
                    </div>

                    <div
                        class="cyber-item-value"
                        style="color:#555;"
                    >
                        [ WAITING FOR ROTATION ]
                    </div>

                </div>
            `);
        }

        market.innerHTML =
            shopBlocks.join('');
    }


    /* -------------------------
     * 背包
     * ------------------------- */

    if (bag) {

        bag.innerHTML =
            inventory.length
                ? inventory
                    .map(
                        inventoryHtml
                    )
                    .join('')
                : `
                    <div
                        class="cyber-empty"
                    >
                        [ INVENTORY EMPTY ]
                    </div>
                `;
    }


    /* -------------------------
     * 顶部实时信息
     * ------------------------- */

    const meta =
        document.getElementById(
            'terminal-meta-line'
        );

    if (meta) {

        const now =
            new Date();

        const time =
            now.toLocaleTimeString(
                [],
                {
                    hour12: false,
                }
            );

        const context =
            getContextSafe();

        const character =
            context
                ?.characters
                ?.[context?.characterId]
                ?.name;

        meta.textContent =
            `[ ${
                character || 'CHAT'
            } ] [ REALTIME ] [ ${time} ]`;
    }
}


/* ============================================================
 * 隐藏 AI JSON
 * ============================================================ */

function hideTerminalStateInRenderedMessage(
    messageId
) {
    const mes =
        document.querySelector(
            `#chat .mes[mesid="${messageId}"]`
        );

    const text =
        mes?.querySelector(
            '.mes_text'
        );

    if (!text) {
        return;
    }


    const walker =
        document.createTreeWalker(
            text,
            NodeFilter.SHOW_TEXT
        );

    const nodes = [];

    while (
        walker.nextNode()
    ) {
        nodes.push(
            walker.currentNode
        );
    }


    for (
        const node of nodes
    ) {

        if (
            node.nodeValue?.includes(
                '<INFINITE_TERMINAL_STATE>'
            )
        ) {
            node.parentElement?.remove();
        }
    }


    const candidates =
        text.querySelectorAll(
            'pre, code, p, div'
        );

    for (
        const el of candidates
    ) {

        const content =
            el.textContent ||
            '';

        if (
            content.includes(
                '<INFINITE_TERMINAL_STATE>'
            )
        ) {
            el.remove();
        }
    }
}


/* ============================================================
 * AI 回复同步
 * ============================================================ */

async function handleMessageReceived(
    messageId
) {
    const context =
        getContextSafe();

    const index =
        typeof messageId === 'number'
            ? messageId
            : context?.chat?.length - 1;

    const message =
        context?.chat?.[index];

    if (
        !message ||
        message.is_user ||
        message.is_system
    ) {
        return;
    }


    const rawState =
        extractTerminalState(
            message.mes
        );

    if (!rawState) {

        console.debug(
            `[${MODULE_NAME}] 本轮没有找到终端 JSON 状态块。`
        );

        return;
    }


    const previous =
        getCurrentChatState();

    const next =
        normalizeState(
            rawState,
            previous
        );


    renderState(
        next
    );


    await saveCurrentChatState(
        next
    );


    setTimeout(
        () =>
            hideTerminalStateInRenderedMessage(
                index
            ),
        80
    );


    console.log(
        `[${MODULE_NAME}] 终端状态已同步`,
        next
    );
}


function renderCurrentChatState() {
    renderState(
        getCurrentChatState()
    );
}


/* ============================================================
 * 安装面板
 *
 * 这里保留上一版赛博面板的结构。
 * 不再使用上一轮那个普通灰色圆角视觉覆盖。
 * ============================================================ */

function installDynamicPanel() {

    const panel =
        document.querySelector(
            '.cyber-panel'
        );

    if (!panel) {

        console.error(
            `[${MODULE_NAME}] 找不到 .cyber-panel`
        );

        return null;
    }


    panel.id =
        PANEL_ID;


    panel.innerHTML =
        buildPanelShell();


    Object.assign(
        panel.style,
        {

            position: 'fixed',

            top: '50%',

            left: '50%',

            transform:
                'translate(-50%, -50%)',

            zIndex:
                '2147483646',

            width:
                'min(92vw, 520px)',

            maxHeight:
                '88vh',

            overflowY:
                'auto',

            overflowX:
                'hidden',

            display:
                'none',

            boxSizing:
                'border-box',

        }
    );


    const close =
        document.getElementById(
            'infinite-terminal-close'
        );


    if (close) {

        Object.assign(
            close.style,
            {

                position: 'sticky',

                float: 'right',

                top: '0',

                zIndex: '30',

                width: '38px',

                height: '38px',

                margin:
                    '-5px -5px 0 0',

                border:
                    '1px solid rgba(255,255,255,.35)',

                borderRadius:
                    '50%',

                background:
                    'rgba(0,0,0,.72)',

                color:
                    '#fff',

                fontSize:
                    '26px',

                lineHeight:
                    '32px',

                cursor:
                    'pointer',

            }
        );


        close.addEventListener(
            'click',
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                panel.style.display =
                    'none';
            }
        );
    }


    const content =
        panel.querySelector(
            '.cyber-terminal-content'
        );


    if (content) {

        Object.assign(
            content.style,
            {

                position:
                    'relative',

                zIndex:
                    '20',

            }
        );
    }


    return panel;
}


/* ============================================================
 * 悬浮按钮
 *
 * 视觉恢复到上一版：
 *
 * floating-dot
 * ◈ 终端
 * 不再使用上一轮那个灰色胶囊按钮。
 *
 * 同时保留：
 * 可拖动
 * 位置保存
 * 点击开关面板
 * 屏幕边界限制
 * ============================================================ */

function createFloatingButton(
    panel
) {

    document
        .getElementById(
            BUTTON_ID
        )
        ?.remove();


    const button =
        document.createElement(
            'div'
        );


    button.id =
        BUTTON_ID;


    button.setAttribute(
        'role',
        'button'
    );


    button.setAttribute(
        'aria-label',
        '无限流终端'
    );


    button.innerHTML = `
        <span class="floating-dot"></span>

        <span>
            ◈ 终端
        </span>
    `;


    /*
     * 只负责最高层级。
     *
     * 外观交给原来的 CSS。
     */

    button.style.zIndex =
        '2147483647';

    button.style.position =
        'fixed';

    button.style.touchAction =
        'none';

    button.style.userSelect =
        'none';


    const settings =
        getSettings();


    function applyPosition() {

        const rect =
            button.getBoundingClientRect();

        const width =
            rect.width ||
            button.offsetWidth ||
            100;

        const height =
            rect.height ||
            button.offsetHeight ||
            44;


        let left =
            settings.buttonX;

        let top =
            settings.buttonY;


        if (
            typeof left !== 'number' ||
            typeof top !== 'number'
        ) {

            left =
                window.innerWidth -
                width -
                24;

            top =
                window.innerHeight -
                height -
                110;
        }


        left =
            Math.max(
                8,
                Math.min(
                    left,
                    window.innerWidth -
                    width -
                    8
                )
            );


        top =
            Math.max(
                8,
                Math.min(
                    top,
                    window.innerHeight -
                    height -
                    8
                )
            );


        button.style.left =
            `${left}px`;

        button.style.top =
            `${top}px`;

        button.style.right =
            'auto';

        button.style.bottom =
            'auto';
    }


    document.body.appendChild(
        button
    );


    requestAnimationFrame(
        applyPosition
    );


    let dragging =
        false;

    let moved =
        false;

    let startX =
        0;

    let startY =
        0;

    let startLeft =
        0;

    let startTop =
        0;


    button.addEventListener(
        'pointerdown',
        function (event) {

            if (
                event.pointerType ===
                    'mouse' &&
                event.button !== 0
            ) {
                return;
            }


            const rect =
                button.getBoundingClientRect();


            dragging =
                true;

            moved =
                false;


            startX =
                event.clientX;

            startY =
                event.clientY;


            startLeft =
                rect.left;

            startTop =
                rect.top;


            button.style.cursor =
                'grabbing';


            try {

                button.setPointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            event.preventDefault();

            event.stopPropagation();
        }
    );


    button.addEventListener(
        'pointermove',
        function (event) {

            if (!dragging) {
                return;
            }


            const dx =
                event.clientX -
                startX;

            const dy =
                event.clientY -
                startY;


            if (
                Math.abs(dx) > 4 ||
                Math.abs(dy) > 4
            ) {

                moved =
                    true;
            }


            const width =
                button.offsetWidth;

            const height =
                button.offsetHeight;


            const left =
                Math.max(
                    8,
                    Math.min(
                        startLeft + dx,
                        window.innerWidth -
                        width -
                        8
                    )
                );


            const top =
                Math.max(
                    8,
                    Math.min(
                        startTop + dy,
                        window.innerHeight -
                        height -
                        8
                    )
                );


            button.style.left =
                `${left}px`;

            button.style.top =
                `${top}px`;

            button.style.right =
                'auto';

            button.style.bottom =
                'auto';


            event.preventDefault();

            event.stopPropagation();
        }
    );


    function finishDrag(
        event
    ) {

        if (!dragging) {
            return;
        }


        dragging =
            false;


        button.style.cursor =
            'grab';


        const rect =
            button.getBoundingClientRect();


        settings.buttonX =
            rect.left;

        settings.buttonY =
            rect.top;


        saveSettings();


        if (!moved) {

            panel.style.display =
                panel.style.display ===
                'none'
                    ? 'block'
                    : 'none';
        }


        try {

            button.releasePointerCapture(
                event.pointerId
            );

        } catch (_) {}


        event.preventDefault();

        event.stopPropagation();
    }


    button.addEventListener(
        'pointerup',
        finishDrag
    );


    button.addEventListener(
        'pointercancel',
        finishDrag
    );


    window.addEventListener(
        'resize',
        function () {

            applyPosition();

            const rect =
                button.getBoundingClientRect();


            settings.buttonX =
                rect.left;

            settings.buttonY =
                rect.top;


            saveSettings();
        }
    );


    return button;
}


/* ============================================================
 * 设置页面
 * ============================================================ */

function installSettingsUI() {

    const context =
        getContextSafe();

    const settingsRoot =
        document.getElementById(
            'extensions_settings'
        );


    if (
        !context ||
        !settingsRoot
    ) {
        return;
    }


    document
        .getElementById(
            `${MODULE_NAME}-settings`
        )
        ?.remove();


    const settings =
        getSettings();


    const wrapper =
        document.createElement(
            'div'
        );


    wrapper.id =
        `${MODULE_NAME}-settings`;


    wrapper.innerHTML = `
        <div class="inline-drawer">

            <div
                class="inline-drawer-toggle inline-drawer-header"
            >

                <b>
                    无限流个人终端
                </b>

                <div
                    class="inline-drawer-icon fa-solid fa-chevron-down"
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
                                ? 'checked'
                                : ''
                        }
                    >

                    <span>
                        开启无限流终端悬浮窗
                    </span>

                </label>


                <div
                    style="
                        margin-top:8px;
                        color:#888;
                        font-size:11px;
                        line-height:1.5;
                    "
                >

                    AI 每轮输出
                    &lt;INFINITE_TERMINAL_STATE&gt;
                    JSON 后，终端会自动实时同步。

                    <br><br>

                    背包、主线、支线均为动态数组，
                    数量不设固定上限。

                </div>

            </div>

        </div>
    `;


    settingsRoot.appendChild(
        wrapper
    );


    wrapper
        .querySelector(
            '#infinite-terminal-toggle'
        )
        ?.addEventListener(
            'change',
            function (event) {

                settings.enabled =
                    event.target.checked;


                saveSettings();


                if (
                    event.target.checked
                ) {

                    toastr.success(
                        '无限流终端已开启，正在重新加载……'
                    );


                    setTimeout(
                        () =>
                            location.reload(),
                        150
                    );

                } else {

                    panelAndButtonVisible(
                        false
                    );


                    toastr.success(
                        '无限流终端已关闭'
                    );
                }
            }
        );
}


/* ============================================================
 * 显示 / 隐藏
 * ============================================================ */

function panelAndButtonVisible(
    visible
) {

    const panel =
        document.getElementById(
            PANEL_ID
        );

    const button =
        document.getElementById(
            BUTTON_ID
        );


    if (panel) {

        panel.style.display =
            'none';
    }


    if (button) {

        button.style.display =
            visible
                ? 'block'
                : 'none';
    }
}


/* ============================================================
 * 事件系统
 * ============================================================ */

function setupEvents() {

    const context =
        getContextSafe();


    if (
        !context?.eventSource ||
        !context?.event_types
    ) {

        console.warn(
            `[${MODULE_NAME}] SillyTavern 事件系统尚未就绪。`
        );

        return;
    }


    const {
        eventSource,
        event_types,
    } = context;


    if (
        event_types.MESSAGE_RECEIVED
    ) {

        eventSource.on(
            event_types.MESSAGE_RECEIVED,
            handleMessageReceived
        );
    }


    if (
        event_types.CHARACTER_MESSAGE_RENDERED
    ) {

        eventSource.on(
            event_types.CHARACTER_MESSAGE_RENDERED,
            function (messageId) {

                setTimeout(
                    () =>
                        hideTerminalStateInRenderedMessage(
                            messageId
                        ),
                    20
                );
            }
        );
    }


    if (
        event_types.CHAT_CHANGED
    ) {

        eventSource.on(
            event_types.CHAT_CHANGED,
            function () {

                setTimeout(
                    renderCurrentChatState,
                    50
                );
            }
        );
    }


    if (
        event_types.MESSAGE_SWIPED
    ) {

        eventSource.on(
            event_types.MESSAGE_SWIPED,
            handleMessageReceived
        );
    }


    if (
        event_types.MESSAGE_EDITED
    ) {

        eventSource.on(
            event_types.MESSAGE_EDITED,
            handleMessageReceived
        );
    }


    console.log(
        `[${MODULE_NAME}] AI 状态同步事件已启动。`
    );
}


/* ============================================================
 * 初始化
 * ============================================================ */

async function init() {

    const settings =
        getSettings();


    if (!settings.enabled) {

        installSettingsUI();

        return;
    }


    try {

        const html =
            await $.get(
                './scripts/extensions/third-party/infinite-terminal/index.html'
            );


        /*
         * index.html 里面已经有
         * .cyber-panel。
         */

        $('body').append(
            html
        );


    } catch (error) {

        console.error(
            `[${MODULE_NAME}] 加载 index.html 失败`,
            error
        );


        toastr.error(
            '无限流终端 UI 加载失败，请检查 index.html'
        );


        return;
    }


    const panel =
        installDynamicPanel();


    if (!panel) {
        return;
    }


    createFloatingButton(
        panel
    );


    installSettingsUI();


    renderCurrentChatState();


    setupEvents();


    console.log(
        `[${MODULE_NAME}] 无限流个人终端已启动。`
    );
}


/* ============================================================
 * 启动
 * ============================================================ */

jQuery(
    async function () {

        const waitForST =
            () => {

                if (
                    typeof SillyTavern !==
                        'undefined' &&
                    SillyTavern.getContext
                ) {

                    init();

                } else {

                    setTimeout(
                        waitForST,
                        300
                    );
                }
            };


        waitForST();
    }
);
