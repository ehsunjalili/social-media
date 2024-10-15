const yup = require('yup')

module.exports.createPostValidationSchema = yup.object({
    description: yup
        .string()
        .max(2200,'Description cannot be more than 2200 chars long !!')
})