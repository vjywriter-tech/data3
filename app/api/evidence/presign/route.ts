import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { studentEntries, studentEntryIds } from "@/data/student-entries";
import { getR2Client, getR2Config } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const EVIDENCE_PREFIX = "criterion-4.7.2/";
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

type PresignRequest = {
  entryId?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
};

function noStoreJson(body: object, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PresignRequest;
    const entryId =
      typeof payload.entryId === "string" ? payload.entryId.trim() : "";
    const fileName =
      typeof payload.fileName === "string" ? payload.fileName.trim() : "";
    const contentType =
      typeof payload.contentType === "string" ? payload.contentType.trim() : "";
    const fileSize =
      typeof payload.fileSize === "number" ? payload.fileSize : Number.NaN;

    if (!studentEntryIds.has(entryId)) {
      return noStoreJson(
        { error: "The selected student activity entry is invalid." },
        { status: 400 },
      );
    }
    if (!fileName || fileName.length > 255) {
      return noStoreJson(
        { error: "The selected file name is invalid." },
        { status: 400 },
      );
    }
    if (!ACCEPTED_TYPES.has(contentType)) {
      return noStoreJson(
        { error: "Only PDF, JPG, and PNG documents are allowed." },
        { status: 415 },
      );
    }
    if (
      !Number.isSafeInteger(fileSize) ||
      fileSize < 1 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return noStoreJson(
        { error: "The document must be between 1 byte and 10 MB." },
        { status: 413 },
      );
    }

    const entry = studentEntries.find((item) => item.id === entryId);
    if (!entry) {
      return noStoreJson(
        { error: "The selected student activity entry is unavailable." },
        { status: 400 },
      );
    }

    const { bucketName } = getR2Config();
    const objectKey = `${EVIDENCE_PREFIX}${entry.id}/evidence`;
    const uploadUrl = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    return noStoreJson({
      uploadUrl,
      expiresIn: 300,
      requiredHeaders: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Missing required")
        ? "R2 storage is not configured. Add the required environment variables."
        : "A secure upload link could not be created. Please try again.";

    return noStoreJson({ error: message }, { status: 500 });
  }
}
