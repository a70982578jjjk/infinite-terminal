const MODULE_NAME = 'infinite_terminal';
const PANEL_ID = 'infinite-terminal-panel';
const BUTTON_ID = 'floating-terminal-btn';

const META_KEY = 'infinite_terminal_state_v2';
const CHAT_ENABLED_KEY = 'infinite_terminal_enabled';
const RULES_KEY = 'instruction';
const BUTTON_X_KEY = 'buttonX';
const BUTTON_Y_KEY = 'buttonY';
const PROMPT_KEY = 'infinite_terminal_prompt';

const STATE_TAG = /<INFINITE_TERMINAL_STATE>\s*([\s\S]*?)\s*<\/INFINITE_TERMINAL_STATE>/i;

const DEFAULT_INSTRUCTION = "<terminal_instruction>\n【无限流终端状态协议】\n\n当前聊天已启用“无限流个人终端”。\n\n【核心要求】\n每一轮生成角色回复后，必须维护最新的无限流终端状态。\n正文仍然正常输出；终端状态由外部扩展负责显示。\nAI必须在每轮角色回复结束时额外输出一个唯一的结构化状态块：\n\n<INFINITE_TERMINAL_STATE>\n{\n  \"systemMood\": \"◎\",\n  \"comment\": \"本轮高维吐槽\",\n  \"mainQuests\": [],\n  \"sideQuests\": [],\n  \"shop\": [],\n  \"inventory\": []\n}\n</INFINITE_TERMINAL_STATE>\n\n【重要】\n状态块必须是合法 JSON。\n不要在 JSON 中输出 HTML。\n不要把终端面板的 HTML/CSS 当作正文输出。\n不要省略状态块。\n不要因为某个数组本轮没有变化就省略它；为了保证扩展能稳定同步，建议每轮完整输出 systemMood、comment、mainQuests、sideQuests、shop、inventory。\n必须依据当前剧情与聊天历史维护状态，不得凭空重置已有任务、物品、积分或剧情状态。\n\n【高维吐槽】\n每轮必须全新生成。\n作为高维主神系统，针对 user 刚发出的这一轮动作/对话，进行符合设定的、极具时效性的吐槽、逻辑拆解、吹捧或嘲讽，不可 OOC。\n字数必须大于100字，绝不允许连续两轮输出相同内容。\n\n【动态任务】\nmainQuests 与 sideQuests 都是动态数组，数量没有固定上限。\n可以随剧情增加、减少、失败、延期或完成。\n每个任务建议包含：\n{\n  \"name\": \"任务名称\",\n  \"detail\": \"任务目标、隐藏逻辑、限定时间、风险或失败代价\",\n  \"reward\": \"奖励\",\n  \"status\": \"available\"\n}\n\n可选 status：\navailable = 可接取\nactive = 已接取/进行中\ncompleted_pending = 已完成但尚未结算\ncompleted = 已彻底结算\nfailed = 已失败\nexpired = 已过期\n\n对于 completed_pending 的任务，任务名称请用 Markdown 删除线包裹，例如：\n\"~~前往暗网劫狱~~\"\n彻底结算后的任务应在下一次状态中删除。\n\n【阶梯商城】\nshop 固定输出7个商品。\n商品1~3：高阶专区，真正强力的道具/神器，价格极高，作用极大，但必须保留奇葩名称、限制、副作用或代价。\n商品4~7：二手坑人地摊，搞笑、鸡肋、黑色幽默、坑人或破烂，价格特别低。\n每轮根据剧情/副本变化实时刷新商品。\n\n每个商品建议包含：\n{\n  \"name\": \"商品名称\",\n  \"price\": 22000,\n  \"description\": \"功效、限制、副作用\",\n  \"currency\": \"PTS\"\n}\n\n玩家点击购买按钮后，扩展会把购买行为发送为用户消息。\nAI下一轮必须识别并处理这次购买行为，例如：\n$购买3个【无相幻音蝶】消费66000积分\n或：\n$购买【无相幻音蝶】消费22000积分\n\n购买后的积分、商品和背包状态必须由下一轮终端 JSON 维护。\n\n【动态背包】\ninventory 是动态数组，数量没有固定上限。\n拿到新物品必须新增；消耗、丢弃、失去的物品必须删除。\n即使是毫无作用的废品也可以进入背包。\n每个物品建议包含：\n{\n  \"name\": \"物品名称\",\n  \"detail\": \"当前状态、耐久、来历、吐槽\",\n  \"status\": \"当前状态\",\n  \"usable\": true\n}\n\n玩家点击“使用”后，扩展会把行为发送为用户消息：\n$使用背包物品【物品名称】\n\nAI下一轮必须根据剧情处理该行为，再更新 inventory。\n\n【任务接取】\n玩家点击“接取任务”后，扩展会发送：\n$接取任务【任务名称】\n\nAI下一轮必须处理接取行为，并把对应任务 status 更新为 active；如果剧情已经导致任务无法接取，则按照剧情处理。\n\n【按钮行为的核心原则】\n按钮只是玩家行为入口。\n扩展不会擅自扣积分、添加物品、完成任务或修改剧情。\n真正的状态变化由 AI 根据当前剧情、聊天历史和玩家行为，在下一轮 JSON 中维护。\n\n【JSON结构】\n顶层固定字段：\nsystemMood\ncomment\nmainQuests\nsideQuests\nshop\ninventory\n\n可选字段：\nmeta\n\nmeta 可以包含：\n{\n  \"id\": \"JK0901\",\n  \"location\": \"骨灵号深层\",\n  \"time\": \"03:14:59\"\n}\n\nmainQuests / sideQuests / inventory 理论上可以无限增加。\nshop 按设定固定为7个。\n不要输出额外的解释文字到状态块内部。\n</terminal_instruction>";

