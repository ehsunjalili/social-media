module.exports.errorHandler = (err, req, res, next) => {
   if (err.errors) {
      req.flash('error', err.errors[0]);
      return res.redirect('back');
   }
   
   if (err) {
      req.flash('error', 'An unknown error occurred')
      return res.redirect('back')
   }

}