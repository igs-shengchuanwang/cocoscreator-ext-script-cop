import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { buildFileTreeData, initializeFileTree, TreeNode } from '../inspect/script-tree';
import { createBundleSectionManager } from '../inspect/bundles-sections';
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
        bundleSections: '#bundle-sections',
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
                    scriptDB.loadFromDirectory(selectedPath, true);
                    // 获取所有脚本信息并构建树，清除舊資料重建 tree
                    const allScripts = scriptDB.getAllScripts();
                    console.log('Found scripts:', allScripts.length);
                    
                    // 檢查循環依賴
                    console.log('Start checking circular dependency');
                    const { checkCircular, dumpMadgeResult } = require('../../utils/madgeCli');
                    const circularResult = await checkCircular(selectedPath);
                    console.log('Circular dependency check result:');
                    console.log(dumpMadgeResult(circularResult));

                    // 處理循環依賴結果
                    let dependencies = circularResult.circularDeps as string[];
                    if (dependencies) {
                        dependencies.forEach(cd => {
                            scriptDB.analyzeCircularDependencyIssue(cd);
                        });
                    }

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
        async handleTabChange(event: Event) {
            const target = event.target as HTMLElement;
            if (!target || !this.$.leftTab || !this.$.tabContainer || !this.$.rightPanel) return;

            // 获取所有按钮和页面
            const buttons = this.$.leftTab.querySelectorAll('ui-button');
            const pages = this.$.tabContainer.querySelectorAll('.content-page');
            const rightContents = this.$.rightPanel.querySelectorAll('.content');
            
            // 确定点击的是哪个按钮
            let index = -1;
            buttons.forEach((btn, i) => {
                if (btn === target) {
                    index = i;
                    btn.setAttribute('active', '');
                } else {
                    btn.removeAttribute('active');
                }
            });

            if (index === -1) return;

            // 更新左側页面显示
            pages.forEach(async (page, i) => {
                if (i === index) {
                    page.removeAttribute('hidden');
                    // 如果切换到包体警察标签，更新内容
                    if (i === 1) {
                        console.log('Switching to bundle police tab');
                        await this.updateBundlePoliceContent();
                    }
                } else {
                    page.setAttribute('hidden', '');
                }
            });

            // 更新右側内容显示
            rightContents.forEach((content, i) => {
                if (i === index) {
                    (content as HTMLElement).style.display = 'block';
                } else {
                    (content as HTMLElement).style.display = 'none';
                }
            });
        },

        // 更新包體警察內容
        async updateBundlePoliceContent() {
            try {
                console.log('Updating bundle police content');
                const { ScriptDatabase } = require('../../copdb');
                const scriptDB = ScriptDatabase.getInstance();
                await scriptDB.loadBundles(join(Editor.Project.path, 'assets'));
                const allBundles = scriptDB.getAllBundles();
                console.log('Got bundles:', allBundles);

                // 使用 bundle sections manager 更新顯示
                if (this.$.bundleSections) {
                    const manager = createBundleSectionManager(this.$.bundleSections);
                    manager.updateDisplay(allBundles);
                }
            } catch (error) {
                console.error('Error updating bundle police content:', error);
                Editor.Message.broadcast('editor-notify', {
                    type: 'error',
                    message: '更新包體資訊時發生錯誤'
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
                button.addEventListener('confirm', async (e) => await this.handleTabChange(e));
            });
            this.$.leftTab.addEventListener('select', async (e) => await this.handleTabChange(e));
            console.log('Tab listener added');
        }

        try {
            // 初始化 ScriptDatabase
            const { ScriptDatabase } = require('../../copdb');
            const scriptDB = ScriptDatabase.getInstance();
            scriptDB.initialize(Editor.Project.path);
            console.log('ScriptDatabase initialized');
        } catch (error) {
            console.error('Error initializing ScriptDatabase:', error);
            Editor.Message.broadcast('editor-notify', {
                type: 'error',
                message: '初始化資料庫時發生錯誤'
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
