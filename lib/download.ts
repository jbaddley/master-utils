type FileHandleLike = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type SaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FileHandleLike>;

/**
 * Save a file via the native "Save As" dialog (File System Access API) so the
 * user can choose name/location. Falls back to a normal download where the API
 * is unavailable (Firefox/Safari). `getBlob` runs only once a destination is
 * chosen, so heavy encoding is deferred (and skipped if the user cancels).
 */
export async function saveAs(opts: {
  suggestedName: string;
  description: string;
  mime: string;
  ext: string;
  getBlob: () => Blob | Promise<Blob>;
}): Promise<void> {
  const fallback = async () => {
    const blob = await opts.getBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.suggestedName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  if (!picker) return fallback();

  let handle: FileHandleLike;
  try {
    handle = await picker({
      suggestedName: opts.suggestedName,
      types: [{ description: opts.description, accept: { [opts.mime]: [opts.ext] } }],
    });
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return; // user cancelled
    return fallback();
  }

  const blob = await opts.getBlob();
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}
