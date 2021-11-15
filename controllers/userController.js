const bcrypt = require('bcryptjs')
const db = require('../models')
const User = db.User
const Comment = db.Comment
const Restaurant = db.Restaurant
const Like = db.Like

const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const helpers = require('../_helpers')

const userController = {
  signUpPage: (req, res) => {
    return res.render('signup')
  },

  signUp: (req, res) => {
    const name = req.body.name
    const email = req.body.email
    // confirm password
    if (req.body.passwordCheck !== req.body.password) {
      req.flash('error_messages', '確認密碼與密碼不相符')
      return res.redirect('/signup')
    }
    // confirm unique user
    User.findOne({ where: { email: email } }).then((user) => {
      if (user) {
        req.flash('error_messages', '該信箱已被註冊')
        return res.redirect('/signup')
      }
    })

    return bcrypt
      .genSalt(10)
      .then((salt) => bcrypt.hash(req.body.password, salt))
      .then((hash) =>
        User.create({
          name,
          email,
          password: hash
        })
      )
      .then(() => res.redirect('/signin'))
      .catch((err) => console.error(err))
  },

  signInPage: (req, res) => {
    return res.render('signin')
  },

  signIn: (req, res) => {
    req.flash('success_messages', '已成功登入！')
    res.redirect('/restaurants')
  },

  logout: (req, res) => {
    req.flash('success_messages', '已成功登出！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: (req, res) => {
    const userId = req.params.id
    User.findByPk(userId)
      .then(user => {
        Comment.findAndCountAll({
          raw: true,
          nest: true,
          include: [Restaurant],
          where: { userId: userId }
        })
          .then(results => {
            const commentData = results.rows.map(comment => ({
              ...comment,
              restaurantId: comment.Restaurant.id,
              restaurantImage: comment.Restaurant.image
            }))
            const count = results.count
            return res.render('profile', { user: user.toJSON(), count, comments: commentData })
          })
      })
  },
  editUser: (req, res) => {
    if (String(helpers.getUser(req).id) !== String(req.params.id)) {
      req.flash('error_messages', '無法編輯其他使用者的資料')
      return res.redirect(`/users/${req.user.id}`)
    }
    User.findByPk(req.params.id)
      .then(user => {
        return res.render('editProfile', { user: user.toJSON() })
      })
  },
  putUser: (req, res) => {
    if (!req.body.name) {
      req.flash('error_messages', '使用者名稱為必填資訊！')
      return res.redirect('back')
    }
    const { file } = req
    if (file) {
      imgur.setClientID(IMGUR_CLIENT_ID)
      imgur.upload(file.path, (err, img) => {
        if (err) console.log(`Error: ${err}`)
        return User.findByPk(req.params.id).then(user => {
          user.update({
            name: req.body.name,
            image: file ? img.data.link : user.image
          }).then(() => {
            req.flash('success_messages', '已成功修改使用者資料')
            res.redirect(`/users/${req.params.id}`)
          })
        })
      })
    } else {
      return User.findByPk(req.params.id).then(user => {
        user.update({
          name: req.body.name,
          image: user.image
        })
          .then(() => {
            req.flash('success_messages', '已成功修改使用者資料')
            res.redirect(`/users/${req.params.id}`)
          })
          .catch(err => console.error(err))
      })
    }
  },
  addLike: (req, res) => {
    return Like.create({
      UserId: helpers.getUser(req).id,
      RestaurantId: req.params.restaurantId
    })
      .then(() => {
        req.flash('success_messages', '已按讚')
        return res.redirect('back')
      })
  },
  removeLike: (req, res) => {
    return Like.destroy({
      where: {
        UserId: helpers.getUser(req).id,
        RestaurantId: req.params.restaurantId
      }
    })
    .then(() => {
            req.flash('success_messages', '已移除讚')
            return res.redirect('back')
          })
  }
}

module.exports = userController
