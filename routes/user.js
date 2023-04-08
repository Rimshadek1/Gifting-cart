var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var userHelper = require('../helpers/user-helpers')
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(req.session.user._id)
  }
  flowers = await productHelper.getflowers()
  cakes = await productHelper.getcakes()
  birthday = await productHelper.getbirthday()
  trending = await productHelper.getTrending()
  productHelper.getAllProducts().then((products) => {

    res.render('user/view-products',
      { products, trending, birthday, cakes, flowers, user, cartCount, style: 'home.css' })
  })
  trending = await productHelper.getTrending()
});


router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', {
      'loginErr': req.session.LogginErr,
      style: 'login.css'
    })
    req.session.LogginErr = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup', { style: 'register.css' })
})
router.post('/signup', (req, res) => {
  userHelper.doSignUp(req.body).then((response) => {
    console.log(response);
    req.session.loggedIn = true;
    req.session.user = response;

    res.render('./user/login', { style: 'login.css' });
  })
})
router.post('/login', (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;

      res.redirect('/');
    } else {
      req.session.LogginErr = 'Invalid Username or Password';
      res.redirect('/login');
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelper.getCartProducts(req.session.user._id)
  let totalCart = 0
  if (products.length > 0) {
    totalCart = await userHelper.totalPrice(req.session.user._id)
  }
  console.log(products)
  res.render('./user/cart', {
    products, user: req.session.user, totalCart, style: 'cart.css'
  })
})

router.get('/add-to-cart/:id', (req, res) => {
  userHelper.addToCart(req.params.id, req.session.user._id)
    .then(() => {
      res.json({ status: true })

    });
});



router.post('/change-product-quantity', (req, res, next) => {
  userHelper.changeproductQuantity(req.body).then(async (response) => {
    response.total = await userHelper.totalPrice(req.body.user)
    res.json(response)
  })
})

router.post('/delete-cart-item', (req, res) => {
  console.log(req.body);
  userHelper.deleteCart(req.body).then((response) => {
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelper.totalPrice(req.session.user._id)
  res.render('./user/place-order', { total, user: req.session.user, style: 'place-order.css' })
})
router.post('/place-order', async (req, res) => {
  let totalPrice = await userHelper.totalPrice(req.body.userId)
  let products = await userHelper.getCartProductList(req.body.userId)
  console.log('total' + totalPrice);
  console.log('producs' + products);
  userHelper.placeOrder(req.body, products, totalPrice).then((orderId) => {
    console.log('body', req.body);
    if (req.body['Payment-method'] === 'COD') {

      res.json({ codStatus: true })
    }
    else {
      userHelper.genetrateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    }

  })
  console.log(req.body);
})
router.get('/order-succes', (req, res) => {
  console.log('order');
  res.render('user/order-succes', { user: req.session.user })
})
router.get('/orders', async (req, res) => {
  let orders = await userHelper.getUserOrders(req.session.user._id)
  console.log(orders);
  console.log(req.session.user._id);
  res.render('user/orders', { user: req.session.user, orders })
})
router.get('/view-order-products/:id', async (req, res) => {
  let products = await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products', { products, user: req.session.user })
})



















router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelper.verifyPayment(req.body).then(() => {
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    res.json({ status: false, err: 'Payment failed' })
  })
})




module.exports = router;


