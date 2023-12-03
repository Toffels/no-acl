import { z } from "zod";
import { zInit } from "../../src/zod/AssignAcl";

import { ExampleCourseSchema } from "./example";

zInit(z);

const debug = false;

describe("Test readme.md example", () => {
  // ACL schema for a course
  const courseSchema = ExampleCourseSchema;

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
    // console.log(courseSchema.noacl.toJson());
    // console.log(courseSchema.noacl.apply(courseData, user, SDE.read, true));
    const read = courseSchema.noacl.read(courseData, user);
    courseData.students.forEach((student) => {
      // @ts-expect-error
      delete student.grades;
      // @ts-expect-error
      delete student.attendance;
    });
    expect(read).toStrictEqual(courseData);
    if (debug) console.log("admin read", read);
  });

  it("Admin write view", () => {
    const user = { roles: ["administrator"] };
    const write = courseSchema.noacl.write(courseData, user);
    // @ts-expect-error
    delete courseData.students;
    expect(write).toStrictEqual(courseData);
    if (debug) console.log("admin write", write);
  });

  it("Instructor read view", () => {
    const user = { roles: ["instructor"] };
    const read = courseSchema.noacl.read(courseData, user);
    expect(read).toStrictEqual(courseData);
    if (debug) console.log("instructor read", read);
  });

  it("Instructor write view", () => {
    const user = { roles: ["instructor"] };
    // @ts-expect-error
    delete courseData.seats;
    // @ts-expect-error
    delete courseData.students;

    const write = courseSchema.noacl.write(courseData, user);
    expect(write).toStrictEqual(courseData);
    if (debug) console.log("instructor write", write);
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

    const read = courseSchema.noacl.read(courseData, user);
    expect(read).toStrictEqual(courseData);
    if (debug) console.log("student read", read);
  });

  it("Student write view", () => {
    const user = { roles: ["student"] };
    const write = courseSchema.noacl.write(courseData, user);
    expect(write).toStrictEqual({});
    // console.log("student write", write);
  });
});
