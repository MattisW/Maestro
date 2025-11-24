import { execFileNoThrow } from './execFile';

export interface ShellInfo {
  id: string;
  name: string;
  available: boolean;
  path?: string;
}

/**
 * Detect available shells on the system
 * Checks for common shells: zsh, bash, sh, fish, tcsh
 */
export async function detectShells(): Promise<ShellInfo[]> {
  const shells = [
    { id: 'zsh', name: 'Zsh' },
    { id: 'bash', name: 'Bash' },
    { id: 'sh', name: 'Bourne Shell (sh)' },
    { id: 'fish', name: 'Fish' },
    { id: 'tcsh', name: 'Tcsh' },
  ];

  const shellInfos: ShellInfo[] = [];

  for (const shell of shells) {
    const info = await detectShell(shell.id, shell.name);
    shellInfos.push(info);
  }

  return shellInfos;
}

/**
 * Check if a specific shell is available on the system
 */
async function detectShell(shellId: string, shellName: string): Promise<ShellInfo> {
  try {
    // Use 'which' on Unix-like systems, 'where' on Windows
    const command = process.platform === 'win32' ? 'where' : 'which';
    const result = await execFileNoThrow(command, [shellId]);

    if (result.exitCode === 0 && result.stdout.trim()) {
      return {
        id: shellId,
        name: shellName,
        available: true,
        path: result.stdout.trim().split('\n')[0], // Take first result if multiple
      };
    }

    return {
      id: shellId,
      name: shellName,
      available: false,
    };
  } catch (error) {
    return {
      id: shellId,
      name: shellName,
      available: false,
    };
  }
}

/**
 * Get the command for a shell by its ID
 * Returns the shell executable name
 */
export function getShellCommand(shellId: string): string {
  // For Windows, map to appropriate commands
  if (process.platform === 'win32') {
    if (shellId === 'sh' || shellId === 'bash') {
      // On Windows, try bash (usually from Git Bash or WSL)
      return 'bash';
    }
    // Default to PowerShell on Windows for unknown shells
    return 'powershell.exe';
  }

  // On Unix-like systems, use the shell ID directly
  return shellId;
}
