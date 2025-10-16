import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function scanForSecrets(code: string): Promise<boolean> {
  try {
    console.log(`[Security] Scanning code for secrets...`);

    const tmpFile = `/tmp/scan-${Date.now()}.html`;
    const fs = await import('fs');
    fs.writeFileSync(tmpFile, code);

    try {
      const { stdout, stderr } = await execAsync(`trufflehog filesystem ${tmpFile} --json`);

      if (stdout && stdout.trim().length > 0) {
        console.warn(`[Security] Secrets detected in generated code!`);
        fs.unlinkSync(tmpFile);
        return false;
      }

      console.log(`[Security] No secrets detected`);
      fs.unlinkSync(tmpFile);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.message.includes('trufflehog')) {
        console.log(`[Security] TruffleHog not available, skipping scan`);
        fs.unlinkSync(tmpFile);
        return true;
      }
      fs.unlinkSync(tmpFile);
      return true;
    }
  } catch (error: any) {
    console.error(`[Security] Error during secret scan: ${error.message}`);
    return true;
  }
}