const DEFAULT_STATE = {
    systemMood: '◎',
    comment: '终端等待本轮 AI 状态同步……',
    mainQuests: [],
    sideQuests: [],
    shop: [],
    inventory: [],
    meta: {
        id: 'WAITING',
        location: '等待剧情同步',
        time: '--:--:--',
    },
};

function clone(value) {
    try {
        return structuredClone(value);
    } catch {
        return JSON.parse(JSON.stringify(value));
    }
}

function getContextSafe() {
    try {
        return typeof SillyTavern !== 'undefined' && SillyTavern.getContext
            ? SillyTavern.getContext()
            : null;
    } catch (error) {
        console.error(`[${MODULE_NAME}] getContext 失败`, error);
        return null;
    }
}

function getSettings() {
    const context = getContextSafe();
    if (!context?.extensionSettings) {
        return {
            enabled: true,
            instruction: DEFAULT_INSTRUCTION,
            [BUTTON_X_KEY]: null,
            [BUTTON_Y_KEY]: null,
        };
    }

    const all = context.extensionSettings;
    if (!all[MODULE_NAME]) {
        all[MODULE_NAME] = {
            enabled: true,
            instruction: DEFAULT_INSTRUCTION,
            [BUTTON_X_KEY]: null,
            [BUTTON_Y_KEY]: null,
        };
    }

    const settings = all[MODULE_NAME];

    if (typeof settings.enabled !== 'boolean') settings.enabled = true;
    if (typeof settings.instruction !== 'string' || !settings.instruction.trim()) {
        settings.instruction = DEFAULT_INSTRUCTION;
    }
    if (!Object.hasOwn(settings, BUTTON_X_KEY)) settings[BUTTON_X_KEY] = null;
    if (!Object.hasOwn(settings, BUTTON_Y_KEY)) settings[BUTTON_Y_KEY] = null;

    return settings;
}

function saveSettings() {
    try {
        getContextSafe()?.saveSettingsDebounced?.();
    } catch (error) {
        console.warn(`[${MODULE_NAME}] saveSettingsDebounced 失败`, error);
    }
}

function getChatMetadata() {
    return getContextSafe()?.chatMetadata || null;
}

function isCurrentChatEnabled() {
    return getChatMetadata()?.[CHAT_ENABLED_KEY] === true;
}

