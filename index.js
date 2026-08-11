import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "infinite_terminal";

const DEFAULT_SETTINGS = {
    enabled: true,

    // AI规则
    terminalInstruction: "",

    // 悬浮按钮位置
    buttonPosition: {
        left: null,
        top: null
    }
};


// ============================================================
// 获取设置
// ============================================================

function getSettings() {

    if (!extension_settings[MODULE_NAME]) {

        extension_settings[MODULE_NAME] = {
            ...DEFAULT_SETTINGS,
            buttonPosition: {
                left: null,
                top: null
            }
        };
    }

    const settings = extension_settings[MODULE_NAME];

    if (typeof settings.enabled !== "boolean") {
        settings.enabled = true;
    }

    if (typeof settings.terminalInstruction !== "string") {
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


// ============================================================
// 保存设置
// ============================================================

function saveSettings() {

    if (
        typeof saveSettingsDebounced === "function"
    ) {
        saveSettingsDebounced();
        return;
    }

    const context =
        typeof SillyTavern !== "undefined"
            ? SillyTavern.getContext()
            : null;

    if (
        context
        && typeof context.saveSettingsDebounced === "function"
    ) {
        context.saveSettingsDebounced();
    }
}


// ============================================================
// 关闭终端
// ============================================================

function closeTerminal() {

    const panel =
        $("#infinite-terminal-container");

    if (panel.length) {
        panel.fadeOut(180);
    }

}


// ============================================================
// 打开 / 关闭终端
// ============================================================

function toggleTerminal() {

    const panel =
        $("#infinite-terminal-container");

    if (!panel.length) {
        return;
    }

    panel.stop(true, true).fadeToggle(180);

}


// ============================================================
// 创建终端内部关闭按钮
// ============================================================

function createTerminalCloseButton() {

    const panel =
        $("#infinite-terminal-container");

    if (!panel.length) {
        return;
    }

    // 防止重复创建
    if ($("#infinite-terminal-close").length) {
        return;
    }


    const closeButton = `

        <button
            id="infinite-terminal-close"
            type="button"
            aria-label="关闭无限流终端"
            style="

                position: absolute;

                top: 10px;
                right: 10px;

                width: 32px;
                height: 32px;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 0;

                border-radius: 50%;

                background:
                    rgba(12, 14, 20, 0.88);

                border:
                    1px solid
                    rgba(210, 220, 235, 0.35);

                color:
                    rgba(235, 240, 248, 0.85);

                font-size: 18px;
                line-height: 1;

                cursor: pointer;

                z-index: 2147483647;

                box-shadow:
                    0 4px 15px
                    rgba(0, 0, 0, 0.45),

                    inset 0 1px 0
                    rgba(255,255,255,0.10);

                backdrop-filter:
                    blur(12px);

                -webkit-backdrop-filter:
                    blur(12px);

                transition:
                    all 0.18s ease;

            "
        >
            ×
        </button>

    `;


    // 直接挂到终端容器里
    panel.append(closeButton);


    $("#infinite-terminal-close").on(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeTerminal();

        }
    );


    // 悬停效果
    $("#infinite-terminal-close").on(
        "mouseenter",
        function () {

            $(this).css({

                background:
                    "rgba(45, 50, 62, 0.96)",

                borderColor:
                    "rgba(225,235,250,0.65)",

                color:
                    "#ffffff",

                transform:
                    "scale(1.08)"

            });

        }
    );


    $("#infinite-terminal-close").on(
        "mouseleave",
        function () {

            $(this).css({

                background:
                    "rgba(12, 14, 20, 0.88)",

                borderColor:
                    "rgba(210,220,235,0.35)",

                color:
                    "rgba(235,240,248,0.85)",

                transform:
                    "scale(1)"

            });

        }
    );

}


// ============================================================
// 创建悬浮终端按钮
// ============================================================

function createFloatingButton() {

    if ($("#floating-terminal-btn").length) {
        return;
    }


    const settings =
        getSettings();


    const buttonHtml = `

        <div
            id="floating-terminal-btn"

            role="button"

            aria-label="无限流终端"

            style="

                position: fixed;

                width: 124px;
                height: 44px;

                box-sizing: border-box;

                display: flex;

                align-items: center;
                justify-content: center;

                gap: 8px;

                border-radius: 14px;

                background:
                    linear-gradient(
                        135deg,
                        rgba(28, 34, 46, 0.96),
                        rgba(10, 13, 19, 0.94)
                    );

                border:
                    1px solid
                    rgba(215, 225, 240, 0.38);

                color:
                    rgba(235, 241, 250, 0.94);

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

                /* 这里直接使用浏览器允许的最大常规层级 */

                z-index: 2147483647 !important;

                pointer-events: auto !important;

                box-shadow:
                    0 8px 28px
                    rgba(0, 0, 0, 0.50),

                    0 0 18px
                    rgba(150, 180, 220, 0.10),

                    inset 0 1px 0
                    rgba(255,255,255,0.12);

                backdrop-filter:
                    blur(18px);

                -webkit-backdrop-filter:
                    blur(18px);

                transition:
                    transform 0.18s ease,
                    box-shadow 0.18s ease,
                    border-color 0.18s ease;

            "
        >

            <span
                style="
                    width: 6px;
                    height: 6px;

                    border-radius: 50%;

                    background:
                        rgba(205, 225, 255, 0.95);

                    box-shadow:
                        0 0 8px
                        rgba(190,220,255,0.85);

                    flex: 0 0 6px;

                    pointer-events: none;
                "
            ></span>


            <span
                style="
                    pointer-events: none;
                    white-space: nowrap;
                "
            >
                ◈ 终端
            </span>


            <span
                style="
                    position: absolute;

                    top: 0;
                    left: 12%;
                    right: 12%;

                    height: 1px;

                    background:
                        linear-gradient(
                            90deg,
                            transparent,
                            rgba(225,235,250,0.65),
                            transparent
                        );

                    pointer-events: none;
                "
            ></span>

        </div>

    `;


    // 非常重要：
    // 直接挂到 document.body 最底层，
    // 避免被 SillyTavern 其它容器的 stacking context 影响。

    document.body.insertAdjacentHTML(
        "beforeend",
        buttonHtml
    );


    const button =
        $("#floating-terminal-btn");


    // ========================================================
    // 设置按钮位置
    // ========================================================

    function applyPosition() {

        const width =
            button.outerWidth();

        const height =
            button.outerHeight();

        const margin = 12;


        let left;
        let top;


        if (
            typeof settings.buttonPosition.left
                === "number"
            &&
            typeof settings.buttonPosition.top
                === "number"
        ) {

            left =
                settings.buttonPosition.left;

            top =
                settings.buttonPosition.top;

        } else {

            // 默认右下角

            left =
                window.innerWidth
                - width
                - 24;

            top =
                window.innerHeight
                - height
                - 110;

        }


        // 永远限制在屏幕里面

        left =
            Math.max(
                margin,
                Math.min(
                    left,
                    window.innerWidth
                    - width
                    - margin
                )
            );


        top =
            Math.max(
                margin,
                Math.min(
                    top,
                    window.innerHeight
                    - height
                    - margin
                )
            );


        button.css({

            left: `${left}px`,
            top: `${top}px`,

            right: "auto",
            bottom: "auto",

            zIndex:
                "2147483647"

        });


        settings.buttonPosition.left =
            left;

        settings.buttonPosition.top =
            top;

    }


    // 等页面布局完成以后再设置
    requestAnimationFrame(() => {

        applyPosition();

    });


    // ========================================================
    // 拖动逻辑
    // ========================================================

    let dragging = false;

    let moved = false;

    let startX = 0;
    let startY = 0;

    let originalLeft = 0;
    let originalTop = 0;


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


            originalLeft =
                rect.left;

            originalTop =
                rect.top;


            button.css({

                cursor:
                    "grabbing",

                transform:
                    "scale(0.97)",

                transition:
                    "none"

            });


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


            const margin = 8;


            let left =
                originalLeft + dx;

            let top =
                originalTop + dy;


            left =
                Math.max(
                    margin,
                    Math.min(
                        left,
                        window.innerWidth
                        - width
                        - margin
                    )
                );


            top =
                Math.max(
                    margin,
                    Math.min(
                        top,
                        window.innerHeight
                        - height
                        - margin
                    )
                );


            button.css({

                left: `${left}px`,
                top: `${top}px`

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


            button.css({

                cursor:
                    "grab",

                transform:
                    "scale(1)",

                transition:
                    "transform 0.18s ease, " +
                    "box-shadow 0.18s ease, " +
                    "border-color 0.18s ease"

            });


            const rect =
                button[0]
                    .getBoundingClientRect();


            settings.buttonPosition.left =
                rect.left;

            settings.buttonPosition.top =
                rect.top;


            saveSettings();


            // 没移动才算点击
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


    // ========================================================
    // 鼠标悬停
    // ========================================================

    button.on(
        "mouseenter",
        function () {

            if (dragging) {
                return;
            }


            button.css({

                transform:
                    "translateY(-2px)",

                borderColor:
                    "rgba(225,235,250,0.62)",

                boxShadow:
                    "0 12px 36px rgba(0,0,0,0.55), " +
                    "0 0 22px rgba(170,200,240,0.14), " +
                    "inset 0 1px 0 rgba(255,255,255,0.16)"

            });

        }
    );


    button.on(
        "mouseleave",
        function () {

            if (dragging) {
                return;
            }


            button.css({

                transform:
                    "translateY(0)",

                borderColor:
                    "rgba(215,225,240,0.38)",

                boxShadow:
                    "0 8px 28px rgba(0,0,0,0.50), " +
                    "0 0 18px rgba(150,180,220,0.10), " +
                    "inset 0 1px 0 rgba(255,255,255,0.12)"

            });

        }
    );


    // ========================================================
    // 浏览器窗口大小变化
    // ========================================================

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
        $("#infinite-terminal-container").length
    ) {
        return;
    }


    try {

        const html =
            await $.get(
                "./scripts/extensions/third-party/infinite-terminal/index.html"
            );


        // ====================================================
        // 建立一个独立的最高层容器
        // ====================================================

        $("body").append(`

            <div
                id="infinite-terminal-container"

                style="

                    position: fixed;

                    top: 60px;
                    right: 20px;

                    width:
                        min(520px, calc(100vw - 40px));

                    max-height:
                        calc(100vh - 90px);

                    overflow-y: auto;
                    overflow-x: hidden;

                    z-index: 2000000 !important;

                    pointer-events: auto;

                "
            >

                ${html}

            </div>

        `);


        const container =
            $("#infinite-terminal-container");


        // ====================================================
        // 保证终端内部不会因为原本的 z-index 乱掉
        // ====================================================

        container.css({

            zIndex:
                "2000000",

            position:
                "fixed",

            pointerEvents:
                "auto"

        });


        // ====================================================
        // 创建终端内部关闭按钮
        // ====================================================

        createTerminalCloseButton();


        // ====================================================
        // 创建外部悬浮按钮
        // ====================================================

        createFloatingButton();


        console.log(
            "[无限流终端] 终端加载完成。"
        );


    } catch (error) {

        console.error(
            "[无限流终端] 加载失败：",
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
// 卸载终端
// ============================================================

function unloadTerminal() {

    $("#floating-terminal-btn").remove();

    $("#infinite-terminal-container").remove();

    $(window).off(
        "resize.infiniteTerminalButton"
    );

}


// ============================================================
// 创建酒馆扩展设置
// ============================================================

function createSettingsUI() {

    if (
        $("#infinite-terminal-settings").length
    ) {
        return;
    }


    const settings =
        getSettings();


    const settingsHtml = `

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
                        ${settings.enabled ? "checked" : ""}
                    >

                    <span>
                        开启赛博终端悬浮窗
                    </span>

                </label>


                <hr>


                <div
                    style="
                        margin-top:10px;
                        margin-bottom:8px;
                    "
                >

                    <b>
                        无限流终端 AI 规则
                    </b>

                </div>


                <div
                    style="
                        opacity:0.75;
                        font-size:12px;
                        margin-bottom:8px;
                    "
                >

                    这里填写 AI 每轮维护无限流终端状态时必须遵守的规则。
                    <br>
                    当前阶段只负责保存规则，后续再接入 AI。

                </div>


                <textarea
                    id="infinite-terminal-instruction"

                    style="
                        width:100%;
                        min-height:360px;

                        resize:vertical;

                        box-sizing:border-box;

                        padding:10px;

                        border-radius:8px;

                        font-family:monospace;

                        line-height:1.5;

                        background:
                            rgba(0,0,0,0.15);

                        color:
                            var(--SmartThemeBodyColor);

                        border:
                            1px solid
                            var(--SmartThemeBorderColor);
                    "

                    placeholder="把你的无限流 terminal_instruction 粘贴到这里……"
                ></textarea>


                <button
                    id="infinite-terminal-save-instruction"
                    class="menu_button"

                    style="
                        width:100%;
                        margin-top:10px;
                    "
                >

                    💾 保存无限流终端规则

                </button>


                <div
                    id="infinite-terminal-save-status"

                    style="
                        margin-top:8px;
                        font-size:12px;
                        opacity:0.7;
                        text-align:center;
                    "
                >

                    规则尚未修改

                </div>


            </div>

        </div>

    `;


    $("#extensions_settings").append(
        settingsHtml
    );


    $("#infinite-terminal-instruction")
        .val(
            settings.terminalInstruction
        );


    // ========================================================
    // 开关
    // ========================================================

    $("#infinite-terminal-toggle").on(
        "change",
        function () {

            settings.enabled =
                this.checked;


            saveSettings();


            if (settings.enabled) {

                loadTerminal();

            } else {

                unloadTerminal();

            }

        }
    );


    // ========================================================
    // 规则输入
    // ========================================================

    $("#infinite-terminal-instruction").on(
        "input",
        function () {

            $("#infinite-terminal-save-status")
                .text(
                    "规则已修改，记得点击保存。"
                );

        }
    );


    // ========================================================
    // 保存规则
    // ========================================================

    $("#infinite-terminal-save-instruction").on(
        "click",
        function () {

            settings.terminalInstruction =
                $("#infinite-terminal-instruction")
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

}


// ============================================================
// ESC键关闭终端
// ============================================================

$(document).on(
    "keydown.infiniteTerminal",
    function (event) {

        if (event.key === "Escape") {

            closeTerminal();

        }

    }
);


// ============================================================
// 扩展启动
// ============================================================

jQuery(async () => {

    try {

        getSettings();

        createSettingsUI();

        const settings =
            getSettings();


        if (settings.enabled) {

            await loadTerminal();

        }


        console.log(
            "[无限流终端] 扩展初始化完成。"
        );


    } catch (error) {

        console.error(
            "[无限流终端] 初始化失败：",
            error
        );

    }

});
