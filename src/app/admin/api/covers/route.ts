import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/admin/auth";
import { CoverError, MAX_UPLOAD_BYTES, processCoverUpload } from "@/lib/admin/cover-image";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { COVER_BUCKET, coverPublicUrl } from "@/lib/covers";

export const runtime = "nodejs"; // sharp needs the Node runtime

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

/** State-changing request: it must come from this site (CSRF defence in depth on top of SameSite cookies). */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * POST /admin/api/covers — multipart `file`. Uploads a cover (or body) image to the blog-covers bucket
 * using the ADMIN'S OWN session, so Storage RLS (is_admin()) is the final gate. No service key involved.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Cross-site request blocked." }, 403);

  const admin = await getAdminOrNull();
  if (!admin) return json({ error: "Your session has expired or you are not an administrator. Sign in again." }, 401);

  const limit = checkRateLimit(`upload:${admin.user.id}`, { max: 30, windowMs: 10 * 60_000 });
  if (!limit.allowed) return json({ error: "Too many uploads. Wait a few minutes and try again." }, 429);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: "The image is larger than 4 MB." }, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return json({ error: "The upload could not be read." }, 400);
  }
  if (!(file instanceof File)) return json({ error: "Choose an image file to upload." }, 400);

  try {
    const processed = await processCoverUpload(Buffer.from(await file.arrayBuffer()));

    const { error } = await admin.supabase.storage.from(COVER_BUCKET).upload(processed.name, processed.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000", // content-addressed name => immutable
      upsert: false,
    });
    // Same bytes uploaded before => same object name => already stored. That is success, not an error.
    const duplicate = error && /already exists|Duplicate/i.test(error.message);
    if (error && !duplicate) {
      return json({ error: "Storage rejected the upload. Check that the blog-covers bucket exists and you are an administrator." }, 502);
    }

    return json({
      name: processed.name,
      width: processed.width,
      height: processed.height,
      url: coverPublicUrl(processed.name),
      reused: Boolean(duplicate),
    });
  } catch (err) {
    if (err instanceof CoverError) return json({ error: err.message }, 422);
    return json({ error: "The image could not be processed." }, 500);
  }
}
