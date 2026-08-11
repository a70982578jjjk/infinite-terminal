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

    // 如果设置里没关闭，就加载面板和悬浮按钮
    if (extension_settings[MODULE_NAME].enabled) {
        // 加载 HTML 面板
        const html = await $.get('./scripts/extensions/third-party/infinite-terminal/index.html');
        $('body').append(html);

        // 创建专属悬浮窗按钮
        const floatingBtn = `
            <div id="floating-terminal-btn" style="
                position: fixed; right: 15px; bottom: 120px; z-index: 9999; 
                background: #ff2a2a; color: #fff; padding: 10px 14px; 
                border-radius: 50px; font-size: 12px; font-weight: bold; 
                box-shadow: 0 0 15px rgba(255,42,42,0.6); cursor: pointer;
                font-family: monospace; border: 1px solid #fff;
            ">
                🔥 终端
            </div>
        `;
        $('body').append(floatingBtn);

        // 点击悬浮窗唤醒/隐藏面板
        $('#floating-terminal-btn').on('click', () => {
            $('.cyber-panel').fadeToggle(200);
        });
    }

    // 在扩展管理设置面板里注册一个开关（这样它就会像小冰块一样堂堂正正显示在扩展列表里了！）
    const settingsHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>无限流个人终端设置</b>
                <div class="inline-drawer-icon fa-solid fa-chevron-down"></div>
            </div>
            <div class="inline-drawer-content" style="display: block;">
                <label class="checkbox_label">
                    <input type="checkbox" id="infinite-terminal-toggle" ${extension_settings[MODULE_NAME].enabled ? 'checked' : ''}>
                    <span>开启赛博终端悬浮窗</span>
                </label>
            </div>
        </div>
    `;
    
    // 把设置面板挂载到酒馆的扩展界面
    $('#extensions_settings').append(settingsHtml);
    
    // 监听开关变化
    $('#infinite-terminal-toggle').on('change', function() {
        extension_settings[MODULE_NAME].enabled = this.checked;
        toastr.success("设置已保存，请刷新页面生效！");
    });
});
