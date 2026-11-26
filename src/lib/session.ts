import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const getCachedSession = cache(async () => {
  return getServerSession(authOptions);
});
