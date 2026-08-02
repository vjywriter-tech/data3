import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { studentEntryIds } from "@/data/student-entries";
import { getR2Client, getR2Config } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVIDENCE_PREFIX = "criterion-4.7.2/";

function noStoreJson(body: object, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    const { bucketName } = getR2Config();
    const result = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: EVIDENCE_PREFIX,
        MaxKeys: 1000,
      }),
    );

    const uploadedEntryIds = (result.Contents ?? [])
      .map((object) =>
        object.Key?.slice(EVIDENCE_PREFIX.length).split("/")[0] ?? "",
      )
      .filter((entryId) => studentEntryIds.has(entryId));

    return noStoreJson({
      uploadedEntryIds: [...new Set(uploadedEntryIds)],
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Missing required")
        ? "R2 storage is not configured. Add the required environment variables."
        : "Upload status is temporarily unavailable.";

    return noStoreJson({ error: message }, { status: 500 });
  }
}
