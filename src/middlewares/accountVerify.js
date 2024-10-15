module.exports = async (req, res, next) => {
  try {
    const isVerified = req.user.isVerified;
    if (!isVerified) {
        req.flash('error','You must verify your account to publish a post !');
        return res.redirect('back');
    }
    next()
  } catch (error) {
    next(error)
  }
}