async function setCurrentChatEnabled(enabled) {
    const context = getContextSafe();
    if (!context?.chatMetadata) return;

    context.chatMetadata[CHAT_ENABLED_KEY] = !!enabled;

    try {
        if (typeof context.saveMetadata === 'function') {
            await context.saveMetadata();
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] 保存聊天开关失败`, error);
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

function normalizeItem(item) {
    if (typeof item === 'string') return { name: item };
    if (!item || typeof item !== 'object') return { name: String(item ?? '') };
    return item;
}

function normalizeState(raw, previous = DEFAULT_STATE) {
    const incoming = raw && typeof raw === 'object' ? raw : {};
    const next = clone(previous || DEFAULT_STATE);

    if (Object.hasOwn(incoming, 'systemMood')) {
        next.systemMood = String(incoming.systemMood ?? '');
    }

    if (Object.hasOwn(incoming, 'comment')) {
        next.comment = String(incoming.comment ?? '');
    }

    for (const key of ['mainQuests', 'sideQuests', 'shop', 'inventory']) {
        if (!Object.hasOwn(incoming, key)) continue;

        if (Array.isArray(incoming[key])) {
            next[key] = incoming[key].map(normalizeItem);
        } else if (incoming[key] === null) {
            next[key] = [];
        }
    }

    if (incoming.meta && typeof incoming.meta === 'object') {
        next.meta = {
            ...(next.meta || {}),
            ...incoming.meta,
        };
    }

    return next;
}

function getCurrentChatState() {
    const stored = getChatMetadata()?.[META_KEY];

    if (stored && typeof stored === 'object') {
        return normalizeState(stored, DEFAULT_STATE);
    }

    return clone(DEFAULT_STATE);
}

async function saveCurrentChatState(state) {
    const context = getContextSafe();
    if (!context?.chatMetadata) return;

    context.chatMetadata[META_KEY] = clone(state);

    try {
        if (typeof context.saveMetadata === 'function') {
            await context.saveMetadata();
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] 保存终端状态失败`, error);
    }
}

function parseJsonText(text) {
    let candidate = String(text ?? '').trim();

    candidate = candidate
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(candidate);
    } catch {
        const first = candidate.indexOf('{');
        const last = candidate.lastIndexOf('}');

        if (first >= 0 && last > first) {
            try {
                return JSON.parse(candidate.slice(first, last + 1));
            } catch {
                return null;
            }
        }
    }

    return null;
}

function extractTerminalState(messageText) {
    const match = String(messageText ?? '').match(STATE_TAG);
    if (!match) return null;

    const parsed = parseJsonText(match[1]);

    return parsed && typeof parsed === 'object'
        ? parsed
        : null;
}

function getQuestStatus(item) {
    const status = String(item?.status ?? '').toLowerCase();

    if (status) return status;

    if (item?.completed === true) return 'completed_pending';

    return 'available';
}

function isQuestStruck(name) {
    const text = String(name ?? '');
    return text.startsWith('~~') && text.endsWith('~~');
}

function questTitleHtml(name) {
    const text = String(name ?? '未命名任务');

    if (isQuestStruck(text)) {
        return `<span class="quest-title quest-strike">${textHtml(text.slice(2, -2))}</span>`;
    }

    return `<span class="quest-title">${textHtml(text)}</span>`;
}

function questHtml(item, type, index) {
    const q = normalizeItem(item);

    const name = q.name ?? q.title ?? `未命名${type === 'main' ? '主线' : '支线'} ${index + 1}`;
    const detail = q.detail ?? q.description ?? '暂无任务详情';
    const reward = q.reward ?? q.rewards ?? '暂无';
    const status = getQuestStatus(q);

    const time = q.timeLimit ?? q.deadline ?? '';
    const risk = q.risk ?? q.failureCost ?? '';

    const extra = [
        time ? `限定时间：${time}` : '',
        risk ? `风险/代价：${risk}` : '',
    ].filter(Boolean).join('\n');

    const canAccept = (
        status === 'available' ||
        status === 'offered' ||
        status === 'pending' ||
        q.acceptable === true
    ) && status !== 'completed_pending';

    const statusLabel = {
        available: 'AVAILABLE',
        offered: 'OFFERED',
        pending: 'OFFERED',
        active: 'ACTIVE',
        claimed: 'ACTIVE',
        completed_pending: 'COMPLETED / PENDING',
        completed: 'SETTLED',
        failed: 'FAILED',
        expired: 'EXPIRED',
    }[status] || status.toUpperCase();

    return `
        <div class="cyber-item quest-card" data-quest-type="${escapeHtml(type)}">
            <div class="cyber-item-label">
                ${escapeHtml(type === 'main' ? '主线任务' : '支线任务')}
            </div>

            <div class="cyber-item-value">
                ${questTitleHtml(name)}

                <div class="quest-detail">
                    ${textHtml(detail)}
                </div>

                ${
                    extra
                        ? `<div class="inventory-detail">${textHtml(extra)}</div>`
                        : ''
                }

                <div class="quest-reward">
                    REWARD: ${textHtml(reward)}
                </div>

                <div class="quest-footer">
                    <span class="quest-status">
                        ${escapeHtml(statusLabel)}
                    </span>

                    ${
                        canAccept
                            ? `
                                <button
                                    type="button"
                                    class="cyber-btn terminal-accept-quest"
                                    data-name="${escapeHtml(name)}"
                                >
                                    PROCEED / 接取
                                </button>
                            `
                            : ''
                    }
                </div>
            </div>
        </div>
    `;
}

