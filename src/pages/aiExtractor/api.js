const API_BASE_URL = String(process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function readJson(response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function apiRequest(path, options) {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const body = await readJson(response);
  if (!response.ok) {
    const message = response.status === 401
      ? "Your LMS session has expired. Please sign in again."
      : body?.error || body?.message || "The report request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body;
}

function mimeTypeFor(file) {
  const reportedType = String(file.type || "").toLowerCase();
  if (["application/pdf", "image/png", "image/jpeg"].includes(reportedType)) return reportedType;
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return reportedType;
}

export function validateBrowserFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) throw new Error("Choose one PDF or at least one report image.");
  if (files.length > MAX_FILES) throw new Error("Upload one PDF or up to 10 report images.");

  const prepared = files.map((file, order) => {
    const mimeType = mimeTypeFor(file);
    if (!["application/pdf", "image/png", "image/jpeg"].includes(mimeType)) {
      throw new Error("Only PDF, PNG and JPEG reports are supported.");
    }
    const maxBytes = mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (!file.size || file.size > maxBytes) {
      throw new Error(mimeType === "application/pdf"
        ? "The PDF must be no larger than 20 MB."
        : "Each report image must be no larger than 10 MB.");
    }
    return { file, order, mimeType, size: file.size, originalName: file.name };
  });

  if (prepared.some(({ mimeType }) => mimeType === "application/pdf") && prepared.length !== 1) {
    throw new Error("Upload one PDF or up to 10 report images, not a mixed batch.");
  }
  return prepared;
}

export function createUploadSession(files) {
  return apiRequest("/api/ai-extractor/uploads", {
    method: "POST",
    body: JSON.stringify({
      files: files.map(({ mimeType, size, originalName }) => ({ mimeType, size, originalName })),
    }),
  });
}

async function putOneFile(upload, file) {
  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Secure upload failed for ${upload.originalName} (${response.status}).`);
  }
}

export async function uploadFilesDirectly(uploads, preparedFiles, onProgress) {
  if (!Array.isArray(uploads) || uploads.length !== preparedFiles.length) {
    throw new Error("The server returned an incomplete upload session.");
  }
  let nextIndex = 0;
  let completed = 0;
  const workerCount = Math.min(3, uploads.length);

  async function worker() {
    while (nextIndex < uploads.length) {
      const index = nextIndex++;
      await putOneFile(uploads[index], preparedFiles[index].file);
      completed += 1;
      onProgress?.(completed, uploads.length);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

function extractionFiles(uploads) {
  return uploads.map(({ key, mimeType, size, originalName, order }) => ({
    key, mimeType, size, originalName, order,
  }));
}

export function extractUploadedReport(reportId, uploads) {
  return apiRequest("/api/ai-extractor/extract", {
    method: "POST",
    body: JSON.stringify({ reportId, files: extractionFiles(uploads) }),
  });
}

export function cleanupUploadedReport(reportId, uploads) {
  if (!reportId || !uploads?.length) return Promise.resolve();
  return apiRequest("/api/ai-extractor/cleanup", {
    method: "POST",
    body: JSON.stringify({ reportId, files: extractionFiles(uploads) }),
  }).catch(() => undefined);
}
