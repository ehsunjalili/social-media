const jwt = require('jsonwebtoken');
const UserModel = require('../../models/User');
const refreshTokenModel = require('../../models/refreshToken');
const banModel = require('../../models/Ban')

const nodeMailer = require('nodemailer')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { registerValidationSchema, loginValidationSchema, forgetPasswordValidationSchema, resetPasswordValidationSchema, verifyCodeValidation } = require('./auth.validators');
const redisClient = require('../../redis');

module.exports.showRegisterView = async (req, res) => {
    res.render('auth/register')
}

module.exports.register = async (req, res, next) => {
    try {
        const { name, email, username, password } = req.body;
        await registerValidationSchema.validate({
            email,
            username,
            password,
        }, {
            abortEarly: false,
        })

        const isUserBanned = await banModel.findOne({ email })
        if (isUserBanned) {
            req.flash('error', 'You have been banned for violating the app rules');
            return res.redirect('back');
        }

        const isUserExist = await UserModel.findOne({ $or: [{ username }, { email }] })
        if (isUserExist) {
            req.flash('error', 'Email or username already exist !');
            return res.redirect('/auth/register');
        }

        const isFirstUser = (await UserModel.countDocuments()) == 0
        let role = 'USER'
        if (isFirstUser) {
            role = 'ADMIN'
        }

        let user = new UserModel({ name, email, username, password })
        user = await user.save()

        const accessToken = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, { expiresIn: '20day' });
        const refreshToken = await refreshTokenModel.createToken(user);

        res.cookie('access-token', accessToken, { maxAge: 900_000, httpOnly: true })
        res.cookie('refresh-token', refreshToken, { maxAge: 900_000, httpOnly: true })

        return res.redirect('/')
        // return successResponse(res, 201, {
        //     message: 'User created successfully (:',
        //     user: { ...user.toObject(), password: undefined },
        //  accessToken
        // })

    } catch (error) {
        next(error)
    }

}

module.exports.showLoginView = async (req, res) => {
    res.render('auth/login')
}

module.exports.login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;
        await loginValidationSchema.validate({
            identifier,
            password,
        }, {
            abortEarly: false,
        });
        const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
        if (!user) {
            req.flash('error', 'User not found !')
            return res.redirect('/auth/login')
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password)
        if (!isPasswordMatch) {
            req.flash('error', 'Entered data is not valid !');
            return res.redirect('/auth/login');
        }

        const accessToken = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, { expiresIn: '20day' });
        const refreshToken = await refreshTokenModel.createToken(user);

        res.cookie('access-token', accessToken, { maxAge: 1728000000, httpOnly: true });
        res.cookie('refresh-token', refreshToken, { maxAge: 1728000000, httpOnly: true });

        return res.redirect('/');
    } catch (error) {
        next(error)
    }

}

module.exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const userID = await refreshTokenModel.verifyToken(refreshToken);

        if (!userID) {
            //! Error message
        }

        await refreshTokenModel.findOneAndDelete({ token: refreshToken });

        const user = await UserModel.findOne({ _id: userID });
        if (!user) {
            //! Error message
        }

        const accessToken = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, { expiresIn: '20day' });
        const newRefreshToken = await refreshTokenModel.createToken(user);

        res.cookie('access-token', accessToken, { maxAge: 900_000, httpOnly: true })
        res.cookie('refresh-token', newRefreshToken, { maxAge: 900_000, httpOnly: true })

    } catch (error) {
        next(error)
    }
}

module.exports.showForgetPasswordView = async (req, res, next) => {
    try {
        return res.render('auth/forget-password');
    } catch (error) {
        next(error)
    }
}

module.exports.showResetPasswordView = async (req, res, next) => {
    try {
        const { token } = req.params;

        const IsValidToken = await redisClient.get(`resetPasswords:${token}`)
        if (!IsValidToken) {
            return res.render('404')
        }
        return res.render('auth/reset-password');
    } catch (error) {
        next(error)
    }
}

module.exports.forgetPassword = async (req, res, next) => {
    try {
        const { identifier } = req.body;

        await forgetPasswordValidationSchema.validate({
            identifier
        }, {
            abortEarly: true
        })

        const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
        if (!user) {
            req.flash('error', 'There is no user with this username or email !');
            return res.redirect('/auth/login');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');


        await redisClient.set(`resetPasswords:${user._id}`, resetToken);
        await redisClient.expire(`resetPasswords:${user._id}`, 300);

        // const resetTokenExpireTime = Date.now() + 5 * 60 * 1000;

        // const resetPassword = new ResetPasswordModel({
        //     user: user._id,
        //     token: resetToken,
        //     tokenExpireTime: resetTokenExpireTime,
        // });

        // await resetPassword.save();

        const transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
                user: 'ehsunjalili@gmail.com',
                pass: 'nscy ttcc ovgw foyb'
            }
        });

        const mailOptions = {
            from: 'ehsunjalili@gmail.com',
            to: user.email,
            subject: 'Reset password Link For Your Account',
            html: `<h2>Hello dear ${user.name} </h2>
            <p>Now you can reset your password by pressing the button below!</p>
            <a href="http://localhost:${process.env.PORT}/auth/reset-password/${user._id}" style="margin-top:36px;color:white;background-color:#2e81ed;padding:10px 15px;">Reset Password</a>
            `
        }
        transporter.sendMail(mailOptions);

        req.flash('success', 'Password reset email sent');
        return res.redirect('/auth/login');


    } catch (error) {
        next(error)
    }
}

