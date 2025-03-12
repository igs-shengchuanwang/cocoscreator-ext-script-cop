import { readFileSync } from 'fs-extra';
import { join } from 'path';
/**
 * @zh If you want compatibility with versions prior to 3.3, you can use the code below
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
        // Handle element item click
        handleElementClick(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('element-item')) {
                // Process element click
                console.log('Clicked element:', target.textContent);
            }
        },

        async folderInspectConfirm() {
            try {
                const result = await Editor.Dialog.select({
                    title: 'Select Folder to Inspect',
                    type: 'directory',
                    button: 'Select Folder',
                    multi: false,
                });
                if (result.filePaths && result.filePaths.length > 0) {
                    const selectedPath = result.filePaths[0];
                    const { ScriptDatabase } = require('../../copdb');
                    // 使用单例
                    const scriptDB = ScriptDatabase.getInstance();
                    // Load all TypeScript files from directory
                    scriptDB.loadFromDirectory(selectedPath);
                    
                    // Get statistics
                    const stats = scriptDB.getStatistics();
                    console.log('Script Statistics:', stats);
                    
                    // Get all script information
                    const allScripts = scriptDB.getAllScripts();
                    console.log('All Scripts:', allScripts);
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
                Editor.Message.broadcast('editor-notify', {
                    type: 'error',
                    message: 'Error occurred while selecting folder'
                });
            }
        }
    },
    async ready() {
        // 添加事件监听
        if (this.$.elementList) {
            this.$.elementList.addEventListener('click', this.handleElementClick.bind(this));
        }
        if (this.$.folderInspect) {
            this.$.folderInspect.addEventListener('confirm', this.folderInspectConfirm.bind(this));
        }

        try {
            // 获取项目 assets 路径
            const projectPath = Editor.Project.path;
            const assetsPath = join(projectPath, 'assets');
            // 获取 ScriptDatabase 单例并初始化
            const { ScriptDatabase } = require('../../copdb');
            const scriptDB = ScriptDatabase.getInstance();
            scriptDB.initialize(projectPath);
            // 加载 bundles
            await scriptDB.loadBundles(assetsPath);
            // 获取并显示 bundle 统计信息
            const bundleStats = scriptDB.getBundleStatistics();
            console.log('Bundle Statistics:', bundleStats);
            // 获取所有 bundle 信息
            const allBundles = scriptDB.getAllBundles();
            console.log('All Bundles:', allBundles);
        } catch (error) {
            console.error('Error initializing bundles:', error);
            Editor.Message.broadcast('editor-notify', {
                type: 'error',
                message: '初始化 bundle 信息時發生錯誤'
            });
        }
    },

    beforeClose() { },

    close() {
        // Clean up event listeners
        if (this.$.elementList) {
            this.$.elementList.removeEventListener('click', this.handleElementClick.bind(this));
        }
    },
});
