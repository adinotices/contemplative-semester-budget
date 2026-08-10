interface ReceiptSource {
  sequenceLabel: string;
  receiptUrl: string | null;
}

/**
 * Downloads each receipt from Supabase Storage and returns Resend-ready
 * attachments, filename-prefixed with the row's sequence ID so the
 * accountant can match an attachment back to its row in the email body.
 * Items with no receipt are skipped, not failed.
 */
export async function buildReceiptAttachments(
  sources: ReceiptSource[],
): Promise<Array<{ filename: string; content: Buffer }>> {
  const attachments: Array<{ filename: string; content: Buffer }> = [];

  for (const source of sources) {
    if (!source.receiptUrl) continue;
    try {
      const res = await fetch(source.receiptUrl);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = source.receiptUrl.split(".").pop()?.split("?")[0] || "bin";
      attachments.push({
        filename: `${source.sequenceLabel}-receipt.${ext}`,
        content: buffer,
      });
    } catch (err) {
      console.error(`Failed to download receipt for ${source.sequenceLabel}`, err);
    }
  }

  return attachments;
}