module.exports.resetPassword = async (req, res, next) => {
    try {
        const { password, token } = req.body;

        await resetPasswordValidationSchema.validate({
            password, token
        }, {
            abortEarly: true
        })
        
        const resetPassword = await redisClient.ttl(`resetPasswords:${token}`);

        if (resetPassword == -2) {
            req.flash('error', 'Invalid or expired token !')
            return res.redirect('back')
        }
        // const resetPassword = await ResetPasswordModel.findOne({ token, tokenExpireTime: { $gt: Date.now() } });
        // if (!resetPassword) {
        //     req.flash('error', 'Invalid or expired token !')
        //     return res.redirect('back')
        // }

        // const userResetPassword = await redisClient.get(`resetPasswords:${token}`);
        
        const user = await UserModel.findOne({ _id: token });
        if (!user) {
            req.flash('error', 'There is no user to reset password !');
            return res.redirect('back')
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await UserModel.findOneAndUpdate({ _id: user._id }, { password: hashedPassword });


        await redisClient.del(`resetPasswords:${token}`)
        // await ResetPasswordModel.findOneAndDelete({ _id: resetPassword._id });

        req.flash('success', 'Password reset successfully');
        return res.redirect('/auth/login')

    } catch (error) {
        next(error)
    }
}

module.exports.verifyView = async (req, res, next) => {
    try {
        const user = req.user;

        const isAlreadyVerify = await UserModel.findOne({ _id: user._id });
        if (isAlreadyVerify.isVerified) {
            req.flash('error', 'Your account already verified !');
            return res.redirect('back');
        }

        // const isAlreadyRequested = await verifyModel.findOne({ user: user._id, codeExpireTime: { $gt: Date.now() } })
        // if (isAlreadyRequested) {
        //     return res.render('auth/verify');
        // }

        // await verifyModel.findOneAndDelete({ user: user._id });

        //* Generate code
        let code = Math.floor(Math.random() * 100000)
        let stringCode = code.toString()
        for (let i = stringCode.length; i < 5; i++) {
            code = code * 10
        }

        await redisClient.set(`varifyCodes:${user._id}`, code);
        await redisClient.expire(`varifyCodes:${user._id}`, 120)

        //* Set expire time
        // const codeExpireTime = Date.now() + 5 * 60 * 1000;

        // const verify = new verifyModel({
        //     user: user._id,
        //     code,
        //     codeExpireTime
        // })

        // verify.save();

        const transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
                user: 'ehsunjalili@gmail.com',
                pass: 'nscy ttcc ovgw foyb'
            }
        });

        const mailOptions = {
            from: 'ehsunjalili@gmail.com',
            to: user.email,
            subject: 'Social media account verification',
            html: `<h2>Hello dear ${user.name} </h2>
            <p>Your account verification code is ${code}</p>
            `
        }
        transporter.sendMail(mailOptions);

        return res.render('auth/verify', {
            time: await redisClient.ttl(`varifyCodes:${user._id}`)
        });
    } catch (error) {
        next(error)
    }
}

module.exports.verify = async (req, res, next) => {
    try {
        const user = req.user;
        const { code } = req.body;

        await verifyCodeValidation.validate({
            code
        }, {
            abortEarly: true
        })


        const isAlreadyVerified = await UserModel.findOne({ _id: user._id });
        if (isAlreadyVerified.isVerified) {
            req.flash('error', 'Your account already verified !');
            return res.redirect(`/pages/${user._id}`);
        }

        const isCodeExpired = await redisClient.ttl(`varifyCodes:${user._id}`);

        if (isCodeExpired == -2) {
            req.flash('error', 'Code is not valid !');
            return res.redirect(`/pages/${user._id}`);
        }


        const verifyCode = await redisClient.get(`varifyCodes:${user._id}`)

        if (code != verifyCode) {
            req.flash('error', 'Code is not valid !');
            return res.redirect(`/pages/${user._id}`);
        }


        await redisClient.del(`varifyCodes:${user._id}`)
        // const codeValidation = await verifyModel.findOne({ user: user._id, code });
        // if (!codeValidation) {
        //     req.flash('error', 'Code is not valid !');
        //     return res.render('auth/verify');
        // }

        // const isCodeExpired = await verifyModel.findOne({ user: user._id, code, codeExpireTime: { $gt: Date.now() } });
        // if (!isCodeExpired) {
        //     await verifyModel.findOneAndDelete({ _id: codeValidation._id })
        //     req.flash('error', 'Code is expired !');
        //     return res.redirect(`/pages/${user._id}`);
        // }

        const verify = await UserModel.findOneAndUpdate({ _id: user._id }, { isVerified: true });
        if (!verify) {
            req.flash('error', 'User not found !');
            return res.redirect(`/pages/${user._id}`);
        }


        // await verifyModel.findOneAndDelete({ _id: codeValidation._id })

        req.flash('success', 'Your account has been successfully verified');
        return res.redirect(`/pages/${user._id}`)
    } catch (error) {
        next(error)
    }
}

