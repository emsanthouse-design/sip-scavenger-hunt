// Client-side image compression. Photos straight off a phone camera can be
// 3-8 MB, which is brutal over spotty cellular. We downscale to a sane max
// dimension and re-encode as JPEG before upload. Videos are NOT compressed in
// the browser (too heavy); they're handled with a size cap instead.

const MAX_DIM = 1600 // longest edge, px
const JPEG_QUALITY = 0.7

export async function compressImage(file) {
  // Only attempt on real images; pass anything else straight through.
  if (!file || !file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) return file
    // If compression somehow made it bigger, keep the original.
    if (blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Older browsers without createImageBitmap: just send the original.
    return file
  }
}

// Hard cap for video uploads (MB). Over cellular, big videos will fail; we tell
// interns to keep clips short. Configurable here in one place.
export const MAX_VIDEO_MB = 40

export function fileTooBig(file) {
  if (!file) return false
  if (file.type.startsWith('video/')) return file.size > MAX_VIDEO_MB * 1024 * 1024
  return false
}