function numberFromPrice(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const cleaned = String(value ?? '')
        .replace(/,/g, '')
        .match(/-?\d+(?:\.\d+)?/);

    return cleaned ? Number(cleaned[0]) : 0;
}

function shopHtml(item, index) {
    const s = normalizeItem(item);

    const name = s.name ?? s.title ?? `商品 ${index + 1}`;
    const price = s.price ?? '???';
    const description = s.description ?? s.detail ?? '暂无商品说明';
    const currency = s.currency ?? 'PTS';

    const section = index < 3 ? '高阶专区' : '二手地摊';

    return `
        <div class="cyber-item shop-card" data-shop-index="${index}">
            <div class="cyber-item-label">
                ${escapeHtml(section)}
            </div>

            <div class="cyber-item-value">
                <div class="shop-top">
                    <span class="shop-name">
                        ${textHtml(name)}
                    </span>

                    <span class="highlight">
                        ${textHtml(price)} ${escapeHtml(currency)}
                    </span>
                </div>

                <div class="shop-description">
                    ${textHtml(description)}
                </div>

                <div class="shop-actions">
                    <div class="qty-ctrl">
                        <button
                            type="button"
                            class="qty-btn terminal-qty-minus"
                            aria-label="减少数量"
                        >−</button>

                        <span class="qty-val terminal-qty-value">1</span>

                        <button
                            type="button"
                            class="qty-btn terminal-qty-plus"
                            aria-label="增加数量"
                        >＋</button>
                    </div>

                    <button
                        type="button"
                        class="cyber-btn terminal-buy"
                        data-name="${escapeHtml(name)}"
                        data-price="${escapeHtml(price)}"
                    >
                        BUY / 购买
                    </button>
                </div>
            </div>
        </div>
    `;
}

function inventoryHtml(item, index) {
    const it = normalizeItem(item);

    const name = it.name ?? it.title ?? `未知物品 ${index + 1}`;
    const detail = it.detail ?? it.description ?? it.status ?? '';
    const status = it.status ?? '';
    const usable = it.usable !== false;

    return `
        <div class="cyber-item cyber-bag-item">
            <div class="cyber-item-label inventory-mark">
                ${String(index + 1).padStart(2, '0')}
            </div>

            <div class="cyber-item-value">
                <div class="quest-title">
                    ${textHtml(name)}
                </div>

                ${
                    detail
                        ? `<div class="inventory-detail">${textHtml(detail)}</div>`
                        : ''
                }

                ${
                    status && status !== detail
                        ? `<div class="inventory-detail">STATUS // ${textHtml(status)}</div>`
                        : ''
                }

                <div class="quest-footer">
                    <span class="quest-status">
                        ${usable ? 'READY' : 'SEALED'}
                    </span>

                    ${
                        usable
                            ? `
                                <button
                                    type="button"
                                    class="cyber-btn terminal-use-item"
                                    data-name="${escapeHtml(name)}"
                                >
                                    USE / 使用
                                </button>
                            `
                            : ''
                    }
                </div>
            </div>
        </div>
    `;
}

function renderState(state) {
    const safeState = normalizeState(state, DEFAULT_STATE);

    const mood = safeState.systemMood || '◎';
    const comment = safeState.comment || '本轮暂无系统吐槽。';

    const main = safeState.mainQuests || [];
    const side = safeState.sideQuests || [];
    const shop = safeState.shop || [];
    const inventory = safeState.inventory || [];

    const moodEl = document.getElementById('terminal-mood');
    const commentaryEl = document.getElementById('terminal-commentary-list');
    const mainEl = document.getElementById('terminal-main-quests');
    const sideEl = document.getElementById('terminal-side-quests');
    const shopEl = document.getElementById('terminal-shop-list');
    const inventoryEl = document.getElementById('terminal-inventory-list');

    if (moodEl) {
        moodEl.textContent = mood;
    }

    if (commentaryEl) {
        commentaryEl.innerHTML = `
            <div class="cyber-item">
                <div class="cyber-item-label">
                    <span class="cyber-emoji">${textHtml(mood)}</span>
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

    if (mainEl) {
        mainEl.innerHTML = main.length
            ? main.map((item, index) => questHtml(item, 'main', index)).join('')
            : `<div class="cyber-empty">[ NO ACTIVE MAIN QUEST ]</div>`;
    }

    if (sideEl) {
        sideEl.innerHTML = side.length
            ? side.map((item, index) => questHtml(item, 'side', index)).join('')
            : `<div class="cyber-empty">[ NO ACTIVE SIDE QUEST ]</div>`;
    }

    if (shopEl) {
        const shopBlocks = shop.slice(0, 7).map(shopHtml);

        while (shopBlocks.length < 7) {
            const index = shopBlocks.length;

            shopBlocks.push(`
                <div class="cyber-item" style="opacity:.45;">
                    <div class="cyber-item-label">
                        ${index < 3 ? '高阶专区' : '二手地摊'}
                    </div>

                    <div class="cyber-item-value" style="color:#555;">
                        [ WAITING FOR ROTATION ]
                    </div>
                </div>
            `);
        }

        shopEl.innerHTML = shopBlocks.join('');
    }

    if (inventoryEl) {
        inventoryEl.innerHTML = inventory.length
            ? inventory.map(inventoryHtml).join('')
            : `<div class="cyber-empty">[ INVENTORY EMPTY ]</div>`;
    }

    updateMeta(safeState);
}

