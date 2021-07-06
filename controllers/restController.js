const db = require('../models')
const Restaurant = db.Restaurant
const Category = db.Category

const restController = {
  getRestaurants: (req, res) => {
    Restaurant.findAll({
      raw: true,
      nest: true,
      include: [Category]
    })
      .then(restaurants => {
        const restaurantData = restaurants.map(r => ({
          ...r,
          description: r.description.substring(0, 50),
          categoryName: r.Category.name
        }))
        return res.render('restaurants', { restaurants: restaurantData })
      })
  }
}

module.exports = restController
