import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { studentEntryIds } from "@/data/student-entries";
import { getR2Client, getR2Config } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVIDENCE_PREFIX = "criterion-4.7.2/";

export async function GET(request: Request) {
  const entryId =
    new URL(request.url).searchParams.get("entryId")?.trim() ?? "";

  if (!studentEntryIds.has(entryId)) {
    return new Response("Invalid document entry.", { status: 400 });
  }

  try {
    const { bucketName } = getR2Config();
    const objectKey = `${EVIDENCE_PREFIX}${entryId}/evidence`;

    const viewUrl = await getSignedUrl(
      getR2Client(),
      new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
      { expiresIn: 300 },
    );

    return Response.redirect(viewUrl, 302);
  } catch {
    return new Response("Document could not be opened.", { status: 500 });
  }
}