function updateMeta(state) {
    const context = getContextSafe();
    const character = context?.characters?.[context?.characterId]?.name;

    const meta = state.meta || {};

    const idEl = document.getElementById('terminal-meta-id');
    const locationEl = document.getElementById('terminal-meta-location');
    const timeEl = document.getElementById('terminal-meta-time');
    const syncEl = document.getElementById('terminal-sync-status');

    if (idEl) idEl.textContent = String(meta.id ?? 'CHAT');
    if (locationEl) locationEl.textContent = String(meta.location ?? '未同步');

    const time = meta.time || new Date().toLocaleTimeString([], { hour12: false });
    if (timeEl) timeEl.textContent = String(time);

    if (syncEl) {
        syncEl.textContent = `● REALTIME // ${character || 'CHAT'}`;
    }
}

function ensurePanelCloseButton(panel) {
    if (!panel || document.getElementById('infinite-terminal-close')) return;

    const close = document.createElement('button');
    close.id = 'infinite-terminal-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭终端');

    panel.appendChild(close);

    close.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        panel.style.display = 'none';
    });
}

function installPanel() {
    let panel = document.querySelector('.cyber-panel');

    if (!panel) {
        console.error(`[${MODULE_NAME}] index.html 中找不到 .cyber-panel`);
        return null;
    }

    panel.id = PANEL_ID;

    ensurePanelCloseButton(panel);

    Object.assign(panel.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '2147483646',
        width: 'min(92vw, 540px)',
        maxHeight: '88vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'none',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
    });

    return panel;
}

function createFloatingButton(panel) {
    document.getElementById(BUTTON_ID)?.remove();

    const button = document.createElement('div');

    button.id = BUTTON_ID;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', '无限流终端');

    button.innerHTML = `
        <span class="floating-dot"></span>
        <span>◈ 终端</span>
    `;

    Object.assign(button.style, {
        position: 'fixed',
        zIndex: '2147483647',
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'grab',
    });

    const settings = getSettings();

    function applyPosition() {
        const rect = button.getBoundingClientRect();
        const width = rect.width || button.offsetWidth || 124;
        const height = rect.height || button.offsetHeight || 44;

        let left = Number.isFinite(settings[BUTTON_X_KEY])
            ? settings[BUTTON_X_KEY]
            : window.innerWidth - width - 24;

        let top = Number.isFinite(settings[BUTTON_Y_KEY])
            ? settings[BUTTON_Y_KEY]
            : window.innerHeight - height - 110;

        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - height - 8));

        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    }

    document.body.appendChild(button);
    requestAnimationFrame(applyPosition);

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        const rect = button.getBoundingClientRect();

        dragging = true;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        button.style.cursor = 'grabbing';

        try {
            button.setPointerCapture(event.pointerId);
        } catch {}

        event.preventDefault();
        event.stopPropagation();
    });

    button.addEventListener('pointermove', (event) => {
        if (!dragging) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;

        const width = button.offsetWidth || 124;
        const height = button.offsetHeight || 44;

        const left = Math.max(
            8,
            Math.min(startLeft + dx, window.innerWidth - width - 8),
        );

        const top = Math.max(
            8,
            Math.min(startTop + dy, window.innerHeight - height - 8),
        );

        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';

        event.preventDefault();
        event.stopPropagation();
    });

    const finishDrag = (event) => {
        if (!dragging) return;

        dragging = false;
        button.style.cursor = 'grab';

        const rect = button.getBoundingClientRect();

        settings[BUTTON_X_KEY] = rect.left;
        settings[BUTTON_Y_KEY] = rect.top;
        saveSettings();

        if (!moved) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        try {
            button.releasePointerCapture(event.pointerId);
        } catch {}

        event.preventDefault();
        event.stopPropagation();
    };

    button.addEventListener('pointerup', finishDrag);
    button.addEventListener('pointercancel', finishDrag);

    window.addEventListener('resize', () => {
        applyPosition();

        const rect = button.getBoundingClientRect();
        settings[BUTTON_X_KEY] = rect.left;
        settings[BUTTON_Y_KEY] = rect.top;
        saveSettings();
    });

    return button;
}

