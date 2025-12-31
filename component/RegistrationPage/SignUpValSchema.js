import * as Yup from 'yup';

// Define a function to generate validation schema
const registerValidationSchema = (formArr) => {
  let schemaObject = {};

  // Iterate through the form array and construct the schema object
  formArr.forEach(field => {
    // Initialize the schema for the current field
    let fieldSchema = Yup.string();

    // Apply required validation if the field is required
    if (field.required) {
      fieldSchema = fieldSchema.required(`${field.placeholder} is required`);
    }

    // Apply additional validation rules based on field type (optional)
    // You can add more validation rules here based on your requirements

    // Add the field schema to the schema object
    schemaObject[field.name] = fieldSchema;
  });

  // Create the final Yup schema object
  const validationSchema = Yup.object().shape(schemaObject);

  return validationSchema;
};

// Usage: Generate validation schema from registerFormArr\
export default registerValidationSchema;
