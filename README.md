# ACL Toolkit

## Introduction
ACL (Access Control List) Toolkit is a powerful and flexible library for managing access control in JavaScript applications. It allows developers to define complex access rules and apply them to data structures, ensuring that users only access data they are authorized to see or modify.

## Features
- Role-based access control
- Support for nested object structures
- Flexible and extensible rule definition
- Wildcard support for path-based rules

## Installation
Install the ACL Toolkit using npm:

```bash
# Example!!! Not the correct thing.
npm install acl-toolkit
```
## Usage
Here's a basic example of how to use the ACL Toolkit:

```ts
import { ACL, SDE, GenericUser } from 'acl-toolkit';
import type { GenericUser as IUser } from 'acl-toolkit';

// Using the shortcut.
// SDE = SimpleDescriptorEnum;

// Define your ACL rules
const acl = ACL.FromJson({
  'user.profile.name': SDE.read,
  'user.profile.email': [{ d: SDE.read, roles: ['admin'] }]
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

// Apply the ACL
const [result] = acl.read(data, user);

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

More complex examples to follow.

## API Reference

### `ACL.FromJson(json: object): ACL`
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

- **Returns**: The original input object used to create the ACL instance.

### Special Features:
- **Custom Variables**: Define reusable variables within your ACL rules for cleaner and more maintainable configurations.
- **Regular Expression Role Checks**: Use regular expressions for dynamic and flexible role checking in your ACL rules.
- **Serialization and Deserialization**: Easily convert your ACL instances to and from JSON for storage or transmission.
- **String Representation**: Get a human-readable string representation of your ACL rules, with an option to evaluate or preserve custom variables.

## Example Usage
```ts
import { ACL, SimpleDescriptorEnum as SDE } from 'acl-toolkit';

// Define ACL rules with a custom variable and regex role check
const acl = ACL.FromJson({
  "@custom-variable": SDE.readWrite,
  "user.access": { d: "@custom-variable", roles: [/admin|moderator/] }
});

// Convert ACL to JSON and back to an object
const json = acl.toJson();
const aclFromJson = ACL.FromJson(json);

// String representation of ACL
const aclString: string = acl.toString();
console.log(aclString);

``` 


<!-- ## Contributing
Contributions to the ACL Toolkit are welcome. Please follow the standard procedure for contributing to open source projects:

1. Fork the repository
2. Create a new branch for your feature or fix
3. Submit a pull request with a detailed description of your changes -->

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## Support
This ACL Toolkit is currently under active development. While we strive to ensure stability and usability, please be aware that we cannot guarantee full functionality at this stage. Your feedback and contributions are highly valued and play a crucial role in improving this toolkit. However, please note that direct support and troubleshooting assistance may be limited at this time. For any feedback, suggestions, or potential issues, kindly open an issue in the GitHub repository.
