import { z } from "zod";
import { SDE, Variables } from "../../src/Types";
import { A } from "../../src/zod/AssignAcl";

// Import is required!
A;

describe("Test readme.md example", () => {
  // Defining ACL variables for role-based access
  const vars: Variables = {
    "@adminWrite": { d: SDE.write, roles: ["administrator"] },
    "@adminRead": { d: SDE.read, roles: ["administrator"] },
    "@adminRW": { d: SDE.readWrite, roles: ["administrator"] },
    "@instructorWrite": { d: SDE.write, roles: ["instructor"] },
    "@instructorRead": { d: SDE.read, roles: ["instructor"] },
  };

  // Function to define roles
  const getRoles = (user: { roles: string[] }) => user.roles;

  // ACL schema for a course
  const courseSchema = z
    .object({
      title: z
        .string()
        // Define descriptor.
        .a(["@read", "@instructorWrite", "@adminWrite"]),
      description: z.string().a(["@read", "@instructorWrite", "@adminWrite"]),
      seats: z.object({
        max: z.number().int().a(["@adminRW", "@instructorRead"]),
      }),
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

  let courseData: z.infer<typeof courseSchema>;

  beforeEach(() => {
    courseData = {
      title: "How to use no-acl?",
      description: "This course will teach you, how to use the no-acl library.",
      seats: {
        max: 10,
      },
      students: [
        {
          id: "001",
          name: "Melon Eusk",
          grades: [95, 76, 87],
          attendance: 90,
        },
        {
          id: "002",
          name: "Gill Bates",
          grades: [89, 67, 91],
          attendance: 85,
        },
        {
          id: "003",
          name: "Beff Jezos",
          grades: [80, 90, 67],
          attendance: 81,
        },
      ],
    };
  });

  it("Admin read view", () => {
    const user = { roles: ["administrator"] };
    // console.log(courseSchema.acl.toJson());
    // console.log(courseSchema.acl.apply(courseData, user, SDE.read, true));
    const read = courseSchema.acl.read(courseData, user);
    courseData.students.forEach((student) => {
      // @ts-expect-error
      delete student.grades;
      // @ts-expect-error
      delete student.attendance;
    });
    expect(read).toStrictEqual(courseData);
    console.log("admin read", read);
  });

  it("Admin write view", () => {
    const user = { roles: ["administrator"] };
    const write = courseSchema.acl.write(courseData, user);
    // @ts-expect-error
    delete courseData.students;
    expect(write).toStrictEqual(courseData);
    console.log("admin write", write);
  });

  it("Instructor read view", () => {
    const user = { roles: ["instructor"] };
    const read = courseSchema.acl.read(courseData, user);
    expect(read).toStrictEqual(courseData);
    console.log("instructor read", read);
  });

  it("Instructor write view", () => {
    const user = { roles: ["instructor"] };
    // @ts-expect-error
    delete courseData.seats;
    // @ts-expect-error
    delete courseData.students;

    const write = courseSchema.acl.write(courseData, user);
    expect(write).toStrictEqual(courseData);
    console.log("instructor write", write);
  });

  it("Student read view", () => {
    const user = { roles: ["student"] };
    // @ts-expect-error
    delete courseData.seats;
    courseData.students.forEach((student) => {
      // @ts-expect-error
      delete student.grades;
      // @ts-expect-error
      delete student.attendance;
    });

    const read = courseSchema.acl.read(courseData, user);
    expect(read).toStrictEqual(courseData);
    console.log("student read", read);
  });

  it("Student write view", () => {
    const user = { roles: ["student"] };
    const write = courseSchema.acl.write(courseData, user);
    expect(write).toStrictEqual({});
    console.log("student write", write);
  });
});
