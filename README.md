# NO-ACL
## Nested Object - Access Control List

Disclaimer: *Under construction.*

## Installation
Install the NO-ACL using npm:

```bash
npm install no-acl
```


## Introduction

NO-ACL (Nested Object Access Control List) is a JavaScript library that offers a novel approach to managing access control in applications. Differing from traditional ACLs, which typically secure entire resources, NO-ACL focuses on providing detailed control at the level of individual fields within nested objects. This approach enables the definition of precise access rules, ensuring that users have the appropriate level of access to data they interact with. Designed for applications with complex data structures, NO-ACL presents a secure and flexible method for handling field-level access control, making it a valuable tool for developers seeking to enhance data security and integrity.


## Features

NO-ACL offers a range of features designed for effective and efficient access control management:

- **Role-Based Access Control (RBAC)**: Implement access control policies based on user roles, allowing for streamlined and organized management of permissions across different levels of users.

- **Support for Nested Object Structures**: Specifically tailored to handle complex nested objects, ensuring that access control can be applied even in intricate data hierarchies.

- **Flexible and Extensible Rule Definition**: Create custom rules that cater to the specific needs of your application. NO-ACL's flexible system allows for the tailoring of rules to suit various scenarios and requirements.

- **Wildcard Support for Path-Based Rules**: Utilize wildcards in specifying paths for access control, enabling broader and more dynamic rule application without the need for defining each path explicitly.

- **Regex-Role Evaluation**: Offers advanced role evaluation capabilities using regular expressions. This feature allows for more dynamic and complex role definitions, enhancing the flexibility of access control configurations.

- **Serialization**: Enables the serialization of access control lists, facilitating easy storage, transfer, and reconstruction of ACLs. This feature is particularly useful for maintaining consistent access control policies across different parts of an application or in different environments.

- **Zod Extension for 'In-Place ACL Definition'**: Integrates seamlessly with Zod, one of the leading validation libraries, allowing for 'in-place' access control definitions. This extension simplifies the process of defining access rules within the schema validation, streamlining the workflow and ensuring that access control is tightly coupled with data validation.

## Usage
Here's a basic example of how to use the NO-ACL:

```ts
import { AccessControlList as Acl, SimpleDescriptorEnum as SDE } from 'no-acl';
import type { GenericUser as IUser } from 'no-acl';

// Define your Acl rules
const acl = Acl.FromJson({
  'user.profile.name': SDE.read,
  'user.profile.email': [{ d: SDE.read, roles: ['admin'] }, SDE.none]
});

// Create a user and data object
const user: IUser = { roles: ['user'] };
const data = {
  user: {
    profile: {
      name: 'John Doe',
      email: 'john.doe@example.com'
    }
  }
};

// Apply the Acl
const result = acl.read(data, user);

// Output depends on user roles
console.log(result);
// returns:
// {
//  user: {
//    profile: {
//      name: 'John Doe'
//    }
//   }
// }

// The email field in this case is removed from the profile object, since the user has no admin role.
```

## Zod Usage
```ts
import { AccessControlList as Acl, SimpleDescriptorEnum as SDE } from 'no-acl';
import type { GenericUser as IUser } from 'no-acl';

const DataSchema = z.object({
  user: z.object({
    // Implicit fallback to parent.
    name: z.string(),
    email: z.string().a("@admin_read"),
    dict: z.record(z.string(), z.string()).a("@rw")
    // Implicit read-write variable
  }).assignDescriptor("@rw") // Shorthand a
// Create Acl
}).ZAcl({ // Shorthand: A
  // define reusable variables for the acl
  vars: {
    // Variable for ArrayDescriptor
    "@admin_read": [
      // SpecificDescriptor
      { 
        d: SDE.read,
        // Matching role === "admin"
        roles: ["admin"]
      },
      // SimpleDescriptor
      SDE.none
    ]
  }
})
```

## Real-Life Example: Role-Based Access Control in an Online Learning Platform
This code illustrates how this ACL system can manage access to course data based on user roles in an online learning platform context. It demonstrates the flexibility and capability of the ACL in handling complex access control scenarios.
- We define ACL variables for different roles (administrator, instructor).
- We create a Zod schema for a course with specific access controls for each field.
- We apply the ACL to the course data for different user roles and log the views that each role would have.

It get's even more interesting in scenarios, where you have big and deep settings structure and want new fields to be only usable by Admins until the feature releases. However, here's a simple example:

