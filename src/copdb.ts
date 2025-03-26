import * as path from 'path';
import { FileInfo, findTsFiles, getFileInfo, BundleInfo, findBundles } from './utils/filesys';

/**
 * Script analysis status enumeration
 */
export enum AnalyzeStatus {
    Pending = 'pending',      // Pending analysis
    Analyzing = 'analyzing',  // Currently analyzing
    Analyzed = 'analyzed',    // Analysis completed
    Failed = 'failed'        // Analysis failed
}

/**
 * Script issue information interface
 */
export interface ScriptIssue {
    type: string;            // Issue type
    message: string;         // Issue description
    line: number;           // Line number where issue occurs
    severity: 'error' | 'warning' | 'info';  // Issue severity level
}

/**
 * Script information interface
 */
export interface ScriptInfo extends FileInfo {
    relativePath: string;    // Path relative to project root
    bundleName?: string;     // Bundle name this script belongs to
    dependencies: string[];  // List of script file paths this script depends on
    lastAnalyzedTime?: Date; // Last analyzed time
    analyzeStatus: AnalyzeStatus;  // Analysis status
    issues: ScriptIssue[];   // Issue list
}

/**
 * Script database class - Singleton Pattern
 */
export class ScriptDatabase {
    private static instance: ScriptDatabase | null = null;
    private bundles: Map<string, BundleInfo> = new Map();
    private scripts: Map<string, ScriptInfo> = new Map();
    private projectRoot: string = '';

    private constructor() {
        // 私有构造函数，防止直接实例化
    }

    /**
     * 获取 ScriptDatabase 单例
     */
    public static getInstance(): ScriptDatabase {
        if (!ScriptDatabase.instance) {
            ScriptDatabase.instance = new ScriptDatabase();
        }
        return ScriptDatabase.instance;
    }

    /**
     * 初始化数据库
     * @param projectRoot 项目根目录
     */
    public initialize(projectRoot: string): void {
        this.projectRoot = projectRoot;
        this.bundles.clear();
        this.scripts.clear();
    }

    analyzeCircularDependencyIssue(circDep: string) {
        // 分割依賴路徑，格式如: "LoadingPageEx.ts > app.ts"
        // 分割文件路徑
        const files = circDep.split(' > ').map(f => f.trim());
        // 為每個文件添加循環依賴問題
        files.forEach(filePath => {
            // 查找對應的腳本
            const script = Array.from(this.scripts.values()).find(s => 
                s.relativePath === filePath || s.path.endsWith(filePath)
            );
            if (script) {
                // 添加循環依賴問題
                script.issues.push({
                    type: '循環引用',
                    severity: 'warning',
                    message: `循環依賴: ${circDep}`,
                    line: 0  // 循環依賴問題通常與特定行無關
                });
                console.log(`Found circular dependency issue for ${filePath}: ${circDep}`);
            }
        });
    }

    /**
     * Load all TypeScript files from specified directory
     * @param dirPath Directory path
     */
    public loadFromDirectory(dirPath: string, re: boolean): void {
        if (re) {
            this.scripts.clear();
        }
        const tsFiles = findTsFiles(dirPath);
        for (const filePath of tsFiles) {
            const fileInfo = getFileInfo(filePath);
            if (fileInfo) {
                this.addScript(fileInfo);
            }
        }
    }

    /**
     * Add script to database
     * @param fileInfo File information
     */
    private addScript(fileInfo: FileInfo): void {
        const relativePath = path.relative(this.projectRoot, fileInfo.path);
        const scriptInfo: ScriptInfo = {
            ...fileInfo,
            relativePath,
            analyzeStatus: AnalyzeStatus.Pending,
            issues: [],
            dependencies: [],
            bundleName: ''
        };
        this.scripts.set(fileInfo.path, scriptInfo);
    }

    /**
     * Get all script information
     * @returns Array of script information
     */
    public getAllScripts(): ScriptInfo[] {
        return Array.from(this.scripts.values());
    }

    /**
     * Get scripts with specified status
     * @param status Analysis status
     * @returns Array of script information
     */
    public getScriptsByStatus(status: AnalyzeStatus): ScriptInfo[] {
        return this.getAllScripts().filter(script => script.analyzeStatus === status);
    }

    /**
     * Update script analysis status
     * @param filePath File path
     * @param status Analysis status
     */
    public updateScriptStatus(filePath: string, status: AnalyzeStatus): void {
        const script = this.scripts.get(filePath);
        if (script) {
            script.analyzeStatus = status;
            script.lastAnalyzedTime = new Date();
        }
    }

    /**
     * Add script issue
     * @param filePath File path
     * @param issue Issue information
     */
    public addScriptIssue(filePath: string, issue: ScriptIssue): void {
        const script = this.scripts.get(filePath);
        if (script) {
            script.issues.push(issue);
        }
    }

    /**
     * Get script statistics
     * @returns Statistics object
     */
    public getStatistics(): {
        totalScripts: number;
        byStatus: Record<AnalyzeStatus, number>;
        totalIssues: number;
    } {
        const stats = {
            totalScripts: this.scripts.size,
            byStatus: {} as Record<AnalyzeStatus, number>,
            totalIssues: 0
        };

        // Initialize counters
        Object.values(AnalyzeStatus).forEach(status => {
            stats.byStatus[status] = 0;
        });

        // Calculate statistics
        this.scripts.forEach(script => {
            stats.byStatus[script.analyzeStatus]++;
            stats.totalIssues += script.issues.length;
        });

        return stats;
    }

    /**
     * 加载所有 bundle 信息
     * @param assetsPath assets 目录路径
     */
    public async loadBundles(assetsPath: string): Promise<void> {
        try {
            const bundles = await findBundles(assetsPath);
            // 清空现有 bundles
            this.bundles.clear();
            // 添加新的 bundles
            for (const bundle of bundles) {
                this.bundles.set(bundle.name, bundle);
            }
            console.log(`Loaded ${this.bundles.size} bundles from ${assetsPath}`);
        } catch (error) {
            console.error('Error loading bundles:', error);
        }
    }

    /**
     * 获取所有 bundle 信息
     */
    public getAllBundles(): BundleInfo[] {
        return Array.from(this.bundles.values());
    }

    /**
     * 获取指定 bundle 的信息
     * @param bundleName bundle 名称
     */
    public getBundle(bundleName: string): BundleInfo | undefined {
        return this.bundles.get(bundleName);
    }

    /**
     * 获取 bundle 统计信息
     */
    public getBundleStatistics(): {
        totalBundles: number;
        totalFiles: number;
        totalSize: number;
    } {
        const stats = {
            totalBundles: this.bundles.size,
            totalFiles: 0,
            totalSize: 0
        };

        this.bundles.forEach(bundle => {
            stats.totalFiles += bundle.dirInfo.fileCount;
            stats.totalSize += bundle.dirInfo.totalSize;
        });

        return stats;
    }
}
