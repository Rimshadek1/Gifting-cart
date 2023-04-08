var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')


const verifyLogin = (req, res, next) => {
  if (req.session.admin.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

router.get('/loginAdmin', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('user/login', {
      'loginErr': req.session.adminLogginErr
    })
    req.session.adminLogginErr = false
  }
})
router.post('/loginAdmin', (req, res) => {
  productHelper.doLogin(req.body).then((response) => {
    if (response.status) {

      req.session.admin = response.user;
      req.session.admin.loggedIn = true;
      res.redirect('/');
    } else {
      req.session.adminLogginErr = 'Invalid Username or Password';
      res.redirect('/login');
    }
  })
})
/* GET users listing. */
router.get('/', function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    console.log(products);
    res.render('admin/view-products', { admin: true, products })
  })


});
router.get('/add-product', function (req, res) {
  res.render('admin/add-product')
})
router.post('/add-product', (req, res) => {

  productHelper.addProduct(req.body, (id) => {
    let image = req.files.image
    let imageName = id + '.jpg'
    if (image.mimetype === 'image/png') { // check if image is PNG
      imageName = id + '.png'
    }
    console.log(id)
    image.mv('./public/product-images/' + imageName, (err, done) => {
      if (!err) {
        productHelper.getAllProducts().then((products) => {
          console.log(products);
          res.render('admin/view-products', { admin: true, products });
        })
      } else {
        console.log(err);
      }
    })
  })










  // productHelper.addProduct(req.body, (id) => {
  //   let image = req.files.image
  //   console.log(id)
  //   image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
  //     if (!err) {
  //       productHelper.getAllProducts().then((products) => {
  //         console.log(products);
  //         res.render('admin/view-products', { admin: true, products });
  //       })
  //     } else {
  //       console.log(err);
  //     }
  //   })


  // })
})
router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id;
  console.log(proId);
  productHelper.deleteProduct(proId)
    .then((response) => {
      res.redirect('/admin/');
    })
});
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelper.getProductDetails(req.params.id)
  res.render('admin/edit-product', { product })
})
router.post('/edit-product/:id', (req, res) => {
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.image) {
      let image = req.files.image
      let id = req.params.id
      image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})


module.exports = router;






















// app.post('/add-product', async (req, res) => {
//   const data = {
//     name: req.body.name,
//     pass: req.body.pass
//   }
//   await collection.insertMany([data])
//   res.render('admin/add-product')

// })