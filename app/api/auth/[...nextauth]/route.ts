import NextAuth from "next-auth/edge";
import { authOptions } from "../../../../lib/authOptions";

const handler = NextAuth(authOptions);

export const runtime = "edge";
export const dynamic = "force-dynamic";

export { handler as GET, handler as POST };
