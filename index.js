import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "infinite_terminal";

const DEFAULT_SETTINGS = {
    enabled: true,

    // 无限流终端 AI 规则
    terminalInstruction: "",

    // 悬浮按钮位置
    buttonPosition: {
        left: null,
        top: null
    }
};


// ==========================================
// 读取 / 初始化扩展设置
// ==========================================

function getSettings() {

    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = Object.assign(
            {},
            DEFAULT_SETTINGS
        );
    }

    const settings = extension_settings[MODULE_NAME];

    // 防止旧版本没有这些设置
    if (typeof settings.terminalInstruction !== "string") {
        settings.terminalInstruction = "";
    }

    if (typeof settings.enabled !== "boolean") {
        settings.enabled = true;
    }

    if (!settings.buttonPosition) {
        settings.buttonPosition = {
            left: null,
            top: null
        };
    }

    if (
        typeof settings.buttonPosition.left !== "number"
        && settings.buttonPosition.left !== null
    ) {
        settings.buttonPosition.left = null;
    }

    if (
        typeof settings.buttonPosition.top !== "number"
        && settings.buttonPosition.top !== null
    ) {
        settings.buttonPosition.top = null;
    }

    return settings;
}


// ==========================================
// 保存扩展设置
// ==========================================

function saveExtensionSettings() {

    const context = SillyTavern.getContext();

    if (
        typeof context.saveSettingsDebounced === "function"
    ) {
        context.saveSettingsDebounced();
    }
}


// ==========================================
// 创建漂亮的悬浮按钮
// ==========================================

