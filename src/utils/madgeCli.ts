import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface MadgeResult {
    success: boolean;
    circularDeps: string[];
    error?: string;
    stdout?: string;
    stderr?: string;
}

/**
 * 使用 madge CLI 工具檢查指定路徑下的循環依賴
 * @param targetPath 要檢查的目標路徑
 * @returns 包含檢查結果的對象
 */
export async function checkCircular(targetPath: string): Promise<MadgeResult> {
    const circularDeps: string[] = [];
    try {
        // 確保路徑是絕對路徑
        const absolutePath = path.resolve(targetPath);
        // 構建 madge 命令
        const command = `madge --circular --extensions ts "${absolutePath}"`;
        console.log('Executing command:', command);
        // 執行命令
        const { stdout, stderr } = await execAsync(command);
        // 解析輸出結果
        if (stdout) {
            // madge 會將循環依賴信息輸出到 stdout
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.trim() && line.includes('Circular')) {
                    circularDeps.push(line.trim());
                }
            }
        }
        return {
            success: true,
            circularDeps,
            stdout,
            stderr
        };
    } catch (error) {
        console.error('Error checking circular dependencies:', error);
        // 處理錯誤情況
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const errorOutput = error instanceof Error && 'stderr' in error ? (error as any).stderr : '';
        const stdoutInErr = error instanceof Error && 'stdout' in error ? (error as any).stdout : '';
        // 從錯誤輸出中提取循環依賴信息
        if (stdoutInErr) {
            const lines = stdoutInErr.split('\n');
            for (const line of lines) {
                if (line.trim() && line.includes(')')) {
                    // 匹配類似 "1) LoadingPageEx.ts > app.ts" 的格式
                    const match = line.match(/\d+\)\s+(.+)/);
                    if (match) {
                        circularDeps.push(match[1].trim());
                    }
                }
            }
        }
        return {
            success: circularDeps.length > 0, // 如果找到循環依賴，也算成功
            circularDeps,
            error: errorMessage,
            stderr: errorOutput,
            stdout: stdoutInErr
        };
    }
}

/**
 * 將 MadgeResult 轉換為可讀性高的字符串
 * @param result MadgeResult 對象
 * @returns 格式化的字符串
 */
export function dumpMadgeResult(result: MadgeResult): string {
    const lines: string[] = [];
    // 添加基本信息
    lines.push('=== Madge 循環依賴檢查結果 ===');
    lines.push(`檢查狀態: ${result.success ? '成功' : '失敗'}`);
    // 如果有錯誤信息，添加錯誤詳情
    if (!result.success) {
        lines.push('\n--- 錯誤信息 ---');
        if (result.error) {
            lines.push(`錯誤: ${result.error}`);
        }
        if (result.stderr) {
            lines.push(`錯誤輸出: ${result.stderr}`);
        }
    }
    // 添加循環依賴信息
    lines.push('\n--- 循環依賴信息 ---');
    if (result.circularDeps.length > 0) {
        result.circularDeps.forEach((dep, index) => {
            lines.push(`${index + 1}. ${dep}`);
        });
    } else {
        lines.push('未發現循環依賴');
    }
    // 如果有標準輸出，添加完整輸出
    if (result.stdout) {
        lines.push('\n--- 完整輸出 ---');
        lines.push(result.stdout);
    }
    return lines.join('\n');
}
