import { DirectoryInfo, BundleInfo } from "../../utils/filesys";

interface BundleSectionManager {
    container: HTMLElement;
    updateDisplay(bundles: BundleInfo[]): void;
}

/**
 * 創建包體信息顯示項
 */
function createBundleItem(bundle: BundleInfo): HTMLElement {
    const bundleItem = document.createElement('div');
    bundleItem.className = 'bundle-item';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'bundle-name';
    nameDiv.textContent = bundle.name || '未命名包體';
    const pathDiv = document.createElement('div');
    pathDiv.className = 'bundle-path';
    pathDiv.textContent = `路徑: ${BundleSectionHelper.getBundleRelativePath(bundle)}`;
    bundleItem.appendChild(nameDiv);
    bundleItem.appendChild(pathDiv);
    return bundleItem;
}

/**
 * 創建包體分組 section
 */
function createBundleSection(priority: number, bundles: BundleInfo[]): HTMLElement {
    const section = document.createElement('ui-section');
    section.setAttribute('expand', ''); // 默認展開
    
    // 設置標題
    section.setAttribute('header', `Priority=${priority}`);

    // 創建內容容器
    const content = document.createElement('div');
    content.className = 'bundle-list';

    // 添加每個 bundle 的信息
    bundles.forEach(bundle => {
        const bundleItem = createBundleItem(bundle);
        content.appendChild(bundleItem);
    });

    section.appendChild(content);
    return section;
}

/**
 * 創建包體分組管理器
 */
export function createBundleSectionManager(container: HTMLElement): BundleSectionManager {
    return {
        container,
        updateDisplay(bundles: BundleInfo[]) {
            if (!Array.isArray(bundles)) {
                console.warn('Invalid bundles data:', bundles);
                return;
            }

            // 清空現有內容
            this.container.innerHTML = '';
            // 按優先級分組
            const bundleGroups = new Map<number, BundleInfo[]>();
            bundles.forEach(bundle => {
                if (!bundle) return;
                const priority = BundleSectionHelper.getBundlePriority(bundle);
                if (!bundleGroups.has(priority)) {
                    bundleGroups.set(priority, []);
                }
                bundleGroups.get(priority)?.push(bundle);
            });
            // 優先級排序
            const priorityOrder = Array.from(bundleGroups.keys()).sort((a, b) => b - a);
            // 為每個優先級創建 section
            priorityOrder.forEach(priority => {
                const bundlesInGroup = bundleGroups.get(priority);
                if (!bundlesInGroup || bundlesInGroup.length === 0) return;

                const section = createBundleSection(priority, bundlesInGroup);
                this.container.appendChild(section);
            });
        }
    };
}

class BundleSectionHelper {
    static getBundlePriority(bundle: BundleInfo): number {
        let priority: number = 0;
        if (bundle && bundle.assetMeta && bundle.assetMeta.userData) {
            priority = bundle.assetMeta.userData.priority || 1;
        }
        return priority;
    }

    static getBundleFolderFileCount(bundle: BundleInfo): number {
        let fileCount: number = 0;
        if (bundle && bundle.dirInfo) {
            fileCount = bundle.dirInfo.fileCount;
        }
        return fileCount;
    }

    static getBundleRelativePath(bundle: BundleInfo): string {
        const projPath = Editor.Project.path + "/assets";
        let relativePath: string = '';
        if (bundle && bundle.dirInfo) {
            relativePath = bundle.dirInfo.path.replace(projPath, '');
        }
        return relativePath;
    }
}