function setExtensionPromptSafe(value) {
    const context = getContextSafe();

    try {
        if (typeof context?.setExtensionPrompt === 'function') {
            const position = context?.extension_prompt_types?.IN_PROMPT ?? 0;
            context.setExtensionPrompt(
                PROMPT_KEY,
                value || '',
                position,
                0,
                false,
            );
            return true;
        }

        if (typeof globalThis.setExtensionPrompt === 'function') {
            const position = globalThis.extension_prompt_types?.IN_PROMPT ?? 0;
            globalThis.setExtensionPrompt(
                PROMPT_KEY,
                value || '',
                position,
                0,
                false,
            );
            return true;
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] 设置 Prompt 注入失败`, error);
    }

    return false;
}

/*
 * SillyTavern 官方 Prompt Interceptor。
 * 规则通过 setExtensionPrompt 注入，不写入聊天历史。
 * 只有当前聊天开启“无限流终端 AI 规则”时才注入。
 */
globalThis.infiniteTerminalGenerateInterceptor = async function(
    chat,
    contextSize,
    abort,
    type,
) {
    const settings = getSettings();

    if (!settings.enabled || !isCurrentChatEnabled()) {
        setExtensionPromptSafe('');
        return;
    }

    const rule = String(settings.instruction || '').trim();

    if (!rule) {
        setExtensionPromptSafe('');
        return;
    }

    const success = setExtensionPromptSafe(rule);

    if (!success) {
        console.warn(
            `[${MODULE_NAME}] 当前 SillyTavern 没有可用的 setExtensionPrompt，无法进行无历史污染的规则注入。`,
        );
    }
};

function sendActionMessage(text) {
    const message = String(text ?? '').trim();
    if (!message) return;

    const textarea = document.getElementById('send_textarea');

    if (!textarea) {
        toastr?.error?.('找不到酒馆输入框，无法发送终端操作。');
        return;
    }

    textarea.value = message;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const sendButton =
        document.getElementById('send_but') ||
        document.getElementById('send_button');

    if (sendButton) {
        sendButton.click();
        return;
    }

    const form = document.getElementById('send_form');

    if (form) {
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
        } else {
            form.dispatchEvent(new Event('submit', {
                bubbles: true,
                cancelable: true,
            }));
        }
        return;
    }

    toastr?.error?.('找不到酒馆发送按钮，操作已写入输入框，请手动发送。');
}

function getQuantityFromCard(card) {
    const value = Number(card?.querySelector('.terminal-qty-value')?.textContent);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function setQuantity(card, value) {
    const qty = Math.max(1, Math.min(999, Math.floor(Number(value) || 1)));
    const target = card?.querySelector('.terminal-qty-value');
    if (target) target.textContent = String(qty);
}

function bindPanelActions() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('terminal-qty-minus')) {
            const card = target.closest('.shop-card');
            setQuantity(card, getQuantityFromCard(card) - 1);
            return;
        }

        if (target.classList.contains('terminal-qty-plus')) {
            const card = target.closest('.shop-card');
            setQuantity(card, getQuantityFromCard(card) + 1);
            return;
        }

        if (target.classList.contains('terminal-buy')) {
            const card = target.closest('.shop-card');
            const quantity = getQuantityFromCard(card);
            const name = target.dataset.name || '未知商品';
            const price = numberFromPrice(target.dataset.price);

            const total = Number.isFinite(price)
                ? price * quantity
                : target.dataset.price;

            const priceText = Number.isFinite(total)
                ? String(total)
                : String(target.dataset.price || '???');

            const action = quantity > 1
                ? `$购买${quantity}个【${name}】消费${priceText}积分`
                : `$购买【${name}】消费${priceText}积分`;

            sendActionMessage(action);
            return;
        }

        if (target.classList.contains('terminal-accept-quest')) {
            const name = target.dataset.name || '未命名任务';
            sendActionMessage(`$接取任务【${name}】`);
            return;
        }

        if (target.classList.contains('terminal-use-item')) {
            const name = target.dataset.name || '未知物品';
            sendActionMessage(`$使用背包物品【${name}】`);
        }
    });
}

function hideTerminalStateInRenderedMessage(messageId) {
    const mes = document.querySelector(
        `#chat .mes[mesid="${messageId}"]`,
    );

    const text = mes?.querySelector('.mes_text');

    if (!text) return;

    const candidates = [
        ...text.querySelectorAll('pre, code, p, div, blockquote'),
    ];

    for (const element of candidates) {
        if (element.textContent?.includes('<INFINITE_TERMINAL_STATE>')) {
            element.remove();
        }
    }

    const walker = document.createTreeWalker(
        text,
        NodeFilter.SHOW_TEXT,
    );

    const nodes = [];

    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }

    for (const node of nodes) {
        if (node.nodeValue?.includes('<INFINITE_TERMINAL_STATE>')) {
            node.parentElement?.remove();
        }
    }
}

