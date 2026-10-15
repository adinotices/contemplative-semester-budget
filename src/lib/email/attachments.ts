import { downloadReceipt } from "@/lib/receipts";

interface ReceiptSource {
  sequenceLabel: string;
  receiptUrl: string | null;
}

export interface ReceiptAttachment {
  filename: string;
  content: Buffer;
  /** The row this attachment belongs to, so callers can tell which receipts actually made it. */
  sequenceLabel: string;
}

/**
 * Downloads each receipt from Supabase Storage and returns Resend-ready
 * attachments, filename-prefixed with the row's sequence ID so the
 * accountant can match an attachment back to its row in the email body.
 * Items with no receipt — or whose download fails — are skipped, not
 * failed; callers must render the email from what came back here rather
 * than from receipt_url, or the body will claim a receipt that isn't
 * attached.
 */
export async function buildReceiptAttachments(
  sources: ReceiptSource[],
): Promise<ReceiptAttachment[]> {
  const attachments: ReceiptAttachment[] = [];

  for (const source of sources) {
    if (!source.receiptUrl) continue;
    try {
      const receipt = await downloadReceipt(source.receiptUrl);
      if (!receipt) {
        console.error(`Receipt download for ${source.sequenceLabel} failed; sending without it`);
        continue;
      }
      attachments.push({
        filename: `${source.sequenceLabel}-receipt.${receipt.ext}`,
        content: receipt.buffer,
        sequenceLabel: source.sequenceLabel,
      });
    } catch (err) {
      console.error(`Failed to download receipt for ${source.sequenceLabel}`, err);
    }
  }

  return attachments;
}

/** Strips the bookkeeping field Resend's attachment payload doesn't take. */
export function toResendAttachments(
  attachments: ReceiptAttachment[],
): Array<{ filename: string; content: Buffer }> {
  return attachments.map(({ filename, content }) => ({ filename, content }));
}
