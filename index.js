const MODULE_NAME = 'infinite_terminal';
const PANEL_ID = 'infinite-terminal-panel';
const BUTTON_ID = 'floating-terminal-btn';
const META_KEY = 'infinite_terminal_state_v1';

const STATE_TAG = /<INFINITE_TERMINAL_STATE>\s*([\s\S]*?)\s*<\/INFINITE_TERMINAL_STATE>/i;

const DEFAULT_STATE = {
    systemMood: '⏳',
    comment: '终端等待本轮 AI 状态同步……',
    mainQuests: [],
    sideQuests: [],
    shop: [],
    inventory: [],
};

function clone(value) {
    return structuredClone(value);
}

function getContextSafe() {
    try {
        return typeof SillyTavern !== 'undefined' && SillyTavern.getContext
            ? SillyTavern.getContext()
            : null;
    } catch (error) {
        console.error(`[${MODULE_NAME}] 无法读取 SillyTavern context`, error);
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
            buttonY: null
        };
    }

    if (!settings[MODULE_NAME]) {
        settings[MODULE_NAME] = {
            enabled: true,
            buttonX: null,
            buttonY: null
        };
    }

    if (typeof settings[MODULE_NAME].enabled !== 'boolean') {
        settings[MODULE_NAME].enabled = true;
    }

    if (!Object.hasOwn(settings[MODULE_NAME], 'buttonX')) {
        settings[MODULE_NAME].buttonX = null;
    }

    if (!Object.hasOwn(settings[MODULE_NAME], 'buttonY')) {
        settings[MODULE_NAME].buttonY = null;
    }

    return settings[MODULE_NAME];
}

