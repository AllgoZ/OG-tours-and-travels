/** Browser-side helper for POST /admin/api/covers with upload progress. */
export type UploadResult = { name: string; width: number; height: number; url: string; reused: boolean } | { error: string };

export function uploadImage(file: File, onProgress?: (fraction: number) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    if (file.size > 4 * 1024 * 1024) {
      resolve({ error: "The image is larger than 4 MB. Resize or compress it and try again." });
      return;
    }
    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/api/covers");
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => resolve({ error: "The upload failed. Check your connection and try again." });
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON: the proxy redirected an expired session to the login page.
        resolve({ error: "Your session has expired. Save your work, sign in again and retry." });
        return;
      }
      const d = data as Record<string, unknown>;
      if (xhr.status >= 200 && xhr.status < 300 && typeof d.name === "string") {
        resolve(d as unknown as Exclude<UploadResult, { error: string }>);
      } else {
        resolve({ error: typeof d.error === "string" ? d.error : "The upload failed." });
      }
    };
    xhr.send(body);
  });
}
