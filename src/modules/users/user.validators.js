const yup = require('yup')

module.exports.registerValidationSchema = yup.object({
    email: yup
        .string()
        .email('Please enter a valid email')
        .required('email is required'),
    username: yup
        .string()
        .min(3, 'username must be at least 3 chars long')
        .max(30, 'username should not exceed 30 characters')
        .required('username is required'),
    biography: yup
        .string()
        .max(100, 'biography should not exceed 100 characters')
})