import * as fs from 'fs';
import * as path from 'path';

export interface ProcessedAttachment {
  name: string;
  content: Buffer;
}

export function processAttachments(
  attachments: Array<{ name: string; url: string }>
): ProcessedAttachment[] {
  const processed: ProcessedAttachment[] = [];

  for (const attachment of attachments) {
    try {
      console.log(`[Attachments] Processing: ${attachment.name}`);

      if (attachment.url.startsWith('data:')) {
        const matches = attachment.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const tmpPath = path.join('/tmp', attachment.name);
          fs.writeFileSync(tmpPath, buffer);
          console.log(`[Attachments] Saved to ${tmpPath}`);

          processed.push({
            name: attachment.name,
            content: buffer,
          });
        }
      }
    } catch (error: any) {
      console.error(`[Attachments] Error processing ${attachment.name}: ${error.message}`);
    }
  }

  return processed;
}
