import { extension_settings } from "../../../extensions.js";

jQuery(async () => {
    const html = await $.get('./scripts/extensions/third-party/infinite-terminal/index.html');
    $('body').append(html);
    const buttonHtml = `<div id="toggle-terminal-btn" class="menu_button">🔥 终端</div>`;
    $('#extensions_menu').prepend(buttonHtml);
    $('#toggle-terminal-btn').on('click', () => {
        $('.cyber-panel').fadeToggle(200);
    });
});
