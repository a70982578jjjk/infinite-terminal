const MODULE_NAME = "infinite_terminal";

// 默认设置：默认开启悬浮窗
const DEFAULT_SETTINGS = {
    enabled: true,
};

jQuery(async () => {
    // 获取 SillyTavern 的扩展上下文
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced } = context;

    // 初始化设置
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
    }

    // 如果旧版本没有 enabled，就补上默认值
    if (typeof extensionSettings[MODULE_NAME].enabled !== "boolean") {
        extensionSettings[MODULE_NAME].enabled = DEFAULT_SETTINGS.enabled;
    }

    const settings = extensionSettings[MODULE_NAME];

    // ==============================
    // 加载无限流个人终端
    // ==============================

    async function loadTerminal() {
        // 防止重复创建
        if ($('#infinite-terminal-container').length) {
            return;
        }

        try {
            // 加载你的 HTML 面板
            const html = await $.get(
                './scripts/extensions/third-party/infinite-terminal/index.html'
            );

            $('body').append(
                `<div id="infinite-terminal-container">${html}</div>`
            );

            // 创建专属悬浮按钮
            const floatingBtn = `
                <div id="floating-terminal-btn" style="
                    position: fixed;
                    right: 15px;
                    bottom: 120px;
                    z-index: 9999;
                    background: #ff2a2a;
                    color: #fff;
                    padding: 10px 14px;
                    border-radius: 50px;
                    font-size: 12px;
                    font-weight: bold;
                    box-shadow: 0 0 15px rgba(255,42,42,0.6);
                    cursor: pointer;
                    font-family: monospace;
                    border: 1px solid #fff;
                ">
                    🔥 终端
                </div>
            `;

            $('body').append(floatingBtn);

            // 点击悬浮按钮：显示 / 隐藏终端
            $('#floating-terminal-btn').on('click', () => {
                $('.cyber-panel').fadeToggle(200);
            });

        } catch (error) {
            console.error(
                '[无限流个人终端] 加载面板失败：',
                error
            );

            toastr.error(
                '无限流个人终端加载失败，请查看控制台错误信息。'
            );
        }
    }

    // ==============================
    // 卸载无限流个人终端
    // ==============================

    function unloadTerminal() {
        $('#floating-terminal-btn').remove();
        $('#infinite-terminal-container').remove();
    }

    // ==============================
    // 根据设置决定是否加载
    // ==============================

    if (settings.enabled) {
        await loadTerminal();
    }

    // ==============================
    // 注册到 SillyTavern 扩展设置面板
    // ==============================

    const settingsHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>无限流个人终端</b>
                <div class="inline-drawer-icon fa-solid fa-chevron-down"></div>
            </div>

            <div class="inline-drawer-content" style="display: block;">

                <label class="checkbox_label">
                    <input
                        type="checkbox"
                        id="infinite-terminal-toggle"
                        ${settings.enabled ? 'checked' : ''}
                    >
                    <span>开启赛博终端悬浮窗</span>
                </label>

            </div>
        </div>
    `;

    // 注意：
    // 这里必须挂到 SillyTavern 当前使用的扩展设置容器
    $('#extensions_settings2').append(settingsHtml);

    // ==============================
    // 监听设置开关
    // ==============================

    $('#infinite-terminal-toggle').on('change', async function () {
        settings.enabled = this.checked;

        // 保存设置
        saveSettingsDebounced();

        // 根据开关立即加载 / 卸载
        if (settings.enabled) {
            await loadTerminal();

            toastr.success(
                '无限流个人终端已开启！'
            );
        } else {
            unloadTerminal();

            toastr.success(
                '无限流个人终端已关闭。'
            );
        }
    });

    console.log(
        '[无限流个人终端] 扩展加载成功！'
    );
});
