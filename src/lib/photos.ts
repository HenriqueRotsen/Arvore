import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 12 * 1024 * 1024;
const PHOTO_SIZE = 720;

export async function savePersonPhoto(personId: string, file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("A foto deve ter no máximo 12 MB.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${personId}-${Date.now()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(buffer)
    .rotate()
    .resize(PHOTO_SIZE, PHOTO_SIZE, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  await writeFile(filepath, processed);
  return `/uploads/${filename}`;
}

export async function deletePhotoFile(photoUrl: string | null | undefined) {
  if (!photoUrl?.startsWith("/uploads/")) return;
  const filename = path.basename(photoUrl);
  const filepath = path.join(UPLOAD_DIR, filename);
  try {
    await unlink(filepath);
  } catch {
    // arquivo já ausente
  }
}
