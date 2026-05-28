export const FREE_FILE_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB
export const PRO_FILE_SIZE_BYTES  = 100 * 1024 * 1024; // 100 MB

export function fileSizeError(fileBytes: number, isPro: boolean): string | null {
  const limit = isPro ? PRO_FILE_SIZE_BYTES : FREE_FILE_SIZE_BYTES;
  if (fileBytes <= limit) return null;
  const limitMb = limit / 1024 / 1024;
  return isPro
    ? `File is too large. Maximum file size is ${limitMb} MB.`
    : `File exceeds the 10 MB free limit. Upgrade to Pro for up to 100 MB.`;
}
