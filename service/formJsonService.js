const validateForm = (key, value, validations) => {
  let failedValidations = {};
  if (!failedValidations[key]) failedValidations[key] = '';

  for (const validation of validations) {
    switch (validation.name) {
      case 'required':
        if (value === undefined || value === '') {
          failedValidations[key] = validation.message;
        }
        break;
      case 'minlength':
        if (value.length < validation.validator) {
          failedValidations[key] = validation.message;
        }
        break;
      case 'maxlength':
        if (value.length > validation.validator) {
          failedValidations[key] = validation.message;
        }
        break;
      case 'min':
        if (value > validation.validator) {
          failedValidations[key] = validation.message;
        }
        break;
      case 'max':
        if (value < validation.validator) {
          failedValidations[key] = validation.message;
        }
        break;
      case 'email':
        const pattern = new RegExp('^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$');
        if (!pattern.test(value)) {
          failedValidations[key] = validation.message;
        }
        break;
      // case 'nullValidator': break;
      // case 'pattern': break;

      default:
        break;
    }
  }

  return failedValidations;
};

module.exports.getValidations = (fields) => {
  const validations = {};

  for (let field of fields) {
    validations[field.key] = field.validations;
  }
  return validations;
};

module.exports.getFailedValidations = (data, validations) => {
  let failedValidations = [];
  
  for (const [key, value] of Object.entries(data)) {
    // Validate each field based on the rules defined in the "validations" object.
    const failedValidation = validateForm(key, value, validations[key] || []);

    if (Object.values(failedValidation)[0] !== '')
      failedValidations.push(failedValidation);
  }
  return failedValidations;
};
