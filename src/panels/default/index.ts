import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { buildFileTreeData, initializeFileTree, TreeNode } from '../inspect/script-tree';
/**
 * @zh If you want compatibility with versions prior to 3.3, you can use the code below
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }

// 定义 Editor.UI.Tree 类型
declare global {
    namespace Editor {
        namespace UI {
            interface Tree extends HTMLElement {
                tree: TreeNode[];
                render(): void;
            }
        }
    }
}

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
        fileTree: '#file-tree',
        leftTab: '.left-panel ui-tab',
        tabContainer: '.left-panel .tab-container',
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

        // 处理文件夹选择
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
                    console.log('Selected folder:', selectedPath);
                    
                    const { ScriptDatabase } = require('../../copdb');
                    const scriptDB = ScriptDatabase.getInstance();
                    scriptDB.loadFromDirectory(selectedPath);
                    
                    // 获取所有脚本信息并构建树
                    const allScripts = scriptDB.getAllScripts();
                    console.log('Found scripts:', allScripts.length);
                    
                    const treeData = buildFileTreeData(allScripts);
                    console.log('Built tree data:', treeData);
                    
                    // 更新树数据
                    const tree = this.$.fileTree as Editor.UI.Tree;
                    if (tree) {
                        tree.tree = treeData;
                        tree.render();
                        console.log('Tree rendered');
                    } else {
                        console.error('Tree element not found');
                    }
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
                Editor.Message.broadcast('editor-notify', {
                    type: 'error',
                    message: 'Error occurred while selecting folder'
                });
            }
        },

        // 处理标签页切换
        handleTabChange(event: Event) {
            const target = event.target as HTMLElement;
            const tab = this.$.leftTab;
            const container = this.$.tabContainer;
            if (!tab || !container) return;

            const buttons = tab.querySelectorAll('ui-button');
            const pages = container.querySelectorAll('.content-page');
            const index = Array.from(buttons).indexOf(target);

            if (index >= 0) {
                // 更新按钮状态
                buttons.forEach((btn, i) => {
                    if (i === index) {
                        btn.setAttribute('active', '');
                    } else {
                        btn.removeAttribute('active');
                    }
                });

                // 更新内容显示
                pages.forEach((page, i) => {
                    if (i === index) {
                        page.removeAttribute('hidden');
                    } else {
                        page.setAttribute('hidden', '');
                    }
                });
            }
        },
    },
    async ready() {
        // 添加事件监听
        if (this.$.elementList) {
            this.$.elementList.addEventListener('click', this.handleElementClick.bind(this));
        }
        console.log('Panel ready');

        // 初始化文件树
        const tree = this.$.fileTree as Editor.UI.Tree;
        if (tree) {
            initializeFileTree(tree);
            console.log('File tree initialized');
        } else {
            console.error('File tree element not found');
        }

        // 添加文件夹选择按钮事件监听
        if (this.$.folderInspect) {
            this.$.folderInspect.addEventListener('click', this.folderInspectConfirm.bind(this));
            console.log('Folder inspect button listener added');
        } else {
            console.error('Folder inspect button not found');
        }

        // 添加标签页切换事件监听
        if (this.$.leftTab) {
            const buttons = this.$.leftTab.querySelectorAll('ui-button');
            buttons.forEach(button => {
                button.addEventListener('click', this.handleTabChange.bind(this));
            });
            this.$.leftTab.addEventListener('select', this.handleTabChange.bind(this));
            console.log('Tab listener added');
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
        if (this.$.folderInspect) {
            this.$.folderInspect.removeEventListener('click', this.folderInspectConfirm.bind(this));
        }
        if (this.$.leftTab) {
            this.$.leftTab.removeEventListener('select', this.handleTabChange.bind(this));
        }
    },
});
