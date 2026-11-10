// Getting a file out of the app (download, or the phone's share sheet) and reading one back in.

/** Downloads a text file. The address is released later: Safari cancels the download if it goes at once. */
export function downloadText(filename: string, text: string, mime = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function asFile(filename: string, text: string, mime: string): File {
  return new File([text], filename, { type: mime })
}

/** Can this device hand a file to another app (the share sheet on phones)? */
export function canShareFile(filename: string, mime: string): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [asFile(filename, '', mime)] })
  } catch {
    return false
  }
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Offers the file through the share sheet (Files, Drive, mail, Calendar...). Where files cannot be
 * shared, or sharing fails, the file is downloaded instead. Closing the share sheet is "cancelled".
 */
export async function shareOrDownload(
  filename: string,
  text: string,
  mime: string,
): Promise<ShareResult> {
  if (canShareFile(filename, mime)) {
    try {
      await navigator.share({ files: [asFile(filename, text, mime)], title: 'My Day AI' })
      return 'shared'
    } catch (e) {
      // the user closed the share sheet: that is an answer, not an error
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  downloadText(filename, text, mime)
  return 'downloaded'
}

/** Text of a file the user picked. Older Safari has no `file.text()`, so FileReader is the fallback. */
export function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })
}
