import { readFileSync } from 'fs-extra';
import { join } from 'path';

// 定义脚本信息接口
export interface ScriptInfo {
    path: string;
    name: string;
    size: number;
    lastModified: Date;
    dependencies: string[];
    issues?: string[];
}

// 定义树节点接口
export interface TreeNode {
    detail: {
        value: string;
        checked: boolean;
        path?: string;
        disabled?: boolean;
        hasIssues?: boolean;
    };
    showArrow?: boolean;
    children: TreeNode[];
    index?: number;
    scriptInfo?: ScriptInfo;
}

// 定义 UI 图标元素接口
export interface UIIconElement extends HTMLElement {
    value: string;
}

// 扩展 HTMLElement 接口
export interface TreeElement extends HTMLElement {
    $icon?: UIIconElement;
    $name?: HTMLElement;
    data?: TreeNode;
}

// 声明 Editor.UI 命名空间
declare global {
    namespace Editor.UI {
        class Tree extends HTMLElement {
            setTemplate(position: string, template: string): void;
            setTemplateInit(position: string, callback: (element: TreeElement) => void): void;
            setRender(position: string, callback: (element: TreeElement, data: TreeNode) => void): void;
            select(item: TreeNode): void;
            clear(): void;
            render(force?: boolean): void;
            tree: TreeNode[];
            css: string;
        }
    }
}

// 构建文件树数据
export function buildFileTreeData(scripts: ScriptInfo[]): TreeNode[] {
    const treeData: TreeNode[] = [];
    treeData.length = 0;
    const pathMap = new Map<string, TreeNode>();
    pathMap.clear();
    // 获取项目路径和 assets 路径
    const projectPath = Editor.Project.path;
    const assetsPath = join(projectPath, 'assets');
    // 创建根节点（assets）
    const rootNode: TreeNode = {
        detail: {
            value: 'assets',
            checked: false,
            path: assetsPath,
        },
        showArrow: true,
        children: [],
    };
    treeData.push(rootNode);
    pathMap.set(assetsPath, rootNode);

    scripts.forEach((script, index) => {
        const path = script.path;
        // 检查脚本是否在 assets 目录下
        if (!path.startsWith(assetsPath)) {
            return;
        }
        // 获取相对于 assets 的路径
        const relativePath = path.slice(assetsPath.length + 1); // +1 是为了去掉开头的斜杠
        const parts = relativePath.split('/');
        let currentPath = assetsPath;
        let parentNode = rootNode;
        parts.forEach((part: string, i: number) => {
            currentPath += '/' + part;
            let node = pathMap.get(currentPath);
            if (!node) {
                node = {
                    detail: {
                        value: part,
                        checked: false,
                        path: currentPath,
                        hasIssues: i === parts.length - 1 && script.issues && script.issues.length > 0
                    },
                    children: [],
                    index,
                    scriptInfo: i === parts.length - 1 ? script : undefined
                };
                pathMap.set(currentPath, node);
                if (i === parts.length - 1) {
                    // 文件节点
                    node.showArrow = false;
                } else {
                    // 文件夹节点
                    node.showArrow = true;
                }
                parentNode.children.push(node);
            }
            parentNode = node;
        });
    });
    return treeData;
}

// 初始化文件树
export function initializeFileTree(tree: Editor.UI.Tree) {
    if (!tree) {
        console.error('File tree element not found');
        return;
    }

    console.log('Initializing file tree...');

    // 设置左侧模板（文件夹图标）
    tree.setTemplate('left', '<ui-icon value="folder"></ui-icon>');
    tree.setTemplateInit('left', ($left: TreeElement) => {
        const icon = $left.querySelector('ui-icon');
        if (icon) {
            $left.$icon = icon as UIIconElement;
        }
    });
    tree.setRender('left', ($left: TreeElement, data: TreeNode) => {
        if ($left.$icon) {
            if (data.detail.hasIssues) {
                $left.$icon.value = 'warn';
            } else if (data.showArrow) {
                $left.$icon.value = 'folder';
            } else {
                $left.$icon.value = 'file';
            }
        }
    });

    // 设置文本模板
    tree.setTemplate('text', '<span class="name"></span>');
    tree.setTemplateInit('text', ($text: TreeElement) => {
        const name = $text.querySelector('.name');
        if (name) {
            $text.$name = name as HTMLElement;
        }
    });
    tree.setRender('text', ($text: TreeElement, data: TreeNode) => {
        if ($text.$name) {
            $text.$name.innerHTML = data.detail.value;
        }
    });

    // 设置项目模板
    tree.setTemplateInit('item', ($div: TreeElement) => {
        $div.addEventListener('click', (event: MouseEvent) => {
            const data = $div.data;
            if (data?.detail.path) {
                console.log('Selected file:', data.detail.path);
                // TODO: 触发文件选择事件
            }
        });
    });

    // 设置自定义样式
    tree.css = `
        .item {
            padding: 4px 8px;
            cursor: pointer;
            border-bottom: 1px solid var(--color-normal-border);
            margin-bottom: 1px;
        }
        .item:hover {
            background: var(--color-fill-2);
        }
        .text > .name {
            margin-left: 8px;
            color: var(--color-normal-text);
        }
        .item > .left {
            width: 16px;
        }
        .item > .text {
            margin-left: 4px;
        }
        .item > .arrow {
            width: 16px;
        }
        ui-tree {
            background: var(--color-normal-fill);
            border: 1px solid var(--color-normal-border);
        }
        /* 警告圖標樣式 */
        .item > .left ui-icon[value="warn"] {
            color: #FFB800;
        }
    `;

    console.log('File tree initialized');
} 