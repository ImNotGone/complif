import { Role } from "@prisma/client";
import { AuthenticatedOnly } from "./auth.decorator";

export const AdminOnly = () => AuthenticatedOnly(Role.ADMIN);
