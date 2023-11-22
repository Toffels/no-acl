# NO-ACL
## Nested Object - Access Control List

Disclaimer: Under construction.

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

More complex examples to follow.

## API Reference
TODO
<!-- ### `ACL.FromJson(json: object): ACL`
Creates an ACL instance from a JSON object. This method allows defining access control lists with various descriptors and supports the use of custom variables and regular expressions for role checks.

- **Parameters**:
  - `json`: An object containing ACL rules. Supports custom variables and regular expressions.
- **Returns**: An instance of the ACL class.

### `ACL.toJson(evaluateVariables?: boolean): object`
Converts the ACL instance back to a JSON object. This can be used to serialize the ACL rules.

- **Parameters**:
  - `evaluateVariables` (optional): A boolean indicating whether custom variables in the ACL should be evaluated or kept as references.
- **Returns**: A JSON object representing the ACL rules.

### `ACL.toString(evaluateVariables?: boolean): string`
Returns a string representation of the ACL rules. This is useful for debugging or logging the current state of the ACL.

- **Parameters**:
  - `evaluateVariables` (optional): A boolean indicating whether custom variables in the ACL should be evaluated or kept as references.
- **Returns**: A string representation of the ACL rules.

### `ACL.original: object`
Provides access to the original input object used to create the ACL instance. This is useful for retrieving the unmodified state of the ACL rules.

- **Returns**: The original input object used to create the ACL instance. -->


<!-- ## Contributing
Contributions to the ACL Toolkit are welcome. Please follow the standard procedure for contributing to open source projects:

1. Fork the repository
2. Create a new branch for your feature or fix
3. Submit a pull request with a detailed description of your changes -->

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
 