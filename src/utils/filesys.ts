import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 递归查找指定目录下的所有 TypeScript 文件
 * @param dirPath 要搜索的目录路径
 * @returns TypeScript 文件路径数组
 */
export function findTsFiles(dirPath: string): string[] {
    const tsFiles: string[] = [];
    
    try {
        // 读取目录内容
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 递归搜索子目录
                // 排除 node_modules 和 .git 目录
                if (file !== 'node_modules' && file !== '.git') {
                    tsFiles.push(...findTsFiles(fullPath));
                }
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                tsFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return tsFiles;
}

/**
 * 读取文件内容
 * @param filePath 文件路径
 * @returns 文件内容字符串
 */
export function readFileContent(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return '';
    }
}

/**
 * 获取文件的相对路径
 * @param fullPath 完整文件路径
 * @param baseDir 基准目录
 * @returns 相对路径
 */
export function getRelativePath(fullPath: string, baseDir: string): string {
    return path.relative(baseDir, fullPath);
}

/**
 * 检查文件是否是 TypeScript 文件
 * @param filePath 文件路径
 * @returns 是否是 TypeScript 文件
 */
export function isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

export interface BundleInfo {
    dirInfo: DirectoryInfo;
    name: string;
    priority: number;
    configName?: string;
}

/**
 * 获取文件的基本信息
 * @param filePath 文件路径
 * @returns 文件信息对象
 */
export interface FileInfo {
    path: string;
    name: string;
    extension: string;
    size: number;
    modifiedTime: Date;
}

export function getFileInfo(filePath: string): FileInfo | null {
    try {
        const stat = fs.statSync(filePath);
        return {
            path: filePath,
            name: path.basename(filePath),
            extension: path.extname(filePath),
            size: stat.size,
            modifiedTime: stat.mtime
        };
    } catch (error) {
        console.error(`Error getting file info for ${filePath}:`, error);
        return null;
    }
}

/**
 * 获取目录的基本信息
 * @param dirPath 目录路径
 * @returns 目录信息对象
 */
export interface DirectoryInfo {
    path: string;
    name: string;
    fileCount: number;
    tsFileCount: number;
    totalSize: number;
}

export function getDirectoryInfo(dirPath: string): DirectoryInfo | null {
    try {
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) {
            return null;
        }

        const files = fs.readdirSync(dirPath);
        let fileCount = 0;
        let tsFileCount = 0;
        let totalSize = 0;

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const fileStat = fs.statSync(fullPath);
            
            if (fileStat.isFile()) {
                fileCount++;
                totalSize += fileStat.size;
                if (isTypeScriptFile(fullPath)) {
                    tsFileCount++;
                }
            }
        }

        return {
            path: dirPath,
            name: path.basename(dirPath),
            fileCount,
            tsFileCount,
            totalSize
        };
    } catch (error) {
        console.error(`Error getting directory info for ${dirPath}:`, error);
        return null;
    }
}

/**
 * 检查目录是否为 bundle
 * @param dirPath 目录路径
 * @returns 是否为 bundle
 */
export async function isBundleDirectory(dirPath: string): Promise<boolean> {
    const metaPath = `${dirPath}.meta`;
    try {
        if (!fs.existsSync(metaPath)) {
            return false;
        }
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        const metaData = JSON.parse(metaContent);
        return metaData.userData?.isBundle === true;
    } catch (error) {
        console.error(`Error checking bundle meta for ${dirPath}:`, error);
        return false;
    }
}

/**
 * 查找所有 bundle 目录
 * @param assetsPath assets 目录路径
 * @returns bundle 信息数组
 */
export async function findBundles(assetsPath: string): Promise<BundleInfo[]> {
    const bundles: BundleInfo[] = [];
    
    try {
        const items = await fs.readdir(assetsPath);
        for (const item of items) {
            const fullPath = path.join(assetsPath, item);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const isBundle = await isBundleDirectory(fullPath);
                if (isBundle) {
                    const dirInfo = getDirectoryInfo(fullPath);
                    if (dirInfo) {
                        bundles.push({
                            dirInfo,
                            name: item,
                            priority: 0, // 默认优先级
                            configName: `bundle-${item}` // 默认配置名
                        });
                    }
                }
                
                // 递归搜索子目录
                const subBundles = await findBundles(fullPath);
                bundles.push(...subBundles);
            }
        }
    } catch (error) {
        console.error(`Error finding bundles in ${assetsPath}:`, error);
    }
    
    return bundles;
} 