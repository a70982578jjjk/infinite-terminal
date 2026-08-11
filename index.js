import { extension_settings } from "../../../extensions.js";

jQuery(async () => {
    // 1. 读取 HTML 面板文件
    const html = await $.get('./scripts/extensions/third-party/infinite-terminal/index.html');
    $('body').append(html);

    // 2. 在手机屏幕右侧悬浮一个专属的“🔥 终端”按钮
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

    // 3. 点击悬浮按钮，控制面板的显示/隐藏
    $('#floating-terminal-btn').on('click', () => {
        $('.cyber-panel').fadeToggle(200);
    });
});