function createFloatingButton() {

    // 防止重复创建
    if ($("#floating-terminal-btn").length) {
        return;
    }

    const settings = getSettings();

    const floatingBtn = `
        <div
            id="floating-terminal-btn"
            role="button"
            aria-label="无限流终端"
            style="
                position: fixed;

                width: 118px;
                height: 42px;

                box-sizing: border-box;

                display: flex;
                align-items: center;
                justify-content: center;

                gap: 8px;

                border-radius: 14px;

                background:
                    linear-gradient(
                        135deg,
                        rgba(32, 38, 50, 0.94),
                        rgba(18, 22, 31, 0.90)
                    );

                border:
                    1px solid
                    rgba(205, 218, 240, 0.32);

                box-shadow:
                    0 8px 28px rgba(0, 0, 0, 0.38),
                    inset 0 1px 0 rgba(255, 255, 255, 0.10),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.35);

                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);

                color:
                    rgba(235, 241, 250, 0.92);

                font-family:
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;

                font-size: 14px;
                font-weight: 600;

                letter-spacing: 1.5px;

                cursor: grab;

                user-select: none;
                -webkit-user-select: none;

                touch-action: none;

                z-index: 1000001;

                transition:
                    transform 0.18s ease,
                    box-shadow 0.18s ease,
                    border-color 0.18s ease,
                    background 0.18s ease;

                overflow: hidden;
            "
        >

            <!-- 微弱的顶部光泽 -->

            <div
                style="
                    position: absolute;
                    left: 10%;
                    right: 10%;
                    top: 0;

                    height: 1px;

                    background:
                        linear-gradient(
                            90deg,
                            transparent,
                            rgba(220, 235, 255, 0.65),
                            transparent
                        );

                    pointer-events: none;
                "
            ></div>


            <!-- 状态光点 -->

            <span
                id="terminal-status-dot"
                style="
                    width: 6px;
                    height: 6px;

                    flex: 0 0 6px;

                    border-radius: 50%;

                    background:
                        rgba(190, 220, 255, 0.95);

                    box-shadow:
                        0 0 7px
                        rgba(190, 220, 255, 0.75);

                    pointer-events: none;
                "
            ></span>


            <!-- 文字 -->

            <span
                style="
                    pointer-events: none;
                    white-space: nowrap;
                "
            >
                ◈ 终端
            </span>

        </div>
    `;

    $("body").append(floatingBtn);


    const button = $("#floating-terminal-btn");


    // ==========================================
    // 设置按钮初始位置
    // ==========================================

    function applyButtonPosition() {

        const position = settings.buttonPosition;

        const buttonWidth = button.outerWidth();
        const buttonHeight = button.outerHeight();

        const margin = 16;

        let left;
        let top;

        // 如果之前保存过位置，就恢复
        if (
            typeof position.left === "number"
            && typeof position.top === "number"
        ) {

            left = position.left;
            top = position.top;

        } else {

            // 第一次使用：
            // 默认放在右下区域

            left =
                window.innerWidth
                - buttonWidth
                - 22;

            top =
                window.innerHeight
                - buttonHeight
                - 110;
        }


        // 防止窗口尺寸改变以后按钮跑到屏幕外
        left = Math.max(
            margin,
            Math.min(
                left,
                window.innerWidth
                - buttonWidth
                - margin
            )
        );

        top = Math.max(
            margin,
            Math.min(
                top,
                window.innerHeight
                - buttonHeight
                - margin
            )
        );


        button.css({
            left: `${left}px`,
            top: `${top}px`,
            right: "auto",
            bottom: "auto"
        });


        // 如果原来的位置超出屏幕，
        // 顺便保存修正后的位置

        if (
            position.left !== left
            || position.top !== top
        ) {

            position.left = left;
            position.top = top;

            saveExtensionSettings();
        }
    }


    // 等浏览器完成布局后再计算位置
    requestAnimationFrame(() => {
        applyButtonPosition();
    });


    // ==========================================
    // 按钮拖拽系统
    // ==========================================

    let isDragging = false;

    let hasMoved = false;

    let pointerStartX = 0;
    let pointerStartY = 0;

    let buttonStartLeft = 0;
    let buttonStartTop = 0;


    button.on("pointerdown", function (event) {

        // 只处理主要指针
        if (
            event.pointerType === "mouse"
            && event.button !== 0
        ) {
            return;
        }


        const rect =
            button[0].getBoundingClientRect();


        pointerStartX = event.clientX;
        pointerStartY = event.clientY;

        buttonStartLeft = rect.left;
        buttonStartTop = rect.top;

        isDragging = true;
        hasMoved = false;


        button.css({
            cursor: "grabbing",
            transition: "none"
        });


        // 让按钮持续接收触摸 / 鼠标事件
        try {
            button[0].setPointerCapture(
                event.pointerId
            );
        } catch (error) {
            // 某些旧浏览器可能不支持
        }


        event.preventDefault();
    });


    button.on("pointermove", function (event) {

        if (!isDragging) {
            return;
        }


        const deltaX =
            event.clientX - pointerStartX;

        const deltaY =
            event.clientY - pointerStartY;


        // 移动超过 4px 才认定是真正拖动
        if (
            Math.abs(deltaX) > 4
            || Math.abs(deltaY) > 4
        ) {
            hasMoved = true;
        }


        const buttonWidth =
            button.outerWidth();

        const buttonHeight =
            button.outerHeight();

        const margin = 8;


        let newLeft =
            buttonStartLeft + deltaX;

        let newTop =
            buttonStartTop + deltaY;


        // 限制在屏幕范围内

        newLeft = Math.max(
            margin,
            Math.min(
                newLeft,
                window.innerWidth
                - buttonWidth
                - margin
            )
        );

        newTop = Math.max(
            margin,
            Math.min(
                newTop,
                window.innerHeight
                - buttonHeight
                - margin
            )
        );


        button.css({
            left: `${newLeft}px`,
            top: `${newTop}px`
        });


        event.preventDefault();
    });


    button.on("pointerup pointercancel", function (event) {

        if (!isDragging) {
            return;
        }


        isDragging = false;


        button.css({
            cursor: "grab",
            transition:
                "transform 0.18s ease, " +
                "box-shadow 0.18s ease, " +
                "border-color 0.18s ease, " +
                "background 0.18s ease"
        });


        const rect =
            button[0].getBoundingClientRect();


        // 保存最终位置

        settings.buttonPosition.left =
            rect.left;

        settings.buttonPosition.top =
            rect.top;


        saveExtensionSettings();


        // 如果只是点击，没有真正移动，
        // 那么才执行显示 / 隐藏

        if (!hasMoved) {

            toggleTerminal();
        }


        try {
            button[0].releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            // 某些浏览器可能不支持
        }


        event.preventDefault();
    });


    // ==========================================
    // 鼠标悬停效果
    // ==========================================

    button.on("mouseenter", function () {

        if (isDragging) {
            return;
        }

        button.css({
            transform: "translateY(-2px)",

            borderColor:
                "rgba(220, 232, 250, 0.55)",

            boxShadow:
                "0 12px 34px rgba(0,0,0,0.45), " +
                "0 0 18px rgba(170,200,240,0.12), " +
                "inset 0 1px 0 rgba(255,255,255,0.14)"
        });

    });


    button.on("mouseleave", function () {

        if (isDragging) {
            return;
        }

        button.css({
            transform: "translateY(0)",

            borderColor:
                "rgba(205, 218, 240, 0.32)",

            boxShadow:
                "0 8px 28px rgba(0,0,0,0.38), " +
                "inset 0 1px 0 rgba(255,255,255,0.10), " +
                "inset 0 -1px 0 rgba(0,0,0,0.35)"
        });

    });


    // ==========================================
    // 窗口尺寸改变时重新限制按钮位置
    // ==========================================

    $(window).on(
        "resize.infiniteTerminalButton",
        function () {
            applyButtonPosition();
        }
    );
}


