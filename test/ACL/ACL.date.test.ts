import { AccessControlList } from "../../src/AccessControlList";

describe(`Acl date test`, () => {
  const acl = AccessControlList.FromJson({
    date: "@read",
  });

  it("should fucking work", () => {
    const data = { date: new Date() };
    const expected = { date: new Date() };
    const result = acl.read(data, { roles: [] });

    expect(result).not.toStrictEqual({});
    expect(result).toStrictEqual(expected);
  });
});
