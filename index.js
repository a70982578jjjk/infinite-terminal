import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "infinite_terminal";

// 默认设置：默认开启悬浮窗
const DEFAULT_SETTINGS = {
    enabled: true
};

async function loadSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = Object.assign({}, DEFAULT_SETTINGS);
    }
}

jQuery(async () => {

    await loadSettings();

    // ==========================================
    // 加载无限流个人终端
    // ==========================================

    if (extension_settings[MODULE_NAME].enabled) {

        try {

            // 加载你的 HTML 面板
            const html = await $.get(
                './scripts/extensions/third-party/infinite-terminal/index.html'
            );

            // ==========================================
            // 创建一个真正的“悬浮层”
            // ==========================================

            $('body').append(`
                <div id="infinite-terminal-container">
                    ${html}
                </div>
            `);

            // ==========================================
            // 关键！
            // 让整个终端脱离普通页面排版
            // 并且强制放到最上层
            // ==========================================

            $('#infinite-terminal-container').css({
                position: 'fixed',
                top: '70px',
                right: '20px',
                width: 'min(480px, calc(100vw - 40px))',
                maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: '999999',
                pointerEvents: 'auto'
            });

            // 再给真正的终端面板加一层保险
            $('#infinite-terminal-container .cyber-panel').css({
                position: 'relative',
                zIndex: '1000000'
            });

            // ==========================================
            // 创建专属悬浮按钮
            // ==========================================

            const floatingBtn = `
                <div id="floating-terminal-btn" style="
                    position: fixed;
                    right: 15px;
                    bottom: 120px;
                    z-index: 1000001;

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

                    user-select: none;
                ">
                    🔥 终端
                </div>
            `;

            $('body').append(floatingBtn);

            // ==========================================
            // 点击“🔥 终端”
            // 显示 / 隐藏整个终端
            // ==========================================

            $('#floating-terminal-btn').on('click', () => {

                $('#infinite-terminal-container').fadeToggle(200);

            });

            console.log(
                '[无限流个人终端] 悬浮终端加载成功！'
            );

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

    // ==========================================
    // 在酒馆扩展设置里注册开关
    // ==========================================

    const settingsHtml = `
        <div class="inline-drawer">

            <div class="inline-drawer-toggle inline-drawer-header">

                <b>无限流个人终端设置</b>

                <div class="inline-drawer-icon fa-solid fa-chevron-down"></div>

            </div>

            <div class="inline-drawer-content" style="display: block;">

                <label class="checkbox_label">

                    <input
                        type="checkbox"
                        id="infinite-terminal-toggle"
                        ${extension_settings[MODULE_NAME].enabled ? 'checked' : ''}
                    >

                    <span>开启赛博终端悬浮窗</span>

                </label>

            </div>

        </div>
    `;

    // ==========================================
    // 关键！
    // 使用现在的扩展设置容器
    // ==========================================

    $('#extensions_settings2').append(settingsHtml);

    // ==========================================
    // 监听开关
    // ==========================================

    $('#infinite-terminal-toggle').on('change', function() {

        extension_settings[MODULE_NAME].enabled = this.checked;

        toastr.success(
            "设置已保存，请刷新页面生效！"
        );

    });

});
