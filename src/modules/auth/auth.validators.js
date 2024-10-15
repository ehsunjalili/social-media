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
    password: yup
        .string()
        .min(8, 'password must be at least 8 chars long')
        .required('password is required'),
})

module.exports.loginValidationSchema = yup.object({
    identifier: yup
        .string()
        .min(3, 'username or email must be at least 10 chars long')
        .max(50, 'username or email should not exceed 50 characters')
        .required('username or email is required'),
    password: yup
        .string()
        .min(8, 'password must be at least 8 chars long')
        .required('password is required'),
})

module.exports.forgetPasswordValidationSchema = yup.object({
    identifier: yup
        .string()
        .min(3, 'username or email must be at least 10 chars long')
        .max(50, 'username or email should not exceed 50 characters')
        .required('username or email is required'),
})

module.exports.resetPasswordValidationSchema = yup.object({
    token: yup.string().required('Reset token is requierd !'),
    password: yup
        .string()
        .min(8, 'password must be at least 8 chars long')
        .required('password is required'),
})

module.exports.verifyCodeValidation = yup.object({
    code: yup
        .string('The entered data is invalid !')
        .required('Verify code is requierd !')
        .min(5, 'The entered code is not correct')
        .max(5, 'The entered code is not correct')
    ,
})