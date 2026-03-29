const BLOB_API_BASE = "https://blob.vercel-storage.com";

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN environment variable");
  }

  return token;
}

function toBlobPathname(pathname: string): string {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export type StoredBlob = {
  url: string;
  pathname: string;
  contentType: string;
};

export async function uploadBlob(params: {
  pathname: string;
  file: File;
  contentType: string;
}): Promise<StoredBlob> {
  const token = getBlobToken();
  const normalizedPathname = toBlobPathname(params.pathname);
  const requestUrl = `${BLOB_API_BASE}/${normalizedPathname}`;

  const response = await fetch(requestUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": params.contentType,
      "x-content-type": params.contentType,
      "x-add-random-suffix": "1",
      "x-cache-control-max-age": "31536000",
    },
    body: params.file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Blob upload failed (${response.status}): ${errorText || "Unknown blob upload error"}`
    );
  }

  const payload = (await response.json()) as { url: string; pathname?: string };

  return {
    url: payload.url,
    pathname: payload.pathname ?? normalizedPathname,
    contentType: params.contentType,
  };
}

export async function deleteBlob(url: string): Promise<void> {
  const token = getBlobToken();

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(
      `Blob delete failed (${response.status}): ${errorText || "Unknown blob delete error"}`
    );
  }
}