async function handleMessageReceived(messageId) {
    const context = getContextSafe();
    const index =
        typeof messageId === 'number'
            ? messageId
            : (context?.chat?.length ?? 1) - 1;

    const message = context?.chat?.[index];

    if (!message || message.is_user || message.is_system) return;

    const rawState = extractTerminalState(message.mes);

    if (!rawState) return;

    const previous = getCurrentChatState();
    const next = normalizeState(rawState, previous);

    renderState(next);
    await saveCurrentChatState(next);

    setTimeout(() => hideTerminalStateInRenderedMessage(index), 80);
}

function renderCurrentChatState() {
    renderState(getCurrentChatState());
}

function clearCurrentChatState() {
    const context = getContextSafe();
    if (!context?.chatMetadata) return;

    delete context.chatMetadata[META_KEY];

    if (typeof context.saveMetadata === 'function') {
        context.saveMetadata();
    }

    renderState(DEFAULT_STATE);
}

function installSettingsUI() {
    const context = getContextSafe();
    const settingsRoot = document.getElementById('extensions_settings');

    if (!context || !settingsRoot) return;

    document.getElementById(`${MODULE_NAME}-settings`)?.remove();

    const settings = getSettings();

    const wrapper = document.createElement('div');
    wrapper.id = `${MODULE_NAME}-settings`;

    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>无限流个人终端</b>
                <div class="inline-drawer-icon fa-solid fa-chevron-down"></div>
            </div>

            <div class="inline-drawer-content" style="display:block;">
                <label class="checkbox_label">
                    <input
                        type="checkbox"
                        id="infinite-terminal-toggle"
                        ${settings.enabled ? 'checked' : ''}
                    >
                    <span>开启无限流终端悬浮窗</span>
                </label>

                <label
                    class="checkbox_label"
                    style="margin-top:8px;"
                >
                    <input
                        type="checkbox"
                        id="infinite-terminal-chat-toggle"
                        ${isCurrentChatEnabled() ? 'checked' : ''}
                    >
                    <span>当前聊天启用无限流 AI 规则</span>
                </label>

                <div class="terminal-setting-title">
                    无限流终端 AI 规则
                </div>

                <div class="terminal-setting-help">
                    这段规则只会在“当前聊天启用无限流 AI 规则”打开时，通过
                    SillyTavern 的 Prompt Injection 注入 AI 请求，不会作为普通聊天消息永久写入历史。
                    终端面板读取 AI 回复中的
                    &lt;INFINITE_TERMINAL_STATE&gt; JSON 并实时更新。
                </div>

                <textarea
                    id="infinite-terminal-instruction"
                    spellcheck="false"
                ></textarea>

                <button
                    type="button"
                    id="infinite-terminal-save-instruction"
                    class="menu_button"
                >
                    💾 保存无限流终端规则
                </button>

                <button
                    type="button"
                    id="infinite-terminal-clear-state"
                    class="menu_button"
                >
                    🗑 清除当前聊天终端状态
                </button>

                <div id="infinite-terminal-save-status">
                    规则已加载
                </div>
            </div>
        </div>
    `;

    settingsRoot.appendChild(wrapper);

    const textarea = wrapper.querySelector('#infinite-terminal-instruction');
    const saveButton = wrapper.querySelector('#infinite-terminal-save-instruction');
    const clearButton = wrapper.querySelector('#infinite-terminal-clear-state');
    const status = wrapper.querySelector('#infinite-terminal-save-status');

    if (textarea) {
        textarea.value = settings.instruction || DEFAULT_INSTRUCTION;
    }

    wrapper
        .querySelector('#infinite-terminal-toggle')
        ?.addEventListener('change', (event) => {
            settings.enabled = !!event.target.checked;
            saveSettings();

            if (!settings.enabled) {
                document.getElementById(PANEL_ID)?.style.setProperty('display', 'none');
                document.getElementById(BUTTON_ID)?.style.setProperty('display', 'none');
                setExtensionPromptSafe('');
                toastr?.success?.('无限流终端已关闭');
            } else {
                document.getElementById(BUTTON_ID)?.style.setProperty('display', 'flex');
                toastr?.success?.('无限流终端已开启');
            }
        });

    wrapper
        .querySelector('#infinite-terminal-chat-toggle')
        ?.addEventListener('change', async (event) => {
            await setCurrentChatEnabled(!!event.target.checked);

            if (event.target.checked) {
                toastr?.success?.('当前聊天已启用无限流 AI 规则');
            } else {
                setExtensionPromptSafe('');
                toastr?.success?.('当前聊天已关闭无限流 AI 规则');
            }
        });

    saveButton?.addEventListener('click', () => {
        const value = String(textarea?.value || '').trim();

        if (!value) {
            toastr?.warning?.('规则内容不能为空');
            return;
        }

        settings.instruction = value;
        saveSettings();

        if (status) status.textContent = '规则已保存 ✓';

        toastr?.success?.('无限流终端规则已保存');
    });

    clearButton?.addEventListener('click', async () => {
        clearCurrentChatState();

        if (status) status.textContent = '当前聊天终端状态已清除';

        toastr?.success?.('当前聊天终端状态已清除');
    });
}

function setupEvents() {
    const context = getContextSafe();

    if (!context?.eventSource || !context?.event_types) {
        console.warn(`[${MODULE_NAME}] SillyTavern 事件系统尚未就绪`);
        return;
    }

    const { eventSource, event_types } = context;

    const bind = (eventType, handler) => {
        if (eventType) {
            eventSource.on(eventType, handler);
        }
    };

    bind(event_types.MESSAGE_RECEIVED, handleMessageReceived);

    bind(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => {
        setTimeout(() => hideTerminalStateInRenderedMessage(messageId), 30);
    });

    bind(event_types.CHAT_CHANGED, () => {
        setTimeout(() => {
            renderCurrentChatState();
            installSettingsUI();
        }, 80);
    });

    bind(event_types.MESSAGE_SWIPED, handleMessageReceived);
    bind(event_types.MESSAGE_EDITED, handleMessageReceived);

    console.log(`[${MODULE_NAME}] 终端事件已启动`);
}

async function loadPanelHtml() {
    try {
        const html = await $.get(
            './scripts/extensions/third-party/infinite-terminal/index.html',
        );

        $('body').append(html);
        return true;
    } catch (error) {
        console.error(`[${MODULE_NAME}] 加载 index.html 失败`, error);
        toastr?.error?.('无限流终端 UI 加载失败，请检查 index.html');
        return false;
    }
}

async function init() {
    const settings = getSettings();

    installSettingsUI();

    if (!settings.enabled) return;

    const alreadyLoaded = document.querySelector(`.${'cyber-panel'}`);

    if (!alreadyLoaded) {
        const loaded = await loadPanelHtml();
        if (!loaded) return;
    }

    const panel = installPanel();

    if (!panel) return;

    createFloatingButton(panel);
    bindPanelActions();
    renderCurrentChatState();
    setupEvents();

    console.log(`[${MODULE_NAME}] 无限流个人终端已启动`);
}

jQuery(async function () {
    const waitForST = () => {
        if (
            typeof SillyTavern !== 'undefined' &&
            SillyTavern.getContext
        ) {
            init();
        } else {
            setTimeout(waitForST, 300);
        }
    };

    waitForST();
});
