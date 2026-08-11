import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "infinite_terminal";

const DEFAULT_SETTINGS = {
    enabled: true,

    // 无限流终端 AI 规则
    terminalInstruction: ``
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

    // 防止旧版本没有这个设置
    if (
        typeof extension_settings[MODULE_NAME].terminalInstruction
        !== "string"
    ) {
        extension_settings[MODULE_NAME].terminalInstruction = "";
    }

    if (
        typeof extension_settings[MODULE_NAME].enabled
        !== "boolean"
    ) {
        extension_settings[MODULE_NAME].enabled = true;
    }

    return extension_settings[MODULE_NAME];
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

        // 创建终端外层容器
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

            width: "min(480px, calc(100vw - 40px))",

            maxHeight: "calc(100vh - 100px)",

            overflowY: "auto",

            overflowX: "hidden",

            zIndex: "999999",

            pointerEvents: "auto"
        });


        // 让真正的终端面板也处于高层级

        $("#infinite-terminal-container .cyber-panel").css({

            position: "relative",

            zIndex: "1000000"
        });


        // ==========================================
        // 创建右下角悬浮按钮
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

                box-shadow:
                    0 0 15px rgba(255,42,42,0.6);

                cursor: pointer;

                font-family: monospace;

                border: 1px solid #fff;

                user-select: none;
            ">
                🔥 终端
            </div>
        `;

        $("body").append(floatingBtn);


        // ==========================================
        // 点击按钮：显示 / 隐藏终端
        // ==========================================

        $("#floating-terminal-btn").on(
            "click",
            () => {

                $("#infinite-terminal-container")
                    .fadeToggle(200);

            }
        );


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
                class="inline-drawer-toggle inline-drawer-header"
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
    // 把已经保存的规则放进文本框
    // ==========================================

    $("#infinite-terminal-instruction")
        .val(settings.terminalInstruction);


    // ==========================================
    // 开关
    // ==========================================

    $("#infinite-terminal-toggle").on(
        "change",
        function () {

            settings.enabled = this.checked;

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
                .text("规则已修改，记得点击保存。");

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
                .text("✅ 无限流终端规则已保存！");

            toastr.success(
                "无限流终端规则已保存！"
            );

        }
    );

}


// ==========================================
// 保存扩展设置
// ==========================================

function saveExtensionSettings() {

    // SillyTavern 会自动处理 extension_settings 的保存
    // 这里调用官方的设置保存函数

    const context = SillyTavern.getContext();

    if (
        typeof context.saveSettingsDebounced
        === "function"
    ) {

        context.saveSettingsDebounced();

    }

}


// ==========================================
// 扩展启动
// ==========================================

jQuery(async () => {

    try {

        // 获取设置
        const settings = getSettings();


        // 创建扩展设置界面
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
