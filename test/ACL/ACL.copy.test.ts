import { z } from "zod";
import { AccessControlList } from "../../src/AccessControlList";
import { GenericUser, SDE, SimpleDescriptorEnum } from "../../src/Types";
import { getValueByPath } from "../../src/utils/utils";
import { A, ExtendZod } from "../../src/zod/AssignAcl";
import { ExampleCourseSchema } from "./example";

ExtendZod(z.ZodType);

describe("Acl copy", () => {
  it(`should copy the acl`, () => {
    const copy = ExampleCourseSchema.acl.copy();

    expect(ExampleCourseSchema.acl).not.toBe(copy);
    expect(ExampleCourseSchema.acl.toJson()).not.toBe(copy.toJson());
    expect(ExampleCourseSchema.acl.toJson()).toStrictEqual(copy.toJson());
  });

  it(`should copy the acl`, () => {
    const copy = ExampleCourseSchema.acl.copy({ vars: { "@asd": SDE.read } });

    expect(ExampleCourseSchema.acl).not.toBe(copy);
    expect(ExampleCourseSchema.acl.toJson()).not.toBe(copy.toJson());
    expect(ExampleCourseSchema.acl.toJson()).not.toStrictEqual(copy.toJson());
    expect({
      ...ExampleCourseSchema.acl.toJson(),
      "@asd": SDE.read,
    }).toStrictEqual(copy.toJson());
  });
});
