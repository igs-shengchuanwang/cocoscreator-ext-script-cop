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
        container: '.container',
        leftPanel: '.left-panel',
        rightPanel: '.right-panel',
        elementList: '.element-list',
        folderInspect: '#folder-inspect',
    },
    methods: {
        hello() {
            console.log('[script-cop.default]: hello');
        },

        // 添加元素项点击处理方法
        handleElementClick(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('element-item')) {
                // 处理元素点击
                console.log('Clicked element:', target.textContent);
            }
        },

        async folderInspectConfirm() {
            try {
                const result = await Editor.Dialog.select({
                    title: '選擇要檢查的資料夾',
                    type: 'directory',
                    button: '選擇資料夾',
                    multi: false,
                });
                if (result.filePaths && result.filePaths.length > 0) {
                    const selectedPath = result.filePaths[0];
                    const { findTsFiles } = require('../../utils/filesys');
                    // 查找所有 TypeScript 文件
                    const tsFiles = findTsFiles(selectedPath);
                    console.log('Found TypeScript files:', tsFiles);
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
                Editor.Message.broadcast('editor-notify', {
                    type: 'error',
                    message: '選擇資料夾時發生錯誤'
                });
            }
        }
    },
    ready() {
        // 添加事件监听
        if (this.$.elementList) {
            this.$.elementList.addEventListener('click', this.handleElementClick.bind(this));
        }
        if (this.$.folderInspect) {
            this.$.folderInspect.addEventListener('confirm', this.folderInspectConfirm.bind(this));
        }
    },

    beforeClose() { },

    close() {
        // 清理事件监听
        if (this.$.elementList) {
            this.$.elementList.removeEventListener('click', this.handleElementClick.bind(this));
        }
    },
});
