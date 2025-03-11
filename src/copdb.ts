import * as path from 'path';
import { FileInfo, findTsFiles, getFileInfo, BundleInfo } from './utils/filesys';

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
 * Script database class
 */
export class ScriptDatabase {
    private bundles: Map<string, BundleInfo> = new Map();
    private scripts: Map<string, ScriptInfo> = new Map();
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
    }

    /**
     * Load all TypeScript files from specified directory
     * @param dirPath Directory path
     */
    public loadFromDirectory(dirPath: string): void {
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
}
