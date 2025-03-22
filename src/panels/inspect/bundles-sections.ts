interface BundleInfo {
    name: string;
    fileCount: number;
    priority: string;
}

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
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'bundle-info';
    infoDiv.textContent = `檔案數: ${bundle.fileCount || 0}`;
    
    bundleItem.appendChild(nameDiv);
    bundleItem.appendChild(infoDiv);
    return bundleItem;
}

/**
 * 獲取優先級顯示標題
 */
function getPriorityTitle(priority: string): string {
    const titles: { [key: string]: string } = {
        high: '高優先級包體',
        medium: '中優先級包體',
        low: '低優先級包體',
        default: '其他包體'
    };
    return titles[priority] || '未分類包體';
}

/**
 * 創建包體分組 section
 */
function createBundleSection(priority: string, bundles: BundleInfo[]): HTMLElement {
    const section = document.createElement('ui-section');
    section.setAttribute('expand', ''); // 默認展開
    
    // 設置標題
    const title = getPriorityTitle(priority);
    section.setAttribute('header', `${title} (${bundles.length})`);

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
            const bundleGroups = new Map<string, BundleInfo[]>();
            
            bundles.forEach(bundle => {
                if (!bundle) return;
                const priority = bundle.priority || 'default';
                if (!bundleGroups.has(priority)) {
                    bundleGroups.set(priority, []);
                }
                bundleGroups.get(priority)?.push(bundle);
            });

            // 優先級排序
            const priorityOrder = ['high', 'medium', 'low', 'default'];
            
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
