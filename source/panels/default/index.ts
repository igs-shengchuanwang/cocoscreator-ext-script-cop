import { readFileSync } from 'fs-extra';
import { join } from 'path';
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        inspectBtn: '#inspect-btn',
    },
    methods: {
        /**
         * 处理脚本检查按钮点击
         */
        handleInspectClick() {
            console.log('Starting scripts inspection...');
            // TODO: 在这里添加脚本检查的具体逻辑
        },
    },
    ready() {
        // 添加按钮点击事件监听
        if (this.$.inspectBtn) {
            this.$.inspectBtn.addEventListener('confirm', this.handleInspectClick.bind(this));
        }
    },
    beforeClose() { },
    close() { },
});
