import * as Yup from 'yup';

const generateValidationSchema = (inputFields) => {
  let validationObject = {};

  inputFields.forEach((field) => {
    
    validationObject[field.name] = field.required
      ? Yup.string().required(`This Field is required`)
      : Yup.string();
    if (field.type == "date"){
      if (field.tense == "future"){
        validationObject[field.name] = Yup.date().min(new Date().toISOString().split('T')[0])
      }
    }
    if (field.type === 'email') {
      validationObject[field.name] = validationObject[field.name].email('Invalid email');
    }
    if (field.type === 'checkbox') {
      validationObject[field.name] = Yup.boolean().oneOf([true], `You must be ${field.label || field.name}`);
    }
    if (field.name == "password2"){
      validationObject[field.name] = Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required(`${field.placeholder} is required`);
    }
    if (field.type == "url"){
     validationObject[field.name] = Yup.string().url('Please enter a valid URL').required('URL is required')
    }
    if (field.name == "salary"){
      validationObject[field.name] = Yup.number().min(5000);
    }
    if (field.name == "experience") {
      validationObject[field.name] = Yup.number().max(5);
    }
    if (field.type == "dynamic" || field.type == "array"){

      if (field.name == "job_categoery" || field.name == "sub_categoery" || field.name == "skill_name"){
        validationObject[field.name] = Yup.object();
      }
      else{
        validationObject[field.name] = Yup.array().min(1, "Please Select One Skill");
      }
    }
  });

  return Yup.object().shape(validationObject);
};


export default generateValidationSchema;