function saveSettings() {
    const context = getContextSafe();

    try {
        context?.saveSettingsDebounced?.();
    } catch (error) {
        console.warn(`[${MODULE_NAME}] 保存设置失败`, error);
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function textHtml(value) {
    return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function displayStrike(value) {
    const text = String(value ?? '');

    if (
        text.startsWith('~~') &&
        text.endsWith('~~') &&
        text.length >= 4
    ) {
        return `<del>${textHtml(text.slice(2, -2))}</del>`;
    }

    return textHtml(text);
}

function asArray(value) {
    return Array.isArray(value) ? value : null;
}

function normalizeItem(item) {
    if (typeof item === 'string') {
        return {
            name: item
        };
    }

    if (!item || typeof item !== 'object') {
        return {
            name: String(item ?? '')
        };
    }

    return item;
}

function normalizeState(raw, previous = DEFAULT_STATE) {
    const incoming =
        raw && typeof raw === 'object'
            ? raw
            : {};

    const next = clone(previous || DEFAULT_STATE);

    if (Object.hasOwn(incoming, 'systemMood')) {
        next.systemMood = String(
            incoming.systemMood ?? ''
        );
    }

    if (Object.hasOwn(incoming, 'comment')) {
        next.comment = String(
            incoming.comment ?? ''
        );
    }

    const arrayFields = [
        'mainQuests',
        'sideQuests',
        'shop',
        'inventory'
    ];

    for (const key of arrayFields) {
        if (Object.hasOwn(incoming, key)) {
            const arr = asArray(incoming[key]);

            if (arr !== null) {
                next[key] = arr.map(normalizeItem);
            } else if (incoming[key] === null) {
                next[key] = [];
            }
        }
    }

    return next;
}

function getCurrentChatState() {
    const context = getContextSafe();

    const stored =
        context?.chatMetadata?.[META_KEY];

    if (
        stored &&
        typeof stored === 'object'
    ) {
        return normalizeState(
            stored,
            DEFAULT_STATE
        );
    }

    return clone(DEFAULT_STATE);
}

async function saveCurrentChatState(state) {
    const context = getContextSafe();

    if (!context?.chatMetadata) {
        return;
    }

    try {
        context.chatMetadata[META_KEY] =
            clone(state);

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

function parseJsonText(text) {
    let candidate =
        String(text ?? '').trim();

    candidate = candidate
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(candidate);
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

function extractTerminalState(messageText) {
    const text =
        String(messageText ?? '');

    const match =
        text.match(STATE_TAG);

    if (!match) {
        return null;
    }

    const parsed =
        parseJsonText(match[1]);

    if (
        !parsed ||
        typeof parsed !== 'object'
    ) {
        return null;
    }

    return parsed;
}

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
                    style="
                        font-size:11px;
                        color:#aaa;
                    "
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

function questHtml(item, type) {
    const q = normalizeItem(item);

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

    const extra = [
        time
            ? `限定时间：${time}`
            : '',

        risk
            ? `风险/代价：${risk}`
            : ''
    ]
        .filter(Boolean)
        .join('\n');

    return `
        <div class="cyber-item">

            <div class="cyber-item-label">
                ${escapeHtml(label)}
            </div>

            <div class="cyber-item-value">

                <div
                    style="
                        font-weight:bold;
                        font-size:14px;
                        margin-bottom:6px;
                    "
                >
                    [ ${displayStrike(name)} ]
                </div>

                <div
                    style="
                        color:#999;
                        margin-bottom:8px;
                    "
                >
                    ${textHtml(detail)}
                </div>

                ${
                    extra
                        ? `
                            <div
                                style="
                                    color:#888;
                                    font-size:11px;
                                    margin-bottom:8px;
                                "
                            >
                                ${textHtml(extra)}
                            </div>
                        `
                        : ''
                }

                <div
                    style="
                        color:#d4af37;
                        font-size:11px;
                    "
                >
                    REWARD:
                    ${textHtml(reward)}
                </div>

            </div>
        </div>
    `;
}

function shopHtml(item, index) {
    const s = normalizeItem(item);

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
        <div class="cyber-item">

            <div class="cyber-item-label">
                ${escapeHtml(section)}
            </div>

            <div class="cyber-item-value">

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        margin-bottom:6px;
                    "
                >
                    <span
                        style="
                            font-weight:bold;
                        "
                    >
                        ${textHtml(name)}
                    </span>

                    <span class="highlight">
                        ${textHtml(price)} PTS
                    </span>
                </div>

                <div
                    style="
                        color:#999;
                        margin-bottom:12px;
                    "
                >
                    ${textHtml(description)}
                </div>

                <div
                    style="
                        font-size:10px;
                        color:#555;
                    "
                >
                    ITEM_${String(index + 1).padStart(2, '0')}
                    // LIVE ROTATION
                </div>

            </div>
        </div>
    `;
}

function inventoryHtml(item, index) {
    const it = normalizeItem(item);

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
            style="margin-bottom:0;"
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
                style="font-size:11px;"
            >
                ${textHtml(name)}

                ${
                    status
                        ? `
                            <span style="color:#666;">
                                (${textHtml(status)})
                            </span>
                        `
                        : ''
                }

            </div>

        </div>
    `;
}

function renderState(state) {
    const panel =
        document.getElementById(PANEL_ID);

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


    if (log) {
        log.innerHTML = `
            <div class="cyber-item">

                <div class="cyber-item-label">
                    <span class="cyber-emoji">
                        ${textHtml(mood)}
                    </span>
                </div>

                <div class="cyber-item-value">

                    <span
                        style="
                            color:#888;
                            font-size:11px;
                            display:block;
                            margin-bottom:4px;
                        "
                    >
                        SYS // REALTIME CAPTURE
                    </span>

                    ${textHtml(comment)}

                </div>

            </div>
        `;
    }


    if (quests) {
        const questBlocks = [
            ...main.map(
                item => questHtml(
                    item,
                    'main'
                )
            ),

            ...side.map(
                item => questHtml(
                    item,
                    'side'
                )
            )
        ];

        quests.innerHTML =
            questBlocks.length
                ? questBlocks.join('')
                : `
                    <div class="cyber-item">
                        <div
                            class="cyber-item-value"
                            style="color:#666;"
                        >
                            [ NO ACTIVE QUEST ]
                        </div>
                    </div>
                `;
    }


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
                    style="opacity:.45;"
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


    if (bag) {
        bag.innerHTML =
            inventory.length
                ? inventory
                    .map(inventoryHtml)
                    .join('')
                : `
                    <div
                        class="cyber-item"
                        style="opacity:.5;"
                    >
                        <div
                            class="cyber-item-value"
                            style="color:#555;"
                        >
                            [ EMPTY ]
                        </div>
                    </div>
                `;
    }


    const meta =
        document.getElementById(
            'terminal-meta-line'
        );

    if (meta) {
        const now = new Date();

        const time =
            now.toLocaleTimeString(
                [],
                {
                    hour12: false
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
            `[ ${character || 'CHAT'} ] [ REALTIME ] [ ${time} ]`;
    }
}

function hideTerminalStateInRenderedMessage(messageId) {
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

    for (const node of nodes) {
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

    for (const el of candidates) {
        const content =
            el.textContent || '';

        if (
            content.includes(
                '<INFINITE_TERMINAL_STATE>'
            )
        ) {
            el.remove();
        }
    }
}

async function handleMessageReceived(messageId) {
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

    renderState(next);

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

    panel.id = PANEL_ID;

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
            zIndex: '2147483646',
            width:
                'min(92vw, 520px)',
            maxHeight: '88vh',
            overflowY: 'auto',
            display: 'none',
            boxSizing: 'border-box',
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
                borderRadius: '50%',
                background:
                    'rgba(0,0,0,.72)',
                color: '#fff',
                fontSize: '26px',
                lineHeight: '32px',
                cursor: 'pointer',
            }
        );

        close.addEventListener(
            'click',
            () => {
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
                position: 'relative',
                zIndex: '20',
            }
        );
    }

    return panel;
}

function createFloatingButton(panel) {
    document
        .getElementById(BUTTON_ID)
        ?.remove();

    const button =
        document.createElement('div');

    button.id = BUTTON_ID;

    button.textContent =
        '◈ 终端';

    Object.assign(
        button.style,
        {
            position: 'fixed',
            right: '18px',
            bottom: '120px',
            zIndex: '2147483647',
            padding: '10px 18px',
            minWidth: '92px',
            textAlign: 'center',
            border:
                '1px solid rgba(255,255,255,.65)',
            borderRadius: '999px',
            background:
                'linear-gradient(135deg, rgba(22,24,30,.96), rgba(75,78,90,.96))',
            color: '#f2f4f8',
            boxShadow:
                '0 8px 28px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.08)',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
        }
    );

    const settings =
        getSettings();

    if (
        Number.isFinite(
            settings.buttonX
        ) &&
        Number.isFinite(
            settings.buttonY
        )
    ) {
        button.style.left =
            `${settings.buttonX}px`;

        button.style.top =
            `${settings.buttonY}px`;

        button.style.right =
            'auto';

        button.style.bottom =
            'auto';
    }

    document.body.appendChild(
        button
    );

    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;

    const onPointerDown =
        (event) => {
            dragging = true;
            moved = false;

            button.setPointerCapture
                ?.(
                    event.pointerId
                );

            const rect =
                button.getBoundingClientRect();

            offsetX =
                event.clientX -
                rect.left;

            offsetY =
                event.clientY -
                rect.top;

            button.style.cursor =
                'grabbing';
        };

    const onPointerMove =
        (event) => {
            if (!dragging) {
                return;
            }

            moved = true;

            const maxX =
                Math.max(
                    0,
                    window.innerWidth -
                    button.offsetWidth
                );

            const maxY =
                Math.max(
                    0,
                    window.innerHeight -
                    button.offsetHeight
                );

            const x =
                Math.min(
                    maxX,
                    Math.max(
                        0,
                        event.clientX -
                        offsetX
                    )
                );

            const y =
                Math.min(
                    maxY,
                    Math.max(
                        0,
                        event.clientY -
                        offsetY
                    )
                );

            button.style.left =
                `${x}px`;

            button.style.top =
                `${y}px`;

            button.style.right =
                'auto';

            button.style.bottom =
                'auto';
        };

    const onPointerUp =
        (event) => {
            if (!dragging) {
                return;
            }

            dragging = false;

            button.releasePointerCapture
                ?.(
                    event.pointerId
                );

            button.style.cursor =
                'grab';

            if (moved) {
                const rect =
                    button.getBoundingClientRect();

                settings.buttonX =
                    rect.left;

                settings.buttonY =
                    rect.top;

                saveSettings();
            }
        };

    button.addEventListener(
        'pointerdown',
        onPointerDown
    );

    button.addEventListener(
        'pointermove',
        onPointerMove
    );

    button.addEventListener(
        'pointerup',
        onPointerUp
    );

    button.addEventListener(
        'pointercancel',
        onPointerUp
    );

    button.addEventListener(
        'click',
        () => {
            if (moved) {
                return;
            }

            panel.style.display =
                panel.style.display ===
                'none'
                    ? 'block'
                    : 'none';
        }
    );

    return button;
}

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
            (event) => {
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
        event_types
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
            (messageId) => {
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
            () => {
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

jQuery(async () => {

    const waitForST = () => {

        if (
            typeof SillyTavern !== 'undefined' &&
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
});
