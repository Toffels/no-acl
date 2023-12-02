import { z } from "zod";
import { SDE, Variables } from "../../src/Types";
import { ExtendZod } from "../../src/zod/AssignAcl";

ExtendZod(z.ZodType);

// Defining ACL variables for role-based access
export const vars: Variables = {
  "@adminWrite": { d: SDE.write, roles: ["administrator"] },
  "@adminRead": { d: SDE.read, roles: ["administrator"] },
  "@adminRW": { d: SDE.readWrite, roles: ["administrator"] },
  "@instructorWrite": { d: SDE.write, roles: ["instructor"] },
  "@instructorRead": { d: SDE.read, roles: ["instructor"] },
};

// Function to define roles
export const getRoles = (user: { roles: string[] }) => user.roles;

// ACL schema for a course
export const ExampleCourseSchema = z
  .object({
    title: z
      .string()
      // Define descriptor.
      .a(["@read", "@instructorWrite", "@adminWrite"]),
    description: z.string().a(["@read", "@instructorWrite", "@adminWrite"]),
    seats: z
      .object({
        max: z.number().int().a(["@adminRW", "@instructorRead"]),
      })
      .a(["@read", "@adminRW"]),
    students: z
      .array(
        z.object({
          // Let's say it's fine that students can see the other students
          id: z.string(),
          name: z.string(),
          grades: z.array(z.number()).a(["@instructorRead"]),
          attendance: z.number().a(["@instructorRead"]),
        })
      )
      .a(["@read"]),
  })
  // Setup Acl
  .A({ vars, getRoles });
