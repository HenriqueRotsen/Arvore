import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BUCKET = "photos";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 12 * 1024 * 1024;
const PHOTO_SIZE = 720;

function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function toHdJpeg(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return sharp(buffer)
    .rotate()
    .resize(PHOTO_SIZE, PHOTO_SIZE, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

export async function savePersonPhoto(personId: string, file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("A foto deve ter no máximo 12 MB.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }

  const filename = `${personId}-${Date.now()}.jpg`;
  const processed = await toHdJpeg(file);
  const supabase = supabaseAdmin();

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(filename, processed, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) {
      throw new Error(`Não foi possível salvar a foto: ${error.message}`);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), processed);
  return `/uploads/${filename}`;
}

export async function deletePhotoFile(photoUrl: string | null | undefined) {
  if (!photoUrl) return;
  const supabase = supabaseAdmin();
  if (supabase && photoUrl.includes("/storage/v1/object/public/photos/")) {
    const filename = photoUrl.split("/photos/").pop();
    if (!filename) return;
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(filename)]);
    return;
  }
  if (!photoUrl.startsWith("/uploads/")) return;
  const filename = path.basename(photoUrl);
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // arquivo já ausente
  }
}
