import { z } from "zod";
import { AccessControlList } from "../../src/AccessControlList";
import { SimpleDescriptorEnum } from "../../src/Types";
import { zInit } from "../../src/zod/AssignAcl";

const TIME_THRESHOLD = 2;
const NUMBER_OF_RUNS = 1000;
zInit(z);

describe("Acl.apply() benchmarking", () => {
  let logs: string[] = [];
  let flushed = false;

  afterEach(() => {
    if (flushed) {
      // Flush logs at the end of each test
      console.log(logs.join("\n"));

      flushed = false;
      logs = [];
    }
  });

  const dataSets: [string, AccessControlList, any, { roles: string[] }][] = [
    [
      "Small  data",
      AccessControlList.FromJson({
        "user.name": SimpleDescriptorEnum.read,
        "user.age": SimpleDescriptorEnum.read,
        "user.email": SimpleDescriptorEnum.never,
      }),
      {
        user: {
          name: "John Doe",
          age: 30,
          email: "johndoe@example.com",
        },
      },
      { roles: [] },
    ],
    [
      "Medium data",
      AccessControlList.FromJson({
        "user.id": SimpleDescriptorEnum.read,
        "user.profile.name": SimpleDescriptorEnum.read,
        "user.profile.age": SimpleDescriptorEnum.read,
        "user.profile.address.*": SimpleDescriptorEnum.none,
        "user.roles": [{ d: SimpleDescriptorEnum.read, roles: ["admin"] }],
        "user.preferences": SimpleDescriptorEnum.readWrite,
      }),
      {
        user: {
          id: 1,
          profile: {
            name: "Jane Doe",
            age: 28,
            address: {
              street: "123 Main St",
              city: "Anytown",
              zip: "12345",
            },
          },
          roles: ["user", "admin"],
          preferences: {
            notifications: true,
            theme: "dark",
          },
        },
      },
      { roles: [] },
    ],
    [
      "Large  data",
      AccessControlList.FromJson({
        "company.name": SimpleDescriptorEnum.read,
        "company.departments.*.name": SimpleDescriptorEnum.read,
        "company.departments.*.employees": [
          { d: SimpleDescriptorEnum.read, roles: ["HR", "Manager"] },
        ],
        "company.departments.*.budget": [
          { d: SimpleDescriptorEnum.read, roles: ["Finance", "Manager"] },
        ],
        "company.departments.*.projects": [
          { d: SimpleDescriptorEnum.read, roles: ["Manager", "ProjectLead"] },
        ],
        "company.clients": SimpleDescriptorEnum.none,
      }),
      {
        company: {
          name: "Tech Solutions Inc.",
          departments: [
            {
              id: 101,
              name: "Engineering",
              employees: [
                {
                  id: 1,
                  name: "Alice",
                  role: "Senior Developer",
                  accessLevel: "high",
                },
                {
                  id: 2,
                  name: "Bob",
                  role: "Junior Developer",
                  accessLevel: "medium",
                },
                // More employees...
              ],
              budget: 1000000,
              projects: [
                { id: "P101", name: "Project X", status: "active" },
                { id: "P102", name: "Project Y", status: "planning" },
                // More projects...
              ],
            },
            {
              id: 102,
              name: "Human Resources",
              employees: [
                {
                  id: 3,
                  name: "Charlie",
                  role: "HR Manager",
                  accessLevel: "high",
                },
                {
                  id: 4,
                  name: "Dana",
                  role: "Recruiter",
                  accessLevel: "medium",
                },
                // More employees...
              ],
              budget: 500000,
              policies: [
                { id: "PL101", topic: "Work from Home Policy", active: true },
                { id: "PL102", topic: "Equal Opportunity", active: true },
                // More policies...
              ],
            },
            // More departments...
          ],
          clients: [
            { id: "C101", name: "Client A", contractValue: 250000 },
            { id: "C102", name: "Client B", contractValue: 400000 },
            // More clients...
          ],
        },
      },
      { roles: [] },
    ],
  ];

  dataSets.forEach(([title, acl, data, user], index) => {
    it(`should benchmark '${title}'`, async () => {
      let totalTimeTaken = 0;

      for (let i = 0; i < NUMBER_OF_RUNS; i++) {
        const startTime = performance.now();

        acl.read(data, user);

        const endTime = performance.now();
        totalTimeTaken += endTime - startTime;
      }

      const averageTimeTaken = totalTimeTaken / NUMBER_OF_RUNS;
      logs.push(
        `'${title}' average: ${averageTimeTaken.toFixed(3)} milliseconds`
      );

      // This should notify, when the code get's exceptionally slow and would take over 1ms.
      // While this is relative to the performance of the system running it.
      expect(averageTimeTaken).toBeLessThan(TIME_THRESHOLD);

      // logging
      if (index === dataSets.length - 1) {
        flushed = true;
      }
    });
  });
});