// ==========================================
// 显示 / 隐藏终端
// ==========================================

function toggleTerminal() {

    const panel =
        $("#infinite-terminal-container");


    if (!panel.length) {
        return;
    }


    panel.fadeToggle(200);
}


// ==========================================
// 加载无限流终端悬浮面板
// ==========================================

async function loadTerminal() {

    // 防止重复加载
    if ($("#infinite-terminal-container").length) {
        return;
    }


    try {

        const html = await $.get(
            "./scripts/extensions/third-party/infinite-terminal/index.html"
        );


        $("body").append(`
            <div id="infinite-terminal-container">
                ${html}
            </div>
        `);


        // ==========================================
        // 让终端成为真正的最上层悬浮窗口
        // ==========================================

        $("#infinite-terminal-container").css({

            position: "fixed",

            top: "70px",

            right: "20px",

            width:
                "min(480px, calc(100vw - 40px))",

            maxHeight:
                "calc(100vh - 100px)",

            overflowY: "auto",

            overflowX: "hidden",

            zIndex: "999999",

            pointerEvents: "auto"
        });


        // ==========================================
        // 终端内部面板层级
        // ==========================================

        $("#infinite-terminal-container .cyber-panel")
            .css({

                position: "relative",

                zIndex: "1000000"
            });


        // ==========================================
        // 创建悬浮按钮
        // ==========================================

        createFloatingButton();


        console.log(
            "[无限流个人终端] 悬浮终端加载成功！"
        );


    } catch (error) {

        console.error(
            "[无限流个人终端] 加载面板失败：",
            error
        );


        toastr.error(
            "无限流个人终端加载失败，请查看控制台错误信息。"
        );
    }
}


// ==========================================
// 卸载终端
// ==========================================

function unloadTerminal() {

    $("#floating-terminal-btn").remove();

    $("#infinite-terminal-container").remove();

    $(window).off(
        "resize.infiniteTerminalButton"
    );
}


// ==========================================
// 创建扩展设置 UI
// ==========================================

