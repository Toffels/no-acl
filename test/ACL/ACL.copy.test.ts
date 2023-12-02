import { z } from "zod";
import { AccessControlList } from "../../src/AccessControlList";
import { GenericUser, SDE, SimpleDescriptorEnum } from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";
import { A, ExtendZod } from "../../src/zod/AssignAcl";
import { ExampleCourseSchema } from "./example";

ExtendZod(z.ZodType);

describe("Acl copy", () => {
  it(`should copy the acl`, () => {
    const copy = ExampleCourseSchema.noacl.copy();

    expect(ExampleCourseSchema.noacl).not.toBe(copy);
    expect(ExampleCourseSchema.noacl.toJson()).not.toBe(copy.toJson());
    expect(ExampleCourseSchema.noacl.toJson()).toStrictEqual(copy.toJson());
  });

  it(`should copy the acl`, () => {
    const copy = ExampleCourseSchema.noacl.copy({ vars: { "@asd": SDE.read } });

    expect(ExampleCourseSchema.noacl).not.toBe(copy);
    expect(ExampleCourseSchema.noacl.toJson()).not.toBe(copy.toJson());
    expect(ExampleCourseSchema.noacl.toJson()).not.toStrictEqual(copy.toJson());
    expect({
      ...ExampleCourseSchema.noacl.toJson(),
      "@asd": SDE.read,
    }).toStrictEqual(copy.toJson());
  });
});