```ts
// Defining ACL variables for role-based access
const vars: Variables = {
  "@adminWrite": { d: SDE.write, roles: ["administrator"] },
  "@adminRead": { d: SDE.read, roles: ["administrator"] },
  "@adminRW": { d: SDE.readWrite, roles: ["administrator"] },
  "@instructorWrite": { d: SDE.write, roles: ["instructor"] },
  "@instructorRead": { d: SDE.read, roles: ["instructor"] },
};

// Function to extract roles from a user
// This is the default function, if none is specified, however it can be customized to map any user property to a role map as needed.
// For example to use groups, email-address domain, name or properties. Just map them into a role-pattern you like and setup your descriptors accordingly.
const getRoles = (user: { roles: string[] }) => user.roles;

// ACL schema for a course
const courseSchema = z.object({
  title: z.string().a(["@read", "@instructorWrite", "@adminWrite"]),
  description: z.string().a(["@read", "@instructorWrite", "@adminWrite"]),
  seats: z
    .object({
      max: z.number().int().a(["@adminRW", "@instructorRead"]),
    })
    .a(["@read", "@adminRW"]),
  students: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      grades: z.array(z.number()).a(["@instructorRead"]),
      attendance: z.number().a(["@instructorRead"]),
    })
  ).a(["@read"]),
}).A({ vars, getRoles });

// Example course data
let courseData = {
  title: "How to use no-acl?",
  description: "This course will teach you how to use the no-acl library.",
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

// Example usage
const adminUser = { roles: ["administrator"] };
const instructorUser = { roles: ["instructor"] };
const studentUser = { roles: ["student"] };

// Applying ACL for different user roles
const adminView = courseSchema.acl.read(courseData, adminUser);
// const adminView = courseSchema.acl.write(courseData, adminUser);
const instructorView = courseSchema.acl.read(courseData, instructorUser);
// const instructorView = courseSchema.acl.write(courseData, instructorUser);
const studentView = courseSchema.acl.read(courseData, studentUser);
// const studentView = courseSchema.acl.write(courseData, studentUser);

// Outputs:
// admin read
{
  title: 'How to use no-acl?',
  description: 'This course will teach you, how to use the no-acl library.',
  seats: { max: 10 },
  students: [
    { id: '001', name: 'Melon Eusk' },
    { id: '002', name: 'Gill Bates' },
    { id: '003', name: 'Beff Jezos' }
  ]
}
// admin write
{
  title: 'How to use no-acl?',
  description: 'This course will teach you, how to use the no-acl library.',
  seats: { max: 10 }
}

//  instructor read
{
  title: 'How to use no-acl?',
  description: 'This course will teach you, how to use the no-acl library.',
  seats: { max: 10 },
  students: [
    { id: '001', name: 'Melon Eusk', grades: [Array], attendance: 90 },
    { id: '002', name: 'Gill Bates', grades: [Array], attendance: 85 },
    { id: '003', name: 'Beff Jezos', grades: [Array], attendance: 81 }
  ]
}
// instructor write
{
  title: 'How to use no-acl?',
  description: 'This course will teach you, how to use the no-acl library.'
}

// student read
{
  title: 'How to use no-acl?',
  description: 'This course will teach you, how to use the no-acl library.',
  students: [
    { id: '001', name: 'Melon Eusk' },
    { id: '002', name: 'Gill Bates' },
    { id: '003', name: 'Beff Jezos' }
  ]
}
// student write 
{}
``` 

#### Outcome
- Instructors can manage all aspects of the course, including student performance data.
- Students can access course materials and submit assignments but cannot see other students' data.
- Administrators have comprehensive access for oversight and management purposes.

This expanded example demonstrates the nuanced application of ACL in an online learning platform, showcasing how different roles interact with the system and the level of access granted to each.

## API Reference

### `AccessControlList` Class
This class is the core of the module, providing functionalities for managing access control lists.

#### Constructor
It's private to be only accessed by the `FromJson` static method.

#### Generic Types
- `Data`: Represents the data structure being controlled.
- `User`: The user type with access to the data.
- `Vars`: The variables used within the ACL.

### AccessControlList.`FromJson`
- `FromJson(json: AclJson, options?: Options<Vars, User>)`: Creates an instance of `AccessControlList` from a JSON object.

#### `Options` Type

The `Options` type is a generic type used to configure instances of the `AccessControlList` class. It provides flexibility in setting up the access control logic and user-role relationships. It has the following structure:

```typescript
export type Options<
  Vars extends Variables = Variables,
  User extends GenericUser = GenericUser
> = {
  vars?: Vars;
  getRoles?: (user: User) => string[];
  strict?: boolean;
};

const options: Options<MyVarsType, MyUserType> = {
  vars: {
    // Custom variables for ACL
  },
  getRoles: (user) => {
    // Custom logic to retrieve user roles
    return user.customRoleProperty;
  },
  strict: true
};

const acl = AccessControlList.FromJson(aclJson, options);

```

#### Methods
- `toString(flush: boolean)`: Returns a string representation of the ACL.
  - `flush`: Boolean to determine if variables should be evaluated.
- `toJson(flush: boolean)`: Returns a JSON representation of the ACL.
  - `flush`: Boolean to determine if variables should be evaluated.
- `read(data: Data, user: User)`: Filters the data based on read permissions for the user.
- `write(data: Data, user: User)`: Filters the data based on write permissions for the user.
- `create(data: Data, user: User)`: Filters the data based on create permissions for the user.
- `update(data: Data, user: User)`: Filters the data based on update permissions for the user.
- `delete(data: Data, user: User)`: Filters the data based on delete permissions for the user.
- `apply(data: Data, user: User, type: SimpleDescriptorEnum, meta: Meta)`: Applies the specified ACL type to the data for the given user.
  - `data`: The data object to modify.
  - `user`: The user object to determine permissions.
  - `type`: The type of ACL to apply (read, write, create, update, delete).
  - `meta`: Additional metadata for ACL application.
- `getRoles(user: User)`: Retrieves roles for the given user.

<!-- ## Contributing
Contributions to the ACL Toolkit are welcome. Please follow the standard procedure for contributing to open source projects:

1. Fork the repository
2. Create a new branch for your feature or fix
3. Submit a pull request with a detailed description of your changes -->

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
 