function createSettingsUI() {

    // 防止重复创建
    if ($("#infinite-terminal-settings").length) {
        return;
    }


    const settings = getSettings();


    const settingsHtml = `

        <div
            id="infinite-terminal-settings"
            class="inline-drawer"
        >

            <!-- ==============================
                 标题
            =============================== -->

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


            <!-- ==============================
                 设置内容
            =============================== -->

            <div
                class="inline-drawer-content"
                style="display: block;"
            >


                <!-- ==============================
                     开关
                =============================== -->

                <label
                    class="checkbox_label"
                >

                    <input
                        type="checkbox"
                        id="infinite-terminal-toggle"
                        ${settings.enabled ? "checked" : ""}
                    >

                    <span>
                        开启赛博终端悬浮窗
                    </span>

                </label>


                <hr>


                <!-- ==============================
                     AI 规则编辑区
                =============================== -->

                <div
                    style="
                        margin-top: 10px;
                        margin-bottom: 8px;
                    "
                >

                    <b>
                        无限流终端 AI 规则
                    </b>

                </div>


                <div
                    style="
                        opacity: 0.75;
                        font-size: 12px;
                        margin-bottom: 8px;
                    "
                >

                    这里填写 AI 每轮维护无限流终端状态时必须遵守的规则。
                    <br>
                    当前阶段只负责保存规则，下一阶段再接入 AI。

                </div>


                <textarea
                    id="infinite-terminal-instruction"
                    style="
                        width: 100%;
                        min-height: 360px;
                        resize: vertical;

                        box-sizing: border-box;

                        font-family: monospace;
                        font-size: 12px;
                        line-height: 1.5;

                        padding: 10px;

                        border-radius: 6px;

                        border: 1px solid
                               var(--SmartThemeBorderColor);

                        background:
                            var(--SmartThemeBlurTintColor);

                        color:
                            var(--SmartThemeBodyColor);
                    "
                    placeholder="把你的无限流 terminal_instruction 粘贴到这里……"
                ></textarea>


                <!-- ==============================
                     保存按钮
                =============================== -->

                <div
                    style="
                        margin-top: 10px;
                    "
                >

                    <button
                        id="infinite-terminal-save-instruction"
                        class="menu_button"
                        style="
                            width: 100%;
                        "
                    >

                        💾 保存无限流终端规则

                    </button>

                </div>


                <!-- ==============================
                     当前状态提示
                =============================== -->

                <div
                    id="infinite-terminal-save-status"
                    style="
                        margin-top: 8px;
                        font-size: 12px;
                        opacity: 0.7;
                        text-align: center;
                    "
                >

                    规则尚未修改

                </div>


            </div>

        </div>

    `;


    // ==========================================
    // 把设置 UI 放进 SillyTavern
    // ==========================================

    $("#extensions_settings2").append(
        settingsHtml
    );


    // ==========================================
    // 读取已经保存的规则
    // ==========================================

    $("#infinite-terminal-instruction")
        .val(settings.terminalInstruction);


    // ==========================================
    // 开关
    // ==========================================

    $("#infinite-terminal-toggle").on(
        "change",
        function () {

            settings.enabled =
                this.checked;

            saveExtensionSettings();


            if (settings.enabled) {

                loadTerminal();

            } else {

                unloadTerminal();

            }

        }
    );


    // ==========================================
    // 监听规则修改
    // ==========================================

    $("#infinite-terminal-instruction").on(
        "input",
        function () {

            $("#infinite-terminal-save-status")
                .text(
                    "规则已修改，记得点击保存。"
                );

        }
    );


    // ==========================================
    // 保存规则
    // ==========================================

    $("#infinite-terminal-save-instruction").on(
        "click",
        function () {

            settings.terminalInstruction =
                $("#infinite-terminal-instruction")
                    .val();


            saveExtensionSettings();


            $("#infinite-terminal-save-status")
                .text(
                    "✅ 无限流终端规则已保存！"
                );


            toastr.success(
                "无限流终端规则已保存！"
            );

        }
    );

}


// ==========================================
// 扩展启动
// ==========================================

jQuery(async () => {

    try {

        const settings =
            getSettings();


        // 创建扩展设置
        createSettingsUI();


        // 如果启用，就加载终端
        if (settings.enabled) {

            await loadTerminal();

        }


        console.log(
            "[无限流个人终端] 扩展初始化完成。"
        );


    } catch (error) {

        console.error(
            "[无限流个人终端] 初始化失败：",
            error
        );


        toastr.error(
            "无限流个人终端初始化失败，请查看控制台。"
        );

    }

});
